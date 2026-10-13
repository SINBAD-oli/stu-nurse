// ./js/quizScoring.js

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

function sanitizeForFirestore(obj) {
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = sanitizeForFirestore(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => (item && typeof item === 'object' ? sanitizeForFirestore(item) : item));
      } else {
        sanitized[key] = value;
      }
    }
  }
  return sanitized;
}

export async function saveQuizResultsToFirestore(sessionChapter, score, totalQuestions, sessionMissedQuestions, sessionChapterQuestions) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.error("❌ Save failed: No authenticated user found in auth.currentUser!");
    alert("Error: User session not detected. Please log back in.");
    return;
  }

  try {
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);
    
    let uData = userSnap.exists() ? userSnap.data() : {};
    const prevQuizzes = uData.totalQuizzesTaken || 0;
    let chapterProgressMap = uData.chapterProgressMap || {};
    let chapterStats = uData.chapterStats || {};
    let existingMissed = Array.isArray(uData.missedQuestions) ? uData.missedQuestions : [];

    const standardizedChapterKey = normalizeChapterName(sessionChapter);

    if (!chapterProgressMap[standardizedChapterKey]) {
      chapterProgressMap[standardizedChapterKey] = {};
    }

    if (sessionChapterQuestions) {
      const sessionQMap = sessionChapterQuestions[sessionChapter] || 
                          sessionChapterQuestions[standardizedChapterKey] || 
                          Object.values(sessionChapterQuestions)[0] || {};

      // Use raw question text as map key so unmastered filtering matches correctly
      for (const [qText, qDetails] of Object.entries(sessionQMap)) {
        chapterProgressMap[standardizedChapterKey][qText] = sanitizeForFirestore({
          ...qDetails,
          questionText: qText
        });
      }
    }

    let totalGlobalCorrect = 0;
    let totalGlobalQuestions = 0;

    for (const [chapKey, qMap] of Object.entries(chapterProgressMap)) {
      let chapCorrect = 0;
      let chapTotal = 0;
      for (const qItem of Object.values(qMap)) {
        chapTotal++;
        totalGlobalQuestions++;
        if (qItem.correct === true || qItem.score === 1) {
          chapCorrect++;
          totalGlobalCorrect++;
        }
      }
      chapterStats[chapKey] = {
        correct: chapCorrect,
        total: chapTotal
      };
    }

    const trueOverallAccuracy = totalGlobalQuestions > 0 
      ? Number(((totalGlobalCorrect / totalGlobalQuestions) * 100).toFixed(1)) 
      : 0.0;

    const newTotalQuizzes = prevQuizzes + 1;

    if (Array.isArray(sessionMissedQuestions)) {
      sessionMissedQuestions.forEach(m => {
        m.chapter = standardizedChapterKey;
        const cleanMissed = sanitizeForFirestore(m);
        if (!existingMissed.some(ex => ex && ex.questionText === cleanMissed.questionText)) {
          existingMissed.push(cleanMissed);
        }
      });
    }

    const payload = sanitizeForFirestore({
      totalQuizzesTaken: newTotalQuizzes,
      averageAccuracy: trueOverallAccuracy,
      chapterProgressMap: chapterProgressMap,
      chapterStats: chapterStats,
      missedQuestions: existingMissed
    });

    await updateDoc(userRef, payload);

    console.log("✅ Successfully saved quiz results with raw question keys for chapter:", standardizedChapterKey);
  } catch (err) {
    console.error("❌ Error updating scores in Firestore:", err);
  }
}

// --- NEW: Strict All-or-Nothing Bow Tie Scoring ---
export function evaluateBowTieAnswer(question, userSelections) {
  if (!userSelections) return { score: 0, maxScore: 5, isCorrect: false, rationale: question.rationale };

  const correctActionIndices = question.actions
    .map((a, idx) => a.isCorrect ? String(idx) : null)
    .filter(val => val !== null);

  const correctConditionIndex = question.conditions
    .findIndex(c => c.isCorrect);

  const correctParamIndices = question.parameters
    .map((p, idx) => p.isCorrect ? String(idx) : null)
    .filter(val => val !== null);

  const userActions = [String(userSelections.action1), String(userSelections.action2)];
  const userCondition = String(userSelections.condition);
  const userParams = [String(userSelections.param1), String(userSelections.param2)];

  // 1. Verify Actions (must select both correct actions and keep them distinct)
  const actionsMatch = userActions.length === 2 &&
    userActions.every(act => correctActionIndices.includes(act)) &&
    new Set(userActions).size === 2;

  // 2. Verify Condition (must select the 1 correct condition)
  const conditionMatch = userCondition === String(correctConditionIndex);

  // 3. Verify Parameters (must select both correct parameters and keep them distinct)
  const paramsMatch = userParams.length === 2 &&
    userParams.every(param => correctParamIndices.includes(param)) &&
    new Set(userParams).size === 2;

  // All-or-nothing evaluation
  const allCorrect = actionsMatch && conditionMatch && paramsMatch;

  const maxScore = 5;
  const earnedScore = allCorrect ? 5 : 0;

  return {
    score: earnedScore,
    maxScore: maxScore,
    isCorrect: allCorrect,
    correct: allCorrect,
    rationale: question.rationale || "Global rationale not provided."
  };
}