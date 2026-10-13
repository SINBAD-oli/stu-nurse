// ./js/AddBowTie.jsx

window.AddBowTie = function AddBowTie({ onAdd, onCancel, draftCount, quizTitle }) {
  // --- STATE ---
  const [questionPrompt, setQuestionPrompt] = React.useState('');
  const [exhibits, setExhibits] = React.useState([
    { id: 1, title: "Nurses' Notes", content: "" }
  ]);
  const [activeExhibitId, setActiveExhibitId] = React.useState(1);

  const [actions, setActions] = React.useState([
    { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }
  ]);
  const [conditions, setConditions] = React.useState([
    { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }
  ]);
  const [parameters, setParameters] = React.useState([
    { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }
  ]);
  
  const [globalRationale, setGlobalRationale] = React.useState('');

  // --- EXHIBIT HANDLERS ---
  const addExhibit = () => {
    const newId = Date.now();
    setExhibits([...exhibits, { id: newId, title: `Tab ${exhibits.length + 1}`, content: "" }]);
    setActiveExhibitId(newId);
  };

  const updateExhibit = (id, field, value) => {
    setExhibits(exhibits.map(ex => ex.id === id ? { ...ex, [field]: value } : ex));
  };

  const removeExhibit = (id) => {
    if (exhibits.length <= 1) return alert("You must have at least one exhibit tab.");
    const newExhibits = exhibits.filter(ex => ex.id !== id);
    setExhibits(newExhibits);
    if (activeExhibitId === id) setActiveExhibitId(newExhibits[0].id);
  };

  // --- WORD BANK HANDLERS ---
  const updateList = (setter, list, index, value) => {
    const newList = [...list];
    newList[index].text = value;
    setter(newList);
  };

  const toggleCheckbox = (setter, list, index) => {
    const newList = [...list];
    newList[index].isCorrect = !newList[index].isCorrect;
    setter(newList);
  };

  const setRadio = (setter, list, index) => {
    const newList = list.map((item, i) => ({ ...item, isCorrect: i === index }));
    setter(newList);
  };

  const addOption = (setter, list) => {
    setter([...list, { text: '', isCorrect: false }]);
  };

  const removeOption = (setter, list, indexToRemove) => {
    if (list.length <= 2) return alert("Must have at least 2 options.");
    setter(list.filter((_, i) => i !== indexToRemove));
  };

  // --- SUBMIT HANDLER ---
  const handleAdd = () => {
    const validExhibits = exhibits.filter(ex => ex.content.trim() !== '');
    if (validExhibits.length === 0) return alert("Please add content to at least one exhibit tab.");

    const validActions = actions.filter(a => a.text.trim() !== '');
    const validConditions = conditions.filter(c => c.text.trim() !== '');
    const validParameters = parameters.filter(p => p.text.trim() !== '');

    if (validActions.filter(a => a.isCorrect).length !== 2) return alert("Bow Tie format requires exactly TWO correct Actions to Take.");
    if (validConditions.filter(c => c.isCorrect).length !== 1) return alert("Bow Tie format requires exactly ONE correct Potential Condition.");
    if (validParameters.filter(p => p.isCorrect).length !== 2) return alert("Bow Tie format requires exactly TWO correct Parameters to Monitor.");

    if (!globalRationale.trim()) return alert("Please provide a global rationale.");

    const newQuestion = {
      id: 'manual_' + Date.now(), 
      type: "BowTie",
      exhibits: validExhibits,
      actions: validActions,
      conditions: validConditions,
      parameters: validParameters,
      rationale: globalRationale.trim(),
      questionText: questionPrompt.trim() || "Analyze the client data below and complete the bow tie diagram.",
      chapter: quizTitle || 'Draft Chapter', 
      clientNeed: "Physiological Integrity: Reduction of Risk Potential",
      cognitiveLevel: "Analyze [Analyzing]",
      concept: "Clinical Judgment",
      difficulty: "Hard",
      questionNumber: draftCount + 1
    };

    onAdd(newQuestion);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center shadow-sm z-10">
        <h3 className="font-bold text-slate-700 flex items-center gap-2">
          <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs">Bow Tie</span> Builder
        </h3>
        <button onClick={onCancel} className="text-xs text-slate-500 hover:text-slate-800 underline">
          Change Type
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* --- QUESTION PROMPT --- */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Question Instructions / Prompt</label>
          <textarea 
            value={questionPrompt}
            onChange={(e) => setQuestionPrompt(e.target.value)}
            placeholder="e.g., Complete the diagram by selecting the client's condition, actions, and parameters..."
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-none h-20 text-sm"
          />
        </div>

        {/* --- EXHIBIT BUILDER --- */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-end mb-4">
            <label className="block text-sm font-semibold text-slate-700">Client Exhibits (Scenario)</label>
            <button onClick={addExhibit} className="text-xs font-medium text-orange-600 hover:text-orange-800">+ Add Tab</button>
          </div>
          
          <div className="flex border-b border-slate-200 mb-4 overflow-x-auto">
            {exhibits.map(ex => (
              <button 
                key={ex.id}
                onClick={() => setActiveExhibitId(ex.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${activeExhibitId === ex.id ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                {ex.title || 'Untitled'}
              </button>
            ))}
          </div>

          {exhibits.map(ex => ex.id === activeExhibitId && (
            <div key={ex.id} className="space-y-3 relative">
              <input 
                type="text" 
                value={ex.title} 
                onChange={(e) => updateExhibit(ex.id, 'title', e.target.value)}
                placeholder="Tab Title (e.g., Nurses' Notes)"
                className="w-1/2 p-2 border border-slate-300 rounded text-sm outline-none focus:border-orange-400"
              />
              <textarea 
                value={ex.content}
                onChange={(e) => updateExhibit(ex.id, 'content', e.target.value)}
                placeholder="Enter clinical data, vital signs, or history here..."
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-none h-32 text-sm"
              />
              <button onClick={() => removeExhibit(ex.id)} className="absolute top-0 right-0 text-xs text-red-500 hover:underline">Remove Tab</button>
            </div>
          ))}
        </div>

        {/* --- WORD BANK GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Actions (Pick 2) */}
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <h4 className="font-bold text-blue-800 text-sm mb-3 text-center">Actions to Take</h4>
            <p className="text-[10px] text-blue-600 text-center mb-4 uppercase font-semibold tracking-wider">Select exactly 2</p>
            <div className="space-y-2">
              {actions.map((opt, i) => (
                <div key={i} className="flex gap-2 items-center bg-white p-2 border border-slate-200 rounded relative group">
                  <input type="checkbox" checked={opt.isCorrect} onChange={() => toggleCheckbox(setActions, actions, i)} className="w-4 h-4 text-blue-600 accent-blue-600 cursor-pointer" />
                  <input type="text" value={opt.text} onChange={(e) => updateList(setActions, actions, i, e.target.value)} placeholder={`Action ${i+1}`} className="flex-1 text-xs outline-none bg-transparent" />
                  <button onClick={() => removeOption(setActions, actions, i)} className="text-slate-300 hover:text-red-500 hidden group-hover:block text-xs px-1">✕</button>
                </div>
              ))}
              <button onClick={() => addOption(setActions, actions)} className="text-xs text-blue-600 hover:underline w-full text-center mt-2">+ Add Action</button>
            </div>
          </div>

          {/* Conditions (Pick 1) */}
          <div className="bg-green-50/50 p-4 rounded-xl border border-green-100">
            <h4 className="font-bold text-green-800 text-sm mb-3 text-center">Potential Condition</h4>
            <p className="text-[10px] text-green-600 text-center mb-4 uppercase font-semibold tracking-wider">Select exactly 1</p>
            <div className="space-y-2">
              {conditions.map((opt, i) => (
                <div key={i} className="flex gap-2 items-center bg-white p-2 border border-slate-200 rounded relative group">
                  <input type="radio" name="condition" checked={opt.isCorrect} onChange={() => setRadio(setConditions, conditions, i)} className="w-4 h-4 text-green-600 accent-green-600 cursor-pointer" />
                  <input type="text" value={opt.text} onChange={(e) => updateList(setConditions, conditions, i, e.target.value)} placeholder={`Condition ${i+1}`} className="flex-1 text-xs outline-none bg-transparent" />
                  <button onClick={() => removeOption(setConditions, conditions, i)} className="text-slate-300 hover:text-red-500 hidden group-hover:block text-xs px-1">✕</button>
                </div>
              ))}
              <button onClick={() => addOption(setConditions, conditions)} className="text-xs text-green-600 hover:underline w-full text-center mt-2">+ Add Condition</button>
            </div>
          </div>

          {/* Parameters (Pick 2) */}
          <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100">
            <h4 className="font-bold text-orange-800 text-sm mb-3 text-center">Parameters to Monitor</h4>
            <p className="text-[10px] text-orange-600 text-center mb-4 uppercase font-semibold tracking-wider">Select exactly 2</p>
            <div className="space-y-2">
              {parameters.map((opt, i) => (
                <div key={i} className="flex gap-2 items-center bg-white p-2 border border-slate-200 rounded relative group">
                  <input type="checkbox" checked={opt.isCorrect} onChange={() => toggleCheckbox(setParameters, parameters, i)} className="w-4 h-4 text-orange-600 accent-orange-600 cursor-pointer" />
                  <input type="text" value={opt.text} onChange={(e) => updateList(setParameters, parameters, i, e.target.value)} placeholder={`Parameter ${i+1}`} className="flex-1 text-xs outline-none bg-transparent" />
                  <button onClick={() => removeOption(setParameters, parameters, i)} className="text-slate-300 hover:text-red-500 hidden group-hover:block text-xs px-1">✕</button>
                </div>
              ))}
              <button onClick={() => addOption(setParameters, parameters)} className="text-xs text-orange-600 hover:underline w-full text-center mt-2">+ Add Parameter</button>
            </div>
          </div>

        </div>

        {/* --- GLOBAL RATIONALE --- */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Global Rationale</label>
          <textarea 
            value={globalRationale}
            onChange={(e) => setGlobalRationale(e.target.value)}
            placeholder="Explain the pathophysiology, why the condition was chosen, and why the specific actions and parameters are correct..."
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-none h-24 text-sm"
          />
        </div>

      </div>

      <div className="p-4 border-t border-slate-200 bg-white flex justify-end shadow-sm">
        <button 
          onClick={handleAdd}
          className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm"
        >
          Add to Draft →
        </button>
      </div>
    </div>
  );
};