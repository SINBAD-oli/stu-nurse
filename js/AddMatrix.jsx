import React, { useState } from 'react';
import { db } from './firebase-config.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export default function AddMatrix({ onBack }) {
  const [chapter, setChapter] = useState('');
  const [heading, setHeading] = useState('');
  const [questionNumber, setQuestionNumber] = useState('');
  const [page, setPage] = useState('');
  const [difficulty, setDifficulty] = useState('Moderate');
  const [cognitiveLevel, setCognitiveLevel] = useState('');
  const [clientNeed, setClientNeed] = useState('');
  const [concept, setConcept] = useState('');
  const [integratedProcesses, setIntegratedProcesses] = useState('');
  const [objective, setObjective] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [rationale, setRationale] = useState('');

  const [columns, setColumns] = useState(['Decreased Tissue Perfusion', 'Pulmonary Congestion']);
  const [newColText, setNewColText] = useState('');
  
  const [rows, setRows] = useState([
    { text: 'Urine output of 25 mL/hr', selections: [true, false] }
  ]);
  const [newRowText, setNewRowText] = useState('');

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

  const handleSave = async (e) => {
    e.preventDefault();
    if (!questionText.trim() || rows.length === 0 || columns.length === 0) {
      alert('Please fill out the question text, at least one column, and one row.');
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
      type: "matrix",
      chapter,
      heading,
      questionNumber: Number(questionNumber) || 0,
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
      rows: formattedRows,
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, "questions"), questionPayload);
      alert("Matrix question successfully saved to Firestore!");
      if (onBack) onBack();
    } catch (err) {
      console.error("Error saving matrix question:", err);
      alert("Error saving question. Check console.");
    }
  };

  return (
    <div style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid #334155', borderRadius: '8px', padding: '16px', color: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', color: '#38bdf8' }}>➕ Create NGN Matrix Question</h3>
        {onBack && <button onClick={onBack} style={{ background: '#475569', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer' }}>Back</button>}
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8' }}>Chapter</label>
            <input type="text" value={chapter} onChange={e => setChapter(e.target.value)} placeholder="e.g. Chapter 33" style={{ width: '100%', background: '#1e293b', border: '1px solid #475569', color: 'white', padding: '6px', borderRadius: '4px', fontSize: '12px' }} />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8' }}>Heading</label>
            <input type="text" value={heading} onChange={e => setHeading(e.target.value)} placeholder="e.g. Oxygenation" style={{ width: '100%', background: '#1e293b', border: '1px solid #475569', color: 'white', padding: '6px', borderRadius: '4px', fontSize: '12px' }} />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8' }}>Question Number</label>
            <input type="number" value={questionNumber} onChange={e => setQuestionNumber(e.target.value)} placeholder="e.g. 2" style={{ width: '100%', background: '#1e293b', border: '1px solid #475569', color: 'white', padding: '6px', borderRadius: '4px', fontSize: '12px' }} />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8' }}>Page</label>
            <input type="number" value={page} onChange={e => setPage(e.target.value)} placeholder="e.g. 1408" style={{ width: '100%', background: '#1e293b', border: '1px solid #475569', color: 'white', padding: '6px', borderRadius: '4px', fontSize: '12px' }} />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8' }}>Difficulty</label>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value)} style={{ width: '100%', background: '#1e293b', border: '1px solid #475569', color: 'white', padding: '6px', borderRadius: '4px', fontSize: '12px' }}>
              <option value="Easy">Easy</option>
              <option value="Moderate">Moderate</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8' }}>Cognitive Level</label>
            <input type="text" value={cognitiveLevel} onChange={e => setCognitiveLevel(e.target.value)} placeholder="e.g. Analysis [Analyzing]" style={{ width: '100%', background: '#1e293b', border: '1px solid #475569', color: 'white', padding: '6px', borderRadius: '4px', fontSize: '12px' }} />
          </div>
        </div>

        <div>
          <label style={{ fontSize: '11px', color: '#94a3b8' }}>Question Prompt / Instructions</label>
          <textarea value={questionText} onChange={e => setQuestionText(e.target.value)} rows={2} placeholder="For each assessment finding, determine whether..." style={{ width: '100%', background: '#1e293b', border: '1px solid #475569', color: 'white', padding: '8px', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }} />
        </div>

        <div style={{ background: '#1e293b', padding: '10px', borderRadius: '6px', border: '1px solid #334155' }}>
          <label style={{ fontSize: '12px', color: '#38bdf8', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Column Headers</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            {columns.map((col, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', background: '#334155', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', gap: '6px' }}>
                <span>{col}</span>
                {columns.length > 1 && <button type="button" onClick={() => removeColumn(index)} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontWeight: 'bold' }}>×</button>}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input type="text" value={newColText} onChange={e => setNewColText(e.target.value)} placeholder="New column name..." style={{ flex: 1, background: '#0f172a', border: '1px solid #475569', color: 'white', padding: '5px', borderRadius: '4px', fontSize: '11px' }} />
            <button type="button" onClick={addColumn} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Add Column</button>
          </div>
        </div>

        <div style={{ background: '#1e293b', padding: '10px', borderRadius: '6px', border: '1px solid #334155' }}>
          <label style={{ fontSize: '12px', color: '#38bdf8', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Matrix Rows & Correct Answers (Check boxes that are correct)</label>
          
          <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
            <input type="text" value={newRowText} onChange={e => setNewRowText(e.target.value)} placeholder="New row statement / finding..." style={{ flex: 1, background: '#0f172a', border: '1px solid #475569', color: 'white', padding: '5px', borderRadius: '4px', fontSize: '11px' }} />
            <button type="button" onClick={addRow} style={{ background: '#10b981', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Add Row</button>
          </div>

          {rows.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #475569', textAlign: 'left' }}>
                    <th style={{ padding: '6px', color: '#94a3b8' }}>Finding / Statement</th>
                    {columns.map((col, idx) => (
                      <th key={idx} style={{ padding: '6px', color: '#38bdf8', textAlign: 'center' }}>{col}</th>
                    ))}
                    <th style={{ padding: '6px', textAlign: 'center', color: '#94a3b8' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rIdx) => (
                    <tr key={rIdx} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '6px', color: '#f8fafc' }}>{row.text}</td>
                      {columns.map((_, cIdx) => (
                        <td key={cIdx} style={{ padding: '6px', textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={row.selections[cIdx]} 
                            onChange={() => toggleSelection(rIdx, cIdx)} 
                            style={{ cursor: 'pointer', transform: 'scale(1.1)' }} 
                          />
                        </td>
                      ))}
                      <td style={{ padding: '6px', textAlign: 'center' }}>
                        <button type="button" onClick={() => removeRow(rIdx)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}>Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <label style={{ fontSize: '11px', color: '#94a3b8' }}>Overall Rationale</label>
          <textarea value={rationale} onChange={e => setRationale(e.target.value)} rows={2} placeholder="Explain correct answers..." style={{ width: '100%', background: '#1e293b', border: '1px solid #475569', color: 'white', padding: '8px', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }} />
        </div>

        <button type="submit" style={{ background: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', marginTop: '4px' }}>Save Matrix Question to Firestore</button>
      </form>
    </div>
  );
}