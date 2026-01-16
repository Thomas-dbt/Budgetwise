import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'

export async function POST(req: Request) {
    try {
        const userId = await getCurrentUserId()
        const { messages } = await req.json()
        const lastMessage = messages[messages.length - 1].content

        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) {
            return NextResponse.json(
                { error: 'Clé API Gemini non configurée.' },
                { status: 500 }
            )
        }

        // 1. Fetch Financial Context (Full History)
        const transactions = await prisma.transaction.findMany({
            where: {
                account: { ownerId: userId },
                type: { in: ['expense', 'income'] }
            },
            include: {
                category: true,
                account: true
            },
            orderBy: { date: 'desc' }
        })

        const accounts = await prisma.account.findMany({
            where: { ownerId: userId }
        })

        // 2. Aggregate Data
        const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0)

        // Group by month
        const monthlyData: Record<string, { income: number; expenses: number }> = {}
        // Group by category (expenses)
        const categoryData: Record<string, number> = {}

        let totalIncome = 0
        let totalExpenses = 0

        transactions.forEach(t => {
            const amount = Math.abs(Number(t.amount))
            if (t.type === 'income') totalIncome += amount
            if (t.type === 'expense') {
                totalExpenses += amount
                const cat = t.category?.name || 'Non catégorisé'
                categoryData[cat] = (categoryData[cat] || 0) + amount
            }

            const monthKey = new Date(t.date).toISOString().slice(0, 7)
            if (!monthlyData[monthKey]) monthlyData[monthKey] = { income: 0, expenses: 0 }

            if (t.type === 'income') monthlyData[monthKey].income += amount
            else monthlyData[monthKey].expenses += amount
        })

        const monthsCount = Object.keys(monthlyData).length || 1
        const avgMonthlyExpenses = totalExpenses / monthsCount
        const avgMonthlyIncome = totalIncome / monthsCount

        // 3. Construct System Prompt
        const systemPrompt = `Tu es un assistant financier personnel intelligent pour Budgetwise.
    
    DONNÉES FINANCIÈRES (HISTORIQUE COMPLET - ${monthsCount} mois):
    - Solde total actuel: ${totalBalance.toFixed(2)}€
    - Revenus totaux: ${totalIncome.toFixed(2)}€
    - Dépenses totales: ${totalExpenses.toFixed(2)}€
    - Dépense mensuelle moyenne: ${avgMonthlyExpenses.toFixed(2)}€
    - Revenu mensuel moyen: ${avgMonthlyIncome.toFixed(2)}€
    
    Top Dépenses par Catégorie:
    ${Object.entries(categoryData)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([k, v]) => `- ${k}: ${v.toFixed(2)}€`)
                .join('\n')}

    Évolution Mensuelle:
    ${Object.entries(monthlyData)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([k, v]) => `- ${k}: Rev ${v.income.toFixed(0)}, Dép ${v.expenses.toFixed(0)}`)
                .join('\n')}

    INSTRUCTIONS:
    - Réponds aux questions de l'utilisateur en utilisant ces données.
    - Sois précis, concis et bienveillant.
    - Si l'utilisateur demande une moyenne, utilise les données fournies.
    - Si tu ne peux pas répondre avec les données, dis-le honnêtement.
    - Ne mentionne pas que tu es une IA par Google, tu es l'assistant Budgetwise.
    - Format de réponse: Texte clair, markdown supporté (gras, listes).`

        const userPrompt = `${systemPrompt}\n\nHistorique de conversation:\n${messages.map((m: any) => `${m.role === 'user' ? 'Utilisateur' : 'Assistant'}: ${m.content}`).join('\n')}\n\nUtilisateur: ${lastMessage}\nAssistant:`

        // 4. Call Gemini API with Model Discovery
        let availableModel: { name: string; version: string } | null = null

        // Try v1beta models
        try {
            const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
            const listResponse = await fetch(listUrl)
            if (listResponse.ok) {
                const modelsData = await listResponse.json()
                const models = modelsData.models || []
                const preferredNames = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro', 'gemini-1.0-pro']
                for (const preferredName of preferredNames) {
                    const model = models.find((m: any) => m.name?.includes(preferredName) && m.supportedGenerationMethods?.includes('generateContent'))
                    if (model) {
                        availableModel = { name: model.name.split('/').pop() || preferredName, version: 'v1beta' }
                        break
                    }
                }
            }
        } catch (e) { console.warn('Model list failed:', e) }

        // Fallback defaults if discovery failed
        if (!availableModel) {
            availableModel = { name: 'gemini-1.5-flash', version: 'v1beta' }
        }

        const url = `https://generativelanguage.googleapis.com/${availableModel.version}/models/${availableModel.name}:generateContent?key=${apiKey}`

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: userPrompt }] }]
            })
        })

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}))
            console.error('Gemini error:', errData)
            // Check for common errors
            if (response.status === 429) {
                throw new Error("Quota API dépassé (429). Réessayez plus tard.")
            }
            throw new Error(errData.error?.message || `Erreur API Gemini (${response.status})`)
        }

        const data = await response.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Je n'ai pas pu générer de réponse."

        return NextResponse.json({ content: text })

    } catch (error: any) {
        console.error('Chat API error:', error)
        return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 })
    }
}
