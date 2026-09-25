import { db } from './firebase-config.js';
import { collection, getDocs, doc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { auth } from './firebase-config.js';
import { setupProfileEditor } from './profileEditor.js';
import { checkAdminStatus, getReleasedChapters, toggleChapterRelease } from './adminManager.js';
import { normalizeChapterName, setupQuizSession } from './quizEngine.js';

let cachedQuestions = null;
let cachedReleasedChapters = [];
let currentUserIsAdmin = false;

async function prefetchPortalData() {
  try {
    if (!cachedQuestions) {
      const querySnapshot = await getDocs(collection(db, "questions"));
      cachedQuestions = [];
      querySnapshot.forEach((docSnap) => {
        const qData = docSnap.data();
        qData.normalizedChapter = normalizeChapterName(qData.chapter);
        cachedQuestions.push(qData);
      });
    }

    cachedReleasedChapters = await getReleasedChapters();
    currentUserIsAdmin = await checkAdminStatus();

    return cachedQuestions;
  } catch (error) {
    console.error("Error prefetching portal data:", error);
    return [];
  }
}

export function initTestBank() {
  prefetchPortalData();

  let attempts = 0;
  const waitForElements = setInterval(() => {
    const launchQuizBtn = document.getElementById('launch-quiz-btn');
    const quizModal = document.getElementById('quiz-modal');
    const openEditBtn = document.getElementById('open-edit-profile');
    attempts++;

    if (launchQuizBtn && quizModal) {
      clearInterval(waitForElements);
      setupTestBankModal(launchQuizBtn, quizModal);
      if (openEditBtn) setupProfileEditor();
    } else if (attempts > 40) {
      clearInterval(waitForElements);
    }
  }, 50);
}

function setupTestBankModal(launchQuizBtn, quizModal) {
  const closeQuizBtn = document.getElementById('close-quiz-btn');

  launchQuizBtn.addEventListener('click', async () => {
    quizModal.classList.remove('hidden');
    cachedQuestions = null;
    const allQuestions = await prefetchPortalData();

    if (allQuestions.length === 0) {
      document.getElementById('quiz-progress').textContent = "Test Bank";
      document.getElementById('question-text').textContent = "No questions found in Firestore database.";
      document.getElementById('options-container').innerHTML = '';
      return;
    }

    renderChapterSelection(allQuestions);
  });

  if (closeQuizBtn) {
    closeQuizBtn.addEventListener('click', () => {
      quizModal.classList.add('hidden');
    });
  }
}

async function renderChapterSelection(allQuestions) {
  const questionProgress = document.getElementById('quiz-progress');
  const questionMeta = document.getElementById('question-meta');
  const questionText = document.getElementById('question-text');
  const optionsContainer = document.getElementById('options-container');

  questionProgress.textContent = currentUserIsAdmin ? "Admin Chapter Release Control" : "Select Quiz Category";
  questionMeta.innerHTML = `<span class="meta-pill">${currentUserIsAdmin ? 'Admin Mode' : 'Chapter Selection'}</span>`;
  questionText.textContent = currentUserIsAdmin 
    ? "Toggle chapters below to release them or test quizzes:" 
    : "Choose an available released chapter or review mode to begin:";

  const chapterMap = {};
  allQuestions.forEach(q => {
    const normChap = q.normalizedChapter || "General Practice";
    if (!chapterMap[normChap]) chapterMap[normChap] = [];
    chapterMap[normChap].push(q);
  });

  optionsContainer.innerHTML = '';

  Object.keys(chapterMap).forEach(chap => {
    const chapQuestions = chapterMap[chap];
    const isReleased = cachedReleasedChapters.includes(chap);

    if (!currentUserIsAdmin && !isReleased) return;

    const chapBtn = document.createElement('div');
    chapBtn.className = 'option-label selected-chapter-card';
    chapBtn.style.display = 'flex';
    chapBtn.style.justifyContent = 'space-between';
    chapBtn.style.alignItems = 'center';

    const titleDiv = document.createElement('div');
    titleDiv.innerHTML = `
      <span style="font-weight: 600;">📖 ${chap} ${!isReleased && currentUserIsAdmin ? '🔒 (Hidden)' : ''}</span>
      <span style="font-size: 12px; color: #64748b; display: block;">Total: ${chapQuestions.length} questions</span>
    `;
    chapBtn.appendChild(titleDiv);

    if (currentUserIsAdmin) {
      const actionGroup = document.createElement('div');
      actionGroup.style.display = 'flex';
      actionGroup.style.gap = '6px';

      const releaseBtn = document.createElement('button');
      releaseBtn.className = 'action-btn';
      releaseBtn.style.padding = '6px 10px';
      releaseBtn.style.fontSize = '11px';
      releaseBtn.style.backgroundColor = isReleased ? '#16a34a' : '#64748b';
      releaseBtn.textContent = isReleased ? '✅ Released' : '🔒 Release';

      releaseBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        cachedReleasedChapters = await toggleChapterRelease(chap, cachedReleasedChapters);
        renderChapterSelection(allQuestions);
      });

      const testQuizBtn = document.createElement('button');
      testQuizBtn.className = 'action-btn';
      testQuizBtn.style.padding = '6px 10px';
      testQuizBtn.style.fontSize = '11px';
      testQuizBtn.style.backgroundColor = '#2563eb';
      testQuizBtn.textContent = '▶️ Test Quiz';

      testQuizBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setupQuizSession(allQuestions, chapQuestions, chap, () => renderChapterSelection(allQuestions));
      });

      actionGroup.appendChild(releaseBtn);
      actionGroup.appendChild(testQuizBtn);
      chapBtn.appendChild(actionGroup);
    } else {
      chapBtn.addEventListener('click', () => {
        setupQuizSession(allQuestions, chapQuestions, chap, () => renderChapterSelection(allQuestions));
      });
    }

    optionsContainer.appendChild(chapBtn);
  });
}