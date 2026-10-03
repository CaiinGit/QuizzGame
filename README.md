# Akasha · Android

Un quiz **Classique en 1 contre 1 ou en Solo**, sur **One Piece**. Interface beige et verte ; l’emblème couronne/A est réservé à l’icône Android. Le dépôt conserve son nom historique `QuizzGame`.

## Version 0.7

Profil avec statistiques Solo et duel séparées, favoris de thèmes synchronisés entre appareils et statuts des amis en temps réel. Les favoris de l’accueil ouvrent le choix du mode avec One Piece déjà sélectionné. Voir [profil, favoris et amis](docs/PROFIL-FAVORIS-AMIS.md).

Les parties affichent un départ animé 3–2–1 synchronisé sur le serveur, les joueurs prêts et des transitions courtes entre les questions. Un bandeau confirme la réponse enregistrée, puis indique bonne réponse, erreur ou temps écoulé avec les points effectivement gagnés. Le bilan rassemble les scores côte à côte, les bonnes réponses, l’XP et le détail par question. **Revanche** permet aux comptes de rejouer contre le même adversaire après son acceptation ; la demande peut être refusée ou annulée depuis le bilan. Les animations respectent la préférence de réduction des mouvements. Des effets sonores discrets accompagnent les clics, la navigation, les réponses et les nouvelles demandes d’amis ou invitations. Ils commencent après une interaction et peuvent être désactivés dans Réglages ; ce choix est mémorisé sur l’appareil. Aucune vibration.

## Version 0.6

Accès privé réservé à trois administrateurs, mot de passe personnel obligatoire après la première connexion, XP persistante et niveaux avec bilan de fin de partie. Voir [accès privé et progression](docs/PROGRESSION-ACCES.md). Les inscriptions et invités sont fermés par défaut, y compris pour les anciens clients.

## Version 0.5

Comptes persistants avec pseudo unique, mot de passe et code de secours ; nom et photo synchronisés entre appareils ; historique personnel durable ; amis avec demandes et invitations ; revanche après un duel. Le bouton rond **Mes amis** se trouve à droite du portail. Voir [le fonctionnement des comptes](docs/COMPTES.md). Le mode invité est disponible uniquement si le serveur est explicitement rouvert au public. La version web est mise à jour sur le serveur ; une ancienne installation Android conserve son interface jusqu’à sa prochaine mise à jour.

## Versions précédentes

APK 0.4.2 (code Android 6) : réponse enregistrée mise en évidence, écran de question allégé et bilan final question par question avec les choix et points des deux joueurs. Le bilan est sauvegardé côté serveur et disponible après reconnexion ; seules les questions déjà corrigées figurent dans un duel interrompu. Les anciennes parties sans historique ne peuvent pas être reconstituées.

APK 0.4.0 (code Android 4) : nouveau cadre de portrait blanc/cyan en pixel art, interfaces actualisées, Classique Solo, points selon le temps de réponse et chrono fluide. Le serveur doit également être à jour pour le Solo et le nouveau barème.

APK 0.4.1 (code Android 5) : connexion par défaut à `https://akashaquiz.com`, domaine public stable via Cloudflare Tunnel, sans Tailscale.

- Accueil avec portail frontal isolé en pixel art, palette beige et verte.
- Bandeau joueur vert (clair) ou jaune orangé (sombre), photo personnelle importable depuis la galerie ou les fichiers. Les photos sont recadrées au centre et réduites à 320 × 320 : locales en mode invité, sauvegardées sur le serveur avec un compte.
- Roue dentée : réglages avec mode sombre gris `#303030` et jaune orangé `#FFA800`, choix mémorisé ; connexion au serveur dans une section dépliable.
- Emplacements pièces, trophées et notifications : présentations « À venir », sans progression simulée, solde inventé ni achat actif.
- Barre du bas : **Classement · Accueil · Thèmes · Boutique**, icônes pixel en relief et fond identique au bandeau joueur ; masquée dans les salons et duels. Classement et Boutique affichent « À venir ».
- Profil accessible par la photo du bandeau ; changement de photo depuis la page Profil.
- Grand bouton **JOUER** au pied du portail, vert en clair et jaune orangé en sombre : ouvre la sélection des modes. L’onglet **Thèmes** ouvre directement la sélection des thèmes, avec One Piece.
- Modes et thèmes : grille de deux colonnes, cases compactes en relief avec logo au-dessus du nom, vertes en clair et jaune orangé en sombre. Classique reprend l’image d’épées fournie ; One Piece utilise le logo tête de mort au chapeau de paille fourni, également affiché dans les favoris et sur l’écran de lancement. Les cases « À venir » sont désactivées. L’ancienne illustration d’île n’est plus affichée.
- Accueil : bouton **Défi du jour** et trois cases de thèmes favoris au-dessus du portail ; le défi du jour reste à venir.
- Parcours de duel conservé : **Classique → One Piece → Créer un duel / Rejoindre un ami** ; pseudo demandé au premier besoin et mémorisé.
- Parcours individuel : **JOUER → Solo → One Piece → Commencer en solo**. Même moteur et même barème que le duel, démarrage sans adversaire, résultat individuel, reconnexion et abandon pris en charge. Le Solo nécessite lui aussi le serveur.
- Retours Android et navigateur, petits écrans et dialogues accessibles pris en charge.
- Illustrations et provenance : [direction artistique](docs/ART.md).

- Création d’un salon et invitation par code à six caractères.
- En duel, deux joueurs connectés confirment qu’ils sont prêts ; le Solo démarre directement son décompte.
- Dix questions communes, réponses mélangées de façon identique, vingt secondes par question.
- Bonne réponse : score décroissant linéairement de 1 000 à 0 pendant le chrono (1 000 au départ, 750 à 5 s, 500 à 10 s, 250 à 15 s). Mauvaise réponse ou temps écoulé : 0. Le nombre de points réellement gagné est affiché à la correction.
- Barre du chrono animée à chaque image à partir de l’échéance et de la durée envoyées par le serveur, y compris après reconnexion.
- Corrections communes, scores et résultat calculés exclusivement par le serveur.
- Reconnexion, sauvegarde des duels et reprise après redémarrage du serveur.
- Abandon, égalité, salon complet ou expiré et erreurs de connexion gérés.

La banque PostgreSQL contient initialement dix questions de test One Piece. Les nouvelles parties tirent uniquement les questions publiées ; les brouillons et les archives sont exclus. La structure est prête pour les futurs contenus, dont le format d’import sera défini plus tard : voir [la banque de questions](docs/QUESTIONS.md). Pièces, succès et autres thèmes restent à venir. Les comptes sont récupérables avec leur code de secours ; les profils invités restent liés à leur appareil. Une connexion au serveur est nécessaire.

Le score d’une bonne réponse est `ceil(1000 × temps restant / durée de la question)`, borné entre 0 et 1 000, avec au moins 1 point avant l’échéance. La date de réception est enregistrée par le serveur avant sa file de sauvegarde ; les dates et points envoyés par le client sont ignorés. La latence réseau compte donc dans le délai de réception. Deux réponses dans la même tranche d’un point peuvent donner le même score. Les doubles clics ne changent ni le premier choix ni son horodatage. Les anciennes réponses sauvegardées sans horodatage conservent leur ancien crédit ; les nouvelles utilisent le barème temporel.

## Installer l’APK

1. Ouvrir [Actions → Android - Tests et APK](https://github.com/CaiinGit/QuizzGame/actions/workflows/android.yml).
2. Ouvrir la dernière exécution réussie et télécharger **Akasha-Android-debug** (connexion GitHub requise).
3. Extraire le ZIP, transférer `app-debug.apk` sur le téléphone, l’ouvrir et autoriser l’installation depuis cette source si Android le demande.
4. Ouvrir Akasha. L'APK 0.4.1 utilise `https://akashaquiz.com` par défaut. Si l'ancienne adresse est mémorisée, la remplacer dans Réglages → Connexion au serveur. Les deux joueurs doivent utiliser le même serveur ; Tailscale n'est plus nécessaire.

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

L'accès public utilise [Cloudflare Tunnel avec le domaine akashaquiz.com](docs/CLOUDFLARE.md). L'adresse est stable après redémarrage. Le serveur et PostgreSQL fonctionnent indépendamment du PC de développement ; celui-ci conserve son aperçu et sa base de test séparés.

| Dossier               | Rôle                                                           |
| --------------------- | -------------------------------------------------------------- |
| `src/`                | Interface React, connexion Socket.IO et profil local Capacitor |
| `server/engine.ts`    | Règles, temps, réponses et scores contrôlés par le serveur     |
| `server/questions.ts` | Dix questions de test, utilisées une seule fois à l’initialisation |
| `server/question-bank.ts` | Banque PostgreSQL privée : validation, statuts et tirage des questions |
| `server/database.ts`  | Sessions et états de duels persistés dans PostgreSQL           |
| `server/accounts.ts` | Comptes, sessions, récupération et photos                      |
| `server/social.ts` | Relations d’amitié et invitations persistantes                   |
| `shared/`             | Données publiques échangées avec l’application                 |
| `tests/`              | Parcours avec deux navigateurs au format téléphone             |
| `android/`            | Application native Android Capacitor 7                         |
| `compose*.yaml`       | Services dédiés, accès privé Tailscale ou HTTPS public Caddy   |

Une seule instance du serveur gère les mutations en série et confirme chaque changement après sauvegarde. Les jetons aléatoires des profils sont conservés sous forme hachée en base. Les réponses correctes sont envoyées uniquement pendant la correction. L’API limite les tailles de requête et le nombre de tentatives. PostgreSQL n’est pas exposé sur le réseau public.

Les tests couvrent le moteur, deux vrais clients Socket.IO, la confidentialité des réponses, les doubles clics, les délais, les reconnexions et le redémarrage. La CI teste aussi le stockage PostgreSQL. La validation physique sur deux téléphones et réseaux différents reste nécessaire.
