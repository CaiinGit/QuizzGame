# QuizzGame — progression du projet

## Direction

Application Android de quiz avec progression RPG, inspirée des idées du projet : duels classiques et classés (10 questions, 20 secondes), survie, Daily, guildes, raids et tournois avec une variante Rumble. Le nom définitif reste ouvert.

## Étape 1 · Prototype solo

Implémenté : trois modes solo, six univers, 60 questions, progression, profil, succès, historique, sauvegarde locale et projet Android. Tests du moteur et parcours navigateur sur petits écrans. CI prévue pour compiler un APK à chaque changement de `main`.

Limites : pas de serveur ni de comptes ; la survie utilise la banque disponible ; aucune protection compétitive contre la modification des données locales. La vérification sur téléphone Android physique et avec TalkBack reste à faire. L’intégration native ne transforme pas les tests navigateur en tests sur appareil.

## Étape 2 · Contenu et comptes

1. Choisir le fournisseur de comptes et de base de données, après évaluation des coûts et de la région d’hébergement.
2. Créer les tables profils, thèmes, questions, choix, parties, réponses et mouvements d’XP.
3. Migrer la sauvegarde locale vers un compte sans attribuer de classement compétitif à des résultats non vérifiés.
4. Préparer une interface d’administration avec brouillons, validation éditoriale, difficultés, sources et signalements.
5. Ajouter progressivement Pokémon, Dragon Ball, séries, musique, Marvel, DC, sport et automobile.

Validation : connexion et récupération de compte, synchronisation sur deux appareils, migration testée, questions versionnées et vérifiées.

## Étape 3 · Duels et rangs

Le serveur devra choisir les questions, masquer les bonnes réponses jusqu’à la résolution, décider des délais et attribuer les points. Les clients envoient des choix, pas des scores. Traiter les déconnexions, reprises, abandons et égalités avant de lancer le classé.

1. Salons privés et duel classique 1v1.
2. Matchmaking et reconnexion.
3. Tests de deux clients simultanés et anti-rejeu.
4. Rangs bronze, argent, or et saisons avec règles publiques.

Validation : même question et même échéance chez les deux joueurs ; aucune récompense doublée ; classement recalculable depuis les résultats serveur.

## Étape 4 · Communauté et événements

Guildes, titres par catégorie, raids de boss, tournois puis pouvoirs Rumble. Le chat nécessite des signalements, blocages, limitations de fréquence et modération ; une simple liste de mots interdits ne suffit pas.

## Décisions techniques

- React + TypeScript : interface tactile avec moteur indépendant de l’affichage.
- Capacitor : projet Android natif embarquant le jeu, accès au cycle de vie et au stockage natif.
- Préférences natives : adaptées à un petit profil ; une base locale deviendra préférable pour une banque volumineuse et les synchronisations.
- Aucun compte, analytique, achat ou API extérieure dans le prototype.
- Tests automatisés du moteur, des parcours et compilation APK dans GitHub Actions.

## Avant une diffusion régulière

Signature de distribution stable conservée hors du dépôt, stratégie de migrations, tests de mise à jour sans perte de progression, validation sur Android réel, accessibilité TalkBack, relecture du contenu et suivi des exigences Google Play. Ne pas ajouter de monétisation tant que le cycle de jeu n’a pas été essayé.
