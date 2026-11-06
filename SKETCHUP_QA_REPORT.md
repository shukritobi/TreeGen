# TreeGen T2 · SketchUp 2026 GLB import review
Date: 6 November 2026

## Observed in the supplied SketchUp screenshots
- Leaf clusters display hard-edged rectangles instead of foliage silhouettes.
- Trunks and branches appear as separate straight tubes with visually harsh junctions and crossings.
- Foliage is oversized for a Littleleaf Palo Verde close-up.

## Causes identified in source
1. Original leaflets were quadrilateral cards relying on texture alpha; an importer that discards/changes the alpha cutoff reveals the entire rectangle.
2. Old branch tube frames repeatedly chose a world-up vector and could jump around tight bends. Child branches started within the parent centerline with no shaped shoulder.
3. The old leaf cards were approximately 12–22 mm long in model units. Actual species leaflets are typically only about 1–3.5 mm.

## Implemented in this revision
- Replace leaflet and flower cards with **real outline polygon meshes** (five vertices, four triangles per leaflet), with opaque procedural PBR texture and vertex tint. Leaf material no longer uses alpha masks.
- Set leaf material transparent=false, alphaTest=0, double-sided.
- Shrink foliage to ~3–5 mm before tree-height normalization; reduce leaf rachis length to ~25–52 mm.
- Transport a stable tangent-aligned frame across each branch, fixing abrupt rotational frame changes.
- Start branches at an embedded offset near the parent's surface, with a flared root collar for visually softer attachment.
- Keep tree height 6.10 m for Steve's T2 preset and preserve seed-controlled regeneration.

## Validation
Nine independent seed/season/quality scenarios passed geometric validations, including 100% outward-facing tube faces, correct height, finite attributes, <300k triangles on extreme preset, and no rectangular alpha cards. The website bundle was built reproducibly from the corrected modular source.

## Known limits
**Branch joints remain overlapping surface meshes, not fully welded/manifold boolean unions.** A more advanced smooth skeletal junction mesh remains future work for close-up production imagery. These edits cannot retroactively change previously exported GLB files or existing imported SketchUp components.

A fresh GLB must still be imported into SketchUp 2026 and tested in D5 Render to confirm material appearance. Live browser geometry tests do not prove that every SketchUp importer builds the same vertex normals or texture settings.

## Re-import steps
1. Refresh https://shukritobi.github.io/TreeGen/ after the updated deployment completes.
2. Export a NEW GLB with the same seed; avoid comparing old cached files.
3. In SketchUp 2026, choose File > Import > GLB, inspect leaf edges close-up, then measure overall height 6100 mm.
4. If foliage is barely visible from a wide camera view, adjust Leaflet Scale to 130–150% (art-directed, less botanically accurate).
5. Verify materials in D5 Render.

## Sources
- https://help.sketchup.com/en/sketchup/working-gltf-files
- https://research.fs.usda.gov/feis/species-reviews/parmic
- https://dendro.cnre.vt.edu/dendrology/syllabus/factsheet.cfm?ID=491
