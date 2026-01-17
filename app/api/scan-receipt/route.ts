import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/server-auth'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

export async function POST(req: Request) {
    try {
        const userId = await getCurrentUserId()
        if (!userId) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        if (!GEMINI_API_KEY) {
            return new NextResponse('Server configuration error: Missing GEMINI_API_KEY', { status: 500 })
        }

        const { image, categories } = await req.json()
        if (!image) {
            return new NextResponse('Image required', { status: 400 })
        }

        // Image validation & processing
        const matches = image.match(/^data:([^;]*);base64,(.+)$/)
        if (!matches || matches.length < 3) {
            return new NextResponse('Invalid image format', { status: 400 })
        }
        let mimeType = matches[1] || 'image/jpeg'
        let base64Data = matches[2]

        // Check magic bytes for HEIC
        const headerBuffer = Buffer.from(base64Data.substring(0, 24), 'base64')
        const isHeicMagic = headerBuffer.toString('ascii').includes('ftypheIC') ||
            headerBuffer.toString('ascii').includes('ftypheic')

        // Handle HEIC conversion
        if (mimeType === 'image/heic' || mimeType === 'image/heif' || mimeType === 'application/octet-stream' || isHeicMagic) {
            try {
                const heicConvert = require('heic-convert')
                const inputBuffer = Buffer.from(base64Data, 'base64')
                const outputBuffer = await heicConvert({
                    buffer: inputBuffer,
                    format: 'JPEG',
                    quality: 0.8
                })
                base64Data = outputBuffer.toString('base64')
                mimeType = 'image/jpeg'
            } catch (err) {
                console.error('HEIC conversion failed:', err)
            }
        }

        const categoriesList = Array.isArray(categories) && categories.length > 0
            ? categories.join(', ')
            : 'Alimentation, Transport, Logement, Loisirs, Santé, Shopping, Abonnements, Énergie, Assurances, Voyages, Restaurant, Bar, Supermarché, Épargne & investissement, Autres'

        const promptText = `
      Analyze this receipt image and extract the following information in JSON format:
      - amount: number (total paid)
      - date: string (YYYY-MM-DD format). If the year is missing, assume the current year.
      - merchant: string (name of the store/merchant)
      - category: string (suggest the best matching category EXACTLY from this list: ${categoriesList})
      - description: string (a brief description of what was purchased)
      
      If you can't find a value, use null.
      Return ONLY the JSON object, no markdown formatting.
    `

        // Direct REST API Call
        const modelsToTry = [
            'gemini-2.5-flash',
            'gemini-2.0-flash',
            'gemini-flash-latest'
        ]

        let lastError = null
        let successData = null

        for (const model of modelsToTry) {
            try {
                // console.log(`Trying REST API with model: ${model}`)
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: promptText },
                                { inline_data: { mime_type: mimeType, data: base64Data } }
                            ]
                        }]
                    })
                })

                if (!response.ok) {
                    const errText = await response.text()
                    throw new Error(`API Error ${response.status}: ${errText}`)
                }

                const result = await response.json()
                const candidate = result.candidates?.[0]
                if (!candidate) throw new Error('No candidates returned')

                const text = candidate.content?.parts?.[0]?.text
                if (!text) throw new Error('No text in candidate')

                const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim()
                successData = JSON.parse(cleanedText)
                break // Success
            } catch (e: any) {
                console.warn(`REST Model ${model} failed:`, e.message)
                lastError = e
            }
        }

        if (successData) {
            return NextResponse.json(successData)
        }

        throw lastError || new Error('All REST attempts failed')

    } catch (error: any) {
        console.error('Scan error:', error)
        return new NextResponse(`Internal Error: ${error.message || String(error)}`, { status: 500 })
    }
}
