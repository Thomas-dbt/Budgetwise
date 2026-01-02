'use client'

import { useState, useEffect, useMemo } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { useToast } from '@/components/toast'

interface Category {
    id: string
    name: string
    emoji: string | null
    parentId: string | null
}

interface Budget {
    id: string
    categoryId: string
    amount: number
    isGlobal?: boolean
}

interface BudgetSuggestion {
    [categoryId: string]: number
}

interface TransactionSummary {
    [categoryId: string]: number
}

export default function BudgetsPage() {
    const [categories, setCategories] = useState<Category[]>([])
    const [budgets, setBudgets] = useState<Budget[]>([])
    const [suggestions, setSuggestions] = useState<BudgetSuggestion>({})
    const [spending, setSpending] = useState<TransactionSummary>({})
    const [loading, setLoading] = useState(true)
    const [suggestionsLoading, setSuggestionsLoading] = useState(false)
    const { toast } = useToast()

    // Month Navigation State
    const [currentDate, setCurrentDate] = useState(new Date())
    const currentMonthKey = useMemo(() => currentDate.toISOString().slice(0, 7), [currentDate]) // "YYYY-MM"

    // Derived display string (e.g., "Janvier 2026")
    const monthDisplay = useMemo(() => {
        return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(currentDate)
    }, [currentDate])

    useEffect(() => {
        fetchData()
    }, [currentMonthKey])

    const changeMonth = (delta: number) => {
        const newDate = new Date(currentDate)
        newDate.setMonth(newDate.getMonth() + delta)
        setCurrentDate(newDate)
    }

    const fetchData = async () => {
        try {
            // Only show full loading state on first load (when we have no data)
            if (categories.length === 0) setLoading(true)

            const [catsRes, budgetsRes, transRes] = await Promise.all([
                authFetch('/api/categories'),
                authFetch(`/api/budgets?month=${currentMonthKey}`),
                fetchCurrentMonthSpending()
            ])

            if (catsRes.ok) {
                const cats = await catsRes.json()
                setCategories(cats.filter((c: Category) => !c.parentId)) // Only parent categories
            }

            if (budgetsRes.ok) {
                setBudgets(await budgetsRes.json())
            }

            // Spending is set inside fetchCurrentMonthSpending - note: fetchCurrentMonthSpending uses currentDate too

        } catch (error) {
            console.error('Error fetching data', error)
            toast('Erreur lors du chargement des données')
        } finally {
            setLoading(false)
        }
    }

    const fetchCurrentMonthSpending = async () => {
        // Determine start/end of SELECTED month
        const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString()
        const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString()

        const params = new URLSearchParams({ start, end, take: '2000' })
        const res = await authFetch(`/api/transactions?${params.toString()}`)
        if (res.ok) {
            const txs = await res.json()
            const summary: TransactionSummary = {}

            txs.forEach((tx: any) => {
                if (tx.type !== 'expense') return
                const catId = tx.category?.id // Use parent category ID (API format: category is parent if resolved)

                if (catId) {
                    summary[catId] = (summary[catId] || 0) + Math.abs(Number(tx.amount))
                }
            })
            setSpending(summary)
        }
    }

    const fetchSuggestions = async () => {
        if (Object.keys(suggestions).length > 0) return // Already fetched
        setSuggestionsLoading(true)
        try {
            const res = await authFetch('/api/budgets/suggestions')
            if (res.ok) {
                setSuggestions(await res.json())
            }
        } catch (error) {
            console.error(error)
            toast('Impossible de charger les suggestions')
        } finally {
            setSuggestionsLoading(false)
        }
    }

    const handleBudgetChange = (categoryId: string, amount: string) => {
        const numAmount = parseFloat(amount.replace(',', '.'))
        if (isNaN(numAmount)) return

        // Update local state temporarily
        setBudgets(prev => {
            const existing = prev.find(b => b.categoryId === categoryId)
            const newBudget = {
                id: existing?.id || 'temp-' + categoryId,
                categoryId,
                amount: numAmount,
                isGlobal: false // Assume edit makes it specific to this month initially
            }

            if (existing) {
                return prev.map(b => b.categoryId === categoryId ? newBudget : b)
            } else {
                return [...prev, newBudget]
            }
        })
    }

    const saveBudget = async (categoryId: string, amount: number) => {
        // Default behavior: save for THIS month
        try {
            const res = await authFetch('/api/budgets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ categoryId, amount, month: currentMonthKey })
            })

            if (!res.ok) throw new Error()

            // Refresh logic could go here to confirm "isGlobal" status changes, but optimistic UI is smoother
        } catch {
            toast('Erreur de sauvegarde')
        }
    }

    const applySuggestion = (categoryId: string, amount: number) => {
        handleBudgetChange(categoryId, amount.toString())
        saveBudget(categoryId, amount)
    }

    if (loading) return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
    )

    return (
        <div className="p-6 space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">◀</button>
                    <div className="text-center">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent capitalize">
                            {monthDisplay}
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                            Budgets mensuels
                        </p>
                    </div>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">▶</button>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setCurrentDate(new Date())}
                        className="px-4 py-2 border border-purple-200 text-purple-600 rounded-xl hover:bg-purple-50 transition-colors text-sm font-medium"
                    >
                        Aujourd'hui
                    </button>
                    <button
                        onClick={fetchSuggestions}
                        disabled={suggestionsLoading}
                        className="group relative px-6 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all duration-300 font-medium overflow-hidden"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            {suggestionsLoading ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                            ) : '💡'}
                            {suggestionsLoading ? '...' : 'Suggestions'}
                        </span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {categories.map(category => {
                    const budget = budgets.find(b => b.categoryId === category.id)
                    const amount = budget?.amount || 0
                    const spent = spending[category.id] || 0
                    const remaining = Math.max(0, amount - spent)
                    const percent = amount > 0 ? Math.min(100, (spent / amount) * 100) : (spent > 0 ? 100 : 0)
                    const isGlobal = budget?.isGlobal

                    const suggestion = suggestions[category.id]
                    const isOverBudget = spent > amount && amount > 0

                    return (
                        <div
                            key={category.id}
                            className={`group bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm hover:shadow-md border transition-all duration-300 flex flex-col gap-4 ${isGlobal === false ? 'border-purple-200 dark:border-purple-800 ring-1 ring-purple-100 dark:ring-purple-900/20' : 'border-gray-100 dark:border-gray-800'
                                }`}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">{category.emoji || '📁'}</span>
                                    <div>
                                        <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">{category.name}</h3>
                                        {isGlobal === false && (
                                            <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                                                Exception mensuelle
                                            </span>
                                        )}
                                        {suggestion !== undefined && suggestion > 0 && Math.abs(suggestion - amount) > 1 && (
                                            <button
                                                onClick={() => applySuggestion(category.id, suggestion)}
                                                className="text-xs mt-1 flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:underline cursor-pointer block"
                                                title="Appliquer la moyenne des 3 derniers mois"
                                            >
                                                💡 Moyenne: {suggestion}€
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="relative group/input">
                                    <input
                                        type="number"
                                        value={amount || ''}
                                        onChange={(e) => handleBudgetChange(category.id, e.target.value)}
                                        onBlur={(e) => saveBudget(category.id, Number(e.target.value))}
                                        placeholder="0"
                                        className="w-28 px-3 py-2 text-right font-bold text-lg bg-transparent border-b-2 border-gray-200 dark:border-gray-700 focus:border-purple-500 outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <span className="absolute right-0 -top-4 text-xs text-gray-400 opacity-0 group-hover/input:opacity-100 transition-opacity">Objectif</span>
                                    <span className="absolute right-[calc(100%+4px)] top-3 text-gray-400 text-sm">€</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-medium">
                                    <span className={isOverBudget ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}>
                                        {spent.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} dépensés
                                    </span>
                                    <span className="text-gray-400">
                                        {Math.round(percent)}%
                                    </span>
                                </div>

                                <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ease-out ${percent >= 100 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                                                percent > 85 ? 'bg-gradient-to-r from-orange-400 to-orange-500' :
                                                    'bg-gradient-to-r from-green-400 to-emerald-500'
                                            }`}
                                        style={{ width: `${percent}%` }}
                                    />
                                </div>

                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Restant</span>
                                    <span className={`text-lg font-bold ${remaining === 0 && amount > 0 ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                                        {remaining.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
