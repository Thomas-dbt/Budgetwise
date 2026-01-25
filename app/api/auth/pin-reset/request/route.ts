import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPinResetEmail } from '@/lib/mailer'
import crypto from 'crypto'

export async function POST(req: Request) {
    try {
        const { email } = await req.json()

        if (!email) {
            return NextResponse.json({ error: 'Email required' }, { status: 400 })
        }

        const user = await prisma.user.findUnique({
            where: { email },
        })

        if (!user) {
            // Return success even if user not found to prevent enumeration
            // But for this personal app, maybe strict is better? 
            // Let's return success but log it.
            console.log(`PIN reset requested for non-existent email: ${email}`)
            return NextResponse.json({ success: true, message: 'If account exists, email sent' })
        }

        // Generate 6 digit code
        const resetCode = crypto.randomInt(100000, 999999).toString()

        // Set expiry to 15 minutes
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

        // Save to DB
        await prisma.user.update({
            where: { id: user.id },
            data: {
                pinResetToken: resetCode,
                pinResetTokenExpires: expiresAt,
            },
        })

        // Send email
        const emailResult = await sendPinResetEmail({
            to: email,
            resetCode,
            name: user.name || 'Utilisateur',
        })

        if (emailResult === 'failed') {
            return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error requesting PIN reset:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
