# Banque de questions

Les parties Solo et Classique tirent leurs questions dans PostgreSQL sur le serveur Akasha. Le développement utilise sa propre base PGlite locale. Un Google Sheet peut alimenter le thème One Piece en lecture seule ; aucun accès Google n’est effectué depuis les téléphones.

## Structure

- `akasha_themes` : identifiant, nom, activation et dates de création/modification. Un thème désactivé ne peut pas fournir de questions à une nouvelle partie.
- `akasha_questions` : identifiant stable, thème, énoncé, quatre propositions, index de la bonne réponse (0 à 3), explication, difficulté facultative (`easy`, `medium`, `hard`, `very_hard`, `expert`), spoiler, référence/source facultative, statut et dates. Les imports conservent aussi l’identifiant du document et celui de la question dans le Sheet.
- `akasha_question_sync` : dernière tentative, dernière application réussie et bilan des erreurs par onglet/ligne. Ce bilan n’est pas exposé publiquement.
- `akasha_migrations` : trace des initialisations déjà appliquées.

Une nouvelle question est un **brouillon** (`draft`) par défaut : son texte, ses propositions et sa correction peuvent encore être incomplets. Seules les questions **publiées** (`published`) sont jouables. La publication exige un énoncé, quatre propositions non vides et distinctes et une bonne réponse. Une question **archivée** (`archived`) est conservée sans être tirée. Ces règles sont contrôlées par le serveur et par les contraintes PostgreSQL.

## Initialisation et parties

Au premier démarrage avec cette version, les dix questions de test de `server/questions.ts` sont copiées dans le thème One Piece, activé. Cette opération est marquée et ne se répète pas : un redémarrage ne remplace pas une modification, ne republie pas une question archivée et ne recrée pas une question supprimée. Le fichier reste uniquement une source d’initialisation et une fixture de tests.

Chaque nouvelle partie tire dix questions publiées distinctes au hasard, puis mélange leurs propositions côté serveur. Il faut au moins dix questions publiées pour lancer une partie ; sinon un message explique l’indisponibilité. Il n’existe pas de repli silencieux vers les anciennes questions du code.

Le choix de difficulté filtre ce tirage côté serveur : `all` mélange tous les niveaux publiés (y compris les anciennes questions sans difficulté), tandis que `easy`, `medium`, `hard`, `very_hard` et `expert` ne tirent que leur niveau exact. Le seuil de dix s’applique au niveau choisi. `GET /api/questions/availability` retourne les six effectifs et disponibilités, jamais les énoncés ou corrections ; l’accès reste réservé aux administrateurs lorsque l’application est privée. Le sélecteur actualise les effectifs à son ouverture, au retour dans l’application et chaque minute.

La difficulté choisie est sauvegardée dans le salon et son résultat. Rejoindre par code ou invitation reprend celle du créateur ; une revanche la conserve et échoue explicitement si le niveau n’a plus assez de questions publiées. Les salons antérieurs sans ce champ correspondent à `all`.

Le salon sauvegarde une copie complète des questions tirées. Modifier la banque n’affecte donc ni une partie déjà créée, ni sa correction, ni son bilan après reconnexion. Les bonnes réponses restent privées jusqu’à la correction de chaque question.

## Synchronisation Google Sheets

Le connecteur lit les cinq onglets `Facile`, `Intermédiaire`, `Difficile`, `Très difficile` et `Professionnel`, avec la ligne d’en-tête en première ligne. Les colonnes peuvent être déplacées, mais doivent conserver ces noms :

| Colonne | Utilisation |
| --- | --- |
| Difficulté | Même niveau que l’onglet |
| Question | Énoncé |
| Bonne réponse | Réponse correcte ; les choix sont mélangés en partie |
| Mauvaise réponse 1, Mauvaise réponse 2, Mauvaise réponse 3 | Distracteurs distincts |
| Spoiler jusqu’à | Texte conservé tel quel ; aucun filtrage des spoilers en partie pour le moment |
| Explication | Correction |
| ID | Identifiant permanent unique dans tout le document, par exemple `OP-001` |
| Statut | `Brouillon`, `Publié`, `Archivé` ; vide = brouillon |

L’ID commence par une lettre, puis contient des lettres sans accents, chiffres, tirets ou tirets bas (80 caractères maximum). **Ne jamais le recalculer selon le numéro de ligne, le modifier pour corriger le texte ou le réutiliser pour une autre question.** Un tri ou un déplacement entre onglets conserve l’ID. Une nouvelle question reçoit un nouvel ID. Un ID changé est une nouvelle question : l’ancienne reste conservée.

Les lignes valides sont enregistrées ensemble, atomiquement. Une ligne sans ID, avec un statut inconnu ou une question publiée invalide est ignorée et signalée ; sa version précédente reste inchangée. Un doublon d’ID, un onglet/une colonne manquants ou une lecture Google impossible bloque toute la tentative. Une ligne supprimée du Sheet reste en base : utiliser `Archivé` pour la retirer des futures parties. Aucune modification de la banque ne réécrit une partie déjà créée ou l’historique.

Les dix questions de démarrage restent conservées et jouables tant qu’elles ne sont pas explicitement archivées. L’import ne supprime ni ne remplace les questions d’une autre source. La validation porte sur la structure, **pas sur l’exactitude factuelle** des questions.

### Connexion et exploitation

Cette première connexion utilise l’export CSV d’un document **déjà accessible en lecture par lien**. Elle ne modifie aucun partage Google. Les détenteurs du lien peuvent donc lire les bonnes réponses. Pour un document privé, il faudra une connexion Google authentifiée ; ne pas publier un document privé pour contourner ce besoin.

Configurer `AKASHA_QUESTION_SHEET_ID` dans le `.env` du serveur, puis recréer uniquement le service `app`. Laisser cette variable vide en développement pour garder les deux bases indépendantes. Le serveur vérifie le document au démarrage puis 60 secondes après chaque tentative, sans chevauchement. Le délai inclut la réponse et l’éventuel cache de Google : ce n’est pas une synchronisation instantanée. Les données déjà enregistrées restent disponibles en cas de coupure Google ou de retrait du partage.

Vérification **sans écriture en base** :

```sh
npm run questions:preview -- IDENTIFIANT_DU_DOCUMENT
```

Le bilan indique uniquement les nombres et les problèmes de structure, sans afficher les réponses. Code de sortie 1 si des corrections sont nécessaires. Sur le serveur, consulter les journaux du service `app` ou `akasha_question_sync` pour les diagnostics. La synchronisation n’expose aucune route d’import publique.

Les sauvegardes PostgreSQL existantes (`pg_dump` de la base complète) incluent les thèmes et les questions. Avant une première mise à jour de production, sauvegarder la base ; au démarrage, les nouvelles tables sont ajoutées sans supprimer les sessions ou les parties existantes.
