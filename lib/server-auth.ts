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
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('Firebase token verification failed:', {
      message: errorMessage,
      stack: errorStack,
      tokenLength: token.length,
      hasProjectId: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
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














