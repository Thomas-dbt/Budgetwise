'use client'

import { useEffect, useState, useMemo } from 'react'
import { authFetch } from '@/lib/auth-fetch'

interface Account {
  id: string
  name: string
  bank: string | null
  type: string
  balance: number
  createdAt: string
  updatedAt: string
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

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showBalance, setShowBalance] = useState(true)
  const [showModal, setShowModal] = useState(false)
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
    balance: '0'
  })

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/accounts/page.tsx:30',message:'AccountsPage: Component mounted',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/accounts/page.tsx:33',message:'AccountsPage: Component unmounting',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/accounts/page.tsx:65',message:'fetchAccounts: Starting',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const response = await authFetch('/api/accounts')
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/accounts/page.tsx:68',message:'fetchAccounts: Response received',data:{ok:response.ok,status:response.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`)
      }
      const data = await response.json()
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/accounts/page.tsx:73',message:'fetchAccounts: Data parsed',data:{accountsCount:data?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      setAccounts(data)
      setLoading(false)
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/accounts/page.tsx:77',message:'fetchAccounts: Error caught',data:{errorMessage:error instanceof Error ? error.message : String(error),errorName:error instanceof Error ? error.name : 'Unknown'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      console.error('Error fetching accounts:', error)
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      bankType: availableBanks[0] || BANK_OPTIONS[0],
      customBank: '',
      type: 'checking',
      balance: '0'
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
      balance: String(account.balance ?? 0)
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
      balance: parseFloat(formData.balance) || 0
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((account) => {
            const isBlurred = blurredAccounts.has(account.id)
            const accountTypeColors: Record<string, string> = {
              'checking': 'from-blue-500 to-cyan-500',
              'savings': 'from-green-500 to-emerald-500',
              'credit': 'from-orange-500 to-red-500',
              'cash': 'from-gray-500 to-slate-500'
            }
            const gradient = accountTypeColors[account.type] || 'from-gray-500 to-slate-500'
            
            return (
              <div
                key={account.id}
                className="group bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-xl transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg, var(--tw-gradient-stops))', '--tw-gradient-from': 'rgb(59 130 246)', '--tw-gradient-to': 'rgb(147 51 234)' } as React.CSSProperties}></div>
                
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
                          <span className="text-2xl">
                            {account.type === 'checking' ? '💳' : account.type === 'savings' ? '💰' : account.type === 'credit' ? '💳' : '💵'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100 truncate">{account.name}</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{renderBankName(account)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleBlur(account.id)}
                        className="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-110"
                        title={isBlurred ? 'Afficher le solde' : 'Masquer le solde'}
                      >
                        <span className="text-lg">{isBlurred ? '👁️' : '👁️'}</span>
                      </button>
                      <button
                        onClick={() => openEditModal(account)}
                        className="w-9 h-9 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all duration-200 hover:scale-110"
                        title="Modifier le compte"
                      >
                        <span className="text-lg">⚙️</span>
                      </button>
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
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de création/édition de compte */}
      {showModal && (
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
      )}

      {/* Message d'erreur global */}
      {errorMessage && (
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
      )}

      {/* Confirmation suppression */}
      {confirmDeleteOpen && editingAccount && (
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
      )}
    </div>
  )
}
