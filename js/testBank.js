import { db, auth } from './firebase-config.js';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { setupQuizSession, normalizeChapterName } from './quizEngine.js';

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
      const userRef = doc(db, "users", currentUser.email);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        userData = userSnap.data();
      }
    }

    const isAdmin = userData.isAdmin === true;

    // Render Master Admin Control Panel & Multi-Chapter Checkbox Manager if Admin
    if (isAdmin) {
      const adminControlsRoot = quickStudyCard.querySelector('#admin-controls-root');
      if (adminControlsRoot) {
        adminControlsRoot.innerHTML = `
          <div style="margin-bottom: 14px; padding: 12px; background: rgba(15, 23, 42, 0.9); border: 1px solid #334155; border-radius: 6px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <span style="font-size: 12px; color: #38bdf8; font-weight: 600;">⚡ Admin Global Control</span>
              <button id="unrelease-all-btn" style="background: #dc2626; color: white; border: none; padding: 5px 10px; border-radius: 4px; font-size: 11px; cursor: pointer; font-weight: 600;">🔒 Unrelease All Chapters</button>
            </div>
            
            <div style="border-top: 1px solid #334155; paddingTop: 10px; margin-top: 10px;">
              <span style="font-size: 12px; color: #f8fafc; font-weight: 600; display: block; margin-bottom: 6px;">👥 Manual Multi-Chapter User Unlock</span>
              
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <select id="admin-user-select" style="width: 100%; background: #1e293b; color: white; border: 1px solid #475569; padding: 6px; border-radius: 4px; font-size: 11px;">
                  <option value="">Select User...</option>
                </select>

                <label style="font-size: 11px; color: #94a3b8;">Select Chapters to Unlock:</label>
                <div id="admin-chapter-checkboxes" style="max-height: 110px; overflow-y: auto; background: #1e293b; border: 1px solid #475569; padding: 6px; border-radius: 4px; display: flex; flex-direction: column; gap: 4px;">
                  <span style="font-size: 11px; color: #64748b; font-style: italic;">Loading chapters...</span>
                </div>

                <button id="admin-grant-btn" style="background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 11px; cursor: pointer; font-weight: 600; margin-top: 4px;">Grant Access to Selected Chapters</button>
              </div>
            </div>
          </div>
        `;

        // Unrelease All handler
        adminControlsRoot.querySelector('#unrelease-all-btn')?.addEventListener('click', async () => {
          if (confirm("Are you sure you want to lock/unrelease all chapters globally?")) {
            await unreleaseAllChapters();
          }
        });

        // Populate dropdowns and checkboxes for admin user management
        populateAdminAdminControls();
      }
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

async function populateAdminAdminControls() {
  try {
    const userSelect = document.getElementById('admin-user-select');
    const checkboxesContainer = document.getElementById('admin-chapter-checkboxes');
    const grantBtn = document.getElementById('admin-grant-btn');

    if (!userSelect || !checkboxesContainer || !grantBtn) return;

    // Fetch all users
    const usersSnap = await getDocs(collection(db, "users"));
    usersSnap.forEach(docSnap => {
      const uData = docSnap.data();
      const email = docSnap.id;
      const opt = document.createElement('option');
      opt.value = email;
      opt.textContent = `${uData.firstName || email} (${email})`;
      userSelect.appendChild(opt);
    });

    // Fetch all questions to populate chapter checkboxes
    const qSnap = await getDocs(collection(db, "questions"));
    const chapterSet = new Set();
    qSnap.forEach(docSnap => {
      const q = docSnap.data();
      chapterSet.add(normalizeChapterName(q.chapter || q.heading || "General Practice"));
    });

    checkboxesContainer.innerHTML = '';
    if (chapterSet.size === 0) {
      checkboxesContainer.innerHTML = `<span style="font-size: 11px; color: #64748b; font-style: italic;">No chapters found.</span>`;
    } else {
      chapterSet.forEach(chap => {
        const label = document.createElement('label');
        label.style.cssText = `display: flex; align-items: center; gap: 6px; font-size: 11px; color: #f8fafc; cursor: pointer;`;
        label.innerHTML = `<input type="checkbox" class="admin-chap-cb" value="${chap}" style="cursor: pointer;"> ${chap}`;
        checkboxesContainer.appendChild(label);
      });
    }

    // Grant access button click listener for multi-checkbox selection
    grantBtn.addEventListener('click', async () => {
      const targetEmail = userSelect.value;
      if (!targetEmail) {
        alert("Please select a user.");
        return;
      }

      const checkedBoxes = checkboxesContainer.querySelectorAll('.admin-chap-cb:checked');
      if (checkedBoxes.length === 0) {
        alert("Please select at least one chapter to unlock.");
        return;
      }

      const unlockedUpdates = {};
      checkedBoxes.forEach(cb => {
        unlockedUpdates[`unlockedChapters.${cb.value}`] = true;
      });

      const targetUserRef = doc(db, "users", targetEmail);
      await updateDoc(targetUserRef, unlockedUpdates);

      alert(`Successfully granted access to selected chapters for ${targetEmail}!`);
      initTestBank();
    });

  } catch (err) {
    console.error("Error populating admin controls:", err);
  }
}

async function unreleaseAllChapters() {
  try {
    const settingsRef = doc(db, "settings", "chapters");
    await setDoc(settingsRef, { releasedChapters: {} }, { merge: false });
    console.log("🔒 All chapters have been unreleased globally.");
    initTestBank();
  } catch (err) {
    console.error("Error unreleasing all chapters:", err);
  }
}

async function toggleChapterRelease(chapName, releaseStatus) {
  try {
    const settingsRef = doc(db, "settings", "chapters");
    await setDoc(settingsRef, {
      releasedChapters: {
        [chapName]: releaseStatus
      }
    }, { merge: true });
    
    console.log(`🔒 Chapter "${chapName}" release status changed to: ${releaseStatus}`);
    initTestBank();
  } catch (err) {
    console.error("Error updating chapter release status:", err);
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
    const userSnap = await getDoc(doc(db, "users", currentUser.email));
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

    if (!isAdmin && hasReleaseSettings && !isGloballyReleased && !isUserUnlocked) return;

    const userProgress = userData.chapterProgressMap || {};
    const chapterProgress = userProgress[chapName] || {};
    
    const unmasteredQuestions = questions.filter(q => {
      const record = chapterProgress[q.questionText];
      return !record || record.correct !== true;
    });

    const card = document.createElement('div');
    card.style.cssText = `
      background: rgba(30, 41, 59, 0.8); border: 1px solid #334155; border-radius: 6px; padding: 12px;
      display: flex; flex-direction: column; justify-content: space-between; gap: 10px; cursor: pointer;
      transition: all 0.2s ease;
    `;
    card.onmouseover = () => card.style.borderColor = '#64748b';
    card.onmouseout = () => card.style.borderColor = '#334155';

    const adminActionHTML = isAdmin ? `
      <div style="margin-top: 4px; display: flex;">
        <button class="toggle-release-btn" data-chap="${chapName}" data-status="${!isGloballyReleased}" style="width: 100%; padding: 5px; font-size: 11px; background: ${isGloballyReleased ? '#dc2626' : '#10b981'}; color: white; border: none; border-radius: 4px; cursor: pointer;">
          ${isGloballyReleased ? '🔒 Unrelease / Lock' : '🔓 Release Globally'}
        </button>
      </div>
    ` : '';

    card.innerHTML = `
      <div>
        <h4 style="margin: 0 0 4px 0; font-size: 14px; color: #f8fafc; font-weight: 600;">${chapName}</h4>
        <span style="font-size: 11px; color: #94a3b8;">${unmasteredQuestions.length} unmastered / ${questions.length} total ${isAdmin ? (isGloballyReleased ? '• (Global)' : '• (Locked)') : ''}</span>
        ${adminActionHTML}
      </div>
      <button class="action-btn" style="padding: 6px 12px; font-size: 12px; background-color: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; width: 100%;">Start Quiz</button>
    `;

    if (isAdmin) {
      const toggleBtn = card.querySelector('.toggle-release-btn');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const chap = toggleBtn.getAttribute('data-chap');
          const newStatus = toggleBtn.getAttribute('data-status') === 'true';
          await toggleChapterRelease(chap, newStatus);
        });
      }
    }

    card.addEventListener('click', async () => {
      let freshUserData = {};
      if (currentUser) {
        const freshSnap = await getDoc(doc(db, "users", currentUser.email));
        if (freshSnap.exists()) freshUserData = freshSnap.data();
      }

      const freshProgress = freshUserData.chapterProgressMap || {};
      const freshChapProgress = freshProgress[chapName] || {};
      
      const freshUnmastered = questions.filter(q => {
        const record = freshChapProgress[q.questionText];
        return !record || record.correct !== true;
      });

      setupQuizSession(allQuestions, questions, freshUnmastered, chapName, () => {
        renderChapterSelector(allQuestions, releasedMap, freshUserData.unlockedChapters || {}, isAdmin);
      });
    });

    chapterListContainer.appendChild(card);
  });
}