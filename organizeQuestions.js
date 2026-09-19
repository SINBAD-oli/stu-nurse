const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function reorganizeByJsonNumber() {
  console.log("🔍 Fetching questions from Firestore...");
  const snapshot = await db.collection('questions').get();
  
  if (snapshot.empty) {
    console.log("No questions found.");
    return;
  }

  const batch = db.batch();

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const oldRef = docSnap.ref;

    // Extract chapter number (e.g., "Chapter 3" -> "3")
    const chapMatch = (data.chapter || data.normalizedChapter || "").match(/\d+/);
    const chapNum = chapMatch ? chapMatch[0] : "gen";

    // Pull the exact question number from the JSON field inside the document
    const qNum = data.questionNumber !== undefined ? data.questionNumber : 1;

    const newDocId = `ch${chapNum}_q${qNum}`;
    const newRef = db.collection('questions').doc(newDocId);

    batch.set(newRef, data);
    batch.delete(oldRef);
  });

  await batch.commit();
  console.log("Successfully reorganized documents using the JSON questionNumber field!");
}

reorganizeByJsonNumber().catch(err => {
  console.error("Error reorganizing documents:", err);
});