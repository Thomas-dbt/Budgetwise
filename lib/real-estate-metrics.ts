/**
 * Service pour calculer les métriques d'investissement immobilier
 */

interface RealEstateData {
  purchasePrice: number
  notaryFees: number
  initialWorks: number
  downPayment: number
  loanMonthlyPayment: number
  loanInsuranceMonthly: number
  rentMonthly: number
  vacancyRatePct: number
  nonRecoverableChargesMonthly: number
  propertyTaxYearly: number
  insuranceYearly: number
  maintenanceReserveMonthly?: number | null
}

interface RealEstateMetrics {
  cashflowNet: number
  cashInitial: number
  paybackMonths: number | null
  paybackYears: number | null
  cumulativeSeries: Array<{ month: number; cumulative: number }>
}

/**
 * Calcule les métriques d'un investissement immobilier
 */
export function computeRealEstateMetrics(
  data: RealEstateData
): RealEstateMetrics {
  // Calcul du loyer net (après vacance)
  const netRent = data.rentMonthly * (1 - data.vacancyRatePct / 100)

  // Calcul des coûts mensuels
  const monthlyCosts =
    data.loanMonthlyPayment +
    data.loanInsuranceMonthly +
    data.nonRecoverableChargesMonthly +
    data.propertyTaxYearly / 12 +
    data.insuranceYearly / 12 +
    (data.maintenanceReserveMonthly || 0)

  // Cashflow net mensuel
  const cashflowNet = netRent - monthlyCosts

  // Cash investi initial
  const cashInitial =
    data.downPayment + data.notaryFees + data.initialWorks

  // Calcul du payback
  let paybackMonths: number | null = null
  let paybackYears: number | null = null

  if (cashflowNet > 0) {
    paybackMonths = cashInitial / cashflowNet
    paybackYears = paybackMonths / 12
  }

  // Générer la série cumulative sur 30 ans (360 mois)
  const cumulativeSeries: Array<{ month: number; cumulative: number }> = []
  let cumulative = -cashInitial // Commence négatif (cash investi)

  for (let month = 0; month <= 360; month++) {
    if (month > 0) {
      cumulative += cashflowNet
    }
    cumulativeSeries.push({
      month,
      cumulative: Math.round(cumulative * 100) / 100 // Arrondir à 2 décimales
    })
  }

  return {
    cashflowNet: Math.round(cashflowNet * 100) / 100,
    cashInitial: Math.round(cashInitial * 100) / 100,
    paybackMonths: paybackMonths ? Math.round(paybackMonths * 100) / 100 : null,
    paybackYears: paybackYears ? Math.round(paybackYears * 100) / 100 : null,
    cumulativeSeries
  }
}







