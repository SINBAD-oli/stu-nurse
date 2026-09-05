/* STREAMING_CHUNK:Importing Firebase Admin SDK */
const admin = require("firebase-admin");

// 1. Download your service account private key JSON from Firebase Console 
// (Project Settings -> Service Accounts -> Generate new private key)
// Place it in your project root as 'serviceAccountKey.json'
const serviceAccount = require("./serviceAccountKey.json");

/* STREAMING_CHUNK:Initializing Firebase Admin */
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 2. Import your questions JSON file
const questionsData = require("./questions.json"); // Make sure your JSON file is saved as questions.json

/* STREAMING_CHUNK:Defining upload function */
async function uploadQuestions() {
  console.log("Starting upload of nursing questions to Firestore...");

  try {
    const batch = db.batch(); // Use a batch write for efficiency

    questionsData.forEach((q, index) => {
      // Use questionNumber or an auto-generated ID for each document
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