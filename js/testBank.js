import { db, auth } from './firebase-config.js';
import { collection, getDocs, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { setupQuizSession, normalizeChapterName } from './quizEngine.js';
import { setupAdminPanel } from './adminManager.js';

export async function initTestBank() {
  const container = document.getElementById('test-bank-container') || document.body;
  
  // Render main container layout if not already present
  if (!document.getElementById('quiz-app-root')) {
    container.innerHTML = `
      <div id="quiz-app-root" style="max-width: 900px; margin: 0 auto; padding: 20px; font-family: system-ui, -apple-system, sans-serif;">
        <div id="admin-controls-root"></div>
        <div id="quiz-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 id="quiz-progress" style="margin: 0; font-size: 20px; color: #1e293b;">Select a Chapter</h2>
          <div id="question-meta" style="display: flex; gap: 8px; align-items: center;"></div>
        </div>
        <div id="quiz-card" style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <div id="chapter-selection-view">
            <p style="color: #64748b; margin-top: 0;">Choose an unlocked chapter below to begin your study session:</p>
            <div id="chapter-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; margin-top: 16px;"></div>
          </div>
          <p id="question-text" style="font-size: 16px; font-weight: 600; color: #0f172a; margin-top: 0; line-height: 1.5;"></p>
          <div id="options-container" style="display: flex; flex-direction: column; gap: 10px; margin-top: 16px;"></div>
          <div id="feedback-box" class="hidden" style="margin-top: 20px; padding: 14px; border-radius: 8px; background: #f8fafc; border: 1px solid #cbd5e1;">
            <p id="feedback-text" style="margin: 0; font-size: 14px; color: #334155; line-height: 1.4;"></p>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px;">
            <button id="submit-answer-btn" class="action-btn hidden" style="background-color: #2563eb; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; cursor: pointer;">Submit Answer</button>
            <button id="next-question-btn" class="action-btn hidden" style="background-color: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; cursor: pointer;">Next Question</button>
          </div>
        </div>
      </div>
    `;
  }

  try {
    const currentUser = auth.currentUser;
    let userRole = "Nursing Student";
    let userData = {};

    if (currentUser) {
      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        userData = userSnap.data();
        userRole = userData.role || "Nursing Student";
      }
    }

    const isAdmin = userRole.toLowerCase().includes('admin') || userRole.toLowerCase().includes('faculty');

    if (isAdmin) {
      setupAdminPanel();
    }

    // Fetch questions and chapters
    const querySnapshot = await getDocs(collection(db, "questions"));
    const allQuestions = [];
    querySnapshot.forEach(docSnap => {
      const q = docSnap.data();
      q.normalizedChapter = normalizeChapterName(q.chapter);
      allQuestions.push(q);
    });

    // Fetch settings for chapter releases
    const settingsRef = doc(db, "settings", "chapters");
    const settingsSnap = await getDoc(settingsRef);
    const settingsData = settingsSnap.exists() ? settingsSnap.data() : { releasedChapters: {} };
    const releasedMap = settingsData.releasedChapters || {};

    renderChapterSelector(allQuestions, releasedMap, isAdmin, userData);

  } catch (err) {
    console.error("Error initializing test bank:", err);
  }
}

function renderChapterSelector(allQuestions, releasedMap, isAdmin, userData) {
  const chapterListContainer = document.getElementById('chapter-list');
  const chapterSelectionView = document.getElementById('chapter-selection-view');
  const questionText = document.getElementById('question-text');
  const optionsContainer = document.getElementById('options-container');
  const feedbackBox = document.getElementById('feedback-box');
  const submitAnswerBtn = document.getElementById('submit-answer-btn');
  const nextQuestionBtn = document.getElementById('next-question-btn');
  const questionProgress = document.getElementById('quiz-progress');
  const questionMeta = document.getElementById('question-meta');

  chapterSelectionView.style.display = 'block';
  questionText.textContent = '';
  optionsContainer.innerHTML = '';
  feedbackBox.classList.add('hidden');
  submitAnswerBtn.classList.add('hidden');
  nextQuestionBtn.classList.add('hidden');
  questionProgress.textContent = "Select a Chapter";
  questionMeta.innerHTML = '';

  const chaptersMap = {};
  allQuestions.forEach(q => {
    const chap = q.normalizedChapter;
    if (!chaptersMap[chap]) chaptersMap[chap] = [];
    chaptersMap[chap].push(q);
  });

  chapterListContainer.innerHTML = '';

  Object.keys(chaptersMap).forEach(chapName => {
    const questions = chaptersMap[chapName];
    const isReleased = releasedMap[chapName] === true;

    if (!isAdmin && !isReleased) return; // Hide unreleased chapters for students

    const card = document.createElement('div');
    card.style.cssText = `
      background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px;
      display: flex; flex-direction: column; justify-content: space-between; gap: 12px; cursor: pointer;
      transition: all 0.2s ease;
    `;
    card.onmouseover = () => card.style.borderColor = '#94a3b8';
    card.onmouseout = () => card.style.borderColor = '#cbd5e1';

    card.innerHTML = `
      <div>
        <h4 style="margin: 0 0 6px 0; font-size: 15px; color: #0f172a;">${chapName}</h4>
        <span style="font-size: 12px; color: #64748b;">${questions.length} questions available</span>
      </div>
      <button class="action-btn" style="padding: 6px 12px; font-size: 13px; background-color: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer;">Start Quiz</button>
    `;

    card.addEventListener('click', () => {
      chapterSelectionView.style.display = 'none';

      // Restore mastered question exclusion filter
      const userProgress = userData.chapterProgressMap || {};
      const chapterProgress = userProgress[chapName] || {};
      const unmasteredQuestions = questions.filter(q => {
        const record = chapterProgress[q.questionText];
        return !record || record.correct !== true;
      });

      const sessionQuestions = unmasteredQuestions.length > 0 ? unmasteredQuestions : questions;

      setupQuizSession(allQuestions, sessionQuestions, chapName, () => {
        renderChapterSelector(allQuestions, releasedMap, isAdmin, userData);
      });
    });

    chapterListContainer.appendChild(card);
  });
}