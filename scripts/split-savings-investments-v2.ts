export { }
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Starting migration V2: Splitting Savings & Investments...')

    // 1. Find the old parent category "Investissements & Épargne"
    const oldParent = await prisma.category.findFirst({
        where: { name: 'Investissements & Épargne', parentId: null }
    })

    if (!oldParent) {
        console.log('Category "Investissements & Épargne" not found. Maybe already renamed?')
        // Try to find "Épargne" just to see if we need to do the moving part only
        const epargneParent = await prisma.category.findFirst({ where: { name: 'Épargne', parentId: null } })
        if (!epargneParent) {
            console.log('Neither old nor new parent found. Aborting.')
            return
        }
        console.log('Found "Épargne" parent (already renamed?), proceeding to check moves...')
        // Proceed with epargneParent as oldParent for moving logic
        await moveChildren(epargneParent.id, epargneParent.userId)
        return
    }

    console.log('Found old parent:', oldParent.id)

    // 2. Rename old parent to "Épargne" and change emoji
    console.log('Renaming old parent to "Épargne"...')
    await prisma.category.update({
        where: { id: oldParent.id },
        data: {
            name: 'Épargne',
            emoji: '🐷'
        }
    })

    await moveChildren(oldParent.id, oldParent.userId)
    console.log('Migration complete!')
}

async function moveChildren(parentId: string, userId: string | null) {
    // 3. Create the new "Investissement" parent category if not exists
    let investParent = await prisma.category.findFirst({
        where: { name: 'Investissement', parentId: null }
    })

    if (!investParent) {
        console.log('Creating new "Investissement" category...')
        investParent = await prisma.category.create({
            data: {
                name: 'Investissement',
                emoji: '📈',
                userId: userId,
            }
        })
    }

    // 4. Move specific subcategories to "Investissement"
    const subCatsToMove = ['Bourse', 'Crypto', 'Assurance vie', 'Autres placements', 'Immobilier']

    const childrenToMove = await prisma.category.findMany({
        where: {
            parentId: parentId,
            name: { in: subCatsToMove }
        }
    })

    for (const child of childrenToMove) {
        console.log(`Moving subcategory "${child.name}" to "Investissement"...`)
        await prisma.category.update({
            where: { id: child.id },
            data: { parentId: investParent.id }
        })
    }

    // 5. Create "Immobilier" if it doesn't exist at all
    // Check if we just moved it
    const immoMoved = childrenToMove.find(c => c.name === 'Immobilier')

    if (!immoMoved) {
        const existingImmo = await prisma.category.findFirst({
            where: {
                parentId: investParent.id,
                name: 'Immobilier'
            }
        })

        if (!existingImmo) {
            console.log('Creating "Immobilier" subcategory...')
            // Only create if we have a valid userId, otherwise it might fail constraint
            if (userId) {
                await prisma.category.create({
                    data: {
                        name: 'Immobilier',
                        parentId: investParent.id,
                        userId: userId
                    }
                })
            } else {
                console.log('Skipping Immobilier creation: No UserId available')
            }
        }
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
