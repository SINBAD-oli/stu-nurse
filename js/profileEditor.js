import { db, auth } from './firebase-config.js';
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export function setupProfileEditor() {
  const openBtn = document.getElementById('open-edit-profile');
  const modal = document.getElementById('edit-profile-modal');
  const closeBtn = document.getElementById('close-edit-modal');
  const saveBtn = document.getElementById('save-profile-btn');
  const nameInput = document.getElementById('edit-name-input');
  const roleInput = document.getElementById('edit-role-input');

  if (!openBtn || !modal) return;

  openBtn.addEventListener('click', () => {
    nameInput.value = document.getElementById('user-fullname').textContent || '';
    roleInput.value = document.getElementById('user-role').textContent || '';
    modal.classList.remove('hidden');
  });

  const closeModal = () => modal.classList.add('hidden');
  closeBtn?.addEventListener('click', closeModal);

  saveBtn?.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return;

    const updatedName = nameInput.value.trim();
    const updatedRole = roleInput.value.trim();

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        name: updatedName,
        role: updatedRole
      });

      document.getElementById('user-fullname').textContent = updatedName;
      document.getElementById('user-role').textContent = updatedRole;
      closeModal();
    } catch (err) {
      console.error("Error updating profile details:", err);
    }
  });
}