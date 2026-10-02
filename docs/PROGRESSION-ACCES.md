# Accès privé et progression — 0.6

## Trois administrateurs

Pendant le développement, `AKASHA_ACCESS=private` (valeur par défaut) impose un compte administrateur. Les comptes autorisés sont `caiin`, `bopin` et `superphantome` ; la casse n’a pas d’importance à la connexion. Le rôle est stocké côté serveur. Aucun formulaire ne permet de s’attribuer ce rôle, de modifier son XP ou de créer un quatrième administrateur.

Le site montre uniquement la connexion et la récupération avant authentification. Les inscriptions et sessions invitées sont refusées. Les anciens jetons invités et comptes non administrateurs sont également refusés sur les API et Socket.IO, y compris depuis un ancien APK. Les fichiers de l’interface et la page de connexion restent téléchargeables : les données et les parties sont protégées par le serveur. Les anciens APK qui ne disposent pas du parcours de connexion actuel devront être mis à jour ; en attendant, utiliser le site sur téléphone.

Les nouveaux administrateurs doivent remplacer leur mot de passe temporaire avant d’accéder au jeu. Ils obtiennent alors un nouveau code de secours à conserver. La récupération du compte reste accessible. Un administrateur conserve son mot de passe, ses amis, son historique et sa photo s’il possédait déjà un compte.

L’outil `server/provision-admins.ts` est réservé à l’entretien du serveur, sans route web. Il exige exactement trois pseudos distincts, crée les comptes manquants et attribue les trois rôles. Les autres comptes perdent le rôle administrateur. Il écrit les identifiants dans un **nouveau fichier privé** désigné par `AKASHA_ADMIN_OUTPUT` (permissions Unix 0600), jamais dans les logs. Conserver ce fichier hors Git et transmettre individuellement les identifiants. Relancer l’outil préserve les mots de passe existants ; il ne peut pas les restituer.

Avant toute migration : sauvegarder PostgreSQL et vérifier l’absence de partie en cours. Avant de fermer l’accès pour la première fois : préparer les trois comptes, puis redémarrer l’application pour couper les anciennes connexions. Pour rouvrir plus tard, définir explicitement `AKASHA_ACCESS=public` et redémarrer ; les rôles et données restent conservés.

## XP

Chaque compte commence au niveau 1 avec 0 XP. Les anciennes parties ne rapportent pas d’XP rétroactivement. Une partie terminée rapporte 30 XP de participation et 10 XP par bonne réponse. En duel, la victoire ajoute 30 XP, l’égalité 15 XP. La rapidité n’influence que le score du match.

Le passage du niveau N au niveau N+1 coûte `200 + 50 × (N−1)` XP. Le surplus est conservé. Le bandeau affiche le niveau réel, et le résultat détaille l’XP gagnée, anime la progression et signale un changement de niveau. Pièces, trophées, titres et cadres de récompense restent à venir.

Un joueur qui abandonne gagne 0 XP. Son adversaire reçoit 3 XP par manche déjà corrigée et 10 XP par bonne réponse sur ces manches, sans bonus de victoire. Un joueur n’ayant répondu à aucune question gagne 0 XP. Une déconnexion temporaire seule n’est pas un abandon. Les questions en cours, non corrigées, ne comptent pas dans un duel interrompu.

`akasha_xp_awards` conserve chaque récompense et son détail, avec une clé unique `(match_id, player_id)`. Le résultat, la récompense et l’incrément du total sont enregistrés dans une seule instruction transactionnelle. Les comptes sont verrouillés dans un ordre stable pendant l’attribution ; les doubles sauvegardes, reconnexions et redémarrages ne cumulent pas deux fois l’XP. L’API de récompense ne retourne que celle du compte connecté. Le total est dans `akasha_accounts.total_xp`. Les sauvegardes complètes PostgreSQL couvrent ces données.

## Développement et tests

La production et la base locale restent séparées. Pour travailler uniquement sur l’aperçu local avec inscription/invités, lancer le serveur de développement avec `AKASHA_ACCESS=public` ; le serveur reste lié à `127.0.0.1`. Cette option n’est jamais activée automatiquement par `AKASHA_TEST_MODE` ni par l’environnement de développement. Les tests des anciens parcours publics demandent cette option explicitement, et le test privé utilise le verrouillage réel par défaut.

`npm run check` couvre les paliers, les règles d’XP, les attributions concurrentes, la reprise, les trois administrateurs, les mots de passe temporaires, les comptes non autorisés et les anciens jetons. Le parcours navigateur privé couvre la première connexion, le code de secours, le Solo, le passage de niveau et la déconnexion. La CI vérifie également la persistance avec PostgreSQL.
