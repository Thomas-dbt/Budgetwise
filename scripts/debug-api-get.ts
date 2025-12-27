import { prisma } from '@/lib/prisma'

async function debug() {
    console.log('Starting API query debug...')

    // 1. Get a user
    const user = await prisma.user.findFirst()
    if (!user) { console.error('No user'); return }
    console.log('User:', user.email)

    // 2. Find a category with keywords
    const keyword = await (prisma as any).categoryKeyword.findFirst({
        where: { category: { userId: user.id } },
        include: { category: true }
    }) as any

    if (!keyword) {
        console.log('No keywords found for this user. Creating one...')
        const category = await prisma.category.findFirst({ where: { userId: user.id } as any })
        if (!category) { console.error('No category'); return }

        await (prisma as any).categoryKeyword.create({
            data: {
                categoryId: category.id,
                keyword: 'DEBUG_KW_' + Date.now()
            }
        })
        console.log('Created debug keyword for category:', category.name)
    } else {
        console.log('Found existing keyword:', keyword.keyword, 'for category:', keyword.category.name)
    }

    // 3. Run the target query
    // We use the categoryId from the keyword we found/created
    const targetCategoryId = keyword ? keyword.categoryId : (await prisma.category.findFirst({ where: { userId: user.id } as any }))?.id

    if (!targetCategoryId) return

    console.log('Running target query for Category ID:', targetCategoryId)

    const categoryResult = await prisma.category.findFirst({
        where: {
            id: targetCategoryId,
            userId: user.id
        } as any,
        include: {
            keywords: true
        } as any
    }) as any

    console.log('Query Result:', JSON.stringify(categoryResult, null, 2))

    if (categoryResult && categoryResult.keywords && categoryResult.keywords.length > 0) {
        console.log('SUCCESS: Keywords returned.')
    } else {
        console.log('FAILURE: Keywords MISSING in result.')
    }
}

debug()
    .catch(e => console.error(e))
    .finally(async () => { await prisma.$disconnect() })
