import { prisma } from '@/lib/prisma'
import { autoCategorize } from '@/lib/auto-categorize'

async function verify() {
    console.log('Starting subcategory verification...')

    // 1. Setup: Get a user and a sub-category
    const user = await prisma.user.findFirst()
    if (!user) {
        console.error('No user found')
        return
    }

    // Find a category that has children
    const parentCategory = await prisma.category.findFirst({
        where: {
            userId: user.id,
            // We need a category that has children. 
            // We can't easily query "has children" in one go efficiently without relation filter on children > 0
            // but let's try to find one where parentId is not null -> that IS a subcategory
            parentId: { not: null }
        },
        include: { parent: true }
    })

    // If no subcategory exists, we can't test.
    let subCategory = parentCategory
    if (!subCategory) {
        console.log('No subcategory found. Creating one for test...')
        const parent = await prisma.category.findFirst({ where: { userId: user.id, parentId: null } })
        if (!parent) {
            console.error('No parent category found to create subcategory')
            return
        }
        subCategory = await prisma.category.create({
            data: {
                userId: user.id,
                name: 'Test SubCat ' + Date.now(),
                parentId: parent.id,
                emoji: '🧪'
            },
            include: { parent: true }
        })
    }

    console.log('Testing with SubCategory:', subCategory?.name, 'Parent:', subCategory?.parent?.name)

    // 2. Create a keyword for this subcategory
    const keywordText = 'SCNF_TEST_' + Date.now()
    console.log('Creating keyword:', keywordText)

    const keyword = await prisma.categoryKeyword.create({
        data: {
            categoryId: subCategory!.id,
            keyword: keywordText
        }
    })

    // 3. Test autoCategorize
    console.log('Testing autoCategorize...')
    const match = await autoCategorize('Payment to ' + keywordText, user.id)

    if (match && match.id === subCategory!.id) {
        console.log('SUCCESS: Auto-categorize matched subcategory correctly!')
        console.log('Matched ID:', match.id)
        console.log('Parent ID:', match.parentId)
    } else {
        console.error('FAILURE: Auto-categorize failed. Expected', subCategory!.id, 'Got', match)
    }

    // 5. Cleanup
    console.log('Cleaning up...')
    await prisma.categoryKeyword.delete({
        where: { id: keyword.id }
    })
}

verify()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
