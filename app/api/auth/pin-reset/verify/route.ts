import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const { email, code } = await req.json()

        if (!email || !code) {
            return NextResponse.json({ error: 'Email and code required' }, { status: 400 })
        }

        const user = await prisma.user.findUnique({
            where: { email },
        })

        if (!user) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
        }

        if (!user.pinResetToken || !user.pinResetTokenExpires) {
            return NextResponse.json({ error: 'No reset request found' }, { status: 400 })
        }

        if (user.pinResetToken !== code) {
            return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
        }

        if (new Date() > user.pinResetTokenExpires) {
            return NextResponse.json({ error: 'Code expired' }, { status: 400 })
        }

        // Clear the token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                pinResetToken: null,
                pinResetTokenExpires: null,
            },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error verifying PIN reset code:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
