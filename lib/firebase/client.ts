import { getApp, getApps, initializeApp } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

if (!firebaseConfig.apiKey) {
  console.warn(
    'Firebase configuration is missing. Vérifiez les variables NEXT_PUBLIC_FIREBASE_… dans votre `.env`.',
  )
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const firebaseAuth = getAuth(app)
export const firestore = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()

export const emailSignIn = (email: string, password: string) =>
  signInWithEmailAndPassword(firebaseAuth, email, password)

export const emailSignUp = (email: string, password: string) =>
  createUserWithEmailAndPassword(firebaseAuth, email, password)

export const googleSignIn = () => signInWithPopup(firebaseAuth, googleProvider)
export const signOut = () => firebaseSignOut(firebaseAuth)







