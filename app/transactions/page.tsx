'use client'

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { useToast } from '@/components/toast'

interface Transaction {
  id: string
  amount: number
  type: 'income' | 'expense' | 'transfer'
  date: string
  description: string | null
  category: { id: string; name: string; emoji: string | null } | null
  subCategory: { id: string; name: string } | null
  account: { id: string; name: string }
  toAccount?: { id: string; name: string } | null
  attachment: string | null
  pending: boolean
  transferGroupId?: string | null
  transferMeta?: {
    fromId: string
    toId?: string | null
    fromAccountId: string
    toAccountId?: string | null
    fromAccountName: string
    toAccountName?: string | null
    fromDescription?: string | null
    toDescription?: string | null
  }
}

interface AccountOption {
  id: string
  name: string
}

interface CategoryOption {
  id: string
  name: string
  emoji: string | null
}

interface SubCategoryOption {
  id: string
  name: string
  categoryId: string
  category: CategoryOption
}

interface ParsedImportRow {
  id: number
  rawDate: string
  rawDescription: string
  rawAmount: string
  rawType: string
  rawCategory: string
  rawCategoryParent: string
  rawPending: string
  valid: boolean
  parsedDate?: string
  parsedAmount?: number
  parsedType?: Transaction['type']
  parsedPending?: boolean
  parsedCategoryId?: string
  error?: string
  overrideDescription?: string
  overrideDate?: string
  overrideAmount?: number
  overrideType?: Transaction['type']
  overrideCategoryId?: string
}

const categoryColors: Record<string, string> = {
  'Alimentation': 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800',
  'Transport': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
  'Logement': 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800',
  'Loisirs': 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/20 dark:text-pink-300 dark:border-pink-800',
  'Santé': 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
  'Shopping': 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800',
  'Abonnements': 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800',
  'Énergie': 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
  'Assurances': 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-800',
  'Voyages': 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-800',
  'Épargne & investissement': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
  'Autres': 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700'
}

const TYPE_LABELS: Record<Transaction['type'], string> = {
  income: 'Revenu',
  expense: 'Dépense',
  transfer: 'Transfert'
}

const DEFAULT_DATE = () => new Date().toISOString().slice(0, 10)

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterOption, setFilterOption] = useState<'all' | 'income' | 'expense' | 'transfer' | 'pending' | `category:${string}`>('all')
  const [filterStartDate, setFilterStartDate] = useState<string | null>(null)
  const [filterEndDate, setFilterEndDate] = useState<string | null>(null)

  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [subCategories, setSubCategories] = useState<SubCategoryOption[]>([])
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showNewSubCategoryInput, setShowNewSubCategoryInput] = useState(false)
  const [newSubCategoryName, setNewSubCategoryName] = useState('')

  const [manualModalOpen, setManualModalOpen] = useState(false)
  const [manualLoading, setManualLoading] = useState(false)
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null)
  type ManualFormState = {
    accountId: string
    type: Transaction['type']
    amount: string
    date: string
    description: string
    categoryId: string
    subCategoryId: string
    pending: boolean
    attachment: string | null
    attachmentName: string
    transferAccountId: string
    transferGroupId: string | null
  }

  const [manualForm, setManualForm] = useState<ManualFormState>({
    accountId: '',
    type: 'expense',
    amount: '',
    date: DEFAULT_DATE(),
    description: '',
    categoryId: '',
    subCategoryId: '',
    pending: false,
    attachment: null,
    attachmentName: '',
    transferAccountId: '',
    transferGroupId: null
  })

  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importAccountId, setImportAccountId] = useState('')
  const [importRows, setImportRows] = useState<ParsedImportRow[]>([])
  const [importFileName, setImportFileName] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [importLoading, setImportLoading] = useState(false)

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [attachmentPreview, setAttachmentPreview] = useState<{ url: string; title: string } | null>(null)
  const [clearingTransactions, setClearingTransactions] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportStartDate, setExportStartDate] = useState(() => {
    const start = new Date()
    start.setMonth(start.getMonth() - 1)
    return start.toISOString().slice(0, 10)
  })
  const [exportEndDate, setExportEndDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [exportFormat, setExportFormat] = useState<'pdf' | 'xlsx'>('xlsx')
  const [exportAccountId, setExportAccountId] = useState<string>('all')
  const [exportAccounts, setExportAccounts] = useState<Array<{ id: string; name: string }>>([])
  const [exportAccountsLoading, setExportAccountsLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const { toast } = useToast()
  const [importRowEditor, setImportRowEditor] = useState<{
    id: number
    description: string
    date: string
    amount: string
    type: Transaction['type']
    categoryId: string
    pending: boolean
    error?: string
  } | null>(null)

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  useEffect(() => {
    fetchAllData()
  }, [])

  // Auto-categorization suggestion
  useEffect(() => {
    const checkSuggestion = async () => {
      if (!manualForm.description || manualForm.description.length < 3) return
      // Only suggest if no category is selected yet
      if (manualForm.categoryId) return

      try {
        const response = await authFetch('/api/categories/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: manualForm.description })
        })

        if (response.ok) {
          const data = await response.json()
          if (data.match) {
            setManualForm(prev => {
              // If user already selected a category while request was in flight, don't overwrite
              if (prev.categoryId) return prev

              const isSubCategory = !!data.match.parentId
              return {
                ...prev,
                categoryId: isSubCategory ? data.match.parentId : data.match.id,
                subCategoryId: isSubCategory ? data.match.id : ''
              }
            })

            // Optional: Show toast or feedback?
            // toast('Catégorie suggérée : ' + data.match.name)
          }
        }
      } catch (err) {
        console.error('Suggestion error', err)
      }
    }

    const timeoutId = setTimeout(checkSuggestion, 500)
    return () => clearTimeout(timeoutId)
  }, [manualForm.description, manualForm.categoryId])

  useEffect(() => {
    if (!exportOpen || exportAccountsLoading || exportAccounts.length > 0) {
      return
    }

    setExportAccountsLoading(true)
    authFetch('/api/accounts')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Erreur ${res.status}`)
        }
        return res.json()
      })
      .then((list) => {
        setExportAccounts(list.map((account: { id: string; name: string }) => ({ id: account.id, name: account.name })))
      })
      .catch((error) => {
        console.error('Erreur chargement comptes export', error)
        setExportError('Impossible de charger la liste des comptes.')
      })
      .finally(() => setExportAccountsLoading(false))
  }, [exportOpen, exportAccountsLoading, exportAccounts.length])

  const closeExportModal = () => {
    setExportOpen(false)
    setExportError(null)
    setExportLoading(false)
  }

  const handleExportSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (exportStartDate && exportEndDate) {
      const start = new Date(exportStartDate)
      const end = new Date(exportEndDate)
      if (start > end) {
        setExportError('La date de début doit être avant la date de fin.')
        return
      }
    }

    setExportLoading(true)
    setExportError(null)

    try {
      const params = new URLSearchParams()
      params.set('format', exportFormat)
      if (exportStartDate) params.set('start', exportStartDate)
      if (exportEndDate) params.set('end', exportEndDate)
      if (exportAccountId && exportAccountId !== 'all') params.set('accountId', exportAccountId)

      const response = await authFetch(`/api/transactions/export?${params.toString()}`)
      if (!response.ok) {
        let message = 'Export impossible.'
        try {
          const payload = await response.json()
          if (payload?.error) {
            message = payload.error
          }
        } catch {
          // ignore json parse errors
        }
        setExportError(message)
        return
      }

      const blob = await response.blob()
      const extension = exportFormat === 'pdf' ? 'pdf' : 'xlsx'
      const filename = `budgetwise-export-${exportStartDate || 'all'}-${exportEndDate || 'all'}.${extension}`
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast('Export téléchargé.')
      closeExportModal()
    } catch (error) {
      console.error('Erreur export téléchargé', error)
      setExportError('Une erreur est survenue pendant le téléchargement.')
    } finally {
      setExportLoading(false)
    }
  }

  const fetchAllData = async () => {
    setLoading(true)
    await Promise.all([fetchTransactions(), fetchAccounts(), fetchCategories(), fetchSubCategories()])
    setLoading(false)
  }
  const handleClearTransactions = async () => {
    if (clearingTransactions) return
    const confirmed = window.confirm('Supprimer toutes les transactions pour vos tests ? Cette action est irréversible.')
    if (!confirmed) return
    setClearingTransactions(true)
    try {
      const response = await authFetch('/api/transactions/clear', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      if (!response.ok) {
        const raw = await response.text()
        let message = raw
        if (raw) {
          try {
            const parsed = JSON.parse(raw)
            message = parsed.error || raw
          } catch {
            message = raw
          }
        }
        throw new Error(message || 'Impossible de supprimer les transactions.')
      }
      const result = await response.json()
      setFeedback({ type: 'success', message: `${result.cleared} transaction(s) supprimée(s).` })
      await fetchAllData()
    } catch (error: any) {
      console.error('Clear transactions error', error)
      setFeedback({ type: 'error', message: error.message || 'Impossible de supprimer les transactions.' })
    } finally {
      setClearingTransactions(false)
    }
  }

  const openImportRowEditor = (row: ParsedImportRow) => {
    const fallbackRawAmount = (() => {
      const cleaned = row.rawAmount.replace(/\s/g, '').replace(',', '.')
      const parsed = Number(cleaned)
      return Number.isNaN(parsed) ? 0 : parsed
    })()
    const effectiveAmount = resolveRowAmount(row)
    const baseAmount = effectiveAmount !== undefined ? effectiveAmount : fallbackRawAmount
    const amountDisplay = String(Math.abs(baseAmount))
    const baseDate = resolveRowDate(row) || normalizeDate(row.rawDate) || DEFAULT_DATE()
    setImportRowEditor({
      id: row.id,
      description: resolveRowDescription(row),
      date: baseDate,
      amount: amountDisplay,
      type: resolveRowType(row) || (baseAmount < 0 ? 'expense' : 'income'),
      categoryId: resolveRowCategoryId(row) || '',
      pending: resolveRowPending(row),
    })
  }

  const closeImportRowEditor = () => {
    setImportRowEditor(null)
  }

  const saveImportRowEditor = () => {
    if (!importRowEditor) return
    const normalizedAmount = Number(importRowEditor.amount.replace(',', '.'))
    if (Number.isNaN(normalizedAmount) || normalizedAmount <= 0) {
      setImportRowEditor(prev => prev ? { ...prev, error: 'Montant invalide' } : prev)
      return
    }
    if (!importRowEditor.date) {
      setImportRowEditor(prev => prev ? { ...prev, error: 'Date manquante' } : prev)
      return
    }
    const parsedDate = new Date(importRowEditor.date)
    if (Number.isNaN(parsedDate.getTime())) {
      setImportRowEditor(prev => prev ? { ...prev, error: 'Date invalide' } : prev)
      return
    }

    let signedAmount = normalizedAmount
    if (importRowEditor.type === 'expense' && signedAmount > 0) {
      signedAmount = -Math.abs(normalizedAmount)
    } else if (importRowEditor.type === 'income' && signedAmount < 0) {
      signedAmount = Math.abs(normalizedAmount)
    }

    setImportRows(prev =>
      prev.map(row => {
        if (row.id !== importRowEditor.id) return row
        return {
          ...row,
          overrideDescription: importRowEditor.description,
          overrideDate: importRowEditor.date,
          overrideAmount: signedAmount,
          overrideType: importRowEditor.type,
          overrideCategoryId: importRowEditor.categoryId || undefined,
          parsedCategoryId: importRowEditor.categoryId || row.parsedCategoryId,
          parsedPending: importRowEditor.pending,
          valid: true,
          error: undefined,
        }
      })
    )
    setImportRowEditor(null)
  }

  const handleInlineCategoryChange = (rowId: number, categoryId: string) => {
    setImportRows(prev =>
      prev.map(row => {
        if (row.id !== rowId) return row
        if (!categoryId) {
          return {
            ...row,
            overrideCategoryId: undefined,
            parsedCategoryId: undefined,
          }
        }
        return {
          ...row,
          overrideCategoryId: categoryId,
          parsedCategoryId: categoryId,
        }
      })
    )
  }


  const fetchTransactions = async () => {
    try {
      const response = await authFetch('/api/transactions?take=200')
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`)
      }
      const data = await response.json()
      setTransactions(
        data.map((tx: any) => ({
          id: tx.id,
          amount: Number(tx.amount),
          type: tx.type,
          date: tx.date,
          description: tx.description,
          category: tx.category,
          subCategory: tx.subCategory || null,
          account: tx.account,
          toAccount: tx.toAccount || null,
          attachment: tx.attachment || null,
          pending: !!tx.pending,
          transferGroupId: tx.transferGroupId || null,
        }))
      )
    } catch (error) {
      console.error('Error fetching transactions:', error)
      setFeedback({ type: 'error', message: 'Impossible de charger les transactions.' })
    }
  }

  const fetchAccounts = async () => {
    try {
      const response = await authFetch('/api/accounts')
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`)
      }
      const data = await response.json()
      setAccounts(data.map((acc: any) => ({ id: acc.id, name: acc.name })))
    } catch (error) {
      console.error('Error fetching accounts:', error)
      setFeedback({ type: 'error', message: 'Impossible de charger la liste des comptes.' })
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await authFetch('/api/categories')
      if (!response.ok) {
        let errorMessage = `Erreur ${response.status}`
        try {
          const errorData = await response.json()
          if (errorData?.error) {
            errorMessage = errorData.error
          }
        } catch {
          // Ignore JSON parse errors
        }
        throw new Error(errorMessage)
      }
      const data = await response.json()
      if (Array.isArray(data)) {
        setCategories(data)
      } else {
        throw new Error('Format de données invalide')
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      setFeedback({
        type: 'error',
        message: `Impossible de charger les catégories: ${errorMessage}`
      })
    }
  }

  const fetchSubCategories = async (categoryId?: string) => {
    try {
      const url = categoryId
        ? `/api/subcategories?categoryId=${categoryId}`
        : '/api/subcategories'
      const response = await authFetch(url)
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`)
      }
      const data = await response.json()
      if (Array.isArray(data)) {
        setSubCategories(data)
        return data
      }
      return []
    } catch (error) {
      console.error('Error fetching subcategories:', error)
      // Ne pas afficher d'erreur si les sous-catégories ne sont pas disponibles
      return []
    }
  }

  useEffect(() => {
    if (accounts.length > 0) {
      setManualForm(prev => prev.accountId ? prev : { ...prev, accountId: accounts[0].id })
      setImportAccountId(prev => prev || accounts[0].id)
    }
  }, [accounts])

  useEffect(() => {
    if (categories.length > 0) {
      setManualForm(prev => prev.categoryId ? prev : { ...prev, categoryId: categories[0].id })
    }
  }, [categories])

  useEffect(() => {
    if (manualForm.categoryId) {
      fetchSubCategories(manualForm.categoryId).then((fetchedSubCategories) => {
        // Vérifier si la sous-catégorie actuelle appartient toujours à la nouvelle catégorie
        const currentSubCategory = fetchedSubCategories.find((sc: SubCategoryOption) => sc.id === manualForm.subCategoryId)
        if (manualForm.subCategoryId && (!currentSubCategory || currentSubCategory.categoryId !== manualForm.categoryId)) {
          // Réinitialiser la sous-catégorie seulement si elle n'appartient pas à la nouvelle catégorie
          setManualForm(prev => ({ ...prev, subCategoryId: '' }))
          setShowNewSubCategoryInput(false)
          setNewSubCategoryName('')
        }
      })
    }
  }, [manualForm.categoryId])

  const createCategory = async (name: string) => {
    try {
      const response = await authFetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Erreur ${response.status}`)
      }
      const newCategory = await response.json()
      setCategories(prev => [...prev, newCategory])
      setManualForm(prev => ({ ...prev, categoryId: newCategory.id }))
      setShowNewCategoryInput(false)
      setNewCategoryName('')
      return newCategory
    } catch (error) {
      console.error('Error creating category:', error)
      throw error
    }
  }

  const createSubCategory = async (name: string, categoryId: string) => {
    try {
      const response = await authFetch('/api/subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, categoryId }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Erreur ${response.status}`)
      }
      const newSubCategory = await response.json()
      setSubCategories(prev => [...prev, newSubCategory])
      setManualForm(prev => ({ ...prev, subCategoryId: newSubCategory.id }))
      setShowNewSubCategoryInput(false)
      setNewSubCategoryName('')
      return newSubCategory
    } catch (error) {
      console.error('Error creating subcategory:', error)
      throw error
    }
  }

  useEffect(() => {
    if (importRows.length === 0) {
      return
    }
    setImportRows(prev => {
      let changed = false
      const next = prev.map(row => {
        if (row.overrideCategoryId) return row
        const guessed = guessCategoryId(row)
        if (guessed && guessed !== row.parsedCategoryId) {
          changed = true
          return { ...row, parsedCategoryId: guessed }
        }
        return row
      })
      return changed ? next : prev
    })
  }, [categories])

  const categoryNameMap = useMemo(() => {
    const map = new Map<string, string>()
    categories.forEach(cat => {
      map.set(cat.name.toLowerCase(), cat.id)
    })
    return map
  }, [categories])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Math.abs(amount))
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
    const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
    return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
  }

  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const startDate = filterStartDate ? new Date(filterStartDate) : null
    const endDate = filterEndDate ? new Date(filterEndDate) : null
    if (endDate) {
      endDate.setHours(23, 59, 59, 999)
    }

    return transactions.filter((tx) => {
      const matchesSearch =
        !query ||
        tx.description?.toLowerCase().includes(query) ||
        tx.account.name.toLowerCase().includes(query) ||
        tx.toAccount?.name.toLowerCase().includes(query) ||
        tx.category?.name.toLowerCase().includes(query)
      if (!matchesSearch) return false

      const txDate = new Date(tx.date)
      if (startDate && txDate < startDate) return false
      if (endDate && txDate > endDate) return false

      let matchesFilter = true
      if (filterOption === 'income') matchesFilter = tx.type === 'income'
      else if (filterOption === 'expense') matchesFilter = tx.type === 'expense'
      else if (filterOption === 'transfer') matchesFilter = tx.type === 'transfer'
      else if (filterOption === 'pending') matchesFilter = tx.pending === true
      else if (typeof filterOption === 'string' && filterOption.startsWith('category:')) {
        const categoryId = filterOption.split(':')[1]
        matchesFilter = tx.category?.id === categoryId
      }

      return matchesFilter
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [transactions, searchQuery, filterOption, filterStartDate, filterEndDate])

  const groupedTransactions = useMemo(() => {
    return filteredTransactions.reduce((groups, tx) => {
      const date = formatDate(tx.date)
      if (!groups[date]) groups[date] = []
      groups[date].push(tx)
      return groups
    }, {} as Record<string, Transaction[]>)
  }, [filteredTransactions])

  const openManualModal = () => {
    const defaultAccountId = manualForm.accountId || accounts[0]?.id || ''
    setManualForm({
      accountId: defaultAccountId,
      type: 'expense',
      amount: '',
      date: DEFAULT_DATE(),
      description: '',
      categoryId: categories[0]?.id || '',
      subCategoryId: '',
      pending: false,
      attachment: null,
      attachmentName: '',
      transferAccountId: accounts.find(acc => acc.id !== defaultAccountId)?.id || '',
      transferGroupId: null
    })
    setEditingTransactionId(null)
    setShowNewCategoryInput(false)
    setNewCategoryName('')
    setShowNewSubCategoryInput(false)
    setNewSubCategoryName('')
    setManualModalOpen(true)
  }

  const openEditModal = async (tx: Transaction) => {
    const categoryId = tx.category?.id || ''
    const subCategoryId = tx.subCategory?.id || ''

    // Charger les sous-catégories avant de définir le formulaire
    if (categoryId) {
      await fetchSubCategories(categoryId)
    }

    const defaultTransfer = tx.toAccount?.id || accounts.find((acc) => acc.id !== tx.account.id)?.id || ''

    setManualForm({
      accountId: tx.account.id,
      type: tx.type,
      amount: String(Math.abs(tx.amount)),
      date: tx.date.slice(0, 10),
      description: tx.description || '',
      categoryId,
      subCategoryId,
      pending: tx.pending,
      attachment: tx.attachment || null,
      attachmentName: tx.attachment ? 'Justificatif' : '',
      transferAccountId: tx.type === 'transfer' ? defaultTransfer : '',
      transferGroupId: null,
    })
    setEditingTransactionId(tx.id)
    setManualModalOpen(true)
  }

  const handleManualSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!manualForm.accountId) {
      setFeedback({ type: 'error', message: 'Veuillez choisir un compte.' })
      return
    }
    const normalizedAmount = Number(manualForm.amount.toString().replace(',', '.'))
    if (!manualForm.amount || Number.isNaN(normalizedAmount) || normalizedAmount === 0) {
      setFeedback({ type: 'error', message: 'Veuillez indiquer un montant valide.' })
      return
    }
    if (manualForm.pending && manualForm.type === 'income') {
      setFeedback({ type: 'error', message: 'Le statut "en attente" n\'est disponible que pour les dépenses et transferts.' })
      return
    }
    if (manualForm.type === 'transfer' && (!manualForm.transferAccountId || manualForm.transferAccountId === manualForm.accountId)) {
      setFeedback({ type: 'error', message: 'Sélectionnez un compte de destination différent.' })
      return
    }

    setManualLoading(true)
    try {
      if (manualForm.type === 'transfer') {
        const response = await authFetch('/api/transactions', {
          method: 'POST',
          body: JSON.stringify({
            accountId: manualForm.accountId,
            toAccountId: manualForm.transferAccountId,
            amount: normalizedAmount,
            type: 'transfer',
            date: manualForm.date,
            description: manualForm.description || null,
            categoryId: manualForm.categoryId || null,
            subCategoryId: manualForm.subCategoryId || null,
            pending: manualForm.pending,
            attachment: manualForm.attachment || null,
          })
        })
        if (!response.ok) {
          const raw = await response.text()
          let message = raw
          if (raw) {
            try {
              const parsed = JSON.parse(raw)
              message = parsed.error || raw
            } catch {
              message = raw
            }
          } else {
            message = `Erreur ${response.status}`
          }
          throw new Error(message || "Impossible d'ajouter le transfert.")
        }
      } else {
        const response = await authFetch('/api/transactions', {
          method: 'POST',
          body: JSON.stringify({
            accountId: manualForm.accountId,
            amount: normalizedAmount,
            type: manualForm.type,
            date: manualForm.date,
            description: manualForm.description || null,
            categoryId: manualForm.categoryId || null,
            subCategoryId: manualForm.subCategoryId || null,
            pending: manualForm.pending,
            attachment: manualForm.attachment || null
          })
        })

        if (!response.ok) {
          const raw = await response.text()
          let message = raw
          if (raw) {
            try {
              const parsed = JSON.parse(raw)
              message = parsed.error || raw
            } catch {
              message = raw
            }
          } else {
            message = `Erreur ${response.status}`
          }
          console.error('Manual transaction failed', response.status, message)
          throw new Error(message || "Impossible d'ajouter la transaction")
        }
      }

      setManualModalOpen(false)
      setShowNewCategoryInput(false)
      setNewCategoryName('')
      setShowNewSubCategoryInput(false)
      setNewSubCategoryName('')
      setFeedback({ type: 'success', message: 'Transaction ajoutée avec succès.' })
      fetchTransactions()
      // Déclencher un événement pour actualiser les comptes
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('accounts-refresh'))
      }
    } catch (error: any) {
      console.error('Manual transaction error', error)
      setFeedback({ type: 'error', message: error.message || "Impossible d'ajouter la transaction." })
    } finally {
      setManualLoading(false)
    }
  }

  const handleManualUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingTransactionId) {
      return handleManualSubmit(event)
    }

    const normalizedAmount = Number(manualForm.amount.toString().replace(',', '.'))
    if (Number.isNaN(normalizedAmount) || normalizedAmount === 0) {
      setFeedback({ type: 'error', message: 'Veuillez indiquer un montant valide.' })
      return
    }

    if (manualForm.type === 'transfer' && (!manualForm.transferAccountId || manualForm.transferAccountId === manualForm.accountId)) {
      setFeedback({ type: 'error', message: 'Sélectionnez un compte de destination différent.' })
      return
    }

    setManualLoading(true)
    try {
      if (manualForm.type === 'transfer') {
        const response = await authFetch(`/api/transactions/${editingTransactionId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            accountId: manualForm.accountId,
            toAccountId: manualForm.transferAccountId,
            amount: normalizedAmount,
            type: 'transfer',
            date: manualForm.date,
            description: manualForm.description || null,
            categoryId: manualForm.categoryId || null,
            subCategoryId: manualForm.subCategoryId || null,
            pending: manualForm.pending,
            attachment: manualForm.attachment || null,
          }),
        })
        if (!response.ok) {
          const raw = await response.text()
          let message = raw
          if (raw) {
            try {
              const parsed = JSON.parse(raw)
              message = parsed.error || raw
            } catch {
              message = raw
            }
          }
          throw new Error(message || 'Impossible de modifier le transfert')
        }
      } else {
        const response = await authFetch(`/api/transactions/${editingTransactionId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            accountId: manualForm.accountId,
            amount: normalizedAmount,
            type: manualForm.type,
            date: manualForm.date,
            description: manualForm.description || null,
            categoryId: manualForm.categoryId || null,
            subCategoryId: manualForm.subCategoryId || null,
            pending: manualForm.pending,
            attachment: manualForm.attachment || null,
          }),
        })

        if (!response.ok) {
          const raw = await response.text()
          let message = raw
          if (raw) {
            try {
              const parsed = JSON.parse(raw)
              message = parsed.error || raw
            } catch {
              message = raw
            }
          }
          throw new Error(message || 'Impossible de modifier la transaction')
        }
      }

      setManualModalOpen(false)
      setShowNewCategoryInput(false)
      setNewCategoryName('')
      setShowNewSubCategoryInput(false)
      setNewSubCategoryName('')
      setEditingTransactionId(null)
      setFeedback({ type: 'success', message: 'Transaction mise à jour.' })
      fetchTransactions()
      // Déclencher un événement pour actualiser les comptes
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('accounts-refresh'))
      }
    } catch (error: any) {
      console.error('Manual transaction update error', error)
      setFeedback({ type: 'error', message: error.message || 'Impossible de modifier la transaction.' })
    } finally {
      setManualLoading(false)
    }
  }

  const submitManualForm = (event: FormEvent<HTMLFormElement>) => {
    if (editingTransactionId) {
      handleManualUpdate(event)
    } else {
      handleManualSubmit(event)
    }
  }

  const handleDeleteTransaction = async () => {
    if (!transactionToDelete) return
    try {
      const response = await authFetch(`/api/transactions/${transactionToDelete.id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const raw = await response.text()
        let message = raw
        if (raw) {
          try {
            const parsed = JSON.parse(raw)
            message = parsed.error || raw
          } catch {
            message = raw
          }
        }
        throw new Error(message || 'Impossible de supprimer la transaction')
      }
      setDeleteModalOpen(false)
      setTransactionToDelete(null)
      fetchTransactions()
      // Déclencher un événement pour actualiser les comptes
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('accounts-refresh'))
      }
    } catch (error: any) {
      console.error('Transaction delete error', error)
      setFeedback({ type: 'error', message: error.message || 'Impossible de supprimer la transaction.' })
    }
  }

  const splitCsvLine = (line: string, delimiter: string) => {
    const cells: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
        continue
      }

      if (char === delimiter && !inQuotes) {
        cells.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }

    cells.push(current.trim())
    return cells.map(cell => cell.replace(/^"(.*)"$/, '$1').trim())
  }

  const normalizeDate = (value: string): string | null => {
    const trimmed = value.trim()
    if (!trimmed) return null

    const frenchMatch = trimmed.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})$/)
    if (frenchMatch) {
      const [, day, month, year] = frenchMatch
      const normalizedYear = year.length === 2 ? (Number(year) > 70 ? `19${year}` : `20${year}`) : year.padStart(4, '0')
      const iso = `${normalizedYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      const candidate = new Date(iso)
      if (!Number.isNaN(candidate.getTime())) return iso
    }

    const isoCandidate = new Date(trimmed)
    if (!Number.isNaN(isoCandidate.getTime())) {
      return isoCandidate.toISOString().slice(0, 10)
    }

    return null
  }

  const normalizeType = (rawType: string, amount?: number): Transaction['type'] | null => {
    const normalized = rawType.trim().toLowerCase()
    if (['income', 'entrée', 'credit', 'crédit', 'revenu'].includes(normalized)) return 'income'
    if (['expense', 'dépense', 'debit', 'débit', 'sortie'].includes(normalized)) return 'expense'
    if (['transfer', 'transfert', 'virement'].includes(normalized)) return 'transfer'
    if (amount !== undefined) {
      if (amount < 0) return 'expense'
      if (amount > 0) return 'income'
    }
    return null
  }

  const parsePending = (value: string): boolean => {
    const normalized = value.trim().toLowerCase()
    if (!normalized) return false
    return ['true', 'pending', 'en attente', 'oui', 'yes', 'y', '1'].includes(normalized)
  }

  const parseCsvContent = (text: string): ParsedImportRow[] => {
    const trimmed = text.replace(/\r/g, '').trim()
    if (!trimmed) return []

    const delimiter = trimmed.includes(';') && (!trimmed.includes(',') || trimmed.indexOf(';') < trimmed.indexOf(',')) ? ';' : ','
    const lines = trimmed.split('\n').filter(line => line.trim().length > 0)
    if (lines.length < 2) return []

    const headerCells = splitCsvLine(lines[0], delimiter)
    const headers = headerCells.map(header => header.trim().toLowerCase())
    const dateIndexes = headers
      .map((h, idx) => ({ h, idx }))
      .filter(({ h }) =>
        ['date', 'date operation', 'dateoperation', 'date op', 'opdate', 'dateop', 'dateval', 'date val', 'date valeur', 'date valeur', 'date value', 'datevaleur'].includes(h)
      )
      .map(({ idx }) => idx)
    if (dateIndexes.length === 0) {
      dateIndexes.push(0)
    }
    const descriptionIndex = headers.findIndex(h => ['description', 'libelle', 'libellé', 'memo', 'label'].includes(h))
    const amountIndex = headers.findIndex(h => ['amount', 'montant', 'total', 'amounteur', 'montant eur'].includes(h))
    const typeIndex = headers.findIndex(h => ['type', 'category type', 'sens'].includes(h))
    const categoryIndex = headers.findIndex(h => ['category', 'categorie', 'catégorie'].includes(h))
    const categoryParentIndex = headers.findIndex(h => ['categoryparent', 'categorie parent', 'category parent', 'categoriepar', 'categoryparent', 'category parent name'].includes(h))
    const pendingIndex = headers.findIndex(h => ['pending', 'statut'].includes(h))

    return lines.slice(1).map((line, idx) => {
      const cols = splitCsvLine(line, delimiter)
      const row: ParsedImportRow = {
        id: idx + 1,
        rawDate: (() => {
          for (const idx of dateIndexes) {
            if (typeof cols[idx] === 'string' && cols[idx].trim()) {
              return cols[idx].trim()
            }
          }
          return ''
        })(),
        rawDescription: (cols[descriptionIndex] || '').trim(),
        rawAmount: (cols[amountIndex] || '').trim(),
        rawType: (cols[typeIndex] || '').trim(),
        rawCategory: categoryIndex >= 0 ? (cols[categoryIndex] || '').trim() : '',
        rawCategoryParent: categoryParentIndex >= 0 ? (cols[categoryParentIndex] || '').trim() : '',
        rawPending: pendingIndex >= 0 ? (cols[pendingIndex] || '').trim() : '',
        valid: true
      }

      const normalizedAmount = row.rawAmount.replace(/\s/g, '').replace(',', '.')
      const parsedAmount = normalizedAmount ? Number(normalizedAmount) : NaN
      if (Number.isNaN(parsedAmount) || parsedAmount === 0) {
        row.valid = false
        row.error = 'Montant invalide'
        return row
      }

      const parsedDate = normalizeDate(row.rawDate)
      if (!parsedDate) {
        row.valid = false
        row.error = 'Date invalide'
        return row
      }

      const parsedType = normalizeType(row.rawType, parsedAmount)
      if (!parsedType) {
        row.valid = false
        row.error = 'Type manquant ou inconnu'
        return row
      }

      row.parsedAmount = parsedAmount
      row.parsedDate = parsedDate
      row.parsedType = parsedType
      row.parsedPending = parsePending(row.rawPending)

      return row
    })
  }

  function guessCategoryId(row: ParsedImportRow): string | undefined {
    const abonnementsCategory = categories.find(cat => cat.name.toLowerCase().includes('abonn'))
    const textBlobs = [
      row.rawCategory,
      row.rawCategoryParent,
      row.rawDescription
    ]
      .filter(Boolean)
      .map(value => value.toLowerCase())

    const subscriptionKeywords = /(abonn|spotify|netflix|canal|prime video|primevideo|youtube|deezer|disney|molotov|salto|mycanal|itunes|apple music|playstation plus|xbox game pass|udemy|coursera|fit|basic fit|fitness park|club|assur mobile|forfait|box internet|freebox|bbox|livebox)/

    if (textBlobs.some(text => subscriptionKeywords.test(text))) {
      if (abonnementsCategory) {
        return abonnementsCategory.id
      }
    }

    if (row.rawCategory) {
      const key = row.rawCategory.toLowerCase()
      if (categoryNameMap.has(key)) return categoryNameMap.get(key)
    }
    if (row.rawCategoryParent) {
      const key = row.rawCategoryParent.toLowerCase()
      if (categoryNameMap.has(key)) return categoryNameMap.get(key)
    }
    return undefined
  }

  function resolveRowAmount(row: ParsedImportRow) {
    return row.overrideAmount !== undefined ? row.overrideAmount : row.parsedAmount
  }
  function resolveRowDate(row: ParsedImportRow) {
    return row.overrideDate || row.parsedDate
  }
  function resolveRowDescription(row: ParsedImportRow) {
    return row.overrideDescription || row.rawDescription
  }
  function resolveRowType(row: ParsedImportRow) {
    return row.overrideType || row.parsedType
  }
  function resolveRowCategoryId(row: ParsedImportRow) {
    return row.overrideCategoryId || row.parsedCategoryId
  }
  function resolveRowPending(row: ParsedImportRow) {
    return row.parsedPending ?? false
  }

  const handleImportFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImportFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = String(e.target?.result || '')
      const parsed = parseCsvContent(text)
      if (parsed.length === 0) {
        setImportError("Aucune donnée valide n'a été trouvée. Vérifiez le format du fichier.")
        setImportRows([])
      } else {
        setImportRows(parsed.map(row => ({
          ...row,
          parsedCategoryId: guessCategoryId(row)
        })))
        setImportError(null)
      }
    }
    reader.readAsText(file)
  }

  const handleImportSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!importAccountId) {
      setFeedback({ type: 'error', message: 'Veuillez sélectionner un compte destinataire.' })
      return
    }
    const validRows = importRows.filter(row => {
      const amount = resolveRowAmount(row)
      const date = resolveRowDate(row)
      const type = resolveRowType(row)
      return row.valid && amount !== undefined && !Number.isNaN(amount) && amount !== 0 && !!date && !!type
    })
    if (validRows.length === 0) {
      setFeedback({ type: 'error', message: 'Aucune ligne valide à importer.' })
      return
    }

    setImportLoading(true)
    try {
      const response = await authFetch('/api/transactions/import', {
        method: 'POST',
        body: JSON.stringify({
          accountId: importAccountId,
          rows: validRows.map(row => ({
            date: resolveRowDate(row),
            description: resolveRowDescription(row),
            amount: resolveRowAmount(row),
            type: resolveRowType(row),
            categoryId: resolveRowCategoryId(row),
            categoryName: row.rawCategory || row.rawCategoryParent || undefined,
            pending: resolveRowPending(row)
          }))
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Import impossible')
      }

      const result = await response.json()
      setImportModalOpen(false)
      setImportRows([])
      setImportFileName('')
      const importedCount = result.imported || 0
      const skippedCount = result.skipped || 0
      const totalCount = result.total || importedCount

      let message = `${importedCount} transaction${importedCount > 1 ? 's' : ''} importée${importedCount > 1 ? 's' : ''}`
      if (skippedCount > 0) {
        message += `. ${skippedCount} doublon${skippedCount > 1 ? 's' : ''} ignoré${skippedCount > 1 ? 's' : ''}`
      }
      setFeedback({ type: 'success', message })
      fetchTransactions()
    } catch (error: any) {
      console.error('Import error', error)
      setFeedback({ type: 'error', message: error.message || 'Import impossible.' })
    } finally {
      setImportLoading(false)
    }
  }

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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Transactions</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">Gérez vos revenus et dépenses</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="px-5 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 transition-all shadow-sm hover:shadow-md font-medium"
              onClick={() => {
                setExportOpen(true)
                setExportError(null)
              }}
            >
              <span className="text-lg">⬇</span>
              <span>Exporter</span>
            </button>
            <button
              className="px-5 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 transition-all shadow-sm hover:shadow-md font-medium"
              onClick={() => {
                setImportModalOpen(true)
                setImportRows([])
                setImportFileName('')
                setImportError(null)
              }}
            >
              <span className="text-lg">📄</span>
              <span>Importer relevé</span>
            </button>
            <button
              className="px-5 py-2.5 border border-red-300 text-red-600 dark:border-red-800 dark:text-red-300 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2 transition-all shadow-sm hover:shadow-md font-medium"
              onClick={handleClearTransactions}
              disabled={clearingTransactions}
            >
              <span className="text-lg">🧹</span>
              <span>{clearingTransactions ? 'Nettoyage...' : 'Tout supprimer (tests)'}</span>
            </button>
            <button
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 flex items-center gap-2 transition-all shadow-md hover:shadow-lg font-medium"
              onClick={openManualModal}
            >
              <span className="text-lg font-bold">+</span>
              <span>Ajouter manuellement</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-6 flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Rechercher une transaction (libellé, compte, catégorie)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all shadow-sm hover:shadow-md"
          />
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">🔍</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
          {/* Onglets de filtres améliorés */}
          <div className="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1 shadow-inner">
            <button
              onClick={() => setFilterOption('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterOption === 'all'
                  ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
            >
              Toutes
            </button>
            <button
              onClick={() => setFilterOption('income')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterOption === 'income'
                  ? 'bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
            >
              Revenus
            </button>
            <button
              onClick={() => setFilterOption('expense')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterOption === 'expense'
                  ? 'bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
            >
              Dépenses
            </button>
            <button
              onClick={() => setFilterOption('transfer')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterOption === 'transfer'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
            >
              Transferts
            </button>
            <button
              onClick={() => setFilterOption('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterOption === 'pending'
                  ? 'bg-white dark:bg-gray-700 text-yellow-600 dark:text-yellow-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
            >
              En attente
            </button>
          </div>

          {/* Sélecteur de catégorie amélioré */}
          {categories.length > 0 && (
            <div className="relative md:w-64">
              <select
                value={filterOption.startsWith('category:') ? filterOption : ''}
                onChange={(e) => {
                  const value = e.target.value
                  setFilterOption(value ? (value as `category:${string}`) : 'all')
                }}
                className="pl-4 pr-10 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 appearance-none transition-all shadow-sm hover:shadow-md"
              >
                <option value="">Filtrer par catégorie</option>
                {categories.map(cat => (
                  <option key={cat.id} value={`category:${cat.id}`}>
                    {cat.emoji ? `${cat.emoji} ` : ''}{cat.name}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">▼</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filterStartDate || ''}
              onChange={(e) => setFilterStartDate(e.target.value || null)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm w-full md:w-40 transition-all shadow-sm hover:shadow-md"
            />
            <span className="text-gray-500 dark:text-gray-400 font-medium">→</span>
            <input
              type="date"
              value={filterEndDate || ''}
              onChange={(e) => setFilterEndDate(e.target.value || null)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm w-full md:w-40 transition-all shadow-sm hover:shadow-md"
            />
            {(filterStartDate || filterEndDate) && (
              <button
                type="button"
                onClick={() => {
                  setFilterStartDate(null)
                  setFilterEndDate(null)
                }}
                className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="space-y-6">
        {Object.keys(groupedTransactions).length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Aucune transaction trouvée</p>
          </div>
        ) : (
          Object.entries(groupedTransactions).map(([date, txs]) => (
            <div key={date} className="mb-8">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent"></div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  {date}
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent"></div>
              </div>
              <div className="space-y-3">
                {txs.map((tx) => {
                  const isTransfer = tx.type === 'transfer'
                  const isExpense = tx.type === 'expense'
                  const isIncome = tx.type === 'income'
                  const amountColor = isTransfer
                    ? 'text-blue-600 dark:text-blue-400'
                    : isExpense
                      ? 'text-red-600 dark:text-red-400'
                      : isIncome
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-600 dark:text-gray-400'

                  const title = isTransfer
                    ? tx.description || `Transfert depuis ${tx.account.name} vers ${tx.toAccount?.name ?? ''}`
                    : tx.description || 'Transaction'

                  const subtitle = isTransfer
                    ? `${tx.account.name} → ${tx.toAccount?.name ?? ''}`
                    : tx.account.name

                  const iconSymbol = isTransfer ? '↔' : isExpense ? '↑' : '↓'
                  const iconBg = isTransfer
                    ? 'bg-blue-100 dark:bg-blue-900/30'
                    : isExpense
                      ? 'bg-red-100 dark:bg-red-900/30'
                      : 'bg-green-100 dark:bg-green-900/30'
                  const iconColor = isTransfer
                    ? 'text-blue-600'
                    : isExpense
                      ? 'text-red-600'
                      : 'text-green-600'

                  return (
                    <div
                      key={tx.id}
                      className="group bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-lg transition-all duration-200"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-sm ${iconBg} transition-transform group-hover:scale-110`}>
                          <span className={`text-2xl font-semibold ${iconColor}`}>
                            {iconSymbol}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-baseline gap-2 mb-2">
                            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 truncate max-w-xs sm:max-w-md">
                              {title}
                            </h3>
                            {!isTransfer && (
                              <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                • {subtitle}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="text-xs px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium border border-gray-200 dark:border-gray-700">
                              {isTransfer ? 'Transfert' : TYPE_LABELS[tx.type]}
                            </span>
                            {tx.pending && (
                              <span className="text-xs px-2.5 py-1 rounded-md bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800 font-medium">
                                ⏳ En attente
                              </span>
                            )}
                            {tx.category && (
                              <span className={`text-xs px-3 py-1 rounded-md font-medium border ${categoryColors[tx.category.name] || categoryColors['Autres']
                                }`}>
                                {tx.category.emoji ? `${tx.category.emoji} ` : ''}{tx.category.name}
                                {tx.subCategory && (
                                  <span className="ml-1.5 opacity-75">• {tx.subCategory.name}</span>
                                )}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <span>🏦</span>
                              {isTransfer ? subtitle : tx.account.name}
                            </span>
                          </div>
                        </div>

                        <div className="text-right space-y-2 flex-shrink-0">
                          <p className={`text-xl font-bold ${amountColor} tracking-tight`}>
                            {(isExpense || isTransfer) ? '-' : '+'}{formatCurrency(Math.abs(tx.amount))}
                          </p>
                          {tx.attachment && (
                            <button
                              onClick={() =>
                                setAttachmentPreview({
                                  url: tx.attachment as string,
                                  title: tx.description || 'Justificatif',
                                })
                              }
                              className="text-xs px-3 py-1.5 border border-purple-200 text-purple-600 dark:border-purple-800 dark:text-purple-300 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors font-medium"
                            >
                              📎 Justificatif
                            </button>
                          )}
                          <div className="flex gap-2 justify-end mt-3">
                            <button
                              onClick={() => openEditModal(tx)}
                              className="px-4 py-2 text-sm border border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors font-medium shadow-sm hover:shadow"
                            >
                              ✏️ Modifier
                            </button>
                            <button
                              onClick={() => {
                                setTransactionToDelete(tx)
                                setDeleteModalOpen(true)
                              }}
                              className="px-4 py-2 text-sm border border-red-200 text-red-600 dark:border-red-800 dark:text-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors font-medium shadow-sm hover:shadow"
                            >
                              🗑️ Supprimer
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Manual transaction modal */}
      {manualModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">{editingTransactionId ? 'Modifier la transaction' : 'Ajouter une transaction'}</h2>
              <button
                onClick={() => { setManualModalOpen(false) }}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            <form onSubmit={submitManualForm} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Compte *</label>
                  <select
                    value={manualForm.accountId}
                    onChange={(e) =>
                      setManualForm(prev => {
                        const nextAccount = e.target.value
                        const nextTransfer =
                          prev.type === 'transfer'
                            ? accounts.find(acc => acc.id !== nextAccount)?.id || ''
                            : prev.transferAccountId
                        return { ...prev, accountId: nextAccount, transferAccountId: nextTransfer }
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="" disabled>Choisissez un compte</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Type *</label>
                  <select
                    value={manualForm.type}
                    onChange={(e) =>
                      setManualForm(prev => {
                        const value = e.target.value as Transaction['type']
                        return {
                          ...prev,
                          type: value,
                          transferAccountId:
                            value === 'transfer'
                              ? accounts.find(acc => acc.id !== prev.accountId)?.id || ''
                              : '',
                          transferGroupId: value === 'transfer' ? prev.transferGroupId : null,
                        }
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="expense">Dépense</option>
                    <option value="income">Revenu</option>
                    <option value="transfer">Transfert</option>
                  </select>
                </div>
                {manualForm.type === 'transfer' && (
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-2">Compte destinataire *</label>
                    {accounts.filter(acc => acc.id !== manualForm.accountId).length === 0 ? (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        Créez un autre compte pour effectuer un transfert.
                      </p>
                    ) : (
                      <select
                        value={manualForm.transferAccountId}
                        onChange={(e) => setManualForm(prev => ({ ...prev, transferAccountId: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="" disabled>Sélectionnez le compte de destination</option>
                        {accounts.filter(acc => acc.id !== manualForm.accountId).map(acc => (
                          <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-2">Montant *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={manualForm.amount}
                    onChange={(e) => setManualForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Date *</label>
                  <input
                    type="date"
                    value={manualForm.date}
                    onChange={(e) => setManualForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <input
                  type="text"
                  value={manualForm.description}
                  onChange={(e) => setManualForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Libellé qui apparaîtra dans l'historique"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Catégorie</label>
                  <select
                    value={showNewCategoryInput ? 'new' : manualForm.categoryId}
                    onChange={(e) => {
                      if (e.target.value === 'new') {
                        setShowNewCategoryInput(true)
                        setManualForm(prev => ({ ...prev, categoryId: '', subCategoryId: '' }))
                      } else {
                        setShowNewCategoryInput(false)
                        setManualForm(prev => ({ ...prev, categoryId: e.target.value, subCategoryId: '' }))
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sans catégorie</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.emoji ? `${cat.emoji} ` : ''}{cat.name}</option>
                    ))}
                    <option value="new">➕ Créer une nouvelle catégorie</option>
                  </select>
                  {showNewCategoryInput && (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Nom de la catégorie"
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            if (newCategoryName.trim()) {
                              createCategory(newCategoryName.trim()).catch(err => {
                                setFeedback({ type: 'error', message: err.message || 'Erreur lors de la création' })
                              })
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newCategoryName.trim()) {
                            createCategory(newCategoryName.trim()).catch(err => {
                              setFeedback({ type: 'error', message: err.message || 'Erreur lors de la création' })
                            })
                          }
                        }}
                        disabled={!newCategoryName.trim()}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewCategoryInput(false)
                          setNewCategoryName('')
                          setManualForm(prev => ({ ...prev, categoryId: '' }))
                        }}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Sous-catégorie</label>
                  <select
                    value={showNewSubCategoryInput ? 'new' : manualForm.subCategoryId}
                    onChange={(e) => {
                      if (e.target.value === 'new') {
                        setShowNewSubCategoryInput(true)
                        setManualForm(prev => ({ ...prev, subCategoryId: '' }))
                      } else {
                        setShowNewSubCategoryInput(false)
                        setManualForm(prev => ({ ...prev, subCategoryId: e.target.value }))
                      }
                    }}
                    disabled={!manualForm.categoryId}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Sans sous-catégorie</option>
                    {subCategories
                      .filter(sub => sub.categoryId === manualForm.categoryId)
                      .map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                      ))}
                    {manualForm.categoryId && (
                      <option value="new">➕ Créer une nouvelle sous-catégorie</option>
                    )}
                  </select>
                  {showNewSubCategoryInput && manualForm.categoryId && (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={newSubCategoryName}
                        onChange={(e) => setNewSubCategoryName(e.target.value)}
                        placeholder="Nom de la sous-catégorie"
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            if (newSubCategoryName.trim()) {
                              createSubCategory(newSubCategoryName.trim(), manualForm.categoryId).catch(err => {
                                setFeedback({ type: 'error', message: err.message || 'Erreur lors de la création' })
                              })
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newSubCategoryName.trim()) {
                            createSubCategory(newSubCategoryName.trim(), manualForm.categoryId).catch(err => {
                              setFeedback({ type: 'error', message: err.message || 'Erreur lors de la création' })
                            })
                          }
                        }}
                        disabled={!newSubCategoryName.trim()}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewSubCategoryInput(false)
                          setNewSubCategoryName('')
                          setManualForm(prev => ({ ...prev, subCategoryId: '' }))
                        }}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-3 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2">
                  <input
                    type="checkbox"
                    checked={manualForm.pending}
                    onChange={(e) => setManualForm(prev => ({ ...prev, pending: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-200">Transaction en attente de validation</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Justificatif (photo)</label>
                {manualForm.attachment ? (
                  <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {manualForm.attachmentName || 'Pièce jointe'}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setAttachmentPreview({
                              url: manualForm.attachment as string,
                              title: manualForm.description || manualForm.attachmentName || 'Justificatif',
                            })
                          }
                          className="text-xs px-3 py-1 border border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-300 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30"
                        >
                          Voir
                        </button>
                        <button
                          type="button"
                          onClick={() => setManualForm(prev => ({ ...prev, attachment: null, attachmentName: '' }))}
                          className="text-xs px-3 py-1 border border-red-200 text-red-600 dark:border-red-800 dark:text-red-300 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
                        >
                          Retirer
                        </button>
                      </div>
                    </div>
                    <img
                      src={manualForm.attachment}
                      alt="Pièce jointe"
                      className="max-h-56 object-contain rounded border border-gray-200 dark:border-gray-700"
                    />
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (event) => {
                        const file = event.target.files?.[0]
                        if (!file) return
                        try {
                          const dataUrl = await readFileAsDataUrl(file)
                          setManualForm(prev => ({
                            ...prev,
                            attachment: dataUrl,
                            attachmentName: file.name,
                          }))
                          event.target.value = ''
                        } catch (error) {
                          console.error('Attachment upload error', error)
                          setFeedback({ type: 'error', message: 'Impossible de charger cette image.' })
                          event.target.value = ''
                        }
                      }}
                    />
                    <span>📎 Joindre une photo</span>
                  </label>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setManualModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={manualLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  {manualLoading ? 'Enregistrement...' : editingTransactionId ? 'Enregistrer les modifications' : 'Enregistrer la transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import row editor modal */}
      {importRowEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Modifier la ligne #{importRowEditor.id}</h2>
              <button
                onClick={closeImportRowEditor}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              {importRowEditor.error && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
                  {importRowEditor.error}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Montant *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={importRowEditor.amount}
                    onChange={(e) => setImportRowEditor(prev => prev ? { ...prev, amount: e.target.value, error: undefined } : prev)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Type *</label>
                  <select
                    value={importRowEditor.type}
                    onChange={(e) => setImportRowEditor(prev => prev ? { ...prev, type: e.target.value as Transaction['type'], error: undefined } : prev)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="expense">Dépense</option>
                    <option value="income">Revenu</option>
                    <option value="transfer">Transfert</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Date *</label>
                  <input
                    type="date"
                    value={importRowEditor.date}
                    onChange={(e) => setImportRowEditor(prev => prev ? { ...prev, date: e.target.value, error: undefined } : prev)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Catégorie</label>
                  <select
                    value={importRowEditor.categoryId}
                    onChange={(e) => setImportRowEditor(prev => prev ? { ...prev, categoryId: e.target.value, error: undefined } : prev)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sans catégorie</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.emoji ? `${cat.emoji} ` : ''}{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <input
                  type="text"
                  value={importRowEditor.description}
                  onChange={(e) => setImportRowEditor(prev => prev ? { ...prev, description: e.target.value, error: undefined } : prev)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <label className="flex items-center gap-3 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2">
                <input
                  type="checkbox"
                  checked={importRowEditor.pending}
                  onChange={(e) => setImportRowEditor(prev => prev ? { ...prev, pending: e.target.checked, error: undefined } : prev)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-200">Transaction en attente de validation</span>
              </label>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeImportRowEditor}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={saveImportRowEditor}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Enregistrer la ligne
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attachment preview */}
      {attachmentPreview && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setAttachmentPreview(null)
          }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 truncate">
                {attachmentPreview.title}
              </h3>
              <button
                onClick={() => setAttachmentPreview(null)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 bg-gray-100 dark:bg-gray-800 p-4 overflow-auto">
              <div className="w-full flex justify-center">
                <img
                  src={attachmentPreview.url}
                  alt={attachmentPreview.title}
                  className="object-contain rounded-md shadow-inner"
                  style={{ maxWidth: '100%', maxHeight: '100%' }}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end">
              <a
                href={attachmentPreview.url}
                download
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Télécharger
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Import modal */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Importer un relevé bancaire</h2>
              <button
                onClick={() => setImportModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Compte cible *</label>
                  <select
                    value={importAccountId}
                    onChange={(e) => setImportAccountId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="" disabled>Choisissez un compte</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Fichier CSV / TSV *</label>
                  <input
                    type="file"
                    accept=".csv,.tsv,.txt"
                    onChange={handleImportFile}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Colonnes attendues : date, description, montant, type (income/expense/transfer), catégorie (optionnel), statut (en attente).
                  </p>
                </div>
              </div>

              {importFileName && (
                <div className="text-sm text-gray-600 dark:text-gray-300">Fichier sélectionné : <strong>{importFileName}</strong></div>
              )}

              {importError && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
                  {importError}
                </div>
              )}

              {importRows.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300">
                    Prévisualisation ({importRows.length} lignes)
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                        <tr>
                          <th className="px-3 py-2 text-left">Date</th>
                          <th className="px-3 py-2 text-left">Description</th>
                          <th className="px-3 py-2 text-left">Montant</th>
                          <th className="px-3 py-2 text-left">Type</th>
                          <th className="px-3 py-2 text-left">Catégorie</th>
                          <th className="px-3 py-2 text-left">Statut</th>
                          <th className="px-3 py-2 text-left">État</th>
                          <th className="px-3 py-2 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importRows.map(row => (
                          <tr key={row.id} className={row.valid ? 'bg-white dark:bg-gray-900' : 'bg-red-50/70 dark:bg-red-900/10'}>
                            <td className="px-3 py-2 whitespace-nowrap">{resolveRowDate(row) || row.rawDate}</td>
                            <td className="px-3 py-2 truncate max-w-xs">{resolveRowDescription(row)}</td>
                            <td className="px-3 py-2">{resolveRowAmount(row) ?? row.rawAmount}</td>
                            <td className="px-3 py-2 capitalize">{resolveRowType(row) || row.rawType}</td>
                            <td className="px-3 py-2">
                              <div className="relative inline-block min-w-[160px]">
                                <select
                                  value={resolveRowCategoryId(row) || ''}
                                  onChange={(e) => handleInlineCategoryChange(row.id, e.target.value)}
                                  className="w-full appearance-none pl-3 pr-8 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">Sans catégorie</option>
                                  {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>
                                      {cat.emoji ? `${cat.emoji} ` : ''}{cat.name}
                                    </option>
                                  ))}
                                </select>
                                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">▼</span>
                              </div>
                            </td>
                            <td className="px-3 py-2">{resolveRowPending(row) ? 'En attente' : (row.rawPending || '—')}</td>
                            <td className="px-3 py-2 text-xs">
                              {row.valid ? (
                                <span className="text-green-600 dark:text-green-400">OK</span>
                              ) : (
                                <span className="text-red-600 dark:text-red-400">{row.error}</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              <button
                                type="button"
                                onClick={() => openImportRowEditor(row)}
                                className="px-3 py-1 border border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-300 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30"
                              >
                                Modifier
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={importRows.length === 0 || importLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  {importLoading ? 'Import...' : `Importer ${importRows.filter(r => r.valid).length} ligne(s)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feedback overlay */}
      {feedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setFeedback(null)}></div>
          <div className={`relative rounded-xl shadow-xl max-w-md w-full p-6 text-center ${feedback.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-900/60 dark:text-green-200' : 'bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-900/60 dark:text-red-200'}`}>
            <div className="text-2xl mb-3">{feedback.type === 'success' ? '✅' : '⚠️'}</div>
            <h3 className="text-lg font-semibold mb-2">{feedback.type === 'success' ? 'Opération réussie' : 'Une erreur est survenue'}</h3>
            <p className="text-sm mb-6 whitespace-pre-wrap">{feedback.message}</p>
            <button
              onClick={() => setFeedback(null)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Confirmation suppression */}
      {deleteModalOpen && transactionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-gray-900 border border-red-200 dark:border-red-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Supprimer ce compte ?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              Cette action est irréversible. La transaction « {transactionToDelete.description || TYPE_LABELS[transactionToDelete.type]} » sera supprimée.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteTransaction}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60"
              >
                Je confirme la suppression
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import row editor modal */}
      {importRowEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Modifier la ligne #{importRowEditor.id}</h2>
              <button
                onClick={closeImportRowEditor}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              {importRowEditor.error && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
                  {importRowEditor.error}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Montant *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={importRowEditor.amount}
                    onChange={(e) => setImportRowEditor(prev => prev ? { ...prev, amount: e.target.value, error: undefined } : prev)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Type *</label>
                  <select
                    value={importRowEditor.type}
                    onChange={(e) => setImportRowEditor(prev => prev ? { ...prev, type: e.target.value as Transaction['type'], error: undefined } : prev)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="expense">Dépense</option>
                    <option value="income">Revenu</option>
                    <option value="transfer">Transfert</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Date *</label>
                  <input
                    type="date"
                    value={importRowEditor.date}
                    onChange={(e) => setImportRowEditor(prev => prev ? { ...prev, date: e.target.value, error: undefined } : prev)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Catégorie</label>
                  <select
                    value={importRowEditor.categoryId}
                    onChange={(e) => setImportRowEditor(prev => prev ? { ...prev, categoryId: e.target.value, error: undefined } : prev)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sans catégorie</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.emoji ? `${cat.emoji} ` : ''}{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <input
                  type="text"
                  value={importRowEditor.description}
                  onChange={(e) => setImportRowEditor(prev => prev ? { ...prev, description: e.target.value, error: undefined } : prev)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <label className="flex items-center gap-3 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2">
                <input
                  type="checkbox"
                  checked={importRowEditor.pending}
                  onChange={(e) => setImportRowEditor(prev => prev ? { ...prev, pending: e.target.checked, error: undefined } : prev)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-200">Transaction en attente de validation</span>
              </label>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeImportRowEditor}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={saveImportRowEditor}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Enregistrer la ligne
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attachment preview */}
      {attachmentPreview && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setAttachmentPreview(null)
          }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 truncate">
                {attachmentPreview.title}
              </h3>
              <button
                onClick={() => setAttachmentPreview(null)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 bg-gray-100 dark:bg-gray-800 p-4 overflow-auto">
              <div className="w-full flex justify-center">
                <img
                  src={attachmentPreview.url}
                  alt={attachmentPreview.title}
                  className="object-contain rounded-md shadow-inner"
                  style={{ maxWidth: '100%', maxHeight: '100%' }}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end">
              <a
                href={attachmentPreview.url}
                download
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Télécharger
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Import modal */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Importer un relevé bancaire</h2>
              <button
                onClick={() => setImportModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Compte cible *</label>
                  <select
                    value={importAccountId}
                    onChange={(e) => setImportAccountId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="" disabled>Choisissez un compte</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Fichier CSV / TSV *</label>
                  <input
                    type="file"
                    accept=".csv,.tsv,.txt"
                    onChange={handleImportFile}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Colonnes attendues : date, description, montant, type (income/expense/transfer), catégorie (optionnel), statut (en attente).
                  </p>
                </div>
              </div>

              {importFileName && (
                <div className="text-sm text-gray-600 dark:text-gray-300">Fichier sélectionné : <strong>{importFileName}</strong></div>
              )}

              {importError && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
                  {importError}
                </div>
              )}

              {importRows.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300">
                    Prévisualisation ({importRows.length} lignes)
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                        <tr>
                          <th className="px-3 py-2 text-left">Date</th>
                          <th className="px-3 py-2 text-left">Description</th>
                          <th className="px-3 py-2 text-left">Montant</th>
                          <th className="px-3 py-2 text-left">Type</th>
                          <th className="px-3 py-2 text-left">Catégorie</th>
                          <th className="px-3 py-2 text-left">Statut</th>
                          <th className="px-3 py-2 text-left">État</th>
                          <th className="px-3 py-2 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importRows.map(row => (
                          <tr key={row.id} className={row.valid ? 'bg-white dark:bg-gray-900' : 'bg-red-50/70 dark:bg-red-900/10'}>
                            <td className="px-3 py-2 whitespace-nowrap">{resolveRowDate(row) || row.rawDate}</td>
                            <td className="px-3 py-2 truncate max-w-xs">{resolveRowDescription(row)}</td>
                            <td className="px-3 py-2">{resolveRowAmount(row) ?? row.rawAmount}</td>
                            <td className="px-3 py-2 capitalize">{resolveRowType(row) || row.rawType}</td>
                            <td className="px-3 py-2">
                              <div className="relative inline-block min-w-[160px]">
                                <select
                                  value={resolveRowCategoryId(row) || ''}
                                  onChange={(e) => handleInlineCategoryChange(row.id, e.target.value)}
                                  className="w-full appearance-none pl-3 pr-8 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">Sans catégorie</option>
                                  {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>
                                      {cat.emoji ? `${cat.emoji} ` : ''}{cat.name}
                                    </option>
                                  ))}
                                </select>
                                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">▼</span>
                              </div>
                            </td>
                            <td className="px-3 py-2">{resolveRowPending(row) ? 'En attente' : (row.rawPending || '—')}</td>
                            <td className="px-3 py-2 text-xs">
                              {row.valid ? (
                                <span className="text-green-600 dark:text-green-400">OK</span>
                              ) : (
                                <span className="text-red-600 dark:text-red-400">{row.error}</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              <button
                                type="button"
                                onClick={() => openImportRowEditor(row)}
                                className="px-3 py-1 border border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-300 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30"
                              >
                                Modifier
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={importRows.length === 0 || importLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  {importLoading ? 'Import...' : `Importer ${importRows.filter(r => r.valid).length} ligne(s)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feedback overlay */}
      {feedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setFeedback(null)}></div>
          <div className={`relative rounded-xl shadow-xl max-w-md w-full p-6 text-center ${feedback.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-900/60 dark:text-green-200' : 'bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-900/60 dark:text-red-200'}`}>
            <div className="text-2xl mb-3">{feedback.type === 'success' ? '✅' : '⚠️'}</div>
            <h3 className="text-lg font-semibold mb-2">{feedback.type === 'success' ? 'Opération réussie' : 'Une erreur est survenue'}</h3>
            <p className="text-sm mb-6 whitespace-pre-wrap">{feedback.message}</p>
            <button
              onClick={() => setFeedback(null)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Confirmation suppression */}
      {deleteModalOpen && transactionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-gray-900 border border-red-200 dark:border-red-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Supprimer ce compte ?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              Cette action est irréversible. La transaction « {transactionToDelete.description || TYPE_LABELS[transactionToDelete.type]} » sera supprimée.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteTransaction}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60"
              >
                Je confirme la suppression
              </button>
            </div>
          </div>
        </div>
      )}

      {exportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              if (!exportLoading) {
                closeExportModal()
              }
            }}
          ></div>
          <div className="relative bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Exporter les mouvements</h2>
              <button
                type="button"
                onClick={closeExportModal}
                disabled={exportLoading}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleExportSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Période</label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <input
                    type="date"
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="hidden sm:inline text-gray-400">→</span>
                  <input
                    type="date"
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Compte</label>
                <select
                  value={exportAccountId}
                  onChange={(e) => setExportAccountId(e.target.value)}
                  disabled={exportAccountsLoading}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tous les comptes</option>
                  {exportAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
                {exportAccountsLoading && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Chargement des comptes...</p>
                )}
              </div>

              <div>
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Format</span>
                <div className="flex items-center gap-4">
                  <label className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer ${exportFormat === 'xlsx' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-700'}`}>
                    <input
                      type="radio"
                      name="export-format"
                      value="xlsx"
                      checked={exportFormat === 'xlsx'}
                      onChange={() => setExportFormat('xlsx')}
                    />
                    <span className="text-sm">Excel (.xlsx)</span>
                  </label>
                  <label className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer ${exportFormat === 'pdf' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-700'}`}>
                    <input
                      type="radio"
                      name="export-format"
                      value="pdf"
                      checked={exportFormat === 'pdf'}
                      onChange={() => setExportFormat('pdf')}
                    />
                    <span className="text-sm">PDF</span>
                  </label>
                </div>
              </div>

              {exportError && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                  {exportError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeExportModal}
                  disabled={exportLoading}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={exportLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {exportLoading ? 'Préparation…' : 'Télécharger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
