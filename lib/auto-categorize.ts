import { prisma } from '@/lib/prisma'

export async function autoCategorize(description: string, userId: string) {
    if (!description) return null

    // Normaliser la description pour la recherche (minuscules)
    const normalizedDesc = description.toLowerCase()

    // Récupérer tous les mots-clés de l'utilisateur
    // Optimisation: on pourrait mettre en cache si nécessaire, mais pour l'instant une requête simple suffit
    // On récupère les keywords liés aux catégories de l'utilisateur
    const keywords = await (prisma as any).categoryKeyword.findMany({
        where: {
            category: {
                userId: userId
            }
        },
        include: {
            category: {
                include: {
                    parent: true
                }
            }
        }
    }) as any[]

    // Chercher une correspondance
    // On peut prioriser les mots-clés les plus longs pour éviter les faux positifs (ex: "Uber Eats" vs "Uber")
    const sortedKeywords = keywords.sort((a, b) => b.keyword.length - a.keyword.length)

    for (const kw of sortedKeywords) {
        if (normalizedDesc.includes(kw.keyword.toLowerCase())) {
            // Correspondance trouvée !
            // On retourne la structure attendue pour l'API (categoryId et eventuellement subCategory logic si besoin)
            // Mais ici on retourne juste l'ID de la catégorie trouvée (qui peut être une sous-catégorie)
            return {
                id: kw.category.id,
                name: kw.category.name,
                emoji: kw.category.emoji,
                parentId: kw.category.parentId, // Pour savoir si c'est une sous-catégorie
                parent: kw.category.parent // Pour l'affichage complet
            }
        }
    }

    return null
}

export async function autoCategorizeBatch(descriptions: string[], userId: string) {
    if (!descriptions || descriptions.length === 0) return []

    // Récupérer tous les mots-clés de l'utilisateur UNE SEULE FOIS
    const keywords = await (prisma as any).categoryKeyword.findMany({
        where: {
            category: {
                userId: userId
            }
        },
        include: {
            category: {
                include: {
                    parent: true
                }
            }
        }
    }) as any[]

    // Trier par longueur décroissante pour éviter les faux positifs
    const sortedKeywords = keywords.sort((a, b) => b.keyword.length - a.keyword.length)

    return descriptions.map(description => {
        if (!description) return null
        const normalizedDesc = description.toLowerCase()

        for (const kw of sortedKeywords) {
            if (normalizedDesc.includes(kw.keyword.toLowerCase())) {
                return {
                    id: kw.category.id,
                    name: kw.category.name,
                    emoji: kw.category.emoji,
                    parentId: kw.category.parentId,
                    parent: kw.category.parent
                }
            }
        }
        return null
    })
}
