import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { initTestBank } from './testBank.js';

const emailSpan = document.getElementById('user-email');
const roleSpan = document.getElementById('user-role');
const joinedSpan = document.getElementById('user-joined');
const logoutBtn = document.getElementById('logout-btn');

// Initialize test bank listeners immediately so they bind to buttons as soon as DOM loads
initTestBank();

// Ensure session persistence and auth checks
setPersistence(auth, browserLocalPersistence).then(() => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          emailSpan.textContent = data.email || user.email;
          roleSpan.textContent = data.role || "Nursing Student";
          if (data.createdAt) {
            const dateObj = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            joinedSpan.textContent = dateObj.toLocaleDateString();
          } else {
            joinedSpan.textContent = "Recently";
          }
        } else {
          emailSpan.textContent = user.email;
          roleSpan.textContent = "Nursing Student";
          joinedSpan.textContent = "N/A";
        }
      } catch (error) {
        console.error("Profile fetch error:", error);
      }
    } else {
      if (window.location.pathname.includes('portal.html')) {
        window.location.href = 'index.html';
      }
    }
  });
});

// Logout handler
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'index.html';
  });
}