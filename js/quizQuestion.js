// ./js/quizQuestion.js

// Bulletproof helper to safely convert Firestore arrays, maps, or undefined into arrays
function safeArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object') return Object.values(data);
  return [];
}

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

  // Bulletproof type normalization
  const rawType = (q.type || "MCQ").toLowerCase().replace(/[\s-_]/g, '');
  const isCompletion = rawType === 'completion';
  const isSATA = rawType === 'sata';
  const isBowTie = rawType === 'bowtie';
  const optionsList = safeArray(q.options);

  let typeBadgeLabel = 'MCQ';
  let typeBadgeColor = 'background: #312e81; color: #c7d2fe;';
  if (isCompletion) {
    typeBadgeLabel = 'Fill-in-the-Blank';
    typeBadgeColor = 'background: #064e3b; color: #a7f3d0;';
  } else if (isSATA) {
    typeBadgeLabel = 'SATA';
    typeBadgeColor = 'background: #78350f; color: #fde68a;';
  } else if (isBowTie) {
    typeBadgeLabel = 'Bow Tie';
    typeBadgeColor = 'background: #7c2d12; color: #ffedd5;';
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

  let selectedIndices = isBowTie ? { action1: '', action2: '', condition: '', param1: '', param2: '' } : [];

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
  } else if (isBowTie) {
    const rawExhibits = safeArray(q.exhibits);
    const exhibits = rawExhibits.length > 0 ? rawExhibits : [{ title: "Nurses' Notes", content: q.questionText }];
    const actions = safeArray(q.actions);
    const conditions = safeArray(q.conditions);
    const parameters = safeArray(q.parameters);

    const updateBowTieState = () => {
      const { action1, action2, condition, param1, param2 } = selectedIndices;
      const allSelected = action1 !== '' && action2 !== '' && condition !== '' && param1 !== '' && param2 !== '';
      const distinctActions = action1 !== action2;
      const distinctParams = param1 !== param2;

      if (submitAnswerBtn) {
        submitAnswerBtn.disabled = !(allSelected && distinctActions && distinctParams);
      }
      onSelectionChange(selectedIndices);
    };

    if (optionsContainer) {
      optionsContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 16px; margin-top: 10px;">
          <!-- Exhibit Tabs Container (Scrollable up to 260px) -->
          <div style="background: #0f172a; border: 1px solid #334155; border-radius: 8px; overflow: hidden;">
            <div id="bowtie-tabs-header" style="display: flex; background: #1e293b; border-bottom: 1px solid #334155; overflow-x: auto;">
              ${exhibits.map((ex, idx) => `
                <button type="button" data-ex-id="${ex.id !== undefined ? ex.id : idx}" class="bowtie-tab-btn" style="padding: 10px 16px; font-size: 13px; font-weight: 600; background: ${idx === 0 ? '#0f172a' : 'transparent'}; color: ${idx === 0 ? '#38bdf8' : '#94a3b8'}; border: none; border-bottom: 2px solid ${idx === 0 ? '#38bdf8' : 'transparent'}; cursor: pointer; white-space: nowrap;">
                  ${ex.title}
                </button>
              `).join('')}
            </div>
            <div id="bowtie-tab-content" style="padding: 16px; font-size: 14px; color: #f8fafc; line-height: 1.5; min-height: 140px; max-height: 260px; overflow-y: auto; white-space: pre-wrap;">
              ${exhibits[0].content}
            </div>
          </div>

          <!-- Bow Tie Dropdowns Grid -->
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; background: #0f172a; padding: 16px; border-radius: 8px; border: 1px solid #334155;">
            
            <!-- Actions (Pick 2) -->
            <div style="display: flex; flex-direction: column; gap: 10px; background: rgba(59, 130, 246, 0.05); padding: 12px; border-radius: 6px; border: 1px solid rgba(59, 130, 246, 0.2);">
              <span style="font-size: 12px; font-weight: 700; color: #60a5fa; text-align: center; text-transform: uppercase;">Actions to Take (Pick 2)</span>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                <label style="font-size: 11px; color: #94a3b8;">Action 1:</label>
                <select id="bt-action-1" style="width: 100%; padding: 8px; background: #1e293b; color: #f8fafc; border: 1px solid #334155; border-radius: 4px; font-size: 12px;">
                  <option value="">-- Select Action --</option>
                  ${actions.map((act, i) => `<option value="${i}">${act.text}</option>`).join('')}
                </select>
              </div>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                <label style="font-size: 11px; color: #94a3b8;">Action 2:</label>
                <select id="bt-action-2" style="width: 100%; padding: 8px; background: #1e293b; color: #f8fafc; border: 1px solid #334155; border-radius: 4px; font-size: 12px;">
                  <option value="">-- Select Action --</option>
                  ${actions.map((act, i) => `<option value="${i}">${act.text}</option>`).join('')}
                </select>
              </div>
            </div>

            <!-- Condition (Pick 1) -->
            <div style="display: flex; flex-direction: column; gap: 10px; background: rgba(34, 197, 94, 0.05); padding: 12px; border-radius: 6px; border: 1px solid rgba(34, 197, 94, 0.2); justify-content: center;">
              <span style="font-size: 12px; font-weight: 700; color: #4ade80; text-align: center; text-transform: uppercase;">Potential Condition (Pick 1)</span>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                <label style="font-size: 11px; color: #94a3b8;">Condition:</label>
                <select id="bt-condition" style="width: 100%; padding: 8px; background: #1e293b; color: #f8fafc; border: 1px solid #334155; border-radius: 4px; font-size: 12px;">
                  <option value="">-- Select Condition --</option>
                  ${conditions.map((cond, i) => `<option value="${i}">${cond.text}</option>`).join('')}
                </select>
              </div>
            </div>

            <!-- Parameters (Pick 2) -->
            <div style="display: flex; flex-direction: column; gap: 10px; background: rgba(249, 115, 22, 0.05); padding: 12px; border-radius: 6px; border: 1px solid rgba(249, 115, 22, 0.2);">
              <span style="font-size: 12px; font-weight: 700; color: #fb923c; text-align: center; text-transform: uppercase;">Parameters (Pick 2)</span>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                <label style="font-size: 11px; color: #94a3b8;">Parameter 1:</label>
                <select id="bt-param-1" style="width: 100%; padding: 8px; background: #1e293b; color: #f8fafc; border: 1px solid #334155; border-radius: 4px; font-size: 12px;">
                  <option value="">-- Select Parameter --</option>
                  ${parameters.map((param, i) => `<option value="${i}">${param.text}</option>`).join('')}
                </select>
              </div>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                <label style="font-size: 11px; color: #94a3b8;">Parameter 2:</label>
                <select id="bt-param-2" style="width: 100%; padding: 8px; background: #1e293b; color: #f8fafc; border: 1px solid #334155; border-radius: 4px; font-size: 12px;">
                  <option value="">-- Select Parameter --</option>
                  ${parameters.map((param, i) => `<option value="${i}">${param.text}</option>`).join('')}
                </select>
              </div>
            </div>

          </div>
        </div>
      `;

      // Event Listeners for Exhibit Tabs
      const tabButtons = optionsContainer.querySelectorAll('.bowtie-tab-btn');
      const tabContentBox = document.getElementById('bowtie-tab-content');
      tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          tabButtons.forEach(b => {
            b.style.background = 'transparent';
            b.style.color = '#94a3b8';
            b.style.borderBottomColor = 'transparent';
          });
          btn.style.background = '#0f172a';
          btn.style.color = '#38bdf8';
          btn.style.borderBottomColor = '#38bdf8';

          const targetId = btn.getAttribute('data-ex-id');
          const found = exhibits.find((ex, idx) => (ex.id !== undefined ? String(ex.id) : String(idx)) === String(targetId));
          if (found && tabContentBox) {
            tabContentBox.textContent = found.content;
          }
        });
      });

      // Event Listeners for Dropdowns
      document.getElementById('bt-action-1')?.addEventListener('change', (e) => {
        selectedIndices.action1 = e.target.value;
        updateBowTieState();
      });
      document.getElementById('bt-action-2')?.addEventListener('change', (e) => {
        selectedIndices.action2 = e.target.value;
        updateBowTieState();
      });
      document.getElementById('bt-condition')?.addEventListener('change', (e) => {
        selectedIndices.condition = e.target.value;
        updateBowTieState();
      });
      document.getElementById('bt-param-1')?.addEventListener('change', (e) => {
        selectedIndices.param1 = e.target.value;
        updateBowTieState();
      });
      document.getElementById('bt-param-2')?.addEventListener('change', (e) => {
        selectedIndices.param2 = e.target.value;
        updateBowTieState();
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