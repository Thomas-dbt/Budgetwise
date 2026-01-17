'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  CreditCard,
  Banknote,
  Wallet,
  CircleDollarSign,
  Eye,
  EyeOff,
  Settings,
  Plus,
  X,
  Trash2,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { authFetch } from '@/lib/auth-fetch'

interface Account {
  id: string
  name: string
  bank: string | null
  type: string
  balance: number
  createdAt: string
  updatedAt: string
  displayOrder?: number
  last4Digits?: string | null
}

interface Transaction {
  id: string
  date: string
  description: string | null
  amount: number
  type: 'income' | 'expense' | 'transfer'
  category: { name: string; emoji: string | null } | null
}

const BANK_OPTIONS = [
  'BNP Paribas',
  'Crédit Agricole',
  'Société Générale',
  'Crédit Mutuel',
  'Banque Populaire',
  'CIC',
  'La Banque Postale',
  'HSBC',
  'ING',
  'LCL',
  'Autre'
]

const BANK_DOMAINS: Record<string, string> = {
  'BNP Paribas': 'bnpparibas.com',
  'Crédit Agricole': 'credit-agricole.fr',
  'Credit Agricole': 'credit-agricole.fr',
  'Société Générale': 'societegenerale.fr',
  'Societe Generale': 'societegenerale.fr',
  'Crédit Mutuel': 'creditmutuel.fr',
  'Credit Mutuel': 'creditmutuel.fr',
  'Banque Populaire': 'banquepopulaire.fr',
  'CIC': 'cic.fr',
  'La Banque Postale': 'labanquepostale.fr',
  'HSBC': 'hsbc.fr',
  'ING': 'ing.fr',
  'LCL': 'lcl.fr',
  'Boursorama': 'boursorama.com',
  'Boursorama Banque': 'boursorama.com',
  'BoursoBank': 'boursorama.com',
  'Fortuneo': 'fortuneo.fr',
  'Monabanq': 'monabanq.com',
  'Hello Bank': 'hellobank.fr',
  'Hello bank!': 'hellobank.fr',
  'Revolut': 'revolut.com',
  'N26': 'n26.com',
  'Qonto': 'qonto.com',
  'Shine': 'shine.fr',
  'Lydia': 'lydia-app.com',
  'PayPal': 'paypal.com',
  'Macif': 'macif.fr',
  'Groupama': 'groupama.fr',
  'Groupama Banque': 'groupama.fr',
  'AXA': 'axa.fr',
  'AXA Banque': 'axa.fr',
  'Maif': 'maif.fr',
  'Allianz': 'allianz.fr',
  'Matmut': 'matmut.fr',
  'BforBank': 'bforbank.com'
}

const BankLogo = ({ bankName, fallback }: { bankName: string | null, fallback: React.ReactNode }) => {
  const [error, setError] = useState(false)
  const domain = bankName ? BANK_DOMAINS[bankName] : null

  if (!domain || error) return <>{fallback}</>

  return (
    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-lg p-2 overflow-hidden border border-gray-100 dark:border-gray-700">
      <img
        src={`https://unavatar.io/${domain}?fallback=false`}
        alt={bankName || 'Bank'}
        className="w-full h-full object-contain"
        onError={() => setError(true)}
      />
    </div>
  )
}

const Sparkline = ({ data }: { data: { date: string, balance: number }[] }) => {
  if (!data || data.length === 0) return null

  const isPositive = (data[data.length - 1]?.balance ?? 0) >= (data[0]?.balance ?? 0)

  return (
    <div className="h-12 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`gradient-${isPositive ? 'up' : 'down'}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isPositive ? '#10B981' : '#EF4444'} stopOpacity={0.1} />
              <stop offset="95%" stopColor={isPositive ? '#10B981' : '#EF4444'} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="balance"
            stroke={isPositive ? '#10B981' : '#EF4444'}
            fillOpacity={1}
            fill={`url(#gradient-${isPositive ? 'up' : 'down'})`}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showBalance, setShowBalance] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [historyMap, setHistoryMap] = useState<Record<string, { date: string, balance: number }[]>>({})
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [blurredAccounts, setBlurredAccounts] = useState<Set<string>>(new Set())
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    bankType: BANK_OPTIONS[0],
    customBank: '',
    type: 'checking',
    balance: '0',
    last4Digits: ''
  })

  // State for Transactions Modal
  const [viewingAccount, setViewingAccount] = useState<Account | null>(null)
  const [accountTransactions, setAccountTransactions] = useState<Transaction[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'app/accounts/page.tsx:30', message: 'AccountsPage: Component mounted', data: { timestamp: Date.now() }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion
    return () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'app/accounts/page.tsx:33', message: 'AccountsPage: Component unmounting', data: { timestamp: Date.now() }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
      // #endregion
    }
  }, [])

  // Récupérer toutes les banques uniques des comptes existants
  const availableBanks = useMemo(() => {
    const customBanks = accounts
      .map(acc => acc.bank)
      .filter((bank): bank is string => !!bank && bank.trim() !== '' && !BANK_OPTIONS.includes(bank))

    const uniqueCustomBanks = Array.from(new Set(customBanks)).sort()

    // Combiner les banques par défaut avec les banques personnalisées, en gardant "Autre" à la fin
    return [...BANK_OPTIONS.filter(b => b !== 'Autre'), ...uniqueCustomBanks, 'Autre']
  }, [accounts])

  useEffect(() => {
    fetchAccounts()

    // Écouter les événements de rafraîchissement depuis d'autres pages
    const handleRefresh = () => {
      fetchAccounts()
    }
    window.addEventListener('accounts-refresh', handleRefresh)

    return () => {
      window.removeEventListener('accounts-refresh', handleRefresh)
    }
  }, [])

  const fetchAccounts = async () => {
    try {
      const response = await authFetch('/api/accounts')
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`)
      }
      const data = await response.json()
      setAccounts(data)
      fetchHistory(data)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching accounts:', error)
      setLoading(false)
    }
  }

  const fetchHistory = async (currentAccounts: Account[]) => {
    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)

      const res = await authFetch(`/api/transactions?start=${startDate.toISOString()}&end=${endDate.toISOString()}&take=2000`)
      if (res.ok) {
        const transactions: Transaction[] = await res.json()
        const history: Record<string, { date: string, balance: number }[]> = {}

        currentAccounts.forEach(acc => {
          const accTxs = transactions.filter(t =>
            (t as any).accountId === acc.id || (t as any).toAccountId === acc.id
          ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

          const dailyBalances: { date: string, balance: number }[] = []
          let currentBalance = Number(acc.balance)

          for (let i = 0; i < 30; i++) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            const dateStr = d.toISOString().split('T')[0]

            dailyBalances.unshift({ date: dateStr, balance: currentBalance })

            const dayTxs = accTxs.filter(t => t.date.startsWith(dateStr))

            dayTxs.forEach(t => {
              let amount = Number(t.amount)
              if (t.type === 'transfer') {
                if ((t as any).accountId === acc.id) {
                  currentBalance += Math.abs(amount)
                } else if ((t as any).toAccountId === acc.id) {
                  currentBalance -= Math.abs(amount)
                }
              } else {
                currentBalance -= amount
              }
            })
          }
          history[acc.id] = dailyBalances
        })
        setHistoryMap(history)
      }
    } catch (e) {
      console.error('Error fetching history', e)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      bankType: availableBanks[0] || BANK_OPTIONS[0],
      customBank: '',
      type: 'checking',
      balance: '0',
      last4Digits: ''
    })
    setEditingAccount(null)
    setModalMode('create')
  }

  const openCreateModal = () => {
    resetForm()
    setModalMode('create')
    setShowModal(true)
  }

  const openEditModal = (account: Account) => {
    const bankName = account.bank || ''
    // Vérifier si la banque existe dans la liste complète (par défaut + personnalisées)
    const bankType = availableBanks.includes(bankName) ? bankName : 'Autre'
    setFormData({
      name: account.name,
      bankType,
      customBank: bankType === 'Autre' ? bankName : '',
      type: account.type || 'checking',
      balance: Number(account.balance ?? 0).toFixed(2),
      last4Digits: account.last4Digits || ''
    })
    setEditingAccount(account)
    setModalMode('edit')
    setShowModal(true)
  }

  const toggleBlur = (accountId: string) => {
    setBlurredAccounts(prev => {
      const updated = new Set(prev)
      if (updated.has(accountId)) {
        updated.delete(accountId)
      } else {
        updated.add(accountId)
      }
      return updated
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      setErrorMessage('Veuillez saisir un nom de compte')
      return
    }

    if (formData.bankType === 'Autre' && !formData.customBank.trim()) {
      setErrorMessage('Veuillez saisir le nom de la banque')
      return
    }

    const payload = {
      name: formData.name.trim(),
      bank: (formData.bankType === 'Autre' ? formData.customBank.trim() : formData.bankType) || null,
      type: formData.type,
      balance: parseFloat(formData.balance) || 0,
      last4Digits: formData.last4Digits.trim() || null
    }

    try {
      const response = await authFetch(
        modalMode === 'edit' && editingAccount ? `/api/accounts/${editingAccount.id}` : '/api/accounts',
        {
          method: modalMode === 'edit' ? 'PATCH' : 'POST',
          body: JSON.stringify(payload),
        },
      )

      if (response.ok) {
        setShowModal(false)
        resetForm()
        setErrorMessage(null)
        fetchAccounts()
      } else {
        const errorText = await response.text()
        let errorJson: any = null
        try {
          errorJson = JSON.parse(errorText)
        } catch {
          // ignore
        }
        console.error('API Error:', errorJson || errorText)
        const message =
          (errorJson && errorJson.error) ||
          errorText ||
          'Impossible de créer/modifier le compte'
        setErrorMessage(message)
      }
    } catch (error: any) {
      console.error('Error creating account:', error)
      setErrorMessage('Erreur lors de la création/modification: ' + (error.message || 'Erreur inconnue'))
    }
  }

  const confirmDeleteAccount = async () => {
    if (!editingAccount) return
    setIsDeleting(true)
    try {
      const response = await authFetch(`/api/accounts/${editingAccount.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setShowModal(false)
        resetForm()
        setErrorMessage(null)
        setConfirmDeleteOpen(false)
        fetchAccounts()
      } else {
        const errorText = await response.text()
        let errorJson: any = null
        try {
          errorJson = JSON.parse(errorText)
        } catch {
          // ignore
        }
        console.error('API Error:', errorJson || errorText)
        const message = (errorJson && errorJson.error) || errorText || 'Impossible de supprimer le compte'
        setErrorMessage(message)
      }
    } catch (error: any) {
      console.error('Error deleting account:', error)
      setErrorMessage('Erreur lors de la suppression: ' + (error.message || 'Erreur inconnue'))
    }
    setIsDeleting(false)
  }

  const handleDeleteAccount = () => {
    if (!editingAccount) return
    setConfirmDeleteOpen(true)
  }

  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0)
  const accountCount = accounts.length

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const openTransactionsModal = async (account: Account) => {
    setViewingAccount(account)
    setTransactionsLoading(true)
    try {
      const res = await authFetch(`/api/transactions?accountId=${account.id}&take=50`)
      if (res.ok) {
        const data = await res.json()
        setAccountTransactions(Array.isArray(data) ? data : (data.transactions || []))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setTransactionsLoading(false)
    }
  }

  const moveAccount = async (id: string, direction: 'up' | 'down') => {
    const index = accounts.findIndex(a => a.id === id)
    if (index === -1) return
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= accounts.length) return

    const newAccounts = [...accounts]
    const temp = newAccounts[index]
    newAccounts[index] = newAccounts[targetIndex]
    newAccounts[targetIndex] = temp
    setAccounts(newAccounts)

    // Robust reorder: update all indexes to ensure consistency
    const updates = newAccounts.map((acc, idx) => ({
      id: acc.id,
      displayOrder: idx
    }))

    try {
      await authFetch('/api/accounts/reorder', {
        method: 'POST',
        body: JSON.stringify({ items: updates })
      })
    } catch (e) {
      console.error('Reorder failed', e)
      fetchAccounts()
    }
  }

  const renderBankName = (account: Account) => account.bank && account.bank.trim().length > 0 ? account.bank : '---'

  const renderAccountType = (type: string) =>
    type === 'checking'
      ? 'Courant'
      : type === 'savings'
        ? 'Épargne'
        : type === 'credit'
          ? 'Crédit'
          : 'Espèces'

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Mes Comptes</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Gérez tous vos comptes bancaires</p>
          </div>
          <button
            onClick={openCreateModal}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-200 font-medium"
          >
            <span className="text-xl font-bold">+</span>
            <span>Nouveau Compte</span>
          </button>
        </div>
      </div>

      {/* Solde Total Card */}
      <div className="mb-8">
        <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-2xl p-8 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold opacity-95">Solde Total</h2>
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-all duration-200 hover:scale-110"
              >
                <span className="text-xl">{showBalance ? '👁️' : '👁️'}</span>
              </button>
            </div>
            <div className="text-4xl font-bold mb-3 select-none tracking-tight">
              {showBalance ? formatCurrency(totalBalance) : '••••••'}
            </div>
            <div className="flex items-center gap-2 text-sm opacity-90">
              <span className="w-2 h-2 bg-white rounded-full"></span>
              {accountCount} {accountCount <= 1 ? 'compte' : 'comptes'}
            </div>
          </div>
        </div>
      </div>

      {/* Liste des comptes ou message vide */}
      {accountCount === 0 ? (
        <div className="text-center py-16">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center">
            <span className="text-5xl">💳</span>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-2 text-lg font-medium">Aucun compte créé</p>
          <p className="text-gray-500 dark:text-gray-500 mb-6 text-sm">Commencez par créer votre premier compte</p>
          <button
            onClick={openCreateModal}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 font-medium"
          >
            Créer votre premier compte
          </button>
        </div>
      ) : (
        <>
          {['checking', 'savings', 'investment', 'other'].map(groupType => {
            const groupAccounts = accounts.filter(a => {
              if (groupType === 'checking') return ['checking', 'credit', 'cash'].includes(a.type)
              if (groupType === 'savings') return a.type === 'savings'
              if (groupType === 'investment') return a.type === 'investment'
              if (groupType === 'other') return !['checking', 'credit', 'cash', 'savings', 'investment'].includes(a.type)
              return false
            })

            if (groupAccounts.length === 0) return null

            const groupTotal = groupAccounts.reduce((sum, a) => sum + Number(a.balance), 0)
            let title = 'Autres Comptes'
            if (groupType === 'checking') title = 'Comptes Courants'
            if (groupType === 'savings') title = 'Épargne'
            if (groupType === 'investment') title = 'Investissements'

            return (
              <div key={groupType} className="mb-10 last:mb-0">
                <div className="flex items-end justify-between mb-4 px-1">
                  <h2 className="text-lg font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    {groupType === 'checking' && <CreditCard className="w-5 h-5" />}
                    {groupType === 'savings' && <Wallet className="w-5 h-5" />}
                    {groupType === 'investment' && <CircleDollarSign className="w-5 h-5" />}
                    {groupType === 'other' && <CreditCard className="w-5 h-5" />}
                    {title}
                  </h2>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                    {showBalance ? formatCurrency(groupTotal) : '••••••'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {groupAccounts.map((account) => {
                    const isBlurred = blurredAccounts.has(account.id)
                    const gradient = {
                      'checking': 'from-blue-500 to-cyan-500',
                      'savings': 'from-green-500 to-emerald-500',
                      'investment': 'from-purple-500 to-indigo-500',
                      'credit': 'from-orange-500 to-red-500',
                      'cash': 'from-gray-500 to-slate-500'
                    }[account.type] || 'from-gray-500 to-slate-500'

                    const bgGradient = {
                      'checking': 'from-blue-50/50 to-cyan-50/50 dark:from-blue-900/20 dark:to-cyan-900/20',
                      'savings': 'from-green-50/50 to-emerald-50/50 dark:from-green-900/20 dark:to-emerald-900/20',
                      'investment': 'from-purple-50/50 to-indigo-50/50 dark:from-purple-900/20 dark:to-indigo-900/20',
                      'credit': 'from-orange-50/50 to-red-50/50 dark:from-orange-900/20 dark:to-red-900/20',
                      'cash': 'from-gray-50/50 to-slate-50/50 dark:from-gray-900/20 dark:to-slate-900/20'
                    }[account.type] || 'from-gray-50/50 to-slate-50/50'

                    return (
                      <div
                        key={account.id}
                        onClick={() => openTransactionsModal(account)}
                        className={`group relative overflow-hidden bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer bg-gradient-to-br ${bgGradient}`}
                      >
                        <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleBlur(account.id)
                            }}
                            className="p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg hover:bg-white dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-sm"
                            title={isBlurred ? 'Afficher le solde' : 'Masquer le solde'}
                          >
                            {isBlurred ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openEditModal(account)
                            }}
                            className="p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg hover:bg-white dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-sm"
                            title="Modifier le compte"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-start justify-between mb-6">
                          <div className="flex-1 min-w-0 flex items-center gap-4">
                            <BankLogo
                              bankName={account.bank}
                              fallback={
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg text-white`}>
                                  {account.type === 'checking' && <CreditCard className="w-6 h-6" />}
                                  {account.type === 'savings' && <Wallet className="w-6 h-6" />}
                                  {account.type === 'credit' && <CreditCard className="w-6 h-6" />}
                                  {account.type === 'cash' && <Banknote className="w-6 h-6" />}
                                  {!['checking', 'savings', 'credit', 'cash'].includes(account.type) && <CircleDollarSign className="w-6 h-6" />}
                                </div>
                              }
                            />
                            <div className="min-w-0">
                              <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 truncate mb-0.5">
                                {account.name}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {renderBankName(account)}
                              </p>
                            </div>
                          </div>
                        </div>


                        <div className="mb-4">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Solde</p>
                          <p className={`text-2xl font-bold text-gray-900 dark:text-gray-100 ${isBlurred ? 'blur-md select-none' : ''} transition-all duration-200`}>
                            {isBlurred ? '••••••' : formatCurrency(Number(account.balance))}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                          <span className={`text-xs px-3 py-1.5 rounded-lg font-medium bg-gradient-to-r ${gradient} text-white shadow-sm`}>
                            {renderAccountType(account.type)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </>
      )}

      {/* Modal de création/édition de compte */}
      {
        showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {modalMode === 'edit' ? 'Modifier le compte' : 'Nouveau Compte'}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {modalMode === 'edit' ? 'Mettez à jour les informations de votre compte' : 'Ajoutez un nouveau compte bancaire'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="w-10 h-10 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-all duration-200"
                >
                  <span className="text-xl">✕</span>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Nom du compte *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Ex: Compte courant"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Banque</label>
                  <select
                    value={formData.bankType}
                    onChange={(e) => setFormData({ ...formData, bankType: e.target.value, customBank: '' })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    {availableBanks.map((bank) => (
                      <option key={bank} value={bank}>{bank}</option>
                    ))}
                  </select>
                  {formData.bankType === 'Autre' && (
                    <input
                      type="text"
                      required
                      value={formData.customBank}
                      onChange={(e) => {
                        const newValue = e.target.value.trim()
                        // Si la valeur correspond à une banque existante dans la liste, la sélectionner automatiquement
                        const matchingBank = availableBanks.find(bank =>
                          bank.toLowerCase() === newValue.toLowerCase() && bank !== 'Autre'
                        )
                        if (matchingBank) {
                          setFormData({ ...formData, bankType: matchingBank, customBank: '' })
                        } else {
                          setFormData({ ...formData, customBank: e.target.value })
                        }
                      }}
                      className="w-full mt-3 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Nom de la banque"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Type de compte *</label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="checking">Compte courant</option>
                    <option value="savings">Compte épargne</option>
                    <option value="credit">Carte de crédit</option>
                    <option value="cash">Espèces</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">4 derniers chiffres (optionnel)</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={formData.last4Digits}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                      setFormData({ ...formData, last4Digits: val })
                    }}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 font-mono tracking-widest placeholder:tracking-normal"
                    placeholder="Ex: 4291"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Solde initial</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.balance}
                    onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="0.00"
                  />
                </div>

                {modalMode === 'edit' && editingAccount && (
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Position</label>
                    <div className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <span className="flex-1 text-sm text-gray-600 dark:text-gray-400">
                        Changez l'ordre d'affichage
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => moveAccount(editingAccount.id, 'up')}
                          disabled={accounts.findIndex(a => a.id === editingAccount.id) === 0}
                          className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-all"
                        >
                          ↑ Monter
                        </button>
                        <button
                          type="button"
                          onClick={() => moveAccount(editingAccount.id, 'down')}
                          disabled={accounts.findIndex(a => a.id === editingAccount.id) === accounts.length - 1}
                          className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-all"
                        >
                          ↓ Descendre
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-800">
                  {modalMode === 'edit' && (
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      className="px-6 py-3 text-red-600 border-2 border-red-200 dark:border-red-800 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 font-medium transition-all duration-200 hover:scale-105"
                    >
                      Supprimer
                    </button>
                  )}
                  <div className="flex-1 flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false)
                        resetForm()
                      }}
                      className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 font-medium transition-all duration-200"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      {modalMode === 'edit' ? 'Sauvegarder' : 'Créer'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Message d'erreur global */}
      {
        errorMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setErrorMessage(null)}></div>
            <div className="relative bg-white dark:bg-gray-900 border-2 border-red-200 dark:border-red-800 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <span className="text-3xl">⚠️</span>
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-gray-100">Oups, une erreur est survenue</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 whitespace-pre-wrap">{errorMessage}</p>
              <button
                onClick={() => setErrorMessage(null)}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Fermer
              </button>
            </div>
          </div>
        )
      }

      {/* Modal Transactions */}
      {
        viewingAccount && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-0 max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm text-white bg-gradient-to-br ${{
                    'checking': 'from-blue-500 to-cyan-500',
                    'savings': 'from-green-500 to-emerald-500',
                    'credit': 'from-orange-500 to-red-500',
                    'cash': 'from-gray-500 to-slate-500'
                  }[viewingAccount.type] || 'from-gray-500 to-slate-500'
                    }`}>
                    {viewingAccount.type === 'checking' && <CreditCard className="w-6 h-6" />}
                    {viewingAccount.type === 'savings' && <Wallet className="w-6 h-6" />}
                    {viewingAccount.type === 'credit' && <CreditCard className="w-6 h-6" />}
                    {viewingAccount.type === 'cash' && <Banknote className="w-6 h-6" />}
                    {!['checking', 'savings', 'credit', 'cash'].includes(viewingAccount.type) && <CircleDollarSign className="w-6 h-6" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{viewingAccount.name}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Solde actuel : <span className={`font-semibold ${Number(viewingAccount.balance) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(Number(viewingAccount.balance))}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingAccount(null)}
                  className="w-10 h-10 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 flex items-center justify-center transition-colors text-gray-500"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-0 bg-white dark:bg-gray-900">
                {transactionsLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : accountTransactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <p className="text-lg font-medium">Aucune transaction récente</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {accountTransactions.map((t) => (
                      <div key={t.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-center justify-between gap-4">
                        {/* Icon */}
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0 text-xl">
                          {t.category?.emoji || '📄'}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-gray-900 dark:text-gray-100 truncate pr-4" title={t.description || 'Sans description'}>
                              {t.description || 'Sans description'}
                            </p>
                            <p className={`font-mono font-bold whitespace-nowrap ${t.type === 'income' ? 'text-green-600 dark:text-green-400' :
                              t.type === 'expense' ? 'text-gray-900 dark:text-gray-100' : 'text-blue-600 dark:text-blue-400'
                              }`}>
                              {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}
                              {formatCurrency(Math.abs(t.amount))}
                            </p>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                            <p>{t.category?.name || 'Non catégorisé'}</p>
                            <p>{new Date(t.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="p-4 text-center border-t border-gray-100 dark:border-gray-800">
                      <Link
                        href={`/transactions?accountId=${viewingAccount.id}`}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm flex items-center justify-center gap-1"
                      >
                        Voir tout l'historique <ArrowUp className="w-3 h-3 rotate-45" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* Confirmation suppression */}
      {
        confirmDeleteOpen && editingAccount && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isDeleting && setConfirmDeleteOpen(false)}></div>
            <div className="relative bg-white dark:bg-gray-900 border-2 border-red-200 dark:border-red-800 rounded-2xl shadow-2xl max-w-md w-full p-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <span className="text-3xl">🗑️</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-gray-100 text-center">Supprimer ce compte ?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 text-center">
                Cette action est irréversible. Toutes les données associées au compte <span className="font-semibold">« {editingAccount.name} »</span> seront supprimées.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setConfirmDeleteOpen(false)}
                  disabled={isDeleting}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60 font-medium transition-all duration-200"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmDeleteAccount}
                  disabled={isDeleting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 disabled:opacity-60 font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {isDeleting ? 'Suppression…' : 'Je confirme la suppression'}
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  )
}
