const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const auth = getAuth();

async function migrateUsers() {
  try {
    const usersSnapshot = await db.collection('users').get();
    
    for (const docSnap of usersSnapshot.docs) {
      const uid = docSnap.id;
      const data = docSnap.data();

      if (uid.includes('@')) {
        console.log(`Skipping already migrated document: ${uid}`);
        continue;
      }

      try {
        const userRecord = await auth.getUser(uid);
        const email = userRecord.email;

        if (!email) {
          console.warn(`⚠️ No email found for UID: ${uid}`);
          continue;
        }

        await db.collection('users').doc(email).set({
          ...data,
          email: email
        });

        await db.collection('users').doc(uid).delete();
        console.log(`Successfully migrated user UID ${uid} -> ${email}`);
      } catch (authErr) {
        console.error(`Could not find Auth user for UID ${uid}:`, authErr.message);
      }
    }

    console.log('Migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrateUsers();