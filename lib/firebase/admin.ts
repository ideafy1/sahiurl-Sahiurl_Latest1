import { cert, getApps, initializeApp, getApp, type App } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { getStorage } from "firebase-admin/storage"
import admin from "firebase-admin"
import type { Firestore } from "firebase-admin/firestore"

// Your service account credentials
const serviceAccount = {
  type: process.env.FIREBASE_ADMIN_TYPE,
  project_id: process.env.FIREBASE_ADMIN_PROJECT_ID,
  private_key_id: process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_ADMIN_CLIENT_ID,
  auth_uri: process.env.FIREBASE_ADMIN_AUTH_URI,
  token_uri: process.env.FIREBASE_ADMIN_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_ADMIN_AUTH_PROVIDER_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_ADMIN_CLIENT_CERT_URL
}

const firebaseAdminConfig = {
  credential: cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  }),
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
}

export function customInitApp() {
  if (getApps().length <= 0) {
    initializeApp(firebaseAdminConfig)
  }
}

let adminApp: App;
let adminFirestore: Firestore;

if (getApps().length === 0) {
  adminApp = initializeApp(firebaseAdminConfig);
  adminFirestore = getFirestore(adminApp);
  adminFirestore.settings({
    ignoreUndefinedProperties: true,
    preferRest: true,
    middleware: { 
      async next<T>(data: T): Promise<T> {
        try {
          return await data;
        } catch (error) {
          console.error('Firestore operation failed:', error);
          throw new Error('Database operation failed');
        }
      }
    }
  });
} else {
  adminApp = getApp();
  adminFirestore = getFirestore(adminApp);
}

const adminAuth = getAuth(adminApp)
const adminStorage = getStorage(adminApp)

export { adminAuth as auth, adminFirestore as firestore, adminStorage as storage }
export type { Firestore }

export { admin }

