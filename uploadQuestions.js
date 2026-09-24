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

function normalizeChapterName(name) {
  if (!name) return "General Practice";
  
  let cleaned = name
    .replace(/[:\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned
    .toLowerCase()
    .replace(/(^\w|\s\w)/g, m => m.toUpperCase());
}

async function uploadQuestions() {
  const rawData = fs.readFileSync("questions.json", "utf8");
  const questions = JSON.parse(rawData);

  console.log("🚀 Uploading new questions to Firestore using JSON metadata IDs...");
  
  for (const q of questions) {
    const normalizedChap = normalizeChapterName(q.chapter);
    
    // Extract chapter number directly from the chapter string (e.g., "Chapter 3: ...")
    const chapMatch = normalizedChap.match(/\d+/);
    const chapNum = chapMatch ? chapMatch[0] : "gen";
    const qNum = q.questionNumber || 0;
    
    // Construct clean, predictable ID using chapter and question numbers
    const docId = `ch${chapNum}_q${qNum}`;

    const docRef = db.collection("questions").doc(docId);
    await docRef.set({
      questionNumber: qNum,
      type: q.type || "MCQ",
      questionText: q.questionText || "",
      chapter: normalizedChap,
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

  console.log(`✅ Successfully uploaded ${questions.length} questions to Firestore with uniform titles and clean IDs!`);
  process.exit(0);
}

uploadQuestions().catch((err) => {
  console.error("❌ Error uploading questions:", err);
  process.exit(1);
});