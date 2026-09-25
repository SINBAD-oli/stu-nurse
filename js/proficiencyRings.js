import { db, auth } from './firebase-config.js';
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export async function openProficiencyReviewModal(chapterName) {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  try {
    const [userSnap, querySnapshot] = await Promise.all([
      getDoc(doc(db, "users", currentUser.uid)),
      getDocs(collection(db, "questions"))
    ]);

    if (!userSnap.exists()) return;

    const userData = userSnap.data();
    const progressMap = userData.chapterProgressMap || {};
    const chapterProgress = progressMap[chapterName] || {};
    
    const allQuestions = [];
    querySnapshot.forEach(docSnap => {
      allQuestions.push(docSnap.data());
    });

    const answeredQuestionTexts = Object.keys(chapterProgress);
    const chapterQuestions = allQuestions.filter(q => answeredQuestionTexts.includes(q.questionText));

    if (chapterQuestions.length === 0) {
      alert("No answered questions found for this chapter yet!");
      return;
    }

    let modal = document.getElementById('proficiency-review-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'proficiency-review-modal';
      modal.style.cssText = `
        position: fixed; inset: 0; background: rgba(15, 23, 42, 0.85); 
        display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px; box-sizing: border-box;
      `;
      document.body.appendChild(modal);
    }

    let contentHtml = `
      <div style="background: #1e293b; color: #f8fafc; width: 100%; max-width: 750px; max-height: 85vh; border-radius: 12px; display: flex; flex-direction: column; border: 1px solid #334155; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); box-sizing: border-box; overflow: hidden;">
        <div style="padding: 16px 20px; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; background: #0f172a;">
          <h3 style="margin: 0; font-size: 18px; color: #f8fafc;">📖 Proficiency Review: ${chapterName}</h3>
          <button id="close-proficiency-modal" style="background: none; border: none; color: #94a3b8; font-size: 24px; cursor: pointer; padding: 0 6px;">&times;</button>
        </div>
        <div style="padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; box-sizing: border-box; flex: 1;">
    `;

    chapterQuestions.forEach((q, idx) => {
      const qProgress = chapterProgress[q.questionText] || {};
      const isCorrect = qProgress.correct === true;
      const isPartial = qProgress.score > 0 && qProgress.score < 1;
      
      let cardBorderColor = '#10b981';
      let badgeText = '✅ Correct';
      let badgeBg = 'rgba(16, 185, 129, 0.15)';
      let badgeColor = '#34d399';

      if (!isCorrect && !isPartial) {
        cardBorderColor = '#f87171';
        badgeText = '❌ Incorrect';
        badgeBg = 'rgba(248, 113, 113, 0.15)';
        badgeColor = '#f87171';
      } else if (isPartial) {
        cardBorderColor = '#fbbf24';
        badgeText = '⚠️ Partially Correct';
        badgeBg = 'rgba(251, 191, 36, 0.15)';
        badgeColor = '#fbbf24';
      }

      contentHtml += `
        <div style="border: 2px solid ${cardBorderColor}; border-radius: 8px; background: #0f172a; box-sizing: border-box;">
          <div class="proficiency-card-header" style="padding: 14px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; background: rgba(30, 41, 59, 0.4); border-radius: 6px 6px 0 0;">
            <div style="display: flex; align-items: center; gap: 10px; flex: 1; padding-right: 10px;">
              <span style="background: ${badgeBg}; color: ${badgeColor}; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; white-space: nowrap;">${badgeText}</span>
              <span style="color: #f8fafc; font-size: 14px; font-weight: 600; line-height: 1.4;">Q${idx + 1}: ${q.questionText}</span>
            </div>
            <span style="font-size: 12px; color: #94a3b8; white-space: nowrap; background: rgba(15, 23, 42, 0.6); padding: 4px 8px; border-radius: 4px; border: 1px solid #334155;">▼ Rationale</span>
          </div>
          <div class="proficiency-card-body" style="padding: 16px; display: none; border-top: 1px solid #334155; box-sizing: border-box; background: rgba(15, 23, 42, 0.3);">
            <div style="display: flex; flex-direction: column; gap: 10px;">
      `;

      const optionsList = q.options || [];
      optionsList.forEach((opt, oIdx) => {
        const isOptCorrect = opt.isCorrect === true || (oIdx + 1) === q.correctAnswerIndex;
        
        let optBorder = '#334155';
        let optBg = 'rgba(30, 41, 59, 0.5)';

        if (isOptCorrect) {
          optBorder = '#10b981';
          optBg = 'rgba(16, 185, 129, 0.08)';
        } else if (!isCorrect && !isOptCorrect) {
          optBorder = '#f87171';
          optBg = 'rgba(248, 113, 113, 0.05)';
        }

        contentHtml += `
          <div style="padding: 10px 14px; border-radius: 6px; border: 1px solid ${optBorder}; background: ${optBg}; font-size: 14px; box-sizing: border-box;">
            <span style="color: #e2e8f0; line-height: 1.4; display: block;">${opt.text}</span>
            ${opt.rationale ? `<div style="font-size: 12px; color: #cbd5e1; font-style: italic; margin-top: 6px; border-left: 2px solid ${optBorder}; padding-left: 10px; line-height: 1.4;">Rationale: ${opt.rationale}</div>` : ''}
          </div>
        `;
      });

      contentHtml += `
            </div>
          </div>
        </div>
      `;
    });

    contentHtml += `
        </div>
      </div>
    `;

    modal.innerHTML = contentHtml;
    modal.classList.remove('hidden');

    modal.querySelectorAll('.proficiency-card-header').forEach(header => {
      header.addEventListener('click', () => {
        const body = header.nextElementSibling;
        body.style.display = body.style.display === 'block' ? 'none' : 'block';
      });
    });

    document.getElementById('close-proficiency-modal').addEventListener('click', () => {
      modal.classList.add('hidden');
    });

  } catch (err) {
    console.error("Error loading proficiency review:", err);
  }
}