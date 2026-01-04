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

  console.log('User upserted:', user.id)

  // Initialisation des catégories par défaut si l'utilisateur n'en a pas
  const categoriesCount = await prisma.category.count({
    where: { userId: user.id } as any
  })

  console.log('Categories count for user:', categoriesCount)

  // Check if we need to seed (either 0 or incomplete)
  // We do a lightweight check first, then import the heavy defaultCategories if needed
  if (categoriesCount < 15) { // Arbitrary threshold close to default length (16)
    console.log(`Seeding/Fixing categories (Current: ${categoriesCount})...`)
    try {
      const { defaultCategories } = await import('@/lib/default-categories')
      // If we have fewer categories than defaults, we likely need to seed/repair
      // Use upsert to be safe against existing ones

      for (const cat of defaultCategories) {
        try {
          // Upsert ensures we don't break existing, but create missing
          await prisma.category.upsert({
            where: {
              userId_name: {
                userId: user.id,
                name: cat.name
              }
            },
            update: {
              // Update emoji if needed, but safe to just touch nothing or emoji
              emoji: cat.emoji
            },
            create: {
              userId: user.id,
              name: cat.name,
              emoji: cat.emoji,
              children: {
                create: cat.subCategories.map((sub: any) => ({
                  name: sub.name,
                  userId: user.id,
                  keywords: {
                    create: (sub.keywords || []).map((k: string) => ({
                      keyword: k,
                      userId: user.id
                    }))
                  }
                }))
              }
            } as any
          })
        } catch (catError) {
          console.error(`Error seeding category ${cat.name}:`, catError)
        }
      }
      console.log('Default categories synced successfully')
    } catch (seedError) {
      console.error('Error seeding categories:', seedError)
    }
  }

  return user.id
}













