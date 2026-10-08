# Aka V4 : cape fermée, bras ovales, ailes détachées

La tête reprend la silhouette ronde, les oreilles espacées, le regard en amande et la petite bouche neutre des deux références fournies par l’utilisateur. Le corps est composé d’un torse sous la cape, d’une tête indépendante et des yeux animés.

La cape comporte deux pans au premier plan, au-dessus des bras. Au repos, les deux bras ovales sont entièrement cachés. Lors d’un geste, seul le pan du côté concerné s’écarte ; le bras apparaît sous son bord, se tend, rentre puis disparaît avant la fermeture. Le bras opposé reste caché. Cette règle vaut aussi après annulation du geste et avec les animations réduites.

Les ailes et la couronne utilisent **les fichiers V3 inchangés**. Les ailes sont éloignées du corps ; les tests vérifient un espace avec la tête sur plusieurs phases de leur battement. La queue V3 est également conservée. Les nouveaux éléments sont préchargés avant l’arrivée du personnage.

## Sauvegarde

La version précédente est conservée sur `backup/aka-v3-before-covered-arms`, au commit `9ac30242f766c421d5924c98001e23ac93e41e3f`. Les anciennes sauvegardes V2 restent disponibles. Pour un retour de l’apparence uniquement, restaurer `src/AkaRig.tsx`, `src/aka-rig.css` et `tests/aka-rig.spec.ts` depuis ce commit, puis reconstruire. Les fichiers V3 restent tous dans le dépôt.

## Images

Outil utilisé : ImageGen intégré, à partir des deux références de l’utilisateur. Sorties enregistrées dans `public/art/aka-rig-v4/` : `head.webp`, `eyes.webp`, `arm.webp`, `cape.webp`, `capeLeft.webp`, `capeRight.webp`, `torso.webp`. La cape complète est conservée comme source des deux pans. Découpe mécanique et conversion WebP avec Sharp, transparence conservée. Le torse est découpé dans le corps V3. Aucun service de génération n’est utilisé pendant le jeu.

Prompt final :

> Create exactly FOUR separated animation cutout parts for Aka, using the two references for exact design. Square transparent 2x2 atlas with each part fully inside its own quadrant, generous blank alpha gaps, no labels. TOP LEFT: head ONLY matching reference 1's silhouette and proportions: broad round mint-green head, small widely separated triangular ears, subtle pale mint forehead swirl, tiny straight neutral mouth, NOT a grin, smooth generous cheeks. This head must have NO EYES: plain mint skin in the eye area because eyes are a separate animation layer. No body, collar, crown, wings. TOP RIGHT: the FRONT purple cloak matching reference 2, both large purple panels draped over and completely HIDING the arms, dark brown fluffy hem trim, dark collar across neckline. Narrow central opening, broad shoulder coverage, no sleeves, no hands or arms, no body, no head. Two symmetrical cloth panels meeting beneath the collar and parting in a narrow V near bottom; central seam exactly on the quadrant's center axis so it can be split mechanically in half for animation. Left and right panel must be mirror-balanced. BOTTOM LEFT: ONLY the two large emerald almond-shaped eyes, exact eye shape and calm expression from reference 1, dark outlines and luminous green pupils, symmetric pair same baseline, separated by transparent space. No face skin. BOTTOM RIGHT: ONLY one very simple mint-green OVAL arm, short smooth capsule shape, dark outline, one restrained pale highlight, vertical oval. NO fingers, NO hand, NO wrist, NO elbow, NO claws, just a single rounded oval. Each element isolated on genuinely transparent alpha background. Clean restrained pixel art with crisp stepped dark outlines but faithful rounded silhouette to the supplied head, not spiky or overdecorated. No extra sparkle ornaments on the head. No crown or wings on this sheet because existing crown and wings will be retained. No text, no UI, no shadows on background.

## Validation

Compilation et tests du tutoriel, des gestes et du portail. Captures du repos, des deux gestes et des phases intermédiaires ; bras opposé invisible, retour des deux bras sous la cape, ouverture du tissu avant la sortie du bras, ailes détachées, couronne conservée, chargement de tous les éléments, animations réduites.
