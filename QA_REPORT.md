# TreeGen T2 · QA review (6 November 2026)

## Confirmed fixes

1. The trunk and branch tubes used **inward-facing triangles** despite outward vertex normals. Corrected the winding. In all nine tested variants, 100% of sampled tube faces point outward.
2. Foliage, bloom and dry-season changes previously altered branch structure. Added **independent seeded random streams** for the woody skeleton, foliage and blossoms. Branch, twig and thorn counts now remain stable when modifying foliage/season/flowers with the same seed.
3. Extreme settings previously produced approximately **933,000 triangles**. Adaptive branching now limits the tested extreme variant to **221,716 triangles**.
4. GLB export validates the ArrayBuffer header, version and length before reporting a successful export.
5. Added a reproducible root bundle builder, CI checks and nine regression cases.

## Geometry test results

| Scenario | Seed | Height | Branches | Leaflets | Triangles |
| --- | ---: | ---: | ---: | ---: | ---: |
| Default / partly leafed | 241106 | 6.10 m | 503 | 5,582 | 52,164 |
| Same skeleton / bare | 241106 | 6.10 m | 503 | 0 | 31,432 |
| Same skeleton / full canopy | 241106 | 6.10 m | 503 | 13,678 | 75,604 |
| Same skeleton / flowers | 241106 | 6.10 m | 503 | 5,582 | 52,734 |
| Same skeleton / dry | 241106 | 6.10 m | 503 | 275 | 34,238 |
| Alternate / single trunk | 1045 | 5.25 m | 114 | 1,125 | 11,352 |
| Alternate / high detail | 9921 | 7.50 m | 640 | 18,424 | 134,722 |
| Alternate / draft | 87002 | 4.30 m | 221 | 449 | 11,320 |
| Maximum stress | 66513 | 9.00 m | 904 | 35,570 | 221,716 |

These are real mesh measurements from the source, not synthetic images.

## Public browser test

The live URL loaded successfully. An independent browser inspection confirmed an actual rendered tree, cleared loading overlay, correct original baseline metrics and working regeneration. That browser agent could not complete variant parameter changes or export the GLB. It suggested DOM IDs change dynamically; source inspection shows fixed IDs such as seed, trunks, season, quality and export-glb, so this was an automation limitation, not a verified application issue.

## Remaining verification

- Recheck the updated deployed JavaScript and browser performance after the GitHub Pages publish refresh.
- Download and re-import an exported GLB to verify embedded bark/leaf textures, normals, axis and scale.
- Compare the silhouette and leaf distribution against Russell and Steve's source planting photos. This is a procedural approximation rather than a botanical scan.
- Consider LOD/instancing for many trees in one architectural scene.

Engineering preview PNGs were created by rasterizing generated mesh triangles, not through image generation. They are diagnostic projections, not live WebGL screenshots.
