
import { prisma } from '../lib/prisma'

async function main() {
    const userCount = await prisma.user.count()
    const accountCount = await prisma.account.count()
    const transactionCount = await prisma.transaction.count()
    const categoryCount = await prisma.category.count()

    console.log(`Users: ${userCount}`)
    console.log(`Accounts: ${accountCount}`)
    console.log(`Transactions: ${transactionCount}`)
    console.log(`Categories: ${categoryCount}`)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
