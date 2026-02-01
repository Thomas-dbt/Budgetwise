
import React, { useState, useMemo } from 'react'
import * as Icons from 'lucide-react'
import { Search, X } from 'lucide-react'

interface IconPickerProps {
    value?: string | null
    onChange: (iconName: string) => void
    onClose?: () => void
}

export function IconPicker({ value, onChange, onClose }: IconPickerProps) {
    const [search, setSearch] = useState('')

    // Filter valid icon names
    const iconNames = useMemo(() => {
        return Object.keys(Icons)
            .filter(key =>
                // Filter out non-component exports
                key !== 'createLucideIcon' &&
                key !== 'default' &&
                key !== 'Icon' &&
                /^[A-Z]/.test(key)
            )
            .sort()
    }, [])

    const filteredIcons = useMemo(() => {
        if (!search) return iconNames
        const lowerSearch = search.toLowerCase()
        return iconNames.filter(name => name.toLowerCase().includes(lowerSearch))
    }, [search, iconNames])

    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl w-full max-w-sm flex flex-col max-h-[400px]">
            <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Rechercher une icône..."
                    className="flex-1 bg-transparent text-sm outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus
                />
                {onClose && (
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-2 grid grid-cols-6 gap-2 custom-scrollbar">
                {filteredIcons.map((name) => {
                    const Icon = (Icons as any)[name]
                    if (!Icon) return null

                    const isSelected = value === name

                    return (
                        <button
                            key={name}
                            onClick={() => onChange(name)}
                            className={`p-2 rounded-lg flex items-center justify-center transition-all ${isSelected
                                    ? 'bg-blue-600 text-white shadow-md scale-110'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:scale-105'
                                }`}
                            title={name}
                        >
                            <Icon className="w-5 h-5" />
                        </button>
                    )
                })}
                {filteredIcons.length === 0 && (
                    <div className="col-span-6 py-8 text-center text-gray-400 text-sm">
                        Aucune icône trouvée
                    </div>
                )}
            </div>

            <div className="p-2 border-t border-gray-100 dark:border-gray-800 text-xs text-center text-gray-500">
                {filteredIcons.length} icônes disponibles
            </div>
        </div>
    )
}
