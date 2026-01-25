# Documentation Fonctionnelle de Budgetwise

Ce document détaille l'objectif et les actions disponibles pour chaque page de l'application Budgetwise.

## 1. Accueil (Dashboard) - `/`
**Objectif :** Vue d'ensemble de la situation financière actuelle (Solde, Épargne, Évolution, Transactions récentes).

**Actions / Boutons :**
- **Cartes d'indicateurs** :
  - "Reste à vivre" : Affiche le flux du mois (Revenus - Dépenses - Épargne). Indique si on épargne ou si on dépasse.
  - "Solde Total" : Lien vers la page `/accounts`.
  - "Taux d'Épargne" : Affiche le pourcentage d'épargne du mois avec une barre de progression.
- **Graphiques** :
  - Évolution Budgétaire (6 mois) : Graphique combiné (Aires pour revenus/dépenses, Ligne pour épargne).
- **Transactions Récentes** :
  - Liste des 7 dernières transactions.
  - Lien "Voir tout" vers `/transactions`.
- **En-tête** :
  - Salutation dynamique selon l'heure.

## 2. Comptes (Accounts) - `/accounts`
**Objectif :** Gérer l'ensemble des comptes bancaires et suivre leurs soldes.

**Actions / Boutons :**
- **Création** : Bouton "+ Nouveau Compte" (Ouvre modal).
- **Carte "Solde Total"** :
  - Bouton "Oeil" pour masquer/afficher le montant total.
- **Liste des comptes** (Groupés par Courant, Épargne, Investissement, Autres) :
  - Clic sur une carte de compte : Ouvre un modal avec les transactions récentes de ce compte.
  - Bouton "Oeil" sur la carte : Floute/Défloute le solde spécifique.
  - Bouton "Paramètres" (Roue crantée) sur la carte : Ouvre le modal de modification.
- **Modal de Création/Modification** :
  - Champs : Nom, Banque (Liste + Autre), Type (Courant, Épargne, Crédit, Espèces), 4 derniers chiffres, Solde initial.
  - Actions : Enregistrer, Supprimer (si modification), Changer l'ordre (si modification).

## 3. Transactions - `/transactions`
**Objectif :** Consulter, rechercher, filtrer et gérer l'historique complet des transactions.

**Actions / Boutons :**
- **Filtres et Recherche** :
  - Barre de recherche (texte).
  - Filtres : Date (Début/Fin), Compte, Type (Revenu, Dépense, Transfert, Investissement), Montant (Min/Max), Pending.
- **Actions Principales** :
  - Bouton "+ Transaction" (Manuel).
  - Bouton "Scan" (Caméra) : Upload de ticket de caisse pour OCR.
  - Bouton "Import" : Import de relevé bancaire.
  - Bouton "Export" : Export en PDF ou Excel (XLSX).
  - Bouton "Vider" (Debug) : Supprimer toutes les transactions (si activé).
- **Liste des Transactions** :
  - Scroll infini.
  - Clic sur une transaction : Ouvre le modal de modification.
- **Gestion des Catégories** : Création de catégories/sous-catégories à la volée dans les formulaires.
- **Modal Split** : Diviser une transaction en plusieurs sous-transactions (disponible dans le menu d'édition).

## 4. Calendrier (Calendar) - `/calendar`
**Objectif :** Visualiser et gérer les dépenses et revenus récurrents ou futurs.

**Actions / Boutons :**
- **Navigation** : Mois précédent/suivant.
- **Vues** : Calendrier (Grille) ou Liste.
- **Gestion d'événements** :
  - Clic sur une case jour : Créer un nouvel événement (échéance).
  - Clic sur un événement existant : Modifier/Voir détails.
  - Formulaire : Titre, Montant, Date, Récurrence (Hebdo, Mensuel, etc.), Notification Email, Catégorie/Compte.
- **Confirmation** :
  - Actions pour transformer une échéance prévue en transaction réelle (Confirm).
  - "Confirmation rapide" si toutes les infos sont présentes.

## 5. Investissements (Investments) - `/investments`
**Objectif :** Suivi du patrimoine et du portefeuille d'investissements.

**Actions / Boutons :**
- **Filtres de Dashboard** :
  - Période : 7j, 30j, 90j, 1an, Total.
  - Type : Tous, Crypto, Bourse, Épargne, Immobilier, Autres.
- **Tableau de bord** :
  - Indicateurs : Valeur totale, Plus/Moins-value, Allocation (Camembert).
- **Actions** :
  - Bouton "Ajouter" : Ouvre modal pour Crypto/Action/ETF/Livret.
  - Bouton "Ajouter Immobilier" : Modal spécifique immobilier.
- **Liste des investissements** :
  - Clic sur un investissement : Ouvre le modal de détails (Graphique, Performance, Métriques détaillées).
  - Actions sur détail : Modifier, Supprimer.
- **Calculs temps réel** : Récupération automatique des prix (Crypto/Bourse) si symboles configurés.

## 6. Budgets - `/budgets`
**Objectif :** Définir et suivre des limites de dépenses par catégorie.

**Actions / Boutons :**
- **Navigation** : Mois précédent/suivant, "Aujourd'hui".
- **Gestion Globale** :
  - Bouton "Réinitialiser" (Supprime tous les budgets).
  - Bouton "Suggestions" (Ampoule) : Propose des budgets basés sur l'historique.
- **Cartes de Catégorie** :
  - Input montant : Définir l'objectif.
  - Bouton "Scope" (Globe/Calendrier) : Basculer entre budget Global (tous les mois) ou Mensuel (ce mois seulement).
  - Barre de progression : Visuel Dépensé vs Objectif (Couleurs vert/orange/rouge selon état).
  - Clic sur le nom : Ouvre le détail (Répartition par sous-catégories).

## 7. Statistiques (Analytics) - `/analytics`
**Objectif :** Analyse approfondie des flux financiers.

**Actions / Boutons :**
- **Vues Temporelles** :
  - Années (Line chart annuel).
  - Mois (Line chart mensuel).
  - Journalier (Bar chart journalier).
- **Filtres** : Sélection de l'année ou du mois spécifique.
- **Graphiques** :
  - Évolution (Courbes Revenus vs Dépenses).
  - Top Catégories (Liste triée).
  - Top Comptes (Liste triée).
  - Top Dépenses du mois (Liste des 5 plus grosses transactions).

## 8. Économies (Savings) - `/savings`
**Objectif :** Analyse intelligente (IA) et assistant financier.

**Actions / Boutons :**
- **Analyse IA** :
  - Sélecteur de période (1/3/6 mois, 1 an).
  - Bouton "Actualiser l'analyse" : Lance l'analyse Gemini.
  - Résultats : Résumé, Points forts, Points d'attention, Recommandations, Insights.
- **Assistant Chat** :
  - Interface de chat pour poser des questions en langage naturel ("Combien ai-je dépensé en courses ?").
- **Statistiques Clés** : Cartes simples (Revenus, Dépenses, Épargne, Taux, Top catégories).

## 9. Paramètres (Settings) - `/settings`
**Objectif :** Configuration de l'application.

**Actions / Boutons :**
- **Thème** : Switch Mode Sombre / Mode Clair.
- **Gestion des Catégories** :
  - Bouton "+ Nouvelle catégorie".
  - Liste accordéon des catégories.
  - Actions par catégorie : Éditer, Supprimer.
  - Actions par sous-catégorie : Ajouter, Éditer, Déplacer, Supprimer.
  - Gestion des Mots-clés (Keywords) : Associer des mots-clés pour l'auto-catégorisation (dans le modal d'édition).
