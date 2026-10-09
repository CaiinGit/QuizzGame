# Aka V5 — visage conservé et orientation vers les boutons

La tête et les yeux V4 sont réutilisés sans modification de leurs fichiers. Le visage entier pivote doucement autour du cou (650 ms), accompagné d’un déplacement léger du regard. Ce sont des orientations du même sprite, pas de nouveaux dessins de profil. La direction provient de la position réelle du bouton par rapport à Aka, y compris verticalement et après un changement de taille d’écran.

Les bras sont supprimés du personnage. Le corps et la cape sont un seul sprite statique : le ventre est visible dans l’ouverture et les deux pieds dépassent du bas. La queue reprend la longue courbe et les motifs de la référence. Les ailes V3 restent séparées du corps. La couronne V5 a un intérieur transparent et est ouverte en bas, sans trait reliant les deux extrémités.

Sauvegarde de départ : branche `backup/aka-v4-before-head-look`, commit `bc452771ba56005e9e53d0bb97138973f2f37aaa`. Les éléments V3/V4 sont conservés. Les animations sont coupées lorsque la page est cachée ou lorsque les mouvements réduits sont activés.

## Images et prompts

Outil : ImageGen intégré. Nouveaux fichiers : `public/art/aka-rig-v5/body.webp`, `tail.webp`, `crown.webp`. Découpe et conversion WebP avec Sharp, alpha conservé. La couronne de la première planche a été écartée après la correction de l’utilisateur ; seule la seconde, ouverte en bas, est utilisée.

### Corps et queue

Use case: precise-object-edit. Create a production transparent sprite-parts atlas for Aka using image 1 as the anatomical design reference, image 2 as the existing crown to repair and image 3 as the existing tail style. EXACTLY THREE separated cutouts arranged in a 2x2 grid with generous transparent margins: TOP LEFT: floating golden three-point crown in the same restrained pixel art style and same silhouette as image 2, but its interior is a genuine transparent HOLE, not white or cream fill. Gold outline/rim only, small gold sparkles permitted. TOP RIGHT: ONLY a long mint-green curved tail matching image 1: thick rounded base at lower left, curves down into a broad U and sweeps up to the right with a narrow pointed inward-curled tip, black outline, pale mint flowing swirl highlights. No sparkles or stars painted on tail. BOTTOM LEFT: ONLY the complete body below the head from image 1, purple cape with dark brown fluffy trim and dark neck collar, open wide down the middle to show a plump rounded mint green belly with a pale mint swirl and two short green oval feet visible BELOW the bottom hem. Cape should drape to both sides, symmetrical and static, no arms or hands anywhere, no tail. No head, no wings. Keep the belly broad and visible, feet clearly separated and extending below the cloth. BOTTOM RIGHT MUST BE EMPTY transparent. Use crisp lightly pixel-stepped dark outlines with smooth mint/purple/gold shading matching the existing app sprites, not realistic. All 3 parts fully contained in their own quadrant with no overlaps. Genuine alpha transparency around and inside cutouts. NO checkerboard painted into image. No white background. No labels, lettering, UI. Do NOT draw or modify Aka's head or eyes: they are already perfect and reused unchanged in the app.

### Couronne corrigée

Use case: precise-object-edit. Edit the golden crown from this reference. Isolate ONLY the floating crown, as a small clean lightly pixel-art game sprite. Preserve its three pointed peaks: tall central gold peak and two lower outward side peaks, orange outer edges and pale gold highlights. CRITICAL geometry: the crown is an OPEN zigzag chevron-shaped ornament. There is NO bottom band, NO base line, NO horizontal stroke connecting the two lowest ends, NO curved lower rim. The lowest left and right tips are disconnected from each other across the bottom; open transparent empty space extends out of the crown interior DOWNWARD to the background. Gold is only the upper three-point zigzag outline, like a stylized open W with a taller middle peak. The whole inner area is genuinely empty alpha transparency, not white fill. No full enclosed outline anywhere. Remove the white interior from reference. No head, no text, no background, no stars, no glows or shadows outside the crown. Center the crown with comfortable margins on a genuinely transparent background.

## Aperçu et vérifications

L’aperçu des six orientations est rendu depuis les vrais éléments de l’application : `docs/previews/aka-v5-sprites.png`. Tests de chargement, conservation des URLs du visage, absence de bras, cape statique, regard dirigé vers chaque cible réelle, clignement et mouvements réduits, ainsi que les tests du tutoriel sur plusieurs tailles d’écran.

