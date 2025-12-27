# Configuration Google Calendar

Pour activer la synchronisation avec Google Calendar, vous devez configurer les identifiants OAuth2 Google.

## Étapes de configuration

### 1. Créer un projet dans Google Cloud Console

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Notez l'ID du projet

### 2. Activer l'API Google Calendar

1. Dans le menu, allez dans **APIs & Services** > **Library**
2. Recherchez "Google Calendar API"
3. Cliquez sur **Enable** pour activer l'API

### 3. Créer des identifiants OAuth 2.0

1. Allez dans **APIs & Services** > **Credentials**
2. Cliquez sur **Create Credentials** > **OAuth client ID**
3. Si c'est la première fois, configurez l'écran de consentement OAuth :
   - Choisissez **External** (ou Internal si vous avez un compte Google Workspace)
   - Remplissez les informations requises
   - Ajoutez votre email comme test user
4. Pour le type d'application, choisissez **Web application**
5. Configurez les **Authorized redirect URIs** :
   - Pour le développement : `http://localhost:4002/api/calendar/sync/google/callback`
   - Pour la production : `https://votre-domaine.com/api/calendar/sync/google/callback`
6. Cliquez sur **Create**
7. Copiez le **Client ID** et le **Client Secret**

### 4. Ajouter les variables d'environnement

Ajoutez ces lignes dans votre fichier `.env` :

```env
GOOGLE_CLIENT_ID=votre-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=votre-client-secret
GOOGLE_REDIRECT_URI=http://localhost:4002/api/calendar/sync/google/callback
ENCRYPTION_KEY=votre-cle-de-chiffrement-aleatoire-32-bytes-en-hex
```

**Important** : Pour générer une clé de chiffrement sécurisée, vous pouvez utiliser :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Redémarrer le serveur

Après avoir ajouté les variables d'environnement, redémarrez votre serveur de développement :

```bash
npm run dev
```

## Test de la connexion

1. Allez dans l'onglet Calendrier de votre application
2. Cliquez sur "Connecter Google Calendar"
3. Vous serez redirigé vers Google pour autoriser l'accès
4. Après autorisation, vous serez redirigé vers votre application
5. Votre calendrier Google sera maintenant connecté

## Dépannage

### Erreur "Missing required parameter: client_id"

Cette erreur signifie que les variables d'environnement ne sont pas correctement configurées. Vérifiez que :
- Le fichier `.env` existe à la racine du projet
- Les variables `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` sont définies
- Le serveur a été redémarré après l'ajout des variables

### Erreur "redirect_uri_mismatch"

Cette erreur signifie que l'URL de redirection dans Google Cloud Console ne correspond pas à celle dans votre `.env`. Vérifiez que :
- L'URL dans `GOOGLE_REDIRECT_URI` correspond exactement à celle configurée dans Google Cloud Console
- L'URL inclut le protocole (`http://` ou `https://`)
- L'URL inclut le port si nécessaire (`:4002`)
