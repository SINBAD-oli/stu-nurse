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
        <p style="font-size: 12px; color: #94a3b8; margin-top: 0; margin-bottom: 10px;">Toggle chapters to release or hide them for students:</p>
        <div id="admin-toggles-container" style="display: flex; flex-wrap: wrap; gap: 8px;"></div>
      </div>
    `;

    const togglesContainer = document.getElementById('admin-toggles-container');
    if (!togglesContainer) return;

    chaptersMap.forEach(chapName => {
      const isReleased = releasedMap[chapName] === true;
      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'action-btn';
      toggleBtn.style.cssText = `
        padding: 6px 10px; font-size: 11px; border-radius: 4px; border: none; cursor: pointer; font-weight: 600;
        background-color: ${isReleased ? '#10b981' : '#475569'}; color: white; transition: all 0.2s ease;
      `;
      toggleBtn.textContent = `${chapName}: ${isReleased ? 'Released (Active)' : 'Hidden (Locked)'}`;

      toggleBtn.addEventListener('click', async () => {
        releasedMap[chapName] = !releasedMap[chapName];
        try {
          if (!settingsSnap.exists()) {
            await setDoc(settingsRef, { releasedChapters: releasedMap });
          } else {
            await updateDoc(settingsRef, { releasedChapters: releasedMap });
          }
          const updatedState = releasedMap[chapName];
          toggleBtn.style.backgroundColor = updatedState ? '#10b981' : '#475569';
          toggleBtn.textContent = `${chapName}: ${updatedState ? 'Released (Active)' : 'Hidden (Locked)'}`;
        } catch (err) {
          console.error("Error updating chapter release status:", err);
        }
      });

      togglesContainer.appendChild(toggleBtn);
    });

  } catch (err) {
    console.error("Error setting up admin panel:", err);
  }
}