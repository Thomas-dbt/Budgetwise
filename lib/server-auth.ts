import { headers } from 'next/headers'
import { adminAuth } from '@/lib/firebase/admin'
import { prisma } from '@/lib/prisma'

export async function getCurrentUserId() {
  const authorization = headers().get('authorization')
  if (!authorization || !authorization.startsWith('Bearer ')) {
    throw new Error('UNAUTHORIZED')
  }

  const token = authorization.replace('Bearer ', '').trim()

  let decoded
  try {
    decoded = await adminAuth.verifyIdToken(token)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    // Detailed error logging
    console.error('Firebase Admin Token Verification Failed:', {
      error: errorMessage,
      tokenPreview: token.substring(0, 10) + '...',
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      hasClientEmail: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
      privateKeyLength: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.length
    })
    throw new Error('UNAUTHORIZED')
  }

  const firebaseUid = decoded.uid
  const email = decoded.email

  if (!firebaseUid) {
    throw new Error('UNAUTHORIZED')
  }

  const user = await prisma.user.upsert({
    where: email ? { email } : { firebaseUid },
    update: {
      firebaseUid,
      email: email ?? undefined,
      name: decoded.name ?? undefined,
    },
    create: {
      email: email ?? `${firebaseUid}@firebase.local`,
      passwordHash: '',
      name: decoded.name ?? null,
      firebaseUid,
    },
  })

  return user.id
}














