// ./js/AddMatrix.jsx

function AddMatrix({ onAdd, onCancel, draftCount, quizTitle }) {
  const [chapter, setChapter] = React.useState(quizTitle || '');
  const [heading, setHeading] = React.useState('');
  const [questionNumber, setQuestionNumber] = React.useState(draftCount + 1);
  const [page, setPage] = React.useState('');
  const [difficulty, setDifficulty] = React.useState('Moderate');
  const [cognitiveLevel, setCognitiveLevel] = React.useState('');
  const [clientNeed, setClientNeed] = React.useState('');
  const [concept, setConcept] = React.useState('');
  const [integratedProcesses, setIntegratedProcesses] = React.useState('');
  const [objective, setObjective] = React.useState('');
  const [questionText, setQuestionText] = React.useState('');
  const [rationale, setRationale] = React.useState('');

  const [columns, setColumns] = React.useState(['Decreased Tissue Perfusion', 'Pulmonary Congestion']);
  const [newColText, setNewColText] = React.useState('');
  
  const [rows, setRows] = React.useState([
    { text: 'Urine output of 25 mL/hr', selections: [true, false] }
  ]);
  const [newRowText, setNewRowText] = React.useState('');

  const addColumn = () => {
    if (!newColText.trim()) return;
    const updatedCols = [...columns, newColText.trim()];
    setColumns(updatedCols);
    setRows(rows.map(r => ({ ...r, selections: [...r.selections, false] })));
    setNewColText('');
  };

  const removeColumn = (index) => {
    if (columns.length <= 1) return;
    const updatedCols = columns.filter((_, i) => i !== index);
    setColumns(updatedCols);
    setRows(rows.map(r => ({
      ...r,
      selections: r.selections.filter((_, i) => i !== index)
    })));
  };

  const addRow = () => {
    if (!newRowText.trim()) return;
    setRows([...rows, { text: newRowText.trim(), selections: new Array(columns.length).fill(false) }]);
    setNewRowText('');
  };

  const removeRow = (index) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const toggleSelection = (rowIndex, colIndex) => {
    const updatedRows = [...rows];
    updatedRows[rowIndex].selections[colIndex] = !updatedRows[rowIndex].selections[colIndex];
    setRows(updatedRows);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!questionText.trim() || rows.length === 0 || columns.length === 0) {
      alert('Please fill out the question prompt, at least one column, and one row.');
      return;
    }

    const formattedRows = rows.map(r => ({
      text: r.text,
      options: columns.map((col, idx) => ({
        text: col,
        isCorrect: r.selections[idx]
      }))
    }));

    const questionPayload = {
      id: 'matrix_' + Date.now(),
      type: 'matrix',
      chapter: quizTitle || chapter || 'Custom Chapter',
      heading,
      questionNumber: Number(questionNumber) || (draftCount + 1),
      page: Number(page) || 0,
      difficulty,
      cognitiveLevel,
      clientNeed,
      concept,
      integratedProcesses,
      objective,
      questionText,
      rationale,
      columns,
      rows: formattedRows
    };

    if (onAdd) onAdd(questionPayload);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[600px] overflow-y-auto text-slate-800">
      <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Create NGN Matrix Question</h3>
          <p className="text-xs text-slate-500">Configure columns, statements, and correct cell selections.</p>
        </div>
        {onCancel && (
          <button 
            type="button" 
            onClick={onCancel}
            className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
          >
            Cancel
          </button>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Chapter / Quiz Title</label>
            <input 
              type="text" 
              value={chapter} 
              onChange={e => setChapter(e.target.value)} 
              placeholder="e.g. Chapter 33" 
              className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Heading</label>
            <input 
              type="text" 
              value={heading} 
              onChange={e => setHeading(e.target.value)} 
              placeholder="e.g. Oxygenation" 
              className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Question Number</label>
            <input 
              type="number" 
              value={questionNumber} 
              onChange={e => setQuestionNumber(e.target.value)} 
              className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Page</label>
            <input 
              type="number" 
              value={page} 
              onChange={e => setPage(e.target.value)} 
              placeholder="e.g. 1408" 
              className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Difficulty</label>
            <select 
              value={difficulty} 
              onChange={e => setDifficulty(e.target.value)} 
              className="w-full p-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="Easy">Easy</option>
              <option value="Moderate">Moderate</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Cognitive Level</label>
            <input 
              type="text" 
              value={cognitiveLevel} 
              onChange={e => setCognitiveLevel(e.target.value)} 
              placeholder="e.g. Analysis [Analyzing]" 
              className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Question Prompt / Instructions</label>
          <textarea 
            value={questionText} 
            onChange={e => setQuestionText(e.target.value)} 
            rows={2} 
            placeholder="For each assessment finding, determine whether..." 
            className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
          />
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Column Headers</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {columns.map((col, index) => (
              <div key={index} className="flex items-center bg-white border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-medium gap-2 shadow-sm">
                <span>{col}</span>
                {columns.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => removeColumn(index)} 
                    className="text-red-500 hover:text-red-700 font-bold"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={newColText} 
              onChange={e => setNewColText(e.target.value)} 
              placeholder="New column name..." 
              className="flex-1 p-2 text-xs border border-slate-300 rounded-lg bg-white outline-none" 
            />
            <button 
              type="button" 
              onClick={addColumn} 
              className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-700"
            >
              Add Column
            </button>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Matrix Rows & Correct Answers</label>
          <div className="flex gap-2 mb-3">
            <input 
              type="text" 
              value={newRowText} 
              onChange={e => setNewRowText(e.target.value)} 
              placeholder="New row statement / finding..." 
              className="flex-1 p-2 text-xs border border-slate-300 rounded-lg bg-white outline-none" 
            />
            <button 
              type="button" 
              onClick={addRow} 
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"
            >
              Add Row
            </button>
          </div>

          {rows.length > 0 && (
            <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 text-slate-700 text-left">
                    <th className="p-2.5 font-semibold">Finding / Statement</th>
                    {columns.map((col, idx) => (
                      <th key={idx} className="p-2.5 font-semibold text-center text-blue-600">{col}</th>
                    ))}
                    <th className="p-2.5 text-center font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rIdx) => (
                    <tr key={rIdx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-2.5 text-slate-800 font-medium">{row.text}</td>
                      {columns.map((_, cIdx) => (
                        <td key={cIdx} className="p-2.5 text-center">
                          <input 
                            type="checkbox" 
                            checked={row.selections[cIdx]} 
                            onChange={() => toggleSelection(rIdx, cIdx)} 
                            className="cursor-pointer w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" 
                          />
                        </td>
                      ))}
                      <td className="p-2.5 text-center">
                        <button 
                          type="button" 
                          onClick={() => removeRow(rIdx)} 
                          className="text-red-500 hover:text-red-700 font-bold px-2 py-1"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Overall Rationale</label>
          <textarea 
            value={rationale} 
            onChange={e => setRationale(e.target.value)} 
            rows={2} 
            placeholder="Explain correct mappings..." 
            className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
          />
        </div>

        <div className="pt-2">
          <button 
            type="submit" 
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 shadow-sm transition-colors"
          >
            Add Matrix Question to Draft
          </button>
        </div>
      </form>
    </div>
  );
}

// Attach globally for in-browser Babel loading
window.AddMatrix = AddMatrix;