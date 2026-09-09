import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

const serviceAccount = JSON.parse(
  fs.readFileSync(new URL("./serviceAccountKey.json", import.meta.url))
);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function resetUserStats() {
  const usersSnapshot = await db.collection("users").get();
  
  for (const docSnap of usersSnapshot.docs) {
    await docSnap.ref.update({
      totalQuizzesTaken: 0,
      averageAccuracy: 0,
      chapterStats: {},
      missedQuestions: []
    });
  }
  console.log("✅ Successfully reset all user stats and proficiency rings!");
  process.exit(0);
}

resetUserStats();