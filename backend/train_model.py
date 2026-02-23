import pandas as pd
import ast
import re
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer

print("⏳ Loading raw Kaggle dataset...")
try:
    df_raw = pd.read_csv("RAW_recipes.csv")
except FileNotFoundError:
    print("❌ Error: RAW_recipes.csv not found!")
    exit()

# We are upgrading from 5,000 to 100,000 recipes! 
# (This is a huge leap, but safe enough not to crash standard laptop RAM during training)
df_subset = df_raw.head(100000).copy()

print("🧹 Cleaning titles and ingredients...")
def clean_recipe_title(raw_title):
    title = str(raw_title)
    title = re.sub(r'[^a-zA-Z\s\']', ' ', title)
    title = re.sub(r'\s+', ' ', title)
    return title.strip().title()

def clean_ingredients(ing_string):
    try:
        ing_list = ast.literal_eval(ing_string)
        return ", ".join(ing_list)
    except:
        return str(ing_string)

# Apply our cleaning functions
df_subset['clean_title'] = df_subset['name'].apply(clean_recipe_title)
df_subset['clean_ingredients'] = df_subset['ingredients'].apply(clean_ingredients)
df_subset['image'] = "https://placehold.co/600x400?text=Recipe+Found"

# Keep only the columns we actually need to save memory
df_final = df_subset[['id', 'clean_title', 'image', 'clean_ingredients']].copy()
df_final.rename(columns={'clean_title': 'title', 'clean_ingredients': 'ingredients'}, inplace=True)

print("🧠 Training the TF-IDF Machine Learning Model...")
vectorizer = TfidfVectorizer()

# This calculates the massive mathematical matrix for all 100,000 recipes
# It outputs a "Sparse Matrix" which is highly optimized for memory
recipe_matrix = vectorizer.fit_transform(df_final['ingredients'])

print("💾 Compressing and saving the Ingreedy Engine Brain...")
# Save the cleaned dataframe
joblib.dump(df_final, "recipe_dataframe.pkl")
# Save the trained vectorizer (so it knows our exact vocabulary)
joblib.dump(vectorizer, "tfidf_vectorizer.pkl")
# Save the massive pre-computed math matrix
joblib.dump(recipe_matrix, "recipe_matrix.pkl")

print("✅ Success! The ML model is trained and saved. You can now delete recipes.csv.")