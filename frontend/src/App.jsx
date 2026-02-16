import { useState } from 'react';

function App() {
  // 1. State Management: The memory of your UI
  const [currentInput, setCurrentInput] = useState(''); // What the user is typing right now
  const [pantry, setPantry] = useState([]); // The list of saved ingredients
  const [chefResponse, setChefResponse] = useState(null); // The data returned from Python

  // 2. Add item to the pantry list
  const handleAddIngredient = () => {
    if (currentInput.trim() !== '') {
      setPantry([...pantry, currentInput.trim()]); // Add new item to existing array
      setCurrentInput(''); // Clear the input field
    }
  };

  // 3. The API Call (The exact same thing Swagger just did)
  const handleFindMeals = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/get-recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // We must format our array exactly how the Python Pydantic model expects it
        body: JSON.stringify({ ingredients: pantry }), 
      });

      const data = await response.json();
      setChefResponse(data); // Save Python's response to React state
      console.log("Backend says:", data);
      
    } catch (error) {
      console.error("The bridge is broken:", error);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Ingreedy 🍳</h1>
      <p>The Struggle Meal Engine</p>

      {/* The Input Section */}
      <div style={{ marginBottom: '1rem' }}>
        <input 
          type="text" 
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          placeholder="e.g., eggs, rice..."
          style={{ padding: '0.5rem', marginRight: '0.5rem' }}
        />
        <button onClick={handleAddIngredient} style={{ padding: '0.5rem' }}>
          Add to Pantry
        </button>
      </div>

      {/* The Visual Pantry */}
      <ul style={{ marginBottom: '1rem' }}>
        {pantry.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>

      {/* The Trigger */}
      <button 
        onClick={handleFindMeals} 
        style={{ padding: '0.75rem', backgroundColor: '#28a745', color: 'white', border: 'none', cursor: 'pointer' }}
      >
        Find Struggle Meal
      </button>

      {/* The Result Display */}
      {/* The Result Display */}
      {chefResponse && (
        <div style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ccc' }}>
          <h3>Recipes Found! 🎉</h3>
          <p><strong>Message:</strong> {chefResponse.message}</p>
          
          {/* Loop through the Spoonacular data and display the titles */}
          {chefResponse.data && (
            <ul style={{ listStyleType: 'none', padding: 0 }}>
              {chefResponse.data.map((recipe) => (
                <li key={recipe.id} style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0' }}>{recipe.title}</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#555' }}>
                    Missing Ingredients: {recipe.missedIngredientCount}
                  </p>
                  {/* Spoonacular gives us images for free! Let's render them */}
                  <img 
                    src={recipe.image} 
                    alt={recipe.title} 
                    style={{ width: '100px', borderRadius: '8px', marginTop: '0.5rem' }} 
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default App;