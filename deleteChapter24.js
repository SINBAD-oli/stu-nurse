import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

const serviceAccount = JSON.parse(
  fs.readFileSync(new URL("./serviceAccountKey.json", import.meta.url))
);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function inspectAndDelete() {
  try {
    console.log("Inspecting documents in 'questions' collection...");
    const snapshot = await db.collection("questions").get();

    if (snapshot.empty) {
      console.log("No documents found in 'questions' collection.");
      return;
    }

    let deletedCount = 0;
    const batch = db.batch();

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const chapField = data.chapter || data.heading || "";
      
      // Match variants of Chapter 24 or Nutrition
      if (
        chapField.toLowerCase().includes("chapter 24") || 
        chapField.toLowerCase().includes("nutrition")
      ) {
        console.log(`Deleting document ID ${docSnap.id} with chapter: "${chapField}"`);
        batch.delete(docSnap.ref);
        deletedCount++;
      }
    });

    if (deletedCount > 0) {
      await batch.commit();
      console.log(`Successfully deleted ${deletedCount} questions matching Chapter 24 / Nutrition.`);
    } else {
      console.log("Could not find any documents with 'Chapter 24' or 'Nutrition'. Listing existing chapters found in database:");
      const uniqueChapters = new Set();
      snapshot.docs.forEach(d => {
        const dData = d.data();
        if (dData.chapter) uniqueChapters.add(dData.chapter);
        if (dData.heading) uniqueChapters.add(dData.heading);
      });
      console.log(Array.from(uniqueChapters));
    }
  } catch (err) {
    console.error("Error running script:", err);
  }
}

inspectAndDelete();