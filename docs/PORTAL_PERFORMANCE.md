# Traversée du portail : vérification du 7 octobre 2026

L’ancien zoom transformait toute l’interface vivante, avec ses filtres SVG et ses ombres. La nouvelle version utilise les instantanés natifs de View Transitions : seule une image de l’accueil est agrandie, avant le fondu vers l’image des modes. Le navigateur conserve la navigation fixe dans l’instantané sans déplacement manuel. Le zoom de secours pour les navigateurs sans cette API est limité à 2×.

Mesure locale avec Chromium/Playwright, écran 390 × 844, densité 3× et processeur ralenti 4×. Trace CDP sur une traversée, après chargement de l’accueil. Ces mesures ponctuelles ne remplacent pas un essai sur un téléphone physique.

| Mesure, même scénario en développement | Ancien zoom DOM | Instantanés |
| --- | ---: | ---: |
| Opérations Paint | 27 | 10 |
| Tâches de rastérisation | 261 | 47 |
| Temps cumulé de rastérisation | 100 ms | 11 ms |
| Intervalles requestAnimationFrame supérieurs à 34 ms | 6 | 2 |

La version compilée a ensuite été vérifiée séparément : 60 intervalles pendant la transition native, aucun supérieur à 34 ms, maximum 17 ms. Une pause de préparation de 200 ms a été observée avant le mouvement dans ce scénario ralenti. Les intervalles requestAnimationFrame sont un indicateur côté navigateur, pas une mesure garantie du débit affiché sur tous les appareils.

Les tests `tests/home.spec.ts` couvrent les deux thèmes, le mouvement des instantanés pendant que le DOM reste immobile, le fondu, l’annulation suivie d’une nouvelle entrée, la navigation externe pendant la préparation, la réduction des animations et le parcours de secours sans View Transitions.
