import { db } from './firebase-config.js';
import { collection, getDocs, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { auth } from './firebase-config.js';

export function initTestBank() {
  let attempts = 0;
  const waitForElements = setInterval(() => {
    const launchQuizBtn = document.getElementById('launch-quiz-btn');
    const quizModal = document.getElementById('quiz-modal');
    const openEditBtn = document.getElementById('open-edit-profile');
    attempts++;

    if (launchQuizBtn && quizModal) {
      clearInterval(waitForElements);
      setupQuiz(launchQuizBtn, quizModal);
      if (openEditBtn) setupProfileEditor();
    } else if (attempts > 40) {
      clearInterval(waitForElements);
    }
  }, 50);
}

function setupProfileEditor() {
  const openBtn = document.getElementById('open-edit-profile');
  const modal = document.getElementById('edit-profile-modal');
  const closeBtn = document.getElementById('close-edit-modal');
  const saveBtn = document.getElementById('save-profile-btn');
  const nameInput = document.getElementById('edit-name-input');
  const roleInput = document.getElementById('edit-role-input');

  if (!openBtn || !modal) return;

  openBtn.addEventListener('click', () => {
    nameInput.value = document.getElementById('user-fullname').textContent || '';
    roleInput.value = document.getElementById('user-role').textContent || '';
    modal.classList.remove('hidden');
  });

  const closeModal = () => modal.classList.add('hidden');
  closeBtn?.addEventListener('click', closeModal);

  saveBtn?.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return;

    const updatedName = nameInput.value.trim();
    const updatedRole = roleInput.value.trim();

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        name: updatedName,
        role: updatedRole
      });

      document.getElementById('user-fullname').textContent = updatedName;
      document.getElementById('user-role').textContent = updatedRole;
      closeModal();
    } catch (err) {
      console.error("Error updating profile details:", err);
    }
  });
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

function normalizeChapterName(name) {
  if (!name) return "General Practice";
  return name
    .replace(/[:\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/(^\w|\s\w)/g, m => m.toUpperCase());
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
  let flaggedQuestionIndices = new Set();
  
  let timerInterval = null;
  let secondsRemaining = 0;

  launchQuizBtn.addEventListener('click', async () => {
    quizModal.classList.remove('hidden');
    
    try {
      const querySnapshot = await getDocs(collection(db, "questions"));
      allQuestions = [];
      querySnapshot.forEach((docSnap) => {
        const qData = docSnap.data();
        qData.normalizedChapter = normalizeChapterName(qData.chapter);
        allQuestions.push(qData);
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
      stopTimer();
      quizModal.classList.add('hidden');
    });
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function showChapterSelection() {
    stopTimer();
    questionProgress.textContent = "Select Quiz Category";
    questionMeta.innerHTML = `<span class="meta-pill">Chapter Selection</span>`;
    questionText.textContent = "Choose a chapter or review mode to begin:";
    
    feedbackBox.classList.add('hidden');
    submitAnswerBtn.classList.add('hidden');
    nextQuestionBtn.classList.add('hidden');
    sessionMissedQuestions = [];
    flaggedQuestionIndices.clear();

    const chapterMap = {};
    allQuestions.forEach(q => {
      const normChap = q.normalizedChapter || "General Practice";
      if (!chapterMap[normChap]) chapterMap[normChap] = [];
      chapterMap[normChap].push(q);
    });

    optionsContainer.innerHTML = '';
    
    const missedBtn = document.createElement('div');
    missedBtn.className = 'option-label selected-chapter-card';
    missedBtn.style.textAlign = 'center';
    missedBtn.style.fontWeight = '600';
    missedBtn.style.background = '#fef2f2';
    missedBtn.style.borderColor = '#fecaca';
    missedBtn.style.justifyContent = 'center';
    missedBtn.innerHTML = `<span>🎯 Target & Review Missed Questions</span>`;
    missedBtn.addEventListener('click', async () => {
      const user = auth.currentUser;
      if (user) {
        const uDoc = await getDoc(doc(db, "users", user.uid));
        if (uDoc.exists() && uDoc.data().missedQuestions?.length > 0) {
          const missedData = uDoc.data().missedQuestions;
          selectedChapterQuestions = allQuestions.filter(q => missedData.some(m => m.questionText === q.questionText));
          if (selectedChapterQuestions.length === 0) {
            alert("No matching active questions found for your missed list.");
            return;
          }
          activeChapterName = "Targeted Missed Review";
          showQuizConfig();
        } else {
          alert("You don't have any recorded missed questions yet!");
        }
      }
    });
    optionsContainer.appendChild(missedBtn);

    Object.keys(chapterMap).forEach(chap => {
      const chapQuestions = chapterMap[chap];
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
    stopTimer();
    questionProgress.textContent = "Quiz Configuration";
    questionMeta.innerHTML = `<span class="meta-pill">Session Settings</span>`;
    questionText.textContent = `Configure your session (${selectedChapterQuestions.length} questions available):`;
    
    optionsContainer.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <div>
          <label style="font-weight: 600; display: block; margin-bottom: 6px; color: #334155;">Number of Questions:</label>
          <input type="number" id="question-count-input" value="${selectedChapterQuestions.length}" min="1" max="${selectedChapterQuestions.length}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; background: white; font-size: 14px; box-sizing: border-box;">
        </div>
        <div>
          <label style="font-weight: 600; display: block; margin-bottom: 6px; color: #334155;">Question Order:</label>
          <select id="question-order-select" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; background: white; font-size: 14px; box-sizing: border-box;">
            <option value="random" selected>🔀 Randomize / Shuffle</option>
            <option value="sequential">📋 Sequential Order</option>
          </select>
        </div>
        <div>
          <label style="font-weight: 600; display: block; margin-bottom: 6px; color: #334155;">⏱️ Exam Simulation Timer:</label>
          <select id="quiz-timer-select" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; background: white; font-size: 14px; box-sizing: border-box;">
            <option value="none" selected>No Timer (Relaxed Mode)</option>
            <option value="1">1 Minute per Question</option>
            <option value="2">2 Minutes per Question</option>
          </select>
        </div>
        <button id="start-configured-quiz" class="action-btn" style="margin-top: 6px;">Start Quiz Session</button>
        <button id="back-to-chapters" class="action-btn" style="background-color: #64748b;">Back to Categories</button>
      </div>
    `;

    document.getElementById('start-configured-quiz').addEventListener('click', () => {
      const inputVal = parseInt(document.getElementById('question-count-input').value, 10);
      const orderVal = document.getElementById('question-order-select').value;
      const timerVal = document.getElementById('quiz-timer-select').value;

      let list = [...selectedChapterQuestions];
      if (orderVal === 'random') list = shuffleArray(list);

      const limit = isNaN(inputVal) ? list.length : Math.max(1, Math.min(inputVal, list.length));
      questionsList = list.slice(0, limit);
      
      if (timerVal !== 'none') {
        secondsRemaining = limit * parseInt(timerVal, 10) * 60;
        startTimer();
      }

      startQuizSession();
    });

    document.getElementById('back-to-chapters').addEventListener('click', () => {
      showChapterSelection();
    });
  }

  function startTimer() {
    stopTimer();
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

  function startQuizSession() {
    currentQuestionIndex = 0;
    score = 0;
    answeredCount = 0;
    flaggedQuestionIndices.clear();
    loadQuestion();
  }

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

        inputElem.disabled = true;

        if (userTyped === correctAns) {
          questionEarnedScore = 1;
          feedbackStatus = "correct";
          feedbackText.innerHTML = `<strong>Correct! (+1.0 pt)</strong><br>Answer: <em>${q.correctAnswer}</em><br><br>Rationale: ${q.rationale || q.feedback || "Great job!"}`;
        } else {
          feedbackStatus = "incorrect";
          feedbackText.innerHTML = `<strong>Incorrect. (0.0 pts)</strong><br>You typed: <em>${inputElem.value}</em><br>Correct Answer: <em>${q.correctAnswer}</em><br><br>Rationale: ${q.rationale || q.feedback || ""}`;
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
            rationales: optionsList.map(o => o.rationale).filter(Boolean).map(r => `<p style="margin: 6px 0; padding-left: 10px; border-left: 3px solid #cbd5e1;">${r}</p>`).join("")
          });
        }

        const labels = document.querySelectorAll('.option-label');
        optionsList.forEach((opt, idx) => {
          const isCorrectOption = correctIndices.includes(idx);
          const wasSelected = selectedOptionIndices.includes(idx);

          labels[idx].classList.remove('eval-correct', 'eval-missed', 'eval-incorrect', 'selected');

          if (isCorrectOption && wasSelected) {
            labels[idx].classList.add('eval-correct');
          } else if (isCorrectOption && !wasSelected) {
            labels[idx].classList.add('eval-missed');
          } else if (!isCorrectOption && wasSelected) {
            labels[idx].classList.add('eval-incorrect');
          }
        });

        optionsList.forEach((opt, idx) => {
          if (opt.rationale) {
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
          feedbackText.innerHTML = `<strong>Correct! (+1.0 pt)</strong> Great job applying nursing concepts.`;
        } else if (feedbackStatus === "partial") {
          feedbackText.innerHTML = `<strong>Partially Correct! (+${questionEarnedScore.toFixed(2)} pts)</strong>`;
        } else {
          feedbackText.innerHTML = `<strong>Incorrect. (0.0 pts)</strong> Review rationales above.`;
        }
      }

      score += questionEarnedScore;
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

              sessionMissedQuestions.forEach(m => {
                if (!existingMissed.some(ex => ex.questionText === m.questionText)) {
                  existingMissed.push(m);
                }
              });

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
          <div class="summary-container" style="display: flex; flex-direction: column; gap: 14px;">
            <div class="summary-score-card" style="background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(51, 65, 85, 0.8); color: #f8fafc; padding: 1.25rem; border-radius: 0.75rem; text-align: left;">
              <h3 style="color: #ffffff; font-size: 1.15rem; font-weight: 600; margin-bottom: 0.75rem;">Performance Summary</h3>
              <p style="color: #cbd5e1; margin: 0.35rem 0; font-size: 0.95rem;">Total Points: ${score.toFixed(1)} / ${questionsList.length}</p>
              <p style="color: #cbd5e1; margin: 0.35rem 0; font-size: 0.95rem;">Accuracy: ${finalPercentage}%</p>
              <p style="color: #cbd5e1; margin: 0.35rem 0; font-size: 0.95rem;">Flagged Questions: ${flaggedQuestionIndices.size}</p>
            </div>
            <div style="display: flex; gap: 10px; flex-direction: column;">
              <button id="restart-quiz-btn" class="action-btn">Retake Quiz</button>
              <button id="choose-another-chapter-btn" class="action-btn" style="background-color: #64748b;">Choose Another Category</button>
            </div>
          </div>
        `;
        feedbackBox.classList.add('hidden');
        submitAnswerBtn.classList.add('hidden');
        nextQuestionBtn.classList.add('hidden');

        document.getElementById('restart-quiz-btn').addEventListener('click', () => showQuizConfig());
        document.getElementById('choose-another-chapter-btn').addEventListener('click', () => showChapterSelection());
      }
    });
  }
}