from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import os
from dotenv import load_dotenv

# Load the secret keys from the .env file into memory
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

# 2. Securely grab the key
SPOONACULAR_API_KEY = os.getenv("SPOONACULAR_API_KEY")

from typing import Optional

class PantryRequest(BaseModel):
    ingredients: list[str]
    cuisine: Optional[str] = None  # e.g., "Italian", "Mexican", "Asian", "Indian"

# ... (keep your imports and app setup exactly the same) ...

@app.post("/api/get-recipes")
def get_struggle_meals(request: PantryRequest):
    if not SPOONACULAR_API_KEY:
        raise HTTPException(status_code=500, detail="API Key missing.")

    # THE STAPLES INJECTOR
    # Define the core items you assume every student has in their kitchen
    DEFAULT_STAPLES = [
        "salt", "black pepper", "cooking oil", "butter", 
        "garlic", "onion", "soy sauce", "chili powder"
    ]
    
    # Silently merge the user's actual pantry with the default staples
    combined_ingredients = request.ingredients + DEFAULT_STAPLES
    
    # Now we join the massive list to send to Spoonacular
    ingredients_string = ",".join(combined_ingredients)
    
    url = "https://api.spoonacular.com/recipes/complexSearch"
    
    params = {
        "includeIngredients": ingredients_string,
        "number": 50,  
        "fillIngredients": "true",
        "ignorePantry": "true", # Keep this on to catch water/sugar
        "sort": "min-missing-ingredients", 
        "apiKey": SPOONACULAR_API_KEY
    }

    if request.cuisine:
        params["cuisine"] = request.cuisine

    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        
        raw_recipes = response.json().get("results", [])
        
        # We can now be incredibly strict because our Staples Injector is padding the stats
        strict_recipes = [
            recipe for recipe in raw_recipes 
            if recipe["missedIngredientCount"] <= 1
        ]
        
        return {
            "status": "success",
            "message": f"Scanned 50 {request.cuisine or 'global'} recipes. Found {len(strict_recipes)} struggle meals!",
            "data": strict_recipes
        }

    except requests.exceptions.RequestException as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch recipes.")
