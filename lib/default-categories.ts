export const defaultCategories = [
    {
        name: 'Alimentation',
        emoji: '🍎',
        icon: 'Apple',
        subCategories: [
            { name: 'Courses', keywords: ['Carrefour', 'Carrefour Market', 'Carrefour City', 'Leclerc', 'E.Leclerc', 'Auchan', 'Intermarche', 'Lidl', 'Aldi', 'Monoprix', 'Franprix', 'Super U', 'Hyper U', 'U Express', 'Systeme U', 'Casino Supermarche', 'Cora', 'Picard', 'Grand Frais', 'Bio c Bon', 'Naturalia', 'La Vie Claire', 'Superette', 'Supérette', 'Epicerie', 'Epicerie Fine', 'Spar', 'Vival', 'Coccinelle', 'G20', 'Leader Price', 'Netto', 'Promocash', 'Metro'], icon: 'ShoppingCart' },
            { name: 'Restaurant/Fast Food', keywords: ['Restaurant', 'Resto', 'Brasserie', 'Bistrot', 'Snack', 'Sandwich', 'Tacos', 'Kebab', 'Burger', 'Pizzeria', 'Sushi', 'Wok', 'Poke', 'Creperie', 'McDonald', 'Burger King', 'KFC', 'Quick', 'Subway', 'Dominos', 'Pizza Hut', 'O Tacos', 'Five Guys', 'Big Fernand', 'Pret A Manger', 'EXKI', 'Flunch', 'Buffalo Grill', 'Hippopotamus', 'Del Arte'], icon: 'Utensils' },
            { name: 'Livraison', keywords: ['Uber Eats', 'UberEats', 'Deliveroo', 'Just Eat', 'JustEat', 'Foodora', 'Frichti', 'Glovo'], icon: 'Bike' },
            { name: 'Boulangerie', keywords: ['Boulangerie', 'Boulanger', 'Patisserie', 'Viennoiserie', 'Pain', 'Baguette', 'Paul', 'Brioche', 'Marie Blachere', 'La Mie Caline', 'Feuillette', 'Ange', 'Maison Kayser'], icon: 'Croissant' }
        ]
    },
    {
        name: 'Logement',
        emoji: '🏠',
        icon: 'Home',
        subCategories: [
            { name: 'Loyer/Prêt', keywords: ['Loyer', 'Bail', 'Location', 'Gestion locative', 'Foncia', 'Nexity', 'Citya', 'Square Habitat', 'Orpi', 'Credit immo', 'Echeance pret', 'Mensualite', 'Pret immobilier'], icon: 'Key' },
            { name: 'Charges', keywords: ['Syndic', 'Charges copro', 'Copropriete', 'ASL', 'Ordures menageres'], icon: 'Receipt' },
            { name: 'Assurance habitation', keywords: ['Assurance habitation', 'MRH', 'Pacifica'], icon: 'Shield' },
            { name: 'Taxe foncière', keywords: ['DGFIP', 'Impots', 'Taxe fonciere', 'Tresor Public'], icon: 'Landmark' },
            { name: 'Entretien', keywords: ['Leroy Merlin', 'Castorama', 'Bricorama', 'Brico Depot', 'Mr Bricolage', 'Bricomarche', 'Weldom', 'ManoMano', 'Action', 'Gamm Vert', 'Jardiland', 'Point P', 'Cedeo', 'Rexel'], icon: 'Hammer' },
            { name: 'Meubles/Déco', keywords: ['Maison du Monde', 'Zara Home', 'Alinea', 'Habitat', 'Conforama', 'But', 'IKEA', 'Gifi', 'Centrakor', 'Hema', 'La Redoute', 'Camif'], icon: 'Armchair' }
        ]
    },
    {
        name: 'Transport',
        emoji: '🚗',
        icon: 'Car',
        subCategories: [
            { name: 'Carburant', keywords: ['Total', 'Total Energies', 'Shell', 'BP', 'Esso', 'Avia', 'Carrefour Energie', 'Leclerc Energie', 'Essence', 'Diesel', 'Gazole'], icon: 'Fuel' },
            { name: 'Transport en commun', keywords: ['SNCF', 'SNCF Connect', 'OuiGo', 'Trainline', 'RATP', 'Navigo', 'Bus', 'Tram', 'TER', 'TGV', 'Keolis', 'Transdev'], icon: 'Train' },
            { name: 'Assurance auto', keywords: ['Assurance auto', 'Direct Assurance'], icon: 'ShieldCheck' },
            { name: 'Entretien/Réparation', keywords: ['Garage', 'Norauto', 'Feu Vert', 'Midas', 'Speedy', 'Point S', 'Controle technique', 'Dekra', 'Carglass'], icon: 'Wrench' },
            { name: 'Parking/Péage', keywords: ['APRR', 'Sanef', 'Vinci', 'Ulys', 'Telepeage', 'Peage', 'Indigo', 'Q-Park', 'Easypark', 'PayByPhone'], icon: 'ParkingSquare' },
            { name: 'Taxi/VTC', keywords: ['Uber', 'Bolt', 'Heetch', 'Taxi', 'G7', 'Free Now'], icon: 'CarTaxiFront' }
        ]
    },
    {
        name: 'Loisirs',
        emoji: '🎭',
        icon: 'Ticket',
        subCategories: [
            { name: 'Bars', keywords: ['Bar', 'Pub', 'Boite', 'Cafe', 'Club', 'Discotheque'], icon: 'Beer' },
            { name: 'Sorties culturelles', keywords: ['Cinema', 'UGC', 'Gaumont', 'Pathe', 'MK2', 'Concert', 'Ticketmaster', 'Fnac Spectacles', 'Musee', 'Exposition', 'Bowling', 'Escape Game', 'Laser Game', 'Zoo', 'Aquarium'], icon: 'Drama' },
            { name: 'Événements sportifs', keywords: ['Billet', 'Ticket', 'Billetterie', 'Stade', 'Arena', 'Tournoi', 'Competition', 'Federation', 'Licence sportive'], icon: 'Trophy' },
            { name: 'Livres/Jeux', keywords: ['Fnac', 'Cultura', 'Furet du Nord', 'Gibert', 'Steam', 'Playstation', 'Nintendo', 'Xbox', 'Micromania'], icon: 'Gamepad2' },
            { name: 'Voyages', keywords: ['Voyage', 'Sejour', 'Vacances', 'Weekend', 'City trip', 'Airbnb', 'Booking', 'Hotel', 'Ibis', 'Novotel', 'Campanile', 'EasyJet', 'Air France', 'Ryanair', 'Transavia', 'Flixbus', 'BlaBlaCar', 'Club Med', 'Center Parcs', 'Camping', 'Hostel', 'Expedia'], icon: 'Plane' },
            { name: 'Jeux & Paris', keywords: ['Betclic', 'Winamax', 'FDJ', 'PMU', 'Parions Sport', 'Unibet', 'Pokerstars', 'Bwin'], icon: 'Dices' }
        ]
    },
    {
        name: 'Santé',
        emoji: '💊',
        icon: 'Stethoscope',
        subCategories: [
            { name: 'Médecin', keywords: ['Doctolib', 'Docteur', 'Medecin', 'Consultation', 'Specialiste', 'Hopital', 'Clinique', 'Radiologie', 'Laboratoire'], icon: 'Stethoscope' },
            { name: 'Pharmacie', keywords: ['Pharmacie', 'Parapharmacie', 'Pharma'], icon: 'Pill' },
            { name: 'Mutuelle', keywords: ['Mutuelle', 'Alan', 'Harmonie', 'MGEN', 'Malakoff', 'April', 'Swiss Life'], icon: 'ShieldPlus' },
            { name: 'Optique/Dentaire', keywords: ['Opticien', 'Dentiste', 'Orthodontiste', 'Lunettes', 'Afflelou', 'Krys', 'Audika'], icon: 'Glasses' },
            { name: 'Coiffeur & Esthétique', keywords: ['Coiffeur', 'Barbier', 'Esthetique', 'Institut', 'Salon', 'Spa', 'Massage'], icon: 'Scissors' }
        ]
    },
    {
        name: 'Shopping',
        emoji: '🛍️',
        icon: 'ShoppingBag',
        subCategories: [
            { name: 'Vêtements', keywords: ['Zara', 'H&M', 'Uniqlo', 'Shein', 'Vinted', 'Asos', 'Nike', 'Adidas', 'Primark', 'Kiabi', 'Celio', 'Jules', 'Bershka', 'Pull&Bear', 'Mango', 'Levis', 'Foot Locker', 'Courir'], icon: 'Shirt' },
            { name: 'Équipements sportifs', keywords: ['Decathlon', 'Intersport', 'Go Sport', 'Sport 2000', 'JD Sports', 'Nike Store', 'Adidas Store', 'Equipement sportif'], icon: 'Dumbbell' },
            { name: 'Cadeaux & Plaisir', keywords: ['Gift'], icon: 'Gift' },
            { name: 'High-Tech', keywords: ['Apple', 'Samsung', 'Darty', 'LDLC', 'Materiel.net', 'Cdiscount', 'Back Market'], icon: 'Smartphone' },
            { name: 'Cosmétiques', keywords: ['Sephora', 'Nocibe', 'Yves Rocher', 'Marionnaud', 'Lush'], icon: 'Sparkles' }
        ]
    },
    {
        name: 'Abonnements',
        emoji: '📱',
        icon: 'CreditCard',
        subCategories: [
            { name: 'Téléphone', keywords: ['Orange', 'Sosh', 'Free Mobile', 'Bouygues', 'SFR', 'Red', 'Prixtel', 'La Poste Mobile', 'NRJ Mobile', 'Auchan Telecom'], icon: 'Smartphone' },
            { name: 'Internet', keywords: ['Box', 'Fibre', 'ADSL', 'Free', 'Bouygues Telecom'], icon: 'Wifi' },
            { name: 'Streaming', keywords: ['Netflix', 'Spotify', 'Deezer', 'Apple Music', 'Disney+', 'Prime Video', 'Canal+', 'YouTube', 'Youtube Premium', 'Twitch', 'Molotov'], icon: 'Clapperboard' },
            { name: 'Logiciels/Apps', keywords: ['Google Storage', 'Google One', 'iCloud', 'Microsoft', 'Microsoft 365', 'Office 365', 'Adobe', 'Notion', 'Figma', 'Dropbox'], icon: 'AppWindow' },
            { name: 'Salle de sport', keywords: ['Basic Fit', 'Basic-Fit', 'Fitness Park', 'FitnessPark', 'Keep Cool', 'Neoness', 'Salle de sport', 'Abonnement sport', 'Club sportif', 'Urban Soccer', 'Le Five'], icon: 'Dumbbell' }
        ]
    },
    {
        name: 'Énergie',
        emoji: '⚡',
        icon: 'Zap',
        subCategories: [
            { name: 'Électricité', keywords: ['EDF', 'Electricite', 'Ilek', 'Mint Energie', 'Ohm Energie'], icon: 'Zap' },
            { name: 'Gaz', keywords: ['Gaz', 'Engie', 'GRDF'], icon: 'Flame' },
            { name: 'Eau', keywords: ['Veolia', 'Suez', 'SAUR', 'Service des eaux'], icon: 'Droplets' }
        ]
    },
    {
        name: 'Banque',
        emoji: '🏦',
        icon: 'Banknote',
        subCategories: [
            { name: 'Frais bancaires', keywords: ['Cotisation', 'Frais bancaires', 'Carte bancaire', 'Commission', 'Frais incident', 'Opposition'], icon: 'CreditCard' },
            { name: 'Agios', keywords: ['Agios', 'Decouvert', 'Interets debiteurs'], icon: 'Percent' },
            { name: 'Virements', keywords: ['VIR', 'VIREMENT', 'VIR SEPA'], icon: 'ArrowRightLeft' },
            { name: 'Prélèvements', keywords: ['PRLV', 'PRELEVEMENT', 'SEPA'], icon: 'ArrowDown' },
            { name: 'Chèques', keywords: ['CHEQUE'], icon: 'ScrollText' }
        ]
    },
    {
        name: 'Épargne',
        emoji: '🐷',
        icon: 'PiggyBank',
        subCategories: [
            { name: 'Livrets', keywords: ['Livret A', 'LDDS', 'LEP', 'PEL', 'Livret', 'Epargne', 'Virement epargne', 'CEL'], icon: 'Book' },
            { name: 'Cagnotte', keywords: ['Cagnotte', 'Tirelire'], icon: 'Coins' }
        ]
    },
    {
        name: 'Investissement',
        emoji: '📈',
        icon: 'TrendingUp',
        subCategories: [
            { name: 'Assurance vie', keywords: ['Assurance Vie', 'Generali', 'Linxea', 'Suravenir', 'Spirica'], icon: 'Shield' },
            { name: 'Bourse', keywords: ['PEA', 'CTO', 'ETF', 'Actions', 'Amundi', 'Lyxor', 'Trade Republic', 'Degiro', 'Bourse Direct', 'Fortuneo', 'Saxo'], icon: 'LineChart' },
            { name: 'Crypto', keywords: ['Crypto', 'Bitcoin', 'BTC', 'Ethereum', 'Binance', 'Coinbase', 'Kraken', 'Ledger'], icon: 'Bitcoin' },
            { name: 'Forex / Métaux', keywords: ['Forex', 'Trading', 'CFD', 'Or', 'Argent', 'Gold', 'Silver', 'XAU', 'XAG', 'Metaux', 'Metal', 'Bullion'], icon: 'Gem' },
            { name: 'Immobilier', keywords: ['Notaire', 'Apport', 'Agence immobilière', 'Achat immo'], icon: 'Building' },
            { name: 'Autres placements', keywords: ['Crowdfunding', 'Anaxago', 'Homunity', 'Wiseed', 'October', 'Royaltiz', 'SCPI'], icon: 'PieChart' }
        ]
    },
    {
        name: 'Enfants',
        emoji: '👶',
        icon: 'Baby',
        subCategories: [
            { name: 'Garde', keywords: ['Creche', 'Nounou', 'Assistante maternelle', 'Babysitting'], icon: 'Baby' },
            { name: 'Cantine', keywords: ['Cantine', 'Izly', 'Crous'], icon: 'UtensilsIsosceles' },
            { name: 'Activités enfants', keywords: ['Centre de loisirs', 'Activite enfant', 'Association', 'Licence'], icon: 'Activity' },
            { name: 'Fournitures scolaires', keywords: ['Bureau Vallee', 'Fournitures scolaires', 'Papeterie'], icon: 'Pencil' },
            { name: 'Vêtements enfants', keywords: ['Okaidi', 'Petit Bateau', 'Vertbaudet'], icon: 'Shirt' }
        ]
    },
    {
        name: 'Animaux',
        emoji: '🐾',
        icon: 'PawPrint',
        subCategories: [
            { name: 'Vétérinaire', keywords: ['Veterinaire', 'Clinique veterinaire'], icon: 'Stethoscope' },
            { name: 'Nourriture', keywords: ['Zooplus', 'Maxi Zoo', 'Animalerie', 'Croquettes'], icon: 'Bone' },
            { name: 'Accessoires', keywords: ['Accessoires animaux', 'Laisse', 'Collier', 'Jouet animal'], icon: 'Tag' }
        ]
    },
    {
        name: 'Revenus',
        emoji: '💰',
        icon: 'Wallet',
        subCategories: [
            { name: 'Salaire', keywords: ['Virement salaire', 'Salaire', 'Paie'], icon: 'Banknote' },
            { name: 'Primes', keywords: ['Prime', 'Bonus'], icon: 'Medal' },
            { name: 'Remboursements', keywords: ['CPAM', 'Remboursement', 'Mutuelle'], icon: 'Undo2' },
            { name: 'Ventes', keywords: ['Vinted', 'Leboncoin', 'PayPal'], icon: 'ShoppingBag' },
            { name: 'Aides', keywords: ['CAF', 'APL', 'Pole Emploi'], icon: 'HandCoins' }
        ]
    },
    {
        name: 'Impôts & Taxes',
        emoji: '🧾',
        icon: 'Scale',
        subCategories: [
            { name: 'Impôts', keywords: ['DGFIP', 'DGFiP', 'Impots', 'Finances publiques', 'SIP'], icon: 'Landmark' },
            { name: 'Amendes', keywords: ['ANTAI', 'Amende', 'FPS'], icon: 'Siren' }
        ]
    },
    {
        name: 'Cadeaux',
        emoji: '🎁',
        icon: 'Gift',
        subCategories: [
            { name: 'Achats cadeaux', keywords: ['Cadeau', 'Cadeaux', 'Gift', 'Gift Card', 'Carte cadeau', 'Bon cadeau'], icon: 'Gift' },
            { name: 'Box & Expériences', keywords: ['Smartbox', 'Wonderbox', 'Box cadeau', 'Experience cadeau'], icon: 'Package' },
            { name: 'Fleurs', keywords: ['Interflora', 'Florajet', 'Aquarelle', 'Fleuriste'], icon: 'Flower' }
        ]
    }
]
