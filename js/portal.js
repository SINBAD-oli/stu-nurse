import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { doc, onSnapshot, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { initTestBank } from './testBank.js';

const fullNameSpan = document.getElementById('user-fullname');
const roleSpan = document.getElementById('user-role');
const joinedSpan = document.getElementById('user-joined');
const logoutBtn = document.getElementById('logout-btn');

initTestBank();

setPersistence(auth, browserLocalPersistence).then(() => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const docRef = doc(db, "users", user.uid);
        
        onSnapshot(docRef, async (docSnap) => {
          if (!docSnap.exists()) {
            const initialUserData = {
              firstName: "Nursing",
              lastName: "Student",
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
  const missedQuestions = userData.missedQuestions || [];
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
        <div class="chapter-ring-item" data-chapter="${chap}" style="display: flex; flex-direction: column; align-items: center; width: 90px; text-align: center; cursor: pointer;" title="Click to review missed questions for ${chap}">
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

  // Add Click listeners to each circle graph item
  document.querySelectorAll('.chapter-ring-item').forEach(item => {
    item.addEventListener('click', () => {
      const chapterName = item.getAttribute('data-chapter');
      const chapMissed = missedQuestions.filter(q => q.chapter === chapterName);
      showMissedReviewModal(chapterName, chapMissed);
    });
  });

  const editBtn = document.getElementById('edit-profile-btn');
  if (editBtn) {
    editBtn.addEventListener('click', async () => {
      const newFirst = prompt("First Name:", userData.firstName || "Nursing");
      const newLast = prompt("Last Name:", userData.lastName || "Student");
      const newRole = prompt("Role:", userData.role || "Nursing Student");
      
      if (newFirst !== null && newLast !== null) {
        await updateDoc(doc(db, "users", userId), { 
          firstName: newFirst.trim(), 
          lastName: newLast.trim(),
          role: newRole ? newRole.trim() : userData.role 
        });
      }
    });
  }
}

function showMissedReviewModal(chapterName, missedList) {
  let modal = document.getElementById('missed-review-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'missed-review-modal';
    modal.className = 'quiz-modal';
    document.body.appendChild(modal);
  }

  let contentHTML = `
    <div class="quiz-modal-content" style="max-width: 650px; max-height: 80vh; overflow-y: auto;">
      <div class="quiz-header-bar">
        <span style="font-weight: 700; color: #b91c1c;">Review Area: ${chapterName}</span>
        <button id="close-missed-modal" class="close-btn">&times;</button>
      </div>
  `;

  if (missedList.length === 0) {
    contentHTML += `<p style="padding: 20px; text-align: center; color: #10b981; font-weight: 600;">🌟 Outstanding! You have no recorded missed questions for this chapter.</p>`;
  } else {
    contentHTML += `<p style="font-size: 13px; color: #64748b; margin-bottom: 12px;">Here are the concepts and questions you need to review:</p><div style="display: flex; flex-direction: column; gap: 12px;">`;
    missedList.forEach((q, idx) => {
      contentHTML += `
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; font-size: 13px;">
          <p style="font-weight: 700; color: #991b1b; margin-bottom: 4px;">Question #${idx + 1}: ${q.questionText}</p>
          <div style="display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0;">
            <span style="background: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-size: 11px;">Concept: ${q.concept}</span>
            <span style="background: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 4px; font-size: 11px;">Client Need: ${q.clientNeed}</span>
            <span style="background: #f3e8ff; color: #6b21a8; padding: 2px 6px; border-radius: 4px; font-size: 11px;">Cognitive: ${q.cognitiveLevel}</span>
          </div>
          ${q.rationales ? `<p style="margin-top: 6px; color: #334155; font-style: italic;"><strong>Rationale:</strong> ${q.rationales}</p>` : ''}
        </div>
      `;
    });
    contentHTML += `</div>`;
  }

  contentHTML += `</div>`;
  modal.innerHTML = contentHTML;
  modal.classList.remove('hidden');

  document.getElementById('close-missed-modal').addEventListener('click', () => {
    modal.classList.add('hidden');
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'index.html';
  });
}