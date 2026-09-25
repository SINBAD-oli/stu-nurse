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

export function setupQuizSession(allQuestions, selectedChapterQuestions, activeChapterName, onBackToChapters) {
  const questionProgress = document.getElementById('quiz-progress');
  const questionMeta = document.getElementById('question-meta');
  const questionText = document.getElementById('question-text');
  const optionsContainer = document.getElementById('options-container');
  const feedbackBox = document.getElementById('feedback-box');
  const feedbackText = document.getElementById('feedback-text');
  const submitAnswerBtn = document.getElementById('submit-answer-btn');
  const nextQuestionBtn = document.getElementById('next-question-btn');

  let questionsList = [...selectedChapterQuestions];
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
        timerDisplay.textContent = `⏱️ Time Left: ${mins}:${secs < 10 ? '0' : ''}${secs}`;
      }
      if (secondsRemaining <= 0) {
        stopTimer();
        alert("Time is up! Submitting your quiz session.");
        currentQuestionIndex = questionsList.length - 1;
        nextQuestionBtn.click();
      }
    }, 1000);
  }

  // Exportable or internal trigger to start configuration
  return {
    startConfiguredSession(limit, orderVal, timerVal) {
      if (orderVal === 'random') questionsList = shuffleArray(questionsList);
      questionsList = questionsList.slice(0, limit);
      if (timerVal !== 'none') startTimer(limit, timerVal);
      
      currentQuestionIndex = 0;
      score = 0;
      answeredCount = 0;
      flaggedQuestionIndices.clear();
      loadQuestion();
    }
  };

  function loadQuestion() {
    if (questionsList.length === 0) return;
    const q = questionsList[currentQuestionIndex];
    const percentage = answeredCount > 0 ? ((score / answeredCount) * 100).toFixed(1) : '0.0';
    const isFlagged = flaggedQuestionIndices.has(currentQuestionIndex);

    questionProgress.innerHTML = `
      <span>Question ${currentQuestionIndex + 1} of ${questionsList.length} | Score: ${score.toFixed(1)} (${percentage}%)</span>
      <span id="quiz-timer-display" style="margin-left: 15px; font-weight: 700; color: #d97706;"></span>
    `;

    const qType = (q.type || "MCQ").trim();
    const isCompletion = qType.toLowerCase() === 'completion';
    const isSATA = qType.toLowerCase() === 'sata';
    const optionsList = q.options || [];

    let typeBadgeLabel = 'MCQ';
    let typeBadgeColor = '#e0e7ff; color: #3730a3;';
    if (isCompletion) {
      typeBadgeLabel = 'Fill-in-the-Blank';
      typeBadgeColor = '#dcfce7; color: #166534;';
    } else if (isSATA) {
      typeBadgeLabel = 'SATA';
      typeBadgeColor = '#fef3c7; color: #b45309;';
    }

    questionMeta.innerHTML = `
      ${q.normalizedChapter ? `<span class="meta-pill">${q.normalizedChapter}</span>` : ''}
      <span class="meta-pill" style="background-color: ${typeBadgeColor}">${typeBadgeLabel}</span>
      ${q.clientNeed ? `<span class="meta-pill">Client Need: ${q.clientNeed}</span>` : ''}
      ${q.cognitiveLevel ? `<span class="meta-pill">Cognitive: ${q.cognitiveLevel}</span>` : ''}
      <button id="flag-question-btn" class="action-btn" style="background-color: ${isFlagged ? '#f59e0b' : '#64748b'}; padding: 4px 10px; font-size: 11px; margin-left: auto;">
        ${isFlagged ? '🚩 Flagged' : '🏳️ Flag Question'}
      </button>
    `;

    document.getElementById('flag-question-btn').addEventListener('click', () => {
      if (flaggedQuestionIndices.has(currentQuestionIndex)) {
        flaggedQuestionIndices.delete(currentQuestionIndex);
      } else {
        flaggedQuestionIndices.add(currentQuestionIndex);
      }
      loadQuestion();
    });

    questionText.textContent = q.questionText;
    optionsContainer.innerHTML = '';
    feedbackBox.classList.add('hidden');
    submitAnswerBtn.classList.remove('hidden');
    submitAnswerBtn.disabled = !isCompletion;
    nextQuestionBtn.classList.add('hidden');
    selectedOptionIndices = [];

    if (isCompletion) {
      optionsContainer.innerHTML = `
        <div style="margin-top: 15px; display: flex; flex-direction: column; gap: 10px;">
          <label style="font-weight: 600; color: #334155;">Type your answer below (case-insensitive):</label>
          <input type="text" id="completion-input" placeholder="Enter missing word/phrase..." style="width: 100%; padding: 14px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 16px; box-sizing: border-box; background: white;">
        </div>
      `;
      const inputElem = document.getElementById('completion-input');
      inputElem.focus();
      inputElem.addEventListener('input', () => {
        submitAnswerBtn.disabled = inputElem.value.trim().length === 0;
      });
    } else {
      optionsList.forEach((opt, index) => {
        const label = document.createElement('label');
        label.className = 'option-label';
        const inputType = isSATA ? 'checkbox' : 'radio';
        
        label.innerHTML = `
          <input type="${inputType}" name="quiz-option" value="${index}" style="margin-top: 3px; pointer-events: none;">
          <span>${opt.text}</span>
        `;

        const inputElem = label.querySelector('input');
        label.addEventListener('click', (e) => {
          e.preventDefault();
          if (isSATA) {
            inputElem.checked = !inputElem.checked;
            if (inputElem.checked) {
              label.classList.add('selected');
              if (!selectedOptionIndices.includes(index)) selectedOptionIndices.push(index);
            } else {
              label.classList.remove('selected');
              selectedOptionIndices = selectedOptionIndices.filter(i => i !== index);
            }
            submitAnswerBtn.disabled = selectedOptionIndices.length === 0;
          } else {
            document.querySelectorAll('.option-label').forEach(l => {
              l.classList.remove('selected');
              l.querySelector('input').checked = false;
            });
            inputElem.checked = true;
            label.classList.add('selected');
            selectedOptionIndices = [index];
            submitAnswerBtn.disabled = false;
          }
        });
        optionsContainer.appendChild(label);
      });
    }
  }
}