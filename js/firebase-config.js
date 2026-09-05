import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCrDUU0bsxz8UjkgMP0Xy8uV1o5FZC_llg",
  authDomain: "stu-nurse-backend.firebaseapp.com",
  projectId: "stu-nurse-backend",
  storageBucket: "stu-nurse-backend.firebasestorage.app",
  messagingSenderId: "500117493405",
  appId: "1:500117493405:web:4cbef5fca6c9afd459e674",
  measurementId: "G-X91BJ84ZJR"
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Export them so other JS files can import them easily
export { auth, db };