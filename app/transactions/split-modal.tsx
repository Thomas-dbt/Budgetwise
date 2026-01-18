
'use client'

import { useState, useEffect } from 'react'
import { authFetch } from '@/lib/auth-fetch'

interface SplitModalProps {
    transaction: any
    onClose: () => void
    onSuccess: () => void
    categories: any[]
    subCategories: any[]
    inline?: boolean
}

interface SplitLine {
    id: number
    amount: string
    description: string
    categoryId: string
    subCategoryId?: string
}

export default function SplitModal({ transaction, onClose, onSuccess, categories, subCategories, inline = false }: SplitModalProps) {
    const [splits, setSplits] = useState<SplitLine[]>(() => {
        if (transaction.splits && transaction.splits.length > 0) {
            return transaction.splits.map((s: any, index: number) => ({
                id: index + 1,
                amount: String(Math.abs(s.amount)),
                description: s.description || '',
                categoryId: s.categoryId || (s.category && s.category.id) || ''
            }))
        }
        return [
            { id: 1, amount: '', description: transaction.description || '', categoryId: transaction.categoryId || '' },
            { id: 2, amount: '', description: '', categoryId: '' }
        ]
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const originalAmount = Math.abs(transaction.amount)

    const currentTotal = splits.reduce((acc, split) => acc + (Number(split.amount) || 0), 0)
    const remaining = originalAmount - currentTotal
    const isValid = Math.abs(remaining) < 0.01 && splits.every(s => Number(s.amount) > 0 && s.categoryId)

    const addSplit = () => {
        setSplits([...splits, { id: Date.now(), amount: '', description: '', categoryId: '' }])
    }

    const removeSplit = (id: number) => {
        if (splits.length <= 2) return
        setSplits(splits.filter(s => s.id !== id))
    }

    const updateSplit = (id: number, field: keyof SplitLine, value: string) => {
        setSplits(splits.map(s => s.id === id ? { ...s, [field]: value } : s))
    }

    const handleSubmit = async () => {
        if (!isValid) return
        setLoading(true)
        setError(null)

        try {
            const payload = {
                splits: splits.map(s => ({
                    amount: Number(s.amount),
                    description: s.description,
                    categoryId: s.categoryId
                    // Note: subCategories not fully handled in this MVP UI, simplified to Category only
                }))
            }

            const res = await authFetch(`/api/transactions/${transaction.id}/split`, {
                method: 'POST',
                body: JSON.stringify(payload)
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Erreur lors du découpage')
            }

            onSuccess()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Auto-fill last split rest amount
    useEffect(() => {
        // Optional: could implement smarter auto-fill logic here
    }, [splits])

    const content = (
        <div className={inline ? "h-full flex flex-col" : "bg-white dark:bg-gray-900 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"}>
            {!inline && <h2 className="text-xl font-bold mb-4">Diviser la transaction</h2>}

            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-6 flex justify-between items-center flex-shrink-0">
                <div>
                    <div className="text-sm text-gray-500">Montant original</div>
                    <div className="text-xl font-bold">{originalAmount.toFixed(2)} €</div>
                </div>
                <div>
                    <div className="text-sm text-gray-500">Reste à attribuer</div>
                    <div className={`text-xl font-bold ${Math.abs(remaining) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                        {remaining.toFixed(2)} €
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm flex-shrink-0">
                    {error}
                </div>
            )}

            <div className="space-y-3 mb-6 overflow-y-auto flex-1 pr-2">
                {splits.map((split, index) => (
                    <div key={split.id} className="flex gap-2 items-start">
                        <div className="w-24 flex-shrink-0">
                            <input
                                type="number"
                                placeholder="Montant"
                                value={split.amount}
                                onChange={(e) => updateSplit(split.id, 'amount', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800"
                                step="0.01"
                            />
                        </div>
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="Description"
                                value={split.description}
                                onChange={(e) => updateSplit(split.id, 'description', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm mb-1 bg-white dark:bg-gray-800"
                            />
                            <select
                                value={split.categoryId}
                                onChange={(e) => updateSplit(split.id, 'categoryId', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800"
                            >
                                <option value="">Choisir une catégorie...</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={() => removeSplit(split.id)}
                            disabled={splits.length <= 2}
                            className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-30 self-center"
                        >
                            🗑️
                        </button>
                    </div>
                ))}
            </div>

            <div className="flex gap-3 flex-shrink-0">
                <button
                    onClick={addSplit}
                    className="px-4 py-2 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-sm w-full hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                    + Ajouter une ligne
                </button>
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800 flex-shrink-0 bg-white dark:bg-gray-900 sticky bottom-0">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    Annuler
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={!isValid || loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Traitement...' : 'Valider la division'}
                </button>
            </div>
        </div>
    )

    if (inline) {
        return content
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            {content}
        </div>
    )
}
