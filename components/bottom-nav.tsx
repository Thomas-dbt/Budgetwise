'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ArrowRightLeft, Wallet, Menu, Plus } from 'lucide-react'
import { useState } from 'react'
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet" // Assuming generic sheet component exists or will use simple absolute div if not
// Actually, let's stick to a simple "More" menu overlay for now or just navigate to a menu page if we want to be simple.
// For now, let's just make the "More" button toggle a full-screen menu or simple dropdown. 
// Given the complexity of adding a Sheet component if it doesn't exist, I'll implementing a simple state-based overlay within this component or just simple links.

// Let's check if we have a Sheet/Drawer component. The user has "shadcn" likely (based on look).
// I'll check generic UI components first.

export function BottomNav() {
    const pathname = usePathname()
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    const navItems = [
        { href: '/', label: 'Accueil', icon: Home },
        { href: '/transactions', label: 'Transac.', icon: ArrowRightLeft },
        { href: '/accounts', label: 'Comptes', icon: Wallet },
    ]

    return (
        <>
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 pb-safe z-50">
                <div className="flex items-center justify-around h-16">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href
                        const Icon = item.icon
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex flex-col items-center justify-center w-full h-full gap-1 ${isActive
                                        ? 'text-indigo-600 dark:text-indigo-400'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                    }`}
                            >
                                <Icon className={`w-6 h-6 ${isActive ? 'fill-current opacity-20' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                                <Icon className={`w-6 h-6 absolute ${isActive ? 'scale-100' : 'scale-0'}`} strokeWidth={2.5} />
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </Link>
                        )
                    })}

                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={`flex flex-col items-center justify-center w-full h-full gap-1 ${isMenuOpen
                                ? 'text-indigo-600 dark:text-indigo-400'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                    >
                        <Menu className="w-6 h-6" strokeWidth={isMenuOpen ? 2.5 : 2} />
                        <span className="text-[10px] font-medium">Menu</span>
                    </button>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {isMenuOpen && (
                <div className="md:hidden fixed inset-0 bg-white dark:bg-gray-950 z-40 flex flex-col pt-safe animate-in slide-in-from-bottom-10 fade-in duration-200">
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-900">
                        <h2 className="font-bold text-lg">Menu</h2>
                        <button
                            onClick={() => setIsMenuOpen(false)}
                            className="p-2 bg-gray-100 dark:bg-gray-900 rounded-full"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="grid grid-cols-2 gap-3">
                            <MenuLink href="/calendar" icon="📅" label="Calendrier" onClick={() => setIsMenuOpen(false)} />
                            <MenuLink href="/investments" icon="📈" label="Investissements" onClick={() => setIsMenuOpen(false)} />
                            <MenuLink href="/budgets" icon="💰" label="Budgets" onClick={() => setIsMenuOpen(false)} />
                            <MenuLink href="/analytics" icon="📊" label="Statistiques" onClick={() => setIsMenuOpen(false)} />
                            <MenuLink href="/savings" icon="💡" label="Économies" onClick={() => setIsMenuOpen(false)} />
                            <MenuLink href="/settings" icon="⚙️" label="Paramètres" onClick={() => setIsMenuOpen(false)} />
                        </div>
                    </div>
                    <div className="h-20"></div> {/* Spacer for bottom nav */}
                </div>
            )}
        </>
    )
}

function MenuLink({ href, icon, label, onClick }: { href: string, icon: string, label: string, onClick: () => void }) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className="flex flex-col items-center justify-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-indigo-500/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all"
        >
            <span className="text-2xl">{icon}</span>
            <span className="font-medium text-sm text-center">{label}</span>
        </Link>
    )
}
