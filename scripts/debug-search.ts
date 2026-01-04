
import { prisma } from '../lib/prisma'
import fs from 'fs'

async function testSearch(term: string) {
    console.log(`Testing search with term: "${term}"`)

    // Fetch a valid user ID first
    // Assuming first user is the one we want for basic test
    const user = await prisma.user.findFirst()
    if (!user) {
        console.error("No user found in DB")
        return
    }
    console.log("Using user:", user.id)

    const searchNumber = Number(term)
    const isNumber = !Number.isNaN(searchNumber)

    const safeOR: any[] = [
        { description: { contains: term } },
        { category: { name: { contains: term } } }
    ]

    if (isNumber) {
        safeOR.push({ amount: { equals: searchNumber } })
    }

    const where: any = {
        account: { ownerId: user.id },
        OR: safeOR
    }

    try {
        console.log("Executing query:", JSON.stringify(where, null, 2))
        const txs = await prisma.transaction.findMany({
            where,
            take: 5
        })
        console.log("Success! Found:", txs.length)
    } catch (e: any) {
        console.error("Prisma Error:", e)
        fs.writeFileSync('debug-error.log',
            JSON.stringify(e, null, 2) + '\n\n' +
            e.toString() + '\n\n' +
            (e.stack || 'No stack')
        )
    }
}

testSearch('basic')
