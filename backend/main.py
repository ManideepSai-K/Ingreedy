from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import os
from fastapi import FastAPI, HTTPException, Query
import google.generativeai as genai
from dotenv import load_dotenv
from typing import Optional

load_dotenv()
app = FastAPI()

# 1. The CORS Guardrail
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Keys and Configurations
SPOONACULAR_API_KEY = os.getenv("SPOONACULAR_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

class ChatRequest(BaseModel):
    message: str
    recipe_title: Optional[str] = None
    pantry: list[str] = []

class PantryRequest(BaseModel):
    ingredients: list[str]
    cuisine: Optional[str] = None
    staples: list[str] = []

@app.post("/api/get-recipes")
def get_struggle_meals(request: PantryRequest):
    if not SPOONACULAR_API_KEY:
        raise HTTPException(status_code=500, detail="API Key missing.")
    clean_ingredients = []
    for item in request.ingredients:
        clean_ingredients.extend([i.strip() for i in item.split(',') if i.strip()])
        
    clean_staples = []
    for item in request.staples:
        clean_staples.extend([i.strip() for i in item.split(',') if i.strip()])

    # Input for Spoonacular
    ingredients_string = ",".join(clean_ingredients)
    
    url = "https://api.spoonacular.com/recipes/complexSearch"
    
    params = {
        "includeIngredients": ingredients_string, 
        "number": 100,  
        "fillIngredients": "true",
        "ignorePantry": "true", 
        "sort": "max-used-ingredients",
        "apiKey": SPOONACULAR_API_KEY
    }

    if request.cuisine:
        params["cuisine"] = request.cuisine
        
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        raw_recipes = response.json().get("results", [])
        for recipe in raw_recipes:
            actual_missing = []
            spices_used = 0 
            for missed in recipe.get("missedIngredients", []):
                missed_name = missed["name"].lower()
                is_staple = any(staple.lower() in missed_name for staple in clean_staples)
                if is_staple:
                    spices_used += 1 
                else:
                    actual_missing.append(missed) 
            
            recipe["missedIngredientCount"] = len(actual_missing)
            recipe["missedIngredients"] = actual_missing
            
            # Ingredient Usage Score Calculation
            core_used = 0
            for used in recipe.get("usedIngredients", []):
                used_name = used["name"].lower()
                if any(core.lower() in used_name for core in clean_ingredients):
                    core_used += 1

            # Custom Score = Core items used + Spices utilized
            recipe["custom_usage_score"] = (core_used * 10) + spices_used
        best_matches = sorted(
            raw_recipes, 
            key=lambda x: (-x["custom_usage_score"], x["missedIngredientCount"])
        )[:15]
        return {
            "status": "success",
            "message": f"Found {len(best_matches)} recipes. Math engine fully engaged!",
            "data": best_matches
        }

    except requests.exceptions.RequestException as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch recipes.")

# 4. The Hybrid Instruction Engine (with AI Safety Net)
@app.get("/api/get-instructions/{recipe_id}")
def get_recipe_instructions(
    recipe_id: int, 
    recipe_title: str = Query(None), 
    ingredients: str = Query(None)
):
    # 1. Try Spoonacular First (Fast)
    if SPOONACULAR_API_KEY:
        url = f"https://api.spoonacular.com/recipes/{recipe_id}/analyzedInstructions"
        params = {"apiKey": SPOONACULAR_API_KEY}

        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data and isinstance(data, list) and len(data) > 0:
                raw_steps = data[0].get("steps", [])
                clean_steps = [step["step"] for step in raw_steps]
                return {"status": "success", "source": "database", "steps": clean_steps}
        except Exception as e:
            print(f"Spoonacular failed, switching to AI backup...")

    # 2. The AI Safety Net (If Database failed or returned empty)
    print(f"Triggering AI generation for: {recipe_title}")
    
    if not GEMINI_API_KEY:
         return {"status": "error", "steps": ["Instructions unavailable and AI is offline."]}

    try:
        # Dynamically grab the fastest Gemini model available
        working_model = 'gemini-pro' 
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods and 'flash' in m.name:
                working_model = m.name
                break
        
        model = genai.GenerativeModel(working_model)
        
        prompt = f"""
        Create a step-by-step cooking guide for a recipe named "{recipe_title}".
        The user has these ingredients: {ingredients}.
        
        Rules:
        1. Return ONLY the steps.
        2. Do not include intro or outro text.
        3. Separate each step with a pipe character "|". 
        """
        
        ai_response = model.generate_content(prompt)
        
        # Parse the pipe-separated string back into a clean array
        ai_steps = [s.strip() for s in ai_response.text.split('|') if s.strip()]
        
        return {
            "status": "success", 
            "source": "ai_generated", 
            "steps": ai_steps
        }

    except Exception as e:
        print(f"AI Generation failed: {e}")
        return {
            "status": "error", 
            "steps": ["Sorry, even the AI Chef is stumped on this one."]
        }    
# 5. The AI Sous-Chef Engine
@app.post("/api/chat")
def ask_sous_chef(request: ChatRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API Key missing.")

    # 1. THE SYSTEM PROMPT
    context = f"""
    You are the 'Ingreedy Sous-Chef', a witty, highly skilled, and slightly sarcastic culinary assistant. 
    The user currently has these ingredients in their pantry: {', '.join(request.pantry) if request.pantry else 'Nothing specific'}.
    """
    
    if request.recipe_title:
        context += f" The user is currently looking at how to cook: {request.recipe_title}."
        
    context += """
    Rules:
    1. Keep your answers incredibly concise (2-3 sentences max).
    2. Only answer questions related to food, cooking substitutions, or the current recipe. 
    3. If they ask about anything outside of cooking, politely refuse and tell them to focus on the food.
    4. Be encouraging but keep that witty edge.
    """

    # 2. Combining thecontext with the user's actual question
    full_prompt = f"{context}\n\nUser Question: {request.message}"
    try:
        # Dynamically fetch the allowed models
        working_model_name = None
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                working_model_name = m.name
                if "flash" in working_model_name.lower():
                    break
        
        if not working_model_name:
            raise Exception("No active Gemini models found for this API key.")

        print(f"Server successfully locked onto model: {working_model_name}") # Logs to terminal so you know it worked

        # 3. Call the Gemini Model using the dynamic name
        model = genai.GenerativeModel(working_model_name) 
        response = model.generate_content(full_prompt)
        
        return {
            "status": "success",
            "reply": response.text
        }

    except Exception as e:
        print(f"AI Error: {e}")
        raise HTTPException(status_code=500, detail="The Sous-Chef is currently taking a smoke break. Try again later.")