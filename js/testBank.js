import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export function initTestBank() {
  let attempts = 0;
  const waitForElements = setInterval(() => {
    const launchQuizBtn = document.getElementById('launch-quiz-btn');
    const quizModal = document.getElementById('quiz-modal');
    attempts++;

    if (launchQuizBtn && quizModal) {
      clearInterval(waitForElements);
      setupQuiz(launchQuizBtn, quizModal);
    } else if (attempts > 40) {
      clearInterval(waitForElements);
    }
  }, 50);
}

// True Fisher-Yates Shuffle Algorithm
function shuffleArray(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

function setupQuiz(launchQuizBtn, quizModal) {
  const closeQuizBtn = document.getElementById('close-quiz-btn');
  const questionProgress = document.getElementById('quiz-progress');
  const questionMeta = document.getElementById('question-meta');
  const questionText = document.getElementById('question-text');
  const optionsContainer = document.getElementById('options-container');
  const feedbackBox = document.getElementById('feedback-box');
  const feedbackText = document.getElementById('feedback-text');
  const submitAnswerBtn = document.getElementById('submit-answer-btn');
  const nextQuestionBtn = document.getElementById('next-question-btn');

  let allQuestions = [];
  let selectedChapterQuestions = [];
  let questionsList = [];
  let currentQuestionIndex = 0;
  let selectedOptionIndex = null;
  let score = 0;
  let answeredCount = 0;

  launchQuizBtn.addEventListener('click', async () => {
    quizModal.classList.remove('hidden');
    
    try {
      const querySnapshot = await getDocs(collection(db, "questions"));
      allQuestions = [];
      querySnapshot.forEach((docSnap) => {
        allQuestions.push(docSnap.data());
      });

      if (allQuestions.length === 0) {
        questionProgress.textContent = "Test Bank";
        questionMeta.innerHTML = "";
        questionText.textContent = "No questions found in Firestore database. Please run your upload script.";
        optionsContainer.innerHTML = '';
        return;
      }

      showChapterSelection();
    } catch (error) {
      console.error("Error loading questions from Firestore:", error);
      questionText.textContent = "Error loading questions from database.";
    }
  });

  if (closeQuizBtn) {
    closeQuizBtn.addEventListener('click', () => {
      quizModal.classList.add('hidden');
    });
  }

  function showChapterSelection() {
    questionProgress.textContent = "Select Quiz Category";
    questionMeta.innerHTML = `<span class="meta-pill">Chapter Selection</span>`;
    questionText.textContent = "Choose a chapter or test category to begin your review session:";
    
    feedbackBox.classList.add('hidden');
    submitAnswerBtn.classList.add('hidden');
    nextQuestionBtn.classList.add('hidden');

    const chapters = [...new Set(allQuestions.map(q => q.chapter || "General Practice"))];
    optionsContainer.innerHTML = '';
    
    const allBtn = document.createElement('div');
    allBtn.className = 'option-label selected-chapter-card';
    allBtn.style.textAlign = 'center';
    allBtn.style.fontWeight = '600';
    allBtn.style.justifyContent = 'center';
    allBtn.innerHTML = `<span>📚 All Chapters Combined (${allQuestions.length} Questions)</span>`;
    allBtn.addEventListener('click', () => {
      selectedChapterQuestions = [...allQuestions];
      showQuizConfig();
    });
    optionsContainer.appendChild(allBtn);

    chapters.forEach(chap => {
      const chapQuestions = allQuestions.filter(q => (q.chapter || "General Practice") === chap);
      const chapBtn = document.createElement('div');
      chapBtn.className = 'option-label selected-chapter-card';
      chapBtn.style.textAlign = 'center';
      chapBtn.style.justifyContent = 'center';
      chapBtn.innerHTML = `<span>📖 ${chap} (${chapQuestions.length} Questions)</span>`;
      chapBtn.addEventListener('click', () => {
        selectedChapterQuestions = [...chapQuestions];
        showQuizConfig();
      });
      optionsContainer.appendChild(chapBtn);
    });
  }

  function showQuizConfig() {
    questionProgress.textContent = "Quiz Configuration";
    questionMeta.innerHTML = `<span class="meta-pill">Session Settings</span>`;
    questionText.textContent = `Configure your session (${selectedChapterQuestions.length} questions available):`;
    
    optionsContainer.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div>
          <label style="font-weight: 600; display: block; margin-bottom: 8px; color: #334155;">Number of Questions (Max ${selectedChapterQuestions.length}):</label>
          <input type="number" id="question-count-input" value="${selectedChapterQuestions.length}" min="1" max="${selectedChapterQuestions.length}" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1; background: white; font-size: 14px; box-sizing: border-box;">
        </div>
        <div>
          <label style="font-weight: 600; display: block; margin-bottom: 8px; color: #334155;">Question Order:</label>
          <select id="question-order-select" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1; background: white; font-size: 14px; box-sizing: border-box;">
            <option value="random" selected>🔀 Randomize / Shuffle</option>
            <option value="sequential">📋 Sequential Order</option>
          </select>
        </div>
        <button id="start-configured-quiz" class="action-btn" style="margin-top: 10px;">Start Quiz Session</button>
        <button id="back-to-chapters" class="action-btn" style="background-color: #64748b;">Back to Chapters</button>
      </div>
    `;

    document.getElementById('start-configured-quiz').addEventListener('click', () => {
      const inputVal = parseInt(document.getElementById('question-count-input').value, 10);
      const orderVal = document.getElementById('question-order-select').value;

      let list = [...selectedChapterQuestions];

      if (orderVal === 'random') {
        list = shuffleArray(list);
      }

      const limit = isNaN(inputVal) ? list.length : Math.max(1, Math.min(inputVal, list.length));
      questionsList = list.slice(0, limit);
      
      startQuizSession();
    });

    document.getElementById('back-to-chapters').addEventListener('click', () => {
      showChapterSelection();
    });
  }

  function startQuizSession() {
    currentQuestionIndex = 0;
    score = 0;
    answeredCount = 0;
    loadQuestion();
  }

  function loadQuestion() {
    if (questionsList.length === 0) return;
    const q = questionsList[currentQuestionIndex];

    const percentage = answeredCount > 0 ? ((score / answeredCount) * 100).toFixed(1) : '0.0';
    questionProgress.textContent = `Question ${currentQuestionIndex + 1} of ${questionsList.length} | Score: ${score.toFixed(1)} (${percentage}%)`;
    
    questionMeta.innerHTML = `
      ${q.chapter ? `<span class="meta-pill">${q.chapter}</span>` : ''}
      ${q.clientNeed ? `<span class="meta-pill">Client Need: ${q.clientNeed}</span>` : ''}
      ${q.cognitiveLevel ? `<span class="meta-pill">Cognitive: ${q.cognitiveLevel}</span>` : ''}
      ${q.difficulty ? `<span class="meta-pill">Difficulty: ${q.difficulty}</span>` : ''}
    `;

    questionText.textContent = q.questionText;
    optionsContainer.innerHTML = '';
    feedbackBox.classList.add('hidden');
    submitAnswerBtn.classList.remove('hidden');
    submitAnswerBtn.disabled = true;
    nextQuestionBtn.classList.add('hidden');
    selectedOptionIndex = null;

    const optionsList = q.options || q.answerOptions || [];
    
    optionsList.forEach((opt, index) => {
      const label = document.createElement('label');
      label.className = 'option-label';
      label.innerHTML = `
        <input type="radio" name="quiz-option" value="${index}">
        <span>${opt.text}</span>
      `;
      label.addEventListener('click', () => {
        document.querySelectorAll('.option-label').forEach(l => l.classList.remove('selected'));
        label.classList.add('selected');
        selectedOptionIndex = index;
        submitAnswerBtn.disabled = false;
      });
      optionsContainer.appendChild(label);
    });
  }

  if (submitAnswerBtn) {
    submitAnswerBtn.addEventListener('click', () => {
      if (selectedOptionIndex === null) return;

      const q = questionsList[currentQuestionIndex];
      const optionsList = q.options || q.answerOptions || [];
      const chosenOpt = optionsList[selectedOptionIndex];

      answeredCount++;
      const isCorrect = chosenOpt.isCorrect === true || selectedOptionIndex + 1 === q.correctAnswerIndex;
      if (isCorrect) {
        score += 1;
      }

      const labels = document.querySelectorAll('.option-label');
      optionsList.forEach((opt, idx) => {
        const correctFlag = opt.isCorrect === true || (idx + 1) === q.correctAnswerIndex;
        if (correctFlag) {
          labels[idx].classList.add('correct-highlight');
        } else if (idx === selectedOptionIndex && !isCorrect) {
          labels[idx].classList.add('incorrect-highlight');
        }
      });

      optionsList.forEach((opt, idx) => {
        if (opt.rationale) {
          const rationaleSpan = document.createElement('span');
          rationaleSpan.className = 'rationale-text';
          rationaleSpan.textContent = `Rationale: ${opt.rationale}`;
          labels[idx].appendChild(rationaleSpan);
        }
      });

      feedbackText.innerHTML = isCorrect ? 
        `<strong>Correct!</strong> Great job applying nursing concepts.` : 
        `<strong>Incorrect.</strong> Review the highlighted correct answer and rationale above.`;
      
      feedbackBox.classList.remove('hidden');
      submitAnswerBtn.classList.add('hidden');
      nextQuestionBtn.classList.remove('hidden');
    });
  }

  if (nextQuestionBtn) {
    nextQuestionBtn.addEventListener('click', () => {
      currentQuestionIndex++;
      if (currentQuestionIndex < questionsList.length) {
        loadQuestion();
      } else {
        const finalPercentage = ((score / questionsList.length) * 100).toFixed(1);
        questionProgress.textContent = `Quiz Completed`;
        questionMeta.innerHTML = `<span class="meta-pill">Session Review</span>`;
        questionText.textContent = `Quiz Complete! You scored ${score.toFixed(1)} out of ${questionsList.length} (${finalPercentage}%).`;
        optionsContainer.innerHTML = `
          <div class="summary-container">
            <div class="summary-score-card">
              <h3>Performance Summary</h3>
              <p>Total Points: ${score.toFixed(1)} / ${questionsList.length}</p>
              <p>Accuracy: ${finalPercentage}%</p>
            </div>
            <div style="display: flex; gap: 10px; flex-direction: column;">
              <button id="restart-quiz-btn" class="action-btn">Retake Quiz</button>
              <button id="choose-another-chapter-btn" class="action-btn" style="background-color: #64748b;">Choose Another Chapter</button>
            </div>
          </div>
        `;
        feedbackBox.classList.add('hidden');
        submitAnswerBtn.classList.add('hidden');
        nextQuestionBtn.classList.add('hidden');

        document.getElementById('restart-quiz-btn').addEventListener('click', () => {
          showQuizConfig();
        });

        document.getElementById('choose-another-chapter-btn').addEventListener('click', () => {
          showChapterSelection();
        });
      }
    });
  }
}