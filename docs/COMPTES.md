# Comptes, amis et historique — 0.5

## Parcours joueur

- Ouvrir la photo de profil, puis **Créer un compte** ou **Me connecter**. Le jeu invité reste accessible pour tester rapidement.
- Le pseudo unique de connexion utilise 3 à 20 lettres sans accents, chiffres ou underscores. Il ne dépend pas de la casse. Le nom affiché peut ensuite être modifié, avec accents, sans changer l’identifiant de connexion.
- Choisir un mot de passe de 8 à 128 caractères. Une phrase est acceptée.
- Conserver le **code de secours**, affiché après inscription. Il permet de définir un nouveau mot de passe depuis **Mot de passe oublié ?** sans service d’e-mail. Chaque récupération et chaque changement de mot de passe révoquent les anciennes sessions et délivrent un nouveau code ; le précédent cesse de fonctionner.
- Le pseudo affiché et la photo sont sauvegardés sur le serveur et synchronisés entre appareils connectés. Une inscription depuis un profil invité rattache son identité, ses résultats encore disponibles et sa photo locale au compte. Se connecter à un autre compte ne fusionne pas les historiques.
- **Mes parties**, dans le profil, affiche les résultats personnels et les réponses question par question. Les salons annulés avant le début du jeu n’y figurent pas.
- Le petit bouton rond à droite du portail ouvre **Mes amis**. Ajouter un joueur par son pseudo unique ; il doit accepter la demande. Les demandes peuvent être annulées ou refusées, et les amis retirés.
- **Inviter** ouvre un salon réservé à l’ami choisi et lui envoie une invitation valable cinq minutes. L’ami peut la recevoir dans l’application après reconnexion tant qu’elle n’a pas expiré. Il ne s’agit pas de notifications Android quand l’application est fermée. Chaque joueur confirme ensuite qu’il est prêt.
- Après un duel entre deux comptes, **Demander une revanche** propose un nouveau duel au même adversaire. Une seule invitation commune est créée si les deux joueurs la demandent. L’acceptation ouvre un nouveau salon ; les scores et le bilan du duel précédent sont conservés.

## Stockage et accès

PostgreSQL conserve `akasha_accounts`, `akasha_account_sessions`, `akasha_friendships`, `akasha_invitations` et `akasha_match_history`. La base de développement reste séparée de la base de production. Les sauvegardes existantes de toute la base incluent ces tables.

Les mots de passe sont hachés avec scrypt (`N=65536, r=8, p=2`, sel aléatoire), l’un des paramètres minimaux proposés par [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). Les sessions aléatoires et codes de secours de forte entropie sont stockés uniquement sous forme d’empreintes SHA-256. Les sessions expirent au bout de 30 jours ; la déconnexion révoque l’appareil courant. La récupération ou le changement de mot de passe déconnectent tous les anciens appareils, y compris les sockets déjà ouverts. Les opérations de connexion sont limitées en fréquence et en calculs simultanés.

Les photos sont décodées et réencodées côté serveur en WebP 320 × 320, ce qui retire les métadonnées du fichier original. Les images et identifiants privés du compte sont renvoyés uniquement au propriétaire authentifié ; la liste d’amis expose le pseudo, le nom et la présence, sans code de secours, mot de passe ou jeton.

L’historique est enregistré atomiquement avec la fin de la partie. Il contient uniquement le résultat public et les questions déjà corrigées, jamais les réponses des questions non jouées. Chaque consultation est filtrée sur l’identité du participant : un autre compte ne peut pas lire ce bilan. L’historique reste conservé lorsque les anciens salons techniques sont supprimés après sept jours.

La migration récupère les résultats des salons terminés encore présents lors de la mise à jour. Elle ne peut pas reconstituer les parties déjà supprimées ni les réponses antérieures à l’ajout du bilan détaillé. La date des anciens résultats correspond à la dernière sauvegarde disponible du salon ; les nouvelles parties enregistrent leur date de fin.

## Vérification

`npm run check` teste notamment le rattachement invité, deux sessions du même compte, la photo partagée, l’accès privé aux résultats, les demandes d’amis, les salons réservés, les invitations expirées/refusées, la revanche simultanée, la récupération à usage unique et la reprise après redémarrage. Les tests utilisent PostgreSQL en CI et PGlite en local. Les parcours navigateur couvrent aussi ces écrans, les deux palettes et les petits téléphones.
