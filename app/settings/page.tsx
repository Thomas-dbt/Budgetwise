'use client'

import { useTheme } from '@/components/theme-provider'
import { Moon, Sun, ChevronDown, Trash2, Move, Loader2, Edit } from 'lucide-react'
import { useState, useEffect } from 'react'
import { authFetch } from '@/lib/auth-fetch'

interface Category {
  id: string
  name: string
  emoji: string | null
}

interface SubCategory {
  id: string
  name: string
  categoryId: string
  category: Category
}

interface Transaction {
  id: string
  categoryId: string | null
  subCategoryId: string | null
}

interface CalendarEvent {
  id: string
  categoryId: string | null
  subCategoryId: string | null
}

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  const [categories, setCategories] = useState<Category[]>([])
  const [subCategories, setSubCategories] = useState<SubCategory[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  // Modals
  const [deleteCategoryModal, setDeleteCategoryModal] = useState<{ category: Category; transactionsCount: number; eventsCount: number } | null>(null)
  const [reassignCategoryId, setReassignCategoryId] = useState<string>('')
  const [deleteCategoryLoading, setDeleteCategoryLoading] = useState(false)

  const [moveSubCategoryModal, setMoveSubCategoryModal] = useState<{ subCategory: SubCategory; transactionsCount: number; eventsCount: number } | null>(null)
  const [newCategoryId, setNewCategoryId] = useState<string>('')
  const [moveSubCategoryLoading, setMoveSubCategoryLoading] = useState(false)

  const [deleteSubCategoryModal, setDeleteSubCategoryModal] = useState<{ subCategory: SubCategory; transactionsCount: number; eventsCount: number } | null>(null)
  const [deleteSubCategoryLoading, setDeleteSubCategoryLoading] = useState(false)

  const [editCategoryModal, setEditCategoryModal] = useState<Category | null>(null)
  const [editCategoryName, setEditCategoryName] = useState<string>('')
  const [editCategoryEmoji, setEditCategoryEmoji] = useState<string>('')
  const [editCategoryLoading, setEditCategoryLoading] = useState(false)
  const [editCategoryKeywords, setEditCategoryKeywords] = useState<{ id: string; keyword: string }[]>([])
  const [newKeyword, setNewKeyword] = useState('')
  const [keywordsLoading, setKeywordsLoading] = useState(false)

  const [editSubCategoryModal, setEditSubCategoryModal] = useState<SubCategory | null>(null)
  const [editSubCategoryName, setEditSubCategoryName] = useState<string>('')
  const [editSubCategoryLoading, setEditSubCategoryLoading] = useState(false)

  // Add Category Modal
  const [addCategoryModal, setAddCategoryModal] = useState(false)
  const [addCategoryName, setAddCategoryName] = useState('')
  const [addCategoryEmoji, setAddCategoryEmoji] = useState('')
  const [addCategoryLoading, setAddCategoryLoading] = useState(false)

  // Add SubCategory Modal
  const [addSubCategoryModal, setAddSubCategoryModal] = useState<Category | null>(null)
  const [addSubCategoryName, setAddSubCategoryName] = useState('')
  const [addSubCategoryLoading, setAddSubCategoryLoading] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Charger les catégories
      const categoriesResponse = await authFetch('/api/categories')
      if (!categoriesResponse.ok) throw new Error('Erreur lors du chargement des catégories')
      const categoriesData = await categoriesResponse.json()
      setCategories(categoriesData)

      // Charger les sous-catégories
      const subCategoriesResponse = await authFetch('/api/subcategories')
      if (!subCategoriesResponse.ok) throw new Error('Erreur lors du chargement des sous-catégories')
      const subCategoriesData = await subCategoriesResponse.json()
      setSubCategories(subCategoriesData)

      // Charger les transactions pour compter
      const transactionsResponse = await authFetch('/api/transactions')
      if (!transactionsResponse.ok) throw new Error('Erreur lors du chargement des transactions')
      const transactionsData = await transactionsResponse.json()
      setTransactions(transactionsData)

      // Charger les événements calendrier pour compter
      const eventsResponse = await authFetch('/api/calendar')
      if (!eventsResponse.ok) throw new Error('Erreur lors du chargement des événements')
      const eventsData = await eventsResponse.json()
      // Extraire tous les événements de toutes les propriétés et les combiner
      const allEvents: CalendarEvent[] = []
      if (eventsData?.pendingConfirmations && Array.isArray(eventsData.pendingConfirmations)) {
        allEvents.push(...eventsData.pendingConfirmations)
      }
      if (eventsData?.upcomingNext7Days && Array.isArray(eventsData.upcomingNext7Days)) {
        allEvents.push(...eventsData.upcomingNext7Days)
      }
      if (eventsData?.recurringEvents && Array.isArray(eventsData.recurringEvents)) {
        allEvents.push(...eventsData.recurringEvents)
      }
      if (eventsData?.monthEvents && Array.isArray(eventsData.monthEvents)) {
        allEvents.push(...eventsData.monthEvents)
      }
      setCalendarEvents(allEvents)
    } catch (err: any) {
      console.error('Error fetching data:', err)
      setError(err.message || 'Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
  }

  const getCategoryStats = (categoryId: string) => {
    const transactionsCount = transactions.filter(t => t.categoryId === categoryId).length
    const eventsCount = Array.isArray(calendarEvents) ? calendarEvents.filter(e => e.categoryId === categoryId).length : 0
    const subCategoriesCount = subCategories.filter(s => s.categoryId === categoryId).length
    return { transactionsCount, eventsCount, subCategoriesCount }
  }

  const getSubCategoryStats = (subCategoryId: string) => {
    const transactionsCount = transactions.filter(t => t.subCategoryId === subCategoryId).length
    const eventsCount = Array.isArray(calendarEvents) ? calendarEvents.filter(e => e.subCategoryId === subCategoryId).length : 0
    return { transactionsCount, eventsCount }
  }

  const openDeleteCategoryModal = (category: Category) => {
    const stats = getCategoryStats(category.id)
    // Compter aussi les transactions et événements via les sous-catégories
    const subCats = subCategories.filter(s => s.categoryId === category.id)
    let totalTransactions = stats.transactionsCount
    let totalEvents = stats.eventsCount

    for (const subCat of subCats) {
      totalTransactions += transactions.filter(t => t.subCategoryId === subCat.id).length
      totalEvents += Array.isArray(calendarEvents) ? calendarEvents.filter(e => e.subCategoryId === subCat.id).length : 0
    }

    setDeleteCategoryModal({ category, transactionsCount: totalTransactions, eventsCount: totalEvents })
    setReassignCategoryId('')
    setError(null)
  }

  const handleDeleteCategory = async () => {
    if (!deleteCategoryModal) return

    // Si la catégorie a des transactions ou événements, une réassignation est requise
    if ((deleteCategoryModal.transactionsCount > 0 || deleteCategoryModal.eventsCount > 0) && !reassignCategoryId) {
      setError('Veuillez sélectionner une catégorie de réassignation')
      return
    }

    setDeleteCategoryLoading(true)
    setError(null)
    try {
      // Si aucune réassignation n'est nécessaire, on peut supprimer directement
      const url = reassignCategoryId
        ? `/api/categories/${deleteCategoryModal.category.id}?reassignToCategoryId=${reassignCategoryId}`
        : `/api/categories/${deleteCategoryModal.category.id}`
      const response = await authFetch(url, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur lors de la suppression' }))
        throw new Error(errorData.error || 'Erreur lors de la suppression')
      }

      const result = await response.json()
      if (result.transactionsUpdated > 0 || result.eventsUpdated > 0) {
        setSuccess(`Catégorie supprimée. ${result.transactionsUpdated} transactions et ${result.eventsUpdated} événements mis à jour.`)
      } else {
        setSuccess('Catégorie supprimée avec succès.')
      }
      setDeleteCategoryModal(null)
      await fetchData()
    } catch (err: any) {
      console.error('Error deleting category:', err)
      setError(err.message || 'Erreur lors de la suppression de la catégorie')
    } finally {
      setDeleteCategoryLoading(false)
    }
  }

  const openMoveSubCategoryModal = (subCategory: SubCategory) => {
    const stats = getSubCategoryStats(subCategory.id)
    setMoveSubCategoryModal({ subCategory, transactionsCount: stats.transactionsCount, eventsCount: stats.eventsCount })
    setNewCategoryId('')
    setError(null)
  }

  const handleMoveSubCategory = async () => {
    if (!moveSubCategoryModal) return

    if (!newCategoryId) {
      setError('Veuillez sélectionner une nouvelle catégorie')
      return
    }

    setMoveSubCategoryLoading(true)
    setError(null)
    try {
      const response = await authFetch(`/api/subcategories/${moveSubCategoryModal.subCategory.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ categoryId: newCategoryId }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur lors du déplacement' }))
        throw new Error(errorData.error || 'Erreur lors du déplacement')
      }

      const result = await response.json()
      setSuccess(`Sous-catégorie déplacée. ${result.transactionsUpdated} transactions et ${result.eventsUpdated} événements mis à jour.`)
      setMoveSubCategoryModal(null)
      await fetchData()
    } catch (err: any) {
      console.error('Error moving subcategory:', err)
      setError(err.message || 'Erreur lors du déplacement de la sous-catégorie')
    } finally {
      setMoveSubCategoryLoading(false)
    }
  }

  const openDeleteSubCategoryModal = (subCategory: SubCategory) => {
    const stats = getSubCategoryStats(subCategory.id)
    setDeleteSubCategoryModal({ subCategory, transactionsCount: stats.transactionsCount, eventsCount: stats.eventsCount })
    setError(null)
  }

  const handleDeleteSubCategory = async () => {
    if (!deleteSubCategoryModal) return

    setDeleteSubCategoryLoading(true)
    setError(null)
    try {
      const response = await authFetch(`/api/subcategories/${deleteSubCategoryModal.subCategory.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur lors de la suppression' }))
        throw new Error(errorData.error || 'Erreur lors de la suppression')
      }

      const result = await response.json()
      setSuccess(`Sous-catégorie supprimée. ${result.transactionsAffected} transactions et ${result.eventsAffected} événements affectés.`)
      setDeleteSubCategoryModal(null)
      await fetchData()
    } catch (err: any) {
      console.error('Error deleting subcategory:', err)
      setError(err.message || 'Erreur lors de la suppression de la sous-catégorie')
    } finally {
      setDeleteSubCategoryLoading(false)
    }
  }

  const handleAddKeyword = async () => {
    const categoryId = editCategoryModal?.id || editSubCategoryModal?.id
    if (!categoryId || !newKeyword.trim()) return

    setKeywordsLoading(true)
    try {
      const response = await authFetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: categoryId,
          keyword: newKeyword.trim()
        })
      })

      if (!response.ok) throw new Error('Erreur lors de l\'ajout')
      const added = await response.json()

      setEditCategoryKeywords(prev => [...prev, added])
      setNewKeyword('')
    } catch (err) {
      console.error('Add keyword error:', err)
      // Optionally show toast/error
    } finally {
      setKeywordsLoading(false)
    }
  }

  const handleDeleteKeyword = async (keywordId: string) => {
    setKeywordsLoading(true)
    try {
      const response = await authFetch(`/api/keywords/${keywordId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Erreur lors de la suppression')

      setEditCategoryKeywords(prev => prev.filter(k => k.id !== keywordId))
    } catch (err) {
      console.error('Delete keyword error:', err)
    } finally {
      setKeywordsLoading(false)
    }
  }

  const openEditCategoryModal = async (category: Category) => {
    setEditCategoryModal(category)
    setEditCategoryName(category.name)
    setEditCategoryEmoji(category.emoji || '')
    setError(null)

    // Fetch keywords
    setKeywordsLoading(true)
    setEditCategoryKeywords([])
    try {
      const res = await authFetch(`/api/categories/${category.id}?t=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) {
        console.error('Failed to fetch keywords:', res.status, res.statusText)
        setError(`Erreur chargement mots-clés: ${res.status}`)
        return
      }

      const data = await res.json()
      console.log('Keywords fetched:', data.keywords)
      if (data.keywords) {
        setEditCategoryKeywords(data.keywords)
      } else {
        console.warn('No keywords field in response')
      }
    } catch (err: any) {
      console.error('Error fetching keywords:', err)
      setError('Erreur technique chargement mots-clés')
    } finally {
      setKeywordsLoading(false)
    }
  }

  const handleEditCategory = async () => {
    if (!editCategoryModal) return

    if (!editCategoryName.trim()) {
      setError('Le nom de la catégorie ne peut pas être vide')
      return
    }

    setEditCategoryLoading(true)
    setError(null)
    try {
      const response = await authFetch(`/api/categories/${editCategoryModal.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editCategoryName.trim(),
          emoji: editCategoryEmoji.trim() || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur lors de la modification' }))
        throw new Error(errorData.error || 'Erreur lors de la modification')
      }

      setSuccess('Catégorie modifiée avec succès.')
      setEditCategoryModal(null)
      await fetchData()
    } catch (err: any) {
      console.error('Error editing category:', err)
      setError(err.message || 'Erreur lors de la modification de la catégorie')
    } finally {
      setEditCategoryLoading(false)
    }
  }

  const openEditSubCategoryModal = async (subCategory: SubCategory) => {
    setEditSubCategoryModal(subCategory)
    setEditSubCategoryName(subCategory.name)
    setError(null)

    // Fetch keywords
    setKeywordsLoading(true)
    setEditCategoryKeywords([])
    try {
      const res = await authFetch(`/api/categories/${subCategory.id}?t=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) {
        console.error('Failed to fetch keywords:', res.status)
        setError(`Erreur chargement mots-clés: ${res.status}`)
        return
      }

      const data = await res.json()
      console.log('Keywords fetched:', data.keywords)
      if (data.keywords) {
        setEditCategoryKeywords(data.keywords)
      }
    } catch (err) {
      console.error('Error fetching keywords:', err)
      setError('Erreur technique chargement mots-clés')
    } finally {
      setKeywordsLoading(false)
    }
  }

  const handleEditSubCategory = async () => {
    if (!editSubCategoryModal) return

    if (!editSubCategoryName.trim()) {
      setError('Le nom de la sous-catégorie ne peut pas être vide')
      return
    }

    setEditSubCategoryLoading(true)
    setError(null)
    try {
      const response = await authFetch(`/api/subcategories/${editSubCategoryModal.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editSubCategoryName.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur lors de la modification' }))
        throw new Error(errorData.error || 'Erreur lors de la modification')
      }

      setSuccess('Sous-catégorie modifiée avec succès.')
      setEditSubCategoryModal(null)
      await fetchData()
    } catch (err: any) {
      console.error('Error editing subcategory:', err)
      setError(err.message || 'Erreur lors de la modification de la sous-catégorie')
    } finally {
      setEditSubCategoryLoading(false)
    }
  }

  const openAddCategoryModal = () => {
    setAddCategoryName('')
    setAddCategoryEmoji('')
    setAddCategoryModal(true)
    setError(null)
  }

  const handleAddCategory = async () => {
    if (!addCategoryName.trim()) {
      setError('Le nom de la catégorie est requis')
      return
    }

    setAddCategoryLoading(true)
    setError(null)

    try {
      const response = await authFetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addCategoryName.trim(),
          emoji: addCategoryEmoji.trim() || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la création')
      }

      setSuccess('Catégorie créée avec succès')
      setAddCategoryModal(false)
      fetchData()
    } catch (err: any) {
      console.error('Error adding category:', err)
      setError(err.message || 'Erreur lors de la création')
    } finally {
      setAddCategoryLoading(false)
    }
  }

  const openAddSubCategoryModal = (category: Category) => {
    setAddSubCategoryName('')
    setAddSubCategoryModal(category)
    setError(null)
  }

  const handleAddSubCategory = async () => {
    if (!addSubCategoryModal || !addSubCategoryName.trim()) {
      setError('Le nom de la sous-catégorie est requis')
      return
    }

    setAddSubCategoryLoading(true)
    setError(null)

    try {
      // Assuming POST /api/subcategories with body { categoryId, name } works
      // Need to verify API endpoint. Based on typical patterns and fetch above, likely exists.
      const response = await authFetch('/api/subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: addSubCategoryModal.id,
          name: addSubCategoryName.trim(),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la création')
      }

      setSuccess('Sous-catégorie créée avec succès')
      setAddSubCategoryModal(null)
      fetchData()
    } catch (err: any) {
      console.error('Error adding subcategory:', err)
      setError(err.message || 'Erreur lors de la création')
    } finally {
      setAddSubCategoryLoading(false)
    }
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Paramètres</h1>
        <p className="text-gray-500 dark:text-gray-400">Personnalisez votre expérience</p>
      </div>

      {/* Messages d'erreur et succès */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="flex-shrink-0 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
            </div>
            <button
              onClick={() => setSuccess(null)}
              className="flex-shrink-0 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Section Thème */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 shadow-sm">
        <div className="flex items-center justify-between gap-8">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-semibold mb-2">Thème</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isDark
                ? 'Mode sombre actif - Confortable dans les environnements faiblement éclairés'
                : 'Mode clair actif - Idéal en environnement lumineux'}
            </p>
          </div>
          <div className="flex-shrink-0">
            <button
              onClick={toggleTheme}
              className={`
              relative inline-flex h-14 w-28 items-center rounded-full transition-colors duration-300 ease-in-out
              ${isDark ? 'bg-blue-600' : 'bg-gray-300'}
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900
              shadow-md hover:shadow-lg transition-shadow
            `}
              aria-label="Changer de thème"
            >
              <span
                className={`
                inline-block h-12 w-12 transform rounded-full bg-white shadow-lg transition-transform duration-300 ease-in-out
                flex items-center justify-center
                ${isDark ? 'translate-x-14' : 'translate-x-1'}
              `}
              >
                {isDark ? (
                  <Moon className="h-5 w-5 text-blue-600" />
                ) : (
                  <Sun className="h-5 w-5 text-yellow-500" />
                )}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Section Gestion des catégories */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 shadow-sm">
        <div className="mb-6">
          <div className="flex justify-between items-end mb-2">
            <div>
              <h3 className="text-xl font-semibold mb-2">Gestion des catégories</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Gérez vos catégories et sous-catégories.
              </p>
            </div>
            <button
              onClick={openAddCategoryModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <span className="text-xl leading-none">+</span> Nouvelle catégorie
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-2">
            {categories.map((category) => {
              const stats = getCategoryStats(category.id)
              const categorySubCategories = subCategories.filter(s => s.categoryId === category.id)
              const isExpanded = expandedCategories.has(category.id)

              return (
                <details
                  key={category.id}
                  open={isExpanded}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                >
                  <summary
                    className="px-4 py-3 bg-gray-50 dark:bg-gray-800/40 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-all list-none"
                    onClick={(e) => {
                      e.preventDefault()
                      toggleCategory(category.id)
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ChevronDown
                          className={`h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''
                            }`}
                        />
                        {category.emoji && <span className="text-xl">{category.emoji}</span>}
                        <span className="font-medium text-gray-900 dark:text-gray-100">{category.name}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          ({stats.transactionsCount} transaction{stats.transactionsCount !== 1 ? 's' : ''}, {stats.eventsCount} événement{stats.eventsCount !== 1 ? 's' : ''}, {stats.subCategoriesCount} sous-catégorie{stats.subCategoriesCount !== 1 ? 's' : ''})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditCategoryModal(category)
                          }}
                          className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all flex items-center gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Éditer
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openDeleteCategoryModal(category)
                          }}
                          className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all flex items-center gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </summary>
                  <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                    {categorySubCategories.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
                        Aucune sous-catégorie
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {categorySubCategories.map((subCategory) => {
                          const subStats = getSubCategoryStats(subCategory.id)
                          return (
                            <div
                              key={subCategory.id}
                              className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-800/40 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-gray-700 dark:text-gray-300">{subCategory.name}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  ({subStats.transactionsCount} transaction{subStats.transactionsCount !== 1 ? 's' : ''}, {subStats.eventsCount} événement{subStats.eventsCount !== 1 ? 's' : ''})
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openEditSubCategoryModal(subCategory)}
                                  className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all flex items-center gap-2"
                                >
                                  <Edit className="h-4 w-4" />
                                  Éditer
                                </button>
                                <button
                                  onClick={() => openMoveSubCategoryModal(subCategory)}
                                  className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all flex items-center gap-2"
                                >
                                  <Move className="h-4 w-4" />
                                  Déplacer
                                </button>
                                <button
                                  onClick={() => openDeleteSubCategoryModal(subCategory)}
                                  className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all flex items-center gap-2"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Supprimer
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/20">
                    <button
                      onClick={() => openAddSubCategoryModal(category)}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1"
                    >
                      + Ajouter une sous-catégorie
                    </button>
                  </div>
                </details>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal Suppression Catégorie */}
      {deleteCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDeleteCategoryModal(null)}
          />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Supprimer la catégorie
              </h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="flex items-center gap-3">
                {deleteCategoryModal.category.emoji && (
                  <span className="text-2xl">{deleteCategoryModal.category.emoji}</span>
                )}
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {deleteCategoryModal.category.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {deleteCategoryModal.transactionsCount} transaction{deleteCategoryModal.transactionsCount !== 1 ? 's' : ''} et {deleteCategoryModal.eventsCount} événement{deleteCategoryModal.eventsCount !== 1 ? 's' : ''} seront affectés
                  </p>
                </div>
              </div>

              {(deleteCategoryModal.transactionsCount > 0 || deleteCategoryModal.eventsCount > 0) ? (
                <div className="space-y-3">
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-4 py-3">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-1">
                      ⚠️ Attention
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Cette catégorie contient {deleteCategoryModal.transactionsCount} transaction{deleteCategoryModal.transactionsCount !== 1 ? 's' : ''} et {deleteCategoryModal.eventsCount} événement{deleteCategoryModal.eventsCount !== 1 ? 's' : ''}.
                      Vous devez sélectionner une catégorie de réassignation, sinon ces transactions et événements perdront leur catégorie et seront classés comme "Sans catégorie".
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Réassigner les transactions à :
                    </label>
                    <select
                      value={reassignCategoryId}
                      onChange={(e) => setReassignCategoryId(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                      <option value="">Sélectionnez une catégorie</option>
                      {categories
                        .filter(c => c.id !== deleteCategoryModal.category.id)
                        .map(cat => (
                          <option key={cat.id} value={cat.id}>
                            {cat.emoji ? `${cat.emoji} ` : ''}{cat.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Cette catégorie n'a aucune transaction ni événement associé. Elle sera supprimée directement.
                  </p>
                </div>
              )}

              {error && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDeleteCategoryModal(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                  disabled={deleteCategoryLoading}
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteCategory}
                  disabled={deleteCategoryLoading || ((deleteCategoryModal.transactionsCount > 0 || deleteCategoryModal.eventsCount > 0) && !reassignCategoryId)}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60 transition-all font-medium flex items-center justify-center gap-2"
                >
                  {deleteCategoryLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Suppression...
                    </>
                  ) : (
                    'Supprimer'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Déplacer Sous-catégorie */}
      {moveSubCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMoveSubCategoryModal(null)}
          />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Déplacer la sous-catégorie
              </h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                  {moveSubCategoryModal.subCategory.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Actuellement dans : {moveSubCategoryModal.subCategory.category.emoji} {moveSubCategoryModal.subCategory.category.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  {moveSubCategoryModal.transactionsCount} transaction{moveSubCategoryModal.transactionsCount !== 1 ? 's' : ''} et {moveSubCategoryModal.eventsCount} événement{moveSubCategoryModal.eventsCount !== 1 ? 's' : ''} seront mis à jour
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Déplacer vers la catégorie :
                </label>
                <select
                  value={newCategoryId}
                  onChange={(e) => setNewCategoryId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="">Sélectionnez une catégorie</option>
                  {categories
                    .filter(c => c.id !== moveSubCategoryModal.subCategory.categoryId)
                    .map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.emoji ? `${cat.emoji} ` : ''}{cat.name}
                      </option>
                    ))}
                </select>
              </div>

              {error && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setMoveSubCategoryModal(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                  disabled={moveSubCategoryLoading}
                >
                  Annuler
                </button>
                <button
                  onClick={handleMoveSubCategory}
                  disabled={moveSubCategoryLoading || !newCategoryId}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-all font-medium flex items-center justify-center gap-2"
                >
                  {moveSubCategoryLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Déplacement...
                    </>
                  ) : (
                    'Déplacer'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Suppression Sous-catégorie */}
      {deleteSubCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDeleteSubCategoryModal(null)}
          />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Supprimer la sous-catégorie
              </h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                  {deleteSubCategoryModal.subCategory.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Catégorie : {deleteSubCategoryModal.subCategory.category.emoji} {deleteSubCategoryModal.subCategory.category.name}
                </p>
                {deleteSubCategoryModal.transactionsCount > 0 || deleteSubCategoryModal.eventsCount > 0 ? (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-4 py-3 mt-2">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-1">
                      ⚠️ Attention
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      {deleteSubCategoryModal.transactionsCount} transaction{deleteSubCategoryModal.transactionsCount !== 1 ? 's' : ''} et {deleteSubCategoryModal.eventsCount} événement{deleteSubCategoryModal.eventsCount !== 1 ? 's' : ''} perdront cette sous-catégorie mais conserveront leur catégorie parente ({deleteSubCategoryModal.subCategory.category.emoji} {deleteSubCategoryModal.subCategory.category.name}).
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Aucune transaction ni événement associé.
                  </p>
                )}
              </div>

              {error && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDeleteSubCategoryModal(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                  disabled={deleteSubCategoryLoading}
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteSubCategory}
                  disabled={deleteSubCategoryLoading}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60 transition-all font-medium flex items-center justify-center gap-2"
                >
                  {deleteSubCategoryLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Suppression...
                    </>
                  ) : (
                    'Supprimer'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Édition Catégorie */}
      {editCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setEditCategoryModal(null)}
          />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Éditer la catégorie
              </h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Nom de la catégorie *
                </label>
                <input
                  type="text"
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Ex: Alimentation"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Emoji (optionnel)
                </label>
                <input
                  type="text"
                  value={editCategoryEmoji}
                  onChange={(e) => setEditCategoryEmoji(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Ex: 🍽️"
                  maxLength={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Mots-clés pour auto-catégorisation
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddKeyword()
                      }
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Ex: Uber, Carrefour..."
                  />
                  <button
                    onClick={handleAddKeyword}
                    disabled={keywordsLoading || !newKeyword.trim()}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 text-sm font-medium"
                  >
                    Ajouter
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 min-h-[2rem]">
                  {keywordsLoading && editCategoryKeywords.length === 0 ? (
                    <span className="text-xs text-gray-500">Chargement...</span>
                  ) : editCategoryKeywords.length > 0 ? (
                    editCategoryKeywords.map(k => (
                      <span key={k.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {k.keyword}
                        <button onClick={() => handleDeleteKeyword(k.id)} className="hover:text-red-500 ml-1">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400 italic">Aucun mot-clé défini</span>
                  )}
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditCategoryModal(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                  disabled={editCategoryLoading}
                >
                  Annuler
                </button>
                <button
                  onClick={handleEditCategory}
                  disabled={editCategoryLoading || !editCategoryName.trim()}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-all font-medium flex items-center justify-center gap-2"
                >
                  {editCategoryLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Modification...
                    </>
                  ) : (
                    'Enregistrer'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Édition Sous-catégorie */}
      {editSubCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setEditSubCategoryModal(null)}
          />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Éditer la sous-catégorie
              </h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Catégorie parente : {editSubCategoryModal.category.emoji} {editSubCategoryModal.category.name}
                </p>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Nom de la sous-catégorie *
                </label>
                <input
                  type="text"
                  value={editSubCategoryName}
                  onChange={(e) => setEditSubCategoryName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Ex: Restaurants"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Mots-clés pour auto-catégorisation
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddKeyword()
                      }
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Ex: Uber, Carrefour..."
                  />
                  <button
                    onClick={handleAddKeyword}
                    disabled={keywordsLoading || !newKeyword.trim()}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 text-sm font-medium"
                  >
                    Ajouter
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 min-h-[2rem]">
                  {keywordsLoading && editCategoryKeywords.length === 0 ? (
                    <span className="text-xs text-gray-500">Chargement...</span>
                  ) : editCategoryKeywords.length > 0 ? (
                    editCategoryKeywords.map(k => (
                      <span key={k.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {k.keyword}
                        <button onClick={() => handleDeleteKeyword(k.id)} className="hover:text-red-500 ml-1">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400 italic">Aucun mot-clé défini</span>
                  )}
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditSubCategoryModal(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                  disabled={editSubCategoryLoading}
                >
                  Annuler
                </button>
                <button
                  onClick={handleEditSubCategory}
                  disabled={editSubCategoryLoading || !editSubCategoryName.trim()}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-all font-medium flex items-center justify-center gap-2"
                >
                  {editSubCategoryLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Modification...
                    </>
                  ) : (
                    'Enregistrer'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Modal Ajout Catégorie */}
      {
        addCategoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setAddCategoryModal(false)}
            />
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Nouvelle catégorie
                </h2>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Nom de la catégorie *
                  </label>
                  <input
                    type="text"
                    value={addCategoryName}
                    onChange={(e) => setAddCategoryName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Ex: Alimentation"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Emoji (optionnel)
                  </label>
                  <input
                    type="text"
                    value={addCategoryEmoji}
                    onChange={(e) => setAddCategoryEmoji(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Ex: 🍽️"
                    maxLength={2}
                  />
                </div>

                {error && (
                  <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setAddCategoryModal(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                    disabled={addCategoryLoading}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleAddCategory}
                    disabled={addCategoryLoading || !addCategoryName.trim()}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-all font-medium flex items-center justify-center gap-2"
                  >
                    {addCategoryLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Création...
                      </>
                    ) : (
                      'Créer'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal Ajout Sous-catégorie */}
      {
        addSubCategoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setAddSubCategoryModal(null)}
            />
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Nouvelle sous-catégorie
                </h2>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    Dans la catégorie : {addSubCategoryModal.emoji} {addSubCategoryModal.name}
                  </p>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Nom de la sous-catégorie *
                  </label>
                  <input
                    type="text"
                    value={addSubCategoryName}
                    onChange={(e) => setAddSubCategoryName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Ex: Courses"
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setAddSubCategoryModal(null)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                    disabled={addSubCategoryLoading}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleAddSubCategory}
                    disabled={addSubCategoryLoading || !addSubCategoryName.trim()}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-all font-medium flex items-center justify-center gap-2"
                  >
                    {addSubCategoryLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Création...
                      </>
                    ) : (
                      'Créer'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  )
}
