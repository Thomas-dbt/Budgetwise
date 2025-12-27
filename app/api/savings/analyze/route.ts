import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const { period = '3months' } = await req.json()

    // Vérifier que la clé API Gemini est configurée
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Clé API Gemini non configurée. Veuillez ajouter GEMINI_API_KEY dans votre fichier .env' },
        { status: 500 }
      )
    }

    // Calculer la date de début selon la période
    const now = new Date()
    const startDate = new Date()
    switch (period) {
      case '1month':
        startDate.setMonth(now.getMonth() - 1)
        break
      case '3months':
        startDate.setMonth(now.getMonth() - 3)
        break
      case '6months':
        startDate.setMonth(now.getMonth() - 6)
        break
      case '1year':
        startDate.setFullYear(now.getFullYear() - 1)
        break
      default:
        startDate.setMonth(now.getMonth() - 3)
    }

    // Récupérer les transactions de l'utilisateur
    const transactions = await prisma.transaction.findMany({
      where: {
        account: { ownerId: userId },
        date: { gte: startDate },
        type: { in: ['expense', 'income'] }
      },
      include: {
        category: true,
        account: true
      },
      orderBy: { date: 'desc' }
    })

    // Récupérer les comptes pour le contexte
    const accounts = await prisma.account.findMany({
      where: { ownerId: userId }
    })

    // Calculer les statistiques de base
    const expenses = transactions.filter(t => t.type === 'expense')
    const incomes = transactions.filter(t => t.type === 'income')
    
    const totalExpenses = expenses.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)
    const totalIncome = incomes.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)
    const savings = totalIncome - totalExpenses
    const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0

    // Grouper par catégorie
    const expensesByCategory: Record<string, number> = {}
    expenses.forEach(t => {
      const categoryName = t.category?.name || 'Non catégorisé'
      expensesByCategory[categoryName] = (expensesByCategory[categoryName] || 0) + Math.abs(Number(t.amount))
    })

    // Top 5 catégories de dépenses
    const topCategories = Object.entries(expensesByCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount }))

    // Évolution mensuelle
    const monthlyData: Record<string, { income: number; expenses: number }> = {}
    transactions.forEach(t => {
      const monthKey = new Date(t.date).toISOString().slice(0, 7) // YYYY-MM
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expenses: 0 }
      }
      if (t.type === 'income') {
        monthlyData[monthKey].income += Math.abs(Number(t.amount))
      } else {
        monthlyData[monthKey].expenses += Math.abs(Number(t.amount))
      }
    })

    // Préparer les données pour l'IA
    const analysisData = {
      period,
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      savings: Math.round(savings * 100) / 100,
      savingsRate: Math.round(savingsRate * 100) / 100,
      topCategories,
      monthlyEvolution: Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({
          month,
          income: Math.round(data.income * 100) / 100,
          expenses: Math.round(data.expenses * 100) / 100
        })),
      totalAccounts: accounts.length,
      totalBalance: accounts.reduce((sum, acc) => sum + Number(acc.balance), 0)
    }

    // Créer le prompt pour l'analyse
    const prompt = `Tu es un expert en gestion financière personnelle. Analyse les données financières suivantes et fournis une analyse détaillée avec des conseils personnalisés.

Données financières:
- Période analysée: ${period}
- Revenus totaux: ${analysisData.totalIncome}€
- Dépenses totales: ${analysisData.totalExpenses}€
- Épargne: ${analysisData.savings}€
- Taux d'épargne: ${analysisData.savingsRate}%
- Top 5 catégories de dépenses:
${topCategories.map((cat, i) => `  ${i + 1}. ${cat.name}: ${cat.amount}€`).join('\n')}
- Évolution mensuelle:
${analysisData.monthlyEvolution.map(m => `  ${m.month}: Revenus ${m.income}€, Dépenses ${m.expenses}€`).join('\n')}

Fournis une analyse structurée en JSON avec les champs suivants:
{
  "summary": "Résumé général de la situation financière en 2-3 phrases",
  "strengths": ["Point fort 1", "Point fort 2", ...],
  "concerns": ["Point d'attention 1", "Point d'attention 2", ...],
  "recommendations": [
    {
      "title": "Titre de la recommandation",
      "description": "Description détaillée",
      "priority": "high|medium|low",
      "category": "Catégorie concernée"
    }
  ],
  "insights": [
    {
      "title": "Titre de l'insight",
      "description": "Description de l'insight",
      "impact": "positive|negative|neutral"
    }
  ],
  "budgetTips": [
    "Conseil pratique 1",
    "Conseil pratique 2",
    ...
  ]
}

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`

    try {
      // D'abord, lister les modèles disponibles pour trouver ceux qui supportent generateContent
      let availableModel: { name: string; version: string } | null = null
      
      // Essayer v1beta d'abord
      try {
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        const listResponse = await fetch(listUrl)
        
        if (listResponse.ok) {
          const modelsData = await listResponse.json()
          const models = modelsData.models || []
          
          // Chercher un modèle qui supporte generateContent
          const preferredNames = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro', 'gemini-1.0-pro']
          for (const preferredName of preferredNames) {
            const model = models.find((m: any) => {
              const modelName = m.name?.split('/').pop() || ''
              return modelName.includes(preferredName) && 
                     m.supportedGenerationMethods?.includes('generateContent')
            })
            if (model) {
              availableModel = { 
                name: model.name.split('/').pop() || preferredName, 
                version: 'v1beta' 
              }
              break
            }
          }
        }
      } catch (e) {
        console.log('Erreur lors de la liste des modèles v1beta:', e)
      }
      
      // Si aucun modèle trouvé dans v1beta, essayer v1
      if (!availableModel) {
        try {
          const listUrl = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
          const listResponse = await fetch(listUrl)
          
          if (listResponse.ok) {
            const modelsData = await listResponse.json()
            const models = modelsData.models || []
            
            const preferredNames = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro', 'gemini-1.0-pro']
            for (const preferredName of preferredNames) {
              const model = models.find((m: any) => {
                const modelName = m.name?.split('/').pop() || ''
                return modelName.includes(preferredName) && 
                       m.supportedGenerationMethods?.includes('generateContent')
              })
              if (model) {
                availableModel = { 
                  name: model.name.split('/').pop() || preferredName, 
                  version: 'v1' 
                }
                break
              }
            }
          }
        } catch (e) {
          console.log('Erreur lors de la liste des modèles v1:', e)
        }
      }
      
      // Si toujours aucun modèle trouvé, essayer directement avec les modèles par défaut
      if (!availableModel) {
        // Essayer dans l'ordre de préférence
        const fallbackModels = [
          { name: 'gemini-1.5-flash', version: 'v1beta' },
          { name: 'gemini-1.5-pro', version: 'v1beta' },
          { name: 'gemini-pro', version: 'v1beta' },
        ]
        
        for (const modelConfig of fallbackModels) {
          try {
            const testUrl = `https://generativelanguage.googleapis.com/${modelConfig.version}/models/${modelConfig.name}:generateContent?key=${apiKey}`
            const testResponse = await fetch(testUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: 'test' }] }] })
            })
            
            if (testResponse.ok || testResponse.status === 400) {
              // 400 peut signifier que le modèle existe mais la requête est invalide (ce qui est OK pour notre test)
              availableModel = modelConfig
              break
            }
          } catch (e) {
            continue
          }
        }
      }
      
      if (!availableModel) {
        throw new Error('Aucun modèle Gemini disponible trouvé. Vérifiez votre clé API.')
      }
      
      // Utiliser le modèle trouvé
      const apiUrl = `https://generativelanguage.googleapis.com/${availableModel.version}/models/${availableModel.name}:generateContent?key=${apiKey}`
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
        
        // Détecter les erreurs de quota spécifiquement
        if (response.status === 429 || errorData.error?.code === 429 || 
            errorData.error?.status === 'RESOURCE_EXHAUSTED' ||
            JSON.stringify(errorData).includes('quota') ||
            JSON.stringify(errorData).includes('RESOURCE_EXHAUSTED')) {
          
          // Extraire les détails du quota depuis la réponse Gemini
          let quotaDetails = null
          let retryDelaySeconds = null
          
          if (errorData.error?.message) {
            const message = errorData.error.message
            
            // Extraire le temps d'attente si disponible
            const retryMatch = message.match(/Please retry in ([\d.]+)s/i)
            const retryDelay = retryMatch ? retryMatch[1] : null
            retryDelaySeconds = retryDelay ? Math.ceil(parseFloat(retryDelay)) : null
            
            // Extraire les métriques de quota dépassées
            const quotaMetrics = []
            const quotaRegex = /Quota exceeded for metric: ([^,\n]+)/g
            let match
            while ((match = quotaRegex.exec(message)) !== null) {
              quotaMetrics.push(match[1].trim())
            }
            
            quotaDetails = {
              retryDelay,
              quotaMetrics: quotaMetrics.length > 0 ? quotaMetrics : null,
              fullMessage: message
            }
          }
          
          // Si un délai de retry est spécifié et qu'on n'a pas encore retenté, attendre et réessayer
          if (retryDelaySeconds && retryDelaySeconds > 0 && retryDelaySeconds < 60) {
            // Attendre le délai spécifié
            await new Promise(resolve => setTimeout(resolve, retryDelaySeconds * 1000))
            
            // Réessayer une seule fois
            const retryResponse = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contents: [{
                  parts: [{
                    text: prompt
                  }]
                }]
              })
            })
            
            if (retryResponse.ok) {
              // Le retry a réussi, continuer avec le traitement normal
              const data = await retryResponse.json()
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text
              
              if (!text) {
                throw new Error('Aucune réponse générée par l\'IA')
              }

              // Extraire le JSON de la réponse
              let jsonText = text.trim()
              jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

              let analysis
              try {
                analysis = JSON.parse(jsonText)
              } catch (parseError) {
                const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
                if (jsonMatch) {
                  analysis = JSON.parse(jsonMatch[0])
                } else {
                  throw new Error('Impossible de parser la réponse de l\'IA')
                }
              }

              return NextResponse.json({
                analysis,
                statistics: analysisData
              })
            } else {
              // Le retry a aussi échoué, retourner l'erreur avec les détails
              const retryErrorData = await retryResponse.json().catch(() => ({ error: 'Erreur inconnue' }))
              throw new Error(JSON.stringify({ 
                type: 'QUOTA_EXCEEDED',
                details: quotaDetails || retryErrorData
              }))
            }
          } else {
            // Pas de retry possible ou délai trop long, retourner l'erreur
            throw new Error(JSON.stringify({ 
              type: 'QUOTA_EXCEEDED',
              details: quotaDetails || errorData
            }))
          }
        }
        
        throw new Error(`Erreur API Gemini: ${response.status}`)
      }

      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      
      if (!text) {
        throw new Error('Aucune réponse générée par l\'IA')
      }

      // Extraire le JSON de la réponse
      let jsonText = text.trim()
      // Enlever les markdown code blocks si présents
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

      let analysis
      try {
        analysis = JSON.parse(jsonText)
      } catch (parseError) {
        // Si le parsing échoue, essayer d'extraire le JSON manuellement
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('Impossible de parser la réponse de l\'IA')
        }
      }

      return NextResponse.json({
        analysis,
        statistics: analysisData
      })
    } catch (aiError: any) {
      console.error('Gemini API error:', aiError)
      
      // Si c'est une erreur de quota avec détails
      try {
        const parsedError = JSON.parse(aiError.message)
        if (parsedError.type === 'QUOTA_EXCEEDED') {
          return NextResponse.json(
            { 
              error: 'QUOTA_EXCEEDED',
              quotaDetails: parsedError.details
            },
            { status: 429 }
          )
        }
      } catch {
        // Pas un JSON, continuer avec la détection normale
      }
      
      // Détection normale des erreurs de quota
      if (aiError.message === 'QUOTA_EXCEEDED' || 
          aiError.message.includes('429') ||
          aiError.message.includes('quota') ||
          aiError.message.includes('RESOURCE_EXHAUSTED')) {
        return NextResponse.json(
          { error: 'QUOTA_EXCEEDED' },
          { status: 429 }
        )
      }
      
      // Pour les autres erreurs, renvoyer un message simplifié
      const errorMessage = aiError.message.includes('GEMINI_API_KEY') 
        ? 'API_KEY_MISSING'
        : aiError.message.length > 100
        ? 'Erreur lors de l\'analyse IA'
        : aiError.message
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Savings analyze error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: error?.message || 'Impossible d\'effectuer l\'analyse' },
      { status }
    )
  }
}

