import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function DebugPage() {
    let userId
    try {
        userId = await getCurrentUserId()
    } catch (e) {
        return <div>Not logged in</div>
    }

    const categories = await prisma.category.findMany({
        where: { userId },
        include: {
            keywords: true,
            children: {
                include: { keywords: true }
            }
        }
    })

    // Also try to find ANY keywords for this user via relation?
    // No, keywords don't have userId. 
    // But we can check if there are orphan keywords or keyword on system cats?

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Debug Keywords</h1>
            <p>User ID: {userId}</p>

            <div className="space-y-4">
                {categories.map(cat => (
                    <div key={cat.id} className="border p-4 rounded bg-gray-50 dark:bg-gray-800">
                        <h2 className="font-bold">{cat.emoji} {cat.name} ({cat.id})</h2>
                        <div className="ml-4">
                            <strong>Keywords ({cat.keywords.length}):</strong>
                            <ul>
                                {cat.keywords.map(k => (
                                    <li key={k.id}>{k.keyword}</li>
                                ))}
                            </ul>
                        </div>

                        {cat.children.length > 0 && (
                            <div className="ml-8 mt-4 border-l pl-4">
                                <h3 className="font-semibold">Subcategories</h3>
                                {cat.children.map(sub => (
                                    <div key={sub.id} className="mt-2">
                                        <h4>{sub.name} ({sub.id})</h4>
                                        <div className="ml-4">
                                            <strong>Keywords ({sub.keywords.length}):</strong>
                                            <ul>
                                                {sub.keywords.map(k => (
                                                    <li key={k.id}>{k.keyword}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
