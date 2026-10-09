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

    if (sessionChapterQuestions) {
      for (const [chap, qMap] of Object.entries(sessionChapterQuestions)) {
        if (!chapterProgressMap[chap]) chapterProgressMap[chap] = {};
        for (const [qText, qDetails] of Object.entries(qMap)) {
          chapterProgressMap[chap][qText] = qDetails;
        }
        
        let correctCount = 0;
        const questionEntries = Object.values(chapterProgressMap[chap]);
        questionEntries.forEach(item => {
          if (item.correct) correctCount += 1;
        });
        chapterStats[chap] = {
          correct: correctCount,
          total: questionEntries.length
        };
      }
    }

    sessionMissedQuestions.forEach(m => {
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
    console.log("Quiz progress successfully saved to Firestore!");
  } catch (err) {
    console.error("Error updating scores:", err);
  }
}