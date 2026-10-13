// ./js/AddMCQ.jsx

// We attach it to the global window object so the other file can find it
window.AddMCQ = function AddMCQ({ onAdd, onCancel, draftCount, quizTitle }) {
  const [questionText, setQuestionText] = React.useState('');
  const [options, setOptions] = React.useState([
    { text: '', rationale: '', isCorrect: true },
    { text: '', rationale: '', isCorrect: false },
    { text: '', rationale: '', isCorrect: false },
    { text: '', rationale: '', isCorrect: false }
  ]);

  const updateOption = (index, field, value) => {
    const newOptions = [...options];
    newOptions[index][field] = value;
    setOptions(newOptions);
  };

  const setCorrectOption = (selectedIndex) => {
    const newOptions = options.map((opt, i) => ({
      ...opt,
      isCorrect: i === selectedIndex
    }));
    setOptions(newOptions);
  };

  const handleAdd = () => {
    if (!questionText.trim()) {
      alert("Please enter a question.");
      return;
    }

    const validOptions = options.filter(opt => opt.text.trim() !== '');
    if (validOptions.length < 2) {
      alert("Please provide at least 2 answer choices.");
      return;
    }

    if (!validOptions.some(opt => opt.isCorrect)) {
      alert("Please select a correct answer.");
      return;
    }

    const newQuestion = {
      id: 'manual_' + Date.now(), 
      type: "MCQ",
      questionText: questionText.trim(),
      options: validOptions,
      chapter: quizTitle || 'Draft Chapter', 
      
      clientNeed: "Physiological Integrity: Pharmacological and Parenteral Therapies",
      cognitiveLevel: "Application [Applying]",
      concept: "General Nursing",
      correctAnswer: "", 
      difficulty: "Moderate",
      heading: "Custom Admin Question",
      integratedProcesses: "Nursing Process",
      objective: "Demonstrate clinical knowledge",
      page: "N/A",
      questionNumber: draftCount + 1,
      rationale: "" 
    };

    onAdd(newQuestion);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <h3 className="font-bold text-slate-700 flex items-center gap-2">
          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">MCQ</span> Builder
        </h3>
        <button onClick={onCancel} className="text-xs text-slate-500 hover:text-slate-800 underline">
          Change Type
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Question Text</label>
          <textarea 
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="Type the clinical scenario or question here..."
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-3">Answer Choices</label>
          <div className="space-y-4">
            {options.map((opt, index) => (
              <div key={index} className={`p-4 rounded-lg border-2 transition-colors ${opt.isCorrect ? 'border-green-400 bg-green-50/20' : 'border-slate-200 bg-white'}`}>
                <div className="flex gap-3 items-start">
                  <div className="pt-2">
                    <input 
                      type="radio" 
                      name="correctOption" 
                      checked={opt.isCorrect} 
                      onChange={() => setCorrectOption(index)}
                      className="w-4 h-4 text-green-600 focus:ring-green-500 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1 space-y-3">
                    <input 
                      type="text" 
                      value={opt.text}
                      onChange={(e) => updateOption(index, 'text', e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className={`w-full p-2 border-b outline-none text-sm bg-transparent ${opt.isCorrect ? 'border-green-300 focus:border-green-600' : 'border-slate-300 focus:border-blue-500'}`}
                    />
                    <input 
                      type="text" 
                      value={opt.rationale}
                      onChange={(e) => updateOption(index, 'rationale', e.target.value)}
                      placeholder="Rationale (why is this right/wrong?)"
                      className="w-full p-2 rounded bg-slate-50 border border-slate-200 text-xs outline-none focus:border-slate-400"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
        <button 
          onClick={handleAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm"
        >
          Add to Draft →
        </button>
      </div>
    </div>
  );
};