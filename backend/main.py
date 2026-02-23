from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import os
import re
from fastapi import FastAPI, HTTPException, Query
import google.generativeai as genai
from dotenv import load_dotenv
from typing import Optional
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from pydantic import BaseModel
from typing import List
import joblib

# This tells FastAPI exactly what JSON structure to expect from React
class RecipeRequest(BaseModel):
    ingredients: List[str] = []
    spices: List[str] = []
load_dotenv()
app = FastAPI()

# 1. The CORS Guardrail
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Keys and Configurations
SPOONACULAR_API_KEY = os.getenv("SPOONACULAR_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")  
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    

# --- THE PRE-TRAINED ML BRAIN ---
try:
    print("🧠 Booting up the Ingreedy AI Engine...")
    df_recipes = joblib.load("recipe_dataframe.pkl")
    vectorizer = joblib.load("tfidf_vectorizer.pkl")
    recipe_matrix = joblib.load("recipe_matrix.pkl")
    print(f"✅ Loaded 100,000 recipes into memory in milliseconds!")
except Exception as e:
    print(f"❌ Failed to load ML models: {e}")
    df_recipes = pd.DataFrame()

class ChatRequest(BaseModel):
    message: str
    recipe_title: Optional[str] = None
    pantry: list[str] = []

class PantryRequest(BaseModel):
    ingredients: list[str]
    cuisine: Optional[str] = None
    staples: list[str] = []

@app.post("/api/get-recipes")
def get_recipes(request: RecipeRequest):
    if df_recipes.empty:
        return {"status": "error", "message": "ML Brain is offline."}

    user_items = request.ingredients + request.spices
    
    # 👇 ADD THIS WIRE-TAP RIGHT HERE 👇
    print(f"📦 INGREDIENTS RECV: {request.ingredients}")
    print(f"🌶️ SPICES RECV: {request.spices}")
    print(f"🧠 COMBINED TOKENS: {user_items}")
    # 👆 ============================== 👆

    if not user_items:
        return {"status": "success", "data": []}
    
    user_query = " ".join(user_items).lower()

    # Smart Tokenization for the missing ingredients logic
    clean_words = re.findall(r'\b[a-z]+\b', user_query)
    user_tokens = set([w[:-1] if w.endswith('s') else w for w in clean_words] + clean_words)
    query_vector = vectorizer.transform([user_query])

    # Calculate against the massive pre-computed matrix
    similarities = cosine_similarity(query_vector, recipe_matrix).flatten()
    top_indices = similarities.argsort()[::-1][:5]

    results = []

    for idx in top_indices:
        score = similarities[idx]
        
        if score == 0:
            continue 

        row = df_recipes.iloc[idx]
        
        # Convert ingredients back to a list for the UI
        recipe_ing_list = [i.strip().lower() for i in str(row['ingredients']).split(',')]
        
        missed = []
        for ing in recipe_ing_list:
            if not any(token in ing for token in user_tokens):
                missed.append(ing)

        results.append({
            "id": int(row['id']),
            "title": row['title'], 
            "image": row['image'],
            "missedIngredientCount": len(missed),
            "missedIngredients": [{"name": m} for m in missed],
            "matchScore": round(float(score) * 100, 1) 
        })

    return {"status": "success", "data": results}

# 4. The Pure AI Instruction Engine 
@app.get("/api/get-instructions/{recipe_id}")
def get_recipe_instructions(
    recipe_id: int, 
    recipe_title: str = Query(None), 
    ingredients: str = Query(None)
):
    print(f"👨‍🍳 Triggering AI generation for: {recipe_title}")
    
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
        print(f"❌ AI Generation failed: {e}")
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
    
@app.get("/api/get-tutorial")
def get_recipe_video(recipe_title: str = Query(...)):
    if not YOUTUBE_API_KEY or YOUTUBE_API_KEY == "we_will_get_this_in_a_second":
        return {"status": "error", "video_id": None}
        
    url = "https://www.googleapis.com/youtube/v3/search"
    
    # 1. THE SANITIZER: Keep only letters and spaces (removes numbers and weird punctuation from Kaggle)
    clean_title = re.sub(r'[^a-zA-Z\s]', '', recipe_title).strip()
    
    # If the title was literally just numbers, fallback to a basic search
    if not clean_title:
        clean_title = recipe_title
        
    # 2. THE SMART PROMPT: Force YouTube to look for professional food tutorials
    search_query = f"how to cook {clean_title} recipe step by step"
    
    params = {
        "part": "snippet",
        "q": search_query,
        "key": YOUTUBE_API_KEY,
        "type": "video",
        # We can also add videoCategoryId="26" to strictly search the "How-to & Style" category, 
        # but a good text query usually does the trick!
        "maxResults": 1 
    }

    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        items = data.get("items", [])
        if items:
            video_id = items[0]["id"]["videoId"]
            return {"status": "success", "video_id": video_id}
            
        return {"status": "error", "video_id": None}

    except Exception as e:
        print(f"YouTube Search failed: {e}")
        return {"status": "error", "video_id": None}