import { useState } from 'react';

function App() {
  const [currentInput, setCurrentInput] = useState(''); 
  const [pantry, setPantry] = useState([]); 
  
  const [currentSpiceInput, setCurrentSpiceInput] = useState('');
  const [spices, setSpices] = useState([]);

  const [chefResponse, setChefResponse] = useState(null); 
  const [cuisine, setCuisine] = useState(''); 
  
  // NEW: The Drafts State
  const [activeDraft, setActiveDraft] = useState(0);
  
  const [expandedRecipeId, setExpandedRecipeId] = useState(null);
  const [instructions, setInstructions] = useState([]);
  const [isLoadingInstructions, setIsLoadingInstructions] = useState(false);
  const [videoIds, setVideoIds] = useState({}); 

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', text: "Hi, I'm your AI Sous-Chef. What are we cooking today?" }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // --- Handlers ---
  const handleAddIngredient = (itemToAdd = currentInput) => {
    if (itemToAdd.trim() !== '' && !pantry.includes(itemToAdd.trim())) {
      setPantry([...pantry, itemToAdd.trim()]); 
      setCurrentInput(''); 
    }
  };

  const handleAddSpice = (itemToAdd = currentSpiceInput) => {
    if (itemToAdd.trim() !== '' && !spices.includes(itemToAdd.trim())) {
      setSpices([...spices, itemToAdd.trim()]);
      setCurrentSpiceInput('');
    }
  };

  const handleFindMeals = async () => {
    try {
      const payload = { 
        ingredients: pantry, 
        cuisine: cuisine !== '' ? cuisine : null,
        spices: spices 
      };

      const response = await fetch('http://127.0.0.1:8000/api/get-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), 
      });
      const data = await response.json();
      setChefResponse(data); 
      
      // Reset back to Draft 1 and close instructions on a new search
      setActiveDraft(0); 
      setExpandedRecipeId(null);
      setInstructions([]);
    } catch (error) {
      console.error("API connection failed:", error);
    }
  };

  const handleToggleInstructions = async (recipeId) => {
    if (expandedRecipeId === recipeId) {
      setExpandedRecipeId(null);
      setInstructions([]);
      return;
    }

    setExpandedRecipeId(recipeId);
    setIsLoadingInstructions(true);

    const recipe = chefResponse?.data?.find(r => r.id === recipeId);
    const title = recipe ? encodeURIComponent(recipe.title) : "";
    const allIngredients = encodeURIComponent([...pantry, ...spices].join(","));

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/get-instructions/${recipeId}?recipe_title=${title}&ingredients=${allIngredients}`
      );
      
      const data = await response.json();
      setInstructions(data.steps || []);

      if (!videoIds[recipeId]) {
        try {
          const videoRes = await fetch(`http://127.0.0.1:8000/api/get-tutorial?recipe_title=${title}`);
          const videoData = await videoRes.json();
          if (videoData.status === "success" && videoData.video_id) {
            setVideoIds(prev => ({ ...prev, [recipeId]: videoData.video_id }));
          }
        } catch (err) {
          console.error("Video load failed");
        }
      }
    } catch (error) {
      setInstructions(["Error loading instructions. Please try again."]);
    } finally {
      setIsLoadingInstructions(false);
    }
  };

  const handleSendMessage = async () => {
    if (chatInput.trim() === '') return;
    const userMessage = { role: 'user', text: chatInput };
    setChatHistory((prev) => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);

    const activeRecipe = chefResponse?.data?.find(r => r.id === expandedRecipeId);
    const recipeTitle = activeRecipe ? activeRecipe.title : "";

    try {
      const response = await fetch('http://127.0.0.1:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.text,
          recipe_title: recipeTitle,
          pantry: [...pantry, ...spices] 
        }),
      });
      const data = await response.json();
      setChatHistory((prev) => [...prev, { role: 'assistant', text: data.reply }]);
    } catch (error) {
      setChatHistory((prev) => [...prev, { role: 'assistant', text: "Connection error." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f4f9', padding: '3rem 1.5rem', fontFamily: '"Google Sans", "Segoe UI", Roboto, Helvetica, Arial, sans-serif', color: '#1f1f1f' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '100px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '500', margin: '0 0 0.5rem 0', background: 'linear-gradient(74deg, #4285f4 0, #9b72cb 9%, #d96570 20%, #d96570 24%, #9b72cb 35%, #4285f4 44%, #9b72cb 50%, #d96570 56%, #1f1f1f 75%, #1f1f1f 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ✨ Ingreedy Engine
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#444746', margin: 0 }}>Intelligent meal generation from your pantry.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          
          {/* Main Ingredients Card */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', fontWeight: '500' }}>Main Ingredients</h3>
            <p style={{ fontSize: '0.85rem', color: '#444746', marginBottom: '1rem' }}>Proteins, carbs, heavy veggies</p>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input 
                type="text" value={currentInput} onChange={(e) => setCurrentInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddIngredient()}
                placeholder="e.g., chicken, rice..."
                style={{ flex: 1, padding: '0.75rem 1.25rem', border: '1px solid #dadce0', borderRadius: '50px', fontSize: '1rem', outline: 'none' }}
              />
              <button onClick={() => handleAddIngredient()} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#f0f4f9', color: '#1f1f1f', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: '500' }}>Add</button>
            </div>
            
            {/* NEW: Quick Add Buttons for Pantry */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
              {['Chicken', 'Rice', 'Eggs', 'Onion', 'Garlic', 'Tomatoes'].map(item => (
                <button key={item} onClick={() => handleAddIngredient(item)} style={{ padding: '4px 10px', backgroundColor: '#ffffff', border: '1px solid #dadce0', borderRadius: '16px', fontSize: '0.75rem', color: '#444746', cursor: 'pointer' }}>+ {item}</button>
              ))}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {pantry.map((item, index) => (
                <span key={index} style={{ backgroundColor: '#e8f0fe', color: '#1a73e8', padding: '6px 14px', borderRadius: '16px', fontSize: '0.85rem', fontWeight: '500' }}>{item}</span>
              ))}
            </div>
          </div>

          {/* Spice Rack Card */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', fontWeight: '500' }}>Spice Rack & Staples</h3>
            <p style={{ fontSize: '0.85rem', color: '#444746', marginBottom: '1rem' }}>Oils, seasonings, sauces, butter</p>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input 
                type="text" value={currentSpiceInput} onChange={(e) => setCurrentSpiceInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddSpice()}
                placeholder="e.g., oil, garlic, salt..."
                style={{ flex: 1, padding: '0.75rem 1.25rem', border: '1px solid #dadce0', borderRadius: '50px', fontSize: '1rem', outline: 'none' }}
              />
              <button onClick={() => handleAddSpice()} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#f0f4f9', color: '#1f1f1f', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: '500' }}>Add</button>
            </div>

            {/* NEW: Quick Add Buttons for Spices */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
              {['Salt', 'Pepper', 'Olive Oil', 'Butter', 'Soy Sauce', 'Chili'].map(item => (
                <button key={item} onClick={() => handleAddSpice(item)} style={{ padding: '4px 10px', backgroundColor: '#ffffff', border: '1px solid #dadce0', borderRadius: '16px', fontSize: '0.75rem', color: '#444746', cursor: 'pointer' }}>+ {item}</button>
              ))}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {spices.map((item, index) => (
                <span key={index} style={{ backgroundColor: '#fce8e6', color: '#d93025', padding: '6px 14px', borderRadius: '16px', fontSize: '0.85rem', fontWeight: '500' }}>{item}</span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '3rem' }}>
          <select value={cuisine} onChange={(e) => setCuisine(e.target.value)} style={{ padding: '0.75rem 1.5rem', borderRadius: '50px', border: '1px solid #dadce0', outline: 'none', backgroundColor: '#ffffff', cursor: 'pointer', fontSize: '0.95rem', fontWeight: '500' }}>
            <option value="">🌎 Global (Any)</option>
            <option value="Italian">🍝 Italian</option>
            <option value="Mexican">🌮 Mexican</option>
            <option value="Asian">🍜 Asian</option>
            <option value="Indian">🍛 Indian</option>
            <option value="American">🍔 American</option>
          </select>
          <button onClick={handleFindMeals} style={{ padding: '0.75rem 2rem', backgroundColor: '#1a73e8', color: '#ffffff', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: '500', fontSize: '1rem', boxShadow: '0 2px 4px rgba(26, 115, 232, 0.3)' }}>
            Generate Recipes ✨
          </button>
        </div>

        {/* --- NEW: The "Drafts" Interface --- */}
        {chefResponse && chefResponse.data && chefResponse.data.length > 0 && (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            
            {/* The Draft Tabs */}
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #dadce0', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '4px' }}>
              <span style={{ padding: '0.5rem 0', color: '#444746', fontWeight: '500', marginRight: '0.5rem', display: 'flex', alignItems: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                View other drafts:
              </span>
              {chefResponse.data.slice(0, 3).map((recipe, idx) => (
                <button 
                  key={recipe.id}
                  onClick={() => { setActiveDraft(idx); setExpandedRecipeId(null); }}
                  style={{ 
                    padding: '0.5rem 1rem', backgroundColor: 'transparent', border: 'none', 
                    borderBottom: activeDraft === idx ? '2px solid #1a73e8' : '2px solid transparent', 
                    color: activeDraft === idx ? '#1a73e8' : '#444746', 
                    fontWeight: activeDraft === idx ? '600' : '500', 
                    cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap'
                  }}
                >
                  Option {idx + 1}
                </button>
              ))}
            </div>

            {/* The Active Draft Card */}
            {chefResponse.data[activeDraft] && (() => {
              const recipe = chefResponse.data[activeDraft];
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                    
                    {/* Image Area */}
                    <div style={{ flex: '1 1 300px', position: 'relative', borderRadius: '16px', overflow: 'hidden', height: '250px' }}>
                      <img src={recipe.image} alt={recipe.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {recipe.matchScore !== undefined && (
                        <div style={{ position: 'absolute', top: '16px', right: '16px', backgroundColor: recipe.matchScore > 50 ? '#e6f4ea' : '#fef7e0', color: recipe.matchScore > 50 ? '#137333' : '#b06000', padding: '6px 12px', borderRadius: '50px', fontWeight: '600', fontSize: '0.85rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                          {recipe.matchScore}% Match
                        </div>
                      )}
                    </div>

                    {/* Data Area */}
                    <div style={{ flex: '2 1 300px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.8rem', fontWeight: '500', color: '#1f1f1f', lineHeight: '1.2' }}>{recipe.title}</h2>
                      
                      <div style={{ marginBottom: '1.5rem' }}>
                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#444746' }}>
                          Missing Ingredients: <strong style={{ color: '#1f1f1f' }}>{recipe.missedIngredientCount}</strong>
                        </p>
                        {recipe.missedIngredientCount > 0 && (
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {recipe.missedIngredients?.map((i, idx) => (
                              <span key={idx} style={{ backgroundColor: '#fce8e6', color: '#d93025', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '500' }}>
                                {i.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <button 
                        onClick={() => handleToggleInstructions(recipe.id)} 
                        style={{ alignSelf: 'flex-start', padding: '0.75rem 2rem', backgroundColor: '#f0f4f9', color: '#1a73e8', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: '600', transition: 'background-color 0.2s' }}
                      >
                        {expandedRecipeId === recipe.id ? 'Hide Instructions' : 'View Instructions'}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Instructions Area */}
                  {expandedRecipeId === recipe.id && (
                    <div style={{ padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '16px', border: '1px solid #e1e5ea' }}>
                      {isLoadingInstructions ? <p style={{ margin: 0, color: '#444746' }}>✨ AI is writing the manual...</p> : instructions.length > 0 ? (
                        <>
                          {videoIds[recipe.id] && (
                            <div style={{ marginBottom: '1.5rem', borderRadius: '12px', overflow: 'hidden' }}>
                              <iframe width="100%" height="350" src={`https://www.youtube.com/embed/${videoIds[recipe.id]}`} title="YouTube video player" frameBorder="0" allowFullScreen></iframe>
                            </div>
                          )}
                          <h4 style={{ margin: '0 0 1rem 0', color: '#1f1f1f', fontSize: '1.1rem' }}>Step-by-Step Instructions</h4>
                          <ol style={{ margin: 0, paddingLeft: '1.5rem', color: '#444746', fontSize: '1rem' }}>
                            {instructions.map((step, idx) => <li key={idx} style={{ marginBottom: '0.75rem', lineHeight: '1.6' }}>{step}</li>)}
                          </ol>
                        </>
                      ) : <p style={{ margin: 0, color: '#d93025' }}>No instructions available.</p>}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* --- AI Chatbot (Remains Unchanged) --- */}
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', width: isChatOpen ? '380px' : 'auto',
          backgroundColor: '#ffffff', borderRadius: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column', zIndex: 1000, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          <div onClick={() => setIsChatOpen(!isChatOpen)} style={{ backgroundColor: '#ffffff', padding: '16px 24px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: isChatOpen ? '1px solid #f0f4f9' : 'none' }}>
            <span style={{ fontWeight: '500', color: '#1f1f1f', display: 'flex', alignItems: 'center', gap: '8px' }}>✨ AI Sous-Chef</span>
            <span style={{ color: '#444746' }}>{isChatOpen ? '✕' : '▲'}</span>
          </div>
          
          {isChatOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '450px' }}>
              <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', backgroundColor: '#ffffff' }}>
                {chatHistory.map((msg, idx) => (
                  <div key={idx} style={{ marginBottom: '1rem', display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      padding: '12px 16px', borderRadius: msg.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                      backgroundColor: msg.role === 'user' ? '#e8f0fe' : '#f0f4f9', color: msg.role === 'user' ? '#1a73e8' : '#1f1f1f',
                      maxWidth: '85%', fontSize: '0.95rem', lineHeight: '1.4'
                    }}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isChatLoading && <div style={{ textAlign: 'left', fontSize: '0.9rem', color: '#444746', marginLeft: '8px' }}>✨ Thinking...</div>}
              </div>
              
              <div style={{ padding: '16px', borderTop: '1px solid #f0f4f9', display: 'flex', gap: '8px', backgroundColor: '#ffffff' }}>
                <input 
                  type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask a cooking question..." 
                  style={{ flex: 1, padding: '12px 20px', borderRadius: '50px', border: '1px solid #dadce0', outline: 'none', fontSize: '0.95rem', backgroundColor: '#f8f9fa' }}
                />
                <button onClick={handleSendMessage} style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: '#1a73e8', color: '#ffffff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↑</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;