# Ingreedy 🍳 | The AI Struggle Meal Engine

Ingreedy is a full-stack AI web application that takes whatever ingredients you have in your pantry and generates professional, high-percentage recipe matches. 

It uses a custom, offline-trained Machine Learning model for lightning-fast inference, paired with Google Gemini for dynamic cooking instructions and a conversational AI Sous-Chef.

## ✨ Features

* **Offline ML Engine:** Uses TF-IDF vectorization and Cosine Similarity to calculate precise ingredient matches across a dataset of 100,000+ recipes in milliseconds.
* **Smart Missing Ingredients:** Tokenizes user input to dynamically calculate exactly what ingredients you are missing for a perfect match.
* **Generative AI Instructions:** Uses Google Gemini (Flash) to write step-by-step cooking manuals for any recipe on the fly.
* **AI Sous-Chef Chatbot:** A context-aware chatbot that knows your current pantry and the recipe you are looking at to answer cooking questions or suggest substitutions.
* **Serverless AI Photography:** Dynamically generates high-resolution food photography for dataset recipes using Pollinations.ai.
* **Smart Video Tutorials:** Automatically sanitizes recipe titles to fetch the best step-by-step YouTube cooking tutorial.
* **Modern "Gemini" UI:** A clean, responsive React frontend featuring Quick-Add buttons, dynamic match-score badges, and a tabbed "Drafts" interface.

## 🛠️ Tech Stack

* **Frontend:** React, Vite, CSS Grid
* **Backend:** Python, FastAPI, Pandas
* **Machine Learning:** Scikit-Learn (TF-IDF, Joblib for serialization)
* **External APIs:** Google Gemini API, YouTube Data API v3, Pollinations.ai

## 🚀 Local Setup & Installation

### 1. The Python Backend & ML Engine
Navigate to the backend folder and set up your environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt

Train the ML Brain:
You must train the offline model before starting the server. Download the "Food.com Recipes" dataset from Kaggle, place RAW_recipes.csv in the backend folder, and run:
Bash

python train_model.py

(This will generate the .pkl binary files required for the inference engine).

Environment Variables:
Create a .env file in the backend folder and add your API keys:
Plaintext

GEMINI_API_KEY=your_google_gemini_key
YOUTUBE_API_KEY=your_youtube_data_api_key

Start the Server:
Bash

uvicorn main:app --reload

2. The React Frontend

Open a new terminal, navigate to the frontend folder, and start the Vite development server:
Bash

cd frontend
npm install
npm run dev

Open http://localhost:5173 in your browser and start cooking!