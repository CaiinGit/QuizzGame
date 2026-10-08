# Aka — guide de bienvenue

Aka apparaît sur l’accueil à la première visite d’un compte qui n’a pas encore terminé ou passé le tutoriel. Les comptes existants découvrent également la mascotte une fois à l’introduction de cette fonctionnalité. Les invités peuvent lancer la visite manuellement.

Six étapes présentent le portail, les thèmes favoris, les amis, le profil et les réglages. La visite reste facultative : « Passer la visite », Échap ou retour Android la ferment. Les réglages permettent de la revoir. Elle attend la fermeture des autres fenêtres et n’interrompt pas une partie.

La colonne PostgreSQL `akasha_accounts.onboarding_completed` est ajoutée sans modifier les autres données. L’API authentifiée `POST /api/account/onboarding/complete` ne modifie que le compte connecté, de manière idempotente. Un marqueur local par serveur et par compte évite de réafficher la visite si la sauvegarde distante échoue ; elle est retentée à la prochaine connexion. Une visite interrompue sans validation peut reprendre depuis le début.

Le personnage sort du cœur du portail vers sa bulle avec une animation de position, d’échelle et d’opacité. Le chargement de l’image précède l’animation. L’option système de réduction des animations est respectée. Le dialogue natif retient le focus et bloque les interactions involontaires avec l’application pendant la visite.

## Illustration

Fichier utilisé : `public/art/aka-v1.webp` (512 × 512, transparence conservée). Créé avec l’outil intégré ImageGen à partir du dessin de référence fourni par l’utilisateur, puis redimensionné et encodé en WebP avec Sharp. Aucun service de génération n’est appelé par l’application.

Prompt final :

> Use case: style-transfer / production game character sprite. Reference image is the user's mascot design, NOT a screenshot to reproduce. Create AKA for the pixel fantasy arcade quiz game Akasha, as one polished full-body isolated transparent sprite. Closely preserve the reference character identity: adorable small mint-green floating feline spirit with two pointed cat ears, very large bright emerald almond eyes, tiny friendly mouth, translucent-looking mint swirls inside his green body, long curled mint spectral tail, short royal-purple cape with dark brown fluffy trim and dark collar, two small golden feather wings, and a tiny floating golden three-point crown above the head. Facing forward with a very slight welcoming 3/4 turn, inviting friendly expression, one small paw gently raised as a guide. Crisp deliberate pixel art, chunky dark outlines, restrained stepped shading and sparkling pixels, 16-bit RPG quality with readable silhouette at 100-160 px displayed size. Not a smooth vector drawing, no blur, no realistic fur. Keep wings and crown fully in frame with small safe margins. No scenery, no ground, no portal, no speech bubble, no lettering, no UI, no buttons, no watermark. One mascot only centered on a square canvas, occupies about 85% width/height. GENUINELY TRANSPARENT alpha background outside the character and in gaps around wings and tail, no black/white/checkerboard painted background. Deliver a single reusable PNG game asset.

## Vérification

`npm run check` vérifie le serveur et la compilation. `tests/aka.spec.ts` couvre les six étapes sur petit écran, les cibles dégagées, la sauvegarde entre appareils, les boutons précédent/passer/revoir, Échap, le thème sombre et les animations réduites, ainsi que la reprise de sauvegarde après une erreur réseau. `tests/home.spec.ts` couvre toujours l’entrée dans le portail.
