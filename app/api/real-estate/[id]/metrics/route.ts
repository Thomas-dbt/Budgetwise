import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'
import { computeRealEstateMetrics } from '@/lib/real-estate-metrics'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId()
    const realEstateId = params.id

    // Vérifier que l'investissement immobilier appartient à l'utilisateur
    const realEstate = await prisma.realEstateInvestment.findUnique({
      where: { id: realEstateId }
    })

    if (!realEstate || realEstate.userId !== userId) {
      return NextResponse.json(
        { error: 'Investissement immobilier introuvable' },
        { status: 404 }
      )
    }

    // Calculer les métriques
    const metrics = computeRealEstateMetrics({
      purchasePrice: Number(realEstate.purchasePrice),
      notaryFees: Number(realEstate.notaryFees),
      initialWorks: Number(realEstate.initialWorks),
      downPayment: Number(realEstate.downPayment),
      loanMonthlyPayment: Number(realEstate.loanMonthlyPayment),
      loanInsuranceMonthly: Number(realEstate.loanInsuranceMonthly),
      rentMonthly: Number(realEstate.rentMonthly),
      vacancyRatePct: Number(realEstate.vacancyRatePct),
      nonRecoverableChargesMonthly: Number(realEstate.nonRecoverableChargesMonthly),
      propertyTaxYearly: Number(realEstate.propertyTaxYearly),
      insuranceYearly: Number(realEstate.insuranceYearly),
      maintenanceReserveMonthly: realEstate.maintenanceReserveMonthly
        ? Number(realEstate.maintenanceReserveMonthly)
        : null
    })

    return NextResponse.json({
      investmentId: realEstate.id,
      investmentName: realEstate.name,
      ...metrics
    })
  } catch (error: any) {
    console.error('Real Estate Metrics API error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: 'Erreur lors du calcul des métriques' },
      { status }
    )
  }
}



import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'
import { computeRealEstateMetrics } from '@/lib/real-estate-metrics'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId()
    const realEstateId = params.id

    // Vérifier que l'investissement immobilier appartient à l'utilisateur
    const realEstate = await prisma.realEstateInvestment.findUnique({
      where: { id: realEstateId }
    })

    if (!realEstate || realEstate.userId !== userId) {
      return NextResponse.json(
        { error: 'Investissement immobilier introuvable' },
        { status: 404 }
      )
    }

    // Calculer les métriques
    const metrics = computeRealEstateMetrics({
      purchasePrice: Number(realEstate.purchasePrice),
      notaryFees: Number(realEstate.notaryFees),
      initialWorks: Number(realEstate.initialWorks),
      downPayment: Number(realEstate.downPayment),
      loanMonthlyPayment: Number(realEstate.loanMonthlyPayment),
      loanInsuranceMonthly: Number(realEstate.loanInsuranceMonthly),
      rentMonthly: Number(realEstate.rentMonthly),
      vacancyRatePct: Number(realEstate.vacancyRatePct),
      nonRecoverableChargesMonthly: Number(realEstate.nonRecoverableChargesMonthly),
      propertyTaxYearly: Number(realEstate.propertyTaxYearly),
      insuranceYearly: Number(realEstate.insuranceYearly),
      maintenanceReserveMonthly: realEstate.maintenanceReserveMonthly
        ? Number(realEstate.maintenanceReserveMonthly)
        : null
    })

    return NextResponse.json({
      investmentId: realEstate.id,
      investmentName: realEstate.name,
      ...metrics
    })
  } catch (error: any) {
    console.error('Real Estate Metrics API error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: 'Erreur lors du calcul des métriques' },
      { status }
    )
  }
}









