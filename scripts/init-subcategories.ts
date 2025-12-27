import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Initialisation des sous-catégories...')

  // Récupérer les catégories existantes
  const categories = await prisma.category.findMany()

  const subCategoriesData = [
    // Alimentation
    { categoryName: 'Alimentation', name: 'Supermarché' },
    { categoryName: 'Alimentation', name: 'Restaurant' },
    { categoryName: 'Alimentation', name: 'Livraison' },
    { categoryName: 'Alimentation', name: 'Café / Bar' },
    
    // Transport
    { categoryName: 'Transport', name: 'Essence' },
    { categoryName: 'Transport', name: 'Parking' },
    { categoryName: 'Transport', name: 'Transport en commun' },
    { categoryName: 'Transport', name: 'Taxi / VTC' },
    { categoryName: 'Transport', name: 'Entretien véhicule' },
    
    // Logement
    { categoryName: 'Logement', name: 'Loyer' },
    { categoryName: 'Logement', name: 'Charges' },
    { categoryName: 'Logement', name: 'Travaux' },
    { categoryName: 'Logement', name: 'Ameublement' },
    
    // Loisirs
    { categoryName: 'Loisirs', name: 'Cinéma' },
    { categoryName: 'Loisirs', name: 'Spectacle' },
    { categoryName: 'Loisirs', name: 'Sport' },
    { categoryName: 'Loisirs', name: 'Jeux vidéo' },
    { categoryName: 'Loisirs', name: 'Livres' },
    
    // Santé
    { categoryName: 'Santé', name: 'Médecin' },
    { categoryName: 'Santé', name: 'Pharmacie' },
    { categoryName: 'Santé', name: 'Dentiste' },
    { categoryName: 'Santé', name: 'Optique' },
    
    // Shopping
    { categoryName: 'Shopping', name: 'Vêtements' },
    { categoryName: 'Shopping', name: 'Électronique' },
    { categoryName: 'Shopping', name: 'Maison / Déco' },
    
    // Abonnements
    { categoryName: 'Abonnements', name: 'Téléphone' },
    { categoryName: 'Abonnements', name: 'Internet' },
    { categoryName: 'Abonnements', name: 'Streaming' },
    { categoryName: 'Abonnements', name: 'Presse' },
    
    // Énergie
    { categoryName: 'Énergie', name: 'Électricité' },
    { categoryName: 'Énergie', name: 'Gaz' },
    { categoryName: 'Énergie', name: 'Eau' },
    
    // Assurances
    { categoryName: 'Assurances', name: 'Habitation' },
    { categoryName: 'Assurances', name: 'Auto' },
    { categoryName: 'Assurances', name: 'Santé' },
    
    // Voyages
    { categoryName: 'Voyages', name: 'Hébergement' },
    { categoryName: 'Voyages', name: 'Transport' },
    { categoryName: 'Voyages', name: 'Restauration' },
    { categoryName: 'Voyages', name: 'Activités' },
  ]

  let created = 0
  let skipped = 0

  for (const subCatData of subCategoriesData) {
    const category = categories.find(c => c.name === subCatData.categoryName)
    if (!category) {
      console.warn(`Catégorie "${subCatData.categoryName}" non trouvée, sous-catégorie "${subCatData.name}" ignorée`)
      skipped++
      continue
    }

    try {
      await prisma.subCategory.upsert({
        where: {
          categoryId_name: {
            categoryId: category.id,
            name: subCatData.name,
          },
        },
        update: {},
        create: {
          name: subCatData.name,
          categoryId: category.id,
        },
      })
      created++
    } catch (error) {
      console.error(`Erreur lors de la création de "${subCatData.name}" pour "${subCatData.categoryName}":`, error)
      skipped++
    }
  }

  console.log(`✅ ${created} sous-catégories créées`)
  if (skipped > 0) {
    console.log(`⚠️  ${skipped} sous-catégories ignorées`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })








const prisma = new PrismaClient()

async function main() {
  console.log('Initialisation des sous-catégories...')

  // Récupérer les catégories existantes
  const categories = await prisma.category.findMany()

  const subCategoriesData = [
    // Alimentation
    { categoryName: 'Alimentation', name: 'Supermarché' },
    { categoryName: 'Alimentation', name: 'Restaurant' },
    { categoryName: 'Alimentation', name: 'Livraison' },
    { categoryName: 'Alimentation', name: 'Café / Bar' },
    
    // Transport
    { categoryName: 'Transport', name: 'Essence' },
    { categoryName: 'Transport', name: 'Parking' },
    { categoryName: 'Transport', name: 'Transport en commun' },
    { categoryName: 'Transport', name: 'Taxi / VTC' },
    { categoryName: 'Transport', name: 'Entretien véhicule' },
    
    // Logement
    { categoryName: 'Logement', name: 'Loyer' },
    { categoryName: 'Logement', name: 'Charges' },
    { categoryName: 'Logement', name: 'Travaux' },
    { categoryName: 'Logement', name: 'Ameublement' },
    
    // Loisirs
    { categoryName: 'Loisirs', name: 'Cinéma' },
    { categoryName: 'Loisirs', name: 'Spectacle' },
    { categoryName: 'Loisirs', name: 'Sport' },
    { categoryName: 'Loisirs', name: 'Jeux vidéo' },
    { categoryName: 'Loisirs', name: 'Livres' },
    
    // Santé
    { categoryName: 'Santé', name: 'Médecin' },
    { categoryName: 'Santé', name: 'Pharmacie' },
    { categoryName: 'Santé', name: 'Dentiste' },
    { categoryName: 'Santé', name: 'Optique' },
    
    // Shopping
    { categoryName: 'Shopping', name: 'Vêtements' },
    { categoryName: 'Shopping', name: 'Électronique' },
    { categoryName: 'Shopping', name: 'Maison / Déco' },
    
    // Abonnements
    { categoryName: 'Abonnements', name: 'Téléphone' },
    { categoryName: 'Abonnements', name: 'Internet' },
    { categoryName: 'Abonnements', name: 'Streaming' },
    { categoryName: 'Abonnements', name: 'Presse' },
    
    // Énergie
    { categoryName: 'Énergie', name: 'Électricité' },
    { categoryName: 'Énergie', name: 'Gaz' },
    { categoryName: 'Énergie', name: 'Eau' },
    
    // Assurances
    { categoryName: 'Assurances', name: 'Habitation' },
    { categoryName: 'Assurances', name: 'Auto' },
    { categoryName: 'Assurances', name: 'Santé' },
    
    // Voyages
    { categoryName: 'Voyages', name: 'Hébergement' },
    { categoryName: 'Voyages', name: 'Transport' },
    { categoryName: 'Voyages', name: 'Restauration' },
    { categoryName: 'Voyages', name: 'Activités' },
  ]

  let created = 0
  let skipped = 0

  for (const subCatData of subCategoriesData) {
    const category = categories.find(c => c.name === subCatData.categoryName)
    if (!category) {
      console.warn(`Catégorie "${subCatData.categoryName}" non trouvée, sous-catégorie "${subCatData.name}" ignorée`)
      skipped++
      continue
    }

    try {
      await prisma.subCategory.upsert({
        where: {
          categoryId_name: {
            categoryId: category.id,
            name: subCatData.name,
          },
        },
        update: {},
        create: {
          name: subCatData.name,
          categoryId: category.id,
        },
      })
      created++
    } catch (error) {
      console.error(`Erreur lors de la création de "${subCatData.name}" pour "${subCatData.categoryName}":`, error)
      skipped++
    }
  }

  console.log(`✅ ${created} sous-catégories créées`)
  if (skipped > 0) {
    console.log(`⚠️  ${skipped} sous-catégories ignorées`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })













