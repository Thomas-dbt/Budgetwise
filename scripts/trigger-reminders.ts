import 'dotenv/config'

async function triggerReminders() {
    const secret = process.env.CRON_SECRET
    const port = process.env.PORT || 3000
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`

    if (!secret) {
        console.error('Error: CRON_SECRET is not defined in .env')
        process.exit(1)
    }

    const url = `${baseUrl}/api/cron/reminders?key=${secret}`
    console.log(`Triggering reminders at ${url}...`)

    try {
        const response = await fetch(url)

        if (!response.ok) {
            const text = await response.text()
            throw new Error(`HTTP error! status: ${response.status} - ${text}`)
        }

        const data = await response.json()
        console.log('Success:', JSON.stringify(data, null, 2))
    } catch (error) {
        console.error('Error triggering reminders:', error)
        process.exit(1)
    }
}

triggerReminders()
