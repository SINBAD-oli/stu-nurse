import { db, auth } from './firebase-config.js';
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { setupQuizSession, normalizeChapterName } from './quizEngine.js';
import { setupAdminPanel } from './adminManager.js';

export async function initTestBank() {
  const allCards = document.querySelectorAll('div');
  let quickStudyCard = Array.from(allCards).find(el => el.textContent && el.textContent.includes('Quick Study Access'));

  if (!quickStudyCard) {
    quickStudyCard = document.querySelector('.profile-card')?.nextElementSibling || document.body;
  }

  quickStudyCard.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
      <h3 style="margin: 0; font-size: 16px; color: #f8fafc; font-weight: 600;">📖 Nursing Test Bank</h3>
      <button id="back-to-dashboard-btn" style="background: #475569; color: white; border: none; padding: 4px 10px; border-radius: 4px; font-size: 11px; cursor: pointer;">Dashboard</button>
    </div>
    <div id="admin-controls-root"></div>
    <div id="quiz-app-root" style="font-family: system-ui, -apple-system, sans-serif; margin-top: 10px;">
      <div id="quiz-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 id="quiz-progress" style="margin: 0; font-size: 15px; color: #f8fafc;">Select a Chapter</h3>
        <div id="question-meta" style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;"></div>
      </div>
      <div id="quiz-card" style="background: rgba(15, 23, 42, 0.6); border: 1px solid #334155; border-radius: 8px; padding: 14px; box-sizing: border-box;">
        <div id="chapter-selection-view">
          <p style="color: #94a3b8; margin-top: 0; font-size: 13px;">Choose a chapter below to begin your study session:</p>
          <div id="chapter-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; margin-top: 10px; max-height: 400px; overflow-y: auto;"></div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('back-to-dashboard-btn')?.addEventListener('click', () => {
    window.location.reload();
  });

  try {
    const currentUser = auth.currentUser;
    let userData = {};

    if (currentUser) {
      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        userData = userSnap.data();
      }
    }

    const isAdmin = userData.isAdmin === true;

    if (isAdmin) {
      await setupAdminPanel();
    }

    const querySnapshot = await getDocs(collection(db, "questions"));
    const allQuestions = [];
    querySnapshot.forEach(docSnap => {
      const q = docSnap.data();
      q.normalizedChapter = normalizeChapterName(q.chapter || q.heading || "General Practice");
      allQuestions.push(q);
    });

    const settingsRef = doc(db, "settings", "chapters");
    const settingsSnap = await getDoc(settingsRef);
    const settingsData = settingsSnap.exists() ? settingsSnap.data() : { releasedChapters: {} };
    const releasedMap = settingsData.releasedChapters || {};
    const userUnlockedMap = userData.unlockedChapters || {};

    renderChapterSelector(allQuestions, releasedMap, userUnlockedMap, isAdmin);

  } catch (err) {
    console.error("Error initializing test bank:", err);
  }
}

async function renderChapterSelector(allQuestions, releasedMap, userUnlockedMap, isAdmin) {
  const chapterListContainer = document.getElementById('chapter-list');
  const chapterSelectionView = document.getElementById('chapter-selection-view');
  const questionProgress = document.getElementById('quiz-progress');
  const questionMeta = document.getElementById('question-meta');

  if (!chapterListContainer || !chapterSelectionView) return;

  chapterSelectionView.style.display = 'block';
  if (questionProgress) questionProgress.textContent = "Select a Chapter";
  if (questionMeta) questionMeta.innerHTML = '';

  const currentUser = auth.currentUser;
  let userData = {};
  if (currentUser) {
    const userSnap = await getDoc(doc(db, "users", currentUser.uid));
    if (userSnap.exists()) userData = userSnap.data();
  }

  const chaptersMap = {};
  allQuestions.forEach(q => {
    const chap = q.normalizedChapter;
    if (!chaptersMap[chap]) chaptersMap[chap] = [];
    chaptersMap[chap].push(q);
  });

  chapterListContainer.innerHTML = '';
  const hasReleaseSettings = Object.keys(releasedMap).length > 0;

  Object.keys(chaptersMap).forEach(chapName => {
    const questions = chaptersMap[chapName];
    const isGloballyReleased = releasedMap[chapName] === true;
    const isUserUnlocked = userUnlockedMap[chapName] === true;

    // Show if admin, globally released, or specifically unlocked for this user
    if (!isAdmin && hasReleaseSettings && !isGloballyReleased && !isUserUnlocked) return;

    const card = document.createElement('div');
    card.style.cssText = `
      background: rgba(30, 41, 59, 0.8); border: 1px solid #334155; border-radius: 6px; padding: 12px;
      display: flex; flex-direction: column; justify-content: space-between; gap: 10px; cursor: pointer;
      transition: all 0.2s ease;
    `;
    card.onmouseover = () => card.style.borderColor = '#64748b';
    card.onmouseout = () => card.style.borderColor = '#334155';

    card.innerHTML = `
      <div>
        <h4 style="margin: 0 0 4px 0; font-size: 14px; color: #f8fafc; font-weight: 600;">${chapName}</h4>
        <span style="font-size: 11px; color: #94a3b8;">${questions.length} questions available ${isAdmin ? (isGloballyReleased ? '• (Global)' : '• (Locked)') : ''}</span>
      </div>
      <button class="action-btn" style="padding: 6px 12px; font-size: 12px; background-color: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; width: 100%;">Start Quiz</button>
    `;

    card.addEventListener('click', async () => {
      let freshUserData = {};
      if (currentUser) {
        const freshSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (freshSnap.exists()) freshUserData = freshSnap.data();
      }

      const userProgress = freshUserData.chapterProgressMap || {};
      const chapterProgress = userProgress[chapName] || {};
      
      const unmasteredQuestions = questions.filter(q => {
        const record = chapterProgress[q.questionText];
        return !record || record.correct !== true;
      });

      setupQuizSession(allQuestions, questions, unmasteredQuestions, chapName, () => {
        renderChapterSelector(allQuestions, releasedMap, freshUserData.unlockedChapters || {}, isAdmin);
      });
    });

    chapterListContainer.appendChild(card);
  });
}