import { useEffect, useRef, useState } from 'react';

function App() {
  const [currentInput, setCurrentInput] = useState(''); 
  const [pantry, setPantry] = useState([]); 
  
  const [currentSpiceInput, setCurrentSpiceInput] = useState('');
  const [spices, setSpices] = useState([]);

  const [chefResponse, setChefResponse] = useState(null); 
  
  // NEW: The Drafts State
  const [activeDraft, setActiveDraft] = useState(0);
  
  const [expandedRecipeId, setExpandedRecipeId] = useState(null);
  const [instructions, setInstructions] = useState([]);
  const [details, setDetails] = useState(null);
  const [guideError, setGuideError] = useState("");
  const [isLoadingInstructions, setIsLoadingInstructions] = useState(false);
  const [videoIds, setVideoIds] = useState({}); 

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', text: "Hi, I'm your AI Sous-Chef. What are we cooking today?" }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const [features, setFeatures] = useState({ chat: false, video: false });
  const [searching, setSearching] = useState(false);
  const guideRequest = useRef(0);
  useEffect(() => {
    fetch('/api/features').then(r => r.ok ? r.json() : {}).then(setFeatures).catch(() => {});
  }, []);

  // --- Handlers ---
  const handleAddIngredient = (itemToAdd = currentInput) => {
    const items = itemToAdd.split(',').map(i => i.trim().toLowerCase()).filter(Boolean);
    setPantry(previous => [...new Set([...previous, ...items])]);
    setCurrentInput('');
  };

  const handleAddSpice = (itemToAdd = currentSpiceInput) => {
    const items = itemToAdd.split(',').map(i => i.trim().toLowerCase()).filter(Boolean);
    setSpices(previous => [...new Set([...previous, ...items])]);
    setCurrentSpiceInput('');
  };

  const handleFindMeals = async () => {
    setSearching(true);
    guideRequest.current++;
    try {
      const payload = { 
        ingredients: pantry, 
        spices: spices 
      };

      const response = await fetch('/api/get-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), 
      });
      const data = await response.json();
      if (!response.ok || data.status !== "success") throw new Error("Recipe search failed");
      setChefResponse(data); 
      
      // Reset back to Draft 1 and close instructions on a new search
      setActiveDraft(0); 
      setExpandedRecipeId(null);
      setInstructions([]);
    } catch (error) {
      setChefResponse({ status: "error", message: "Recipe search is unavailable. Please try again." });
    } finally {
      setSearching(false);
    }
  };

  const handleToggleInstructions = async (recipeId) => {
    const ticket = ++guideRequest.current;
    if (expandedRecipeId === recipeId) {
      setExpandedRecipeId(null);
      setInstructions([]);
      return;
    }

    setExpandedRecipeId(recipeId);
    setDetails(null);
    setGuideError("");
    setInstructions([]);
    setIsLoadingInstructions(true);

    const recipe = chefResponse?.data?.find(r => r.id === recipeId);
    const title = recipe ? encodeURIComponent(recipe.title) : "";
    const allIngredients = encodeURIComponent([...pantry, ...spices].join(","));

    try {
      const detailsResponse = await fetch(`/api/recipes/${recipeId}`);
      if (!detailsResponse.ok) throw new Error("Recipe details unavailable");
      const recipeDetails = await detailsResponse.json();
      if (guideRequest.current !== ticket) return;
      setDetails(recipeDetails);
      if (features.chat && !recipeDetails.steps.length) {
      const response = await fetch(
        `/api/get-instructions/${recipeId}?recipe_title=${title}&ingredients=${allIngredients}`
      );
      
      const data = await response.json();
      if (guideRequest.current !== ticket) return;
      if (response.ok && data.status === "success") setInstructions(data.steps || []);
      } else setInstructions([]);

      if (features.video && !videoIds[recipeId]) {
        try {
          const videoRes = await fetch(`/api/get-tutorial?recipe_title=${title}`);
          const videoData = await videoRes.json();
          if (videoData.status === "success" && videoData.video_id) {
            setVideoIds(prev => ({ ...prev, [recipeId]: videoData.video_id }));
          }
        } catch (err) {
          console.error("Video load failed");
        }
      }
    } catch (error) {
      if (ticket === guideRequest.current) setGuideError("Could not load the recipe details. Close the guide and try again.");
    } finally {
      if (ticket === guideRequest.current) setIsLoadingInstructions(false);
    }
  };

  const handleSendMessage = async () => {
    if (isChatLoading || chatInput.trim() === '') return;
    const userMessage = { role: 'user', text: chatInput };
    setChatHistory((prev) => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);

    const activeRecipe = chefResponse?.data?.find(r => r.id === expandedRecipeId);
    const recipeTitle = activeRecipe ? activeRecipe.title : "";

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.text,
          recipe_title: recipeTitle,
          pantry: [...pantry, ...spices] 
        }),
      });
      const data = await response.json();
      setChatHistory((prev) => [...prev, { role: 'assistant', text: response.ok && data.reply ? data.reply : "Chat is unavailable right now." }]);
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
          <p style={{ fontSize: '1.1rem', color: '#444746', margin: 0 }}>Find recipes using ingredients you already have.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          
          {/* Main Ingredients Card */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', fontWeight: '500' }}>Main Ingredients</h3>
            <p style={{ fontSize: '0.85rem', color: '#444746', marginBottom: '1rem' }}>The ingredients you want your meal to use</p>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input 
                aria-label="Main ingredients" type="text" value={currentInput} onChange={(e) => setCurrentInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddIngredient()}
                placeholder="e.g., pasta, tomatoes, garlic"
                style={{ minWidth: 0, flex: 1, padding: '0.75rem 1.25rem', border: '1px solid #dadce0', borderRadius: '50px', fontSize: '1rem', outline: 'none' }}
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
              {pantry.map(item => (
                <button key={item} aria-label={`Remove ${item}`} onClick={() => setPantry(previous => previous.filter(value => value !== item))} style={{ border: 0, cursor: 'pointer', backgroundColor: '#e8f0fe', color: '#1a73e8', padding: '6px 14px', borderRadius: '16px', fontSize: '0.85rem', fontWeight: '500' }}>{item} ×</button>
              ))}
            </div>
          </div>

          {/* Spice Rack Card */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', fontWeight: '500' }}>Spice Rack & Staples</h3>
            <p style={{ fontSize: '0.85rem', color: '#444746', marginBottom: '1rem' }}>Oils, seasonings, sauces, butter</p>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input 
                aria-label="Spices and staples" type="text" value={currentSpiceInput} onChange={(e) => setCurrentSpiceInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddSpice()}
                placeholder="e.g., oil, garlic, salt..."
                style={{ minWidth: 0, flex: 1, padding: '0.75rem 1.25rem', border: '1px solid #dadce0', borderRadius: '50px', fontSize: '1rem', outline: 'none' }}
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
              {spices.map(item => (
                <button key={item} aria-label={`Remove ${item}`} onClick={() => setSpices(previous => previous.filter(value => value !== item))} style={{ border: 0, cursor: 'pointer', backgroundColor: '#fce8e6', color: '#d93025', padding: '6px 14px', borderRadius: '16px', fontSize: '0.85rem', fontWeight: '500' }}>{item} ×</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '3rem' }}>
          <button disabled={searching || !(pantry.length + spices.length)} onClick={handleFindMeals} style={{ padding: '0.75rem 2rem', backgroundColor: '#1a73e8', color: '#ffffff', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: '500', fontSize: '1rem', boxShadow: '0 2px 4px rgba(26, 115, 232, 0.3)' }}>
            {searching ? "Finding recipes…" : "Find recipes"}
          </button>
        </div>

        {chefResponse?.status === "error" && <p role="alert">{chefResponse.message}</p>}
        {chefResponse?.data?.length === 0 && <p role="status">No matches. Try adding another pantry ingredient.</p>}
        {chefResponse && chefResponse.data && chefResponse.data.length > 0 && (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            
            {/* The Draft Tabs */}
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #dadce0', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '4px' }}>
              <span style={{ padding: '0.5rem 0', color: '#444746', fontWeight: '500', marginRight: '0.5rem', display: 'flex', alignItems: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Recipe matches
              </span>
              {chefResponse.data.map((recipe, idx) => (
                <button 
                  key={recipe.id}
                  onClick={() => { guideRequest.current++; setActiveDraft(idx); setExpandedRecipeId(null); }}
                  style={{ 
                    padding: '0.5rem 1rem', backgroundColor: 'transparent', border: 'none', 
                    borderBottom: activeDraft === idx ? '2px solid #1a73e8' : '2px solid transparent', 
                    color: activeDraft === idx ? '#1a73e8' : '#444746', 
                    fontWeight: activeDraft === idx ? '600' : '500', 
                    cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap'
                  }}
                >
                  {recipe.title}
                </button>
              ))}
            </div>

            {/* The Active Draft Card */}
            {chefResponse.data[activeDraft] && (() => {
              const recipe = chefResponse.data[activeDraft];
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                    
                    {/* Data Area */}
                    <div style={{ flex: '2 1 300px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.8rem', fontWeight: '500', color: '#1f1f1f', lineHeight: '1.2' }}>{recipe.title}</h2>
                      
                      <div style={{ marginBottom: '1.5rem' }}>
                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#444746' }}>
                          <strong>{recipe.missedIngredientCount === 0 ? "Ingredients covered" : `Missing ${recipe.missedIngredientCount} ingredient${recipe.missedIngredientCount === 1 ? "" : "s"}`}</strong>
                        </p>
                        <p>In your pantry · {recipe.matchedIngredients.join(", ")}</p>
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
                        {expandedRecipeId === recipe.id ? 'Hide recipe details' : 'View recipe & instructions'}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Instructions Area */}
                  {expandedRecipeId === recipe.id && (
                    <div style={{ padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '16px', border: '1px solid #e1e5ea' }}>
                      {videoIds[recipe.id] && <iframe width="100%" height="300" src={`https://www.youtube.com/embed/${videoIds[recipe.id]}`} title="Recipe tutorial" allowFullScreen />}
                      {isLoadingInstructions && <p role="status">Loading recipe details…</p>}
                      {guideError && <p role="alert">{guideError}</p>}
                      {details && (
                        <>
                          <h3>{details.servings ? `Ingredients · serves ${details.servings}` : "All ingredients"}</h3>
                          <ul>{(details.quantities.length ? details.quantities : details.ingredients).map(item => <li key={item}>{item}</li>)}</ul>
                          <p>{details.note}</p>
                          {details.steps.length > 0 && (
                            <>
                              <h3>Cooking instructions</h3>
                              <ol>{details.steps.map((step, index) => <li key={index} style={{ marginBottom: '0.8rem', lineHeight: 1.6 }}>{step}</li>)}</ol>
                              <p style={{ color: '#444746' }}>{details.source}</p>
                            </>
                          )}
                          {details.sourceUrl && <a href={details.sourceUrl} target="_blank" rel="noopener noreferrer">Open original recipe on {details.source} ↗</a>}
                        </>
                      )}
                      {instructions.length > 0 && (
                        <>
                          <h3>AI-generated cooking guide</h3>
                          <ol>{instructions.map((step, index) => <li key={index} style={{ marginBottom: '0.8rem', lineHeight: 1.6 }}>{step}</li>)}</ol>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {features.chat && <div style={{
          position: 'fixed', bottom: '24px', right: '24px', width: isChatOpen ? 'min(380px, calc(100vw - 48px))' : 'auto',
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
                  aria-label="Cooking question" type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask a cooking question..." 
                  style={{ flex: 1, padding: '12px 20px', borderRadius: '50px', border: '1px solid #dadce0', outline: 'none', fontSize: '0.95rem', backgroundColor: '#f8f9fa' }}
                />
                <button aria-label="Send message" disabled={isChatLoading} onClick={handleSendMessage} style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: '#1a73e8', color: '#ffffff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↑</button>
              </div>
            </div>
          )}
        </div>}
      </div>
    </div>
  );
}

export default App;