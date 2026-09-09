import { db } from './firebase-config.js';
import { collection, getDocs, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { auth } from './firebase-config.js';

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
  let selectedOptionIndices = [];
  let score = 0;
  let answeredCount = 0;
  let activeChapterName = "";
  let sessionMissedQuestions = [];

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
        questionText.textContent = "No questions found in Firestore database.";
        optionsContainer.innerHTML = '';
        return;
      }

      showChapterSelection();
    } catch (error) {
      console.error("Error loading questions:", error);
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
    sessionMissedQuestions = [];

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
      activeChapterName = "All Chapters Combined";
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
        activeChapterName = chap;
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
          <label style="font-weight: 600; display: block; margin-bottom: 8px; color: #334155;">Number of Questions:</label>
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
      if (orderVal === 'random') list = shuffleArray(list);

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
    
    const optionsList = q.options || q.answerOptions || [];
    
    const textLower = (q.questionText || "").toLowerCase();
    const hasSataText = textLower.includes("select all that apply") || textLower.includes("all that apply");
    const correctOptionsCount = optionsList.filter(o => o.isCorrect === true).length;
    const isSATA = q.type === 'SATA' || hasSataText || correctOptionsCount > 1;

    questionMeta.innerHTML = `
      ${q.chapter ? `<span class="meta-pill">${q.chapter}</span>` : ''}
      <span class="meta-pill" style="background-color: ${isSATA ? '#fef3c7; color: #b45309;' : '#e0e7ff; color: #3730a3;'}">${isSATA ? 'SATA' : 'MCQ'}</span>
      ${q.clientNeed ? `<span class="meta-pill">Client Need: ${q.clientNeed}</span>` : ''}
      ${q.cognitiveLevel ? `<span class="meta-pill">Cognitive: ${q.cognitiveLevel}</span>` : ''}
    `;

    questionText.textContent = q.questionText;
    optionsContainer.innerHTML = '';
    feedbackBox.classList.add('hidden');
    submitAnswerBtn.classList.remove('hidden');
    submitAnswerBtn.disabled = true;
    nextQuestionBtn.classList.add('hidden');
    selectedOptionIndices = [];

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

  if (submitAnswerBtn) {
    submitAnswerBtn.addEventListener('click', () => {
      if (selectedOptionIndices.length === 0) return;

      const q = questionsList[currentQuestionIndex];
      const optionsList = q.options || q.answerOptions || [];
      
      const correctIndices = [];
      optionsList.forEach((opt, idx) => {
        if (opt.isCorrect === true || (idx + 1) === q.correctAnswerIndex) {
          correctIndices.push(idx);
        }
      });

      answeredCount++;
      let questionEarnedScore = 0;
      let feedbackStatus = "";

      const textLower = (q.questionText || "").toLowerCase();
      const hasSataText = textLower.includes("select all that apply") || textLower.includes("all that apply");
      const correctOptionsCount = correctIndices.length;
      const isSATA = q.type === 'SATA' || hasSataText || correctOptionsCount > 1;

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

      score += questionEarnedScore;
      const specificChap = q.chapter || activeChapterName || "General Practice";

      if (feedbackStatus !== "correct") {
        sessionMissedQuestions.push({
          chapter: specificChap,
          questionText: q.questionText,
          clientNeed: q.clientNeed || "N/A",
          cognitiveLevel: q.cognitiveLevel || "N/A",
          concept: q.concept || q.heading || "General Nursing Concept",
          rationales: optionsList.map(o => o.rationale).filter(Boolean).join(" | ")
        });
      }

      // Enhanced Highlighting Logic:
      // Green = Correct option selected
      // Red = Incorrect option selected
      // Yellow = Correct option that was MISSED (not selected by student)
      const labels = document.querySelectorAll('.option-label');
      optionsList.forEach((opt, idx) => {
        const isCorrectOption = correctIndices.includes(idx);
        const wasSelected = selectedOptionIndices.includes(idx);

        if (isCorrectOption && wasSelected) {
          labels[idx].style.backgroundColor = "#d1fae5"; // Green (Correctly selected)
          labels[idx].style.borderColor = "#10b981";
        } else if (isCorrectOption && !wasSelected) {
          labels[idx].style.backgroundColor = "#fef08a"; // Yellow (Missed correct answer)
          labels[idx].style.borderColor = "#eab308";
        } else if (!isCorrectOption && wasSelected) {
          labels[idx].style.backgroundColor = "#fee2e2"; // Red (Incorrectly selected)
          labels[idx].style.borderColor = "#ef4444";
        }
      });

      // Display rationales below each option
      optionsList.forEach((opt, idx) => {
        if (opt.rationale) {
          const existingRationale = labels[idx].querySelector('.rationale-text');
          if (!existingRationale) {
            const rationaleSpan = document.createElement('span');
            rationaleSpan.className = 'rationale-text';
            rationaleSpan.style.display = 'block';
            rationaleSpan.style.marginTop = '6px';
            rationaleSpan.style.fontSize = '12px';
            rationaleSpan.style.color = '#334155';
            rationaleSpan.style.fontStyle = 'italic';
            rationaleSpan.textContent = `Rationale: ${opt.rationale}`;
            labels[idx].appendChild(rationaleSpan);
          }
        }
      });

      if (feedbackStatus === "correct") {
        feedbackText.innerHTML = `<strong>Correct! (+1.0 pt)</strong> Great job applying nursing concepts.`;
      } else if (feedbackStatus === "partial") {
        feedbackText.innerHTML = `<strong>Partially Correct! (+${questionEarnedScore.toFixed(2)} pts)</strong> Green = correct selections, Yellow = missed correct answers, Red = incorrect selections.`;
      } else {
        feedbackText.innerHTML = `<strong>Incorrect. (0.0 pts)</strong> Green/Yellow = correct answers, Red = your incorrect picks. Review rationales above.`;
      }
      
      feedbackBox.classList.remove('hidden');
      submitAnswerBtn.classList.add('hidden');
      nextQuestionBtn.classList.remove('hidden');

      if (!window.currentSessionChapterScores) window.currentSessionChapterScores = {};
      if (!window.currentSessionChapterScores[specificChap]) {
        window.currentSessionChapterScores[specificChap] = { correct: 0, total: 0 };
      }
      window.currentSessionChapterScores[specificChap].correct += questionEarnedScore;
      window.currentSessionChapterScores[specificChap].total += 1;
    });
  }

  if (nextQuestionBtn) {
    nextQuestionBtn.addEventListener('click', async () => {
      currentQuestionIndex++;
      if (currentQuestionIndex < questionsList.length) {
        loadQuestion();
      } else {
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
              const chapterStats = uData.chapterStats || {};
              let existingMissed = uData.missedQuestions || [];

              const newTotalQuizzes = prevQuizzes + 1;
              const newAvgAccuracy = Number(((prevAvg * prevQuizzes + parseFloat(finalPercentage)) / newTotalQuizzes).toFixed(1));

              if (window.currentSessionChapterScores) {
                for (const [chap, data] of Object.entries(window.currentSessionChapterScores)) {
                  if (!chapterStats[chap]) chapterStats[chap] = { correct: 0, total: 0 };
                  chapterStats[chap].correct += data.correct;
                  chapterStats[chap].total += data.total;
                }
              }
              window.currentSessionChapterScores = {};

              existingMissed.push(...sessionMissedQuestions);

              await updateDoc(userRef, {
                totalQuizzesTaken: newTotalQuizzes,
                averageAccuracy: newAvgAccuracy,
                chapterStats: chapterStats,
                missedQuestions: existingMissed
              });
            }
          } catch (err) {
            console.error("Error updating scores:", err);
          }
        }

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

        document.getElementById('restart-quiz-btn').addEventListener('click', () => showQuizConfig());
        document.getElementById('choose-another-chapter-btn', () => showChapterSelection());
      }
    });
  }
}