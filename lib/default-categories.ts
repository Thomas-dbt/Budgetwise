export const defaultCategories = [
    {
        name: 'Alimentation',
        emoji: '🍎',
        subCategories: [
            { name: 'Courses', keywords: ['Carrefour', 'Leclerc', 'Auchan', 'Intermarché', 'Lidl', 'Aldi', 'Monoprix', 'Franprix', 'Super U', 'Casino', 'Cora', 'Mini Market'] },
            { name: 'Restaurant/Fast Food', keywords: ['Restaurant', 'McDonald', 'Burger King', 'KFC', 'Uber Eats', 'O Tacos', 'Deliveroo', 'Sushi', 'Pizza', 'Bistrot', 'Tacos', 'Cafe', 'Bar', 'Kebab'] },
            { name: 'Livraison', keywords: ['Uber Eats', 'Deliveroo', 'Foodora'] },
            { name: 'Boulangerie', keywords: ['Boulangerie', 'Pain', 'Paul', 'Brioche', 'Boulanger'] }
        ]
    },
    {
        name: 'Logement',
        emoji: '🏠',
        subCategories: [
            { name: 'Loyer/Prêt', keywords: ['Loyer', 'Crédit immo', 'Echéance prêt', 'Gestion', 'Immobilier'] },
            { name: 'Charges', keywords: ['Syndic', 'Charges copro'] },
            { name: 'Assurance habitation', keywords: ['Assurance hab', 'MAIF', 'Allianz', 'AXA', 'GMF', 'Matmut', 'Pacifica'] },
            { name: 'Taxe foncière', keywords: ['FIP', 'DGFIP', 'Impots'] },
            { name: 'Entretien', keywords: ['Leroy Merlin', 'Castorama', 'Bricorama', 'Brico Dépôt', 'IKEA', 'Action'] },
            { name: 'Meubles/Déco', keywords: ['Maison du monde', 'Zara Home'] }
        ]
    },
    {
        name: 'Transport',
        emoji: '🚗',
        subCategories: [
            { name: 'Carburant', keywords: ['Total', 'Shell', 'Essence', 'Station Service', 'BP', 'Esso', 'Avia', 'Carburant', 'Station', 'DAC'] },
            { name: 'Transport en commun', keywords: ['SNCF', 'RATP', 'Train', 'TGV', 'OuiGo', 'Metro', 'Bus', 'Navigo', 'Pony'] },
            { name: 'Assurance auto', keywords: ['Assurance Auto', 'Direct Assurance', 'Olivier'] },
            { name: 'Entretien/Réparation', keywords: ['Garage', 'Norauto', 'Feu Vert', 'Midas', 'Controle technique'] },
            { name: 'Parking/Péage', keywords: ['APRR', 'Sanef', 'Vinci', 'Indigo', 'Parking', 'Stationeo'] },
            { name: 'Taxi/VTC', keywords: ['Uber', 'Bolt', 'Heetch', 'Taxi', 'G7'] }
        ]
    },
    {
        name: 'Loisirs',
        emoji: '🎭',
        subCategories: [
            { name: 'Sorties', keywords: ['Bar', 'Pub', 'Boite', 'Cafe'] },
            { name: 'Cinéma/Concerts', keywords: ['Cinema', 'UGC', 'Gaumont', 'Pathe', 'Concert', 'Ticketmaster', 'Fnac Spectacles'] },
            { name: 'Sport', keywords: ['Decathlon', 'Go Sport', 'Intersport', 'Fitness', 'Basic Fit', 'Teleski', 'Club'] },
            { name: 'Livres/Jeux', keywords: ['Fnac', 'Cultura', 'Steam', 'Playstation', 'Nintendo', 'Xbox', 'Amazon Livres'] },
            { name: 'Voyages/Week-end', keywords: ['Airbnb', 'Booking', 'Hotel', 'EasyJet', 'Air France', 'Ryanair'] },
            { name: 'Vacances', keywords: [] },
            { name: 'Jeux & Paris', keywords: ['Betclic', 'Winamax', 'FDJ', 'PMU', 'Parions Sport', 'Casino'] }
        ]
    },
    {
        name: 'Santé',
        emoji: '💊',
        subCategories: [
            { name: 'Médecin', keywords: ['Doctolib', 'Dr', 'Medecin', 'Consultation'] },
            { name: 'Pharmacie', keywords: ['Pharmacie'] },
            { name: 'Mutuelle', keywords: ['Mutuelle', 'Alan', 'Harmonie'] },
            { name: 'Optique/Dentaire', keywords: ['Opticien', 'Dentiste', 'Lunettes'] },
            { name: 'Coiffeur & Esthétique', keywords: ['Coiffeur', 'Barbier', 'Capilia', 'Esthetique', 'Beaute', 'Salon'] }
        ]
    },
    {
        name: 'Shopping',
        emoji: '🛍️',
        subCategories: [
            { name: 'Vêtements', keywords: ['Zara', 'H&M', 'Uniqlo', 'Shein', 'Vinted', 'Asos', 'Nike', 'Adidas', 'Primark', 'Kiabi'] },
            { name: 'Cadeaux', keywords: [] },
            { name: 'High-Tech', keywords: ['Apple', 'Samsung', 'Boulanger', 'Darty', 'Amazon Tech', 'LDLC'] },
            { name: 'Cosmétiques', keywords: ['Sephora', 'Nocibe', 'Yves Rocher'] }
        ]
    },
    {
        name: 'Abonnements',
        emoji: '📱',
        subCategories: [
            { name: 'Téléphone', keywords: ['Orange', 'Sosh', 'Free Mobile', 'Bouygues', 'SFR', 'Red by SFR'] },
            { name: 'Internet', keywords: ['Box'] },
            { name: 'Streaming (Netflix, Spotify...)', keywords: ['Netflix', 'Spotify', 'Deezer', 'Apple Music', 'Disney', 'Prime Video', 'Canal', 'Youtube'] },
            { name: 'Logiciels/Apps', keywords: ['Google Storage', 'iCloud', 'Microsoft'] }
        ]
    },
    {
        name: 'Énergie',
        emoji: '⚡',
        subCategories: [
            { name: 'Électricité', keywords: ['EDF', 'Engie', 'Total Energies'] },
            { name: 'Gaz', keywords: ['Gaz'] },
            { name: 'Eau', keywords: ['Veolia', 'Suez', 'Eau de'] }
        ]
    },
    {
        name: 'Banque',
        emoji: '🏦',
        subCategories: [
            { name: 'Frais bancaires', keywords: ['Cotisation', 'Frais de tenue'] },
            { name: 'Agios', keywords: ['Interets debiteurs'] },
            { name: 'Intérêts', keywords: [] },
            { name: 'Retraits', keywords: ['Retrait'] },
            { name: 'Epargne', keywords: ['Virement Epargne', 'Livret A', 'LDDS', 'Assurance Vie', 'Generali', 'Placement'] }
        ]
    },
    {
        name: 'Enfants',
        emoji: '👶',
        subCategories: [
            { name: 'Garde', keywords: ['Creche', 'Nounou'] },
            { name: 'Cantine', keywords: ['Cantine', 'Izly', 'Crous'] },
            { name: 'Activités', keywords: [] },
            { name: 'Fournitures scolaires', keywords: ['Bureau Vallee'] },
            { name: 'Vêtements enfants', keywords: ['Okaidi', 'Petit Bateau', 'Verbaudet'] }
        ]
    },
    {
        name: 'Animaux',
        emoji: '🐾',
        subCategories: [
            { name: 'Vétérinaire', keywords: ['Veterinaire', 'Clinique vet'] },
            { name: 'Nourriture', keywords: ['Zooplus', 'Maxi Zoo'] },
            { name: 'Accessoires', keywords: [] }
        ]
    },
    {
        name: 'Revenus',
        emoji: '💰',
        subCategories: [
            { name: 'Salaire', keywords: ['Virement Salaire', 'Paie'] },
            { name: 'Primes', keywords: ['Prime'] },
            { name: 'Remboursements', keywords: ['CPAM', 'Remboursement'] },
            { name: 'Ventes', keywords: ['Vinted', 'Leboncoin'] },
            { name: 'Aides', keywords: ['CAF', 'APL'] }
        ]
    }
]
