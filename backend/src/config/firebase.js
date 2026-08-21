import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.FIREBASE_PROJECT_ID || 'hemo-link-a2802';

const app = getApps().length > 0 ? getApp() : initializeApp({ projectId });

console.log(`🔥 Firebase Admin SDK initialized for project: ${projectId}`);

export const firestore = getFirestore(app);
