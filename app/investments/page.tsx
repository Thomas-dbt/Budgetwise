'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { TrendingUp, TrendingDown, RefreshCw, Plus, ArrowUpRight, ArrowDownRight, Coins, BarChart3, PiggyBank, Home, Package, Activity, PieChart as PieChartIcon, X, Calendar, DollarSign, Percent, Info, ExternalLink, Edit, Trash2 } from 'lucide-react'

interface DashboardData {
  total_value: number
  period_change_pct: number
  updated_at: string
  portfolio_series: Array<{ t: string; v: number }>
  allocation: Array<{ label: string; value: number }>
  top: Array<{ label: string; pct: number }>
  worst: Array<{ label: string; pct: number }>
  items: Array<{
    id: string
    type: string
    name: string
    subtitle: string
    platform: string
    value: number
    pl_value: number
    pl_pct: number
    change_24h_pct: number
    sparkline: number[]
    category: string
    currency: string
  }>
}

const COLORS = {
  crypto: '#2ECC71',
  bourse: '#3498DB',
  épargne: '#9B59B6',
  immobilier: '#E67E22',
  autres: '#95A5A6'
}

const TYPE_LABELS: Record<string, string> = {
  all: 'Tous',
  crypto: 'Crypto',
  bourse: 'Bourse',
  épargne: 'Épargne',
  immobilier: 'Immobilier',
  autres: 'Autres'
}

const CATEGORIES = [
  'Crypto', 'Action', 'ETF', 'Livret',
  'Immobilier', 'Autre'
]

const PERIODS = [
  { value: '7d', label: '7j' },
  { value: '30d', label: '30j' },
  { value: '90d', label: '90j' },
  { value: '1y', label: '1an' },
  { value: 'all', label: 'Total' }
]

interface InvestmentDetails {
  id: string
  name: string
  symbol: string | null
  category: string
  subCategory: string | null
  platform: string | null
  currency: string
  comment: string | null
  valuationMode: string
  quantity: number
  currentPrice: number | null
  currentValue: number
  amountInvested: number | null
  lastValuationDate: string | null
  tradingViewSymbol: string | null
  priceProvider: string | null
  baseAmount: number | null
  annualRate: number | null
  capitalizationMode: string | null
  startDate: string | null
  manualPrice: number | null
  costBasis: number
  totalValue: number
  gainLoss: number
  performance: number
}

interface Account {
  id: string
  name: string
  balance: number
}

export default function InvestmentsPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30d')
  const [selectedInvestment, setSelectedInvestment] = useState<string | null>(null)
  const [investmentDetails, setInvestmentDetails] = useState<InvestmentDetails | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [investmentTypeSelected, setInvestmentTypeSelected] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingInvestmentId, setEditingInvestmentId] = useState<string | null>(null)
  const [createRealEstateModalOpen, setCreateRealEstateModalOpen] = useState(false)
  const [editRealEstateModalOpen, setEditRealEstateModalOpen] = useState(false)
  const [editingRealEstateId, setEditingRealEstateId] = useState<string | null>(null)
  const [realEstateMetrics, setRealEstateMetrics] = useState<any>(null)
  const [loadingRealEstateMetrics, setLoadingRealEstateMetrics] = useState(false)
  const [realEstateFormData, setRealEstateFormData] = useState({
    name: '',
    address: '',
    propertyType: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: '',
    notaryFees: '',
    initialWorks: '',
    downPayment: '',
    loanMonthlyPayment: '',
    loanInsuranceMonthly: '',
    rentMonthly: '',
    vacancyRatePct: '5',
    nonRecoverableChargesMonthly: '',
    propertyTaxYearly: '',
    insuranceYearly: '',
    maintenanceReserveMonthly: '',
    comment: ''
  })
  const [realEstateFormLoading, setRealEstateFormLoading] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    baseSymbol: '',
    quoteSymbol: 'USD',
    category: 'Crypto',
    platform: '',
    quantity: '',
    paidAmount: '',
    paidCurrency: 'EUR',
    purchaseDate: new Date().toISOString().split('T')[0],
    annualRate: '',
    capitalizationMode: 'mensuelle',
    startDate: new Date().toISOString().split('T')[0],
    // Champs spécifiques Crypto
    buyUnitPriceQuote: '',
    fees: '',
    fxPaidToQuote: '',
    notes: '',
    // Champs spécifiques Actions
    ticker: '',
    exchange: '',
    isin: '',
    dividendsTracking: false,
    // Champs spécifiques ETF
    quantityParts: '',
    buyUnitPrice: '',
    distributionType: '',
    envelope: '',
    benchmark: '',
    // Champs spécifiques Livret
    currentBalance: '',
    monthlyContribution: '',
    ceiling: '',
    interestMode: 'simple_annuel'
  })

  // État pour les métriques calculées en temps réel (Crypto)
  const [cryptoMetrics, setCryptoMetrics] = useState<{
    currentPrice: number | null
    currentValue: number | null
    costBasisQuote: number | null
    plValue: number | null
    plPct: number | null
    loading: boolean
  }>({
    currentPrice: null,
    currentValue: null,
    costBasisQuote: null,
    plValue: null,
    plPct: null,
    loading: false
  })

  // État pour les métriques calculées en temps réel (Actions)
  const [stocksMetrics, setStocksMetrics] = useState<{
    currentPrice: number | null
    currentValue: number | null
    costBasis: number | null
    plValue: number | null
    plPct: number | null
    loading: boolean
  }>({
    currentPrice: null,
    currentValue: null,
    costBasis: null,
    plValue: null,
    plPct: null,
    loading: false
  })

  // État pour les métriques calculées en temps réel (ETF)
  const [etfMetrics, setEtfMetrics] = useState<{
    currentPrice: number | null
    currentValue: number | null
    costBasis: number | null
    plValue: number | null
    plPct: number | null
    loading: boolean
  }>({
    currentPrice: null,
    currentValue: null,
    costBasis: null,
    plValue: null,
    plPct: null,
    loading: false
  })

  // État pour les projections Livret
  const [savingsProjection, setSavingsProjection] = useState<{
    currentValue: number | null
    projection1y: number | null
    estimatedInterest1y: number | null
    loading: boolean
  }>({
    currentValue: null,
    projection1y: null,
    estimatedInterest1y: null,
    loading: false
  })

  const fetchAccounts = async () => {
    try {
      const res = await authFetch('/api/accounts')
      if (res.ok) {
        const data = await res.json()
        setAccounts(data)
      }
    } catch (err) {
      console.error('Failed to fetch accounts', err)
    }
  }

  useEffect(() => {
    fetchDashboard()
    fetchAccounts()
  }, [])

  const closeDetailsModal = () => {
    setSelectedInvestment(null)
    setInvestmentDetails(null)
    setRealEstateMetrics(null)
  }

  const handleDeleteInvestment = async () => {
    if (!selectedInvestment) return

    if (!confirm('Êtes-vous sûr de vouloir supprimer cet investissement ?')) {
      return
    }

    try {
      const investment = data?.items.find(i => i.id === selectedInvestment)
      if (investment?.type === 'immobilier' || selectedInvestment.startsWith('re_')) {
        const realEstateId = selectedInvestment.replace('re_', '')
        const response = await authFetch(`/api/real-estate?id=${realEstateId}`, {
          method: 'DELETE'
        })
        if (!response.ok) {
          throw new Error('Erreur lors de la suppression')
        }
      } else {
        const response = await authFetch(`/api/investments?id=${selectedInvestment}`, {
          method: 'DELETE'
        })
        if (!response.ok) {
          throw new Error('Erreur lors de la suppression')
        }
      }

      closeDetailsModal()
      await fetchDashboard(true)
    } catch (err: any) {
      console.error('Error deleting investment:', err)
      alert(`Erreur: ${err?.message || 'Erreur lors de la suppression'}`)
    }
  }

  const handleEditInvestment = () => {
    if (!selectedInvestment) return

    const investment = data?.items.find(i => i.id === selectedInvestment)
    if (investment?.type === 'immobilier' || selectedInvestment.startsWith('re_')) {
      // Ouvrir le modal d'édition immobilier
      const realEstateId = selectedInvestment.replace('re_', '')
      setEditingRealEstateId(realEstateId)
      // Charger les données de l'investissement immobilier
      loadRealEstateForEdit(realEstateId)
    } else {
      // Ouvrir le modal d'édition standard
      setEditingInvestmentId(selectedInvestment)
      // Charger les données de l'investissement
      loadInvestmentForEdit(selectedInvestment)
    }
  }

  const loadInvestmentForEdit = async (id: string) => {
    try {
      const response = await authFetch(`/api/investments?id=${id}`)
      if (response.ok) {
        const data = await response.json()
        const investment = data.investments?.find((inv: any) => inv.id === id)
        if (investment) {
          setFormData({
            name: investment.name || '',
            symbol: investment.symbol || '',
            baseSymbol: investment.baseSymbol || '',
            quoteSymbol: investment.quoteSymbol || 'USD',
            category: investment.category || 'Crypto',
            platform: investment.platform || '',
            quantity: investment.quantity?.toString() || '',
            paidAmount: investment.amountInvested?.toString() || '',
            paidCurrency: investment.currency || 'EUR',
            purchaseDate: investment.purchaseDate || new Date().toISOString().split('T')[0]
          })
          setEditModalOpen(true)
          closeDetailsModal()
        }
      }
    } catch (err: any) {
      console.error('Error loading investment for edit:', err)
    }
  }

  const loadRealEstateForEdit = async (id: string) => {
    try {
      const response = await authFetch(`/api/real-estate`)
      if (response.ok) {
        const realEstates = await response.json()
        const realEstate = realEstates.find((re: any) => re.id === id)
        if (realEstate) {
          setRealEstateFormData({
            name: realEstate.name || '',
            address: realEstate.address || '',
            propertyType: realEstate.propertyType || '',
            purchaseDate: realEstate.purchaseDate ? new Date(realEstate.purchaseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            purchasePrice: realEstate.purchasePrice?.toString() || '',
            notaryFees: realEstate.notaryFees?.toString() || '',
            initialWorks: realEstate.initialWorks?.toString() || '',
            downPayment: realEstate.downPayment?.toString() || '',
            loanMonthlyPayment: realEstate.loanMonthlyPayment?.toString() || '',
            loanInsuranceMonthly: realEstate.loanInsuranceMonthly?.toString() || '',
            rentMonthly: realEstate.rentMonthly?.toString() || '',
            vacancyRatePct: realEstate.vacancyRatePct?.toString() || '5',
            nonRecoverableChargesMonthly: realEstate.nonRecoverableChargesMonthly?.toString() || '',
            propertyTaxYearly: realEstate.propertyTaxYearly?.toString() || '',
            insuranceYearly: realEstate.insuranceYearly?.toString() || '',
            maintenanceReserveMonthly: realEstate.maintenanceReserveMonthly?.toString() || '',
            comment: realEstate.comment || ''
          })
          setEditRealEstateModalOpen(true)
          closeDetailsModal()
        }
      }
    } catch (err: any) {
      console.error('Error loading real estate for edit:', err)
    }
  }

  const handleUpdateInvestment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingInvestmentId) return

    setFormLoading(true)
    setError(null)

    try {
      const response = await authFetch('/api/investments', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: editingInvestmentId,
          name: formData.name,
          symbol: formData.symbol || null,
          tradingViewSymbol: formData.symbol || `${formData.baseSymbol}${formData.quoteSymbol}` || null,
          baseSymbol: formData.baseSymbol || formData.symbol?.split(/[\/\-]/)[0]?.replace(/USD|EUR|GBP$/, '') || null,
          quoteSymbol: formData.quoteSymbol,
          category: formData.category,
          platform: formData.platform || null,
          currency: formData.paidCurrency
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur lors de la modification' }))
        throw new Error(errorData.error || 'Erreur lors de la modification')
      }

      setEditModalOpen(false)
      setEditingInvestmentId(null)
      await fetchDashboard(true)
    } catch (err: any) {
      console.error('Error updating investment:', err)
      setError(err?.message || 'Erreur lors de la modification')
    } finally {
      setFormLoading(false)
    }
  }

  const handleUpdateRealEstate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRealEstateId) return

    setRealEstateFormLoading(true)
    setError(null)

    try {
      const payload = {
        name: realEstateFormData.name,
        address: realEstateFormData.address || null,
        propertyType: realEstateFormData.propertyType || null,
        purchaseDate: realEstateFormData.purchaseDate || null,
        purchasePrice: Number(realEstateFormData.purchasePrice),
        notaryFees: Number(realEstateFormData.notaryFees || 0),
        initialWorks: Number(realEstateFormData.initialWorks || 0),
        downPayment: Number(realEstateFormData.downPayment),
        loanMonthlyPayment: Number(realEstateFormData.loanMonthlyPayment || 0),
        loanInsuranceMonthly: Number(realEstateFormData.loanInsuranceMonthly || 0),
        rentMonthly: Number(realEstateFormData.rentMonthly),
        vacancyRatePct: Number(realEstateFormData.vacancyRatePct || 5),
        nonRecoverableChargesMonthly: Number(realEstateFormData.nonRecoverableChargesMonthly || 0),
        propertyTaxYearly: Number(realEstateFormData.propertyTaxYearly || 0),
        insuranceYearly: Number(realEstateFormData.insuranceYearly || 0),
        maintenanceReserveMonthly: realEstateFormData.maintenanceReserveMonthly ? Number(realEstateFormData.maintenanceReserveMonthly) : null,
        comment: realEstateFormData.comment || null
      }

      const response = await authFetch('/api/real-estate', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: editingRealEstateId,
          ...payload
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur lors de la modification' }))
        throw new Error(errorData.error || 'Erreur lors de la modification')
      }

      setEditRealEstateModalOpen(false)
      setEditingRealEstateId(null)
      await fetchDashboard(true)
    } catch (err: any) {
      console.error('Error updating real estate:', err)
      setError(err?.message || 'Erreur lors de la modification')
    } finally {
      setRealEstateFormLoading(false)
    }
  }

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'app/investments/page.tsx:449', message: 'InvestmentsPage: useEffect triggered', data: { selectedPeriod, selectedType, timestamp: Date.now() }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion
    fetchDashboard()
  }, [selectedType, selectedPeriod])

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'app/investments/page.tsx:456', message: 'InvestmentsPage: Component mounted', data: { timestamp: Date.now() }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion
    return () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'app/investments/page.tsx:459', message: 'InvestmentsPage: Component unmounting', data: { timestamp: Date.now() }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
      // #endregion
    }
  }, [])

  // Réinitialiser les données immobilières quand on change de catégorie
  useEffect(() => {
    if (formData.category !== 'Immobilier') {
      setRealEstateFormData({
        name: '',
        address: '',
        propertyType: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        purchasePrice: '',
        notaryFees: '',
        initialWorks: '',
        downPayment: '',
        loanMonthlyPayment: '',
        loanInsuranceMonthly: '',
        rentMonthly: '',
        vacancyRatePct: '5',
        nonRecoverableChargesMonthly: '',
        propertyTaxYearly: '',
        insuranceYearly: '',
        maintenanceReserveMonthly: '',
        comment: ''
      })
    }
  }, [formData.category])

  // Calculer les métriques Crypto en temps réel
  useEffect(() => {
    if (formData.category === 'Crypto' && formData.baseSymbol && formData.quoteSymbol && formData.quantity && formData.buyUnitPriceQuote) {
      const calculateMetrics = async () => {
        setCryptoMetrics(prev => ({ ...prev, loading: true }))
        try {
          // Construire les paramètres de requête
          const params = new URLSearchParams({
            baseSymbol: formData.baseSymbol,
            quoteSymbol: formData.quoteSymbol,
            quantity: formData.quantity,
            buyUnitPriceQuote: formData.buyUnitPriceQuote,
            fees: formData.fees || '0',
            paidAmount: formData.paidAmount || '0',
            paidCurrency: formData.paidCurrency || 'EUR',
            purchaseDate: formData.purchaseDate
          })

          // Récupérer les métriques calculées depuis l'endpoint
          const response = await authFetch(`/api/investments/crypto/price?${params.toString()}`)
          if (response.ok) {
            const data = await response.json()
            setCryptoMetrics({
              currentPrice: data.currentPrice || null,
              currentValue: data.currentValue || null,
              costBasisQuote: data.costBasisQuote || null,
              plValue: data.plValue || null,
              plPct: data.plPct || null,
              loading: false
            })
          } else {
            setCryptoMetrics(prev => ({ ...prev, loading: false }))
          }
        } catch (error) {
          console.error('Error calculating crypto metrics:', error)
          setCryptoMetrics(prev => ({ ...prev, loading: false }))
        }
      }

      const timeoutId = setTimeout(calculateMetrics, 500) // Debounce de 500ms
      return () => clearTimeout(timeoutId)
    } else {
      setCryptoMetrics({
        currentPrice: null,
        currentValue: null,
        costBasisQuote: null,
        plValue: null,
        plPct: null,
        loading: false
      })
    }
  }, [formData.category, formData.baseSymbol, formData.quoteSymbol, formData.quantity, formData.buyUnitPriceQuote, formData.fees, formData.paidAmount, formData.paidCurrency, formData.purchaseDate])

  // Calculer les métriques ETF en temps réel
  useEffect(() => {
    if (formData.category === 'ETF' && (formData.isin || formData.ticker) && formData.quantityParts && formData.buyUnitPrice) {
      const calculateMetrics = async () => {
        setEtfMetrics(prev => ({ ...prev, loading: true }))
        try {
          const params = new URLSearchParams({
            isin: formData.isin || '',
            ticker: formData.ticker || '',
            currency_quote: formData.quoteSymbol || 'EUR',
            quantity_parts: formData.quantityParts,
            buy_unit_price: formData.buyUnitPrice,
            fees: formData.fees || '0'
          })

          const response = await authFetch(`/api/investments/etf/price?${params.toString()}`)
          if (response.ok) {
            const data = await response.json()
            setEtfMetrics({
              currentPrice: data.currentPrice || null,
              currentValue: data.currentValue || null,
              costBasis: data.costBasis || null,
              plValue: data.plValue || null,
              plPct: data.plPct || null,
              loading: false
            })
          } else {
            setEtfMetrics(prev => ({ ...prev, loading: false }))
          }
        } catch (error) {
          console.error('Error calculating ETF metrics:', error)
          setEtfMetrics(prev => ({ ...prev, loading: false }))
        }
      }

      const timeoutId = setTimeout(calculateMetrics, 500) // Debounce de 500ms
      return () => clearTimeout(timeoutId)
    } else {
      setEtfMetrics({
        currentPrice: null,
        currentValue: null,
        costBasis: null,
        plValue: null,
        plPct: null,
        loading: false
      })
    }
  }, [formData.category, formData.isin, formData.ticker, formData.quoteSymbol, formData.quantityParts, formData.buyUnitPrice, formData.fees])

  // Calculer les projections Livret en temps réel
  useEffect(() => {
    if (formData.category === 'Livret' && formData.currentBalance) {
      const calculateProjection = () => {
        const currentBalance = Number(formData.currentBalance) || 0
        const annualRate = Number(formData.annualRate) || 0
        const monthlyContribution = Number(formData.monthlyContribution) || 0

        // Valeur actuelle = solde actuel
        const currentValue = currentBalance

        // Projection 1 an : solde actuel * (1 + taux) + 12 * contribution mensuelle (approximation)
        // Pour simplifier, on calcule les intérêts sur le solde actuel + les contributions moyennes
        const averageBalance = currentBalance + (monthlyContribution * 6) // Moyenne sur l'année
        const projection1y = annualRate > 0
          ? currentBalance * (1 + annualRate / 100) + (monthlyContribution * 12)
          : currentBalance + (monthlyContribution * 12)

        // Intérêts estimés sur 1 an
        const estimatedInterest1y = annualRate > 0
          ? (averageBalance * annualRate / 100)
          : 0

        setSavingsProjection({
          currentValue,
          projection1y,
          estimatedInterest1y,
          loading: false
        })
      }

      const timeoutId = setTimeout(calculateProjection, 300) // Debounce de 300ms
      return () => clearTimeout(timeoutId)
    } else {
      setSavingsProjection({
        currentValue: null,
        projection1y: null,
        estimatedInterest1y: null,
        loading: false
      })
    }
  }, [formData.category, formData.currentBalance, formData.annualRate, formData.monthlyContribution])

  // Gérer la touche Échap pour fermer les modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedInvestment) {
          closeDetailsModal()
        } else if (createModalOpen) {
          setCreateModalOpen(false)
        } else if (editModalOpen) {
          setEditModalOpen(false)
        } else if (editRealEstateModalOpen) {
          setEditRealEstateModalOpen(false)
        }
      }
    }

    if (selectedInvestment || createModalOpen || editModalOpen || editRealEstateModalOpen) {
      document.addEventListener('keydown', handleEscape)
      // Empêcher le scroll du body quand un modal est ouvert
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [selectedInvestment, createModalOpen, editModalOpen, editRealEstateModalOpen])

  const fetchDashboard = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'app/investments/page.tsx:661', message: 'fetchDashboard: Before API call', data: { period: selectedPeriod, type: selectedType, isRefresh }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
      // #endregion
      const response = await authFetch(`/api/investments/dashboard?period=${selectedPeriod}&type=${selectedType}`)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'app/investments/page.tsx:663', message: 'fetchDashboard: After API call', data: { ok: response.ok, status: response.status, statusText: response.statusText }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
      // #endregion

      if (!response.ok) {
        // #region agent log
        const errorText = await response.text().catch(() => 'Unable to read error')
        fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'app/investments/page.tsx:666', message: 'fetchDashboard: Response not OK', data: { status: response.status, statusText: response.statusText, errorText: errorText.substring(0, 200) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' }) }).catch(() => { });
        // #endregion
        throw new Error('Erreur lors du chargement des données')
      }

      const dashboardData = await response.json()
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'app/investments/page.tsx:670', message: 'fetchDashboard: Success parsing JSON', data: { hasData: !!dashboardData, itemsCount: dashboardData?.items?.length || 0 }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
      // #endregion
      setData(dashboardData)
    } catch (err: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'app/investments/page.tsx:672', message: 'fetchDashboard: Error caught', data: { errorMessage: err?.message, errorName: err?.name, errorStack: err?.stack?.substring(0, 300) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'E' }) }).catch(() => { });
      // #endregion
      console.error('Error fetching dashboard:', err)
      setError(err?.message || 'Erreur lors du chargement')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'à l\'instant'
    if (diffMins < 60) return `il y a ${diffMins} min`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `il y a ${diffHours}h`
    const diffDays = Math.floor(diffHours / 24)
    return `il y a ${diffDays}j`
  }

  const getTypeIcon = (type: string, size: number = 20) => {
    const style = { width: size, height: size, color: COLORS[type as keyof typeof COLORS] || COLORS.autres }
    switch (type) {
      case 'crypto':
        return <Coins style={style} />
      case 'bourse':
        return <BarChart3 style={style} />
      case 'épargne':
        return <PiggyBank style={style} />
      case 'immobilier':
        return <Home style={style} />
      default:
        return <Package style={style} />
    }
  }

  const fetchInvestmentDetails = async (id: string) => {
    try {
      setLoadingDetails(true)
      setError(null)
      const response = await authFetch(`/api/investments?id=${id}`)

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des détails')
      }

      const investmentsData = await response.json()
      // Trouver l'investissement spécifique dans la liste
      const investment = investmentsData.investments?.find((inv: any) => inv.id === id)
      if (investment) {
        setInvestmentDetails(investment)
      } else {
        throw new Error('Investissement introuvable')
      }
    } catch (err: any) {
      console.error('Error fetching investment details:', err)
      setError(err?.message || 'Erreur lors du chargement des détails')
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleInvestmentClick = (id: string) => {
    setSelectedInvestment(id)
    // Vérifier si c'est un investissement immobilier (commence par "re_" ou a category "Immobilier")
    const investment = data?.items.find(i => i.id === id)
    if (investment?.type === 'immobilier' || investment?.category === 'Immobilier' || id.startsWith('re_')) {
      const realEstateId = id.startsWith('re_') ? id.replace('re_', '') : id
      fetchRealEstateMetrics(realEstateId)
      // Ne pas charger les détails d'investissement standard pour l'immobilier
      setInvestmentDetails(null)
    } else {
      fetchInvestmentDetails(id)
      setRealEstateMetrics(null)
    }
  }

  const fetchRealEstateMetrics = async (id: string) => {
    try {
      setLoadingRealEstateMetrics(true)
      const response = await authFetch(`/api/real-estate/${id}/metrics`)
      if (response.ok) {
        const metrics = await response.json()
        setRealEstateMetrics(metrics)
      }
    } catch (err: any) {
      console.error('Error fetching real estate metrics:', err)
    } finally {
      setLoadingRealEstateMetrics(false)
    }
  }

  const handleCreateInvestment = async (e: React.FormEvent) => {
    e.preventDefault()

    // Si c'est un investissement immobilier, utiliser la logique immobilière
    if (formData.category === 'Immobilier') {
      // Validation des champs requis pour l'immobilier
      if (!formData.name || !realEstateFormData.purchasePrice || !realEstateFormData.downPayment || !realEstateFormData.rentMonthly) {
        alert('Veuillez remplir tous les champs obligatoires (Nom, Prix d\'achat, Apport initial, Loyer mensuel)')
        return
      }

      setFormLoading(true)
      setError(null)

      try {
        const payload = {
          name: formData.name,
          address: realEstateFormData.address || null,
          propertyType: realEstateFormData.propertyType || null,
          purchaseDate: realEstateFormData.purchaseDate || null,
          purchasePrice: Number(realEstateFormData.purchasePrice),
          notaryFees: Number(realEstateFormData.notaryFees || 0),
          initialWorks: Number(realEstateFormData.initialWorks || 0),
          downPayment: Number(realEstateFormData.downPayment),
          loanMonthlyPayment: Number(realEstateFormData.loanMonthlyPayment || 0),
          loanInsuranceMonthly: Number(realEstateFormData.loanInsuranceMonthly || 0),
          rentMonthly: Number(realEstateFormData.rentMonthly),
          vacancyRatePct: Number(realEstateFormData.vacancyRatePct || 5),
          nonRecoverableChargesMonthly: Number(realEstateFormData.nonRecoverableChargesMonthly || 0),
          propertyTaxYearly: Number(realEstateFormData.propertyTaxYearly || 0),
          insuranceYearly: Number(realEstateFormData.insuranceYearly || 0),
          maintenanceReserveMonthly: realEstateFormData.maintenanceReserveMonthly ? Number(realEstateFormData.maintenanceReserveMonthly) : null,
          comment: realEstateFormData.comment || null
        }

        const response = await authFetch('/api/real-estate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Erreur lors de la création' }))
          throw new Error(errorData.error || 'Erreur lors de la création')
        }

        setCreateModalOpen(false)
        setInvestmentTypeSelected(false)
        setFormData({
          name: '',
          symbol: '',
          baseSymbol: '',
          quoteSymbol: 'USD',
          category: 'Crypto',
          platform: '',
          quantity: '',
          paidAmount: '',
          paidCurrency: 'EUR',
          purchaseDate: new Date().toISOString().split('T')[0],
          annualRate: '',
          capitalizationMode: 'mensuelle',
          startDate: new Date().toISOString().split('T')[0]
        })
        setRealEstateFormData({
          name: '',
          address: '',
          propertyType: '',
          purchaseDate: new Date().toISOString().split('T')[0],
          purchasePrice: '',
          notaryFees: '',
          initialWorks: '',
          downPayment: '',
          loanMonthlyPayment: '',
          loanInsuranceMonthly: '',
          rentMonthly: '',
          vacancyRatePct: '5',
          nonRecoverableChargesMonthly: '',
          propertyTaxYearly: '',
          insuranceYearly: '',
          maintenanceReserveMonthly: '',
          comment: ''
        })
        await fetchDashboard(true)
      } catch (err: any) {
        console.error('Error creating real estate:', err)
        setError(err?.message || 'Erreur lors de la création')
      } finally {
        setFormLoading(false)
      }
      return
    }

    // Si c'est Crypto, utiliser l'endpoint dédié
    if (formData.category === 'Crypto') {
      setFormLoading(true)
      setError(null)

      try {
        // Validation des champs obligatoires pour Crypto
        if (!formData.name || !formData.baseSymbol || !formData.quoteSymbol || !formData.platform || !formData.quantity || !formData.purchaseDate || !formData.buyUnitPriceQuote) {
          alert('Veuillez remplir tous les champs obligatoires pour un investissement Crypto')
          setFormLoading(false)
          return
        }

        const payload = {
          name: formData.name,
          base_symbol: formData.baseSymbol.toUpperCase(),
          quote_currency: formData.quoteSymbol,
          platform: formData.platform,
          quantity_base: Number(formData.quantity),
          buy_date: formData.purchaseDate,
          buy_unit_price_quote: Number(formData.buyUnitPriceQuote),
          fees: formData.fees ? Number(formData.fees) : 0,
          paid_amount: formData.paidAmount ? Number(formData.paidAmount) : null,
          paid_currency: formData.paidCurrency || null,
          fx_paid_to_quote: formData.fxPaidToQuote ? Number(formData.fxPaidToQuote) : null,
          price_source: 'coingecko',
          notes: formData.notes || null
        }

        const response = await authFetch('/api/investments/crypto', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Erreur lors de la création' }))
          throw new Error(errorData.error || 'Erreur lors de la création')
        }

        setCreateModalOpen(false)
        setInvestmentTypeSelected(false)
        setFormData({
          name: '',
          symbol: '',
          baseSymbol: '',
          quoteSymbol: 'USD',
          category: 'Crypto',
          platform: '',
          quantity: '',
          paidAmount: '',
          paidCurrency: 'EUR',
          purchaseDate: new Date().toISOString().split('T')[0],
          annualRate: '',
          capitalizationMode: 'mensuelle',
          startDate: new Date().toISOString().split('T')[0],
          buyUnitPriceQuote: '',
          fees: '',
          fxPaidToQuote: '',
          notes: '',
          ticker: '',
          exchange: '',
          isin: '',
          dividendsTracking: false,
          quantityParts: '',
          buyUnitPrice: '',
          distributionType: '',
          envelope: '',
          benchmark: '',
          currentBalance: '',
          monthlyContribution: '',
          ceiling: '',
          interestMode: 'simple_annuel'
        })
        setCryptoMetrics({
          currentPrice: null,
          currentValue: null,
          costBasisQuote: null,
          plValue: null,
          plPct: null,
          loading: false
        })
        setEtfMetrics({
          currentPrice: null,
          currentValue: null,
          costBasis: null,
          plValue: null,
          plPct: null,
          loading: false
        })
        setSavingsProjection({
          currentValue: null,
          projection1y: null,
          estimatedInterest1y: null,
          loading: false
        })
        await fetchDashboard(true)
      } catch (err: any) {
        console.error('Error creating crypto investment:', err)
        setError(err?.message || 'Erreur lors de la création')
      } finally {
        setFormLoading(false)
      }
      return
    }

    // Si c'est ETF, utiliser l'endpoint dédié
    if (formData.category === 'ETF') {
      setFormLoading(true)
      setError(null)

      try {
        // Validation des champs obligatoires pour ETF
        if (!formData.name || (!formData.isin && !formData.ticker) || !formData.platform || !formData.quantityParts || !formData.purchaseDate || !formData.buyUnitPrice) {
          alert('Veuillez remplir tous les champs obligatoires pour un investissement ETF (Nom, ISIN ou Ticker, Plateforme, Nombre de parts, Date d\'achat, Prix unitaire)')
          setFormLoading(false)
          return
        }

        const payload = {
          name: formData.name,
          isin: formData.isin || null,
          ticker: formData.ticker || null,
          platform: formData.platform,
          quantity_parts: Number(formData.quantityParts),
          buy_date: formData.purchaseDate,
          buy_unit_price: Number(formData.buyUnitPrice),
          currency_quote: formData.quoteSymbol || 'EUR',
          fees: formData.fees ? Number(formData.fees) : 0,
          distribution_type: formData.distributionType || null,
          envelope: formData.envelope || null,
          benchmark: formData.benchmark || null,
          notes: formData.notes || null
        }

        const response = await authFetch('/api/investments/etf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Erreur lors de la création' }))
          throw new Error(errorData.error || 'Erreur lors de la création')
        }

        setCreateModalOpen(false)
        setInvestmentTypeSelected(false)
        setFormData({
          name: '',
          symbol: '',
          baseSymbol: '',
          quoteSymbol: 'USD',
          category: 'Crypto',
          platform: '',
          quantity: '',
          paidAmount: '',
          paidCurrency: 'EUR',
          purchaseDate: new Date().toISOString().split('T')[0],
          annualRate: '',
          capitalizationMode: 'mensuelle',
          startDate: new Date().toISOString().split('T')[0],
          buyUnitPriceQuote: '',
          fees: '',
          fxPaidToQuote: '',
          notes: '',
          ticker: '',
          exchange: '',
          isin: '',
          dividendsTracking: false,
          quantityParts: '',
          buyUnitPrice: '',
          distributionType: '',
          envelope: '',
          benchmark: '',
          currentBalance: '',
          monthlyContribution: '',
          ceiling: '',
          interestMode: 'simple_annuel'
        })
        setEtfMetrics({
          currentPrice: null,
          currentValue: null,
          costBasis: null,
          plValue: null,
          plPct: null,
          loading: false
        })
        setSavingsProjection({
          currentValue: null,
          projection1y: null,
          estimatedInterest1y: null,
          loading: false
        })
        await fetchDashboard(true)
      } catch (err: any) {
        console.error('Error creating ETF investment:', err)
        setError(err?.message || 'Erreur lors de la création')
      } finally {
        setFormLoading(false)
      }
      return
    }

    // Si c'est Livret, utiliser l'endpoint dédié
    if (formData.category === 'Livret') {
      setFormLoading(true)
      setError(null)

      try {
        // Validation des champs obligatoires pour Livret
        if (!formData.name || !formData.platform || !formData.currentBalance || !formData.startDate) {
          alert('Veuillez remplir tous les champs obligatoires pour un Livret (Nom, Banque/Plateforme, Solde actuel, Date de début)')
          setFormLoading(false)
          return
        }

        const payload = {
          name: formData.name,
          bank: formData.platform,
          currency: formData.paidCurrency || 'EUR',
          start_date: formData.startDate,
          current_balance: Number(formData.currentBalance),
          annual_rate_pct: formData.annualRate ? Number(formData.annualRate) : null,
          monthly_contribution: formData.monthlyContribution ? Number(formData.monthlyContribution) : null,
          ceiling: formData.ceiling ? Number(formData.ceiling) : null,
          interest_mode: formData.interestMode || 'simple_annuel',
          notes: formData.notes || null
        }

        const response = await authFetch('/api/investments/savings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Erreur lors de la création' }))
          throw new Error(errorData.error || 'Erreur lors de la création')
        }

        setCreateModalOpen(false)
        setInvestmentTypeSelected(false)
        setFormData({
          name: '',
          symbol: '',
          baseSymbol: '',
          quoteSymbol: 'USD',
          category: 'Crypto',
          platform: '',
          quantity: '',
          paidAmount: '',
          paidCurrency: 'EUR',
          purchaseDate: new Date().toISOString().split('T')[0],
          annualRate: '',
          capitalizationMode: 'mensuelle',
          startDate: new Date().toISOString().split('T')[0],
          buyUnitPriceQuote: '',
          fees: '',
          fxPaidToQuote: '',
          notes: '',
          ticker: '',
          exchange: '',
          isin: '',
          dividendsTracking: false,
          quantityParts: '',
          buyUnitPrice: '',
          distributionType: '',
          envelope: '',
          benchmark: '',
          currentBalance: '',
          monthlyContribution: '',
          ceiling: '',
          interestMode: 'simple_annuel'
        })
        setSavingsProjection({
          currentValue: null,
          projection1y: null,
          estimatedInterest1y: null,
          loading: false
        })
        await fetchDashboard(true)
      } catch (err: any) {
        console.error('Error creating savings account:', err)
        setError(err?.message || 'Erreur lors de la création')
      } finally {
        setFormLoading(false)
      }
      return
    }

    // Logique pour les autres investissements standards
    setFormLoading(true)
    setError(null)

    try {
      const response = await authFetch('/api/investments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          symbol: formData.symbol || null,
          tradingViewSymbol: formData.symbol || `${formData.baseSymbol}${formData.quoteSymbol}` || null,
          baseSymbol: formData.baseSymbol || formData.symbol?.split(/[\/\-]/)[0]?.replace(/USD|EUR|GBP$/, '') || null,
          quoteSymbol: formData.quoteSymbol,
          category: formData.category,
          platform: formData.platform || null,
          currency: formData.paidCurrency,
          valuationMode: formData.category === 'Livret' ? 'taux' : 'marché',
          quantity: formData.category === 'Livret' ? 1 : (Number(formData.quantity) || 1),
          amountInvested: formData.paidAmount ? Number(formData.paidAmount) : null,
          annualRate: formData.annualRate ? Number(formData.annualRate) : null,
          capitalizationMode: formData.capitalizationMode || null,
          startDate: formData.startDate || formData.purchaseDate || null,
          priceProvider: (formData.category === 'Crypto' || formData.category === 'Action' || formData.category === 'ETF') ? 'coingecko' : null,
          // Transaction linking
          createTransaction: formData.createTransaction,
          sourceAccountId: formData.sourceAccountId,
          transactionDate: formData.purchaseDate
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur lors de la création' }))
        throw new Error(errorData.error || 'Erreur lors de la création')
      }

      // Créer la position avec les informations de transaction
      const investmentData = await response.json()
      // L'API retourne { asset: {...} } ou directement l'asset
      const assetId = investmentData.asset?.id || investmentData.id || investmentData.assetId

      if (assetId && formData.paidAmount && formData.quantity) {
        // Récupérer le taux de change historique
        const purchaseDate = new Date(formData.purchaseDate)
        const fxRate = await fetch(`https://api.exchangerate-api.com/v4/historical/${formData.paidCurrency}/${formData.purchaseDate}`)
          .then(res => res.json())
          .then(data => data.rates?.[formData.quoteSymbol] || null)
          .catch(() => null)

        // Créer la position avec les détails de transaction
        await authFetch('/api/investments/positions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            assetId,
            quantity: Number(formData.quantity),
            costBasis: Number(formData.paidAmount) / Number(formData.quantity),
            paidAmount: Number(formData.paidAmount),
            paidCurrency: formData.paidCurrency,
            purchaseDate: purchaseDate.toISOString(),
            fxRateToQuote: fxRate
          })
        })
      }

      setCreateModalOpen(false)
      setInvestmentTypeSelected(false)
      setFormData({
        name: '',
        symbol: '',
        baseSymbol: '',
        quoteSymbol: 'USD',
        category: 'Crypto',
        platform: '',
        quantity: '',
        paidAmount: '',
        paidCurrency: 'EUR',
        purchaseDate: new Date().toISOString().split('T')[0],
        annualRate: '',
        capitalizationMode: 'mensuelle',
        startDate: new Date().toISOString().split('T')[0],
        buyUnitPriceQuote: '',
        fees: '',
        fxPaidToQuote: '',
        notes: '',
        ticker: '',
        exchange: '',
        isin: '',
        dividendsTracking: false,
        quantityParts: '',
        buyUnitPrice: '',
        distributionType: '',
        envelope: '',
        benchmark: '',
        currentBalance: '',
        monthlyContribution: '',
        ceiling: '',
        ceiling: '',
        interestMode: 'simple_annuel',
        createTransaction: false,
        sourceAccountId: ''
      })
      setCryptoMetrics({
        currentPrice: null,
        currentValue: null,
        costBasisQuote: null,
        plValue: null,
        plPct: null,
        loading: false
      })
      setEtfMetrics({
        currentPrice: null,
        currentValue: null,
        costBasis: null,
        plValue: null,
        plPct: null,
        loading: false
      })
      setSavingsProjection({
        currentValue: null,
        projection1y: null,
        estimatedInterest1y: null,
        loading: false
      })
      await fetchDashboard(true)
    } catch (err: any) {
      console.error('Error creating investment:', err)
      setError(err?.message || 'Erreur lors de la création')
    } finally {
      setFormLoading(false)
    }
  }

  const handleCreateRealEstate = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('handleCreateRealEstate called', realEstateFormData)

    // Validation des champs requis
    if (!realEstateFormData.name || !realEstateFormData.purchasePrice || !realEstateFormData.downPayment || !realEstateFormData.rentMonthly) {
      alert('Veuillez remplir tous les champs obligatoires (Nom, Prix d\'achat, Apport initial, Loyer mensuel)')
      return
    }

    setRealEstateFormLoading(true)
    setError(null)

    try {
      const payload = {
        name: realEstateFormData.name,
        address: realEstateFormData.address || null,
        propertyType: realEstateFormData.propertyType || null,
        purchaseDate: realEstateFormData.purchaseDate || null,
        purchasePrice: Number(realEstateFormData.purchasePrice),
        notaryFees: Number(realEstateFormData.notaryFees || 0),
        initialWorks: Number(realEstateFormData.initialWorks || 0),
        downPayment: Number(realEstateFormData.downPayment),
        loanMonthlyPayment: Number(realEstateFormData.loanMonthlyPayment || 0),
        loanInsuranceMonthly: Number(realEstateFormData.loanInsuranceMonthly || 0),
        rentMonthly: Number(realEstateFormData.rentMonthly),
        vacancyRatePct: Number(realEstateFormData.vacancyRatePct || 5),
        nonRecoverableChargesMonthly: Number(realEstateFormData.nonRecoverableChargesMonthly || 0),
        propertyTaxYearly: Number(realEstateFormData.propertyTaxYearly || 0),
        insuranceYearly: Number(realEstateFormData.insuranceYearly || 0),
        maintenanceReserveMonthly: realEstateFormData.maintenanceReserveMonthly ? Number(realEstateFormData.maintenanceReserveMonthly) : null,
        comment: realEstateFormData.comment || null
      }

      console.log('Sending payload:', payload)

      const response = await authFetch('/api/real-estate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      console.log('Response status:', response.status, response.ok)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur lors de la création' }))
        console.error('API Error:', errorData)
        alert(`Erreur: ${errorData.error || 'Erreur lors de la création'}`)
        throw new Error(errorData.error || 'Erreur lors de la création')
      }

      const result = await response.json()
      console.log('Success:', result)

      setCreateRealEstateModalOpen(false)
      setRealEstateFormData({
        name: '',
        address: '',
        propertyType: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        purchasePrice: '',
        notaryFees: '',
        initialWorks: '',
        downPayment: '',
        loanMonthlyPayment: '',
        loanInsuranceMonthly: '',
        rentMonthly: '',
        vacancyRatePct: '5',
        nonRecoverableChargesMonthly: '',
        propertyTaxYearly: '',
        insuranceYearly: '',
        maintenanceReserveMonthly: '',
        comment: ''
      })
      await fetchDashboard(true)
    } catch (err: any) {
      console.error('Error creating real estate:', err)
      const errorMessage = err?.message || 'Erreur lors de la création'
      setError(errorMessage)
      alert(`Erreur: ${errorMessage}`)
    } finally {
      setRealEstateFormLoading(false)
    }
  }

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#0D1117] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#58A6FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#8B949E]">Chargement...</p>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-[#0D1117] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#E74C3C] mb-4">{error}</p>
          <button
            onClick={() => fetchDashboard()}
            className="px-4 py-2 bg-[#58A6FF] text-white rounded-lg hover:bg-[#4A9EFF] transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="min-h-screen bg-[#0D1117] text-[#E6EDF3] p-4 md:p-6">
      <div className="w-full space-y-6 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#E6EDF3] flex items-center gap-3">
              <Activity className="w-8 h-8 text-[#58A6FF]" />
              Investissements
            </h1>
            <p className="text-sm text-[#8B949E] mt-1">Suivez vos performances en temps réel</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchDashboard(true)}
              disabled={refreshing}
              className="px-4 py-2 bg-[#161B22] border border-[#30363D] text-[#E6EDF3] rounded-lg hover:bg-[#21262D] hover:border-[#58A6FF] transition-all flex items-center gap-2 disabled:opacity-50"
              title="Actualiser"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2 bg-[#58A6FF] text-white rounded-lg hover:bg-[#4A9EFF] transition-colors flex items-center gap-2 shadow-lg shadow-[#58A6FF]/20"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Ajouter</span>
            </button>
          </div>
        </div>

        {/* KPI Line */}
        <div className="bg-gradient-to-br from-[#161B22] to-[#0D1117] border border-[#30363D] rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-[#8B949E] mb-2">Valeur Totale</p>
              <div className="flex items-baseline gap-3 flex-wrap">
                <p className="text-4xl font-bold text-[#E6EDF3]">
                  {formatCurrency(data.total_value)}
                </p>
                <div className="flex items-center gap-2">
                  {data.period_change_pct >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-[#2ECC71]" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-[#E74C3C]" />
                  )}
                  <span className={`text-xl font-semibold ${data.period_change_pct >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'}`}>
                    {data.period_change_pct >= 0 ? '+' : ''}{data.period_change_pct.toFixed(1)}%
                  </span>
                  <span className="text-sm text-[#8B949E]">
                    ({PERIODS.find(p => p.value === selectedPeriod)?.label || '30j'})
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-[#8B949E] mb-1">Dernière mise à jour</p>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${refreshing ? 'bg-[#58A6FF] animate-pulse' : 'bg-[#2ECC71]'}`} />
                <p className="text-sm text-[#E6EDF3] font-medium">{formatTimeAgo(data.updated_at)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-[#30363D] overflow-x-auto pb-2">
          {['all', 'crypto', 'bourse', 'épargne', 'immobilier', 'autres'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-4 py-2 text-sm font-medium transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${selectedType === type
                ? 'border-[#58A6FF] text-[#58A6FF] bg-[#58A6FF]/10'
                : 'border-transparent text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#161B22]'
                } rounded-t-lg`}
            >
              {type !== 'all' && <span className="inline-flex">{getTypeIcon(type, 16)}</span>}
              {TYPE_LABELS[type]}
            </button>
          ))}
        </div>

        {/* Portfolio Evolution Chart */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <h2 className="text-lg font-semibold text-[#E6EDF3] flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#58A6FF]" />
              Évolution du Portefeuille
            </h2>
            <div className="flex gap-2 flex-wrap">
              {PERIODS.map((period) => (
                <button
                  key={period.value}
                  onClick={() => setSelectedPeriod(period.value)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-all ${selectedPeriod === period.value
                    ? 'bg-[#58A6FF] text-white shadow-lg shadow-[#58A6FF]/30'
                    : 'bg-[#21262D] text-[#8B949E] hover:bg-[#30363D] hover:text-[#E6EDF3]'
                    }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={data.portfolio_series}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2ECC71" stopOpacity={0.4} />
                  <stop offset="50%" stopColor="#2ECC71" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2ECC71" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="t"
                tick={{ fill: '#8B949E', fontSize: 11 }}
                axisLine={{ stroke: '#30363D' }}
                tickLine={{ stroke: '#30363D' }}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                }}
              />
              <YAxis
                tick={{ fill: '#8B949E', fontSize: 11 }}
                axisLine={{ stroke: '#30363D' }}
                tickLine={{ stroke: '#30363D' }}
                tickFormatter={(value) => {
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`
                  return value.toString()
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#161B22',
                  border: '1px solid #30363D',
                  borderRadius: '8px',
                  color: '#E6EDF3',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
                }}
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => {
                  const date = new Date(label)
                  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                }}
              />
              <Area
                type="monotone"
                dataKey="v"
                stroke="#2ECC71"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorValue)"
                dot={false}
                activeDot={{ r: 4, fill: '#2ECC71' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Three Blocks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Répartition */}
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <h2 className="text-lg font-semibold text-[#E6EDF3] mb-4 flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-[#58A6FF]" />
              Répartition du Portefeuille
            </h2>
            {data.allocation.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={data.allocation}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={800}
                    >
                      {data.allocation.map((entry, index) => {
                        const colorKey = entry.label.toLowerCase() as keyof typeof COLORS
                        return (
                          <Cell key={`cell-${index}`} fill={COLORS[colorKey] || COLORS.autres} />
                        )
                      })}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#161B22',
                        border: '1px solid #30363D',
                        borderRadius: '8px',
                        color: '#E6EDF3'
                      }}
                      formatter={(value: number) => `${value}%`}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2.5">
                  {data.allocation.map((item) => {
                    const colorKey = item.label.toLowerCase() as keyof typeof COLORS
                    return (
                      <div key={item.label} className="flex items-center justify-between text-sm group hover:bg-[#21262D] p-2 rounded-lg transition-colors">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-3.5 h-3.5 rounded-full shadow-sm"
                            style={{ backgroundColor: COLORS[colorKey] || COLORS.autres }}
                          />
                          <span className="text-[#8B949E] group-hover:text-[#E6EDF3] transition-colors">
                            {TYPE_LABELS[item.label] || item.label}
                          </span>
                        </div>
                        <span className="text-[#E6EDF3] font-semibold">{item.value}%</span>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-[#8B949E]">Aucune donnée</div>
            )}
          </div>

          {/* Top Performances */}
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <h2 className="text-lg font-semibold text-[#E6EDF3] mb-4 flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-[#2ECC71]" />
              Top Performances (30j)
            </h2>
            {data.top.length > 0 ? (
              <div className="space-y-3">
                {data.top.map((item, index) => {
                  const investment = data.items.find(i => i.name === item.label)
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-[#0D1117] rounded-lg hover:bg-[#21262D] transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#21262D] rounded-lg group-hover:bg-[#30363D] transition-colors">
                          {getTypeIcon(investment?.type || 'autres', 18)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#E6EDF3]">{item.label}</p>
                          <p className="text-xs text-[#8B949E]">{investment?.category || ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#2ECC71]" />
                        <span className="text-sm font-semibold text-[#2ECC71]">
                          +{item.pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-[#8B949E]">Aucune donnée</div>
            )}
          </div>

          {/* Worst Performances */}
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <h2 className="text-lg font-semibold text-[#E6EDF3] mb-4 flex items-center gap-2">
              <ArrowDownRight className="w-5 h-5 text-[#E74C3C]" />
              Pires Performances (30j)
            </h2>
            {data.worst.length > 0 ? (
              <div className="space-y-3">
                {data.worst.map((item, index) => {
                  const investment = data.items.find(i => i.name === item.label)
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-[#0D1117] rounded-lg hover:bg-[#21262D] transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#21262D] rounded-lg group-hover:bg-[#30363D] transition-colors">
                          {getTypeIcon(investment?.type || 'autres', 18)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#E6EDF3]">{item.label}</p>
                          <p className="text-xs text-[#8B949E]">{investment?.category || ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-[#E74C3C]" />
                        <span className="text-sm font-semibold text-[#E74C3C]">
                          {item.pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-[#8B949E]">Aucune donnée</div>
            )}
          </div>
        </div>

        {/* Investment Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#E6EDF3] flex items-center gap-2">
              <Package className="w-6 h-6 text-[#58A6FF]" />
              Mes Investissements
            </h2>
            <span className="text-sm text-[#8B949E]">{data.items.length} investissement{data.items.length > 1 ? 's' : ''}</span>
          </div>
          {data.items.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {data.items.map((item, index) => (
                <div
                  key={item.id}
                  onClick={() => handleInvestmentClick(item.id)}
                  className="bg-[#161B22] border border-[#30363D] rounded-xl p-6 hover:border-[#58A6FF] hover:shadow-lg hover:shadow-[#58A6FF]/10 transition-all group cursor-pointer"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div className="flex-1 w-full">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="p-3 bg-[#21262D] rounded-xl group-hover:bg-[#30363D] transition-colors">
                          {getTypeIcon(item.type, 24)}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-[#E6EDF3] mb-1">{item.name}</h3>
                          <p className="text-sm text-[#8B949E] mb-2">{item.subtitle}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-1 bg-[#21262D] text-[#8B949E] rounded">
                              {item.category}
                            </span>
                            <span className="text-xs px-2 py-1 bg-[#21262D] text-[#8B949E] rounded">
                              {item.platform}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-[#8B949E] mb-1.5">Valeur</p>
                          <p className="text-lg font-bold text-[#E6EDF3]">
                            {formatCurrency(item.value, item.currency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[#8B949E] mb-1.5">Gain/Perte</p>
                          <div className="flex items-center gap-1">
                            {item.pl_pct >= 0 ? (
                              <ArrowUpRight className="w-4 h-4 text-[#2ECC71]" />
                            ) : (
                              <ArrowDownRight className="w-4 h-4 text-[#E74C3C]" />
                            )}
                            <p className={`text-lg font-bold ${item.pl_pct >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'}`}>
                              {item.pl_pct >= 0 ? '+' : ''}{item.pl_pct.toFixed(1)}%
                            </p>
                          </div>
                          <p className={`text-sm ${item.pl_value >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'}`}>
                            {item.pl_value >= 0 ? '+' : ''}{formatCurrency(item.pl_value, item.currency)}
                          </p>
                        </div>
                        {item.change_24h_pct !== 0 && (
                          <div>
                            <p className="text-xs text-[#8B949E] mb-1.5">24h</p>
                            <div className="flex items-center gap-1">
                              {item.change_24h_pct >= 0 ? (
                                <ArrowUpRight className="w-3 h-3 text-[#2ECC71]" />
                              ) : (
                                <ArrowDownRight className="w-3 h-3 text-[#E74C3C]" />
                              )}
                              <p className={`text-base font-semibold ${item.change_24h_pct >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'}`}>
                                {item.change_24h_pct >= 0 ? '+' : ''}{item.change_24h_pct.toFixed(2)}%
                              </p>
                            </div>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-[#8B949E] mb-1.5">Allocation</p>
                          <p className="text-lg font-semibold text-[#E6EDF3]">
                            {((item.value / data.total_value) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="w-full lg:w-40 h-20 lg:h-24 bg-[#0D1117] rounded-lg p-2 border border-[#30363D]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={item.sparkline.map((v, i) => ({ value: v, index: i }))} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke={item.pl_pct >= 0 ? '#2ECC71' : '#E74C3C'}
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={true}
                            animationDuration={500}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-12 text-center">
              <Package className="w-12 h-12 text-[#8B949E] mx-auto mb-4 opacity-50" />
              <p className="text-[#8B949E] mb-2">Aucun investissement trouvé</p>
              <p className="text-sm text-[#8B949E] opacity-75">Commencez par ajouter votre premier investissement</p>
            </div>
          )}
        </div>

        {/* Modal Détails Investissement */}
        {selectedInvestment && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={closeDetailsModal}
          >
            <div
              className="bg-[#161B22] border border-[#30363D] rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {loadingDetails || loadingRealEstateMetrics ? (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 border-4 border-[#58A6FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-[#8B949E]">Chargement des détails...</p>
                </div>
              ) : realEstateMetrics ? (
                <>
                  {/* Header Immobilier */}
                  <div className="sticky top-0 bg-[#161B22] border-b border-[#30363D] p-6 flex items-start justify-between z-10">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-3 bg-[#21262D] rounded-xl">
                        <Home className="w-8 h-8 text-[#E67E22]" />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold text-[#E6EDF3] mb-1">{realEstateMetrics.investmentName}</h2>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs px-2 py-1 bg-[#21262D] text-[#8B949E] rounded">
                            Immobilier
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleEditInvestment}
                        className="p-2 text-[#8B949E] hover:text-[#58A6FF] hover:bg-[#21262D] rounded-lg transition-colors"
                        title="Modifier"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleDeleteInvestment}
                        className="p-2 text-[#8B949E] hover:text-[#E74C3C] hover:bg-[#21262D] rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={closeDetailsModal}
                        className="p-2 text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#21262D] rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Content Immobilier */}
                  <div className="p-6 space-y-6 overflow-hidden">
                    {/* KPIs Principaux */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-[#0D1117] border border-[#30363D] rounded-lg p-4">
                        <p className="text-xs text-[#8B949E] mb-2">Cashflow Net Mensuel</p>
                        <p className={`text-2xl font-bold ${realEstateMetrics.cashflowNet >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'}`}>
                          {formatCurrency(realEstateMetrics.cashflowNet)}
                        </p>
                      </div>
                      <div className="bg-[#0D1117] border border-[#30363D] rounded-lg p-4">
                        <p className="text-xs text-[#8B949E] mb-2">Cash Investi Initial</p>
                        <p className="text-2xl font-bold text-[#E6EDF3]">
                          {formatCurrency(realEstateMetrics.cashInitial)}
                        </p>
                      </div>
                      <div className="bg-[#0D1117] border border-[#30363D] rounded-lg p-4">
                        <p className="text-xs text-[#8B949E] mb-2">Payback</p>
                        {realEstateMetrics.paybackMonths ? (
                          <div>
                            <p className="text-xl font-bold text-[#E6EDF3]">
                              {realEstateMetrics.paybackYears?.toFixed(1)} ans
                            </p>
                            <p className="text-sm text-[#8B949E]">
                              ({realEstateMetrics.paybackMonths.toFixed(0)} mois)
                            </p>
                          </div>
                        ) : (
                          <p className="text-lg font-medium text-[#8B949E]">Non rentable</p>
                        )}
                      </div>
                    </div>

                    {/* Graphique Cashflow Cumulé */}
                    {realEstateMetrics.cumulativeSeries && (
                      <div className="bg-[#0D1117] border border-[#30363D] rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-[#E6EDF3] mb-4">Cashflow Cumulé (30 ans)</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <AreaChart data={realEstateMetrics.cumulativeSeries.filter((_: any, i: number) => i % 12 === 0 || i === 0 || i === realEstateMetrics.cumulativeSeries.length - 1)}>
                            <defs>
                              <linearGradient id="cashflowGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2ECC71" stopOpacity={0.4} />
                                <stop offset="50%" stopColor="#2ECC71" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#2ECC71" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <XAxis
                              dataKey="month"
                              tick={{ fill: '#8B949E', fontSize: 11 }}
                              axisLine={{ stroke: '#30363D' }}
                              tickLine={{ stroke: '#30363D' }}
                              tickFormatter={(value) => {
                                const years = Math.floor(value / 12)
                                return years > 0 ? `${years}an${years > 1 ? 's' : ''}` : '0'
                              }}
                            />
                            <YAxis
                              tick={{ fill: '#8B949E', fontSize: 11 }}
                              axisLine={{ stroke: '#30363D' }}
                              tickLine={{ stroke: '#30363D' }}
                              tickFormatter={(value) => formatCurrency(value)}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#161B22',
                                border: '1px solid #30363D',
                                borderRadius: '8px',
                                color: '#E6EDF3'
                              }}
                              formatter={(value: number) => formatCurrency(value)}
                              labelFormatter={(label) => {
                                const months = Number(label)
                                const years = Math.floor(months / 12)
                                const remainingMonths = months % 12
                                if (years === 0) return `${remainingMonths} mois`
                                return `${years} an${years > 1 ? 's' : ''}${remainingMonths > 0 ? ` ${remainingMonths} mois` : ''}`
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="cumulative"
                              stroke="#2ECC71"
                              strokeWidth={2.5}
                              fillOpacity={1}
                              fill="url(#cashflowGradient)"
                              dot={false}
                              activeDot={{ r: 4, fill: '#2ECC71' }}
                            />
                            <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </>
              ) : investmentDetails ? (
                <>
                  {/* Header */}
                  <div className="sticky top-0 bg-[#161B22] border-b border-[#30363D] p-6 flex items-start justify-between z-10">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-3 bg-[#21262D] rounded-xl">
                        {getTypeIcon(data?.items.find(i => i.id === selectedInvestment)?.type || 'autres', 32)}
                      </div>
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold text-[#E6EDF3] mb-1">{investmentDetails.name}</h2>
                        {investmentDetails.symbol && (
                          <p className="text-sm text-[#8B949E] font-mono mb-2">{investmentDetails.symbol}</p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs px-2 py-1 bg-[#21262D] text-[#8B949E] rounded">
                            {investmentDetails.category}
                          </span>
                          {investmentDetails.subCategory && (
                            <span className="text-xs px-2 py-1 bg-[#21262D] text-[#8B949E] rounded">
                              {investmentDetails.subCategory}
                            </span>
                          )}
                          {investmentDetails.platform && (
                            <span className="text-xs px-2 py-1 bg-[#21262D] text-[#8B949E] rounded">
                              {investmentDetails.platform}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleEditInvestment}
                        className="p-2 text-[#8B949E] hover:text-[#58A6FF] hover:bg-[#21262D] rounded-lg transition-colors"
                        title="Modifier"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleDeleteInvestment}
                        className="p-2 text-[#8B949E] hover:text-[#E74C3C] hover:bg-[#21262D] rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={closeDetailsModal}
                        className="p-2 text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#21262D] rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-6 overflow-hidden">
                    {/* KPIs Principaux */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-[#0D1117] border border-[#30363D] rounded-lg p-4">
                        <p className="text-xs text-[#8B949E] mb-2">Valeur Actuelle</p>
                        <p className="text-2xl font-bold text-[#E6EDF3]">
                          {formatCurrency(investmentDetails.currentValue, investmentDetails.currency)}
                        </p>
                      </div>
                      <div className="bg-[#0D1117] border border-[#30363D] rounded-lg p-4">
                        <p className="text-xs text-[#8B949E] mb-2">Gain/Perte</p>
                        <div className="flex items-center gap-2">
                          {investmentDetails.performance >= 0 ? (
                            <TrendingUp className="w-5 h-5 text-[#2ECC71]" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-[#E74C3C]" />
                          )}
                          <p className={`text-2xl font-bold ${investmentDetails.performance >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'}`}>
                            {investmentDetails.performance >= 0 ? '+' : ''}{investmentDetails.performance.toFixed(2)}%
                          </p>
                        </div>
                        <p className={`text-sm mt-1 ${investmentDetails.gainLoss >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'}`}>
                          {investmentDetails.gainLoss >= 0 ? '+' : ''}{formatCurrency(investmentDetails.gainLoss, investmentDetails.currency)}
                        </p>
                      </div>
                      <div className="bg-[#0D1117] border border-[#30363D] rounded-lg p-4">
                        <p className="text-xs text-[#8B949E] mb-2">Montant Investi</p>
                        <p className="text-2xl font-bold text-[#E6EDF3]">
                          {investmentDetails.amountInvested
                            ? formatCurrency(investmentDetails.amountInvested, investmentDetails.currency)
                            : formatCurrency(investmentDetails.costBasis * investmentDetails.quantity, investmentDetails.currency)
                          }
                        </p>
                      </div>
                    </div>

                    {/* Graphique détaillé */}
                    {data && (
                      <div className="bg-[#0D1117] border border-[#30363D] rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-[#E6EDF3] mb-4">Évolution</h3>
                        <ResponsiveContainer width="100%" height={200}>
                          <AreaChart data={data.items.find(i => i.id === selectedInvestment)?.sparkline.map((v, i) => ({
                            date: i,
                            value: v
                          })) || []}>
                            <defs>
                              <linearGradient id={`gradient-${selectedInvestment}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={investmentDetails.performance >= 0 ? '#2ECC71' : '#E74C3C'} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={investmentDetails.performance >= 0 ? '#2ECC71' : '#E74C3C'} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <XAxis
                              dataKey="date"
                              tick={{ fill: '#8B949E', fontSize: 10 }}
                              axisLine={{ stroke: '#30363D' }}
                            />
                            <YAxis
                              tick={{ fill: '#8B949E', fontSize: 10 }}
                              axisLine={{ stroke: '#30363D' }}
                              tickFormatter={(value) => formatCurrency(value, investmentDetails.currency)}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#161B22',
                                border: '1px solid #30363D',
                                borderRadius: '8px',
                                color: '#E6EDF3'
                              }}
                              formatter={(value: number) => formatCurrency(value, investmentDetails.currency)}
                            />
                            <Area
                              type="monotone"
                              dataKey="value"
                              stroke={investmentDetails.performance >= 0 ? '#2ECC71' : '#E74C3C'}
                              strokeWidth={2}
                              fill={`url(#gradient-${selectedInvestment})`}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Informations détaillées */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-[#0D1117] border border-[#30363D] rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-[#E6EDF3] mb-4 flex items-center gap-2">
                          <Info className="w-4 h-4 text-[#58A6FF]" />
                          Informations Générales
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-[#8B949E]">Quantité</span>
                            <span className="text-sm font-medium text-[#E6EDF3]">{investmentDetails.quantity.toFixed(4)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-[#8B949E]">Prix Unitaire Actuel</span>
                            <span className="text-sm font-medium text-[#E6EDF3]">
                              {investmentDetails.currentPrice
                                ? formatCurrency(investmentDetails.currentPrice, investmentDetails.currency)
                                : '-'
                              }
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-[#8B949E]">Prix d'Achat Moyen</span>
                            <span className="text-sm font-medium text-[#E6EDF3]">
                              {formatCurrency(investmentDetails.costBasis, investmentDetails.currency)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-[#8B949E]">Mode de Valorisation</span>
                            <span className="text-sm font-medium text-[#E6EDF3] capitalize">
                              {investmentDetails.valuationMode}
                            </span>
                          </div>
                          {investmentDetails.lastValuationDate && (
                            <div className="flex justify-between">
                              <span className="text-sm text-[#8B949E]">Dernière Valorisation</span>
                              <span className="text-sm font-medium text-[#E6EDF3]">
                                {new Date(investmentDetails.lastValuationDate).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Informations spécifiques selon le mode */}
                      {investmentDetails.valuationMode === 'taux' && (
                        <div className="bg-[#0D1117] border border-[#30363D] rounded-lg p-4">
                          <h3 className="text-sm font-semibold text-[#E6EDF3] mb-4 flex items-center gap-2">
                            <Percent className="w-4 h-4 text-[#58A6FF]" />
                            Paramètres Taux
                          </h3>
                          <div className="space-y-3">
                            {investmentDetails.baseAmount && (
                              <div className="flex justify-between">
                                <span className="text-sm text-[#8B949E]">Montant de Base</span>
                                <span className="text-sm font-medium text-[#E6EDF3]">
                                  {formatCurrency(investmentDetails.baseAmount, investmentDetails.currency)}
                                </span>
                              </div>
                            )}
                            {investmentDetails.annualRate && (
                              <div className="flex justify-between">
                                <span className="text-sm text-[#8B949E]">Taux Annuel</span>
                                <span className="text-sm font-medium text-[#E6EDF3]">
                                  {investmentDetails.annualRate.toFixed(2)}%
                                </span>
                              </div>
                            )}
                            {investmentDetails.capitalizationMode && (
                              <div className="flex justify-between">
                                <span className="text-sm text-[#8B949E]">Capitalisation</span>
                                <span className="text-sm font-medium text-[#E6EDF3] capitalize">
                                  {investmentDetails.capitalizationMode}
                                </span>
                              </div>
                            )}
                            {investmentDetails.startDate && (
                              <div className="flex justify-between">
                                <span className="text-sm text-[#8B949E]">Date de Début</span>
                                <span className="text-sm font-medium text-[#E6EDF3]">
                                  {new Date(investmentDetails.startDate).toLocaleDateString('fr-FR')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {investmentDetails.valuationMode === 'marché' && investmentDetails.tradingViewSymbol && (
                        <div className="bg-[#0D1117] border border-[#30363D] rounded-lg p-4">
                          <h3 className="text-sm font-semibold text-[#E6EDF3] mb-4 flex items-center gap-2">
                            <ExternalLink className="w-4 h-4 text-[#58A6FF]" />
                            Source de Prix
                          </h3>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-sm text-[#8B949E]">Symbole TradingView</span>
                              <span className="text-sm font-medium text-[#E6EDF3] font-mono">
                                {investmentDetails.tradingViewSymbol}
                              </span>
                            </div>
                            {investmentDetails.priceProvider && (
                              <div className="flex justify-between">
                                <span className="text-sm text-[#8B949E]">Fournisseur</span>
                                <span className="text-sm font-medium text-[#E6EDF3] capitalize">
                                  {investmentDetails.priceProvider.replace('_', ' ')}
                                </span>
                              </div>
                            )}
                            <a
                              href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(investmentDetails.tradingViewSymbol)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-[#58A6FF] hover:text-[#4A9EFF] transition-colors mt-4"
                            >
                              <ExternalLink className="w-4 h-4" />
                              Voir sur TradingView
                            </a>
                          </div>
                        </div>
                      )}

                      {investmentDetails.comment && (
                        <div className="bg-[#0D1117] border border-[#30363D] rounded-lg p-4">
                          <h3 className="text-sm font-semibold text-[#E6EDF3] mb-4">Commentaire</h3>
                          <p className="text-sm text-[#8B949E]">{investmentDetails.comment}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-12 text-center">
                  <p className="text-[#E74C3C] mb-4">Erreur lors du chargement des détails</p>
                  <button
                    onClick={closeDetailsModal}
                    className="px-4 py-2 bg-[#58A6FF] text-white rounded-lg hover:bg-[#4A9EFF] transition-colors"
                  >
                    Fermer
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Création Investissement */}
        {createModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => {
              setCreateModalOpen(false)
              setInvestmentTypeSelected(false)
            }}
          >
            <div
              className={`bg-[#161B22] border border-[#30363D] rounded-xl shadow-2xl w-full ${formData.category === 'Immobilier' ? 'max-w-4xl' : 'max-w-2xl'} max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-[#161B22] border-b border-[#30363D] p-6 flex items-center justify-between z-10">
                <h2 className="text-2xl font-bold text-[#E6EDF3] flex items-center gap-2">
                  {formData.category === 'Immobilier' ? (
                    <>
                      <Home className="w-6 h-6 text-[#E67E22]" />
                      Nouvel Investissement Immobilier
                    </>
                  ) : (
                    <>
                      <Plus className="w-6 h-6 text-[#58A6FF]" />
                      Nouvel Investissement
                    </>
                  )}
                </h2>
                <button
                  onClick={() => {
                    setCreateModalOpen(false)
                    setInvestmentTypeSelected(false)
                  }}
                  className="p-2 text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#21262D] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!investmentTypeSelected ? (
                <div className="p-6">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold text-[#E6EDF3] mb-2">Choisissez le type d'investissement</h3>
                    <p className="text-sm text-[#8B949E]">Sélectionnez une catégorie pour continuer</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, category: cat })
                          setInvestmentTypeSelected(true)
                        }}
                        className="p-6 bg-[#0D1117] border border-[#30363D] rounded-xl hover:border-[#58A6FF] hover:bg-[#161B22] transition-all text-left group"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-[#21262D] rounded-lg group-hover:bg-[#30363D] transition-colors">
                            {cat === 'Immobilier' ? (
                              <Home className="w-6 h-6 text-[#E67E22]" />
                            ) : cat === 'Crypto' ? (
                              <Coins className="w-6 h-6 text-[#58A6FF]" />
                            ) : cat === 'Action' || cat === 'ETF' ? (
                              <BarChart3 className="w-6 h-6 text-[#58A6FF]" />
                            ) : cat === 'Livret' ? (
                              <PiggyBank className="w-6 h-6 text-[#58A6FF]" />
                            ) : (
                              <Package className="w-6 h-6 text-[#58A6FF]" />
                            )}
                          </div>
                          <h4 className="text-lg font-semibold text-[#E6EDF3]">{cat}</h4>
                        </div>
                        <p className="text-xs text-[#8B949E]">
                          {cat === 'Immobilier' ? 'Biens immobiliers locatifs' :
                            cat === 'Crypto' ? 'Cryptomonnaies' :
                              cat === 'Action' ? 'Actions en bourse' :
                                cat === 'ETF' ? 'Fonds indiciels' :
                                  cat === 'Livret' ? 'Livrets d\'épargne' :
                                    'Autres investissements'}
                        </p>
                      </button>
                    ))}
                  </div>
                  <div className="mt-6 pt-6 border-t border-[#30363D]">
                    <button
                      type="button"
                      onClick={() => {
                        setCreateModalOpen(false)
                        setInvestmentTypeSelected(false)
                      }}
                      className="w-full px-4 py-2.5 border border-[#30363D] text-[#E6EDF3] rounded-lg hover:bg-[#21262D] transition-colors font-medium"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateInvestment} className="p-6 space-y-6">
                  {error && (
                    <div className="bg-[#E74C3C]/20 border border-[#E74C3C] rounded-lg p-4 text-[#E74C3C] text-sm">
                      {error}
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#30363D]">
                    <div className="flex items-center gap-3">
                      {formData.category === 'Immobilier' ? (
                        <Home className="w-5 h-5 text-[#E67E22]" />
                      ) : formData.category === 'Crypto' ? (
                        <Coins className="w-5 h-5 text-[#58A6FF]" />
                      ) : formData.category === 'Action' || formData.category === 'ETF' ? (
                        <BarChart3 className="w-5 h-5 text-[#58A6FF]" />
                      ) : formData.category === 'Livret' ? (
                        <PiggyBank className="w-5 h-5 text-[#58A6FF]" />
                      ) : (
                        <Package className="w-5 h-5 text-[#58A6FF]" />
                      )}
                      <span className="text-lg font-semibold text-[#E6EDF3]">{formData.category}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setInvestmentTypeSelected(false)
                        setFormData({ ...formData, category: 'Crypto' })
                      }}
                      className="text-sm text-[#8B949E] hover:text-[#E6EDF3] transition-colors"
                    >
                      Changer de type
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={formData.category === 'Immobilier' ? 'md:col-span-2' : ''}>
                      <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                        {formData.category === 'Immobilier' ? 'Nom du bien *' : 'Nom de l\'investissement *'}
                      </label>
                      <input
                        type="text"
                        value={formData.category === 'Immobilier' ? realEstateFormData.name : formData.name}
                        onChange={(e) => {
                          if (formData.category === 'Immobilier') {
                            setRealEstateFormData({ ...realEstateFormData, name: e.target.value })
                            setFormData({ ...formData, name: e.target.value })
                          } else {
                            setFormData({ ...formData, name: e.target.value })
                          }
                        }}
                        placeholder={formData.category === 'Immobilier' ? 'Ex: Studio à Lorient' : 'Ex: Bitcoin, Apple Inc.'}
                        className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                        required
                      />
                    </div>

                    {formData.category === 'Immobilier' ? (
                      <>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Adresse
                          </label>
                          <input
                            type="text"
                            value={realEstateFormData.address}
                            onChange={(e) => setRealEstateFormData({ ...realEstateFormData, address: e.target.value })}
                            placeholder="123 Rue de la République, 56100 Lorient"
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Type de bien
                          </label>
                          <select
                            value={realEstateFormData.propertyType}
                            onChange={(e) => setRealEstateFormData({ ...realEstateFormData, propertyType: e.target.value })}
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                          >
                            <option value="">Sélectionner...</option>
                            <option value="Appartement">Appartement</option>
                            <option value="Maison">Maison</option>
                            <option value="Studio">Studio</option>
                            <option value="T2">T2</option>
                            <option value="T3">T3</option>
                            <option value="T4+">T4+</option>
                            <option value="Local commercial">Local commercial</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Date d'achat
                          </label>
                          <input
                            type="date"
                            value={realEstateFormData.purchaseDate}
                            onChange={(e) => {
                              setRealEstateFormData({ ...realEstateFormData, purchaseDate: e.target.value })
                              setFormData({ ...formData, purchaseDate: e.target.value })
                            }}
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                          />
                        </div>

                        <div className="md:col-span-2 border-t border-[#30363D] pt-4">
                          <h3 className="text-lg font-semibold text-[#E6EDF3] mb-4">Coûts d'acquisition</h3>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Prix d'achat (€) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={realEstateFormData.purchasePrice}
                            onChange={(e) => setRealEstateFormData({ ...realEstateFormData, purchasePrice: e.target.value })}
                            placeholder="150000"
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Frais de notaire (€)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={realEstateFormData.notaryFees}
                            onChange={(e) => setRealEstateFormData({ ...realEstateFormData, notaryFees: e.target.value })}
                            placeholder="12000"
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Travaux initiaux (€)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={realEstateFormData.initialWorks}
                            onChange={(e) => setRealEstateFormData({ ...realEstateFormData, initialWorks: e.target.value })}
                            placeholder="5000"
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Apport initial (€) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={realEstateFormData.downPayment}
                            onChange={(e) => setRealEstateFormData({ ...realEstateFormData, downPayment: e.target.value })}
                            placeholder="30000"
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                            required
                          />
                        </div>

                        <div className="md:col-span-2 border-t border-[#30363D] pt-4">
                          <h3 className="text-lg font-semibold text-[#E6EDF3] mb-4">Prêt</h3>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Mensualité de crédit (€)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={realEstateFormData.loanMonthlyPayment}
                            onChange={(e) => setRealEstateFormData({ ...realEstateFormData, loanMonthlyPayment: e.target.value })}
                            placeholder="450"
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Assurance emprunteur mensuelle (€)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={realEstateFormData.loanInsuranceMonthly}
                            onChange={(e) => setRealEstateFormData({ ...realEstateFormData, loanInsuranceMonthly: e.target.value })}
                            placeholder="50"
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                          />
                        </div>

                        <div className="md:col-span-2 border-t border-[#30363D] pt-4">
                          <h3 className="text-lg font-semibold text-[#E6EDF3] mb-4">Revenus</h3>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Loyer mensuel (€) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={realEstateFormData.rentMonthly}
                            onChange={(e) => setRealEstateFormData({ ...realEstateFormData, rentMonthly: e.target.value })}
                            placeholder="650"
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Taux de vacance (%)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={realEstateFormData.vacancyRatePct}
                            onChange={(e) => setRealEstateFormData({ ...realEstateFormData, vacancyRatePct: e.target.value })}
                            placeholder="5"
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                          />
                        </div>

                        <div className="md:col-span-2 border-t border-[#30363D] pt-4">
                          <h3 className="text-lg font-semibold text-[#E6EDF3] mb-4">Charges</h3>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Charges non récupérables mensuelles (€)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={realEstateFormData.nonRecoverableChargesMonthly}
                            onChange={(e) => setRealEstateFormData({ ...realEstateFormData, nonRecoverableChargesMonthly: e.target.value })}
                            placeholder="50"
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Taxe foncière annuelle (€)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={realEstateFormData.propertyTaxYearly}
                            onChange={(e) => setRealEstateFormData({ ...realEstateFormData, propertyTaxYearly: e.target.value })}
                            placeholder="1200"
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Assurance PNO annuelle (€)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={realEstateFormData.insuranceYearly}
                            onChange={(e) => setRealEstateFormData({ ...realEstateFormData, insuranceYearly: e.target.value })}
                            placeholder="300"
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Réserve maintenance mensuelle (€)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={realEstateFormData.maintenanceReserveMonthly}
                            onChange={(e) => setRealEstateFormData({ ...realEstateFormData, maintenanceReserveMonthly: e.target.value })}
                            placeholder="100"
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Commentaire
                          </label>
                          <textarea
                            value={realEstateFormData.comment}
                            onChange={(e) => setRealEstateFormData({ ...realEstateFormData, comment: e.target.value })}
                            placeholder="Notes supplémentaires..."
                            rows={3}
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                          />
                        </div>
                      </>
                    ) : formData.category === 'Livret' ? (
                      <>
                        {/* Formulaire spécifique Livret */}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Nom du Livret *
                          </label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ex: Livret A, LDDS, LEP..."
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Banque/Plateforme *
                          </label>
                          <input
                            type="text"
                            value={formData.platform}
                            onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                            placeholder="Ex: Crédit Mutuel, BNP Paribas..."
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Devise *
                          </label>
                          <select
                            value={formData.paidCurrency}
                            onChange={(e) => setFormData({ ...formData, paidCurrency: e.target.value })}
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                            required
                          >
                            <option value="EUR">EUR</option>
                            <option value="USD">USD</option>
                            <option value="GBP">GBP</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Date de début *
                          </label>
                          <input
                            type="date"
                            value={formData.startDate}
                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value, purchaseDate: e.target.value })}
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Solde actuel ({formData.paidCurrency || 'EUR'}) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.currentBalance}
                            onChange={(e) => setFormData({ ...formData, currentBalance: e.target.value })}
                            placeholder="5000.00"
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Taux d'intérêt annuel (%) <span className="text-[#8B949E] text-xs">(recommandé)</span>
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.annualRate}
                            onChange={(e) => setFormData({ ...formData, annualRate: e.target.value })}
                            placeholder="3.0"
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Contribution mensuelle ({formData.paidCurrency || 'EUR'}) <span className="text-[#8B949E] text-xs">(prévision)</span>
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.monthlyContribution}
                            onChange={(e) => setFormData({ ...formData, monthlyContribution: e.target.value })}
                            placeholder="100.00"
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Plafond ({formData.paidCurrency || 'EUR'})
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.ceiling}
                            onChange={(e) => setFormData({ ...formData, ceiling: e.target.value })}
                            placeholder="22950.00"
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Mode de calcul des intérêts
                          </label>
                          <select
                            value={formData.interestMode}
                            onChange={(e) => setFormData({ ...formData, interestMode: e.target.value })}
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                          >
                            <option value="simple_annuel">Simple annuel (par défaut)</option>
                            <option value="capitalisation_mensuelle">Capitalisation mensuelle</option>
                            <option value="capitalisation_trimestrielle">Capitalisation trimestrielle</option>
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Notes
                          </label>
                          <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Notes supplémentaires..."
                            rows={3}
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                          />
                        </div>

                        {/* Aperçu des projections */}
                        {savingsProjection.currentValue !== null ? (
                          <div className="md:col-span-2 p-4 bg-[#0D1117] border border-[#30363D] rounded-lg space-y-2">
                            <h4 className="text-sm font-semibold text-[#E6EDF3] mb-3">Projections</h4>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-[#8B949E]">Valeur actuelle:</span>
                                <span className="ml-2 text-[#E6EDF3] font-medium">{savingsProjection.currentValue?.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {formData.paidCurrency || 'EUR'}</span>
                              </div>
                              {savingsProjection.projection1y !== null && (
                                <div>
                                  <span className="text-[#8B949E]">Projection 1 an:</span>
                                  <span className="ml-2 text-[#E6EDF3] font-medium">{savingsProjection.projection1y?.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {formData.paidCurrency || 'EUR'}</span>
                                </div>
                              )}
                              {savingsProjection.estimatedInterest1y !== null && savingsProjection.estimatedInterest1y > 0 && (
                                <div className="md:col-span-2">
                                  <span className="text-[#8B949E]">Intérêts estimés sur 1 an:</span>
                                  <span className="ml-2 text-[#2ECC71] font-medium">+{savingsProjection.estimatedInterest1y?.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {formData.paidCurrency || 'EUR'}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </>
                    ) : formData.category === 'Crypto' ? (
                      <>
                        {/* Formulaire spécifique Crypto */}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Nom de l'investissement *
                          </label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ex: Bitcoin, Ethereum"
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Symbole de base (ex: BTC, ETH) *
                          </label>
                          <input
                            type="text"
                            value={formData.baseSymbol}
                            onChange={(e) => setFormData({ ...formData, baseSymbol: e.target.value.toUpperCase() })}
                            placeholder="BTC"
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Devise de cotation *
                          </label>
                          <select
                            value={formData.quoteSymbol}
                            onChange={(e) => setFormData({ ...formData, quoteSymbol: e.target.value })}
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                            required
                          >
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="GBP">GBP</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Plateforme *
                          </label>
                          <input
                            type="text"
                            value={formData.platform}
                            onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                            placeholder="Binance, Kraken, Ledger..."
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Quantité (base) *
                          </label>
                          <input
                            type="number"
                            step="0.00000001"
                            value={formData.quantity}
                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                            placeholder="0.15"
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Date d'achat *
                          </label>
                          <input
                            type="date"
                            value={formData.purchaseDate}
                            onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Prix unitaire d'achat ({formData.quoteSymbol}) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.buyUnitPriceQuote}
                            onChange={(e) => setFormData({ ...formData, buyUnitPriceQuote: e.target.value })}
                            placeholder="50000.00"
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Frais ({formData.quoteSymbol})
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.fees}
                            onChange={(e) => setFormData({ ...formData, fees: e.target.value })}
                            placeholder="0.00"
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Montant payé (optionnel)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.paidAmount}
                            onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
                            placeholder="500.00"
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Devise payée
                          </label>
                          <select
                            value={formData.paidCurrency}
                            onChange={(e) => setFormData({ ...formData, paidCurrency: e.target.value })}
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                          >
                            <option value="EUR">EUR</option>
                            <option value="USD">USD</option>
                            <option value="GBP">GBP</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Taux de change ({formData.paidCurrency} → {formData.quoteSymbol})
                          </label>
                          <input
                            type="number"
                            step="0.0001"
                            value={formData.fxPaidToQuote}
                            onChange={(e) => setFormData({ ...formData, fxPaidToQuote: e.target.value })}
                            placeholder="1.10"
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Notes
                          </label>
                          <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Notes supplémentaires..."
                            rows={3}
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                          />
                        </div>

                        {/* Aperçu des métriques en temps réel */}
                        {cryptoMetrics.loading ? (
                          <div className="md:col-span-2 p-4 bg-[#0D1117] border border-[#30363D] rounded-lg">
                            <p className="text-sm text-[#8B949E]">Calcul des métriques...</p>
                          </div>
                        ) : cryptoMetrics.currentPrice !== null ? (
                          <div className="md:col-span-2 p-4 bg-[#0D1117] border border-[#30363D] rounded-lg space-y-2">
                            <h4 className="text-sm font-semibold text-[#E6EDF3] mb-3">Aperçu des métriques</h4>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-[#8B949E]">Prix actuel:</span>
                                <span className="ml-2 text-[#E6EDF3] font-medium">{cryptoMetrics.currentPrice?.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 8 })} {formData.quoteSymbol}</span>
                              </div>
                              <div>
                                <span className="text-[#8B949E]">Valeur actuelle:</span>
                                <span className="ml-2 text-[#E6EDF3] font-medium">{cryptoMetrics.currentValue?.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {formData.quoteSymbol}</span>
                              </div>
                              <div>
                                <span className="text-[#8B949E]">Coût total:</span>
                                <span className="ml-2 text-[#E6EDF3] font-medium">{cryptoMetrics.costBasisQuote?.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {formData.quoteSymbol}</span>
                              </div>
                              <div>
                                <span className="text-[#8B949E]">P/L:</span>
                                <span className={`ml-2 font-medium ${(cryptoMetrics.plValue || 0) >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'}`}>
                                  {cryptoMetrics.plValue !== null ? `${cryptoMetrics.plValue >= 0 ? '+' : ''}${cryptoMetrics.plValue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${formData.quoteSymbol}` : '-'}
                                  {cryptoMetrics.plPct !== null && ` (${cryptoMetrics.plPct >= 0 ? '+' : ''}${cryptoMetrics.plPct.toFixed(2)}%)`}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </>
                    ) : formData.category === 'ETF' ? (
                      <>
                        {/* Formulaire spécifique ETF */}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Nom de l'ETF *
                          </label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ex: Amundi MSCI World"
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            ISIN (prioritaire) *
                          </label>
                          <input
                            type="text"
                            value={formData.isin}
                            onChange={(e) => setFormData({ ...formData, isin: e.target.value.toUpperCase() })}
                            placeholder="FR0010315770"
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Ticker (si pas d'ISIN)
                          </label>
                          <input
                            type="text"
                            value={formData.ticker}
                            onChange={(e) => setFormData({ ...formData, ticker: e.target.value.toUpperCase() })}
                            placeholder="CW8"
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Plateforme/Broker *
                          </label>
                          <input
                            type="text"
                            value={formData.platform}
                            onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                            placeholder="BoursoBank, Degiro..."
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Nombre de parts *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.quantityParts}
                            onChange={(e) => setFormData({ ...formData, quantityParts: e.target.value })}
                            placeholder="10.5"
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Date d'achat *
                          </label>
                          <input
                            type="date"
                            value={formData.purchaseDate}
                            onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Prix unitaire d'achat ({formData.quoteSymbol || 'EUR'}) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.buyUnitPrice}
                            onChange={(e) => setFormData({ ...formData, buyUnitPrice: e.target.value })}
                            placeholder="50.00"
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Devise de cotation *
                          </label>
                          <select
                            value={formData.quoteSymbol}
                            onChange={(e) => setFormData({ ...formData, quoteSymbol: e.target.value })}
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                            required
                          >
                            <option value="EUR">EUR</option>
                            <option value="USD">USD</option>
                            <option value="GBP">GBP</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Frais ({formData.quoteSymbol || 'EUR'})
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.fees}
                            onChange={(e) => setFormData({ ...formData, fees: e.target.value })}
                            placeholder="0.00"
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Type de distribution
                          </label>
                          <select
                            value={formData.distributionType}
                            onChange={(e) => setFormData({ ...formData, distributionType: e.target.value })}
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                          >
                            <option value="">Sélectionner...</option>
                            <option value="ACC">ACC (Capitalisation)</option>
                            <option value="DIST">DIST (Distribution)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Enveloppe
                          </label>
                          <select
                            value={formData.envelope}
                            onChange={(e) => setFormData({ ...formData, envelope: e.target.value })}
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                          >
                            <option value="">Sélectionner...</option>
                            <option value="PEA">PEA</option>
                            <option value="CTO">CTO</option>
                            <option value="AV">AV (Assurance Vie)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Benchmark
                          </label>
                          <input
                            type="text"
                            value={formData.benchmark}
                            onChange={(e) => setFormData({ ...formData, benchmark: e.target.value })}
                            placeholder="MSCI World, S&P 500..."
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Notes
                          </label>
                          <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Notes supplémentaires..."
                            rows={3}
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                          />
                        </div>

                        {/* Aperçu des métriques en temps réel */}
                        {etfMetrics.loading ? (
                          <div className="md:col-span-2 p-4 bg-[#0D1117] border border-[#30363D] rounded-lg">
                            <p className="text-sm text-[#8B949E]">Calcul des métriques...</p>
                          </div>
                        ) : etfMetrics.currentPrice !== null ? (
                          <div className="md:col-span-2 p-4 bg-[#0D1117] border border-[#30363D] rounded-lg space-y-2">
                            <h4 className="text-sm font-semibold text-[#E6EDF3] mb-3">Aperçu des métriques</h4>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-[#8B949E]">Prix actuel:</span>
                                <span className="ml-2 text-[#E6EDF3] font-medium">{etfMetrics.currentPrice?.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {formData.quoteSymbol || 'EUR'}</span>
                              </div>
                              <div>
                                <span className="text-[#8B949E]">Valeur actuelle:</span>
                                <span className="ml-2 text-[#E6EDF3] font-medium">{etfMetrics.currentValue?.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {formData.quoteSymbol || 'EUR'}</span>
                              </div>
                              <div>
                                <span className="text-[#8B949E]">Coût total:</span>
                                <span className="ml-2 text-[#E6EDF3] font-medium">{etfMetrics.costBasis?.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {formData.quoteSymbol || 'EUR'}</span>
                              </div>
                              <div>
                                <span className="text-[#8B949E]">P/L:</span>
                                <span className={`ml-2 font-medium ${(etfMetrics.plValue || 0) >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'}`}>
                                  {etfMetrics.plValue !== null ? `${etfMetrics.plValue >= 0 ? '+' : ''}${etfMetrics.plValue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${formData.quoteSymbol || 'EUR'}` : '-'}
                                  {etfMetrics.plPct !== null && ` (${etfMetrics.plPct >= 0 ? '+' : ''}${etfMetrics.plPct.toFixed(2)}%)`}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <>
                        {/* Action, ETF */}
                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Symbole (ex: BTCUSD, AAPL) *
                          </label>
                          <input
                            type="text"
                            value={formData.symbol}
                            onChange={(e) => {
                              const symbol = e.target.value.toUpperCase()
                              const baseSymbol = symbol.split(/[\/\-]/)[0] || symbol.replace(/USD|EUR|GBP$/, '')
                              setFormData({
                                ...formData,
                                symbol,
                                baseSymbol: baseSymbol || formData.baseSymbol
                              })
                            }}
                            placeholder="BTCUSD, AAPL"
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Symbole de base (ex: BTC, ETH)
                          </label>
                          <input
                            type="text"
                            value={formData.baseSymbol}
                            onChange={(e) => setFormData({ ...formData, baseSymbol: e.target.value.toUpperCase() })}
                            placeholder="BTC"
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Devise de cotation *
                          </label>
                          <select
                            value={formData.quoteSymbol}
                            onChange={(e) => setFormData({ ...formData, quoteSymbol: e.target.value })}
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                          >
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="GBP">GBP</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Plateforme
                          </label>
                          <input
                            type="text"
                            value={formData.platform}
                            onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                            placeholder="Binance, Degiro, etc."
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Quantité *
                          </label>
                          <input
                            type="number"
                            step="0.0001"
                            value={formData.quantity}
                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                            placeholder="2.0"
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Montant payé *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.paidAmount}
                            onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
                            placeholder="500.00"
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Devise payée *
                          </label>
                          <select
                            value={formData.paidCurrency}
                            onChange={(e) => setFormData({ ...formData, paidCurrency: e.target.value })}
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                          >
                            <option value="EUR">EUR</option>
                            <option value="USD">USD</option>
                            <option value="GBP">GBP</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                            Date d'achat *
                          </label>
                          <input
                            type="date"
                            value={formData.purchaseDate}
                            onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                            className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                            required
                          />
                        </div>

                        {/* Transaction Toggle */}
                        <div className="md:col-span-2 border-t border-[#30363D] pt-4 mt-4">
                          <label className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={formData.createTransaction}
                              onChange={(e) => setFormData({ ...formData, createTransaction: e.target.checked })}
                              className="h-4 w-4 text-[#58A6FF] bg-[#0D1117] border-[#30363D] rounded focus:ring-[#58A6FF]"
                            />
                            <span className="text-[#E6EDF3] font-medium">Créer une transaction associée</span>
                          </label>
                        </div>

                        {formData.createTransaction && (
                          <div className="md:col-span-2 space-y-4 animate-in slide-in-from-top-2">
                            <div>
                              <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                                Compte source (dépense) *
                              </label>
                              <select
                                value={formData.sourceAccountId}
                                onChange={(e) => setFormData({ ...formData, sourceAccountId: e.target.value })}
                                className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                                required={formData.createTransaction}
                              >
                                <option value="">Sélectionner un compte...</option>
                                {accounts.map((acc: Account) => (
                                  <option key={acc.id} value={acc.id}>
                                    {acc.name} ({acc.balance.toFixed(2)} €)
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-[#30363D]">
                    <button
                      type="button"
                      onClick={() => {
                        setCreateModalOpen(false)
                        setInvestmentTypeSelected(false)
                        setFormData({
                          name: '',
                          symbol: '',
                          baseSymbol: '',
                          quoteSymbol: 'USD',
                          category: 'Crypto',
                          platform: '',
                          quantity: '',
                          paidAmount: '',
                          paidCurrency: 'EUR',
                          purchaseDate: new Date().toISOString().split('T')[0],
                          annualRate: '',
                          capitalizationMode: 'mensuelle',
                          startDate: new Date().toISOString().split('T')[0],
                          buyUnitPriceQuote: '',
                          fees: '',
                          fxPaidToQuote: '',
                          notes: '',
                          ticker: '',
                          exchange: '',
                          isin: '',
                          dividendsTracking: false,
                          quantityParts: '',
                          buyUnitPrice: '',
                          distributionType: '',
                          envelope: '',
                          benchmark: '',
                          currentBalance: '',
                          monthlyContribution: '',
                          ceiling: '',
                          interestMode: 'simple_annuel'
                        })
                        setCryptoMetrics({
                          currentPrice: null,
                          currentValue: null,
                          costBasisQuote: null,
                          plValue: null,
                          plPct: null,
                          loading: false
                        })
                        setEtfMetrics({
                          currentPrice: null,
                          currentValue: null,
                          costBasis: null,
                          plValue: null,
                          plPct: null,
                          loading: false
                        })
                        setSavingsProjection({
                          currentValue: null,
                          projection1y: null,
                          estimatedInterest1y: null,
                          loading: false
                        })
                        setRealEstateFormData({
                          name: '',
                          address: '',
                          propertyType: '',
                          purchaseDate: new Date().toISOString().split('T')[0],
                          purchasePrice: '',
                          notaryFees: '',
                          initialWorks: '',
                          downPayment: '',
                          loanMonthlyPayment: '',
                          loanInsuranceMonthly: '',
                          rentMonthly: '',
                          vacancyRatePct: '5',
                          nonRecoverableChargesMonthly: '',
                          propertyTaxYearly: '',
                          insuranceYearly: '',
                          maintenanceReserveMonthly: '',
                          comment: ''
                        })
                      }}
                      className="flex-1 px-4 py-2.5 border border-[#30363D] text-[#E6EDF3] rounded-lg hover:bg-[#21262D] transition-colors font-medium"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={formLoading}
                      className={`flex-1 px-4 py-2.5 ${formData.category === 'Immobilier' ? 'bg-[#E67E22] hover:bg-[#D35400]' : 'bg-[#58A6FF] hover:bg-[#4A9EFF]'} text-white rounded-lg disabled:opacity-60 transition-colors font-medium`}
                    >
                      {formLoading ? 'Création...' : 'Créer'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Modal Création Immobilier - Supprimé, maintenant intégré dans le modal principal */}
        {false && createRealEstateModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setCreateRealEstateModalOpen(false)
              }
            }}
          >
            <div
              className="bg-[#161B22] border border-[#30363D] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-[#161B22] border-b border-[#30363D] p-6 flex items-center justify-between z-10">
                <h2 className="text-2xl font-bold text-[#E6EDF3] flex items-center gap-2">
                  <Home className="w-6 h-6 text-[#E67E22]" />
                  Nouvel Investissement Immobilier
                </h2>
                <button
                  onClick={() => setCreateRealEstateModalOpen(false)}
                  className="p-2 text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#21262D] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateRealEstate} className="p-6 space-y-6">
                {error && (
                  <div className="bg-[#E74C3C]/20 border border-[#E74C3C] rounded-lg p-4 text-[#E74C3C] text-sm">
                    {error}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Nom du bien *
                    </label>
                    <input
                      type="text"
                      value={realEstateFormData.name}
                      onChange={(e) => setRealEstateFormData({ ...realEstateFormData, name: e.target.value })}
                      placeholder="Ex: Studio à Lorient"
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Adresse
                    </label>
                    <input
                      type="text"
                      value={realEstateFormData.address}
                      onChange={(e) => setRealEstateFormData({ ...realEstateFormData, address: e.target.value })}
                      placeholder="123 Rue de la République, 56100 Lorient"
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Type de bien
                    </label>
                    <select
                      value={realEstateFormData.propertyType}
                      onChange={(e) => setRealEstateFormData({ ...realEstateFormData, propertyType: e.target.value })}
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                    >
                      <option value="">Sélectionner...</option>
                      <option value="Appartement">Appartement</option>
                      <option value="Maison">Maison</option>
                      <option value="Studio">Studio</option>
                      <option value="T2">T2</option>
                      <option value="T3">T3</option>
                      <option value="T4+">T4+</option>
                      <option value="Local commercial">Local commercial</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Date d'achat
                    </label>
                    <input
                      type="date"
                      value={realEstateFormData.purchaseDate}
                      onChange={(e) => setRealEstateFormData({ ...realEstateFormData, purchaseDate: e.target.value })}
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                    />
                  </div>

                  <div className="md:col-span-2 border-t border-[#30363D] pt-4">
                    <h3 className="text-lg font-semibold text-[#E6EDF3] mb-4">Coûts d'acquisition</h3>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Prix d'achat (€) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={realEstateFormData.purchasePrice}
                      onChange={(e) => setRealEstateFormData({ ...realEstateFormData, purchasePrice: e.target.value })}
                      placeholder="150000"
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Frais de notaire (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={realEstateFormData.notaryFees}
                      onChange={(e) => setRealEstateFormData({ ...realEstateFormData, notaryFees: e.target.value })}
                      placeholder="12000"
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Travaux initiaux (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={realEstateFormData.initialWorks}
                      onChange={(e) => setRealEstateFormData({ ...realEstateFormData, initialWorks: e.target.value })}
                      placeholder="5000"
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Apport initial (€) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={realEstateFormData.downPayment}
                      onChange={(e) => setRealEstateFormData({ ...realEstateFormData, downPayment: e.target.value })}
                      placeholder="30000"
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                      required
                    />
                  </div>

                  <div className="md:col-span-2 border-t border-[#30363D] pt-4">
                    <h3 className="text-lg font-semibold text-[#E6EDF3] mb-4">Prêt</h3>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Mensualité de crédit (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={realEstateFormData.loanMonthlyPayment}
                      onChange={(e) => setRealEstateFormData({ ...realEstateFormData, loanMonthlyPayment: e.target.value })}
                      placeholder="450"
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Assurance emprunteur mensuelle (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={realEstateFormData.loanInsuranceMonthly}
                      onChange={(e) => setRealEstateFormData({ ...realEstateFormData, loanInsuranceMonthly: e.target.value })}
                      placeholder="50"
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                    />
                  </div>

                  <div className="md:col-span-2 border-t border-[#30363D] pt-4">
                    <h3 className="text-lg font-semibold text-[#E6EDF3] mb-4">Revenus</h3>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Loyer mensuel (€) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={realEstateFormData.rentMonthly}
                      onChange={(e) => setRealEstateFormData({ ...realEstateFormData, rentMonthly: e.target.value })}
                      placeholder="650"
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Taux de vacance (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={realEstateFormData.vacancyRatePct}
                      onChange={(e) => setRealEstateFormData({ ...realEstateFormData, vacancyRatePct: e.target.value })}
                      placeholder="5"
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                    />
                  </div>

                  <div className="md:col-span-2 border-t border-[#30363D] pt-4">
                    <h3 className="text-lg font-semibold text-[#E6EDF3] mb-4">Charges</h3>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Charges non récupérables mensuelles (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={realEstateFormData.nonRecoverableChargesMonthly}
                      onChange={(e) => setRealEstateFormData({ ...realEstateFormData, nonRecoverableChargesMonthly: e.target.value })}
                      placeholder="50"
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Taxe foncière annuelle (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={realEstateFormData.propertyTaxYearly}
                      onChange={(e) => setRealEstateFormData({ ...realEstateFormData, propertyTaxYearly: e.target.value })}
                      placeholder="1200"
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Assurance PNO annuelle (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={realEstateFormData.insuranceYearly}
                      onChange={(e) => setRealEstateFormData({ ...realEstateFormData, insuranceYearly: e.target.value })}
                      placeholder="300"
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Réserve maintenance mensuelle (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={realEstateFormData.maintenanceReserveMonthly}
                      onChange={(e) => setRealEstateFormData({ ...realEstateFormData, maintenanceReserveMonthly: e.target.value })}
                      placeholder="100"
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Commentaire
                    </label>
                    <textarea
                      value={realEstateFormData.comment}
                      onChange={(e) => setRealEstateFormData({ ...realEstateFormData, comment: e.target.value })}
                      placeholder="Notes supplémentaires..."
                      rows={3}
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-[#30363D]">
                  <button
                    type="button"
                    onClick={() => setCreateRealEstateModalOpen(false)}
                    className="flex-1 px-4 py-2.5 border border-[#30363D] text-[#E6EDF3] rounded-lg hover:bg-[#21262D] transition-colors font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={realEstateFormLoading}
                    className="flex-1 px-4 py-2.5 bg-[#E67E22] text-white rounded-lg hover:bg-[#D35400] disabled:opacity-60 transition-colors font-medium"
                  >
                    {realEstateFormLoading ? 'Création...' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Édition Investissement */}
        {editModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setEditModalOpen(false)}
          >
            <div
              className="bg-[#161B22] border border-[#30363D] rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-[#161B22] border-b border-[#30363D] p-6 flex items-center justify-between z-10">
                <h2 className="text-2xl font-bold text-[#E6EDF3] flex items-center gap-2">
                  <Edit className="w-6 h-6 text-[#58A6FF]" />
                  Modifier l'Investissement
                </h2>
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="p-2 text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#21262D] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateInvestment} className="p-6 space-y-6">
                {error && (
                  <div className="bg-[#E74C3C]/20 border border-[#E74C3C] rounded-lg p-4 text-[#E74C3C] text-sm">
                    {error}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Nom de l'investissement *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Bitcoin, Apple Inc."
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Symbole (ex: BTCUSD, AAPL)
                    </label>
                    <input
                      type="text"
                      value={formData.symbol}
                      onChange={(e) => {
                        const symbol = e.target.value.toUpperCase()
                        const baseSymbol = symbol.split(/[\/\-]/)[0] || symbol.replace(/USD|EUR|GBP$/, '')
                        setFormData({
                          ...formData,
                          symbol,
                          baseSymbol: baseSymbol || formData.baseSymbol
                        })
                      }}
                      placeholder="BTCUSD, AAPL"
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Symbole de base (ex: BTC, ETH)
                    </label>
                    <input
                      type="text"
                      value={formData.baseSymbol}
                      onChange={(e) => setFormData({ ...formData, baseSymbol: e.target.value.toUpperCase() })}
                      placeholder="BTC"
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Devise de cotation *
                    </label>
                    <select
                      value={formData.quoteSymbol}
                      onChange={(e) => setFormData({ ...formData, quoteSymbol: e.target.value })}
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Catégorie *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                      required
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Plateforme
                    </label>
                    <input
                      type="text"
                      value={formData.platform}
                      onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                      placeholder="Binance, Degiro, etc."
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#58A6FF]"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-[#30363D]">
                  <button
                    type="button"
                    onClick={() => setEditModalOpen(false)}
                    className="flex-1 px-4 py-2.5 border border-[#30363D] text-[#E6EDF3] rounded-lg hover:bg-[#21262D] transition-colors font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex-1 px-4 py-2.5 bg-[#58A6FF] text-white rounded-lg hover:bg-[#4A9EFF] disabled:opacity-60 transition-colors font-medium"
                  >
                    {formLoading ? 'Modification...' : 'Modifier'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Édition Immobilier */}
        {editRealEstateModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setEditRealEstateModalOpen(false)
              }
            }}
          >
            <div
              className="bg-[#161B22] border border-[#30363D] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-[#161B22] border-b border-[#30363D] p-6 flex items-center justify-between z-10">
                <h2 className="text-2xl font-bold text-[#E6EDF3] flex items-center gap-2">
                  <Edit className="w-6 h-6 text-[#E67E22]" />
                  Modifier l'Investissement Immobilier
                </h2>
                <button
                  onClick={() => setEditRealEstateModalOpen(false)}
                  className="p-2 text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#21262D] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateRealEstate} className="p-6 space-y-6">
                {error && (
                  <div className="bg-[#E74C3C]/20 border border-[#E74C3C] rounded-lg p-4 text-[#E74C3C] text-sm">
                    {error}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Nom du bien *
                    </label>
                    <input
                      type="text"
                      value={realEstateFormData.name}
                      onChange={(e) => setRealEstateFormData({ ...realEstateFormData, name: e.target.value })}
                      placeholder="Ex: Studio à Lorient"
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Adresse
                    </label>
                    <input
                      type="text"
                      value={realEstateFormData.address}
                      onChange={(e) => setRealEstateFormData({ ...realEstateFormData, address: e.target.value })}
                      placeholder="123 Rue de la République, 56100 Lorient"
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Type de bien
                    </label>
                    <select
                      value={realEstateFormData.propertyType}
                      onChange={(e) => setRealEstateFormData({ ...realEstateFormData, propertyType: e.target.value })}
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                    >
                      <option value="">Sélectionner...</option>
                      <option value="Appartement">Appartement</option>
                      <option value="Maison">Maison</option>
                      <option value="Studio">Studio</option>
                      <option value="T2">T2</option>
                      <option value="T3">T3</option>
                      <option value="T4+">T4+</option>
                      <option value="Local commercial">Local commercial</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Date d'achat
                    </label>
                    <input
                      type="date"
                      value={realEstateFormData.purchaseDate}
                      onChange={(e) => setRealEstateFormData({ ...realEstateFormData, purchaseDate: e.target.value })}
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                    />
                  </div>

                  <div className="md:col-span-2 border-t border-[#30363D] pt-4">
                    <h3 className="text-lg font-semibold text-[#E6EDF3] mb-4">Coûts d'acquisition</h3>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Prix d'achat (€) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={realEstateFormData.purchasePrice}
                      onChange={(e) => setRealEstateFormData({ ...realEstateFormData, purchasePrice: e.target.value })}
                      placeholder="150000"
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Frais de notaire (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={realEstateFormData.notaryFees}
                      onChange={(e) => setRealEstateFormData({ ...realEstateFormData, notaryFees: e.target.value })}
                      placeholder="12000"
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Travaux initiaux (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={realEstateFormData.initialWorks}
                      onChange={(e) => setRealEstateFormData({ ...realEstateFormData, initialWorks: e.target.value })}
                      placeholder="5000"
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Apport initial (€) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={realEstateFormData.downPayment}
                      onChange={(e) => setRealEstateFormData({ ...realEstateFormData, downPayment: e.target.value })}
                      placeholder="30000"
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                      required
                    />
                  </div>

                  <div className="md:col-span-2 border-t border-[#30363D] pt-4">
                    <h3 className="text-lg font-semibold text-[#E6EDF3] mb-4">Prêt</h3>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Mensualité de crédit (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={realEstateFormData.loanMonthlyPayment}
                      onChange={(e) => setRealEstateFormData({ ...realEstateFormData, loanMonthlyPayment: e.target.value })}
                      placeholder="450"
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Assurance emprunteur mensuelle (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={realEstateFormData.loanInsuranceMonthly}
                      onChange={(e) => setRealEstateFormData({ ...realEstateFormData, loanInsuranceMonthly: e.target.value })}
                      placeholder="50"
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                    />
                  </div>

                  <div className="md:col-span-2 border-t border-[#30363D] pt-4">
                    <h3 className="text-lg font-semibold text-[#E6EDF3] mb-4">Revenus</h3>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Loyer mensuel (€) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={realEstateFormData.rentMonthly}
                      onChange={(e) => setRealEstateFormData({ ...realEstateFormData, rentMonthly: e.target.value })}
                      placeholder="650"
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Taux de vacance (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={realEstateFormData.vacancyRatePct}
                      onChange={(e) => setRealEstateFormData({ ...realEstateFormData, vacancyRatePct: e.target.value })}
                      placeholder="5"
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                    />
                  </div>

                  <div className="md:col-span-2 border-t border-[#30363D] pt-4">
                    <h3 className="text-lg font-semibold text-[#E6EDF3] mb-4">Charges</h3>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Charges non récupérables mensuelles (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={realEstateFormData.nonRecoverableChargesMonthly}
                      onChange={(e) => setRealEstateFormData({ ...realEstateFormData, nonRecoverableChargesMonthly: e.target.value })}
                      placeholder="50"
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Taxe foncière annuelle (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={realEstateFormData.propertyTaxYearly}
                      onChange={(e) => setRealEstateFormData({ ...realEstateFormData, propertyTaxYearly: e.target.value })}
                      placeholder="1200"
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Assurance PNO annuelle (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={realEstateFormData.insuranceYearly}
                      onChange={(e) => setRealEstateFormData({ ...realEstateFormData, insuranceYearly: e.target.value })}
                      placeholder="300"
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Réserve maintenance mensuelle (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={realEstateFormData.maintenanceReserveMonthly}
                      onChange={(e) => setRealEstateFormData({ ...realEstateFormData, maintenanceReserveMonthly: e.target.value })}
                      placeholder="100"
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-[#E6EDF3] mb-2">
                      Commentaire
                    </label>
                    <textarea
                      value={realEstateFormData.comment}
                      onChange={(e) => setRealEstateFormData({ ...realEstateFormData, comment: e.target.value })}
                      placeholder="Notes supplémentaires..."
                      rows={3}
                      className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-[#30363D]">
                  <button
                    type="button"
                    onClick={() => setEditRealEstateModalOpen(false)}
                    className="flex-1 px-4 py-2.5 border border-[#30363D] text-[#E6EDF3] rounded-lg hover:bg-[#21262D] transition-colors font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={realEstateFormLoading}
                    className="flex-1 px-4 py-2.5 bg-[#E67E22] text-white rounded-lg hover:bg-[#D35400] disabled:opacity-60 transition-colors font-medium"
                  >
                    {realEstateFormLoading ? 'Modification...' : 'Modifier'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
