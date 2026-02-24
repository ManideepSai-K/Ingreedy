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

print("👔 Applying Professional Filter...")
def is_standard_name(title):
    title = str(title).lower()
    
    # 1. Reject if it has numbers or weird symbols (only allow letters, spaces, and hyphens)
    if not re.match(r'^[a-z\s\-]+$', title): 
        return False
    
    words = title.split()
    
    # 2. Reject if it's too long (blog post title) or too short (just "chicken")
    if len(words) < 2 or len(words) > 5: 
        return False
    
    # 3. Reject informal mommy-blog buzzwords
    blog_words = {'mom', 'dad', 'hubby', 'best', 'ever', 'easy', 'quick', 'super', 'delicious', 'yummy', 'my', 'style', 'good', 'favorite', 'secret', 'minute', 'perfect', 'the'}
    if any(word in blog_words for word in words): 
        return False
    
    return True

# Apply the strict filter to the entire 500k dataset
df_raw['is_standard'] = df_raw['name'].apply(is_standard_name)
df_clean_pool = df_raw[df_raw['is_standard'] == True]

print(f"🔪 Sliced away the garbage. Found {len(df_clean_pool)} perfectly named recipes.")

# Now we grab our subset from ONLY the highly professional names
df_subset = df_clean_pool.head(100000).copy()

# ... (The rest of your script stays exactly the same from here down!)

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