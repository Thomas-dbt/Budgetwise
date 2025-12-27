'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { authFetch } from '@/lib/auth-fetch'

interface CategoryOption {
  id: string
  name: string
  emoji: string | null
}

interface SubCategoryOption {
  id: string
  name: string
  categoryId: string
}

interface CalendarEvent {
  id: string
  title: string
  amount: number
  dueDate: string
  type: string
  recurring?: string | null
  confirmed?: boolean
  notifyByEmail?: boolean
  emailReminderDaysBefore?: number | null
  categoryId?: string | null
  category?: CategoryOption | null
  subCategoryId?: string | null
  subCategory?: SubCategoryOption | null
  accountId?: string | null
}

type RecurringOption = 'none' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

interface AccountOption {
  id: string
  name: string
}

const categoryColors: Record<string, string> = {
  logement: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  abonnements: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  assurances: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  energie: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  autres: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  autre: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

const emailReminderOptions: { label: string; value: string }[] = [
  { label: 'Le jour même', value: '0' },
  { label: '1 jour avant', value: '1' },
  { label: '2 jours avant', value: '2' },
  { label: '3 jours avant', value: '3' },
  { label: '1 semaine avant', value: '7' },
  { label: '2 semaines avant', value: '14' },
]

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [data, setData] = useState<{
    pendingConfirmations: CalendarEvent[]
    upcomingNext7Days: CalendarEvent[]
    recurringEvents: CalendarEvent[]
    monthEvents: CalendarEvent[]
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/calendar/page.tsx:60',message:'CalendarPage: Component mounted',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/calendar/page.tsx:63',message:'CalendarPage: Component unmounting',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    }
  }, [])
  const [newEventModalOpen, setNewEventModalOpen] = useState(false)
  const [newEventLoading, setNewEventLoading] = useState(false)
  const [newEventError, setNewEventError] = useState<string | null>(null)
  const [newEventSuccess, setNewEventSuccess] = useState<string | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editEventLoading, setEditEventLoading] = useState(false)
  const [editEventError, setEditEventError] = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [editEventForm, setEditEventForm] = useState<{
    title: string
    amount: string
    dueDate: string
    type: 'debit' | 'credit'
    recurring: RecurringOption
    confirmed: boolean
    notifyByEmail: boolean
    emailReminderDaysBefore: string
    categoryId: string
    subCategoryId: string
    accountId: string
  }>({
    title: '',
    amount: '',
    dueDate: new Date().toISOString().slice(0, 10),
    type: 'debit',
    recurring: 'none',
    confirmed: false,
    notifyByEmail: true,
    emailReminderDaysBefore: '2',
    categoryId: '',
    subCategoryId: '',
    accountId: ''
  })
  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [subCategories, setSubCategories] = useState<SubCategoryOption[]>([])
  const [confirmModalSubCategories, setConfirmModalSubCategories] = useState<SubCategoryOption[]>([])
  const [showNewSubCategoryInput, setShowNewSubCategoryInput] = useState(false)
  const [showConfirmNewSubCategoryInput, setShowConfirmNewSubCategoryInput] = useState(false)
  const [newSubCategoryName, setNewSubCategoryName] = useState('')
  const [confirmNewSubCategoryName, setConfirmNewSubCategoryName] = useState('')
  const [confirmModal, setConfirmModal] = useState<{
    event: CalendarEvent
    accountId: string
    description: string
    date: string
    categoryId: string
    subCategoryId: string
  } | null>(null)
  const [confirmModalError, setConfirmModalError] = useState<string | null>(null)
  const [confirmModalLoading, setConfirmModalLoading] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [newEventForm, setNewEventForm] = useState<{
    title: string
    amount: string
    dueDate: string
    type: 'debit' | 'credit'
    recurring: RecurringOption
    confirmed: boolean
    notifyByEmail: boolean
    emailReminderDaysBefore: string
    categoryId: string
    subCategoryId: string
    accountId: string
  }>({
    title: '',
    amount: '',
    dueDate: new Date().toISOString().slice(0, 10),
    type: 'debit',
    recurring: 'none',
    confirmed: false,
    notifyByEmail: true,
    emailReminderDaysBefore: '2',
    categoryId: '',
    subCategoryId: '',
    accountId: ''
  })

  useEffect(() => {
    fetchCalendarData()
  }, [currentDate])

  useEffect(() => {
    fetchAccounts()
    fetchCategories()
  }, [])



  useEffect(() => {
    if (newEventForm.categoryId) {
      fetchSubCategories(newEventForm.categoryId)
    } else {
      setSubCategories([])
      setNewEventForm(prev => ({ ...prev, subCategoryId: '' }))
    }
  }, [newEventForm.categoryId])

  useEffect(() => {
    if (confirmModal?.categoryId) {
      fetchConfirmModalSubCategories(confirmModal.categoryId)
    } else {
      setConfirmModalSubCategories([])
      if (confirmModal) {
        setConfirmModal(prev => prev ? { ...prev, subCategoryId: '' } : null)
      }
    }
  }, [confirmModal?.categoryId])

  useEffect(() => {
    if (newEventSuccess) {
      const timer = setTimeout(() => {
        setNewEventSuccess(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [newEventSuccess])

  const fetchCalendarData = async () => {
    try {
      const month = currentDate.getMonth()
      const year = currentDate.getFullYear()
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/calendar/page.tsx:200',message:'fetchCalendarData: Starting',data:{month,year,timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const response = await authFetch(`/api/calendar?month=${month}&year=${year}`)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/calendar/page.tsx:204',message:'fetchCalendarData: Response received',data:{ok:response.ok,status:response.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Erreur ${response.status}`)
      }
      const calendarData = await response.json()
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/calendar/page.tsx:210',message:'fetchCalendarData: Data parsed',data:{hasData:!!calendarData,monthEventsCount:calendarData?.monthEvents?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      setData(calendarData)
      setLoading(false)
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/calendar/page.tsx:214',message:'fetchCalendarData: Error caught',data:{errorMessage:error?.message,errorName:error?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      console.error('Error fetching calendar:', error)
      setLoading(false)
    }
  }

  const fetchAccounts = async () => {
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/calendar/page.tsx:218',message:'fetchAccounts: Starting',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const response = await authFetch('/api/accounts')
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/calendar/page.tsx:220',message:'fetchAccounts: Response received',data:{ok:response.ok,status:response.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`)
      }
      const accountsData = await response.json()
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/calendar/page.tsx:225',message:'fetchAccounts: Data parsed',data:{accountsCount:accountsData?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      setAccounts(accountsData.map((acc: any) => ({ id: acc.id, name: acc.name })))
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/calendar/page.tsx:227',message:'fetchAccounts: Error caught',data:{errorMessage:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      console.error('Error fetching accounts:', error)
    }
  }

  const fetchCategories = async () => {
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/calendar/page.tsx:231',message:'fetchCategories: Starting',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const response = await authFetch('/api/categories')
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/calendar/page.tsx:233',message:'fetchCategories: Response received',data:{ok:response.ok,status:response.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`)
      }
      const categoriesData = await response.json()
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/calendar/page.tsx:238',message:'fetchCategories: Data parsed',data:{categoriesCount:categoriesData?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      setCategories(categoriesData)
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/calendar/page.tsx:240',message:'fetchCategories: Error caught',data:{errorMessage:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      console.error('Error fetching categories:', error)
    }
  }

  const fetchSubCategories = async (categoryId: string) => {
    try {
      const response = await authFetch(`/api/subcategories?categoryId=${categoryId}`)
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`)
      }
      const subCategoriesData = await response.json()
      setSubCategories(subCategoriesData)
    } catch (error) {
      console.error('Error fetching subcategories:', error)
      setSubCategories([])
    }
  }

  const fetchConfirmModalSubCategories = async (categoryId: string) => {
    try {
      const response = await authFetch(`/api/subcategories?categoryId=${categoryId}`)
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`)
      }
      const subCategoriesData = await response.json()
      setConfirmModalSubCategories(subCategoriesData)
    } catch (error) {
      console.error('Error fetching subcategories:', error)
      setConfirmModalSubCategories([])
    }
  }

  const createSubCategory = async (name: string, categoryId: string) => {
    try {
      const response = await authFetch('/api/subcategories', {
        method: 'POST',
        body: JSON.stringify({ name, categoryId }),
      })
      if (!response.ok) {
        throw new Error('Erreur lors de la création de la sous-catégorie')
      }
      const newSubCategory = await response.json()
      setSubCategories(prev => [...prev, newSubCategory])
      return newSubCategory
    } catch (error) {
      console.error('Error creating subcategory:', error)
      throw error
    }
  }

  const createConfirmModalSubCategory = async (name: string, categoryId: string) => {
    try {
      const response = await authFetch('/api/subcategories', {
        method: 'POST',
        body: JSON.stringify({ name, categoryId }),
      })
      if (!response.ok) {
        throw new Error('Erreur lors de la création de la sous-catégorie')
      }
      const newSubCategory = await response.json()
      setConfirmModalSubCategories(prev => [...prev, newSubCategory])
      return newSubCategory
    } catch (error) {
      console.error('Error creating subcategory:', error)
      throw error
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  }

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  }

  const getDaysUntil = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const formatReminderText = (days?: number | null) => {
    if (days === null || days === undefined) return '—'
    if (days === 0) return 'Le jour même'
    if (days === 1) return '1 jour avant'
    return `${days} jours avant`
  }

  const getCategoryMeta = (event: CalendarEvent) => {
    const name = event.category?.name || 'Autres'
    const key = name.toLowerCase()
    const className = categoryColors[key] || categoryColors['autre']
    const label = event.category?.emoji ? `${event.category.emoji} ${name}` : name
    return { name, className, label }
  }

  const openConfirmModal = (event: CalendarEvent) => {
    setConfirmModalError(null)
    // Pré-remplir avec les informations de l'échéance si disponibles
    const accountId = event.accountId || accounts[0]?.id || ''
    const categoryId = event.categoryId || ''
    const subCategoryId = event.subCategoryId || ''
    
    setConfirmModal({
      event,
      accountId,
      description: event.title,
      date: event.dueDate.slice(0, 10),
      categoryId,
      subCategoryId,
    })
    
    // Charger les sous-catégories si une catégorie est sélectionnée
    if (categoryId) {
      fetchConfirmModalSubCategories(categoryId)
    }
  }

  const closeConfirmModal = () => {
    setConfirmModal(null)
    setConfirmModalError(null)
  }

  const handleConfirmModalSubmit = async (e?: FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault()
    if (!confirmModal) return
    if (!confirmModal.accountId) {
      setConfirmModalError('Sélectionnez un compte pour enregistrer la transaction.')
      return
    }

    const transactionType = confirmModal.event.type === 'credit' ? 'income' : 'expense'
    const amount = Math.abs(Number(confirmModal.event.amount))
    if (Number.isNaN(amount) || amount === 0) {
      setConfirmModalError("Montant d'échéance invalide.")
      return
    }

    setConfirmModalLoading(true)
    setConfirmModalError(null)
    try {
      // Créer la transaction automatiquement
      const transactionResponse = await authFetch('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({
          accountId: confirmModal.accountId,
          amount,
          type: transactionType,
          date: confirmModal.date,
        description: confirmModal.description,
        categoryId: confirmModal.categoryId || undefined,
          subCategoryId: confirmModal.subCategoryId || undefined,
        }),
      })

      if (!transactionResponse.ok) {
        const raw = await transactionResponse.text()
        let message = "Impossible d'ajouter la transaction."
        if (raw) {
          try {
            const parsed = JSON.parse(raw)
            message = parsed.error || message
          } catch {
            message = raw
          }
        }
        throw new Error(message)
      }

      // Marquer l'échéance comme confirmée
      // Pour les occurrences récurrentes, on doit trouver l'ID de base
      const eventIdToConfirm = confirmModal.event.id.includes('-') 
        ? confirmModal.event.id.split('-')[0] 
        : confirmModal.event.id

      await authFetch('/api/calendar', {
        method: 'PATCH',
        body: JSON.stringify({ id: eventIdToConfirm, confirmed: true }),
      })

      setNewEventSuccess('Transaction ajoutée automatiquement et échéance confirmée.')
      closeConfirmModal()
      await fetchCalendarData()
    } catch (error: any) {
      console.error('Confirm modal error:', error)
      setConfirmModalError(error?.message || 'Impossible de confirmer cette échéance.')
    } finally {
      setConfirmModalLoading(false)
    }
  }
  
  // Fonction pour confirmation rapide si toutes les infos sont disponibles
  const handleQuickConfirm = async (event: CalendarEvent) => {
    if (!event.accountId) {
      // Ouvrir le modal si pas de compte
      openConfirmModal(event)
      return
    }
    
    // Pré-remplir le modal avec les infos disponibles
    setConfirmModalError(null)
    setConfirmModal({
      event,
      accountId: event.accountId,
      description: event.title,
      date: event.dueDate.slice(0, 10),
      categoryId: event.categoryId || '',
    })
    
    // Confirmer automatiquement
    setConfirmModalLoading(true)
    try {
      const transactionType = event.type === 'credit' ? 'income' : 'expense'
      const amount = Math.abs(Number(event.amount))
      
      const transactionResponse = await authFetch('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({
          accountId: event.accountId,
          amount,
          type: transactionType,
          date: event.dueDate.slice(0, 10),
          description: event.title,
          categoryId: event.categoryId || undefined,
          subCategoryId: event.subCategoryId || undefined,
        }),
      })

      if (!transactionResponse.ok) {
        throw new Error("Impossible d'ajouter la transaction.")
      }

      const eventIdToConfirm = event.id.includes('-') 
        ? event.id.split('-')[0] 
        : event.id

      await authFetch('/api/calendar', {
        method: 'PATCH',
        body: JSON.stringify({ id: eventIdToConfirm, confirmed: true }),
      })

      setNewEventSuccess('Transaction ajoutée automatiquement.')
      await fetchCalendarData()
    } catch (error: any) {
      console.error('Quick confirm error:', error)
      setConfirmModalError(error?.message || 'Impossible de confirmer cette échéance.')
      // Ouvrir le modal en cas d'erreur pour permettre la correction
      openConfirmModal(event)
    } finally {
      setConfirmModalLoading(false)
    }
  }

  const openNewEventModal = () => {
    setNewEventError(null)
    setNewEventSuccess(null)
    setNewEventForm({
      title: '',
      amount: '',
      dueDate: new Date().toISOString().slice(0, 10),
      type: 'debit',
      recurring: 'none',
      confirmed: false,
      notifyByEmail: true,
      emailReminderDaysBefore: '2',
      categoryId: categories[0]?.id || '',
      subCategoryId: '',
      accountId: accounts[0]?.id || '',
    })
    setSubCategories([])
    setShowNewSubCategoryInput(false)
    setNewSubCategoryName('')
    setNewEventModalOpen(true)
  }

  const closeNewEventModal = () => {
    setNewEventModalOpen(false)
    setNewEventError(null)
  }

  const openEditModal = (event: CalendarEvent) => {
    setEditEventError(null)
    setEditingEvent(event)
    
    setEditEventForm({
      title: event.title,
      amount: event.amount.toString(),
      dueDate: event.dueDate.slice(0, 10),
      type: event.type as 'debit' | 'credit',
      recurring: (event.recurring || 'none') as RecurringOption,
      confirmed: event.confirmed || false,
      notifyByEmail: event.notifyByEmail || false,
      emailReminderDaysBefore: event.emailReminderDaysBefore?.toString() || '2',
      categoryId: event.categoryId || '',
      subCategoryId: event.subCategoryId || '',
      accountId: event.accountId || ''
    })
    
    // Charger les sous-catégories si une catégorie est sélectionnée
    if (event.categoryId) {
      fetchSubCategories(event.categoryId)
    } else {
      setSubCategories([])
    }
    
    setShowNewSubCategoryInput(false)
    setNewSubCategoryName('')
    setEditModalOpen(true)
    setSelectedEvent(null) // Fermer le modal de détails
  }

  const closeEditModal = () => {
    setEditModalOpen(false)
    setEditEventError(null)
    setEditingEvent(null)
  }

  const handleEditEventSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingEvent) return
    
    if (!editEventForm.title || !editEventForm.amount || !editEventForm.dueDate) {
      setEditEventError('Merci de remplir les champs obligatoires.')
      return
    }

    const numericAmount = Number(editEventForm.amount.toString().replace(',', '.'))
    if (Number.isNaN(numericAmount) || numericAmount === 0) {
      setEditEventError('Montant invalide.')
      return
    }

    const reminderValue = editEventForm.notifyByEmail
      ? Number(editEventForm.emailReminderDaysBefore)
      : null
    if (editEventForm.notifyByEmail && (reminderValue === null || Number.isNaN(reminderValue) || reminderValue < 0)) {
      setEditEventError('Sélectionnez un rappel email valide.')
      return
    }

    setEditEventLoading(true)
    setEditEventError(null)
    try {
      // Extraire l'ID de base si c'est une occurrence récurrente
      const eventIdToUpdate = editingEvent.id.includes('-') 
        ? editingEvent.id.split('-')[0] 
        : editingEvent.id

      const response = await authFetch('/api/calendar', {
        method: 'PATCH',
        body: JSON.stringify({
          id: eventIdToUpdate,
          title: editEventForm.title,
          amount: numericAmount,
          dueDate: editEventForm.dueDate,
          type: editEventForm.type,
          recurring: editEventForm.recurring === 'none' ? null : editEventForm.recurring,
          confirmed: editEventForm.confirmed,
          notifyByEmail: editEventForm.notifyByEmail,
          emailReminderDaysBefore: reminderValue,
          categoryId: editEventForm.categoryId || null,
          subCategoryId: editEventForm.subCategoryId || null,
          accountId: editEventForm.accountId || null,
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        let errorMessage = "Impossible de modifier l'échéance."
        if (text) {
          try {
            const parsed = JSON.parse(text)
            errorMessage = parsed.error || errorMessage
          } catch {
            errorMessage = text
          }
        }
        throw new Error(errorMessage)
      }

      setEditEventError(null)
      setNewEventSuccess('Échéance modifiée avec succès.')
      setEditModalOpen(false)
      await fetchCalendarData()
    } catch (error: any) {
      console.error('Edit calendar event error:', error)
      setEditEventError(error?.message || "Impossible de modifier l'échéance.")
    } finally {
      setEditEventLoading(false)
    }
  }

  const handleNewEventSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!newEventForm.title || !newEventForm.amount || !newEventForm.dueDate) {
      setNewEventError('Merci de remplir les champs obligatoires.')
      return
    }

    const numericAmount = Number(newEventForm.amount.toString().replace(',', '.'))
    if (Number.isNaN(numericAmount) || numericAmount === 0) {
      setNewEventError('Montant invalide.')
      return
    }

    const reminderValue = newEventForm.notifyByEmail
      ? Number(newEventForm.emailReminderDaysBefore)
      : null
    if (newEventForm.notifyByEmail && (reminderValue === null || Number.isNaN(reminderValue) || reminderValue < 0)) {
      setNewEventError('Sélectionnez un rappel email valide.')
      return
    }

    setNewEventLoading(true)
    setNewEventError(null)
    setNewEventSuccess(null)
    try {
      const response = await authFetch('/api/calendar', {
        method: 'POST',
        body: JSON.stringify({
          title: newEventForm.title,
          amount: numericAmount,
          dueDate: newEventForm.dueDate,
          type: newEventForm.type,
          recurring: newEventForm.recurring === 'none' ? null : newEventForm.recurring,
          confirmed: newEventForm.confirmed,
          notifyByEmail: newEventForm.notifyByEmail,
          emailReminderDaysBefore: reminderValue,
          categoryId: newEventForm.categoryId || null,
          subCategoryId: newEventForm.subCategoryId || null,
          accountId: newEventForm.accountId || null,
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        let errorMessage = 'Impossible de créer l\'échéance.'
        if (text) {
          try {
            const parsed = JSON.parse(text)
            errorMessage = parsed.error || errorMessage
          } catch {
            errorMessage = text
          }
        }
        throw new Error(errorMessage)
      }

      setNewEventError(null)
      setNewEventSuccess('Échéance créée avec succès.')
      setNewEventModalOpen(false)
      await fetchCalendarData()
    } catch (error: any) {
      console.error('New calendar event error:', error)
      setNewEventError(error?.message || 'Impossible de créer l\'échéance.')
    } finally {
      setNewEventLoading(false)
    }
  }

  const resetCalendar = async () => {
    const confirmed = window.confirm('Supprimer toutes les échéances du calendrier ? Cette action est irréversible.')
    if (!confirmed) return

    try {
      setNewEventError(null)
      const response = await authFetch('/api/calendar', {
        method: 'DELETE',
      })
      if (!response.ok) {
        const raw = await response.text()
        let message = 'Impossible de réinitialiser le calendrier.'
        if (raw) {
          try {
            const parsed = JSON.parse(raw)
            message = parsed.error || message
          } catch {
            message = raw
          }
        }
        throw new Error(message)
      }
      setNewEventSuccess('Calendrier réinitialisé.')
      await fetchCalendarData()
    } catch (error: any) {
      console.error('Reset calendar error:', error)
      const message = error?.message || 'Impossible de réinitialiser le calendrier.'
      setNewEventError(message)
      window.alert(message)
    }
  }

  // Calendrier mensuel
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1

    const days = []
    // Jours vides au début
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    // Jours du mois
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }
    return days
  }

  const getEventsForDay = (day: number, monthEvents: CalendarEvent[]) => {
    if (!monthEvents) return []
    return monthEvents.filter(e => {
      const eventDate = new Date(e.dueDate)
      return eventDate.getDate() === day &&
             eventDate.getMonth() === currentDate.getMonth() &&
             eventDate.getFullYear() === currentDate.getFullYear()
    })
  }

  const changeMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1))
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">Chargement...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-8">
        <div className="text-center py-12 text-red-500">Erreur lors du chargement</div>
      </div>
    )
  }

  // Valeurs par défaut pour éviter les erreurs
  const safeData = {
    pendingConfirmations: data.pendingConfirmations || [],
    upcomingNext7Days: data.upcomingNext7Days || [],
    recurringEvents: data.recurringEvents || [],
    monthEvents: data.monthEvents || []
  }

  const monthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
  const currentMonthName = monthNames[currentDate.getMonth()]
  const currentYear = currentDate.getFullYear()
  const days = getDaysInMonth(currentDate)
  const today = new Date()

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Calendrier Financier
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">Suivez vos prélèvements et échéances</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 flex items-center gap-2 transition-all shadow-lg hover:shadow-xl font-medium"
              onClick={openNewEventModal}
            >
              <span className="text-lg">+</span>
              <span>Nouvelle échéance</span>
            </button>
            <button
              onClick={resetCalendar}
              className="px-4 py-2.5 border border-red-300 text-red-600 dark:border-red-800 dark:text-red-300 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2 transition-all"
            >
              <span>🗑️</span>
              <span className="hidden sm:inline">Tout supprimer (tests)</span>
            </button>
          </div>
        </div>

        {/* Section échéances en attente */}
        {safeData.pendingConfirmations.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-xl p-4">
            <h2 className="text-lg font-semibold mb-3 text-orange-800 dark:text-orange-200">
              Échéances en attente de confirmation ({safeData.pendingConfirmations.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {safeData.pendingConfirmations.slice(0, 6).map((event) => {
                const daysUntil = getDaysUntil(event.dueDate)
                return (
                  <div
                    key={event.id}
                    className="bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-700 rounded-lg p-3 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-sm flex-1">{event.title}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        daysUntil < 0 
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          : daysUntil === 0
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {daysUntil < 0 ? 'En retard' : daysUntil === 0 ? 'Aujourd\'hui' : `Dans ${daysUntil}j`}
                      </span>
                    </div>
                    <p className="text-base font-bold text-orange-600 dark:text-orange-400 mb-1">
                      {formatCurrency(event.amount)}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {formatDate(event.dueDate)}
                    </p>
                  </div>
                )
              })}
            </div>
            {safeData.pendingConfirmations.length > 6 && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 text-center">
                +{safeData.pendingConfirmations.length - 6} autre{safeData.pendingConfirmations.length - 6 > 1 ? 's' : ''} échéance{safeData.pendingConfirmations.length - 6 > 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}
      </div>

      {newEventSuccess && (
        <div className="mb-6">
          <div className="bg-green-50 border border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-900/40 dark:text-green-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <span>✓ {newEventSuccess}</span>
            <button
              onClick={() => setNewEventSuccess(null)}
              className="text-sm underline hover:no-underline"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedEvent(null)}></div>
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Échéance du {formatDateShort(selectedEvent.dueDate)}
              </h2>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                ×
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold">{selectedEvent.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedEvent.type === 'credit' ? 'Crédit attendu' : 'Débit prévu'}
                  </p>
                </div>
                <p className="text-lg font-bold text-right">{formatCurrency(selectedEvent.amount)}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {!!selectedEvent.recurring && (
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                    {selectedEvent.recurring === 'monthly'
                      ? 'Mensuel'
                      : selectedEvent.recurring === 'weekly'
                        ? 'Hebdomadaire'
                        : selectedEvent.recurring === 'quarterly'
                          ? 'Trimestriel'
                          : selectedEvent.recurring === 'yearly'
                            ? 'Annuel'
                            : selectedEvent.recurring}
                  </span>
                )}
                {selectedEvent.category && (
                  <span className={`text-xs px-2 py-1 rounded-full ${getCategoryMeta(selectedEvent).className}`}>
                    {getCategoryMeta(selectedEvent).label}
                  </span>
                )}
                {selectedEvent.confirmed && (
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                    Confirmé
                  </span>
                )}
              </div>

              {selectedEvent.notifyByEmail && (
                <div className="text-sm text-blue-600 dark:text-blue-400">
                  Notification email : {formatReminderText(selectedEvent.emailReminderDaysBefore)}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={() => openEditModal(selectedEvent)}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg font-medium"
                >
                  Modifier
                </button>
                {!selectedEvent.confirmed && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!selectedEvent) return
                      
                      // Si l'échéance a un compte, créer automatiquement la transaction
                      if (selectedEvent.accountId) {
                        await handleQuickConfirm(selectedEvent)
                        setSelectedEvent(null)
                      } else {
                        // Sinon, ouvrir le modal pour sélectionner un compte
                    openConfirmModal(selectedEvent)
                    setSelectedEvent(null)
                      }
                  }}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg font-medium"
                >
                    Marquer comme payé
                </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeConfirmModal}></div>
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
              <h2 className="text-xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                Confirmer le prélèvement
              </h2>
              <button
                onClick={closeConfirmModal}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleConfirmModalSubmit} className="px-6 py-4 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold">{confirmModal.event.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Échéance du {formatDateShort(confirmModal.event.dueDate)}
                  </p>
                </div>
                <p className="text-lg font-bold text-right">
                  {formatCurrency(confirmModal.event.amount)}
                </p>
              </div>

              {confirmModalError && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
                  {confirmModalError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Compte à débiter/créditer *
                </label>
                {accounts.length === 0 ? (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Aucun compte disponible. Créez un compte avant d'enregistrer la transaction.
                  </p>
                ) : (
                  <select
                    value={confirmModal.accountId}
                    onChange={(e) =>
                      setConfirmModal(prev => prev ? { ...prev, accountId: e.target.value } : prev)
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionnez un compte</option>
                    {accounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={confirmModal.description}
                  onChange={(e) =>
                    setConfirmModal(prev => prev ? { ...prev, description: e.target.value } : prev)
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Date de la transaction
                </label>
                <input
                  type="date"
                  value={confirmModal.date}
                  onChange={(e) =>
                    setConfirmModal(prev => prev ? { ...prev, date: e.target.value } : prev)
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Catégorie
                </label>
                <select
                  value={confirmModal.categoryId}
                  onChange={(e) => {
                    setConfirmModal(prev => prev ? { ...prev, categoryId: e.target.value, subCategoryId: '' } : null)
                    setShowConfirmNewSubCategoryInput(false)
                    setConfirmNewSubCategoryName('')
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sans catégorie</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.emoji ? `${cat.emoji} ` : ''}{cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Sous-catégorie
                </label>
                {confirmModal.categoryId ? (
                  <div className="space-y-2">
                    <select
                      value={confirmModal.subCategoryId}
                      onChange={(e) => {
                        if (e.target.value === '__new__') {
                          setShowConfirmNewSubCategoryInput(true)
                          setConfirmNewSubCategoryName('')
                        } else {
                          setConfirmModal(prev => prev ? { ...prev, subCategoryId: e.target.value } : null)
                          setShowConfirmNewSubCategoryInput(false)
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sans sous-catégorie</option>
                      {confirmModalSubCategories.map(subCat => (
                        <option key={subCat.id} value={subCat.id}>
                          {subCat.name}
                        </option>
                      ))}
                      <option value="__new__">+ Créer une nouvelle sous-catégorie</option>
                    </select>
                    {showConfirmNewSubCategoryInput && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={confirmNewSubCategoryName}
                          onChange={(e) => setConfirmNewSubCategoryName(e.target.value)}
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter' && confirmNewSubCategoryName.trim() && confirmModal) {
                              e.preventDefault()
                              try {
                                const newSubCat = await createConfirmModalSubCategory(confirmNewSubCategoryName.trim(), confirmModal.categoryId)
                                setConfirmModal(prev => prev ? { ...prev, subCategoryId: newSubCat.id } : null)
                                setShowConfirmNewSubCategoryInput(false)
                                setConfirmNewSubCategoryName('')
                              } catch (error) {
                                console.error('Error creating subcategory:', error)
                              }
                            }
                          }}
                          placeholder="Nom de la sous-catégorie"
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirmNewSubCategoryName.trim() && confirmModal) {
                              try {
                                const newSubCat = await createConfirmModalSubCategory(confirmNewSubCategoryName.trim(), confirmModal.categoryId)
                                setConfirmModal(prev => prev ? { ...prev, subCategoryId: newSubCat.id } : null)
                                setShowConfirmNewSubCategoryInput(false)
                                setConfirmNewSubCategoryName('')
                              } catch (error) {
                                console.error('Error creating subcategory:', error)
                              }
                            }
                          }}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowConfirmNewSubCategoryInput(false)
                            setConfirmNewSubCategoryName('')
                            setConfirmModal(prev => prev ? { ...prev, subCategoryId: '' } : null)
                          }}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <select disabled className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed">
                    <option value="">Sélectionnez d'abord une catégorie</option>
                  </select>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeConfirmModal}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={confirmModalLoading || accounts.length === 0}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-60 transition-all shadow-md hover:shadow-lg font-medium"
                >
                  {confirmModalLoading ? 'Validation...' : 'Marquer comme payé'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editModalOpen && editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeEditModal}
          ></div>
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Modifier l'échéance
              </h2>
              <button
                onClick={closeEditModal}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleEditEventSubmit} className="px-6 py-4 space-y-6">
              {editEventError && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
                  {editEventError}
                </div>
              )}

              {/* Section principale - Champs essentiels */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 pb-2 border-b border-gray-200 dark:border-gray-700">
                  Informations principales
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Libellé de l'échéance *
                  </label>
                  <input
                    type="text"
                    value={editEventForm.title}
                    onChange={(e) => setEditEventForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Ex: Loyer, Abonnement Netflix, Salaire..."
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Type d'échéance *
                    </label>
                    <select
                      value={editEventForm.type}
                      onChange={(e) => setEditEventForm(prev => ({ ...prev, type: e.target.value as 'debit' | 'credit' }))}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                      <option value="debit">Débit (prélèvement)</option>
                      <option value="credit">Crédit (revenu)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Montant *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editEventForm.amount}
                      onChange={(e) => setEditEventForm(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="1200.00"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Date d'échéance *
                    </label>
                    <input
                      type="date"
                      value={editEventForm.dueDate}
                      onChange={(e) => setEditEventForm(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Récurrence
                    </label>
                    <select
                      value={editEventForm.recurring}
                      onChange={(e) => setEditEventForm(prev => ({ ...prev, recurring: e.target.value as RecurringOption }))}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                      <option value="none">Aucune (ponctuelle)</option>
                      <option value="weekly">Hebdomadaire</option>
                      <option value="monthly">Mensuelle</option>
                      <option value="quarterly">Trimestrielle</option>
                      <option value="yearly">Annuelle</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Catégorie
                    </label>
                    <select
                      value={editEventForm.categoryId}
                      onChange={(e) => {
                        setEditEventForm(prev => ({ ...prev, categoryId: e.target.value, subCategoryId: '' }))
                        setShowNewSubCategoryInput(false)
                        setNewSubCategoryName('')
                      }}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                      <option value="">Sans catégorie</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.emoji ? `${cat.emoji} ` : ''}{cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Sous-catégorie
                    </label>
                    {editEventForm.categoryId ? (
                      <div className="space-y-2">
                        <select
                          value={editEventForm.subCategoryId}
                          onChange={(e) => {
                            if (e.target.value === '__new__') {
                              setShowNewSubCategoryInput(true)
                              setNewSubCategoryName('')
                            } else {
                              setEditEventForm(prev => ({ ...prev, subCategoryId: e.target.value }))
                              setShowNewSubCategoryInput(false)
                            }
                          }}
                          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        >
                          <option value="">Sans sous-catégorie</option>
                          {subCategories.map(subCat => (
                            <option key={subCat.id} value={subCat.id}>
                              {subCat.name}
                            </option>
                          ))}
                          <option value="__new__">+ Créer une nouvelle sous-catégorie</option>
                        </select>
                        {showNewSubCategoryInput && (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newSubCategoryName}
                              onChange={(e) => setNewSubCategoryName(e.target.value)}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter' && newSubCategoryName.trim()) {
                                  e.preventDefault()
                                  try {
                                    const newSubCat = await createSubCategory(newSubCategoryName.trim(), editEventForm.categoryId)
                                    setEditEventForm(prev => ({ ...prev, subCategoryId: newSubCat.id }))
                                    setShowNewSubCategoryInput(false)
                                    setNewSubCategoryName('')
                                  } catch (error) {
                                    console.error('Error creating subcategory:', error)
                                  }
                                }
                              }}
                              placeholder="Nom de la sous-catégorie"
                              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                if (newSubCategoryName.trim()) {
                                  try {
                                    const newSubCat = await createSubCategory(newSubCategoryName.trim(), editEventForm.categoryId)
                                    setEditEventForm(prev => ({ ...prev, subCategoryId: newSubCat.id }))
                                    setShowNewSubCategoryInput(false)
                                    setNewSubCategoryName('')
                                  } catch (error) {
                                    console.error('Error creating subcategory:', error)
                                  }
                                }
                              }}
                              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowNewSubCategoryInput(false)
                                setNewSubCategoryName('')
                                setEditEventForm(prev => ({ ...prev, subCategoryId: '' }))
                              }}
                              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <select disabled className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed">
                        <option value="">Sélectionnez d'abord une catégorie</option>
                      </select>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Compte
                    </label>
                    <select
                      value={editEventForm.accountId}
                      onChange={(e) => setEditEventForm(prev => ({ ...prev, accountId: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                      <option value="">Sélectionnez un compte</option>
                      {accounts.map(account => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section options avancées */}
              <details className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <summary className="px-4 py-3 bg-gray-50 dark:bg-gray-800/40 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-all font-medium text-gray-700 dark:text-gray-200">
                  Options avancées
                </summary>
                <div className="px-4 py-4 space-y-4">
                  <div className="space-y-3 border border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-900/10 rounded-lg px-4 py-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={editEventForm.confirmed}
                        onChange={(e) => setEditEventForm(prev => ({ ...prev, confirmed: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Marquer comme déjà payé
                      </span>
                    </label>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={editEventForm.notifyByEmail}
                        onChange={(e) => setEditEventForm(prev => ({ ...prev, notifyByEmail: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Activer les notifications par email
                      </span>
                    </label>
                    {editEventForm.notifyByEmail && (
                      <div className="ml-7">
                        <select
                          value={editEventForm.emailReminderDaysBefore}
                          onChange={(e) => setEditEventForm(prev => ({ ...prev, emailReminderDaysBefore: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="0">Le jour même</option>
                          <option value="1">1 jour avant</option>
                          <option value="2">2 jours avant</option>
                          <option value="3">3 jours avant</option>
                          <option value="7">1 semaine avant</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </details>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={editEventLoading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-60 transition-all shadow-md hover:shadow-lg font-medium"
                >
                  {editEventLoading ? 'Modification...' : 'Enregistrer les modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* Calendrier mensuel */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1)} {currentYear}
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => changeMonth(-1)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg font-medium flex items-center gap-2"
                >
                  <span>â†</span>
                  <span className="hidden sm:inline">Précédent</span>
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-4 py-2 border-2 border-blue-500 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all font-medium"
                >
                  Aujourd'hui
                </button>
                <button
                  onClick={() => changeMonth(1)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg font-medium flex items-center gap-2"
                >
                  <span className="hidden sm:inline">Suivant</span>
                  <span>←</span>
                </button>
                <select
                  value={`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`}
                  onChange={(e) => {
                    const [year, month] = e.target.value.split('-')
                    setCurrentDate(new Date(parseInt(year), parseInt(month) - 1, 1))
                  }}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                >
                  {Array.from({ length: 12 }, (_, i) => {
                    const monthDate = new Date(currentDate.getFullYear(), i, 1)
                    return (
                      <option key={i} value={`${monthDate.getFullYear()}-${String(i + 1).padStart(2, '0')}`}>
                        {monthNames[i]} {monthDate.getFullYear()}
                      </option>
                    )
                  })}
                </select>
              </div>
            </div>
            
            {/* Onglets Calendrier / Liste */}
            <div className="flex items-center gap-2 mb-4 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-4 py-2 font-medium transition-all ${
                  viewMode === 'calendar'
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Calendrier
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 font-medium transition-all ${
                  viewMode === 'list'
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Liste
              </button>
            </div>

            {viewMode === 'calendar' && (
              <>
            <div className="mb-4 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Confirmé</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                <span>En attente</span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {days.map((day, index) => {
                if (day === null) {
                  return <div key={index} className="aspect-square"></div>
                }
                const events = getEventsForDay(day, safeData.monthEvents)
                const isToday = day === today.getDate() && 
                               currentDate.getMonth() === today.getMonth() &&
                               currentDate.getFullYear() === today.getFullYear()
                const hasEvents = events.length > 0
                const isHovered = hoveredDay === day
                
                return (
                  <div
                    key={day}
                    className={`min-h-[100px] border rounded-xl p-2 flex flex-col relative transition-all ${
                      isToday ? 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 border-blue-300 dark:border-blue-700 shadow-md' : 
                      'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    } ${hasEvents ? 'cursor-pointer hover:shadow-lg' : ''}`}
                    onMouseEnter={() => hasEvents && setHoveredDay(day)}
                    onMouseLeave={() => setHoveredDay(null)}
                    onClick={() => {
                      if (hasEvents) {
                        if (events.length === 1) {
                          setSelectedEvent(events[0])
                        } else {
                          setHoveredDay(day)
                        }
                      }
                    }}
                  >
                    <span className={`text-sm font-semibold mb-1 ${
                      isToday ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {day}
                    </span>
                    {hasEvents && (
                      <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
                        {events.slice(0, 2).map((event) => {
                          const { className } = getCategoryMeta(event)
                          return (
                            <div
                              key={event.id}
                              className={`text-xs px-2 py-1 rounded-md truncate cursor-pointer transition-all hover:scale-105 ${
                                event.confirmed 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' 
                                  : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400 opacity-70'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedEvent(event)
                              }}
                              title={`${event.title} - ${formatCurrency(event.amount)}`}
                            >
                              <div className="font-semibold truncate">{event.title}</div>
                              <div className="text-[10px] opacity-90">{formatCurrency(event.amount)}</div>
                            </div>
                          )
                        })}
                        {events.length > 2 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium px-2">
                            +{events.length - 2} autre{events.length - 2 > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Tooltip avec tous les événements */}
                    {isHovered && events.length > 1 && (
                      <div 
                        className="absolute z-20 top-full left-1/2 transform -translate-x-1/2 mt-2 w-72 bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-800 rounded-xl shadow-2xl p-4"
                        onMouseEnter={() => setHoveredDay(day)}
                        onMouseLeave={() => setHoveredDay(null)}
                      >
                        <div className="text-sm font-bold mb-3 text-gray-800 dark:text-gray-200 pb-2 border-b border-gray-200 dark:border-gray-700">
                          {events.length} échéance{events.length > 1 ? 's' : ''} le {day} {currentMonthName}
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {events.map((event) => {
                            const { className, label } = getCategoryMeta(event)
                            return (
                            <div
                              key={event.id}
                                className="flex items-start justify-between p-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-700/50 dark:to-gray-800 rounded-lg cursor-pointer hover:shadow-md transition-all border border-gray-200 dark:border-gray-600"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedEvent(event)
                                setHoveredDay(null)
                              }}
                            >
                              <div className="flex-1 min-w-0">
                                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                  {event.title}
                                </div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                  <div className={`w-2 h-2 rounded-full ${
                                    event.confirmed ? 'bg-green-500' : 'bg-gray-400'
                                  }`}></div>
                                    <span className="text-xs text-gray-600 dark:text-gray-400">
                                      {event.type === 'credit' ? 'Crédit' : 'Débit'}
                                  </span>
                                    {event.category && (
                                      <span className={`text-xs px-1.5 py-0.5 rounded ${className}`}>
                                        {label}
                                      </span>
                                    )}
                                </div>
                              </div>
                                <div className="text-sm font-bold text-orange-600 dark:text-orange-400 ml-3 whitespace-nowrap">
                                  {formatCurrency(event.amount)}
                              </div>
                            </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
              </>
            )}

            {viewMode === 'list' && (
              <div className="space-y-3">
                {safeData.monthEvents.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    Aucune échéance ce mois-ci
                  </p>
                ) : (
                  safeData.monthEvents
                    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                    .map((event) => {
                      const { className, label } = getCategoryMeta(event)
                      const daysUntil = getDaysUntil(event.dueDate)
                      const isPast = daysUntil < 0
                      const isToday = daysUntil === 0
                      
                      return (
                        <div
                          key={event.id}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800"
                          onClick={() => setSelectedEvent(event)}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-semibold text-lg">{event.title}</h3>
                                {event.confirmed && (
                                  <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                    Confirmé
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {formatDate(event.dueDate)}
                                </span>
                                {isToday && (
                                  <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium">
                                    Aujourd'hui
                                  </span>
                                )}
                                {isPast && !event.confirmed && (
                                  <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 font-medium">
                                    En retard
                                  </span>
                                )}
                                {!isPast && !isToday && (
                                  <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {daysUntil === 1 ? 'Demain' : `Dans ${daysUntil} jours`}
                                  </span>
                                )}
                                {event.category && (
                                  <span className={`text-xs px-2 py-1 rounded-full ${className}`}>
                                    {label}
                                  </span>
                                )}
                                {event.recurring && (
                                  <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                    {event.recurring === 'monthly' ? 'Mensuel' : 
                                     event.recurring === 'weekly' ? 'Hebdomadaire' :
                                     event.recurring === 'quarterly' ? 'Trimestriel' :
                                     event.recurring === 'yearly' ? 'Annuel' : event.recurring}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-xl font-bold ${
                                event.type === 'credit' 
                                  ? 'text-green-600 dark:text-green-400' 
                                  : 'text-orange-600 dark:text-orange-400'
                              }`}>
                                {formatCurrency(event.amount)}
                              </p>
                              {!event.confirmed && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    // Si l'événement a déjà un compte, confirmation rapide
                                    if (event.accountId) {
                                      handleQuickConfirm(event)
                                    } else {
                                      openConfirmModal(event)
                                    }
                                  }}
                                  className="mt-2 px-3 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                                >
                                  {event.accountId ? 'Confirmer automatiquement' : 'Confirmer'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Colonne de droite - 7 prochains jours */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm sticky top-8">
            <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              7 Prochains Jours
            </h2>
            <div className="space-y-3">
              {safeData.upcomingNext7Days.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  Aucune échéance à venir
                </p>
              ) : (
                safeData.upcomingNext7Days.map((event) => {
                  const { className, label } = getCategoryMeta(event)
                  const daysUntil = getDaysUntil(event.dueDate)
                  const isToday = daysUntil === 0
                  
                  return (
                    <div 
                      key={event.id} 
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800"
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-sm flex-1">{event.title}</h3>
                        {event.confirmed && (
                          <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                            ✓
                          </span>
                        )}
                      </div>
                      <p className={`text-lg font-bold mb-2 ${
                        event.type === 'credit' 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-orange-600 dark:text-orange-400'
                      }`}>
                        {formatCurrency(event.amount)}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {formatDate(event.dueDate)}
                        </span>
                        {isToday && (
                          <span className="px-2 py-0.5 text-[10px] rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium">
                            Aujourd'hui
                          </span>
                        )}
                        {!isToday && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {daysUntil === 1 ? 'Demain' : `Dans ${daysUntil}j`}
                          </span>
                        )}
                      </div>
                      {event.category && (
                        <span className={`text-xs px-2 py-1 rounded-full ${className}`}>
                          {label}
                        </span>
                      )}
                      {!event.confirmed && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            // Si l'événement a déjà un compte, confirmation rapide
                            if (event.accountId) {
                              handleQuickConfirm(event)
                            } else {
                              openConfirmModal(event)
                            }
                          }}
                          className="mt-2 w-full px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium"
                        >
                          {event.accountId ? 'Confirmer automatiquement' : 'Confirmer'}
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
            
            {/* Section échéances récurrentes */}
            {safeData.recurringEvents.length > 0 && (
              <>
                <h3 className="text-lg font-semibold mt-6 mb-3">Récurrentes</h3>
                <div className="space-y-3">
                  {safeData.recurringEvents.map((event) => {
                  const { className, label } = getCategoryMeta(event)
                  const eventDate = new Date(event.dueDate)
                  const dayOfMonth = eventDate.getDate()
                  
                  return (
                      <div key={event.id} className="border border-purple-200 dark:border-purple-800 rounded-lg p-3 bg-purple-50/50 dark:bg-purple-900/10">
                        <h4 className="font-semibold text-sm mb-1">{event.title}</h4>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${className}`}>
                          {label}
                        </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                            {event.recurring === 'monthly' ? 'Mensuel' : 
                             event.recurring === 'weekly' ? 'Hebdo' :
                             event.recurring === 'quarterly' ? 'Trim' :
                             event.recurring === 'yearly' ? 'Annuel' : event.recurring}
                        </span>
                      </div>
                        <p className="text-base font-bold text-purple-600 dark:text-purple-400 mb-1">
                          {formatCurrency(event.amount)}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Le {dayOfMonth} de chaque mois
                        </p>
                    </div>
                  )
                  })}
                </div>
              </>
              )}
          </div>
        </div>
      </div>

      {newEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeNewEventModal}
          ></div>
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Nouvelle échéance
              </h2>
              <button
                onClick={closeNewEventModal}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleNewEventSubmit} className="px-6 py-4 space-y-6">
              {newEventError && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
                  {newEventError}
                </div>
              )}

              {/* Section principale - Champs essentiels */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 pb-2 border-b border-gray-200 dark:border-gray-700">
                  Informations principales
                </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Libellé de l'échéance *
                </label>
                <input
                  type="text"
                  value={newEventForm.title}
                  onChange={(e) => setNewEventForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Ex: Loyer, Abonnement Netflix, Salaire..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Type d'échéance *
                  </label>
                  <select
                    value={newEventForm.type}
                    onChange={(e) => setNewEventForm(prev => ({ ...prev, type: e.target.value as 'debit' | 'credit' }))}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                      <option value="debit">Débit (prélèvement)</option>
                      <option value="credit">Crédit (revenu)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Montant *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newEventForm.amount}
                    onChange={(e) => setNewEventForm(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="1200.00"
                    required
                  />
                </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Date d'échéance *
                    </label>
                    <input
                      type="date"
                      value={newEventForm.dueDate}
                      onChange={(e) => setNewEventForm(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Récurrence
                    </label>
                    <select
                      value={newEventForm.recurring}
                      onChange={(e) => setNewEventForm(prev => ({ ...prev, recurring: e.target.value as RecurringOption }))}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                      <option value="none">Aucune (ponctuelle)</option>
                      <option value="weekly">Hebdomadaire</option>
                      <option value="monthly">Mensuelle</option>
                      <option value="quarterly">Trimestrielle</option>
                      <option value="yearly">Annuelle</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Catégorie
                  </label>
                  <select
                    value={newEventForm.categoryId}
                      onChange={(e) => {
                        setNewEventForm(prev => ({ ...prev, categoryId: e.target.value, subCategoryId: '' }))
                        setShowNewSubCategoryInput(false)
                        setNewSubCategoryName('')
                      }}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                      <option value="">Sans catégorie</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.emoji ? `${cat.emoji} ` : ''}{cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Sous-catégorie
                  </label>
                    {newEventForm.categoryId ? (
                      <div className="space-y-2">
                  <select
                          value={newEventForm.subCategoryId}
                          onChange={(e) => {
                            if (e.target.value === '__new__') {
                              setShowNewSubCategoryInput(true)
                              setNewSubCategoryName('')
                            } else {
                              setNewEventForm(prev => ({ ...prev, subCategoryId: e.target.value }))
                              setShowNewSubCategoryInput(false)
                            }
                          }}
                          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        >
                          <option value="">Sans sous-catégorie</option>
                          {subCategories.map(subCat => (
                            <option key={subCat.id} value={subCat.id}>
                              {subCat.name}
                      </option>
                    ))}
                          <option value="__new__">+ Créer une nouvelle sous-catégorie</option>
                  </select>
                        {showNewSubCategoryInput && (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newSubCategoryName}
                              onChange={(e) => setNewSubCategoryName(e.target.value)}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter' && newSubCategoryName.trim()) {
                                  e.preventDefault()
                                  try {
                                    const newSubCat = await createSubCategory(newSubCategoryName.trim(), newEventForm.categoryId)
                                    setNewEventForm(prev => ({ ...prev, subCategoryId: newSubCat.id }))
                                    setShowNewSubCategoryInput(false)
                                    setNewSubCategoryName('')
                                  } catch (error) {
                                    console.error('Error creating subcategory:', error)
                                  }
                                }
                              }}
                              placeholder="Nom de la sous-catégorie"
                              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                if (newSubCategoryName.trim()) {
                                  try {
                                    const newSubCat = await createSubCategory(newSubCategoryName.trim(), newEventForm.categoryId)
                                    setNewEventForm(prev => ({ ...prev, subCategoryId: newSubCat.id }))
                                    setShowNewSubCategoryInput(false)
                                    setNewSubCategoryName('')
                                  } catch (error) {
                                    console.error('Error creating subcategory:', error)
                                  }
                                }
                              }}
                              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowNewSubCategoryInput(false)
                                setNewSubCategoryName('')
                                setNewEventForm(prev => ({ ...prev, subCategoryId: '' }))
                              }}
                              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <select disabled className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed">
                        <option value="">Sélectionnez d'abord une catégorie</option>
                      </select>
                    )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Compte
                  </label>
                  <select
                      value={newEventForm.accountId}
                      onChange={(e) => setNewEventForm(prev => ({ ...prev, accountId: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                      <option value="">Sélectionnez un compte</option>
                      {accounts.map(account => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                  </select>
                  </div>
                </div>
              </div>

              {/* Section options avancées */}
              <details className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <summary className="px-4 py-3 bg-gray-50 dark:bg-gray-800/40 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-all font-medium text-gray-700 dark:text-gray-200">
                  Options avancées
                </summary>
                <div className="px-4 py-4 space-y-4">
              <div className="space-y-3 border border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-900/10 rounded-lg px-4 py-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={newEventForm.notifyByEmail}
                    onChange={(e) => setNewEventForm(prev => ({ ...prev, notifyByEmail: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-200">
                        Recevoir une notification email avant l'échéance
                  </span>
                </label>
                    {newEventForm.notifyByEmail && (
                      <div className="ml-7">
                        <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
                          Délai d'alerte
                        </label>
                  <select
                    value={newEventForm.emailReminderDaysBefore}
                    onChange={(e) => setNewEventForm(prev => ({ ...prev, emailReminderDaysBefore: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    {emailReminderOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                    )}
              </div>

              <label className="flex items-center gap-3 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 bg-gray-50 dark:bg-gray-800/40">
                <input
                  type="checkbox"
                  checked={newEventForm.confirmed}
                  onChange={(e) => setNewEventForm(prev => ({ ...prev, confirmed: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-200">
                      Marquer l'échéance comme déjà confirmée
                </span>
              </label>
                </div>
              </details>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeNewEventModal}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={newEventLoading}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-60 transition-all shadow-md hover:shadow-lg font-medium"
                >
                  {newEventLoading ? 'Enregistrement...' : "Ajouter l'échéance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editModalOpen && editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeEditModal}
          ></div>
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Modifier l'échéance
              </h2>
              <button
                onClick={closeEditModal}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleEditEventSubmit} className="px-6 py-4 space-y-6">
              {editEventError && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
                  {editEventError}
                </div>
              )}

              {/* Section principale - Champs essentiels */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 pb-2 border-b border-gray-200 dark:border-gray-700">
                  Informations principales
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Libellé de l'échéance *
                  </label>
                  <input
                    type="text"
                    value={editEventForm.title}
                    onChange={(e) => setEditEventForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Ex: Loyer, Abonnement Netflix, Salaire..."
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Type d'échéance *
                    </label>
                    <select
                      value={editEventForm.type}
                      onChange={(e) => setEditEventForm(prev => ({ ...prev, type: e.target.value as 'debit' | 'credit' }))}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                      <option value="debit">Débit (prélèvement)</option>
                      <option value="credit">Crédit (revenu)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Montant *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editEventForm.amount}
                      onChange={(e) => setEditEventForm(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="1200.00"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Date d'échéance *
                    </label>
                    <input
                      type="date"
                      value={editEventForm.dueDate}
                      onChange={(e) => setEditEventForm(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Récurrence
                    </label>
                    <select
                      value={editEventForm.recurring}
                      onChange={(e) => setEditEventForm(prev => ({ ...prev, recurring: e.target.value as RecurringOption }))}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                      <option value="none">Aucune (ponctuelle)</option>
                      <option value="weekly">Hebdomadaire</option>
                      <option value="monthly">Mensuelle</option>
                      <option value="quarterly">Trimestrielle</option>
                      <option value="yearly">Annuelle</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Catégorie
                    </label>
                    <select
                      value={editEventForm.categoryId}
                      onChange={(e) => {
                        setEditEventForm(prev => ({ ...prev, categoryId: e.target.value, subCategoryId: '' }))
                        setShowNewSubCategoryInput(false)
                        setNewSubCategoryName('')
                      }}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                      <option value="">Sans catégorie</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.emoji ? `${cat.emoji} ` : ''}{cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Sous-catégorie
                    </label>
                    {editEventForm.categoryId ? (
                      <div className="space-y-2">
                        <select
                          value={editEventForm.subCategoryId}
                          onChange={(e) => {
                            if (e.target.value === '__new__') {
                              setShowNewSubCategoryInput(true)
                              setNewSubCategoryName('')
                            } else {
                              setEditEventForm(prev => ({ ...prev, subCategoryId: e.target.value }))
                              setShowNewSubCategoryInput(false)
                            }
                          }}
                          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        >
                          <option value="">Sans sous-catégorie</option>
                          {subCategories.map(subCat => (
                            <option key={subCat.id} value={subCat.id}>
                              {subCat.name}
                            </option>
                          ))}
                          <option value="__new__">+ Créer une nouvelle sous-catégorie</option>
                        </select>
                        {showNewSubCategoryInput && (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newSubCategoryName}
                              onChange={(e) => setNewSubCategoryName(e.target.value)}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter' && newSubCategoryName.trim()) {
                                  e.preventDefault()
                                  try {
                                    const newSubCat = await createSubCategory(newSubCategoryName.trim(), editEventForm.categoryId)
                                    setEditEventForm(prev => ({ ...prev, subCategoryId: newSubCat.id }))
                                    setShowNewSubCategoryInput(false)
                                    setNewSubCategoryName('')
                                  } catch (error) {
                                    console.error('Error creating subcategory:', error)
                                  }
                                }
                              }}
                              placeholder="Nom de la sous-catégorie"
                              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                if (newSubCategoryName.trim()) {
                                  try {
                                    const newSubCat = await createSubCategory(newSubCategoryName.trim(), editEventForm.categoryId)
                                    setEditEventForm(prev => ({ ...prev, subCategoryId: newSubCat.id }))
                                    setShowNewSubCategoryInput(false)
                                    setNewSubCategoryName('')
                                  } catch (error) {
                                    console.error('Error creating subcategory:', error)
                                  }
                                }
                              }}
                              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowNewSubCategoryInput(false)
                                setNewSubCategoryName('')
                                setEditEventForm(prev => ({ ...prev, subCategoryId: '' }))
                              }}
                              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <select disabled className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed">
                        <option value="">Sélectionnez d'abord une catégorie</option>
                      </select>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Compte
                    </label>
                    <select
                      value={editEventForm.accountId}
                      onChange={(e) => setEditEventForm(prev => ({ ...prev, accountId: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                      <option value="">Sélectionnez un compte</option>
                      {accounts.map(account => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section options avancées */}
              <details className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <summary className="px-4 py-3 bg-gray-50 dark:bg-gray-800/40 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-all font-medium text-gray-700 dark:text-gray-200">
                  Options avancées
                </summary>
                <div className="px-4 py-4 space-y-4">
                  <div className="space-y-3 border border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-900/10 rounded-lg px-4 py-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={editEventForm.confirmed}
                        onChange={(e) => setEditEventForm(prev => ({ ...prev, confirmed: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Marquer comme déjà payé
                      </span>
                    </label>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={editEventForm.notifyByEmail}
                        onChange={(e) => setEditEventForm(prev => ({ ...prev, notifyByEmail: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Activer les notifications par email
                      </span>
                    </label>
                    {editEventForm.notifyByEmail && (
                      <div className="ml-7">
                        <select
                          value={editEventForm.emailReminderDaysBefore}
                          onChange={(e) => setEditEventForm(prev => ({ ...prev, emailReminderDaysBefore: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="0">Le jour même</option>
                          <option value="1">1 jour avant</option>
                          <option value="2">2 jours avant</option>
                          <option value="3">3 jours avant</option>
                          <option value="7">1 semaine avant</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </details>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={editEventLoading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-60 transition-all shadow-md hover:shadow-lg font-medium"
                >
                  {editEventLoading ? 'Modification...' : 'Enregistrer les modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  )
}
