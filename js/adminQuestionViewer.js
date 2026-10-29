export function openAdminQuestionViewer(chapName, questions) {
  let currentIndex = 0;

  const modalBackdrop = document.createElement('div');
  modalBackdrop.style.cssText = `
    position: fixed; inset: 0; z-index: 10000; background: rgba(0, 0, 0, 0.75); 
    display: flex; align-items: center; justify-content: center; padding: 20px;
  `;

  const modalBox = document.createElement('div');
  modalBox.style.cssText = `
    background: #0f172a; border: 1px solid #334155; border-radius: 8px; 
    width: 100%; max-width: 650px; max-height: 85vh; display: flex; 
    flex-direction: column; padding: 20px; box-sizing: border-box; color: #f8fafc;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
  `;

  modalBackdrop.appendChild(modalBox);
  document.body.appendChild(modalBackdrop);

  function renderQuestion(index) {
    const q = questions[index];
    const qType = q.type || "MCQ";
    
    let optionsHTML = '';
    const safeOpts = Array.isArray(q.options) ? q.options : Object.values(q.options || {});
    
    if (safeOpts.length > 0) {
      optionsHTML = `<div style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px;">`;
      safeOpts.forEach((opt, idx) => {
        const isCorrect = opt.isCorrect === true || q.correctAnswerIndex === idx;
        const borderStyle = isCorrect ? 'border: 1px solid #10b981; background: rgba(16, 185, 129, 0.1);' : 'border: 1px solid #334155; background: #1e293b;';
        optionsHTML += `
          <div style="padding: 8px 12px; border-radius: 6px; font-size: 13px; ${borderStyle}">
            <strong>${String.fromCharCode(65 + idx)}.</strong> ${opt.text || opt}
            ${isCorrect ? '<span style="float: right; color: #10b981; font-weight: 600; font-size: 11px;">✓ Correct</span>' : ''}
          </div>
        `;
      });
      optionsHTML += `</div>`;
    }

    modalBox.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 12px; margin-bottom: 12px;">
        <div>
          <h3 style="margin: 0; font-size: 15px; color: #38bdf8;">👁️ Admin Question Viewer: ${chapName}</h3>
          <span style="font-size: 11px; color: #94a3b8;">Question ${index + 1} of ${questions.length} (${qType})</span>
        </div>
        <button id="viewer-exit-btn" style="background: #dc2626; color: white; border: none; padding: 4px 10px; border-radius: 4px; font-size: 12px; cursor: pointer; font-weight: bold;">✕ Exit</button>
      </div>

      <div style="overflow-y: auto; flex-grow: 1; padding-right: 4px; margin-bottom: 15px;">
        <p style="font-size: 14px; font-weight: 600; line-height: 1.5; color: #f8fafc; margin-top: 0;">${q.questionText || q.stem || ""}</p>
        ${optionsHTML}
        ${q.rationale ? `<div style="margin-top: 14px; background: rgba(56, 189, 248, 0.1); border-left: 3px solid #38bdf8; padding: 10px; font-size: 12px; color: #cbd5e1; border-radius: 0 4px 4px 0;"><strong>Rationale:</strong> ${q.rationale}</div>` : ''}
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #334155; padding-top: 12px;">
        <button id="viewer-prev-btn" ${index === 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''} style="background: #475569; color: white; border: none; padding: 6px 14px; border-radius: 4px; font-size: 12px; cursor: pointer; font-weight: 600;">← Previous</button>
        <span style="font-size: 12px; color: #94a3b8;">${index + 1} / ${questions.length}</span>
        <button id="viewer-next-btn" ${index === questions.length - 1 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''} style="background: #2563eb; color: white; border: none; padding: 6px 14px; border-radius: 4px; font-size: 12px; cursor: pointer; font-weight: 600;">Next →</button>
      </div>
    `;

    modalBox.querySelector('#viewer-exit-btn').addEventListener('click', () => {
      document.body.removeChild(modalBackdrop);
    });

    modalBox.querySelector('#viewer-prev-btn').addEventListener('click', () => {
      if (currentIndex > 0) {
        currentIndex--;
        renderQuestion(currentIndex);
      }
    });

    modalBox.querySelector('#viewer-next-btn').addEventListener('click', () => {
      if (currentIndex < questions.length - 1) {
        currentIndex++;
        renderQuestion(currentIndex);
      }
    });
  }

  renderQuestion(currentIndex);
}