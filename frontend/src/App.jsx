import { useState } from 'react';

function App() {
  const [currentInput, setCurrentInput] = useState(''); 
  const [pantry, setPantry] = useState([]); 
  const [chefResponse, setChefResponse] = useState(null); 
  
  // THE NEW STATE: Tracking the dropdown selection
  const [cuisine, setCuisine] = useState(''); 

  const handleAddIngredient = () => {
    if (currentInput.trim() !== '') {
      setPantry([...pantry, currentInput.trim()]); 
      setCurrentInput(''); 
    }
  };

  const handleFindMeals = async () => {
    try {
      // THE UPGRADED PAYLOAD: Now sending both ingredients AND cuisine
      const payload = {
        ingredients: pantry,
        cuisine: cuisine !== '' ? cuisine : null // If no cuisine selected, send null
      };

      const response = await fetch('http://127.0.0.1:8000/api/get-recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload), 
      });

      const data = await response.json();
      setChefResponse(data); 
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
          placeholder="e.g., chicken, rice..."
          style={{ padding: '0.5rem', marginRight: '0.5rem' }}
        />
        <button onClick={handleAddIngredient} style={{ padding: '0.5rem' }}>
          Add to Pantry
        </button>
      </div>

      {/* THE NEW UI: Cuisine Dropdown */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ marginRight: '0.5rem', fontWeight: 'bold' }}>Filter by Cuisine:</label>
        <select 
          value={cuisine} 
          onChange={(e) => setCuisine(e.target.value)}
          style={{ padding: '0.5rem' }}
        >
          <option value="">🌎 Global (Any)</option>
          <option value="Italian">🍝 Italian</option>
          <option value="Mexican">🌮 Mexican</option>
          <option value="Asian">🍜 Asian</option>
          <option value="Indian">🍛 Indian</option>
          <option value="American">🍔 American</option>
        </select>
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
      {chefResponse && (
        <div style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ccc' }}>
          <h3>Recipes Found! 🎉</h3>
          <p><strong>Message:</strong> {chefResponse.message}</p>
          
          {chefResponse.data && (
            <ul style={{ listStyleType: 'none', padding: 0 }}>
              {chefResponse.data.map((recipe) => (
                <li key={recipe.id} style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0' }}>{recipe.title}</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#555' }}>
                    Missing Ingredients: {recipe.missedIngredientCount}
                  </p>
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