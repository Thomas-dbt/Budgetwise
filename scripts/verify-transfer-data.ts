
import { prisma } from '../lib/prisma'

async function main() {
    const accounts = await prisma.account.findMany()
    console.log('Available accounts:', accounts.map(a => `${a.name} (${a.id})`).join(', '))

    // Pick the one that looks like "Compte Courant"
    const account = accounts.find(a => a.name.includes('Courant')) || accounts[0]
    if (!account) return

    console.log(`\nFocusing on: ${account.name} (${account.id})`)

    const txs = await prisma.transaction.findMany({
        where: {
            type: 'transfer',
            OR: [
                { accountId: account.id },
                { toAccountId: account.id }
            ]
        },
        take: 5,
        orderBy: { date: 'desc' },
        include: {
            account: true,
            toAccount: true
        }
    })

    console.log(`Found ${txs.length} transfers`)

    for (const tx of txs) {
        console.log('--- Transfer ---')
        console.log(`ID: ${tx.id}`)
        console.log(`Raw Amount: ${tx.amount}`)
        console.log(`From: ${tx.account.name} (${tx.accountId})`)
        console.log(`To: ${tx.toAccount?.name} (${tx.toAccountId})`)
        const isIncoming = tx.toAccountId === account.id
        console.log(`Is Incoming for ${account.name}? ${isIncoming}`)
        console.log(`Computed Sign: ${isIncoming ? '+' : '-'}`)
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
