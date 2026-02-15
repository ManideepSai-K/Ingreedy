from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Initialize the engine
app = FastAPI()

# 1. The CORS Guardrail
# This tells Python: "Only accept requests from my Vite frontend."
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], 
    allow_credentials=True,
    allow_methods=["*"], # Allows GET, POST, PUT, DELETE
    allow_headers=["*"],
)

# 2. The Strict Data Model
# Pydantic enforces rules. If the frontend sends a number instead of a list of strings,
# FastAPI will automatically reject it before it crashes your app.
class PantryRequest(BaseModel):
    ingredients: list[str]

# 3. The Core Endpoint
# Notice this is a @app.post, not a @app.get. We are SENDING data to the server.
@app.post("/api/get-recipes")
def get_struggle_meals(request: PantryRequest):
    # Right now, we just echo the ingredients back to prove the connection works.
    # Later, this exact spot is where we will call the Spoonacular API.
    return {
        "status": "success",
        "message": "The Chef received your order!",
        "your_pantry": request.ingredients
    }