
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const updates = [
    {
        name: 'Épargne',
        icon: 'PiggyBank',
        subCategories: [
            { name: 'Livrets', icon: 'Book' },
            { name: 'Cagnotte', icon: 'Coins' }
        ]
    },
    {
        name: 'Investissement',
        icon: 'TrendingUp',
        subCategories: [
            { name: 'Assurance vie', icon: 'Shield' },
            { name: 'Bourse', icon: 'LineChart' },
            { name: 'Crypto', icon: 'Bitcoin' },
            { name: 'Forex / Métaux', icon: 'Gem' },
            { name: 'Immobilier', icon: 'Building' },
            { name: 'Autres placements', icon: 'PieChart' }
        ]
    }
]

async function main() {
    console.log('Starting icon update...')

    for (const cat of updates) {
        console.log(`Updating category: ${cat.name} -> ${cat.icon}`)

        // Update parent categories
        await prisma.category.updateMany({
            where: { name: cat.name },
            data: { icon: cat.icon }
        })

        // Update subcategories
        for (const sub of cat.subCategories) {
            console.log(`  Updating subcategory: ${sub.name} -> ${sub.icon}`)

            // Find parent categories first to scope the subcategory update (optional but safer)
            // But since subcategory names are unique enough or we want to update all of them:
            await prisma.category.updateMany({
                where: {
                    name: sub.name,
                    parent: {
                        name: cat.name
                    }
                },
                data: { icon: sub.icon }
            })
        }
    }
    console.log('Update finished.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
