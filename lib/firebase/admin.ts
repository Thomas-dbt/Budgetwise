import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

// Use client project ID if admin project ID is not set
const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

const serviceAccount = {
  projectId,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
}

// For development: allow using client project ID without admin credentials
// This will work for token verification but not for admin operations
const hasCredentials =
  !!serviceAccount.projectId && !!serviceAccount.clientEmail && !!serviceAccount.privateKey

const hasProjectIdOnly = !!serviceAccount.projectId && !hasCredentials

if (!hasCredentials) {
  if (hasProjectIdOnly) {
    console.warn(
      'Firebase Admin credentials missing (FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY).',
      'Using project ID only. Token verification may fail.',
    )
  } else {
    console.warn(
      'Firebase Admin project ID missing. Les routes sécurisées refuseront les requêtes.',
    )
  }
}

const adminApp =
  getApps().length > 0
    ? getApp()
    : hasCredentials
    ? initializeApp({
        credential: cert(serviceAccount as any),
        projectId: serviceAccount.projectId,
      })
    : hasProjectIdOnly
    ? initializeApp({
        projectId: serviceAccount.projectId,
      })
    : initializeApp()

export const adminAuth = getAuth(adminApp)
