from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import requests

app = FastAPI()

# Allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SPOONACULAR_API_KEY = "bb54f168019a445eac576e61eb7ee22a"

SPICES = {
    "salt", "pepper", "cumin", "turmeric", "oregano",
    "paprika", "coriander", "cloves",
    "chili powder", "nutmeg", "bay leaf", "cinnamon"
}

@app.get("/recipes/")
async def get_recipes(ingredients: list[str] = Query(...)):
    filtered = [i for i in ingredients if i.lower() not in SPICES]
    response = requests.get(
        "https://api.spoonacular.com/recipes/findByIngredients",
        params={
            "ingredients": ",".join(filtered),
            "number": 10,
            "apiKey": SPOONACULAR_API_KEY
        }
    )
    recipes = response.json()

    # Sort recipes by the number of missed ingredients
    for recipe in recipes:
        recipe["missedIngredientCount"] = len(recipe.get("missedIngredients", []))

    sorted_recipes = sorted(recipes, key=lambda r: r["missedIngredientCount"])

    # Extract relevant details for each recipe
    detailed_recipes = []
    for recipe in sorted_recipes:
        detailed_recipes.append({
            "id": recipe["id"],
            "title": recipe["title"],
            "image": recipe["image"],
            "summary": f"This recipe requires {len(recipe.get('usedIngredients', []))} of your provided ingredients and {recipe['missedIngredientCount']} additional ingredients.",
            "required_ingredients": [
                ingredient["name"] for ingredient in recipe.get("usedIngredients", [])
            ] + [
                ingredient["name"] for ingredient in recipe.get("missedIngredients", [])
            ],
            "sourceUrl": recipe.get("sourceUrl", "#")  # Add the source URL if available
        })

    return detailed_recipes