import { App, cert, initializeApp } from "firebase-admin/app";
import { Firestore, getFirestore } from "firebase-admin/firestore";

let app: App;
let db: Firestore;

export const initializeFirebase = (serviceAccountJson: string) => {
  try {
    const serviceAccount = JSON.parse(serviceAccountJson);

    // Initialize Firebase Admin with service account
    app = initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });

    // Initialize Firestore
    db = getFirestore(app);

    // Set Firestore settings
    db.settings({
      ignoreUndefinedProperties: true,
    });

    console.log("Firebase Admin initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
    throw error;
  }
};

export { app, db };
