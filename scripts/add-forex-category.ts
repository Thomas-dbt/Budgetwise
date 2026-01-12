import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const user = await prisma.user.findFirst() // Assumes single user/dev env for now or first user
    if (!user) {
        console.error('No user found')
        process.exit(1)
    }

    const investCat = await prisma.category.findFirst({
        where: {
            userId: user.id,
            name: 'Investissement'
        }
    })

    if (!investCat) {
        console.error('Category "Investissement" not found')
        process.exit(1)
    }

    const subName = 'Forex / Métaux'
    const keywords = ['Forex', 'Trading', 'CFD', 'Or', 'Argent', 'Gold', 'Silver', 'XAU', 'XAG', 'Metaux', 'Metal', 'Bullion']

    const existing = await prisma.category.findFirst({
        where: {
            userId: user.id,
            parentId: investCat.id,
            name: subName
        }
    })

    if (existing) {
        console.log(`Subcategory "${subName}" already exists.`)
    } else {
        const sub = await prisma.category.create({
            data: {
                userId: user.id,
                name: subName,
                parentId: investCat.id
            }
        })

        // Add keywords
        for (const k of keywords) {
            await prisma.categoryKeyword.create({
                data: {
                    userId: user.id,
                    keyword: k,
                    categoryId: sub.id,
                    matchType: 'contains'
                }
            })
        }
        console.log(`Created subcategory "${subName}" with keywords.`)
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
