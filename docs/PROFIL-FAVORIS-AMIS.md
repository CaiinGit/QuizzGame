# Profil, favoris et disponibilité — 0.7

## Profil

Le profil rassemble la photo, le pseudo, le niveau, la progression d’XP, les statistiques et l’accès à l’historique. Les statistiques sont calculées sur l’ensemble de l’historique personnel sauvegardé, indépendamment de la pagination de l’écran « Mes parties ».

- **Duel** : parties jouées, victoires, défaites, égalités et pourcentage de bonnes réponses. Les duels terminés par abandon comptent dans les victoires/défaites ; un salon annulé avant le début n’est pas compté.
- **Solo** : parties jouées, terminées, interrompues et pourcentage de bonnes réponses. Aucun résultat de duel n’est mélangé au Solo.
- **Réussite** : bonnes réponses divisées par les questions corrigées, arrondies au pourcentage entier. Une question corrigée sans réponse compte dans le dénominateur. Une question interrompue avant correction n’y entre pas. Sans question corrigée, afficher « — » plutôt qu’un taux inventé.

Les données sont lues côté serveur dans `akasha_match_history`, uniquement pour le compte authentifié. Un compte ne peut pas demander les statistiques privées d’un autre. Les anciens résultats encore présents sont inclus ; les parties déjà supprimées avant l’arrivée de l’historique ne peuvent pas être reconstituées.

## Thèmes favoris

L’étoile de la page Thèmes ajoute ou retire One Piece des favoris. Les trois cases de l’accueil affichent les favoris dans leur ordre d’ajout. Une case vide ouvre la sélection des thèmes. Un favori ouvre directement le choix Classique/Solo, puis l’écran de lancement pour ce thème. Le thème reste sélectionné après rechargement de cet écran.

La liste est stockée dans `akasha_accounts.favorites`, avec trois éléments maximum. La route authentifiée applique un ajout/retrait atomique et idempotent, valide le thème contre le catalogue partagé et renvoie le profil actualisé aux autres appareils du même compte. One Piece est actuellement le seul thème disponible ; les autres emplacements restent libres.

## Amis

Le bouton rond de l’accueil porte une pastille additionnant les demandes d’amitié reçues et les invitations à jouer encore valides. Les invitations expirées disparaissent de l’interface ; le serveur vérifie aussi l’expiration lorsqu’une acceptation arrive. Ce sont des notifications internes à l’application.

Les statuts sont **En ligne**, **Hors ligne**, **Dans un salon** et **En partie**. Ils sont calculés à partir des connexions et des salons côté serveur, puis transmis aux amis lors des changements. Un joueur encore engagé après une déconnexion est indiqué « déconnecté » à côté de son activité. Un autre appareil connecté conserve son statut en ligne.

Un ami dans un salon ou une partie ne peut pas recevoir de nouvelle invitation directe : le bouton est désactivé et le serveur refuse aussi une demande provenant d’un ancien écran. Une invitation déjà envoyée affiche « Invité ». Un ami hors ligne et disponible peut toujours recevoir une invitation, valable cinq minutes.

## Validation et déploiement

Les tests vérifient l’accès privé, les calculs séparés Solo/duel, les absences de réponse, l’historique sans doubles comptes, l’ajout/retrait de favoris, leur persistance et leur synchronisation entre appareils, les transitions de présence et le refus d’inviter un joueur occupé. Les parcours navigateur couvrent aussi les deux palettes, les petits écrans et les raccourcis des favoris.

La migration ajoute une colonne avec une liste vide par défaut. Les mots de passe, rôles administrateurs, photos, historiques et totaux d’XP sont préservés. La gestion éditoriale des questions n’est pas incluse dans cette version.
