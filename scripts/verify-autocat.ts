import { prisma } from '@/lib/prisma'
import { autoCategorize } from '@/lib/auto-categorize'

async function verify() {
    console.log('Starting verification...')

    // 1. Setup: Get a user and a category
    const user = await prisma.user.findFirst()
    if (!user) {
        console.error('No user found')
        return
    }
    console.log('User found:', user.email)

    const category = await prisma.category.findFirst({
        where: { userId: user.id } as any
    })
    if (!category) {
        console.error('No category found for user')
        return
    }
    console.log('Category found:', category.name)

    // 2. Create a keyword
    const keywordText = 'TEST_KEYWORD_' + Date.now()
    console.log('Creating keyword:', keywordText)

    const keyword = await (prisma as any).categoryKeyword.create({
        data: {
            categoryId: category.id,
            keyword: keywordText
        }
    })
    // Link to category... Schema: categoryId.
    // Oh wait, my create above might fail if I tried to put userId?
    // Checking Schema: CategoryKeyword { id, keyword, categoryId, createdAt }
    // Correct.

    // 3. Test autoCategorize
    console.log('Testing autoCategorize...')
    const match1 = await autoCategorize('Transaction with ' + keywordText, user.id)

    if (match1 && match1.id === category.id) {
        console.log('SUCCESS: Auto-categorize matched correctly!')
    } else {
        console.error('FAILURE: Auto-categorize failed. Expected', category.id, 'Got', match1)
    }

    // 4. Test partial match / case insensitivity
    const match2 = await autoCategorize('Some receipt for ' + keywordText.toLowerCase(), user.id)
    if (match2 && match2.id === category.id) {
        console.log('SUCCESS: Case insensitive match works!')
    } else {
        console.error('FAILURE: Case insensitive match failed.')
    }

    // 5. Cleanup
    console.log('Cleaning up...')
    await (prisma as any).categoryKeyword.delete({
        where: { id: keyword.id }
    })
    console.log('Cleanup done.')
}

verify()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
