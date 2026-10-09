export function renderQuestion(q, currentQuestionIndex, totalQuestions, score, answeredCount, isFlagged, onToggleFlag, onSelectionChange) {
  const questionProgress = document.getElementById('modal-quiz-progress');
  const questionMeta = document.getElementById('modal-question-meta');
  const questionText = document.getElementById('modal-question-text');
  const optionsContainer = document.getElementById('modal-options-container');
  const feedbackBox = document.getElementById('modal-feedback-box');
  const submitAnswerBtn = document.getElementById('modal-submit-btn');
  const nextQuestionBtn = document.getElementById('modal-next-btn');

  const percentage = answeredCount > 0 ? ((score / answeredCount) * 100).toFixed(1) : '0.0';
  if (questionProgress) {
    questionProgress.innerHTML = `Question ${currentQuestionIndex + 1} of ${totalQuestions} | Score: ${score.toFixed(1)} (${percentage}%)`;
  }

  const qType = (q.type || "MCQ").trim();
  const isCompletion = qType.toLowerCase() === 'completion';
  const isSATA = qType.toLowerCase() === 'sata';
  const optionsList = q.options || [];

  let typeBadgeLabel = 'MCQ';
  let typeBadgeColor = 'background: #312e81; color: #c7d2fe;';
  if (isCompletion) {
    typeBadgeLabel = 'Fill-in-the-Blank';
    typeBadgeColor = 'background: #064e3b; color: #a7f3d0;';
  } else if (isSATA) {
    typeBadgeLabel = 'SATA';
    typeBadgeColor = 'background: #78350f; color: #fde68a;';
  }

  if (questionMeta) {
    questionMeta.innerHTML = `
      <span style="${typeBadgeColor} padding: 3px 8px; border-radius: 4px; font-size: 11px;">${typeBadgeLabel}</span>
      <span id="quiz-timer-display" style="font-weight: 700; color: #fbbf24; font-size: 12px; margin-left: 8px;"></span>
      <button id="flag-question-btn" class="action-btn" style="background-color: ${isFlagged ? '#f59e0b' : '#475569'}; color: white; border: none; padding: 4px 10px; font-size: 11px; border-radius: 4px; cursor: pointer; margin-left: 8px;">
        ${isFlagged ? '🚩 Flagged' : '🏳️ Flag'}
      </button>
    `;
  }

  document.getElementById('flag-question-btn')?.addEventListener('click', () => {
    onToggleFlag();
  });

  if (questionText) questionText.textContent = q.questionText;
  if (optionsContainer) optionsContainer.innerHTML = '';
  if (feedbackBox) feedbackBox.classList.add('hidden');
  if (submitAnswerBtn) submitAnswerBtn.classList.remove('hidden');
  if (submitAnswerBtn) submitAnswerBtn.disabled = !isCompletion;
  if (nextQuestionBtn) nextQuestionBtn.classList.add('hidden');

  let selectedIndices = [];

  if (isCompletion) {
    if (optionsContainer) {
      optionsContainer.innerHTML = `
        <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 10px;">
          <label style="font-weight: 600; color: #e2e8f0; font-size: 14px;">Type your answer below (case-insensitive):</label>
          <input type="text" id="completion-input" placeholder="Enter missing word/phrase..." style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #334155; font-size: 15px; box-sizing: border-box; background: #0f172a; color: #f8fafc;">
        </div>
      `;
    }
    const inputElem = document.getElementById('completion-input');
    if (inputElem) {
      inputElem.focus();
      inputElem.addEventListener('input', () => {
        const isValid = inputElem.value.trim().length > 0;
        if (submitAnswerBtn) submitAnswerBtn.disabled = !isValid;
        onSelectionChange([inputElem.value.trim()]);
      });
    }
  } else {
    optionsList.forEach((opt, index) => {
      const label = document.createElement('label');
      label.className = 'option-label';
      label.style.cssText = `
        display: grid; grid-template-columns: 24px 1fr; align-items: start; gap: 12px; 
        padding: 14px; border-radius: 8px; border: 1px solid #334155; background: #0f172a; 
        cursor: pointer; color: #f8fafc; font-size: 14px; box-sizing: border-box;
      `;
      
      const inputType = isSATA ? 'checkbox' : 'radio';
      
      label.innerHTML = `
        <input type="${inputType}" name="quiz-option" value="${index}" style="margin-top: 2px; pointer-events: none; justify-self: center;">
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <span style="line-height: 1.4;">${opt.text}</span>
        </div>
      `;

      const inputElem = label.querySelector('input');
      label.addEventListener('click', (e) => {
        e.preventDefault();
        if (isSATA) {
          inputElem.checked = !inputElem.checked;
          if (inputElem.checked) {
            label.style.borderColor = '#3b82f6';
            if (!selectedIndices.includes(index)) selectedIndices.push(index);
          } else {
            label.style.borderColor = '#334155';
            selectedIndices = selectedIndices.filter(i => i !== index);
          }
          if (submitAnswerBtn) submitAnswerBtn.disabled = selectedIndices.length === 0;
        } else {
          document.querySelectorAll('.option-label').forEach(l => {
            l.style.borderColor = '#334155';
            const inp = l.querySelector('input');
            if (inp) inp.checked = false;
          });
          inputElem.checked = true;
          label.style.borderColor = '#3b82f6';
          selectedIndices = [index];
          if (submitAnswerBtn) submitAnswerBtn.disabled = false;
        }
        onSelectionChange(selectedIndices);
      });
      if (optionsContainer) optionsContainer.appendChild(label);
    });
  }
}