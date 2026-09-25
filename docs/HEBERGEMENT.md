# Akasha sur SERVEUR Valentin

## Installation du 25 septembre 2026

Akasha et PostgreSQL sont installés dans `/srv/docker/akasha`. La machine vérifiée est `serveurdecaiin`, sous Ubuntu 24.04.5 LTS. L’accès privé est **https://akasha.tail118128.ts.net** ; Tailscale Serve a été activé par le propriétaire. L’APK produit par GitHub est préconfiguré avec cette adresse. Installer Tailscale sur chaque téléphone et autoriser l’ami via un partage de la machine Akasha avant de jouer depuis un autre réseau.

L’installation utilise un conteneur Tailscale dédié, en mode utilisateur, sans accès privilégié au réseau de l’hôte. Le serveur de jeu partage son espace réseau. Les commandes d’exploitation de cette installation doivent donc inclure les deux fichiers :

```sh
docker compose -f compose.yaml -f compose.private.yaml ps
docker compose -f compose.yaml -f compose.private.yaml up -d --build
docker compose -f compose.yaml -f compose.private.yaml exec -T tailscale tailscale --socket=/tmp/tailscaled.sock serve status
```

La connexion et le certificat Tailscale persistent dans un volume distinct. Pour une nouvelle installation de ce mode, démarrer les deux fichiers Compose, puis connecter le conteneur avec `docker compose -f compose.yaml -f compose.private.yaml exec tailscale tailscale --socket=/tmp/tailscaled.sock up --hostname=akasha --accept-dns=false`. Après validation du lien personnel et activation de HTTPS, exécuter la même commande avec `serve --bg http://127.0.0.1:3001` à la place de `up`. Ajuster ensuite `AKASHA_ORIGIN` à l’URL obtenue et relancer les services.

Les exemples ci-dessous utilisant Tailscale installé sur l’hôte sont une autre méthode possible ; elle n’a pas été utilisée sur SERVEUR Valentin.

Le projet référencé est le serveur maison Ubuntu, accessible en SSH via `caiin@192.168.1.197`. Outlayer est installé dans `/srv/docker/outlayer-wiki` et utilisait le port 8081. Ces informations proviennent du projet SERVEUR Valentin ; elles restent à confirmer sur la machine. Akasha utilise un autre dossier, une autre base et le port local 3001. L’APK reste sur chaque téléphone.

## Premiers tests depuis deux domiciles

Utiliser Tailscale sur le serveur et les deux téléphones, puis Tailscale Serve pour obtenir une URL HTTPS privée. Aucun port de la box à ouvrir pour ce mode. Inviter l’ami ou partager uniquement la machine de test avec lui ; vérifier les droits d’accès Tailscale. Les deux téléphones doivent avoir leur connexion Tailscale active.

1. Se connecter au serveur en SSH. Vérifier `docker compose version`, `docker ps` et que le port local 3001 est disponible.
2. Cloner `https://github.com/CaiinGit/QuizzGame.git` dans `/srv/docker/akasha`, puis entrer dans ce dossier.
3. Installer/connecter Tailscale selon sa documentation officielle. Après connexion, `tailscale status --json` indique le nom DNS de la machine. Activer HTTPS/MagicDNS dans l’administration Tailscale si demandé.
4. Copier `.env.example` vers `.env`. Mettre un mot de passe PostgreSQL généré par `openssl rand -hex 32` et définir `AKASHA_ORIGIN=https://nom-du-serveur.nom-du-reseau.ts.net` (sans barre finale). Garder le fichier privé avec `chmod 600 .env`.
5. Exécuter `docker compose up -d --build`, puis vérifier `curl --fail http://127.0.0.1:3001/api/health`.
6. Vérifier `tailscale serve status` pour ne pas remplacer un service existant. Sur un point d’entrée disponible : `sudo tailscale serve --bg http://127.0.0.1:3001`. Suivre le lien d’activation HTTPS si nécessaire.
7. Sur les deux téléphones, ouvrir l’URL HTTPS dans un navigateur pour vérifier l’accès, puis la saisir dans les réglages d’Akasha. Choisir un pseudo, créer un duel, transmettre le code et cliquer chacun sur « Je suis prêt ».

Documentation : [installation Tailscale](https://tailscale.com/download/linux), [Serve](https://tailscale.com/docs/reference/tailscale-cli/serve), [test d’une application à plusieurs](https://tailscale.com/docs/use-cases/application-testing/share-local-dev-server-with-team).

## Accès public ultérieur

Un domaine dirigé vers le serveur et un accès entrant 80/443 sont nécessaires pour la configuration Caddy fournie. Vérifier la disponibilité des ports et la configuration de la box (dont les éventuelles restrictions IPv4). Définir `AKASHA_DOMAIN` et `AKASHA_ORIGIN=https://ce-domaine`, puis utiliser `docker compose -f compose.yaml -f compose.public.yaml up -d --build`. Si un reverse proxy existe déjà, y ajouter Akasha au lieu d’en lancer un second. Ne pas exposer PostgreSQL ni le port 3001 sur Internet. [HTTPS Caddy](https://caddyserver.com/docs/automatic-https).

## Mises à jour, sauvegardes et reprise

Faire une sauvegarde avant mise à jour. Depuis `/srv/docker/akasha` :

```sh
mkdir -p backups
chmod 700 backups
docker compose exec -T db pg_dump -U akasha -d akasha -Fc > "backups/akasha-$(date +%Y%m%d-%H%M%S).dump"
git pull --ff-only
docker compose up -d --build
docker compose ps
curl --fail http://127.0.0.1:3001/api/health
```

Copier régulièrement les sauvegardes hors du serveur et programmer la commande `pg_dump` quotidiennement. Une restauration doit se faire d’abord dans une base de test avec `pg_restore` ; arrêter l’application avant de restaurer sa base active. Le volume `akasha_database` persiste entre les redémarrages. Ne jamais utiliser `docker compose down -v` pour une mise à jour.

Un seul processus applicatif doit gérer les duels. Les réponses, scores, échéances et questions tirées sont sauvegardés avant confirmation. Une reconnexion recharge l’état sauvegardé. Une question dont le temps est écoulé est corrigée au retour du serveur ; les nouvelles questions retrouvent leur durée complète. Une interruption de connexion d’un téléphone ne met pas le chronomètre en pause.

La version 0.2 emploie des profils de test conservés sur chaque téléphone pendant 30 jours, pas des comptes récupérables. Les anciennes parties sont purgées après sept jours au redémarrage. Pour une ouverture publique durable : ajouter de vrais comptes, une stratégie de conservation et des sauvegardes automatiques surveillées. Une future montée en charge nécessitera un coordinateur partagé pour les duels avant de multiplier les instances.

## Validation avant ouverture

- Deux téléphones sur des réseaux différents : création, invitation, dix réponses, score final.
- Passage en arrière-plan puis retour, coupure réseau puis reconnexion, redémarrage de l’app.
- Salon complet, mauvais code, abandon, égalité et question sans réponse.
- Redémarrage du serveur, puis reprise et vérification d’une sauvegarde restaurée.

Le test automatisé couvre déjà deux clients, la reconnexion, le redémarrage de la base et l’absence de réponses dévoilées avant correction. Il ne remplace pas ce test physique Android/HTTPS.
