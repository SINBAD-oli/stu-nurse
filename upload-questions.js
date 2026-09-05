const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const serviceAccount = require("./serviceAccountKey.json");
const questionsRaw = require("./questions.json");

// Automatically handles whether your JSON is a single question object or an array
const questionsData = Array.isArray(questionsRaw) ? questionsRaw : [questionsRaw];

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function uploadQuestions() {
  console.log("Starting upload of nursing questions to Firestore...");

  try {
    const batch = db.batch();

    questionsData.forEach((q, index) => {
      const docRef = db.collection("questions").doc(`q_${q.questionNumber || index + 1}`);
      batch.set(docRef, q);
    });

    await batch.commit();
    console.log(`Successfully uploaded ${questionsData.length} questions to Firestore!`);
  } catch (error) {
    console.error("Error uploading questions:", error);
  }
}

uploadQuestions();