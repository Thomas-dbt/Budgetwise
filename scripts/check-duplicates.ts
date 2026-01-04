
import { defaultCategories } from '../lib/default-categories'

function checkDuplicates() {
    const keywordMap = new Map<string, string>() // keyword -> category path
    const duplicates: string[] = []

    for (const cat of defaultCategories) {
        for (const sub of cat.subCategories) {
            if (sub.keywords) {
                for (const kw of sub.keywords) {
                    const normalizedKw = kw.toLowerCase()
                    const path = `${cat.name} > ${sub.name}`

                    if (keywordMap.has(normalizedKw)) {
                        duplicates.push(`Duplicate: "${kw}" found in "${keywordMap.get(normalizedKw)}" AND "${path}"`)
                    } else {
                        keywordMap.set(normalizedKw, path)
                    }
                }
            }
        }
    }

    if (duplicates.length > 0) {
        console.log('Found duplicates:')
        duplicates.forEach(d => console.log(d))
    } else {
        console.log('No duplicates found.')
    }
}

checkDuplicates()
