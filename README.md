# Vera Rubin VR-300 “Halo” — interactive 3D teardown

A real-time, in-browser teardown of a fictional next-generation accelerator, built as a
concept piece for **[Civo](https://www.civo.com)** in their lime-on-black identity.

The card renders live in WebGL 2 — no video, no pre-baked frames, no 3D library. Eight
subsystems are called out with leader arrows; click one and the camera flies in, the cooler
dissolves away, and you can keep pushing until you are looking at individual logic cells,
micro-bumps and 0.18 mm coolant channels.

## Viewing it

**Instant preview, no setup** — serves this repo's `index.html` as a real web page:

> https://raw.githack.com/pearldrop-lab/gpu/claude/vera-rubin-gpu-viewer-ebdnk9/index.html

**Permanent URL** — https://pearldrop-lab.github.io/gpu/ — needs GitHub Pages switched on
once: *Settings → Pages → Build and deployment → Source: **GitHub Actions***. The workflow in
`.github/workflows/pages.yml` then builds and deploys on every push. (It tries to enable Pages
itself, but the Actions token is not permitted to create the Pages site, so the first flip is
manual.)

---

## What you can do

| Input | Action |
| --- | --- |
| Drag | Orbit |
| Scroll / pinch | Zoom |
| Shift-drag or right-drag | Pan |
| Click a callout **or a part of the card** | Fly in and inspect |
| `1` – `8` | Jump to a feature |
| `M` | Toggle circuit-level macro view |
| `Esc` | Back out one level |
| `X` | Exploded view |
| `←` `→` `↑` `↓` | Rotate · `+` `−` zoom |
| `Space` | Auto-orbit · `H` hide UI · `F` fullscreen · `R` reset |

Hovering the model names the part under the cursor; parts that belong to a documented
feature highlight in lime and are clickable.

## The eight features

1. **Twin-Reticle Compute Engine** — two reticle-limit dies bridged at 24 TB/s
2. **Dark Matter Cache** — 1.2 GB of SRAM hybrid-bonded *beneath* the dies
3. **HBM4e Halo Stacks** — 288 GB at 22.4 TB/s
4. **LightBridge Co-Packaged Optics** — 51.2 Tb/s leaving the package as light
5. **Two-Phase Micro-Channel Evaporator** — 1.9 kW through 0.18 mm channels
6. **Vertical Power Delivery** — 48 V → 0.62 V, 1,850 A, backside PDN
7. **Rotation-Curve Scheduler** — flat occupancy across the die, after Rubin's galaxy curves
8. **Photon-Sealed Root of Trust** — post-quantum keys under a tamper mesh

The product is invented. The engineering vocabulary is real; the numbers are plausible
fiction, chosen to be interesting rather than to describe any shipping part.

## How it is built

Everything is one self-contained `index.html` — around 130 kB, zero dependencies, zero
network requests. It runs from GitHub Pages, from a raw-HTML proxy, or straight off disk.

* **Renderer** — hand-written WebGL 2. One interleaved vertex buffer holds the entire card;
  a per-vertex `(materialId, partId, …)` channel lets a *single draw call* cover every
  surface while the vertex shader still displaces, dissolves and highlights individual parts
  from a small uniform array. Shadows and the picking buffer reuse the same geometry.
* **Materials are computed, not textured.** PCB routing, package traces, die floorplans,
  DRAM laminations, waveguides, micro-bump fields and coolant channels are all evaluated
  analytically in the fragment shader, with `fwidth`-driven fades that suppress detail finer
  than a pixel. That is why the macro views keep resolving instead of going soft — there is
  no texture resolution to run out of.
* **Frame** — shadow map → forward PBR (GGX + analytic studio environment) → SSAO →
  depth of field → five-level bloom → ACES grade → FXAA, with 4× MSAA where available.
  Depth of field ramps up automatically as you approach macro distances.
* **Cutaways** use ordered-dither alpha, so parts can fade out inside the opaque pass with
  no sorting and no second pipeline.
* **Geometry** is generated at load: rounded boxes, cylinders and swept tubes, ~22 k
  triangles total.

Graceful degradation: without `EXT_color_buffer_float` the post chain falls back to 8-bit
targets; without WebGL 2 the page shows an explanatory panel instead of a blank canvas.
`prefers-reduced-motion` shortens the camera flights and stops the idle orbit.

## Working on it

```bash
node build.mjs        # concatenate src/ → index.html
node tools/shot.mjs   # headless Chromium smoke test + screenshots
```

Sources live in `src/`:

```
src/index.head.html      meta + all CSS
src/index.body.html      DOM
src/js/01-math.js        mat4 / vec3
src/js/02-geom.js        primitives + mega-buffer builder
src/js/03-shaders-scene.js   PBR über-shader and every procedural material
src/js/04-shaders-post.js    SSAO, bloom, DoF, grade, FXAA
src/js/05-gl.js          program + render-target helpers
src/js/06-model.js       the card itself
src/js/07-features.js    feature copy, camera framings, cutaway recipes
src/js/08-renderer.js    frame graph
src/js/09-app.js         camera, input, HUD
```

`index.html` is committed so the page works without a build step; CI rebuilds it and fails
if the two have drifted.

### Brand colours

The palette lives in CSS custom properties at the top of `src/index.head.html`
(`--lime`, `--lime-hot`, `--lime-deep`, `--bg`). The 3D side keeps its own copy in
`GLSL_COMMON` (`LIME`, `LIME_HOT`) so the lighting, emissives and grid stay in sync — swap
both for exact brand values.
