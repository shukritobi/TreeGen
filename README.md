# TreeGen — Canopy Studio

Procedural 3D tree generator for architectural visualization, initially built for Steve's Desert Palisades project.

## First species

**T2 Littleleaf Palo Verde** — likely `Parkinsonia microphylla` (provisional botanical identity). Height preset: **6.10 m / 20 ft**.

The browser app generates multiple trunks, tapered 3D branch/twig meshes, thorns, tiny compound leaflets, and optional flowers. Change the seed, spread, branching, foliage, season or quality, then export a **GLB with embedded procedural PBR maps**, PNG screenshot or JSON recipe.

## Website

**https://shukritobi.github.io/TreeGen/**

This address becomes live once GitHub Pages publishing is enabled:

1. Open [TreeGen → Settings → Pages](https://github.com/shukritobi/TreeGen/settings/pages).
2. Under **Build and deployment**, choose **Source: Deploy from a branch**.
3. Set **Branch: main**, **Folder: /(root)**, then click **Save**.
4. GitHub will publish the website from `index.html`, and subsequent commits to `main` will update it.

## Architecture

The deployed page is `index.html`, a self-contained static site using Three.js 0.174.0 via jsDelivr. No build tool, API key or server is needed; an internet connection is required for CDN modules.

**Exports:** `.glb` models use metres and Y-up (glTF); open/convert in Blender or import with a SketchUp-compatible glTF importer. The browser cannot directly export native `.skp`.

**Research references:** [EZ-Tree](https://github.com/dgreenheck/ez-tree), [SeedThree](https://github.com/SkyeShark/SeedThree), [Three.js GLTFExporter](https://threejs.org/docs/pages/GLTFExporter.html).

This is an independently implemented parametric approximation, not a scanned tree. Verify the botanical species against Russell's actual planting photographs before final production use.

No images from Steve's correspondence are embedded in this public repository.
