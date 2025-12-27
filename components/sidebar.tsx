'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { useSidebar } from '@/components/sidebar-context'

const menuItems = [
  { href: '/', label: 'Accueil', icon: '🏠' },
  { href: '/accounts', label: 'Comptes', icon: '💳' },
  { href: '/transactions', label: 'Transactions', icon: '💰' },
  { href: '/calendar', label: 'Calendrier', icon: '📅' },
  { href: '/investments', label: 'Investissements', icon: '📈' },
  { href: '/analytics', label: 'Statistiques', icon: '📊' },
  { href: '/savings', label: 'Économies', icon: '💡' },
  { href: '/settings', label: 'Paramètres', icon: '⚙️' },
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
    <aside className={`fixed left-0 top-0 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 ${
      collapsed ? 'w-20' : 'w-64'
    }`}>
      <div className={`p-6 border-b border-gray-200 dark:border-gray-800 ${collapsed ? 'p-4' : ''}`}>
        <div 
          className={`flex items-center gap-3 cursor-pointer ${collapsed ? 'justify-center' : ''}`}
          onClick={toggleCollapse}
        >
          <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xl">💳</span>
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-bold text-lg">BudgetWise</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Gestion financière
              </p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    collapsed ? 'justify-center' : ''
                  } ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="text-xl flex-shrink-0">{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className={`p-4 border-t border-gray-200 dark:border-gray-800 ${collapsed ? 'flex justify-center' : ''}`}>
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : 'mb-3'}`}>
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
            {user?.displayName?.charAt(0).toUpperCase() ?? user?.email?.charAt(0).toUpperCase() ?? 'A'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {user?.displayName || 'Utilisateur'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user?.email || ''}
              </p>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <span>Déconnexion</span>
          </button>
        )}
      </div>
    </aside>
  )
}
