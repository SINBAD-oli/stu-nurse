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
  const parsedData = JSON.parse(rawData);
  
  let questions = [];
  if (Array.isArray(parsedData)) {
    questions = parsedData;
  } else if (parsedData.questions && Array.isArray(parsedData.questions)) {
    questions = parsedData.questions;
  } else if (typeof parsedData === 'object' && parsedData !== null) {
    questions = [parsedData];
  }

  if (questions.length === 0) {
    console.error("❌ Error: No questions found in questions.json or invalid format.");
    process.exit(1);
  }

  console.log(`🚀 Uploading ${questions.length} questions to Firestore...`);
  
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const normalizedChap = normalizeChapterName(q.chapter || "Matrix Test One");
    
    const chapMatch = normalizedChap.match(/\d+/);
    const chapSlug = chapMatch ? `ch${chapMatch[0]}` : normalizedChap.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const qNum = q.questionNumber || (i + 1);
    
    const docId = `${chapSlug}_q${qNum}`;

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
      columns: q.columns || [], 
      rows: q.rows || [],       
      // --- CRITICAL: Added BowTie fields so they are preserved ---
      actions: q.actions || [],
      conditions: q.conditions || [],
      exhibits: q.exhibits || [],
      parameters: q.parameters || [],
      // -----------------------------------------------------------
      correctAnswer: q.correctAnswer || "",
      rationale: q.rationale || ""
    });
  }

  console.log(`✅ Successfully uploaded ${questions.length} questions to Firestore!`);
  process.exit(0);
}

uploadQuestions().catch((err) => {
  console.error("❌ Error uploading questions:", err);
  process.exit(1);
});