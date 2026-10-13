// ./js/quizEngine.js

import { setupQuizConfig } from './quizConfig.js';
import { renderQuestion } from './quizQuestion.js';
import { normalizeChapterName, saveQuizResultsToFirestore, evaluateBowTieAnswer } from './quizScoring.js';

export function shuffleArray(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

export { normalizeChapterName };

export function setupQuizSession(allQuestions, fullChapterQuestions, unmasteredChapterQuestions, activeChapterName, onBackToChapters) {
  let modal = document.getElementById('quiz-session-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'quiz-session-modal';
    modal.style.cssText = `
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.9); 
      display: flex; align-items: center; justify-content: center; z-index: 99999; padding: 20px; box-sizing: border-box;
    `;
    document.body.appendChild(modal);
  }

  const normalizedActiveChapter = normalizeChapterName(activeChapterName);

  modal.innerHTML = `
    <div style="background: #1e293b; color: #f8fafc; width: 100%; max-width: 750px; max-height: 90vh; border-radius: 12px; display: flex; flex-direction: column; border: 1px solid #334155; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8); box-sizing: border-box; overflow: hidden;">
      <div style="padding: 16px 20px; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; background: #0f172a;">
        <h3 id="modal-quiz-progress" style="margin: 0; font-size: 16px; color: #f8fafc;">Quiz Session: ${normalizedActiveChapter}</h3>
        <div id="modal-question-meta" style="display: flex; gap: 8px; align-items: center;"></div>
      </div>
      <div style="padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; box-sizing: border-box; flex: 1; background: #0f172a;">
        <p id="modal-question-text" style="font-size: 16px; font-weight: 600; color: #f8fafc; margin-top: 0; line-height: 1.5;"></p>
        <div id="modal-options-container" style="display: flex; flex-direction: column; gap: 12px;"></div>
        <div id="modal-feedback-box" class="hidden" style="padding: 14px; border-radius: 8px; background: #1e293b; border: 1px solid #334155;">
          <p id="modal-feedback-text" style="margin: 0; font-size: 14px; color: #e2e8f0; line-height: 1.4;"></p>
        </div>
      </div>
      <div style="padding: 16px 20px; border-top: 1px solid #334155; display: flex; justify-content: flex-end; gap: 10px; background: #0f172a; flex-shrink: 0;">
        <button id="modal-submit-btn" class="action-btn hidden" style="background-color: #2563eb; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; cursor: pointer;">Submit Answer</button>
        <button id="modal-next-btn" class="action-btn hidden" style="background-color: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; cursor: pointer;">Next Question</button>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');

  let questionsList = [];
  let currentQuestionIndex = 0;
  let selectedOptionIndices = [];
  let score = 0;
  let answeredCount = 0;
  let sessionMissedQuestions = [];
  let sessionChapterQuestions = {};
  let flaggedQuestionIndices = new Set();
  let timerInterval = null;
  let secondsRemaining = 0;

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function startTimer(limit, timerVal) {
    stopTimer();
    secondsRemaining = limit * parseInt(timerVal, 10) * 60;
    timerInterval = setInterval(() => {
      secondsRemaining--;
      const timerDisplay = document.getElementById('quiz-timer-display');
      if (timerDisplay) {
        const mins = Math.floor(secondsRemaining / 60);
        const secs = secondsRemaining % 60;
        timerDisplay.textContent = `⏱ Time Left: ${mins}:${secs < 10 ? '0' : ''}${secs}`;
      }
      if (secondsRemaining <= 0) {
        stopTimer();
        alert("Time is up! Submitting your quiz session.");
        currentQuestionIndex = questionsList.length - 1;
        document.getElementById('modal-next-btn').click();
      }
    }, 1000);
  }

  function loadCurrentQuestion() {
    if (questionsList.length === 0) return;
    const q = questionsList[currentQuestionIndex];
    const isFlagged = flaggedQuestionIndices.has(currentQuestionIndex);

    renderQuestion(
      q,
      currentQuestionIndex,
      questionsList.length,
      score,
      answeredCount,
      isFlagged,
      () => {
        if (flaggedQuestionIndices.has(currentQuestionIndex)) flaggedQuestionIndices.delete(currentQuestionIndex);
        else flaggedQuestionIndices.add(currentQuestionIndex);
        loadCurrentQuestion();
      },
      (selection) => {
        selectedOptionIndices = selection;
      }
    );
  }

  setupQuizConfig(
    activeChapterName,
    fullChapterQuestions,
    unmasteredChapterQuestions,
    (pool, limit, orderVal, timerVal) => {
      let list = [...pool];
      if (orderVal === 'random') list = shuffleArray(list);
      questionsList = list.slice(0, limit);
      
      if (timerVal !== 'none') {
        startTimer(limit, timerVal);
      }

      currentQuestionIndex = 0;
      score = 0;
      answeredCount = 0;
      flaggedQuestionIndices.clear();
      sessionMissedQuestions = [];
      sessionChapterQuestions = {};
      loadCurrentQuestion();
    },
    () => {
      stopTimer();
      modal.remove();
      onBackToChapters();
    }
  );

  const submitAnswerBtn = document.getElementById('modal-submit-btn');
  const nextQuestionBtn = document.getElementById('modal-next-btn');
  const feedbackBox = document.getElementById('modal-feedback-box');
  const feedbackText = document.getElementById('modal-feedback-text');

  submitAnswerBtn?.addEventListener('click', () => {
    const q = questionsList[currentQuestionIndex];
    const rawType = (q.type || "MCQ").toLowerCase().replace(/[\s-_]/g, '');
    const isCompletion = rawType === 'completion';
    const isBowTie = rawType === 'bowtie';

    if (!isCompletion && !isBowTie && selectedOptionIndices.length === 0) return;

    answeredCount++;
    let questionEarnedScore = 0;
    let feedbackStatus = "";
    const specificChap = normalizedActiveChapter;

    if (isCompletion) {
      const inputElem = document.getElementById('completion-input');
      const userTyped = (inputElem ? inputElem.value : "").trim().toLowerCase();
      const correctAns = (q.correctAnswer || "").trim().toLowerCase();

      if (inputElem) inputElem.disabled = true;

      if (userTyped === correctAns) {
        questionEarnedScore = 1;
        feedbackStatus = "correct";
        if (feedbackText) feedbackText.innerHTML = `<strong>Correct! (+1.0 pt)</strong><br>Answer: <em>${q.correctAnswer}</em><br><br>Rationale: ${q.rationale || q.feedback || "Great job!"}`;
      } else {
        feedbackStatus = "incorrect";
        if (feedbackText) feedbackText.innerHTML = `<strong>Incorrect. (0.0 pts)</strong><br>You typed: <em>${inputElem ? inputElem.value : ""}</em><br>Correct Answer: <em>${q.correctAnswer}</em><br><br>Rationale: ${q.rationale || q.feedback || ""}`;
        sessionMissedQuestions.push({
          chapter: specificChap,
          questionText: q.questionText,
          clientNeed: q.clientNeed || "N/A",
          cognitiveLevel: q.cognitiveLevel || "N/A",
          concept: q.concept || "General Nursing Concept",
          rationales: q.rationale || q.feedback || ""
        });
      }
    } else if (isBowTie) {
      // --- BOW TIE EVALUATION & HIGHLIGHTING LOGIC ---
      const evalResult = evaluateBowTieAnswer(q, selectedOptionIndices);
      questionEarnedScore = evalResult.score === 5 ? 1 : 0; 
      feedbackStatus = evalResult.isCorrect ? "correct" : "incorrect";

      const correctActionIndices = (q.actions || []).map((a, idx) => a.isCorrect ? String(idx) : null).filter(val => val !== null);
      const correctConditionIndex = String((q.conditions || []).findIndex(c => c.isCorrect));
      const correctParamIndices = (q.parameters || []).map((p, idx) => p.isCorrect ? String(idx) : null).filter(val => val !== null);

      const a1 = document.getElementById('bt-action-1');
      const a2 = document.getElementById('bt-action-2');
      const cond = document.getElementById('bt-condition');
      const p1 = document.getElementById('bt-param-1');
      const p2 = document.getElementById('bt-param-2');

      const styleSelect = (el, isCorr) => {
        if (!el) return;
        el.disabled = true;
        el.style.borderColor = isCorr ? '#10b981' : '#ef4444';
        el.style.background = isCorr ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
        el.style.color = isCorr ? '#34d399' : '#f87171';
      };

      const evaluatedActions = [];
      [a1, a2].forEach(sel => {
        if (!sel) return;
        const val = sel.value;
        const isCorr = correctActionIndices.includes(val) && !evaluatedActions.includes(val);
        if (isCorr) evaluatedActions.push(val);
        styleSelect(sel, isCorr);
      });

      if (cond) styleSelect(cond, cond.value === correctConditionIndex);

      const evaluatedParams = [];
      [p1, p2].forEach(sel => {
        if (!sel) return;
        const val = sel.value;
        const isCorr = correctParamIndices.includes(val) && !evaluatedParams.includes(val);
        if (isCorr) evaluatedParams.push(val);
        styleSelect(sel, isCorr);
      });

      if (evalResult.isCorrect) {
        if (feedbackText) {
          feedbackText.innerHTML = `<strong>Correct! (+1.0 pt)</strong><br><br><strong>Global Rationale:</strong> ${evalResult.rationale}`;
        }
      } else {
        if (feedbackText) {
          feedbackText.innerHTML = `<strong>Incorrect. (0.0 pts) — Incorrect selections are highlighted in red.</strong><br><br><strong>Global Rationale:</strong> ${evalResult.rationale}`;
        }
        sessionMissedQuestions.push({
          chapter: specificChap,
          questionText: q.questionText,
          clientNeed: q.clientNeed || "N/A",
          cognitiveLevel: q.cognitiveLevel || "N/A",
          concept: q.concept || "Clinical Judgment",
          rationales: evalResult.rationale
        });
      }
    } else {
      const optionsList = q.options || [];
      const correctIndices = [];
      optionsList.forEach((opt, idx) => {
        if (opt.isCorrect === true || (idx + 1) === q.correctAnswerIndex) {
          correctIndices.push(idx);
        }
      });

      const correctOptionsCount = correctIndices.length;
      const isSATA = rawType === 'sata';

      if (!isSATA) {
        const chosenIdx = selectedOptionIndices[0];
        if (correctIndices.includes(chosenIdx)) {
          questionEarnedScore = 1;
          feedbackStatus = "correct";
        } else {
          feedbackStatus = "incorrect";
        }
      } else {
        let correctSelections = 0;
        let incorrectSelections = 0;

        selectedOptionIndices.forEach(idx => {
          if (correctIndices.includes(idx)) correctSelections++;
          else incorrectSelections++;
        });

        const rawScore = (correctSelections - incorrectSelections) / correctOptionsCount;
        questionEarnedScore = Math.max(0, Math.min(1, rawScore));

        if (questionEarnedScore === 1) feedbackStatus = "correct";
        else if (questionEarnedScore > 0) feedbackStatus = "partial";
        else feedbackStatus = "incorrect";
      }

      if (feedbackStatus !== "correct") {
        sessionMissedQuestions.push({
          chapter: specificChap,
          questionText: q.questionText,
          clientNeed: q.clientNeed || "N/A",
          cognitiveLevel: q.cognitiveLevel || "N/A",
          concept: q.concept || q.heading || "General Nursing Concept",
          rationales: optionsList.map(o => o.rationale).filter(Boolean).map(r => `<p style="margin: 6px 0; padding-left: 10px; border-left: 3px solid #334155;">${r}</p>`).join("")
        });
      }

      const labels = document.querySelectorAll('.option-label');
      optionsList.forEach((opt, idx) => {
        const isCorrectOption = correctIndices.includes(idx);
        const wasSelected = selectedOptionIndices.includes(idx);

        if (labels[idx]) {
          if (isCorrectOption && wasSelected) {
            labels[idx].style.borderColor = '#10b981';
            labels[idx].style.background = 'rgba(16, 185, 129, 0.1)';
          } else if (isCorrectOption && !wasSelected) {
            labels[idx].style.borderColor = '#f59e0b';
            labels[idx].style.background = 'rgba(245, 158, 11, 0.1)';
          } else if (!isCorrectOption && wasSelected) {
            labels[idx].style.borderColor = '#ef4444';
            labels[idx].style.background = 'rgba(239, 68, 68, 0.1)';
          }
        }
      });

      optionsList.forEach((opt, idx) => {
        if (opt.rationale && labels[idx]) {
          const textContainer = labels[idx].querySelector('div');
          const existingRationale = textContainer?.querySelector('.rationale-text');
          if (!existingRationale && textContainer) {
            const rationaleSpan = document.createElement('span');
            rationaleSpan.className = 'rationale-text';
            rationaleSpan.style.display = 'block';
            rationaleSpan.style.marginTop = '6px';
            rationaleSpan.style.fontSize = '12px';
            rationaleSpan.style.color = '#cbd5e1';
            rationaleSpan.style.fontStyle = 'italic';
            rationaleSpan.textContent = `Rationale: ${opt.rationale}`;
            textContainer.appendChild(rationaleSpan);
          }
        }
      });

      if (feedbackStatus === "correct") {
        if (feedbackText) feedbackText.innerHTML = `<strong>Correct! (+1.0 pt)</strong> Great job applying nursing concepts.`;
      } else if (feedbackStatus === "partial") {
        if (feedbackText) feedbackText.innerHTML = `<strong>Partially Correct! (+${questionEarnedScore.toFixed(2)} pts)</strong>`;
      } else {
        if (feedbackText) feedbackText.innerHTML = `<strong>Incorrect. (0.0 pts)</strong> Review rationales above.`;
      }
    }

    score += questionEarnedScore;
    if (feedbackBox) feedbackBox.classList.remove('hidden');
    if (submitAnswerBtn) submitAnswerBtn.classList.add('hidden');
    if (nextQuestionBtn) nextQuestionBtn.classList.remove('hidden');

    if (!sessionChapterQuestions[specificChap]) {
      sessionChapterQuestions[specificChap] = {};
    }
    sessionChapterQuestions[specificChap][q.questionText] = {
      correct: questionEarnedScore >= 1,
      score: questionEarnedScore,
      questionText: q.questionText,
      type: q.type || "MCQ",
      options: q.options || [],
      correctAnswerIndex: q.correctAnswerIndex,
      correctAnswer: q.correctAnswer
    };
  });

  nextQuestionBtn?.addEventListener('click', async () => {
    currentQuestionIndex++;
    if (currentQuestionIndex < questionsList.length) {
      loadCurrentQuestion();
    } else {
      stopTimer();
      const finalPercentage = ((score / questionsList.length) * 100).toFixed(1);
      
      await saveQuizResultsToFirestore(normalizedActiveChapter, score, questionsList.length, sessionMissedQuestions, sessionChapterQuestions);

      const questionProgress = document.getElementById('modal-quiz-progress');
      const questionMeta = document.getElementById('modal-question-meta');
      const questionText = document.getElementById('modal-question-text');
      const optionsContainer = document.getElementById('modal-options-container');

      if (questionProgress) questionProgress.textContent = `Quiz Completed`;
      if (questionMeta) questionMeta.innerHTML = `<span style="background: #334155; color: #f8fafc; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Session Review</span>`;
      if (questionText) questionText.textContent = `Quiz Complete! You scored ${score.toFixed(1)} out of ${questionsList.length} (${finalPercentage}%).`;
      if (optionsContainer) {
        optionsContainer.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div style="background: #0f172a; border: 1px solid #334155; color: #f8fafc; padding: 16px; border-radius: 8px;">
              <h3 style="color: #f8fafc; font-size: 16px; margin-top: 0; margin-bottom: 10px;">Performance Summary</h3>
              <p style="color: #cbd5e1; margin: 4px 0; font-size: 14px;">Total Points: ${score.toFixed(1)} / ${questionsList.length}</p>
              <p style="color: #cbd5e1; margin: 4px 0; font-size: 14px;">Accuracy: ${finalPercentage}%</p>
              <p style="color: #cbd5e1; margin: 4px 0; font-size: 14px;">Flagged Questions: ${flaggedQuestionIndices.size}</p>
            </div>
            <div style="display: flex; gap: 10px; flex-direction: column;">
              <button id="restart-quiz-btn" class="action-btn" style="background: #2563eb; color: white; border: none; padding: 12px; border-radius: 6px; font-weight: 600; cursor: pointer;">Configure New Session</button>
              <button id="close-quiz-modal-btn" class="action-btn" style="background-color: #64748b; color: white; border: none; padding: 12px; border-radius: 6px; font-weight: 600; cursor: pointer;">Return to Main Dashboard</button>
            </div>
          </div>
        `;
      }
      if (feedbackBox) feedbackBox.classList.add('hidden');
      if (submitAnswerBtn) submitAnswerBtn.classList.add('hidden');
      if (nextQuestionBtn) nextQuestionBtn.classList.add('hidden');

      document.getElementById('restart-quiz-btn')?.addEventListener('click', () => setupQuizSession(allQuestions, fullChapterQuestions, unmasteredChapterQuestions, activeChapterName, onBackToChapters));
      document.getElementById('close-quiz-modal-btn')?.addEventListener('click', () => {
        modal.remove();
        window.location.reload();
      });
    }
  });
}