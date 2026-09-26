# Akasha · Android

Un quiz **1 contre 1 entre amis**, exclusivement sur **One Piece**. Interface beige et verte ; l’emblème couronne/A est réservé à l’icône Android. Le dépôt conserve son nom historique `QuizzGame`.

## Version 0.3

- Accueil avec portail frontal isolé en pixel art, palette beige et verte.
- Bouton lune/soleil en haut à gauche : mode sombre gris `#303030` et bleu `#92AAE1`, choix mémorisé sur l’appareil.
- Barre du bas : **Mode · Accueil · Profil**, masquée dans les salons et duels.
- Parcours **Mode → Classique → One Piece → Créer un duel**.
- Accès direct **Rejoindre un ami** depuis l’accueil ; pseudo demandé au premier besoin et mémorisé.
- Retours Android et navigateur, petits écrans et dialogues accessibles pris en charge.
- Illustrations et provenance : [direction artistique](docs/ART.md).

- Création d’un salon et invitation par code à six caractères.
- Deux joueurs connectés, chacun confirme qu’il est prêt.
- Dix questions communes, réponses mélangées de façon identique, vingt secondes par question.
- 1 000 points par bonne réponse, sans avantage lié à la vitesse du réseau.
- Corrections communes, scores et résultat calculés exclusivement par le serveur.
- Reconnexion, sauvegarde des duels et reprise après redémarrage du serveur.
- Abandon, égalité, salon complet ou expiré et erreurs de connexion gérés.

La banque initiale contient dix questions One Piece. Les anciens modes solo, niveaux, pièces, succès et autres thèmes ont été retirés du parcours. Les profils sont des profils de test, pas encore des comptes récupérables. Une connexion au serveur est nécessaire.

## Installer l’APK

1. Ouvrir [Actions → Android - Tests et APK](https://github.com/CaiinGit/QuizzGame/actions/workflows/android.yml).
2. Ouvrir la dernière exécution réussie et télécharger **Akasha-Android-debug** (connexion GitHub requise).
3. Extraire le ZIP, transférer `app-debug.apk` sur le téléphone, l’ouvrir et autoriser l’installation depuis cette source si Android le demande.
4. Ouvrir Akasha. Si aucune adresse n’est préconfigurée, saisir l’URL HTTPS du serveur dans les réglages. Les deux joueurs doivent utiliser le même serveur.

L’identifiant Android reste `com.caiin.quizzgame` pour préserver la continuité du projet ; le nom affiché devient Akasha. Cet APK utilise une signature de développement, susceptible de changer entre deux compilations CI. Si Android refuse une mise à jour pour signature différente, désinstaller l’ancienne version avant installation efface ses données locales. Avant diffusion régulière, configurer une clé de signature stable privée.

## Développement

Node.js 20.11+ (22 recommandé) et npm. Pour Android : JDK 21 et SDK Android 35.

```sh
npm ci
npm run dev
```

L’interface est disponible sur `http://127.0.0.1:5173`, le serveur sur le port 3001. En développement, PGlite conserve une base PostgreSQL embarquée dans `work/akasha-db`. En production, `DATABASE_URL` désigne PostgreSQL et `ALLOWED_ORIGINS` doit être défini.

```sh
npm run check
npx playwright install chromium
npm run test:e2e
npm run android:sync
npm run android:open
```

`VITE_SERVER_URL` permet d’intégrer une adresse HTTPS par défaut dans l’APK avant `android:sync`. Le réglage de connexion reste disponible dans l’application. Depuis `android/`, `./gradlew assembleDebug` crée `app/build/outputs/apk/debug/app-debug.apk`.

## Hébergement et architecture

Voir le [guide pour SERVEUR Valentin](docs/HEBERGEMENT.md) et la [feuille de route](docs/ROADMAP.md).

| Dossier               | Rôle                                                           |
| --------------------- | -------------------------------------------------------------- |
| `src/`                | Interface React, connexion Socket.IO et profil local Capacitor |
| `server/engine.ts`    | Règles, temps, réponses et scores contrôlés par le serveur     |
| `server/questions.ts` | Banque privée : aucune correction embarquée dans l’APK         |
| `server/database.ts`  | Sessions et états de duels persistés dans PostgreSQL           |
| `shared/`             | Données publiques échangées avec l’application                 |
| `tests/`              | Parcours avec deux navigateurs au format téléphone             |
| `android/`            | Application native Android Capacitor 7                         |
| `compose*.yaml`       | Services dédiés, accès privé Tailscale ou HTTPS public Caddy   |

Une seule instance du serveur gère les mutations en série et confirme chaque changement après sauvegarde. Les jetons aléatoires des profils sont conservés sous forme hachée en base. Les réponses correctes sont envoyées uniquement pendant la correction. L’API limite les tailles de requête et le nombre de tentatives. PostgreSQL n’est pas exposé sur le réseau public.

Les tests couvrent le moteur, deux vrais clients Socket.IO, la confidentialité des réponses, les doubles clics, les délais, les reconnexions et le redémarrage. La CI teste aussi le stockage PostgreSQL. La validation physique sur deux téléphones et réseaux différents reste nécessaire.
