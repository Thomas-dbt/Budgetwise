
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const categories = await prisma.category.findMany({
        where: {
            name: { in: ['Investissement', 'Épargne'] }
        },
        include: {
            subCategories: true
        }
    })

    console.log('Categories found:', categories.length)
    categories.forEach(cat => {
        console.log(`Category: ${cat.name}, Icon: ${cat.icon}, Emoji: ${cat.emoji}`)
        cat.subCategories.forEach(sub => {
            console.log(`  SubCategory: ${sub.name}, Icon: ${sub.icon}`)
        })
    })
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
