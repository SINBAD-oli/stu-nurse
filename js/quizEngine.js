import { db, auth } from './firebase-config.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export function shuffleArray(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

export function normalizeChapterName(name) {
  if (!name) return "General Practice";
  return name
    .replace(/[:\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/(^\w|\s\w)/g, m => m.toUpperCase());
}

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

  modal.innerHTML = `
    <div style="background: #1e293b; color: #f8fafc; width: 100%; max-width: 750px; max-height: 90vh; border-radius: 12px; display: flex; flex-direction: column; border: 1px solid #334155; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8); box-sizing: border-box; overflow: hidden;">
      <div style="padding: 16px 20px; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; background: #0f172a;">
        <h3 id="modal-quiz-progress" style="margin: 0; font-size: 16px; color: #f8fafc;">Quiz Session: ${activeChapterName}</h3>
        <div id="modal-question-meta" style="display: flex; gap: 8px; align-items: center;"></div>
      </div>
      <div style="padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; box-sizing: border-box; flex: 1; background: #0f172a;">
        <p id="modal-question-text" style="font-size: 16px; font-weight: 600; color: #f8fafc; margin-top: 0; line-height: 1.5;"></p>
        <div id="modal-options-container" style="display: flex; flex-direction: column; gap: 10px;"></div>
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

  const questionProgress = document.getElementById('modal-quiz-progress');
  const questionMeta = document.getElementById('modal-question-meta');
  const questionText = document.getElementById('modal-question-text');
  const optionsContainer = document.getElementById('modal-options-container');
  const feedbackBox = document.getElementById('modal-feedback-box');
  const feedbackText = document.getElementById('modal-feedback-text');
  const submitAnswerBtn = document.getElementById('modal-submit-btn');
  const nextQuestionBtn = document.getElementById('modal-next-btn');

  let questionsList = [];
  let currentQuestionIndex = 0;
  let selectedOptionIndices = [];
  let score = 0;
  let answeredCount = 0;
  let sessionMissedQuestions = [];
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
        nextQuestionBtn.click();
      }
    }, 1000);
  }

  function showQuizConfig() {
    stopTimer();
    const unmasteredCount = unmasteredChapterQuestions.length;
    const totalCount = fullChapterQuestions.length;

    if (questionProgress) questionProgress.textContent = `Configuration: ${activeChapterName}`;
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
      loadQuestion();
    });

    document.getElementById('back-to-chapters')?.addEventListener('click', () => {
      modal.remove();
      onBackToChapters();
    });
  }

  function loadQuestion() {
    if (questionsList.length === 0) return;
    const q = questionsList[currentQuestionIndex];
    const percentage = answeredCount > 0 ? ((score / answeredCount) * 100).toFixed(1) : '0.0';
    const isFlagged = flaggedQuestionIndices.has(currentQuestionIndex);

    if (questionProgress) {
      questionProgress.innerHTML = `Question ${currentQuestionIndex + 1} of ${questionsList.length} | Score: ${score.toFixed(1)} (${percentage}%)`;
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
      if (flaggedQuestionIndices.has(currentQuestionIndex)) {
        flaggedQuestionIndices.delete(currentQuestionIndex);
      } else {
        flaggedQuestionIndices.add(currentQuestionIndex);
      }
      loadQuestion();
    });

    if (questionText) questionText.textContent = q.questionText;
    if (optionsContainer) optionsContainer.innerHTML = '';
    if (feedbackBox) feedbackBox.classList.add('hidden');
    if (submitAnswerBtn) submitAnswerBtn.classList.remove('hidden');
    if (submitAnswerBtn) submitAnswerBtn.disabled = !isCompletion;
    if (nextQuestionBtn) nextQuestionBtn.classList.add('hidden');
    selectedOptionIndices = [];

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
          if (submitAnswerBtn) submitAnswerBtn.disabled = inputElem.value.trim().length === 0;
        });
      }
    } else {
      optionsList.forEach((opt, index) => {
        const label = document.createElement('label');
        label.className = 'option-label';
        label.style.cssText = `display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border-radius: 8px; border: 1px solid #334155; background: #0f172a; cursor: pointer; color: #f8fafc; font-size: 14px; box-sizing: border-box;`;
        
        const inputType = isSATA ? 'checkbox' : 'radio';
        
        label.innerHTML = `
          <input type="${inputType}" name="quiz-option" value="${index}" style="margin-top: 3px; pointer-events: none;">
          <span style="flex: 1; line-height: 1.4;">${opt.text}</span>
        `;

        const inputElem = label.querySelector('input');
        label.addEventListener('click', (e) => {
          e.preventDefault();
          if (isSATA) {
            inputElem.checked = !inputElem.checked;
            if (inputElem.checked) {
              label.style.borderColor = '#3b82f6';
              if (!selectedOptionIndices.includes(index)) selectedOptionIndices.push(index);
            } else {
              label.style.borderColor = '#334155';
              selectedOptionIndices = selectedOptionIndices.filter(i => i !== index);
            }
            if (submitAnswerBtn) submitAnswerBtn.disabled = selectedOptionIndices.length === 0;
          } else {
            document.querySelectorAll('.option-label').forEach(l => {
              l.style.borderColor = '#334155';
              const inp = l.querySelector('input');
              if (inp) inp.checked = false;
            });
            inputElem.checked = true;
            label.style.borderColor = '#3b82f6';
            selectedOptionIndices = [index];
            if (submitAnswerBtn) submitAnswerBtn.disabled = false;
          }
        });
        if (optionsContainer) optionsContainer.appendChild(label);
      });
    }
  }

  if (submitAnswerBtn) {
    submitAnswerBtn.addEventListener('click', () => {
      const q = questionsList[currentQuestionIndex];
      const qType = (q.type || "MCQ").trim();
      const isCompletion = qType.toLowerCase() === 'completion';

      if (!isCompletion && selectedOptionIndices.length === 0) return;

      answeredCount++;
      let questionEarnedScore = 0;
      let feedbackStatus = "";
      const specificChap = q.normalizedChapter || "General Practice";

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
      } else {
        const optionsList = q.options || [];
        const correctIndices = [];
        optionsList.forEach((opt, idx) => {
          if (opt.isCorrect === true || (idx + 1) === q.correctAnswerIndex) {
            correctIndices.push(idx);
          }
        });

        const correctOptionsCount = correctIndices.length;
        const isSATA = qType.toLowerCase() === 'sata';

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
            const existingRationale = labels[idx].querySelector('.rationale-text');
            if (!existingRationale) {
              const rationaleSpan = document.createElement('span');
              rationaleSpan.className = 'rationale-text';
              rationaleSpan.style.display = 'block';
              rationaleSpan.style.marginTop = '6px';
              rationaleSpan.style.fontSize = '12px';
              rationaleSpan.style.color = '#cbd5e1';
              rationaleSpan.style.fontStyle = 'italic';
              rationaleSpan.textContent = `Rationale: ${opt.rationale}`;
              labels[idx].appendChild(rationaleSpan);
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

      if (!window.currentSessionChapterQuestions) window.currentSessionChapterQuestions = {};
      if (!window.currentSessionChapterQuestions[specificChap]) {
        window.currentSessionChapterQuestions[specificChap] = {};
      }
      window.currentSessionChapterQuestions[specificChap][q.questionText] = {
        correct: questionEarnedScore >= 1,
        score: questionEarnedScore
      };
    });
  }

  if (nextQuestionBtn) {
    nextQuestionBtn.addEventListener('click', async () => {
      currentQuestionIndex++;
      if (currentQuestionIndex < questionsList.length) {
        loadQuestion();
      } else {
        stopTimer();
        const finalPercentage = ((score / questionsList.length) * 100).toFixed(1);
        
        const currentUser = auth.currentUser;
        if (currentUser) {
          try {
            const userRef = doc(db, "users", currentUser.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const uData = userSnap.data();
              const prevQuizzes = uData.totalQuizzesTaken || 0;
              const prevAvg = uData.averageAccuracy || 0;
              let chapterProgressMap = uData.chapterProgressMap || {};
              let chapterStats = uData.chapterStats || {};
              let existingMissed = uData.missedQuestions || {};

              const newTotalQuizzes = prevQuizzes + 1;
              const newAvgAccuracy = Number(((prevAvg * prevQuizzes + parseFloat(finalPercentage)) / newTotalQuizzes).toFixed(1));

              if (window.currentSessionChapterQuestions) {
                for (const [chap, qMap] of Object.entries(window.currentSessionChapterQuestions)) {
                  if (!chapterProgressMap[chap]) chapterProgressMap[chap] = {};
                  for (const [qText, qDetails] of Object.entries(qMap)) {
                    chapterProgressMap[chap][qText] = qDetails;
                  }
                  
                  let correctCount = 0;
                  const questionEntries = Object.values(chapterProgressMap[chap]);
                  questionEntries.forEach(item => {
                    if (item.correct) correctCount += 1;
                  });
                  chapterStats[chap] = {
                    correct: correctCount,
                    total: questionEntries.length
                  };
                }
              }
              window.currentSessionChapterQuestions = {};

              sessionMissedQuestions.forEach(m => {
                if (!existingMissed.some(ex => ex.questionText === m.questionText)) {
                  existingMissed.push(m);
                }
              });

              await updateDoc(userRef, {
                totalQuizzesTaken: newTotalQuizzes,
                averageAccuracy: newAvgAccuracy,
                chapterProgressMap: chapterProgressMap,
                chapterStats: chapterStats,
                missedQuestions: existingMissed
              });
            }
          } catch (err) {
            console.error("Error updating scores:", err);
          }
        }

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

        document.getElementById('restart-quiz-btn')?.addEventListener('click', () => showQuizConfig());
        document.getElementById('close-quiz-modal-btn')?.addEventListener('click', () => {
          modal.remove();
          window.location.reload();
        });
      }
    });
  }

  showQuizConfig();
}