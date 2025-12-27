
import { prisma } from '@/lib/prisma'
import { defaultCategories } from '@/lib/default-categories'

async function run() {
    const users = await prisma.user.findMany()
    if (users.length === 0) {
        console.error('No users found')
        return
    }
    console.log(`Found ${users.length} users. Starting migration...`)

    for (const user of users) {
        console.log(`Processing user: ${user.email} (${user.id})`)

        for (const defCat of defaultCategories) {
            // Find the main category for the user
            const userCat = await prisma.category.findFirst({
                where: {
                    userId: user.id,
                    name: defCat.name
                } as any,
                include: { children: true } as any
            }) as any

            if (!userCat) {
                console.log(`  User missing main category: ${defCat.name}. Skipping...`)
                continue
            }

            // ... (rest of logic handles subcategories and keywords)
            for (const defSub of defCat.subCategories) {
                // Find matching subcategory
                let userSub = userCat.children.find((c: any) => c.name === defSub.name)

                if (!userSub) {
                    console.log(`  - Subcategory missing: ${defSub.name}. Creating...`)
                    try {
                        userSub = await prisma.category.create({
                            data: {
                                userId: user.id,
                                name: defSub.name,
                                parentId: userCat.id,
                                emoji: defCat.emoji
                            } as any
                        })
                        console.log(`    + Created subcategory ${defSub.name}`)
                    } catch (e) {
                        console.error(`    x Failed to create subcategory: ${e}`)
                        continue
                    }
                }

                if (!defSub.keywords || defSub.keywords.length === 0) continue

                let addedCount = 0
                for (const kw of defSub.keywords) {
                    try {
                        await (prisma as any).categoryKeyword.create({
                            data: {
                                categoryId: userSub.id,
                                keyword: kw
                            }
                        })
                        addedCount++
                    } catch (e: any) {
                        if (e.code !== 'P2002') {
                            console.error(`Failed to add ${kw}: ${e.message}`)
                        }
                    }
                }
                if (addedCount > 0) {
                    console.log(`    + Added ${addedCount} keywords to ${defSub.name}`)
                }
            }
        }
        console.log(`Done with user ${user.email}\n---`)
    }
}

run()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
