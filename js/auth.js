import { auth } from './firebase-config.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

// Grab DOM elements from index.html
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const errorMsg = document.getElementById('error-message');

// Handle Sign Up
if (signupBtn) {
  signupBtn.addEventListener('click', () => {
    createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value)
      .then((userCredential) => {
        alert("Account created successfully! Welcome " + userCredential.user.email);
        errorMsg.classList.add('hidden');
        // Redirect to your student portal after successful signup
        window.location.href = 'portal.html';
      })
      .catch((error) => {
        errorMsg.textContent = error.message;
        errorMsg.classList.remove('hidden');
      });
  });
}

// Handle Log In
if (loginBtn) {
  loginBtn.addEventListener('click', () => {
    signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value)
      .then((userCredential) => {
        alert("Logged in successfully!");
        errorMsg.classList.add('hidden');
        // Redirect to your student portal after successful login
        window.location.href = 'portal.html';
      })
      .catch((error) => {
        errorMsg.textContent = "Invalid email or password.";
        errorMsg.classList.remove('hidden');
      });
  });
}