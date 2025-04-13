import { useState } from "react";
import React from "react";
import "./App.css"; // Correctly import the CSS file

function App() {
  const [ingredients, setIngredients] = useState("");
  const [recipes, setRecipes] = useState([]);

  const fetchRecipes = async () => {
    const query = ingredients.split(",").map((i) => i.trim()).join("&ingredients=");
    try {
      const res = await fetch(`http://127.0.0.1:8000/recipes/?ingredients=${query}`);
      const data = await res.json();
      console.log("API Response:", data); // Debugging log
      setRecipes(data); // Update the state with the fetched recipes
    } catch (error) {
      console.error("Error fetching recipes:", error);
    }
  };

  return (
    <div className="container">
      <h1>🍽️ Recipe Finder</h1>
      <input
        type="text"
        placeholder="Enter ingredients (e.g., chicken, cheese, broccoli)"
        value={ingredients}
        onChange={(e) => setIngredients(e.target.value)}
      />
      <button onClick={fetchRecipes}>Get Recipes</button>

      <div className="grid">
        {recipes.length === 0 ? (
          <p>No recipes found. Try entering some ingredients!</p>
        ) : (
          recipes.map((recipe) => {
            console.log("Rendering recipe:", recipe); // Debugging log
            return (
              <a
                key={recipe.id}
                href={recipe.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="card"
              >
                <img src={recipe.image} alt={recipe.title} />
                <h2>{recipe.title}</h2>
                <p>{recipe.summary}</p>
                <h3>Required Ingredients:</h3>
                <ul>
                  {recipe.required_ingredients.map((ingredient, index) => (
                    <li key={index}>{ingredient}</li>
                  ))}
                </ul>
              </a>
            );
          })
        )}
      </div>
    </div>
  );
}

export default App;
