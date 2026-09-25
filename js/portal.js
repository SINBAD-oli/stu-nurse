import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { doc, onSnapshot, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { initTestBank } from './testBank.js';
import { openProficiencyReviewModal } from './proficiencyRings.js';

const fullNameSpan = document.getElementById('user-fullname');
const roleSpan = document.getElementById('user-role');
const joinedSpan = document.getElementById('user-joined');
const logoutBtn = document.getElementById('logout-btn');

initTestBank();
initProfileModalListeners();

setPersistence(auth, browserLocalPersistence).then(() => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const docRef = doc(db, "users", user.uid);
        
        onSnapshot(docRef, async (docSnap) => {
          if (!docSnap.exists()) {
            const initialUserData = {
              firstName: "Oliver",
              lastName: "Cimafranca",
              email: user.email,
              role: "Nursing Student",
              createdAt: new Date(),
              totalQuizzesTaken: 0,
              averageAccuracy: 0,
              chapterStats: {},
              missedQuestions: []
            };
            await setDoc(docRef, initialUserData);
          } else {
            const data = docSnap.data();
            fullNameSpan.textContent = `${data.firstName || "Nursing"} ${data.lastName || "Student"}`;
            roleSpan.textContent = data.role || "Nursing Student";
            joinedSpan.textContent = data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString() : "Recently";

            renderProfileCard(user.uid, data);
          }
        });
      } catch (error) {
        console.error("Profile error:", error);
      }
    } else {
      if (window.location.pathname.includes('portal.html')) {
        window.location.href = 'index.html';
      }
    }
  });
});

function renderProfileCard(userId, userData) {
  const profileCard = document.querySelector('.profile-card');
  if (!profileCard) return;

  const existingBlock = document.getElementById('profile-stats-block');
  if (existingBlock) existingBlock.remove();

  const chapterStats = userData.chapterStats || {};
  let chapterRingsHTML = '';

  const chapterKeys = Object.keys(chapterStats);
  if (chapterKeys.length === 0) {
    chapterRingsHTML = `<p style="font-size: 13px; color: #64748b; font-style: italic;">No quiz sessions recorded yet.</p>`;
  } else {
    chapterRingsHTML = `<div style="display: flex; flex-wrap: wrap; gap: 14px; margin-top: 8px;">`;
    chapterKeys.forEach(chap => {
      const stats = chapterStats[chap];
      const accuracy = stats.total > 0 ? ((stats.correct / stats.total) * 100) : 0;
      const formattedAcc = accuracy.toFixed(1);
      
      const radius = 24;
      const circumference = 2 * Math.PI * radius;
      const strokeDashoffset = circumference - (accuracy / 100) * circumference;

      let ringColor = "#ef4444";
      if (accuracy >= 80) ringColor = "#10b981";
      else if (accuracy >= 60) ringColor = "#f59e0b";

      chapterRingsHTML += `
        <div class="chapter-ring-item" data-chapter="${chap}" style="display: flex; flex-direction: column; align-items: center; width: 90px; text-align: center; cursor: pointer;" title="Click to review all answered questions for ${chap}">
          <div style="position: relative; width: 60px; height: 60px;">
            <svg width="60" height="60" style="transform: rotate(-90deg);">
              <circle cx="30" cy="30" r="${radius}" stroke="#e2e8f0" stroke-width="5" fill="none"></circle>
              <circle cx="30" cy="30" r="${radius}" stroke="${ringColor}" stroke-width="5" fill="none"
                stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}" stroke-linecap="round"></circle>
            </svg>
            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #1e293b;">
              ${formattedAcc}%
            </div>
          </div>
          <span style="font-size: 11px; font-weight: 600; color: #475569; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${chap}</span>
        </div>
      `;
    });
    chapterRingsHTML += `</div>`;
  }

  const extraInfoDiv = document.createElement('div');
  extraInfoDiv.id = 'profile-stats-block';
  extraInfoDiv.style.marginTop = '15px';
  extraInfoDiv.style.paddingTop = '15px';
  extraInfoDiv.style.borderTop = '1px solid #e2e8f0';
  extraInfoDiv.innerHTML = `
    <p><strong>Quizzes Completed:</strong> <span>${userData.totalQuizzesTaken || 0}</span></p>
    <p><strong>Overall Accuracy:</strong> <span>${userData.averageAccuracy !== undefined ? userData.averageAccuracy + '%' : '0.0%'}</span></p>
    
    <div style="margin-top: 12px; border-top: 1px dashed #cbd5e1; padding-top: 10px;">
      <p style="font-weight: 600; color: #1e293b; margin-bottom: 6px;">📊 Chapter Proficiency Rings (Click to Review)</p>
      ${chapterRingsHTML}
    </div>

    <button id="edit-profile-btn" class="action-btn" style="margin-top: 14px; background-color: #0ea5e9; padding: 8px 16px; font-size: 13px;">Edit Profile Details</button>
  `;
  profileCard.appendChild(extraInfoDiv);

  // Click listeners for chapter proficiency rings
  document.querySelectorAll('.chapter-ring-item').forEach(item => {
    item.addEventListener('click', () => {
      const chapterName = item.getAttribute('data-chapter');
      openProficiencyReviewModal(chapterName);
    });
  });

  const editBtn = document.getElementById('edit-profile-btn');
  const editModal = document.getElementById('edit-profile-modal');
  const nameInput = document.getElementById('edit-name-input');
  const roleInput = document.getElementById('edit-role-input');

  if (editBtn && editModal) {
    editBtn.addEventListener('click', () => {
      nameInput.value = `${userData.firstName || ""} ${userData.lastName || ""}`.trim();
      roleInput.value = userData.role || "Nursing Student";
      editModal.classList.remove('hidden');
    });
  }
}

function initProfileModalListeners() {
  const editModal = document.getElementById('edit-profile-modal');
  const closeBtn = document.getElementById('close-edit-modal-btn');
  const saveBtn = document.getElementById('save-profile-btn');
  const nameInput = document.getElementById('edit-name-input');
  const roleInput = document.getElementById('edit-role-input');

  if (!editModal) return;

  const closeModal = () => editModal.classList.add('hidden');
  closeBtn?.addEventListener('click', closeModal);

  saveBtn?.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return;

    const fullFullName = nameInput.value.trim();
    const parts = fullFullName.split(' ');
    const firstName = parts[0] || "Nursing";
    const lastName = parts.slice(1).join(' ') || "Student";
    const role = roleInput.value.trim() || "Nursing Student";

    try {
      await updateDoc(doc(db, "users", user.uid), {
        firstName,
        lastName,
        role
      });
      closeModal();
    } catch (err) {
      console.error("Error updating profile:", err);
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'index.html';
  });
}