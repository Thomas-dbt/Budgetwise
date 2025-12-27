import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'

export async function GET(req: Request) {
  try {
    const userId = await getCurrentUserId()

    const realEstates = await prisma.realEstateInvestment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(realEstates)
  } catch (error: any) {
    console.error('Real Estate GET error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: 'Erreur lors du chargement des investissements immobiliers' },
      { status }
    )
  }
}

export async function POST(req: Request) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/real-estate/route.ts:25',message:'POST entry',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/real-estate/route.ts:27',message:'Before getCurrentUserId',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    const userId = await getCurrentUserId()
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/real-estate/route.ts:30',message:'After getCurrentUserId',data:{userId:userId||'null'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    const body = await req.json()
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/real-estate/route.ts:31',message:'Body received',data:{bodyKeys:Object.keys(body),name:body.name,purchasePrice:body.purchasePrice,downPayment:body.downPayment,rentMonthly:body.rentMonthly},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    const {
      name,
      address,
      propertyType,
      purchaseDate,
      purchasePrice,
      notaryFees,
      initialWorks,
      downPayment,
      loanMonthlyPayment,
      loanInsuranceMonthly,
      rentMonthly,
      vacancyRatePct,
      nonRecoverableChargesMonthly,
      propertyTaxYearly,
      insuranceYearly,
      maintenanceReserveMonthly,
      comment
    } = body

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/real-estate/route.ts:50',message:'Before validation',data:{name:!!name,purchasePrice:!!purchasePrice,downPayment:!!downPayment,rentMonthly:!!rentMonthly},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    if (!name || !purchasePrice || !downPayment || !rentMonthly) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/real-estate/route.ts:51',message:'Validation failed',data:{name:!!name,purchasePrice:!!purchasePrice,downPayment:!!downPayment,rentMonthly:!!rentMonthly},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      return NextResponse.json(
        { error: 'Champs obligatoires manquants (name, purchasePrice, downPayment, rentMonthly)' },
        { status: 400 }
      )
    }

    // #region agent log
    const numPurchasePrice = Number(purchasePrice);
    const numDownPayment = Number(downPayment);
    const numRentMonthly = Number(rentMonthly);
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/real-estate/route.ts:57',message:'After Number conversions',data:{purchasePrice:numPurchasePrice,downPayment:numDownPayment,rentMonthly:numRentMonthly,isNaN_purchasePrice:isNaN(numPurchasePrice),isNaN_downPayment:isNaN(numDownPayment),isNaN_rentMonthly:isNaN(numRentMonthly)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    const createData = {
      userId,
      name,
      address: address || null,
      propertyType: propertyType || null,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      purchasePrice: numPurchasePrice,
      notaryFees: Number(notaryFees || 0),
      initialWorks: Number(initialWorks || 0),
      downPayment: numDownPayment,
      loanMonthlyPayment: Number(loanMonthlyPayment || 0),
      loanInsuranceMonthly: Number(loanInsuranceMonthly || 0),
      rentMonthly: numRentMonthly,
      vacancyRatePct: Number(vacancyRatePct || 5),
      nonRecoverableChargesMonthly: Number(nonRecoverableChargesMonthly || 0),
      propertyTaxYearly: Number(propertyTaxYearly || 0),
      insuranceYearly: Number(insuranceYearly || 0),
      maintenanceReserveMonthly: maintenanceReserveMonthly
        ? Number(maintenanceReserveMonthly)
        : null,
      comment: comment || null
    }
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/real-estate/route.ts:80',message:'Before Prisma.create',data:{dataKeys:Object.keys(createData),userId:createData.userId||'null',hasRealEstateInvestment:!!prisma.realEstateInvestment,prismaKeys:Object.keys(prisma).slice(0,10)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (!prisma.realEstateInvestment) {
      throw new Error('RealEstateInvestment model not found in Prisma client. Please run: npx prisma generate')
    }

    const realEstate = await prisma.realEstateInvestment.create({
      data: createData
    })
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/real-estate/route.ts:82',message:'After Prisma.create success',data:{id:realEstate.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    return NextResponse.json(realEstate, { status: 201 })
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/real-estate/route.ts:84',message:'Error caught',data:{errorMessage:error?.message,errorName:error?.name,errorCode:error?.code,errorStack:error?.stack?.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    console.error('Real Estate POST error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: `Erreur lors de la création de l'investissement immobilier: ${error?.message || error?.toString()}` },
      { status }
    )
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
    }

    // Vérifier que l'investissement appartient à l'utilisateur
    const existing = await prisma.realEstateInvestment.findUnique({
      where: { id }
    })

    if (!existing || existing.userId !== userId) {
      return NextResponse.json(
        { error: 'Investissement immobilier introuvable' },
        { status: 404 }
      )
    }

    // Préparer les données de mise à jour
    const data: any = {}
    if (updateData.name !== undefined) data.name = updateData.name
    if (updateData.address !== undefined) data.address = updateData.address || null
    if (updateData.propertyType !== undefined) data.propertyType = updateData.propertyType || null
    if (updateData.purchaseDate !== undefined) data.purchaseDate = updateData.purchaseDate ? new Date(updateData.purchaseDate) : null
    if (updateData.purchasePrice !== undefined) data.purchasePrice = Number(updateData.purchasePrice)
    if (updateData.notaryFees !== undefined) data.notaryFees = Number(updateData.notaryFees || 0)
    if (updateData.initialWorks !== undefined) data.initialWorks = Number(updateData.initialWorks || 0)
    if (updateData.downPayment !== undefined) data.downPayment = Number(updateData.downPayment)
    if (updateData.loanMonthlyPayment !== undefined) data.loanMonthlyPayment = Number(updateData.loanMonthlyPayment || 0)
    if (updateData.loanInsuranceMonthly !== undefined) data.loanInsuranceMonthly = Number(updateData.loanInsuranceMonthly || 0)
    if (updateData.rentMonthly !== undefined) data.rentMonthly = Number(updateData.rentMonthly)
    if (updateData.vacancyRatePct !== undefined) data.vacancyRatePct = Number(updateData.vacancyRatePct || 5)
    if (updateData.nonRecoverableChargesMonthly !== undefined) data.nonRecoverableChargesMonthly = Number(updateData.nonRecoverableChargesMonthly || 0)
    if (updateData.propertyTaxYearly !== undefined) data.propertyTaxYearly = Number(updateData.propertyTaxYearly || 0)
    if (updateData.insuranceYearly !== undefined) data.insuranceYearly = Number(updateData.insuranceYearly || 0)
    if (updateData.maintenanceReserveMonthly !== undefined) data.maintenanceReserveMonthly = updateData.maintenanceReserveMonthly ? Number(updateData.maintenanceReserveMonthly) : null
    if (updateData.comment !== undefined) data.comment = updateData.comment || null

    const realEstate = await prisma.realEstateInvestment.update({
      where: { id },
      data
    })

    return NextResponse.json(realEstate)
  } catch (error: any) {
    console.error('Real Estate PATCH error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'investissement immobilier' },
      { status }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
    }

    // Vérifier que l'investissement appartient à l'utilisateur
    const existing = await prisma.realEstateInvestment.findUnique({
      where: { id }
    })

    if (!existing || existing.userId !== userId) {
      return NextResponse.json(
        { error: 'Investissement immobilier introuvable' },
        { status: 404 }
      )
    }

    await prisma.realEstateInvestment.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Real Estate DELETE error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'investissement immobilier' },
      { status }
    )
  }
}


import { getCurrentUserId } from '@/lib/server-auth'

export async function GET(req: Request) {
  try {
    const userId = await getCurrentUserId()

    const realEstates = await prisma.realEstateInvestment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(realEstates)
  } catch (error: any) {
    console.error('Real Estate GET error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: 'Erreur lors du chargement des investissements immobiliers' },
      { status }
    )
  }
}

export async function POST(req: Request) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/real-estate/route.ts:25',message:'POST entry',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/real-estate/route.ts:27',message:'Before getCurrentUserId',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    const userId = await getCurrentUserId()
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/real-estate/route.ts:30',message:'After getCurrentUserId',data:{userId:userId||'null'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    const body = await req.json()
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/real-estate/route.ts:31',message:'Body received',data:{bodyKeys:Object.keys(body),name:body.name,purchasePrice:body.purchasePrice,downPayment:body.downPayment,rentMonthly:body.rentMonthly},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    const {
      name,
      address,
      propertyType,
      purchaseDate,
      purchasePrice,
      notaryFees,
      initialWorks,
      downPayment,
      loanMonthlyPayment,
      loanInsuranceMonthly,
      rentMonthly,
      vacancyRatePct,
      nonRecoverableChargesMonthly,
      propertyTaxYearly,
      insuranceYearly,
      maintenanceReserveMonthly,
      comment
    } = body

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/real-estate/route.ts:50',message:'Before validation',data:{name:!!name,purchasePrice:!!purchasePrice,downPayment:!!downPayment,rentMonthly:!!rentMonthly},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    if (!name || !purchasePrice || !downPayment || !rentMonthly) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/real-estate/route.ts:51',message:'Validation failed',data:{name:!!name,purchasePrice:!!purchasePrice,downPayment:!!downPayment,rentMonthly:!!rentMonthly},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      return NextResponse.json(
        { error: 'Champs obligatoires manquants (name, purchasePrice, downPayment, rentMonthly)' },
        { status: 400 }
      )
    }

    // #region agent log
    const numPurchasePrice = Number(purchasePrice);
    const numDownPayment = Number(downPayment);
    const numRentMonthly = Number(rentMonthly);
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/real-estate/route.ts:57',message:'After Number conversions',data:{purchasePrice:numPurchasePrice,downPayment:numDownPayment,rentMonthly:numRentMonthly,isNaN_purchasePrice:isNaN(numPurchasePrice),isNaN_downPayment:isNaN(numDownPayment),isNaN_rentMonthly:isNaN(numRentMonthly)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    const createData = {
      userId,
      name,
      address: address || null,
      propertyType: propertyType || null,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      purchasePrice: numPurchasePrice,
      notaryFees: Number(notaryFees || 0),
      initialWorks: Number(initialWorks || 0),
      downPayment: numDownPayment,
      loanMonthlyPayment: Number(loanMonthlyPayment || 0),
      loanInsuranceMonthly: Number(loanInsuranceMonthly || 0),
      rentMonthly: numRentMonthly,
      vacancyRatePct: Number(vacancyRatePct || 5),
      nonRecoverableChargesMonthly: Number(nonRecoverableChargesMonthly || 0),
      propertyTaxYearly: Number(propertyTaxYearly || 0),
      insuranceYearly: Number(insuranceYearly || 0),
      maintenanceReserveMonthly: maintenanceReserveMonthly
        ? Number(maintenanceReserveMonthly)
        : null,
      comment: comment || null
    }
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/real-estate/route.ts:80',message:'Before Prisma.create',data:{dataKeys:Object.keys(createData),userId:createData.userId||'null',hasRealEstateInvestment:!!prisma.realEstateInvestment,prismaKeys:Object.keys(prisma).slice(0,10)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (!prisma.realEstateInvestment) {
      throw new Error('RealEstateInvestment model not found in Prisma client. Please run: npx prisma generate')
    }

    const realEstate = await prisma.realEstateInvestment.create({
      data: createData
    })
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/real-estate/route.ts:82',message:'After Prisma.create success',data:{id:realEstate.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    return NextResponse.json(realEstate, { status: 201 })
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/real-estate/route.ts:84',message:'Error caught',data:{errorMessage:error?.message,errorName:error?.name,errorCode:error?.code,errorStack:error?.stack?.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    console.error('Real Estate POST error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: `Erreur lors de la création de l'investissement immobilier: ${error?.message || error?.toString()}` },
      { status }
    )
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
    }

    // Vérifier que l'investissement appartient à l'utilisateur
    const existing = await prisma.realEstateInvestment.findUnique({
      where: { id }
    })

    if (!existing || existing.userId !== userId) {
      return NextResponse.json(
        { error: 'Investissement immobilier introuvable' },
        { status: 404 }
      )
    }

    // Préparer les données de mise à jour
    const data: any = {}
    if (updateData.name !== undefined) data.name = updateData.name
    if (updateData.address !== undefined) data.address = updateData.address || null
    if (updateData.propertyType !== undefined) data.propertyType = updateData.propertyType || null
    if (updateData.purchaseDate !== undefined) data.purchaseDate = updateData.purchaseDate ? new Date(updateData.purchaseDate) : null
    if (updateData.purchasePrice !== undefined) data.purchasePrice = Number(updateData.purchasePrice)
    if (updateData.notaryFees !== undefined) data.notaryFees = Number(updateData.notaryFees || 0)
    if (updateData.initialWorks !== undefined) data.initialWorks = Number(updateData.initialWorks || 0)
    if (updateData.downPayment !== undefined) data.downPayment = Number(updateData.downPayment)
    if (updateData.loanMonthlyPayment !== undefined) data.loanMonthlyPayment = Number(updateData.loanMonthlyPayment || 0)
    if (updateData.loanInsuranceMonthly !== undefined) data.loanInsuranceMonthly = Number(updateData.loanInsuranceMonthly || 0)
    if (updateData.rentMonthly !== undefined) data.rentMonthly = Number(updateData.rentMonthly)
    if (updateData.vacancyRatePct !== undefined) data.vacancyRatePct = Number(updateData.vacancyRatePct || 5)
    if (updateData.nonRecoverableChargesMonthly !== undefined) data.nonRecoverableChargesMonthly = Number(updateData.nonRecoverableChargesMonthly || 0)
    if (updateData.propertyTaxYearly !== undefined) data.propertyTaxYearly = Number(updateData.propertyTaxYearly || 0)
    if (updateData.insuranceYearly !== undefined) data.insuranceYearly = Number(updateData.insuranceYearly || 0)
    if (updateData.maintenanceReserveMonthly !== undefined) data.maintenanceReserveMonthly = updateData.maintenanceReserveMonthly ? Number(updateData.maintenanceReserveMonthly) : null
    if (updateData.comment !== undefined) data.comment = updateData.comment || null

    const realEstate = await prisma.realEstateInvestment.update({
      where: { id },
      data
    })

    return NextResponse.json(realEstate)
  } catch (error: any) {
    console.error('Real Estate PATCH error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'investissement immobilier' },
      { status }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
    }

    // Vérifier que l'investissement appartient à l'utilisateur
    const existing = await prisma.realEstateInvestment.findUnique({
      where: { id }
    })

    if (!existing || existing.userId !== userId) {
      return NextResponse.json(
        { error: 'Investissement immobilier introuvable' },
        { status: 404 }
      )
    }

    await prisma.realEstateInvestment.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Real Estate DELETE error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'investissement immobilier' },
      { status }
    )
  }
}

