
import { PrismaClient } from '@prisma/client'
import { defaultCategories } from '../lib/default-categories'

const prisma = new PrismaClient()

async function main() {
    console.log('Starting migration...')
    try {
        const users = await prisma.user.findMany({ select: { id: true, email: true } })
        console.log(`Found ${users.length} users.`)

        for (const user of users) {
            console.log(`Processing user: ${user.email}`)
            let createdCats = 0
            let createdSubs = 0

            for (const defCat of defaultCategories) {
                console.log(`  Processing category: ${defCat.name}`)
                let category = await prisma.category.findFirst({
                    where: {
                        userId: user.id,
                        name: defCat.name
                    }
                })

                if (!category) {
                    category = await prisma.category.create({
                        data: {
                            userId: user.id,
                            name: defCat.name,
                            emoji: defCat.emoji,
                            isSystem: true
                        }
                    })
                    createdCats++
                } else if (category.emoji !== defCat.emoji) {
                    await prisma.category.update({
                        where: { id: category.id },
                        data: { emoji: defCat.emoji }
                    })
                }

                if (defCat.subCategories) {
                    for (const defSub of defCat.subCategories) {
                        const sub = await prisma.category.findFirst({
                            where: {
                                userId: user.id,
                                parentId: category.id,
                                name: defSub.name
                            }
                        })

                        if (!sub) {
                            await prisma.category.create({
                                data: {
                                    userId: user.id,
                                    parentId: category.id,
                                    name: defSub.name,
                                    isSystem: true
                                }
                            })
                            createdSubs++
                        }
                    }
                }
            }
            console.log(`  - Created ${createdCats} categories and ${createdSubs} subcategories.`)
        }
        console.log('Migration complete.')
    } catch (error) {
        console.error('Migration failed:', error)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

main()
