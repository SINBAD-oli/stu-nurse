import { auth, db } from './firebase-config.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const errorMsg = document.getElementById('error-message');

if (signupBtn) {
  signupBtn.addEventListener('click', async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
      const user = userCredential.user;
      
      // Save initial profile document in Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        createdAt: new Date(),
        role: "Nursing Student"
      });

      errorMsg.classList.add('hidden');
      window.location.href = 'portal.html';
    } catch (error) {
      errorMsg.textContent = error.message;
      errorMsg.classList.remove('hidden');
    }
  });
}

if (loginBtn) {
  loginBtn.addEventListener('click', async () => {
    try {
      await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
      errorMsg.classList.add('hidden');
      window.location.href = 'portal.html';
    } catch (error) {
      errorMsg.textContent = "Invalid email or password.";
      errorMsg.classList.remove('hidden');
    }
  });
}