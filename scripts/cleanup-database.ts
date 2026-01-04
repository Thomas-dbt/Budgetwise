
export { }
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const keepEmail = 'thomas.deb41@gmail.com'
    console.log(`Starting cleanup. Keeping user: ${keepEmail}`)

    const targetUser = await prisma.user.findUnique({
        where: { email: keepEmail }
    })

    if (!targetUser) {
        console.error(`ERROR: User ${keepEmail} NOT found in database. Aborting to prevent full data loss.`)
        // List available emails to help debugging
        const allUsers = await prisma.user.findMany({ select: { email: true } })
        console.log('Available users:', allUsers.map(u => u.email))
        return
    }

    console.log(`Found target user ID: ${targetUser.id}`)

    const usersToDelete = await prisma.user.findMany({
        where: {
            id: { not: targetUser.id }
        },
        select: { id: true, email: true }
    })

    if (usersToDelete.length === 0) {
        console.log('No other users to delete.')
        return
    }

    const userIds = usersToDelete.map(u => u.id)
    console.log(`Deleting ${userIds.length} users:`, usersToDelete.map(u => u.email).join(', '))

    // 1. Delete Transactions (linked to Accounts)
    console.log('Deleting Transactions...')
    await prisma.transaction.deleteMany({
        where: {
            account: {
                ownerId: { in: userIds }
            }
        }
    })

    // 2. Delete AccountShares
    console.log('Deleting AccountShares...')
    await prisma.accountShare.deleteMany({
        where: {
            OR: [
                { userId: { in: userIds } }, // Stores shares received by these users
                { account: { ownerId: { in: userIds } } } // Shares of accounts owned by these users
            ]
        }
    })

    // 3. Delete Accounts
    console.log('Deleting Accounts...')
    await prisma.account.deleteMany({
        where: { ownerId: { in: userIds } }
    })

    // 4. Delete InvestmentAssets 
    // (Check if they have manual relation or cascade, assuming manual for safety)
    console.log('Deleting InvestmentAssets...')
    await prisma.investmentAsset.deleteMany({
        where: { userId: { in: userIds } }
    })

    // 5. Delete CalendarEvents
    console.log('Deleting CalendarEvents...')
    await prisma.calendarEvent.deleteMany({
        where: { userId: { in: userIds } }
    })

    // 6. Delete Categories, Budgets, RealEstate, etc. 
    // These usually cascade from User, but let's delete User now, which should trigger cascades for the rest.
    console.log('Deleting Users (and cascading data)...')
    await prisma.user.deleteMany({
        where: { id: { in: userIds } }
    })

    console.log('Cleanup complete successfully.')
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
