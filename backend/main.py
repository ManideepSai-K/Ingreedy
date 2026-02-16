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

class PantryRequest(BaseModel):
    ingredients: list[str]

# 3. The Real Recipe Engine
@app.post("/api/get-recipes")
def get_struggle_meals(request: PantryRequest):
    # Failsafe: Check if the API key loaded correctly
    if not SPOONACULAR_API_KEY:
        raise HTTPException(status_code=500, detail="API Key is missing from the server.")

    # Spoonacular expects a comma-separated string (e.g., "eggs,rice,onions")
    ingredients_string = ",".join(request.ingredients)
    
    # The exact endpoint we are querying
    url = "https://api.spoonacular.com/recipes/findByIngredients"
    
    # The parameters we attach to the URL
    params = {
        "ingredients": ingredients_string,
        "number": 5,           # Give us the top 5 recipes
        "ranking": 2,          # Maximize used ingredients, minimize missing ones
        "ignorePantry": "true", # Assume they have water, salt, oil, etc.
        "apiKey": SPOONACULAR_API_KEY
    }

    try:
        # The Python Backend (Chef) asks Spoonacular (Supplier) for the recipes
        response = requests.get(url, params=params)
        
        # If Spoonacular's servers crash, this throws an error immediately
        response.raise_for_status()
        
        # Extract the raw JSON data
        recipes_data = response.json()
        
        # Send the actual recipes back to our React Frontend
        return {
            "status": "success",
            "message": f"Found {len(recipes_data)} struggle meals!",
            "data": recipes_data
        }

    except requests.exceptions.RequestException as e:
        # If the request fails, tell the frontend exactly why
        print(f"Error calling Spoonacular: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch recipes from external API.")