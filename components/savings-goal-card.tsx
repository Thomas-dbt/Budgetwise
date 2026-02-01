import { Zap } from 'lucide-react'
import * as Icons from 'lucide-react'

interface SavingsGoal {
    id: string
    name: string
    targetAmount: string | number
    currentAmount: string | number
    deadline?: string | null
    icon?: string | null
    color?: string | null
}

interface SavingsGoalCardProps {
    goal: SavingsGoal
    onEdit: (goal: SavingsGoal) => void
    onViewDetails: (goal: SavingsGoal) => void
}

export function SavingsGoalCard({ goal, onEdit, onViewDetails }: SavingsGoalCardProps) {
    const target = Number(goal.targetAmount)
    const current = Number(goal.currentAmount)
    const percentage = Math.min(100, Math.max(0, (current / target) * 100))

    // Icon resolution
    const IconComponent = goal.icon && (Icons as any)[goal.icon]
        ? (Icons as any)[goal.icon]
        : Icons.Target

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount)

    const timeLeft = goal.deadline ? (() => {
        const end = new Date(goal.deadline)
        const now = new Date()
        const diffTime = end.getTime() - now.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        if (diffDays < 0) return { text: 'Terminé', days: diffDays }
        if (diffDays < 30) return { text: `${diffDays} jours`, days: diffDays }
        const diffMonths = Math.ceil(diffDays / 30)
        return { text: `${diffMonths} mois`, days: diffDays }
    })() : null

    const monthlyNeeded = (() => {
        if (!goal.deadline || current >= target) return null
        const end = new Date(goal.deadline)
        const now = new Date()
        // Calculate months diff more genuinely
        let months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth())

        // Adjust for partial months (if end day is before start day)
        if (months <= 0) {
            const diffTime = end.getTime() - now.getTime()
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            if (diffDays <= 0) return null
            months = 1
        }

        const remaining = target - current
        const monthly = remaining / months
        return monthly > 0 ? monthly : null
    })()

    return (
        <div
            className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow cursor-pointer group relative overflow-hidden"
            onClick={() => onViewDetails(goal)}
        >
            <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl shadow-lg`} style={{ backgroundColor: goal.color || '#3b82f6' }}>
                    <IconComponent size={24} />
                </div>
                <div className="text-right">
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onEdit(goal)
                        }}
                        className="p-1 text-gray-400 hover:text-blue-500  hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors mb-1 opacity-0 group-hover:opacity-100"
                    >
                        <Icons.Pencil size={16} />
                    </button>
                    <div className="text-2xl font-bold dark:text-gray-100">{formatCurrency(current)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">sur {formatCurrency(target)}</div>
                </div>
            </div>

            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 mb-1 truncate">{goal.name}</h3>

            <div className="flex flex-wrap gap-y-1 justify-between items-end mb-3">
                {timeLeft && (
                    <div className={`text-xs ${timeLeft.days < 0 ? 'text-red-500 font-medium' : 'text-gray-500 dark:text-gray-400'} flex items-center gap-1`}>
                        <Icons.Clock size={12} />
                        {timeLeft.days < 0 ? 'Expiré' : `${timeLeft.text} restants`}
                    </div>
                )}

                {monthlyNeeded && (
                    <div className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-lg">
                        {formatCurrency(monthlyNeeded)} / mois
                    </div>
                )}
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 mb-2 overflow-hidden">
                <div
                    className="h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%`, backgroundColor: goal.color || '#3b82f6' }}
                />
            </div>
            <div className="flex justify-between text-xs font-medium text-gray-500 dark:text-gray-400">
                <span>{percentage.toFixed(0)}%</span>
            </div>
        </div>
    )
}
