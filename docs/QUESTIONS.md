# Banque de questions

Les parties Solo et Classique tirent désormais leurs questions dans PostgreSQL. En production, cette base reste sur le serveur Akasha ; le développement utilise sa propre base PGlite locale. Aucun fichier de questions définitif ni format d’import n’est requis pour cette préparation.

## Structure

- `akasha_themes` : identifiant, nom, activation et dates de création/modification. Un thème désactivé ne peut pas fournir de questions à une nouvelle partie.
- `akasha_questions` : identifiant stable, thème, énoncé, quatre propositions, index de la bonne réponse (0 à 3), explication, difficulté facultative (`easy`, `medium`, `hard`), référence/source facultative, statut et dates.
- `akasha_migrations` : trace des initialisations déjà appliquées.

Une nouvelle question est un **brouillon** (`draft`) par défaut : son texte, ses propositions et sa correction peuvent encore être incomplets. Seules les questions **publiées** (`published`) sont jouables. La publication exige un énoncé, quatre propositions non vides et distinctes et une bonne réponse. Une question **archivée** (`archived`) est conservée sans être tirée. Ces règles sont contrôlées par le serveur et par les contraintes PostgreSQL.

## Initialisation et parties

Au premier démarrage avec cette version, les dix questions de test de `server/questions.ts` sont copiées dans le thème One Piece, activé. Cette opération est marquée et ne se répète pas : un redémarrage ne remplace pas une modification, ne republie pas une question archivée et ne recrée pas une question supprimée. Le fichier reste uniquement une source d’initialisation et une fixture de tests.

Chaque nouvelle partie tire dix questions publiées distinctes au hasard, puis mélange leurs propositions côté serveur. Il faut au moins dix questions publiées pour lancer une partie ; sinon un message explique l’indisponibilité. Il n’existe pas de repli silencieux vers les anciennes questions du code.

Le salon sauvegarde une copie complète des questions tirées. Modifier la banque n’affecte donc ni une partie déjà créée, ni sa correction, ni son bilan après reconnexion. Les bonnes réponses restent privées jusqu’à la correction de chaque question.

## Prochaine étape

Le module serveur `QuestionBank.saveQuestion` prépare l’enregistrement validé des questions ; il n’est exposé par aucune route publique. L’écran d’administration, l’authentification des rédacteurs et l’import seront définis quand le fichier de rédaction sera disponible. Les noms de colonnes et le format de ce fichier pourront alors être adaptés à cette structure, sans imposer dès maintenant un modèle de rédaction.

Les sauvegardes PostgreSQL existantes (`pg_dump` de la base complète) incluent les thèmes et les questions. Avant une première mise à jour de production, sauvegarder la base ; au démarrage, les nouvelles tables sont ajoutées sans supprimer les sessions ou les parties existantes.
