import { initializeApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, setDoc, updateDoc, arrayUnion, Firestore } from 'firebase/firestore';
import { PatientProfile, SymptomLog, Medication, UploadedFile, MedicalRecord } from '../types';

// Configuration should be loaded from environment variables
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

let db: Firestore | null = null;
let isInitialized = false;

// Initialize Firebase only if config is present
try {
  if (process.env.FIREBASE_API_KEY) {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    isInitialized = true;
    console.log("Firebase initialized successfully");
  } else {
    console.warn("Firebase API_KEY not found. Running in offline/mock mode.");
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
}

export const isFirebaseReady = () => isInitialized;

/**
 * Subscribes to a patient's document in Firestore.
 * Creates the document with default data if it doesn't exist.
 */
export const syncPatientData = (
  userId: string, 
  onData: (data: any) => void,
  initialData: any
) => {
  if (!db) return () => {};

  const docRef = doc(db, "patients", userId);

  const unsubscribe = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      onData(docSnap.data());
    } else {
      // Initialize document if it doesn't exist
      setDoc(docRef, {
        profile: initialData.profile,
        medications: initialData.medications,
        symptoms: initialData.symptoms,
        history: initialData.history,
        reports: [] 
      }, { merge: true });
    }
  }, (error) => {
    console.error("Firebase Sync Error:", error);
  });

  return unsubscribe;
};

export const updatePatientProfile = async (userId: string, profile: PatientProfile) => {
  if (!db) return;
  const docRef = doc(db, "patients", userId);
  await updateDoc(docRef, { profile });
};

export const addPatientSymptom = async (userId: string, symptom: SymptomLog) => {
  if (!db) return;
  const docRef = doc(db, "patients", userId);
  await updateDoc(docRef, {
    symptoms: arrayUnion(symptom)
  });
};

export const addPatientReport = async (userId: string, file: UploadedFile) => {
  if (!db) return;
  const docRef = doc(db, "patients", userId);
  
  // Note: Storing base64 images in Firestore is not recommended for production due to 1MB limit.
  // Ideally, use Firebase Storage. For this demo, we'll try to store it, but strip large data if needed.
  
  const safeFile = { ...file };
  
  // Simple check to prevent exceeding document limits (rough estimate)
  if ((safeFile.previewUrl?.length || 0) > 800000) {
    safeFile.previewUrl = ""; // clear heavy data
    safeFile.processedUrl = "";
    console.warn("Image too large for Firestore, stripping visual data for metadata storage.");
  }

  await updateDoc(docRef, {
    reports: arrayUnion(safeFile)
  });
};

export const updatePatientMedications = async (userId: string, medications: Medication[]) => {
  if (!db) return;
  const docRef = doc(db, "patients", userId);
  await updateDoc(docRef, { medications });
};