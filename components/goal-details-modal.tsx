
import { useEffect, useState } from 'react'
import * as Icons from 'lucide-react'
import { authFetch } from '@/lib/auth-fetch'

interface Transaction {
    id: string
    amount: number
    date: string
    type: 'income' | 'expense' | 'transfer' | 'investment'
    description: string
    account: { name: string }
}

interface SavingsGoal {
    id: string
    name: string
    targetAmount: number
    currentAmount: number
    deadline?: string
    icon?: string
    color?: string
    transactions?: Transaction[]
}

interface GoalDetailsModalProps {
    goalId: string | null
    isOpen: boolean
    onClose: () => void
}

export function GoalDetailsModal({ goalId, isOpen, onClose }: GoalDetailsModalProps) {
    const [goal, setGoal] = useState<SavingsGoal | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen && goalId) {
            fetchGoalDetails(goalId)
        } else {
            setGoal(null)
        }
    }, [isOpen, goalId])

    const fetchGoalDetails = async (id: string) => {
        setLoading(true)
        setError(null)
        try {
            const response = await authFetch(`/api/goals/${id}`)
            if (!response.ok) throw new Error('Impossible de charger les détails')
            const data = await response.json()
            setGoal(data)
        } catch (err) {
            console.error(err)
            setError('Erreur de chargement')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    const IconComponent = goal?.icon && (Icons as any)[goal.icon]
        ? (Icons as any)[goal.icon]
        : Icons.Target

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800 max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-start sticky top-0 bg-white dark:bg-gray-900 z-10">
                    {loading ? (
                        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                    ) : goal ? (
                        <div className="flex items-center gap-4">
                            <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg"
                                style={{ backgroundColor: goal.color || '#3b82f6' }}
                            >
                                <IconComponent size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{goal.name}</h2>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {formatCurrency(Number(goal.currentAmount))} su {formatCurrency(Number(goal.targetAmount))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-red-500">{error || 'Introuvable'}</div>
                    )}
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <Icons.X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : goal && goal.transactions ? (
                        <>
                            <h3 className="font-semibold text-lg mb-4 text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                <Icons.History size={18} />
                                Historique des transactions
                            </h3>

                            {goal.transactions.length === 0 ? (
                                <div className="text-center py-10 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                    <Icons.PiggyBank className="mx-auto mb-3 opacity-50" size={48} />
                                    <p>Aucune transaction liée pour le moment.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {goal.transactions.map(tx => (
                                        <div key={tx.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-lg ${tx.type === 'income' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                                                    tx.type === 'expense' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                                                        'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                                    }`}>
                                                    {tx.type === 'income' ? <Icons.TrendingUp size={18} /> :
                                                        tx.type === 'expense' ? <Icons.TrendingDown size={18} /> :
                                                            <Icons.ArrowRightLeft size={18} />}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900 dark:text-gray-100">
                                                        {tx.description || 'Sans description'}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                                        <span>{new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(tx.date))}</span>
                                                        <span>•</span>
                                                        <span>{tx.account.name}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`font-bold ${
                                                // Logic: Income adds to goal (+), Expense takes from goal (-). 
                                                // BUT usually transaction amounts are stored absolute or signed.
                                                // In our system: Income (+), Expense (-) on account balance. 
                                                // For Goal: Income adds, Expense removes.
                                                // Let's just color by type.
                                                tx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                                }`}>
                                                {tx.type === 'expense' ? '-' : '+'}{formatCurrency(Math.abs(tx.amount))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    )
}
