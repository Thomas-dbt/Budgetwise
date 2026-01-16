import { prisma } from '@/lib/prisma'

export async function autoCategorize(description: string, userId: string, importedCategory?: string) {
    if (!description && !importedCategory) return null

    // Normaliser la description pour la recherche (minuscules)
    const normalizedDesc = description ? description.toLowerCase() : ''
    const normalizedimportedCategory = importedCategory ? importedCategory.toLowerCase() : ''

    // Récupérer les catégories et mots-clés
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

    // 1. PRIORITÉ : Si la catégorie importée correspond EXACTEMENT au nom d'une catégorie existante
    if (normalizedimportedCategory) {
        // On cherche parmi les catégories liées aux keywords (optimisation, sinon il faudrait fetch toutes les cats)
        // Note: Cela suppose que la catégorie a au moins un mot-clé ou qu'on fetch tout. 
        // Pour être sûr, on devrait peut-être fetcher toutes les catégories si on veut supporter le match par nom sans keyword.
        // Mais pour l'instant, on regarde dans celles qu'on a.

        // On va plus loin : on vérifie si un keyword correspond exactement au nom de la catégorie importée
        // OU si le NOM de la catégorie correspond
        const categoryMatch = keywords.find(k => k.category.name.toLowerCase() === normalizedimportedCategory)
        if (categoryMatch) {
            return {
                id: categoryMatch.category.id,
                name: categoryMatch.category.name,
                emoji: categoryMatch.category.emoji,
                parentId: categoryMatch.category.parentId,
                parent: categoryMatch.category.parent
            }
        }
    }

    // 2. Recherche par mots-clés sur la Description ET la Catégorie Importée
    // On priorise les mots-clés les plus longs
    const sortedKeywords = keywords.sort((a, b) => b.keyword.length - a.keyword.length)

    // On combine description et catégorie pour la recherche
    // Mais on peut vouloir donner la priorité à l'un ou l'autre.
    // L'approche simple : si le mot clé est dans l'un ou l'autre, ça matche.

    // Test sur la Catégorie Importée d'abord (car souvent plus précis type "Alimentation")
    if (normalizedimportedCategory) {
        for (const kw of sortedKeywords) {
            if (normalizedimportedCategory.includes(kw.keyword.toLowerCase())) {
                return {
                    id: kw.category.id,
                    name: kw.category.name,
                    emoji: kw.category.emoji,
                    parentId: kw.category.parentId,
                    parent: kw.category.parent
                }
            }
        }
    }

    // Test sur la Description ensuite
    if (normalizedDesc) {
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
