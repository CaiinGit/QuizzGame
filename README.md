# QuizzGame · Android

Une application de quiz avec une ambiance RPG : tes connaissances font progresser ton héros. **QuizzGame est un nom de travail.**

## Première version

- **Expédition** : 10 questions sur les univers de ton choix.
- **Survie** : trois vies, sans répétition, jusqu’au bout de la banque choisie (10 à 60 questions).
- **Défi quotidien** : 10 questions sur tes favoris, une tentative par jour sur cet appareil.
- 60 questions originales en français : One Piece, jeux vidéo, cinéma, histoire, géographie et sciences.
- Corrections expliquées, XP, niveaux, pièces, quatre succès, maîtrise d’un thème et historique.
- Personnalisation du nom et de l’emblème ; chrono facultatif hors défi quotidien.
- Sauvegarde native Android, y compris pendant une partie. Aucune connexion nécessaire après installation.

Il s’agit d’un **prototype solo**, sans compte, serveur, boutique ni multijoueur. Les duels, guildes, tournois et raids sont dans la [feuille de route](docs/ROADMAP.md). Aucun classement ou joueur fictif n’est présenté comme réel.

## Installer sur un téléphone Android

1. Ouvrir [Actions → Android - Tests et APK](https://github.com/CaiinGit/QuizzGame/actions/workflows/android.yml).
2. Choisir une exécution réussie et télécharger l’artefact **QuizzGame-Android-debug** (connexion GitHub nécessaire).
3. Extraire le ZIP puis transférer `app-debug.apk` sur le téléphone.
4. Ouvrir le fichier, autoriser si demandé l’installation depuis cette source, puis installer.

Cet APK de développement n’est pas une publication Google Play. Il utilise une signature de test ; deux exécutions CI peuvent utiliser des signatures différentes, nécessitant une désinstallation avant réinstallation, ce qui efface la progression. Une clé de signature stable et privée sera nécessaire avant les distributions régulières. Android 6+ est la cible minimale du projet ; la compatibilité réelle dépend aussi d’un Android System WebView récent. La validation sur téléphone physique reste à effectuer.

## Développer

Node.js 20.11+ (Node 22 recommandé), npm. Pour compiler Android : JDK 21, Android SDK 35 / Android Studio 2024.2.1 ou ultérieur.

```sh
npm ci
npm run dev
```

L’aperçu web local est disponible sur `http://127.0.0.1:5173`. Il sert au développement ; l’application Android embarque les fichiers compilés, sans dépendre de ce serveur.

```sh
npm run check             # moteur de jeu + TypeScript + compilation
npx playwright install chromium
npm run test:e2e          # parcours au format téléphone
npm run android:sync     # compilation et copie dans le projet Android
npm run android:open     # ouverture dans Android Studio
```

Depuis `android/`, `./gradlew assembleDebug` (macOS/Linux) ou `./gradlew.bat assembleDebug` (Windows) produit `app/build/outputs/apk/debug/app-debug.apk`. Le SDK doit être indiqué dans `ANDROID_HOME` ou dans un fichier local `android/local.properties` non versionné.

## Architecture

| Emplacement                     | Rôle                                                                   |
| ------------------------------- | ---------------------------------------------------------------------- |
| `src/game.ts`                   | Moteur déterministe, chrono, récompenses et validation des sauvegardes |
| `src/data.ts`                   | Banque éditoriale française embarquée                                  |
| `src/storage.ts`                | Sauvegarde sérialisée avec Capacitor Preferences                       |
| `src/App.tsx`                   | Écrans, navigation et interactions                                     |
| `src/Artwork.tsx`               | Illustration vectorielle originale intégrée                            |
| `android/`                      | Application native Capacitor                                           |
| `.github/workflows/android.yml` | Tests et production d’un APK de test                                   |

Interface React/TypeScript et Vite, emballage natif Capacitor 7. Les polices système, illustrations et questions sont disponibles hors ligne. Les icônes proviennent de Lucide.

## Règles du prototype

- 20 secondes par question chronométrée. Le délai absolu continue si l’application passe en arrière-plan ; une question expirée devient incorrecte à la reprise.
- Les récompenses sont attribuées une seule fois à la fin : 15 XP par bonne réponse + 25 XP de fin ; 3 pièces par bonne réponse + 20 si parfait, sinon 5.
- Un niveau tous les 250 XP. Une partie abandonnée ne donne rien.
- Le défi utilise la date locale, se consomme dès son lancement et peut être repris. Sans serveur, l’horloge et le stockage de l’appareil ne peuvent pas être considérés comme fiables pour une compétition.
- La sauvegarde est locale et versionnée. Un contenu illisible est conservé dans une copie de secours avant création d’un profil neuf ; les erreurs de stockage sont affichées.
- Les pièces n’ont pas encore d’usage, les niveaux sont une progression solo et la banque de survie n’est pas infinie.

Voir [l’architecture et les prochaines étapes](docs/ROADMAP.md). Avant diffusion publique : enrichissement et revue éditoriale des questions, tests sur appareils physiques, signature stable, accessibilité avec TalkBack et vérification des exigences Google Play.
