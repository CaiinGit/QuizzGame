# Illustrations Akasha 0.3

Assets générés avec l’outil imagegen intégré le 25 septembre 2026, à partir des maquettes validées dans la conversation. Mode : édition des images de référence. Aucun personnage.

- `public/art/portal.webp` : portail frontal isolé, canal alpha transparent à l’extérieur de la silhouette.
- `public/art/one-piece-island.webp` : île et mer pour le thème One Piece ; illustration d’ambiance originale, sans logo officiel.

Optimisation mécanique uniquement avec Sharp : redimensionnement et compression WebP. Pour reproduire depuis les PNG sources : `node scripts/optimize-art.mjs portail.png ile.png`.

## Prompt du portail

Use case: background-extraction. Production game UI asset. Extract/recreate ONLY the isolated front-facing stone portal from the supplied accepted Akasha mockup. Preserve its exact design: symmetric frontal stone arch, warm beige cracked blocks, ivy and moss attached to stones, small diamond at keystone, light sage-green magical opening with square sparkles, short flat stone threshold. Fine consistent square pixel-art style. Absolutely NO UI, no text, no buttons, no frame, no landscape, no ground beyond the threshold, no people. GENUINELY TRANSPARENT BACKGROUND (alpha), not beige, white or checkerboard drawn into the image. The arch opening itself remains filled with magical sage-green light; all areas outside the silhouette and its few floating particles are transparent. Portrait 3:4 canvas, portal fills 90% of canvas height and 85% width with small transparent safe margins, view perfectly straight from front. Output one transparent PNG asset for use directly on an app's beige background.

## Prompt de l’île

Use case: precise-object-edit. Produce ONLY the pixel-art island illustration from this supplied mobile mockup as a standalone production game asset. Landscape 4:3 canvas filled edge to edge with muted sage-green sea. Center one lush green rocky island with cream sandy shore, little ivory lighthouse with gold lantern, wooden dock, a few stone ruins and trees. Preserve the refined visible square-pixel fantasy artwork of the reference. Soft warm beige and forest-green palette, clear shapes at small mobile size. No text whatsoever, no map labels, no cartouche, no border, no compass, no UI or buttons, no status bar, no characters or animals, no dark vignette. Just the island and sea, comfortably framed so nothing is cut off. For the One Piece theme selection card inside Akasha.
