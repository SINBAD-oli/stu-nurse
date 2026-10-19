const admin = require('firebase-admin');
const serviceAccount = require('./path-to-your-service-account-key.json'); // Download from Firebase Console -> Project Settings -> Service Accounts

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function migrateUsers() {
  try {
    const usersSnapshot = await db.collection('users').get();
    
    for (const docSnap of usersSnapshot.docs) {
      const uid = docSnap.id;
      const data = docSnap.data();

      // Skip if the document ID is already an email format
      if (uid.includes('@')) {
        console.log(`Skipping already migrated document: ${uid}`);
        continue;
      }

      try {
        // Fetch user record from Firebase Auth to get their exact email
        const userRecord = await auth.getUser(uid);
        const email = userRecord.email;

        if (!email) {
          console.warn(`⚠️ No email found for UID: ${uid}`);
          continue;
        }

        // Create new document with email as the ID
        await db.collection('users').doc(email).set({
          ...data,
          email: email
        });

        // Delete the old UID-keyed document
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