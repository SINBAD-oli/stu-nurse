import { normalizeChapterName } from './quizScoring.js';

export function setupQuizConfig(activeChapterName, fullChapterQuestions, unmasteredChapterQuestions, onStartQuiz, onCancel) {
  const normalizedActiveChapter = normalizeChapterName(activeChapterName);
  const unmasteredCount = unmasteredChapterQuestions.length;
  const totalCount = fullChapterQuestions.length;

  const questionProgress = document.getElementById('modal-quiz-progress');
  const questionMeta = document.getElementById('modal-question-meta');
  const questionText = document.getElementById('modal-question-text');
  const optionsContainer = document.getElementById('modal-options-container');
  const feedbackBox = document.getElementById('modal-feedback-box');
  const submitAnswerBtn = document.getElementById('modal-submit-btn');
  const nextQuestionBtn = document.getElementById('modal-next-btn');

  if (questionProgress) questionProgress.textContent = `Configuration: ${normalizedActiveChapter}`;
  if (questionMeta) questionMeta.innerHTML = `<span style="background: #334155; color: #f8fafc; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${totalCount} total available</span>`;
  if (questionText) questionText.textContent = `Configure your session parameters below:`;
  
  if (feedbackBox) feedbackBox.classList.add('hidden');
  if (submitAnswerBtn) submitAnswerBtn.classList.add('hidden');
  if (nextQuestionBtn) nextQuestionBtn.classList.add('hidden');

  if (optionsContainer) {
    optionsContainer.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 14px; width: 100%;">
        <div>
          <label style="font-weight: 600; display: block; margin-bottom: 6px; color: #f8fafc; font-size: 14px;">Question Scope Mode:</label>
          <select id="quiz-scope-select" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: #f8fafc; font-size: 15px; box-sizing: border-box;">
            <option value="unmastered" selected>🎯 Unmastered Questions Only (${unmasteredCount} available)</option>
            <option value="all">📚 Entire Chapter Bank (${totalCount} questions)</option>
          </select>
        </div>
        <div>
          <label style="font-weight: 600; display: block; margin-bottom: 6px; color: #f8fafc; font-size: 14px;">Number of Questions:</label>
          <input type="number" id="quiz-count-input" value="${unmasteredCount > 0 ? unmasteredCount : totalCount}" min="1" max="${totalCount}" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: #f8fafc; font-size: 15px; box-sizing: border-box;">
        </div>
        <div>
          <label style="font-weight: 600; display: block; margin-bottom: 6px; color: #f8fafc; font-size: 14px;">Question Order:</label>
          <select id="quiz-order-select" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: #f8fafc; font-size: 15px; box-sizing: border-box;">
            <option value="random" selected>🔀 Randomize / Shuffle</option>
            <option value="sequential">📋 Sequential Order</option>
          </select>
        </div>
        <div>
          <label style="font-weight: 600; display: block; margin-bottom: 6px; color: #f8fafc; font-size: 14px;">⏱️ Exam Simulation Timer:</label>
          <select id="quiz-timer-select" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: #f8fafc; font-size: 15px; box-sizing: border-box;">
            <option value="none" selected>No Timer (Relaxed Mode)</option>
            <option value="1">1 Minute per Question</option>
            <option value="2">2 Minutes per Question</option>
          </select>
        </div>
        <div style="display: flex; gap: 10px; margin-top: 10px;">
          <button id="start-configured-quiz" class="action-btn" style="flex: 1; background: #2563eb; color: white; border: none; padding: 12px; border-radius: 6px; font-weight: 600; font-size: 15px; cursor: pointer;">Start Quiz Session</button>
          <button id="back-to-chapters" class="action-btn" style="background-color: #64748b; color: white; border: none; padding: 12px 20px; border-radius: 6px; font-weight: 600; font-size: 15px; cursor: pointer;">Cancel</button>
        </div>
      </div>
    `;

    const scopeSelect = document.getElementById('quiz-scope-select');
    const countInput = document.getElementById('quiz-count-input');
    scopeSelect?.addEventListener('change', () => {
      const scope = scopeSelect.value;
      const maxVal = scope === 'all' ? totalCount : (unmasteredCount > 0 ? unmasteredCount : totalCount);
      countInput.max = maxVal;
      countInput.value = maxVal;
    });
  }

  document.getElementById('start-configured-quiz')?.addEventListener('click', () => {
    const scopeVal = document.getElementById('quiz-scope-select')?.value || 'unmastered';
    const pool = scopeVal === 'all' ? fullChapterQuestions : (unmasteredChapterQuestions.length > 0 ? unmasteredChapterQuestions : fullChapterQuestions);
    
    const inputElem = document.getElementById('quiz-count-input');
    const parsedVal = parseInt(inputElem ? inputElem.value : pool.length, 10);
    const limit = isNaN(parsedVal) ? pool.length : Math.max(1, Math.min(parsedVal, pool.length));

    const orderVal = document.getElementById('quiz-order-select')?.value || 'random';
    const timerVal = document.getElementById('quiz-timer-select')?.value || 'none';

    onStartQuiz(pool, limit, orderVal, timerVal);
  });

  document.getElementById('back-to-chapters')?.addEventListener('click', () => {
    onCancel();
  });
}