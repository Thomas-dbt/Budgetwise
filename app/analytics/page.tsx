'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface StatisticsData {
  monthlyIncome: number
  monthlyExpenses: number
  categoryData: Array<{ name: string; amount: number }>
  monthlyEvolution: Array<{
    month: string
    revenus: number
    depenses: number
    solde: number
  }>
  topExpenses: Array<{
    id: string
    description: string
    amount: number
    category: string
    date: string
  }>
  accountData: Array<{ name: string; amount: number }>
}

interface Transaction {
  id: string
  amount: number
  type: 'income' | 'expense' | 'transfer'
  date: string
  description: string | null
  category: { id: string; name: string } | null
  subCategory: { id: string; name: string } | null
  account: { name: string }
  pending: boolean
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1']

const categoryColors: Record<string, string> = {
  'Alimentation': '#f59e0b',
  'Transport': '#3b82f6',
  'Logement': '#8b5cf6',
  'Loisirs': '#ec4899',
  'Santé': '#ef4444',
  'Shopping': '#eab308',
  'Abonnements': '#6366f1',
  'Énergie': '#10b981',
  'Assurances': '#ef4444',
  'Voyages': '#06b6d4',
  'Autres': '#6b7280'
}

type ViewMode = 'yearly' | 'monthly' | 'daily'

export default function StatisticsPage() {
  const [data, setData] = useState<StatisticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('monthly')
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<{ month: string; year: number; monthIndex: number } | null>(null)
  const [yearTransactions, setYearTransactions] = useState<Transaction[]>([])
  const [monthTransactions, setMonthTransactions] = useState<Transaction[]>([])
  const [loadingMonthDetails, setLoadingMonthDetails] = useState(false)
  const [yearlyData, setYearlyData] = useState<Array<{ year: number; revenus: number; depenses: number; solde: number }>>([])
  const [loadingYearlyData, setLoadingYearlyData] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<{ name: string; id: string } | null>(null)
  const [subCategoryData, setSubCategoryData] = useState<Array<{ name: string; amount: number }>>([])
  const [loadingSubCategories, setLoadingSubCategories] = useState(false)
  const [filteredCategoryData, setFilteredCategoryData] = useState<Array<{ name: string; amount: number }>>([])
  const [loadingCategoryData, setLoadingCategoryData] = useState(false)
  const [filteredAccountData, setFilteredAccountData] = useState<Array<{ name: string; amount: number }>>([])
  const [loadingAccountData, setLoadingAccountData] = useState(false)
  const [filteredTopExpenses, setFilteredTopExpenses] = useState<Array<{
    id: string
    description: string
    amount: number
    category: string
    date: string
  }>>([])
  const [loadingTopExpenses, setLoadingTopExpenses] = useState(false)

  useEffect(() => {
    fetchStatistics()
  }, [])

  const fetchStatistics = async () => {
    try {
      const response = await authFetch('/api/statistics')
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
        console.error('Erreur API:', response.status, errorData)
        throw new Error(errorData.error || `Erreur ${response.status}`)
      }
      const statsData = await response.json()
      setData(statsData)
      setLoading(false)
    } catch (error: any) {
      console.error('Error fetching statistics:', error)
      setLoading(false)
      // Ne pas définir data à null pour afficher un message d'erreur plus détaillé
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  const formatDateFull = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'long',
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    })
  }

  const groupTransactionsByDay = (transactions: Transaction[]) => {
    const grouped: Record<string, Transaction[]> = {}
    transactions.forEach(tx => {
      const dateKey = new Date(tx.date).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(tx)
    })
    return grouped
  }

  const prepareDailyData = (transactions: Transaction[]) => {
    const dailyData: Record<string, { revenus: number; depenses: number; solde: number; date: Date }> = {}
    
    transactions.forEach(tx => {
      const txDate = new Date(tx.date)
      const dateKey = txDate.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short'
      })
      
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { revenus: 0, depenses: 0, solde: 0, date: new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate()) }
      }
      
      if (tx.type === 'income') {
        dailyData[dateKey].revenus += Number(tx.amount)
      } else if (tx.type === 'expense') {
        dailyData[dateKey].depenses += Math.abs(Number(tx.amount))
      }
    })
    
    // Calculer le solde pour chaque jour
    Object.keys(dailyData).forEach(day => {
      dailyData[day].solde = dailyData[day].revenus - dailyData[day].depenses
    })
    
    // Convertir en tableau et trier par date
    const sortedDays = Object.entries(dailyData)
      .map(([day, data]) => ({
        day,
        revenus: data.revenus,
        depenses: data.depenses,
        solde: data.solde,
        date: data.date
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
    
    return sortedDays
  }

  const prepareYearlyData = async () => {
    try {
      const response = await authFetch('/api/transactions?take=10000')
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des transactions')
      }
      const transactions: Transaction[] = await response.json()
      
      const yearlyData: Record<number, { revenus: number; depenses: number; solde: number }> = {}
      
      transactions.forEach(tx => {
        const txDate = new Date(tx.date)
        const year = txDate.getFullYear()
        
        if (!yearlyData[year]) {
          yearlyData[year] = { revenus: 0, depenses: 0, solde: 0 }
        }
        
        if (tx.type === 'income') {
          yearlyData[year].revenus += Number(tx.amount)
        } else if (tx.type === 'expense') {
          yearlyData[year].depenses += Math.abs(Number(tx.amount))
        }
      })
      
      // Calculer le solde pour chaque année
      Object.keys(yearlyData).forEach(year => {
        yearlyData[parseInt(year)].solde = yearlyData[parseInt(year)].revenus - yearlyData[parseInt(year)].depenses
      })
      
      // Convertir en tableau et trier par année
      const sortedYears = Object.entries(yearlyData)
        .map(([year, data]) => ({
          year: parseInt(year),
          revenus: data.revenus,
          depenses: data.depenses,
          solde: data.solde
        }))
        .sort((a, b) => a.year - b.year)
      
      return sortedYears
    } catch (error) {
      console.error('Error preparing yearly data:', error)
      return []
    }
  }

  const prepareMonthlyDataForYear = (transactions: Transaction[], year: number) => {
    const monthlyData: Record<number, { month: string; revenus: number; depenses: number; solde: number }> = {}
    const monthNames = ['janv.', 'fév.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
    
    // Initialiser tous les mois de l'année
    for (let i = 0; i < 12; i++) {
      monthlyData[i] = {
        month: monthNames[i],
        revenus: 0,
        depenses: 0,
        solde: 0
      }
    }
    
    transactions.forEach(tx => {
      const txDate = new Date(tx.date)
      if (txDate.getFullYear() === year) {
        const monthIndex = txDate.getMonth()
        
        if (tx.type === 'income') {
          monthlyData[monthIndex].revenus += Number(tx.amount)
        } else if (tx.type === 'expense') {
          monthlyData[monthIndex].depenses += Math.abs(Number(tx.amount))
        }
      }
    })
    
    // Calculer le solde pour chaque mois
    Object.keys(monthlyData).forEach(monthIndex => {
      const idx = parseInt(monthIndex)
      monthlyData[idx].solde = monthlyData[idx].revenus - monthlyData[idx].depenses
    })
    
    // Convertir en tableau trié
    return Object.values(monthlyData)
  }

  const getFilteredTransactions = async () => {
    // Si on a déjà les transactions du mois chargées, les utiliser
    if (selectedMonth && monthTransactions.length > 0) {
      return monthTransactions
    }
    
    // Si on a les transactions de l'année chargées, les filtrer pour le mois
    if (selectedMonth && yearTransactions.length > 0) {
      const { year, monthIndex } = selectedMonth
      const monthStart = new Date(year, monthIndex, 1)
      const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59)
      return yearTransactions.filter(tx => {
        const txDate = new Date(tx.date)
        return txDate >= monthStart && txDate <= monthEnd
      })
    }
    
    // Si on a une année sélectionnée mais pas de mois, utiliser les transactions de l'année
    if (selectedYear && !selectedMonth && yearTransactions.length > 0) {
      return yearTransactions
    }
    
    // Sinon, charger toutes les transactions
    const response = await authFetch('/api/transactions?take=10000')
    if (!response.ok) {
      throw new Error('Erreur lors du chargement des transactions')
    }
    const transactions: Transaction[] = await response.json()
    
    // Filtrer selon la période sélectionnée
    if (selectedMonth) {
      const { year, monthIndex } = selectedMonth
      const monthStart = new Date(year, monthIndex, 1)
      const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59)
      return transactions.filter(tx => {
        const txDate = new Date(tx.date)
        return txDate >= monthStart && txDate <= monthEnd
      })
    }
    
    if (selectedYear) {
      const yearStart = new Date(selectedYear, 0, 1)
      const yearEnd = new Date(selectedYear, 11, 31, 23, 59, 59)
      return transactions.filter(tx => {
        const txDate = new Date(tx.date)
        return txDate >= yearStart && txDate <= yearEnd
      })
    }
    
    // Par défaut, 6 derniers mois
    const now = new Date()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    return transactions.filter(tx => {
      const txDate = new Date(tx.date)
      return txDate >= sixMonthsAgo
    })
  }

  const prepareCategoryData = async () => {
    setLoadingCategoryData(true)
    try {
      const transactions = await getFilteredTransactions()
      
      // Grouper par catégorie
      const categoryExpenses: Record<string, number> = {}
      
      transactions
        .filter(tx => tx.type === 'expense')
        .forEach(tx => {
          const categoryName = tx.category?.name || 'Sans catégorie'
          categoryExpenses[categoryName] = (categoryExpenses[categoryName] || 0) + Math.abs(Number(tx.amount))
        })
      
      // Convertir en tableau et trier par montant décroissant
      const sorted = Object.entries(categoryExpenses)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
      
      setFilteredCategoryData(sorted)
    } catch (error) {
      console.error('Error preparing category data:', error)
      setFilteredCategoryData([])
    } finally {
      setLoadingCategoryData(false)
    }
  }

  const prepareAccountData = async () => {
    setLoadingAccountData(true)
    try {
      const transactions = await getFilteredTransactions()
      
      // Grouper par compte
      const accountExpenses: Record<string, number> = {}
      
      transactions
        .filter(tx => tx.type === 'expense')
        .forEach(tx => {
          const accountName = tx.account?.name || 'Sans compte'
          accountExpenses[accountName] = (accountExpenses[accountName] || 0) + Math.abs(Number(tx.amount))
        })
      
      // Convertir en tableau et trier par montant décroissant
      const sorted = Object.entries(accountExpenses)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
      
      setFilteredAccountData(sorted)
    } catch (error) {
      console.error('Error preparing account data:', error)
      setFilteredAccountData([])
    } finally {
      setLoadingAccountData(false)
    }
  }

  const prepareTopExpenses = async () => {
    setLoadingTopExpenses(true)
    try {
      const transactions = await getFilteredTransactions()
      
      // Filtrer les dépenses et trier par montant décroissant
      const expenses = transactions
        .filter(tx => tx.type === 'expense')
        .map(tx => ({
          id: tx.id,
          description: tx.description || 'Sans description',
          amount: Math.abs(Number(tx.amount)),
          category: tx.category?.name || 'Sans catégorie',
          date: tx.date
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5) // Top 5
      
      setFilteredTopExpenses(expenses)
    } catch (error) {
      console.error('Error preparing top expenses:', error)
      setFilteredTopExpenses([])
    } finally {
      setLoadingTopExpenses(false)
    }
  }

  const prepareSubCategoryData = async (categoryName: string, categoryId: string) => {
    setLoadingSubCategories(true)
    try {
      const transactions = await getFilteredTransactions()
      
      // Filtrer les transactions de la catégorie sélectionnée
      const categoryTransactions = transactions.filter(tx => {
        return tx.type === 'expense' && tx.category?.id === categoryId
      })
      
      // Grouper par sous-catégorie
      const subCategoryExpenses: Record<string, number> = {}
      
      categoryTransactions.forEach(tx => {
        const subCategoryName = tx.subCategory?.name || 'Sans sous-catégorie'
        subCategoryExpenses[subCategoryName] = (subCategoryExpenses[subCategoryName] || 0) + Math.abs(Number(tx.amount))
      })
      
      // Convertir en tableau et trier par montant décroissant
      const sorted = Object.entries(subCategoryExpenses)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
      
      setSubCategoryData(sorted)
    } catch (error) {
      console.error('Error preparing subcategory data:', error)
      setSubCategoryData([])
    } finally {
      setLoadingSubCategories(false)
    }
  }

  const handleCategoryClick = async (categoryName: string) => {
    // Récupérer l'ID de la catégorie depuis l'API
    try {
      const categoriesResponse = await authFetch('/api/categories')
      if (categoriesResponse.ok) {
        const categories = await categoriesResponse.json()
        const foundCategory = categories.find((cat: any) => cat.name === categoryName)
        if (foundCategory) {
          setSelectedCategory({ name: categoryName, id: foundCategory.id })
          await prepareSubCategoryData(categoryName, foundCategory.id)
        }
      }
    } catch (error) {
      console.error('Error fetching category ID:', error)
    }
  }

  useEffect(() => {
    if (viewMode === 'yearly') {
      setLoadingYearlyData(true)
      prepareYearlyData().then(data => {
        setYearlyData(data)
        setLoadingYearlyData(false)
      })
    }
  }, [viewMode])

  useEffect(() => {
    prepareCategoryData()
    prepareAccountData()
    prepareTopExpenses()
  }, [selectedYear, selectedMonth, yearTransactions, monthTransactions])

  const handleYearClick = async (year: number) => {
    setSelectedYear(year)
    setSelectedMonth(null)
    setSelectedCategory(null)
    setSubCategoryData([])
    setViewMode('monthly')
    setLoadingMonthDetails(true)
    
    try {
      const response = await authFetch('/api/transactions?take=10000')
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des transactions')
      }
      const transactions: Transaction[] = await response.json()
      
      // Filtrer les transactions de l'année sélectionnée
      const yearStart = new Date(year, 0, 1)
      const yearEnd = new Date(year, 11, 31, 23, 59, 59)
      
      const filtered = transactions.filter(tx => {
        const txDate = new Date(tx.date)
        return txDate >= yearStart && txDate <= yearEnd
      })
      
      setYearTransactions(filtered)
    } catch (error) {
      console.error('Error loading year details:', error)
      setYearTransactions([])
    } finally {
      setLoadingMonthDetails(false)
    }
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
        <div className="text-center py-12">
          <div className="text-red-500 text-lg font-semibold mb-2">Erreur lors du chargement</div>
          <div className="text-gray-500 dark:text-gray-400 text-sm">
            Vérifiez que vous êtes connecté et que la base de données est accessible.
          </div>
          <button
            onClick={fetchStatistics}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  const safeData = {
    monthlyIncome: data.monthlyIncome || 0,
    monthlyExpenses: data.monthlyExpenses || 0,
    categoryData: data.categoryData || [],
    monthlyEvolution: data.monthlyEvolution || [],
    topExpenses: data.topExpenses || [],
    accountData: data.accountData || []
  }

  const handleMonthClick = async (monthIndex: number, year: number) => {
    const monthNames = ['janv.', 'fév.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
    const monthName = monthNames[monthIndex]
    
    setSelectedMonth({ month: monthName, year, monthIndex })
    setSelectedCategory(null)
    setSubCategoryData([])
    setViewMode('daily')
    setLoadingMonthDetails(true)
    
    try {
      // Utiliser les transactions de l'année déjà chargées ou les charger
      let transactions = yearTransactions
      if (transactions.length === 0) {
        const response = await authFetch('/api/transactions?take=10000')
        if (!response.ok) {
          throw new Error('Erreur lors du chargement des transactions')
        }
        transactions = await response.json()
      }
      
      // Filtrer les transactions du mois sélectionné
      const monthStart = new Date(year, monthIndex, 1)
      const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59)
      
      const filtered = transactions.filter(tx => {
        const txDate = new Date(tx.date)
        return txDate >= monthStart && txDate <= monthEnd
      })
      
      // Trier par date décroissante
      filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      
      setMonthTransactions(filtered)
    } catch (error) {
      console.error('Error loading month details:', error)
      setMonthTransactions([])
    } finally {
      setLoadingMonthDetails(false)
    }
  }

  // Tooltip personnalisé
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null
    
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-lg">
        <p className="font-semibold mb-2 text-gray-900 dark:text-gray-100">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-sm mb-1">
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    )
  }

  // Composant pour les points cliquables (normaux et actifs)
  const createClickableDot = (fill: string, isActive = false) => {
    return (props: any) => {
      const { cx, cy } = props
      
      if (cx === null || cy === null || cx === undefined || cy === undefined) return null
      
      return (
        <circle
          cx={cx}
          cy={cy}
          r={isActive ? 10 : 8}
          fill={fill}
          stroke="white"
          strokeWidth={isActive ? 3 : 2}
          style={{ cursor: 'pointer' }}
        />
      )
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold">Statistiques</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Analysez vos dépenses et revenus</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Revenus du Mois</h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{formatCurrency(safeData.monthlyIncome)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Dépenses du Mois</h3>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">{formatCurrency(safeData.monthlyExpenses)}</p>
        </div>
      </div>

      {/* Navigation entre les vues */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">
              {viewMode === 'yearly' && 'Évolution annuelle'}
              {viewMode === 'monthly' && selectedYear && `Évolution mensuelle - ${selectedYear}`}
              {viewMode === 'monthly' && !selectedYear && 'Évolution mensuelle'}
              {viewMode === 'daily' && selectedMonth && `Évolution journalière - ${selectedMonth.month} ${selectedMonth.year}`}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setViewMode('yearly')
                  setSelectedYear(null)
                  setSelectedMonth(null)
                  setSelectedCategory(null)
                  setSubCategoryData([])
                }}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  viewMode === 'yearly' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Années
              </button>
              <button
                onClick={() => {
                  setViewMode('monthly')
                  setSelectedMonth(null)
                  setSelectedCategory(null)
                  setSubCategoryData([])
                  if (!selectedYear) {
                    setSelectedYear(null)
                  }
                }}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  viewMode === 'monthly' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Mois
              </button>
              <button
                onClick={() => {
                  if (!selectedMonth) {
                    // Si aucun mois n'est sélectionné, utiliser le mois actuel
                    const now = new Date()
                    const monthNames = ['janv.', 'fév.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
                    setSelectedMonth({ 
                      month: monthNames[now.getMonth()], 
                      year: now.getFullYear(), 
                      monthIndex: now.getMonth() 
                    })
                    setSelectedYear(now.getFullYear())
                    // Charger les transactions du mois actuel
                    handleMonthClick(now.getMonth(), now.getFullYear())
                  } else {
                    setViewMode('daily')
                  }
                }}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  viewMode === 'daily' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Journalier
              </button>
            </div>
          </div>
          {(viewMode === 'monthly' && selectedYear) || viewMode === 'daily' ? (
            <button
              onClick={() => {
                if (viewMode === 'daily') {
                  setViewMode('monthly')
                  setSelectedMonth(null)
                  setSelectedCategory(null)
                  setSubCategoryData([])
                } else if (viewMode === 'monthly' && selectedYear) {
                  setViewMode('yearly')
                  setSelectedYear(null)
                  setSelectedCategory(null)
                  setSubCategoryData([])
                }
              }}
              className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              ← Retour
            </button>
          ) : null}
        </div>
        
        {viewMode === 'yearly' && (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Cliquez sur un point du graphique pour voir les mois de l'année</p>
            {loadingYearlyData ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-500 dark:text-gray-400">Chargement des données...</p>
              </div>
            ) : yearlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart 
                  data={yearlyData}
                  onClick={(e: any) => {
                    if (e && e.activePayload && e.activePayload.length > 0) {
                      const year = e.activePayload[0].payload?.year
                      if (year) {
                        handleYearClick(year)
                      }
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                  <XAxis 
                    dataKey="year" 
                    stroke="#6b7280"
                    className="dark:stroke-gray-400"
                  />
                  <YAxis 
                    stroke="#6b7280"
                    className="dark:stroke-gray-400"
                    tickFormatter={(value) => `${value}€`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="revenus" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Revenus"
                    dot={createClickableDot('#10b981', false)}
                    activeDot={createClickableDot('#10b981', true)}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="depenses" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    name="Dépenses"
                    dot={createClickableDot('#ef4444', false)}
                    activeDot={createClickableDot('#ef4444', true)}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="solde" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Solde"
                    dot={createClickableDot('#3b82f6', false)}
                    activeDot={createClickableDot('#3b82f6', true)}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                Aucune donnée disponible
              </div>
            )}
          </>
        )}

        {viewMode === 'monthly' && (
          <>
            {!selectedYear && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Cliquez sur un point du graphique pour voir le détail jour par jour</p>
            )}
            {selectedYear && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Cliquez sur un point du graphique pour voir le détail jour par jour</p>
            )}
            {loadingMonthDetails ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-500 dark:text-gray-400">Chargement des transactions...</p>
              </div>
            ) : selectedYear && yearTransactions.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart 
                  data={prepareMonthlyDataForYear(yearTransactions, selectedYear)}
                  onClick={(e: any) => {
                    if (e && e.activePayload && e.activePayload.length > 0) {
                      const monthLabel = e.activePayload[0].payload?.month
                      if (monthLabel) {
                        const monthNames = ['janv.', 'fév.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
                        const monthIndex = monthNames.indexOf(monthLabel)
                        if (monthIndex !== -1 && selectedYear) {
                          handleMonthClick(monthIndex, selectedYear)
                        }
                      }
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#6b7280"
                    className="dark:stroke-gray-400"
                  />
                  <YAxis 
                    stroke="#6b7280"
                    className="dark:stroke-gray-400"
                    tickFormatter={(value) => `${value}€`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="revenus" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Revenus"
                    dot={createClickableDot('#10b981', false)}
                    activeDot={createClickableDot('#10b981', true)}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="depenses" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    name="Dépenses"
                    dot={createClickableDot('#ef4444', false)}
                    activeDot={createClickableDot('#ef4444', true)}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="solde" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Solde"
                    dot={createClickableDot('#3b82f6', false)}
                    activeDot={createClickableDot('#3b82f6', true)}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart 
                  data={safeData.monthlyEvolution}
                  onClick={(e: any) => {
                    if (e && e.activePayload && e.activePayload.length > 0) {
                      const monthLabel = e.activePayload[0].payload?.month
                      if (monthLabel) {
                        const monthIndex = safeData.monthlyEvolution.findIndex((m: any) => m.month === monthLabel)
                        if (monthIndex !== -1) {
                          const now = new Date()
                          const calculatedMonthIndex = now.getMonth() - (5 - monthIndex)
                          const year = now.getFullYear()
                          let actualYear = year
                          let actualMonthIndex = calculatedMonthIndex
                          if (calculatedMonthIndex < 0) {
                            actualYear = year - 1
                            actualMonthIndex = 12 + calculatedMonthIndex
                          }
                          handleMonthClick(actualMonthIndex, actualYear)
                        }
                      }
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#6b7280"
                    className="dark:stroke-gray-400"
                  />
                  <YAxis 
                    stroke="#6b7280"
                    className="dark:stroke-gray-400"
                    tickFormatter={(value) => `${value}€`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="revenus" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Revenus"
                    dot={createClickableDot('#10b981', false)}
                    activeDot={createClickableDot('#10b981', true)}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="depenses" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    name="Dépenses"
                    dot={createClickableDot('#ef4444', false)}
                    activeDot={createClickableDot('#ef4444', true)}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="solde" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Solde"
                    dot={createClickableDot('#3b82f6', false)}
                    activeDot={createClickableDot('#3b82f6', true)}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </>
        )}

        {viewMode === 'daily' && selectedMonth && (
          <>
            {loadingMonthDetails ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-500 dark:text-gray-400">Chargement des transactions...</p>
              </div>
            ) : monthTransactions.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={prepareDailyData(monthTransactions)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                  <XAxis 
                    dataKey="day" 
                    stroke="#6b7280"
                    className="dark:stroke-gray-400"
                  />
                  <YAxis 
                    stroke="#6b7280"
                    className="dark:stroke-gray-400"
                    tickFormatter={(value) => `${value}€`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="revenus" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Revenus"
                    dot={{ r: 6, fill: '#10b981' }}
                    activeDot={{ r: 8 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="depenses" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    name="Dépenses"
                    dot={{ r: 6, fill: '#ef4444' }}
                    activeDot={{ r: 8 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="solde" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Solde"
                    dot={{ r: 6, fill: '#3b82f6' }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                Aucune transaction pour ce mois
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Répartition par catégories */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">
              {selectedCategory 
                ? `Sous-catégories - ${selectedCategory.name}${selectedMonth ? ` (${selectedMonth.month} ${selectedMonth.year})` : selectedYear ? ` (${selectedYear})` : ''}`
                : `Dépenses par Catégories${selectedMonth ? ` - ${selectedMonth.month} ${selectedMonth.year}` : selectedYear ? ` - ${selectedYear}` : ''}`}
            </h2>
            {selectedCategory && (
              <button
                onClick={() => {
                  setSelectedCategory(null)
                  setSubCategoryData([])
                }}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                ← Retour
              </button>
            )}
          </div>
          {selectedCategory ? (
            <>
              {loadingSubCategories ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-500 dark:text-gray-400">Chargement des sous-catégories...</p>
                </div>
              ) : subCategoryData.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  Aucune sous-catégorie disponible pour cette catégorie
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={subCategoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#6b7280"
                      className="dark:stroke-gray-400"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis 
                      stroke="#6b7280"
                      className="dark:stroke-gray-400"
                      tickFormatter={(value) => `${value}€`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Bar 
                      dataKey="amount" 
                      fill={categoryColors[selectedCategory.name] || '#3b82f6'}
                      radius={[8, 8, 0, 0]}
                    >
                      {subCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={categoryColors[selectedCategory.name] || COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Cliquez sur une barre pour voir les sous-catégories</p>
              {loadingCategoryData ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-500 dark:text-gray-400">Chargement des catégories...</p>
                </div>
              ) : filteredCategoryData.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  Aucune donnée disponible
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart 
                    data={filteredCategoryData}
                    onClick={(e: any) => {
                      if (e && e.activePayload && e.activePayload.length > 0) {
                        const categoryName = e.activePayload[0].payload?.name
                        if (categoryName) {
                          handleCategoryClick(categoryName)
                        }
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#6b7280"
                      className="dark:stroke-gray-400"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis 
                      stroke="#6b7280"
                      className="dark:stroke-gray-400"
                      tickFormatter={(value) => `${value}€`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Bar 
                      dataKey="amount" 
                      fill="#3b82f6"
                      radius={[8, 8, 0, 0]}
                      style={{ cursor: 'pointer' }}
                    >
                      {filteredCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={categoryColors[entry.name] || COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </>
          )}
        </div>

        {/* Répartition par compte */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold mb-6">
            Dépenses par Compte{selectedMonth ? ` - ${selectedMonth.month} ${selectedMonth.year}` : selectedYear ? ` - ${selectedYear}` : ''}
          </h2>
          {loadingAccountData ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500 dark:text-gray-400">Chargement des comptes...</p>
            </div>
          ) : filteredAccountData.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              Aucune donnée disponible
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={filteredAccountData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {filteredAccountData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ 
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top dépenses */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold mb-6">
          Top 5 Dépenses{selectedMonth ? ` - ${selectedMonth.month} ${selectedMonth.year}` : selectedYear ? ` - ${selectedYear}` : ' du Mois'}
        </h2>
        {loadingTopExpenses ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500 dark:text-gray-400">Chargement des dépenses...</p>
          </div>
        ) : filteredTopExpenses.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            Aucune dépense pour cette période
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTopExpenses.map((expense, index) => (
              <div
                key={expense.id}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                    <span className="text-red-600 dark:text-red-400 font-bold">{index + 1}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">{expense.description}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {expense.category} • {formatDate(expense.date)}
                    </p>
                  </div>
                </div>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(expense.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
