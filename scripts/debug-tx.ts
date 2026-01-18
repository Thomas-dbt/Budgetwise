
import { prisma } from '@/lib/prisma'

async function main() {
    const tx = await prisma.transaction.findFirst({
        where: {
            id: {
                contains: 'cmkj'
            }
        },
        include: {
            splits: true,
            parent: true
        }
    })

    if (!tx) {
        console.log('Transaction NOT FOUND')
        return
    }

    console.log('--- TRANSACTION INFO ---')
    console.log('ID:', tx.id)
    console.log('Amount:', tx.amount)
    console.log('HasSplits:', tx.hasSplits)
    console.log('ParentId:', tx.parentId)
    console.log('Splits Count:', tx.splits.length)
    console.log('Is Parent?', tx.parentId === null)
    console.log('Is Child?', tx.parentId !== null)
    console.log('------------------------')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
