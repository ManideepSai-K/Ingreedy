import pandas as pd
import ast

print("Loading massive dataset...")
# Load the raw Kaggle dataset (make sure you downloaded and extracted it here)
df_raw = pd.read_csv("RAW_recipes.csv")

# We only need a subset for the app to stay lightning fast (e.g., 5,000 recipes)
df_subset = df_raw.head(5000).copy()

print("Cleaning data...")
# 1. Map Kaggle's columns to match our Ingreedy Engine's expectations
df_clean = pd.DataFrame()
df_clean['id'] = df_subset['id']
df_clean['title'] = df_subset['name']

# Kaggle usually stores ingredients as a string representation of a list: "['chicken', 'salt']"
# We need to clean that up into a normal comma-separated string: "chicken, salt"
def clean_ingredients(ing_string):
    try:
        ing_list = ast.literal_eval(ing_string)
        return ", ".join(ing_list)
    except:
        return ing_string

df_clean['ingredients'] = df_subset['ingredients'].apply(clean_ingredients)

# Add a placeholder image since the base Kaggle dataset often lacks them
# (We can use our YouTube API later to provide the real visuals!)
df_clean['image'] = "https://placehold.co/600x400?text=Recipe+Found"

# Save the cleaned, standardized Micro-Database
df_clean.to_csv("recipes.csv", index=False)
print("✅ Successfully generated a clean recipes.csv for Ingreedy Engine!")