const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function resetPortalCleanSlate() {
  console.log("🧹 Starting portal clean slate reset...");

  // 1. Delete all documents in the questions collection
  const questionsSnap = await db.collection('questions').get();
  if (questionsSnap.size > 0) {
    const questionBatch = db.batch();
    questionsSnap.docs.forEach(doc => {
      questionBatch.delete(doc.ref);
    });
    await questionBatch.commit();
    console.log(`✅ Deleted ${questionsSnap.size} questions from Firestore.`);
  } else {
    console.log("ℹ️ No questions found to delete.");
  }

  // 2. Reset proficiency stats and metrics for all users
  const usersSnap = await db.collection('users').get();
  if (usersSnap.size > 0) {
    const userBatch = db.batch();
    usersSnap.docs.forEach(doc => {
      userBatch.update(doc.ref, {
        chapterProgressMap: {},
        chapterStats: {},
        totalQuizzesTaken: 0,
        averageAccuracy: 0,
        missedQuestions: []
      });
    });
    await userBatch.commit();
    console.log(`✅ Reset proficiency stats and quiz metrics for ${usersSnap.size} user(s).`);
  } else {
    console.log("ℹ️ No user profiles found to reset.");
  }

  console.log("🎉 Clean slate achieved successfully!");
  process.exit(0);
}

resetPortalCleanSlate().catch(err => {
  console.error("❌ Error resetting portal:", err);
  process.exit(1);
});