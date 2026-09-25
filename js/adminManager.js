import { db, auth } from './firebase-config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export async function checkAdminStatus() {
  const user = auth.currentUser;
  if (!user) return false;
  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      return !!userDoc.data().isAdmin;
    }
  } catch (err) {
    console.error("Error checking admin status:", err);
  }
  return false;
}

export async function getReleasedChapters() {
  try {
    const settingsDoc = await getDoc(doc(db, "settings", "portal"));
    if (settingsDoc.exists()) {
      return settingsDoc.data().releasedChapters || [];
    }
  } catch (err) {
    console.error("Error fetching released chapters:", err);
  }
  return [];
}

export async function toggleChapterRelease(chap, releasedChapters) {
  const currentlyReleased = releasedChapters.includes(chap);
  const updated = currentlyReleased 
    ? releasedChapters.filter(c => c !== chap)
    : [...releasedChapters, chap];

  try {
    await setDoc(doc(db, "settings", "portal"), {
      releasedChapters: updated
    }, { merge: true });
    return updated;
  } catch (err) {
    console.error("Error updating released chapters:", err);
    return releasedChapters;
  }
}