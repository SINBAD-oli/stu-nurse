import { db } from './firebase-config.js';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { normalizeChapterName } from './quizEngine.js';

export async function setupAdminPanel() {
  const adminRoot = document.getElementById('admin-controls-root');
  if (!adminRoot) return;

  try {
    const querySnapshot = await getDocs(collection(db, "questions"));
    const chaptersMap = new Set();
    querySnapshot.forEach(docSnap => {
      const q = docSnap.data();
      const rawChap = q.chapter || q.heading || "General Practice";
      chaptersMap.add(normalizeChapterName(rawChap));
    });

    const settingsRef = doc(db, "settings", "chapters");
    const settingsSnap = await getDoc(settingsRef);
    const settingsData = settingsSnap.exists() ? settingsSnap.data() : { releasedChapters: {} };
    let releasedMap = settingsData.releasedChapters || {};

    adminRoot.innerHTML = `
      <div style="background: rgba(30, 41, 59, 0.95); border: 1px solid #334155; border-radius: 8px; padding: 14px; margin-bottom: 16px;">
        <h4 style="margin: 0 0 6px 0; font-size: 14px; color: #f8fafc;">🛠️ Admin Chapter Release Controls</h4>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 0; margin-bottom: 10px;">Manage global releases or target specific users:</p>
        <div id="admin-toggles-container" style="display: flex; flex-direction: column; gap: 10px;"></div>
      </div>
    `;

    const togglesContainer = document.getElementById('admin-toggles-container');
    if (!togglesContainer) return;

    chaptersMap.forEach(chapName => {
      const isReleased = releasedMap[chapName] === true;
      const rowDiv = document.createElement('div');
      rowDiv.style.cssText = `
        display: flex; justify-content: space-between; align-items: center; 
        background: #0f172a; padding: 10px 12px; border-radius: 6px; border: 1px solid #334155; gap: 10px;
      `;

      rowDiv.innerHTML = `
        <span style="font-size: 13px; font-weight: 600; color: #f8fafc; flex: 1;">${chapName}</span>
        <button class="global-toggle-btn action-btn" style="padding: 6px 10px; font-size: 11px; border-radius: 4px; border: none; cursor: pointer; font-weight: 600; background-color: ${isReleased ? '#10b981' : '#475569'}; color: white;">
          ${isReleased ? 'Globally Released' : 'Globally Locked'}
        </button>
        <button class="release-user-btn action-btn" style="padding: 6px 10px; font-size: 11px; border-radius: 4px; border: none; cursor: pointer; font-weight: 600; background-color: #2563eb; color: white;">
          Release to User 👤
        </button>
      `;

      const globalToggleBtn = rowDiv.querySelector('.global-toggle-btn');
      globalToggleBtn.addEventListener('click', async () => {
        releasedMap[chapName] = !releasedMap[chapName];
        try {
          if (!settingsSnap.exists()) {
            await setDoc(settingsRef, { releasedChapters: releasedMap });
          } else {
            await updateDoc(settingsRef, { releasedChapters: releasedMap });
          }
          const updatedState = releasedMap[chapName];
          globalToggleBtn.style.backgroundColor = updatedState ? '#10b981' : '#475569';
          globalToggleBtn.textContent = updatedState ? 'Globally Released' : 'Globally Locked';
        } catch (err) {
          console.error("Error updating global release status:", err);
        }
      });

      const releaseUserBtn = rowDiv.querySelector('.release-user-btn');
      releaseUserBtn.addEventListener('click', () => {
        openUserReleaseModal(chapName);
      });

      togglesContainer.appendChild(rowDiv);
    });

  } catch (err) {
    console.error("Error setting up admin panel:", err);
  }
}

async function openUserReleaseModal(chapterName) {
  let modal = document.getElementById('user-release-modal');
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = 'user-release-modal';
  modal.style.cssText = `
    position: fixed; inset: 0; background: rgba(15, 23, 42, 0.9); 
    display: flex; align-items: center; justify-content: center; z-index: 99999; padding: 20px; box-sizing: border-box;
  `;

  modal.innerHTML = `
    <div style="background: #1e293b; color: #f8fafc; width: 100%; max-width: 550px; max-height: 80vh; border-radius: 12px; display: flex; flex-direction: column; border: 1px solid #334155; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8); overflow: hidden;">
      <div style="padding: 16px 20px; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; background: #0f172a;">
        <h3 style="margin: 0; font-size: 16px; color: #f8fafc;">Release "${chapterName}" to Specific Users</h3>
        <button id="close-user-modal" style="background: transparent; border: none; color: #94a3b8; font-size: 16px; cursor: pointer;">✕</button>
      </div>
      <div id="users-list-container" style="padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; flex: 1;">
        <p style="color: #94a3b8; margin: 0; font-size: 13px;">Loading registered users...</p>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('close-user-modal').addEventListener('click', () => {
    modal.remove();
  });

  try {
    const usersSnapshot = await getDocs(collection(db, "users"));
    const usersListContainer = document.getElementById('users-list-container');
    usersListContainer.innerHTML = '';

    if (usersSnapshot.empty) {
      usersListContainer.innerHTML = `<p style="color: #94a3b8; font-size: 13px;">No registered users found in Firestore.</p>`;
      return;
    }

    usersSnapshot.forEach(userDoc => {
      const uData = userDoc.data();
      const uId = userDoc.id;
      const uName = `${uData.firstName || ""} ${uData.lastName || ""}`.trim() || uData.email || "Student User";
      const uRole = uData.role || "Nursing Student";
      
      const unlockedMap = uData.unlockedChapters || {};
      let isUnlocked = unlockedMap[chapterName] === true;

      const userCard = document.createElement('div');
      userCard.style.cssText = `
        display: flex; justify-content: space-between; align-items: center; padding: 12px; border-radius: 8px;
        background: ${isUnlocked ? 'rgba(16, 185, 129, 0.15)' : '#0f172a'};
        border: 1px solid ${isUnlocked ? '#10b981' : '#334155'}; transition: all 0.2s ease; cursor: pointer;
      `;

      userCard.innerHTML = `
        <div>
          <h4 style="margin: 0 0 2px 0; font-size: 14px; color: #f8fafc;">${uName}</h4>
          <span style="font-size: 11px; color: #94a3b8;">${uData.email || ''} • (${uRole})</span>
        </div>
        <button class="action-btn toggle-access-btn" style="padding: 6px 14px; font-size: 12px; border-radius: 6px; border: none; font-weight: 600; cursor: pointer; background: ${isUnlocked ? '#10b981' : '#2563eb'}; color: white;">
          ${isUnlocked ? '✓ Released' : 'Release Chapter'}
        </button>
      `;

      const toggleBtn = userCard.querySelector('.toggle-access-btn');
      userCard.addEventListener('click', async () => {
        isUnlocked = !isUnlocked;
        unlockedMap[chapterName] = isUnlocked;

        try {
          await updateDoc(doc(db, "users", uId), {
            unlockedChapters: unlockedMap
          });

          userCard.style.background = isUnlocked ? 'rgba(16, 185, 129, 0.15)' : '#0f172a';
          userCard.style.borderColor = isUnlocked ? '#10b981' : '#334155';
          toggleBtn.style.background = isUnlocked ? '#10b981' : '#2563eb';
          toggleBtn.textContent = isUnlocked ? '✓ Released' : 'Release Chapter';
        } catch (err) {
          console.error("Error updating user chapter access:", err);
        }
      });

      usersListContainer.appendChild(userCard);
    });

  } catch (err) {
    console.error("Error loading users for chapter release:", err);
  }
}