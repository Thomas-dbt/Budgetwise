'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { useSidebar } from '@/components/sidebar-context'
import {
  Home,
  Wallet,
  ArrowRightLeft,
  Calendar,
  TrendingUp,
  PieChart,
  BarChart3,
  PiggyBank,
  Settings,
  CreditCard,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

const menuItems = [
  { href: '/', label: 'Accueil', icon: Home },
  { href: '/accounts', label: 'Comptes', icon: Wallet },
  { href: '/transactions', label: 'Transactions', icon: ArrowRightLeft },
  { href: '/calendar', label: 'Calendrier', icon: Calendar },
  { href: '/investments', label: 'Investissements', icon: TrendingUp },
  { href: '/budgets', label: 'Budgets', icon: PieChart },
  { href: '/analytics', label: 'Statistiques', icon: BarChart3 },
  { href: '/savings', label: 'Économies', icon: PiggyBank },
  { href: '/settings', label: 'Paramètres', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { collapsed, toggleCollapse } = useSidebar()

  const handleLogout = async () => {
    await signOut()
    router.replace('/login')
  }

  return (
    <aside className={`fixed left-0 top-0 h-full bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 hidden md:flex flex-col transition-all duration-300 z-50 ${collapsed ? 'w-20' : 'w-64'
      }`}>
      {/* Logo Section */}
      <div className={`h-20 flex items-center border-b border-gray-100 dark:border-gray-900 ${collapsed ? 'justify-center px-4' : 'px-6'}`}>
        <div
          className="flex items-center gap-3 cursor-pointer group w-full"
          onClick={toggleCollapse}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/30 transition-all">
            <CreditCard className="text-white w-6 h-6" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                BudgetWise
              </h1>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500">
                Finance Perso
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 custom-scrollbar">
        <ul className="space-y-1.5">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${collapsed ? 'justify-center' : ''
                    } ${isActive
                      ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  title={collapsed ? item.label : undefined}
                >
                  {isActive && !collapsed && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 dark:bg-indigo-500 rounded-r-full" />
                  )}

                  <Icon className={`w-[22px] h-[22px] flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />

                  {!collapsed && (
                    <span className="text-[15px]">{item.label}</span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User Footer */}
      <div className={`p-4 border-t border-gray-100 dark:border-gray-900 bg-gray-50/50 dark:bg-gray-900/50 ${collapsed ? 'flex justify-center' : ''}`}>
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : 'mb-3'}`}>
          <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-900 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ring-2 ring-white dark:ring-gray-800 shadow-sm">
            {user?.displayName?.charAt(0).toUpperCase() ?? user?.email?.charAt(0).toUpperCase() ?? 'A'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-200 truncate leading-tight">
                {user?.displayName || 'Utilisateur'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {user?.email || ''}
              </p>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:text-red-400 dark:hover:border-red-900/30 transition-all shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Déconnexion</span>
          </button>
        )}
      </div>

      {/* Collapse Toggle (Desktop only helper) */}
      <button
        onClick={toggleCollapse}
        className="absolute -right-3 top-24 w-6 h-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hidden lg:flex"
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>
    </aside>
  )
}
