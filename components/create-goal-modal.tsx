import { useState, useEffect } from 'react'
import * as Icons from 'lucide-react'
import { authFetch } from '@/lib/auth-fetch'

interface SavingsGoal {
    id?: string
    name: string
    targetAmount: string | number
    currentAmount: string | number
    deadline?: string | null
    icon?: string | null
    color?: string | null
}

interface CreateGoalModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: (goal: any) => void
    initialGoal?: SavingsGoal | null
    onDelete?: (id: string) => void
}

const COLORS = [
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#f97316', // Orange
]

const ICONS = [
    'Target', 'Plane', 'Home', 'Car', 'Smartphone', 'Gift', 'Heart', 'Umbrella', 'GraduationCap', 'Gamepad2'
]

export function CreateGoalModal({ isOpen, onClose, onSuccess, initialGoal, onDelete }: CreateGoalModalProps) {
    const [name, setName] = useState('')
    const [targetAmount, setTargetAmount] = useState('')
    const [currentAmount, setCurrentAmount] = useState('')
    const [deadline, setDeadline] = useState('')
    const [icon, setIcon] = useState('Target')
    const [color, setColor] = useState(COLORS[0])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (initialGoal) {
            setName(initialGoal.name)
            setTargetAmount(String(initialGoal.targetAmount))
            setCurrentAmount(String(initialGoal.currentAmount || 0))
            setDeadline(initialGoal.deadline ? new Date(initialGoal.deadline).toISOString().split('T')[0] : '')
            setIcon(initialGoal.icon || 'Target')
            setColor(initialGoal.color || COLORS[0])
        } else {
            setName('')
            setTargetAmount('')
            setCurrentAmount('0')
            setDeadline('')
            setIcon('Target')
            setColor(COLORS[0])
        }
    }, [initialGoal, isOpen])

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const url = initialGoal ? `/api/goals/${initialGoal.id}` : '/api/goals'
            const method = initialGoal ? 'PATCH' : 'POST'

            const response = await authFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    targetAmount: Number(targetAmount),
                    currentAmount: Number(currentAmount),
                    deadline: deadline || null,
                    icon,
                    color
                })
            })

            if (!response.ok) throw new Error('Erreur de sauvegarde')

            const savedGoal = await response.json()
            onSuccess(savedGoal)
            onClose()
        } catch (err) {
            console.error(err)
            // Generic error handling could be improved with toast
            alert("Une erreur est survenue.")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = () => {
        if (initialGoal && onDelete && confirm("Êtes-vous sûr de vouloir supprimer cet objectif ?")) {
            onDelete(initialGoal.id!)
            onClose()
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">
                            {initialGoal ? 'Modifier l\'objectif' : 'Nouvel objectif'}
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom de l'objectif</label>
                                <input
                                    required
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Ex: Voyage au Japon"
                                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cible (€)</label>
                                    <input
                                        required
                                        type="number"
                                        value={targetAmount}
                                        onChange={e => setTargetAmount(e.target.value)}
                                        placeholder="3000"
                                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Actuel (€)</label>
                                    <input
                                        type="number"
                                        value={currentAmount}
                                        onChange={e => setCurrentAmount(e.target.value)}
                                        placeholder="0"
                                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date limite (optionnel)</label>
                                <input
                                    type="date"
                                    value={deadline}
                                    onChange={e => setDeadline(e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Couleur & Icône</label>
                                <div className="flex gap-2 flex-wrap mb-3">
                                    {COLORS.map(c => (
                                        <button
                                            type="button"
                                            key={c}
                                            className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'}`}
                                            style={{ backgroundColor: c }}
                                            onClick={() => setColor(c)}
                                        />
                                    ))}
                                </div>
                                <div className="flex gap-2 bg-gray-50 dark:bg-gray-800 p-2 rounded-xl overflow-x-auto custom-scrollbar">
                                    {ICONS.map(iconName => {
                                        const Icon = (Icons as any)[iconName]
                                        return (
                                            <button
                                                type="button"
                                                key={iconName}
                                                className={`p-2 rounded-lg transition-all ${icon === iconName ? 'bg-white dark:bg-gray-700 shadow text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                                                onClick={() => setIcon(iconName)}
                                            >
                                                <Icon size={20} />
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex justify-between bg-gray-50 dark:bg-gray-900/50">
                        {initialGoal && onDelete ? (
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm font-medium"
                            >
                                Supprimer
                            </button>
                        ) : (
                            <div></div>
                        )}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors font-medium"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-600/20 transition-all font-medium disabled:opacity-50"
                            >
                                {loading ? '...' : 'Enregistrer'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}
