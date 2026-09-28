# Akasha sur akashaquiz.com

Le serveur de jeu et PostgreSQL restent sur SERVEUR Valentin, dans `/srv/docker/akasha`. Un tunnel Cloudflare nommé publie `https://akashaquiz.com` et `https://www.akashaquiz.com`, sans VPN sur les téléphones ni port à ouvrir sur la box. L'adresse est conservée après redémarrage. Aucun Quick Tunnel temporaire n'est utilisé.

Le développement reste sur le PC : `npm run dev`, aperçu `http://127.0.0.1:5173` et base de test locale distincte. Seules les versions validées sont déployées sur le serveur. Le PC peut être éteint pendant les parties sur le serveur.

## Configuration

Utiliser uniquement `compose.yaml` et `compose.cloudflare.yaml`, sans l'ancien fichier `compose.private.yaml`.

- `.env` contient `AKASHA_ORIGIN=https://akashaquiz.com`, le mot de passe PostgreSQL et `CLOUDFLARE_TUNNEL_ID` (UUID non secret).
- `work/cloudflare/credentials.json` contient les identifiants du tunnel, conservés uniquement sur le serveur, droits 600 et dossier 700. Ne jamais les publier dans Git ni dans une conversation.
- `deploy/cloudflared.yml` route les deux noms vers `http://app:3001`, avec réponse 404 pour les autres noms.
- Le conteneur utilise uniquement les identifiants de ce tunnel. Le certificat d'administration de compte n'est pas monté dans le service.
- Le propriétaire des fichiers correspond à `AKASHA_UID` et `AKASHA_GID`, par défaut 1000:1000 sur cette installation.
- L'application n'autorise que les origines Android et les deux noms du site. Le développement local conserve sa configuration habituelle.

```sh
cd /srv/docker/akasha
docker compose -f compose.yaml -f compose.cloudflare.yaml up -d
docker compose -f compose.yaml -f compose.cloudflare.yaml ps
curl --fail https://akashaquiz.com/api/health
```

L'application écoute sur l'hôte uniquement en boucle locale (`127.0.0.1:3001`). PostgreSQL n'a aucun port publié. Le connecteur effectue des connexions sortantes chiffrées. Tailscale n'est plus nécessaire à Akasha ; son conteneur dédié est retiré après validation de Cloudflare, sans effacer les volumes de données.

## Domaine et authentification Cloudflare

Le domaine a été acheté chez Cloudflare. Le tunnel est créé avec `cloudflared tunnel login`, validation du domaine par le propriétaire, puis `tunnel create`. Les commandes `tunnel route dns` relient le domaine et `www` au tunnel sans remplacer de force d'éventuels enregistrements existants. La configuration reste gérée dans le dépôt, les identifiants uniquement sur le serveur.

Source : https://developers.cloudflare.com/tunnel/features/locally-managed-tunnels/create-local-tunnel/

## APK

L'APK 0.4.1 est compilé avec `https://akashaquiz.com` comme adresse par défaut. Un appareil ayant déjà mémorisé l'ancienne adresse doit la remplacer dans **Réglages → Connexion au serveur → Adresse du serveur → Enregistrer**. L'APK 0.4.0 fonctionne aussi après ce changement d'adresse. Les deux joueurs utilisent le même serveur ; Tailscale peut être désactivé.

Changer l'adresse demande de choisir à nouveau son pseudo de test. La photo et les préférences de l'appareil restent locales. Ouvrir le site sur le nouveau domaine crée également un nouveau stockage navigateur ; les données locales de l'ancien domaine ne sont pas transférées automatiquement.

## Mises à jour

Sauvegarder PostgreSQL avant déploiement et vérifier qu'aucune partie n'est en cours. Conserver les volumes existants. Pour mettre à jour uniquement Akasha sans interrompre le tunnel :

```sh
git pull --ff-only
docker compose -f compose.yaml -f compose.cloudflare.yaml up -d --build --no-deps app
```

Les sauvegardes précédant la migration sont conservées dans `backups/`. Ne jamais utiliser `docker compose down -v`. Vérifier ensuite l'API, le site et les duels via le domaine public. La configuration Tailscale historique reste dans le dépôt pour un éventuel retour arrière ; elle n'est pas utilisée conjointement avec Cloudflare.
