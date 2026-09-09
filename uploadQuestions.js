import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

const serviceAccount = JSON.parse(
  fs.readFileSync(new URL("./serviceAccountKey.json", import.meta.url))
);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function uploadQuestions() {
  const rawData = fs.readFileSync("questions.json", "utf8");
  const questions = JSON.parse(rawData);

  console.log("🚀 Uploading new questions to Firestore (preserving existing ones)...");
  
  for (const q of questions) {
    const docRef = db.collection("questions").doc();
    await docRef.set({
      questionNumber: q.questionNumber || 0,
      type: q.type || "MCQ",
      questionText: q.questionText || "",
      chapter: q.chapter || "General Practice",
      objective: q.objective || "",
      page: q.page || 0,
      heading: q.heading || "",
      integratedProcesses: q.integratedProcesses || "",
      clientNeed: q.clientNeed || "",
      cognitiveLevel: q.cognitiveLevel || "",
      concept: q.concept || "",
      difficulty: q.difficulty || "Moderate",
      options: q.options || [],
      correctAnswer: q.correctAnswer || "",
      rationale: q.rationale || ""
    });
  }

  console.log(`✅ Successfully uploaded ${questions.length} new questions to Firestore!`);
  process.exit(0);
}

uploadQuestions().catch((err) => {
  console.error("❌ Error uploading questions:", err);
  process.exit(1);
});