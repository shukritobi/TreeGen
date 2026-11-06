# TreeGen · Canopy Studio

Live website: https://shukritobi.github.io/TreeGen/

An original procedural 3D tree generator for Steve's Desert Palisades architectural visualizations. The first specimen is **T2 Littleleaf Palo Verde** (*Parkinsonia microphylla*, provisional botanical identification), with a specified target height of **6.10 metres / 20 feet**.

## Features

- Seed-based generation of real 3D trunks, primary/secondary branches, twigs, thorns, leaf stems and individual paired leaflets.
- Parametric height, multi-trunk structure, crown spread, branch density, twig complexity and gnarl.
- Dry/after-rain foliage states, leaflet density and optional yellow blossoms. Changing foliage, flowers or season preserves the wood structure for a given seed.
- Procedural bark albedo, normal and roughness maps, plus leaf alpha and roughness maps.
- Draft, presentation and high-detail modes, with an adaptive geometry budget at extreme settings.
- GLB export with embedded materials, PNG viewport export and JSON recipe exports.
- Entirely browser-based with no backend, paid API, secrets or project photographs.

This is **not an exact botanical scan**. Compare the crown silhouette with Russell and Steve's reference photos before using this asset for final botanical fidelity.

## GitHub Pages and development

Publish source: branch **main**, folder **/(root)**. GitHub Pages serves the root index.html with embedded CSS and JavaScript. Three.js 0.174.0 modules are loaded from jsDelivr, so a WebGL-capable browser with internet access is required.

Editable sources are kept in src/tree.js, src/app.js and styles.css. Serve locally:

    python3 -m http.server 8000

Navigate to http://localhost:8000/modular.html. Rebuild the self-contained index.html after changing source:

    python3 scripts/build.py

## Tests

    python3 tests/static_test.py
    python3 tests/standalone_test.py
    node tests/engine_test.mjs
    node tests/qa_suite.mjs

The nine-variant regression suite checks 3D height, valid triangle indices, finiteness, outward-facing tube normals, deterministic woody structure across foliage/flower/season changes, and a geometry budget for extreme settings. Continuous integration checks the published page matches the source.

Local browser QA hooks: window.__CANOPY_APP__.getStats() and window.__CANOPY_APP__.setParameters({...}).

Full findings: [QA_REPORT.md](QA_REPORT.md).

## Export notes

GLB uses metres and Y-up, with bark and leaf materials embedded. Import through a glTF-capable application such as Blender before bringing it into SketchUp. The generator does not export native SKP.

Research: [EZ-Tree](https://github.com/dgreenheck/ez-tree), [SeedThree](https://github.com/SkyeShark/SeedThree), [Three.js GLTFExporter](https://threejs.org/docs/pages/GLTFExporter.html).

## SketchUp 2026 fix · November 2026

Earlier exported GLB models showed rectangular foliage cards and abrupt overlapping branch intersections after import into SketchUp. The website now exports **opaque, oval leaf geometry**, with no alpha cutout dependency, and uses parallel-transport frames for curved branch tubes. Branch starting points use a shallow embedded shoulder at their parent stems.

The foliage mesh is approximately 3–5 mm per leaflet at default settings (before final height scaling); the slider permits visual exaggeration if required. Branch collars are a visual improvement and are **not yet a boolean-unioned, watertight skeleton**. Rendering quality in D5 and SketchUp should be checked with a fresh GLB export, because old exported models do not update themselves.

Import in SketchUp 2026: **File → Import → GLB**, then check leaf silhouette close-up and the model’s total height of **6100 mm**.
