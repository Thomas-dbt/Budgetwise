
import { PrismaClient } from '@prisma/client'
import { defaultCategories } from '../lib/default-categories'

const prisma = new PrismaClient()

async function main() {
    console.log('Starting category migration...')

    // Get all users
    const users = await prisma.user.findMany()
    console.log(`Found ${users.length} users to update.`)

    for (const user of users) {
        console.log(`Processing user: ${user.email} (${user.id})`)

        for (const catDef of defaultCategories) {
            // 1. Handle Parent Category
            // Search by name globally for this user because names must be unique
            let parent = await prisma.category.findFirst({
                where: {
                    userId: user.id,
                    name: catDef.name
                }
            })

            if (!parent) {
                console.log(`  Creating parent category: ${catDef.name}`)
                parent = await prisma.category.create({
                    data: {
                        userId: user.id,
                        name: catDef.name,
                        emoji: catDef.emoji,
                        isSystem: false,
                        parentId: null
                    }
                })
            } else {
                // Ensure it is a root category (parentId should be null)
                // And update emoji
                const needsUpdate = parent.parentId !== null || parent.emoji !== catDef.emoji
                if (needsUpdate) {
                    await prisma.category.update({
                        where: { id: parent.id },
                        data: {
                            emoji: catDef.emoji,
                            parentId: null
                        }
                    })
                }
            }

            // 2. Process subcategories
            for (const subDef of catDef.subCategories) {
                let sub = await prisma.category.findFirst({
                    where: {
                        userId: user.id,
                        name: subDef.name
                    }
                })

                if (!sub) {
                    console.log(`    Creating subcategory: ${subDef.name}`)
                    sub = await prisma.category.create({
                        data: {
                            userId: user.id,
                            name: subDef.name,
                            parentId: parent.id,
                            isSystem: false
                        }
                    })
                } else {
                    // Ensure it is attached to the correct parent
                    if (sub.parentId !== parent.id) {
                        console.log(`    Moving subcategory ${subDef.name} to parent ${catDef.name}`)
                        await prisma.category.update({
                            where: { id: sub.id },
                            data: { parentId: parent.id }
                        })
                    }
                }

                // 3. Process keywords (upsert them)
                if (subDef.keywords && subDef.keywords.length > 0) {
                    for (const keyword of subDef.keywords) {
                        try {
                            await prisma.categoryKeyword.upsert({
                                where: {
                                    categoryId_keyword: {
                                        categoryId: sub.id,
                                        keyword: keyword
                                    }
                                },
                                update: {}, // Do nothing if exists
                                create: {
                                    categoryId: sub.id,
                                    keyword: keyword
                                }
                            })
                        } catch (e) {
                            // Ignore unique constraint errors
                        }
                    }
                }
            }
        }
    }

    // CLEANUP PHASE
    // Now that creation/update is done, we remove categories not in default-categories
    console.log('Starting cleanup phase...')

    const validParentNames = defaultCategories.map(c => c.name)

    for (const user of users) {
        // 1. Get all categories for this user
        // We fetch them freshly to be sure
        const allCategories = await prisma.category.findMany({
            where: { userId: user.id },
            include: { parent: true }
        })

        const toDeleteIds: string[] = []

        for (const cat of allCategories) {
            // Case A: Root category
            if (!cat.parentId) {
                if (!validParentNames.includes(cat.name)) {
                    console.log(`  Marking obsolete parent for deletion: ${cat.name}`)
                    toDeleteIds.push(cat.id)
                }
            }
            // Case B: Subcategory
            else {
                // If parent is valid, check if sub is valid
                const parentDef = defaultCategories.find(c => c.name === cat.parent?.name)
                // If parentDef exists (meaning parent is valid), check sub name
                if (parentDef) {
                    const isValidSub = parentDef.subCategories.some(s => s.name === cat.name)
                    if (!isValidSub) {
                        console.log(`  Marking obsolete subcategory for deletion: ${cat.name} (Parent: ${cat.parent?.name})`)
                        toDeleteIds.push(cat.id)
                    }
                } else {
                    // If parent is presumably invalid, we already marked parent for deletion.
                }
            }
        }

        if (toDeleteIds.length > 0) {
            console.log(`  Deleting ${toDeleteIds.length} categories for user ${user.email}...`)

            // 1. Unlink transactions (Set categoryId = null)
            await prisma.transaction.updateMany({
                where: { categoryId: { in: toDeleteIds } },
                data: { categoryId: null }
            })

            // 2. Unlink budgets (Delete budgets? or set null?)
            // Budgets have OnDelete Cascade in schema, so they will be auto-deleted.

            await prisma.category.deleteMany({
                where: { id: { in: toDeleteIds } }
            })
        }
    }

    console.log('Migration and cleanup completed.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
