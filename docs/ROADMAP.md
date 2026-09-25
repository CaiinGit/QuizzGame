# Akasha — feuille de route

## Périmètre actuel : 1v1 One Piece

Décision du 25 septembre 2026 : Akasha remplace le nom de travail QuizzGame. Palette beige/verte, emblème réservé à l’icône du téléphone. Une seule fonctionnalité mise en avant : le duel entre amis sur One Piece.

La version 0.2 fournit les salons, invitations, readiness, dix questions communes, chronomètre serveur, correction, scores, abandon et reprise. Les anciennes expéditions, défis quotidiens, survie, monnaies et progressions ne font plus partie du parcours actuel.

## Prochaine étape : test entre amis

1. Valider l’APK sur les deux téléphones.
2. Finaliser l’accès HTTPS au serveur maison et tester depuis deux domiciles.
3. Tester les interruptions réseau et les retours de veille Android.
4. Recueillir les retours : lisibilité, rythme, difficulté et compréhension du score.
5. Enrichir progressivement les questions One Piece, avec revue des ambiguïtés et des spoilers.

## Base à consolider ensuite

- Signature Android stable, distribution et mises à jour.
- Vrais comptes et récupération du profil sur un nouveau téléphone.
- Sauvegardes automatiques surveillées et restauration vérifiée.
- Suivi des erreurs, accessibilité TalkBack, tests sur plusieurs appareils.
- Adresse publique dédiée lorsque l’accès privé de test devient insuffisant.
- Stockage éditorial des questions et outils de relecture.

L’hébergement actuel est prévu pour un seul processus et PostgreSQL. Multiplier les instances nécessitera un coordinateur de duels partagé ; la base seule ne synchronise pas les serveurs de jeu. Les sessions de test expirent au bout de 30 jours et les duels de plus de sept jours sont nettoyés au démarrage.

Les autres thèmes et mécaniques RPG seront réintroduits seulement sur décision explicite, progressivement. Les idées historiques restent dans Notion et l’historique Git.
