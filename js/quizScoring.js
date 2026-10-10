import { db, auth } from './firebase-config.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export function normalizeChapterName(name) {
  if (!name) return "General Practice";
  return name
    .replace(/[:\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/(^\w|\s\w)/g, m => m.toUpperCase());
}

export async function saveQuizResultsToFirestore(sessionChapter, score, totalQuestions, sessionMissedQuestions, sessionChapterQuestions) {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  try {
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);
    
    let uData = userSnap.exists() ? userSnap.data() : {};
    const prevQuizzes = uData.totalQuizzesTaken || 0;
    const prevAvg = uData.averageAccuracy || 0;
    let chapterProgressMap = uData.chapterProgressMap || {};
    let chapterStats = uData.chapterStats || {};
    let existingMissed = uData.missedQuestions || [];

    const finalPercentage = ((score / totalQuestions) * 100).toFixed(1);
    const newTotalQuizzes = prevQuizzes + 1;
    const newAvgAccuracy = Number(((prevAvg * prevQuizzes + parseFloat(finalPercentage)) / newTotalQuizzes).toFixed(1));

    const standardizedChapterKey = normalizeChapterName(sessionChapter);

    if (!chapterProgressMap[standardizedChapterKey]) {
      chapterProgressMap[standardizedChapterKey] = {};
    }

    if (sessionChapterQuestions) {
      const sessionQMap = sessionChapterQuestions[sessionChapter] || 
                          sessionChapterQuestions[standardizedChapterKey] || 
                          Object.values(sessionChapterQuestions)[0] || {};

      for (const [qText, qDetails] of Object.entries(sessionQMap)) {
        chapterProgressMap[standardizedChapterKey][qText] = qDetails;
      }
    }

    let correctCount = 0;
    const allStoredQuestions = Object.values(chapterProgressMap[standardizedChapterKey]);
    allStoredQuestions.forEach(item => {
      if (item.correct === true) correctCount += 1;
    });

    chapterStats[standardizedChapterKey] = {
      correct: correctCount,
      total: allStoredQuestions.length
    };

    sessionMissedQuestions.forEach(m => {
      m.chapter = standardizedChapterKey;
      if (!existingMissed.some(ex => ex.questionText === m.questionText)) {
        existingMissed.push(m);
      }
    });

    await updateDoc(userRef, {
      totalQuizzesTaken: newTotalQuizzes,
      averageAccuracy: newAvgAccuracy,
      chapterProgressMap: chapterProgressMap,
      chapterStats: chapterStats,
      missedQuestions: existingMissed
    });

    console.log("Successfully saved and merged quiz results for:", standardizedChapterKey);
  } catch (err) {
    console.error("Error updating scores in Firestore:", err);
  }
}