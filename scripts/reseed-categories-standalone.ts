export { }
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const defaultCategories = [
    {
        name: 'Alimentation',
        emoji: '🍎',
        subCategories: [
            { name: 'Courses', keywords: ['Carrefour', 'Carrefour Market', 'Carrefour City', 'Leclerc', 'E.Leclerc', 'Auchan', 'Intermarche', 'Lidl', 'Aldi', 'Monoprix', 'Franprix', 'Super U', 'Hyper U', 'U Express', 'Systeme U', 'Casino Supermarche', 'Cora', 'Picard', 'Grand Frais', 'Bio c Bon', 'Naturalia', 'La Vie Claire', 'Superette', 'Supérette', 'Epicerie', 'Epicerie Fine', 'Spar', 'Vival', 'Coccinelle', 'G20', 'Leader Price', 'Netto', 'Promocash', 'Metro'] },
            { name: 'Restaurant/Fast Food', keywords: ['Restaurant', 'Resto', 'Brasserie', 'Bistrot', 'Snack', 'Sandwich', 'Tacos', 'Kebab', 'Burger', 'Pizzeria', 'Sushi', 'Wok', 'Poke', 'Creperie', 'Cantine', 'McDonald', 'Burger King', 'KFC', 'Quick', 'Subway', 'Dominos', 'Pizza Hut', 'O Tacos', 'Five Guys', 'Big Fernand', 'Pret A Manger', 'EXKI', 'Flunch', 'Buffalo Grill', 'Hippopotamus', 'Del Arte'] },
            { name: 'Livraison', keywords: ['Uber Eats', 'UberEats', 'Deliveroo', 'Just Eat', 'JustEat', 'Foodora', 'Frichti', 'Glovo'] },
            { name: 'Boulangerie', keywords: ['Boulangerie', 'Boulanger', 'Patisserie', 'Viennoiserie', 'Pain', 'Baguette', 'Paul', 'Brioche', 'Marie Blachere', 'La Mie Caline', 'Feuillette', 'Ange', 'Maison Kayser'] }
        ]
    },
    {
        name: 'Logement',
        emoji: '🏠',
        subCategories: [
            { name: 'Loyer/Prêt', keywords: ['Loyer', 'Bail', 'Location', 'Gestion locative', 'Foncia', 'Nexity', 'Citya', 'Square Habitat', 'Orpi', 'Credit immo', 'Echeance pret', 'Mensualite', 'Pret immobilier'] },
            { name: 'Charges', keywords: ['Syndic', 'Charges copro', 'Copropriete', 'ASL', 'Ordures menageres'] },
            { name: 'Assurance habitation', keywords: ['Assurance habitation', 'MRH', 'MAIF', 'Allianz', 'AXA', 'GMF', 'Matmut', 'Macif', 'Groupama', 'Generali', 'Pacifica'] },
            { name: 'Taxe foncière', keywords: ['DGFIP', 'Impots', 'Taxe fonciere', 'Tresor Public'] },
            { name: 'Entretien', keywords: ['Leroy Merlin', 'Castorama', 'Bricorama', 'Brico Depot', 'Mr Bricolage', 'Bricomarche', 'Weldom', 'ManoMano', 'IKEA', 'Action', 'Gamm Vert', 'Jardiland', 'Point P', 'Cedeo', 'Rexel'] },
            { name: 'Meubles/Déco', keywords: ['Maison du Monde', 'Zara Home', 'Alinea', 'Habitat', 'Conforama', 'But', 'IKEA', 'Gifi', 'Centrakor', 'Hema', 'La Redoute', 'Camif'] }
        ]
    },
    {
        name: 'Transport',
        emoji: '🚗',
        subCategories: [
            { name: 'Carburant', keywords: ['Total', 'Total Energies', 'Shell', 'BP', 'Esso', 'Avia', 'Carrefour Energie', 'Leclerc Energie', 'Essence', 'Diesel', 'Gazole'] },
            { name: 'Transport en commun', keywords: ['SNCF', 'SNCF Connect', 'OuiGo', 'Trainline', 'RATP', 'Navigo', 'Metro', 'Bus', 'Tram', 'TER', 'TGV', 'Keolis', 'Transdev'] },
            { name: 'Assurance auto', keywords: ['Assurance auto', 'MAAF', 'MACIF', 'AXA', 'Groupama', 'Matmut', 'Direct Assurance', 'Allianz'] },
            { name: 'Entretien/Réparation', keywords: ['Garage', 'Norauto', 'Feu Vert', 'Midas', 'Speedy', 'Point S', 'Controle technique', 'Dekra', 'Carglass'] },
            { name: 'Parking/Péage', keywords: ['APRR', 'Sanef', 'Vinci', 'Ulys', 'Telepeage', 'Peage', 'Indigo', 'Q-Park', 'Easypark', 'PayByPhone'] },
            { name: 'Taxi/VTC', keywords: ['Uber', 'Bolt', 'Heetch', 'Taxi', 'G7', 'Free Now'] }
        ]
    },
    {
        name: 'Loisirs',
        emoji: '🎭',
        subCategories: [
            { name: 'Sorties', keywords: ['Bar', 'Pub', 'Boite', 'Cafe', 'Brasserie', 'Club', 'Discotheque'] },
            { name: 'Sorties culturelles', keywords: ['Cinema', 'UGC', 'Gaumont', 'Pathe', 'MK2', 'Concert', 'Ticketmaster', 'Fnac Spectacles', 'Musee', 'Exposition', 'Bowling', 'Escape Game', 'Laser Game', 'Zoo', 'Aquarium'] },
            { name: 'Événements sportifs', keywords: ['Billet', 'Ticket', 'Billetterie', 'Stade', 'Arena', 'Tournoi', 'Competition', 'Federation', 'Licence sportive'] },
            { name: 'Livres/Jeux', keywords: ['Fnac', 'Cultura', 'Furet du Nord', 'Gibert', 'Steam', 'Playstation', 'Nintendo', 'Xbox', 'Micromania'] },
            { name: 'Voyages', keywords: ['Voyage', 'Sejour', 'Vacances', 'Weekend', 'City trip', 'Airbnb', 'Booking', 'Hotel', 'Ibis', 'Novotel', 'Campanile', 'EasyJet', 'Air France', 'Ryanair', 'Transavia', 'Trainline', 'Flixbus', 'BlaBlaCar', 'Club Med', 'Center Parcs', 'Camping', 'Hostel', 'Expedia'] },
            { name: 'Jeux & Paris', keywords: ['Betclic', 'Winamax', 'FDJ', 'PMU', 'Parions Sport', 'Unibet', 'Pokerstars', 'Bwin'] }
        ]
    },
    {
        name: 'Santé',
        emoji: '💊',
        subCategories: [
            { name: 'Médecin', keywords: ['Doctolib', 'Docteur', 'Medecin', 'Consultation', 'Specialiste', 'Hopital', 'Clinique', 'Radiologie', 'Laboratoire'] },
            { name: 'Pharmacie', keywords: ['Pharmacie', 'Parapharmacie', 'Pharma'] },
            { name: 'Mutuelle', keywords: ['Mutuelle', 'Alan', 'Harmonie', 'MGEN', 'Malakoff', 'April', 'Swiss Life'] },
            { name: 'Optique/Dentaire', keywords: ['Opticien', 'Dentiste', 'Orthodontiste', 'Lunettes', 'Afflelou', 'Krys', 'Audika'] },
            { name: 'Coiffeur & Esthétique', keywords: ['Coiffeur', 'Barbier', 'Esthetique', 'Institut', 'Salon', 'Spa', 'Massage'] }
        ]
    },
    {
        name: 'Shopping',
        emoji: '🛍️',
        subCategories: [
            { name: 'Vêtements', keywords: ['Zara', 'H&M', 'Uniqlo', 'Shein', 'Vinted', 'Asos', 'Nike', 'Adidas', 'Primark', 'Kiabi', 'Celio', 'Jules', 'Bershka', 'Pull&Bear', 'Mango', 'Levis', 'Foot Locker', 'Courir'] },
            { name: 'Équipements sportifs', keywords: ['Decathlon', 'Intersport', 'Go Sport', 'Sport 2000', 'JD Sports', 'Nike Store', 'Adidas Store', 'Equipement sportif'] },
            { name: 'Cadeaux & Plaisir', keywords: ['Cadeau', 'Carte cadeau', 'Gift'] },
            { name: 'High-Tech', keywords: ['Apple', 'Samsung', 'Boulanger', 'Darty', 'LDLC', 'Materiel.net', 'Cdiscount', 'Back Market'] },
            { name: 'Cosmétiques', keywords: ['Sephora', 'Nocibe', 'Yves Rocher', 'Marionnaud', 'Lush'] }
        ]
    },
    {
        name: 'Abonnements',
        emoji: '📱',
        subCategories: [
            { name: 'Téléphone', keywords: ['Orange', 'Sosh', 'Free Mobile', 'Bouygues', 'SFR', 'Red', 'Prixtel', 'La Poste Mobile', 'NRJ Mobile', 'Auchan Telecom'] },
            { name: 'Internet', keywords: ['Box', 'Fibre', 'ADSL', 'Orange', 'Free', 'Bouygues Telecom', 'SFR'] },
            { name: 'Streaming', keywords: ['Netflix', 'Spotify', 'Deezer', 'Apple Music', 'Disney+', 'Prime Video', 'Canal+', 'YouTube', 'Youtube Premium', 'Twitch', 'Molotov'] },
            { name: 'Logiciels/Apps', keywords: ['Google Storage', 'Google One', 'iCloud', 'Microsoft', 'Microsoft 365', 'Office 365', 'Adobe', 'Notion', 'Figma', 'Dropbox'] },
            { name: 'Salle de sport', keywords: ['Basic Fit', 'Basic-Fit', 'Fitness Park', 'FitnessPark', 'Keep Cool', 'Neoness', 'Salle de sport', 'Abonnement sport', 'Club sportif', 'Urban Soccer', 'Le Five'] }
        ]
    },
    {
        name: 'Énergie',
        emoji: '⚡',
        subCategories: [
            { name: 'Électricité', keywords: ['EDF', 'Engie', 'Total Energies', 'Electricite', 'Ilek', 'Mint Energie', 'Ohm Energie'] },
            { name: 'Gaz', keywords: ['Gaz', 'Engie', 'GRDF'] },
            { name: 'Eau', keywords: ['Veolia', 'Suez', 'SAUR', 'Service des eaux'] }
        ]
    },
    {
        name: 'Banque',
        emoji: '🏦',
        subCategories: [
            { name: 'Frais bancaires', keywords: ['Cotisation', 'Frais bancaires', 'Carte bancaire', 'Commission', 'Frais incident', 'Opposition'] },
            { name: 'Agios', keywords: ['Agios', 'Decouvert', 'Interets debiteurs'] },
            { name: 'Virements', keywords: ['VIR', 'VIREMENT', 'VIR SEPA'] },
            { name: 'Prélèvements', keywords: ['PRLV', 'PRELEVEMENT', 'SEPA'] },
            { name: 'Chèques', keywords: ['CHEQUE'] }
        ]
    },
    {
        name: 'Investissements & Épargne',
        emoji: '📈',
        subCategories: [
            { name: 'Épargne', keywords: ['Livret A', 'LDDS', 'LEP', 'PEL', 'Livret', 'Epargne', 'Virement epargne'] },
            { name: 'Assurance vie', keywords: ['Assurance Vie', 'Generali', 'Linxea', 'Suravenir', 'Spirica'] },
            { name: 'Bourse', keywords: ['PEA', 'CTO', 'ETF', 'Actions', 'Amundi', 'Lyxor', 'Trade Republic', 'Degiro', 'Bourse Direct', 'Fortuneo'] },
            { name: 'Crypto', keywords: ['Crypto', 'Bitcoin', 'BTC', 'Ethereum', 'Binance', 'Coinbase', 'Kraken', 'Ledger'] },
            { name: 'Autres placements', keywords: ['Crowdfunding', 'Anaxago', 'Homunity', 'Wiseed', 'October', 'Royaltiz'] }
        ]
    },
    {
        name: 'Enfants',
        emoji: '👶',
        subCategories: [
            { name: 'Garde', keywords: ['Creche', 'Nounou', 'Assistante maternelle', 'Babysitting'] },
            { name: 'Cantine', keywords: ['Cantine', 'Izly', 'Crous'] },
            { name: 'Activités enfants', keywords: ['Centre de loisirs', 'Activite enfant', 'Association', 'Licence'] },
            { name: 'Fournitures scolaires', keywords: ['Bureau Vallee', 'Fournitures scolaires', 'Papeterie'] },
            { name: 'Vêtements enfants', keywords: ['Okaidi', 'Petit Bateau', 'Vertbaudet'] }
        ]
    },
    {
        name: 'Animaux',
        emoji: '🐾',
        subCategories: [
            { name: 'Vétérinaire', keywords: ['Veterinaire', 'Clinique veterinaire'] },
            { name: 'Nourriture', keywords: ['Zooplus', 'Maxi Zoo', 'Animalerie', 'Croquettes'] },
            { name: 'Accessoires', keywords: ['Accessoires animaux', 'Laisse', 'Collier', 'Jouet animal'] }
        ]
    },
    {
        name: 'Revenus',
        emoji: '💰',
        subCategories: [
            { name: 'Salaire', keywords: ['Virement salaire', 'Salaire', 'Paie'] },
            { name: 'Primes', keywords: ['Prime', 'Bonus'] },
            { name: 'Remboursements', keywords: ['CPAM', 'Remboursement', 'Mutuelle'] },
            { name: 'Ventes', keywords: ['Vinted', 'Leboncoin', 'PayPal'] },
            { name: 'Aides', keywords: ['CAF', 'APL', 'Pole Emploi'] }
        ]
    },
    {
        name: 'Impôts & Taxes',
        emoji: '🧾',
        subCategories: [
            { name: 'Impôts', keywords: ['DGFIP', 'DGFiP', 'Impots', 'Finances publiques', 'SIP'] },
            { name: 'Amendes', keywords: ['ANTAI', 'Amende', 'FPS'] }
        ]
    },
    {
        name: 'Cadeaux',
        emoji: '🎁',
        subCategories: [
            { name: 'Achats cadeaux', keywords: ['Cadeau', 'Cadeaux', 'Gift', 'Gift Card', 'Carte cadeau', 'Bon cadeau'] },
            { name: 'Box & Expériences', keywords: ['Smartbox', 'Wonderbox', 'Box cadeau', 'Experience cadeau'] },
            { name: 'Fleurs', keywords: ['Interflora', 'Florajet', 'Aquarelle', 'Fleuriste'] }
        ]
    }
]

async function main() {
    console.log('Starting category re-seeding...')

    const users = await prisma.user.findMany()
    console.log(`Found ${users.length} users.`)

    for (const user of users) {
        console.log(`Processing user: ${user.email || user.id}`)

        for (const cat of defaultCategories) {
            // 1. Create or update parent category
            const category = await prisma.category.upsert({
                where: {
                    userId_name: {
                        userId: user.id,
                        name: cat.name
                    }
                },
                update: {
                    emoji: cat.emoji
                },
                create: {
                    userId: user.id,
                    name: cat.name,
                    emoji: cat.emoji
                }
            })

            // 2. Create or update subcategories
            for (const sub of cat.subCategories) {

                const existingSub = await prisma.category.findFirst({
                    where: {
                        userId: user.id,
                        name: sub.name,
                        parentId: category.id
                    }
                })

                let subCategoryId = existingSub ? existingSub.id : null

                if (!existingSub) {
                    const newSub = await prisma.category.create({
                        data: {
                            userId: user.id,
                            name: sub.name,
                            parentId: category.id
                        }
                    })
                    subCategoryId = newSub.id
                    console.log(`  + Created subcategory: ${sub.name}`)
                }

                // 3. Create or update keywords

                if (sub.keywords && subCategoryId) {
                    for (const kw of sub.keywords) {
                        // Check if keyword exists
                        const existingKw = await prisma.categoryKeyword.findUnique({
                            where: {
                                userId_keyword: {
                                    userId: user.id,
                                    keyword: kw
                                }
                            }
                        })

                        if (!existingKw) {
                            await prisma.categoryKeyword.create({
                                data: {
                                    userId: user.id,
                                    keyword: kw,
                                    categoryId: subCategoryId,
                                    matchType: 'contains' // Default for legacy array
                                }
                            })
                        }
                    }
                }
            }
        }
    }

    console.log('Re-seeding completed.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
