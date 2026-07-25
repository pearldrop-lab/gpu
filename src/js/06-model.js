/* ============================================================================
   06 · MODEL — the Vera Rubin VR-300 "Halo" accelerator, built from scratch.
   Units are centimetres. The card is 32 × 12 cm; the package alone is 11 × 8.
   ========================================================================== */

const MAT = {
  PCB: 0, SUBSTRATE: 1, DIE: 2, HBM: 3, ANODIZED: 4, ALUM: 5, COPPER: 6,
  GOLD: 7, PLASTIC: 8, LIME: 9, FIBER: 10, CERAMIC: 11, CHROME: 12,
  PHOTONIC: 13, SOLDER: 14, GRAPHITE: 15, FLOOR: 16, SCHED: 17, SECURITY: 18,
  CHANNEL: 19, INTERPOSER: 20, CACHE: 21,
};

const PART = {
  PCB: 0, SMD: 1, SUBSTRATE: 2, INTERPOSER: 3, DIE_A: 4, DIE_B: 5, BRIDGE: 6,
  CACHE: 7, BUMPS: 8, HBM: 9, PHOTONIC: 10, FIBER: 11, VRM: 12, INDUCTOR: 13,
  CAPS: 14, COLDPLATE: 15, CHANNELS: 16, FINS: 17, SHROUD: 18, BACKPLATE: 19,
  FINGERS: 20, HYPERMESH: 21, POWER: 22, LOGO: 23, BRACKET: 24, LIGHTBAR: 25,
  SCREWS: 26, SECURITY: 27, SCHED: 28, PORTS: 29, FLOOR: 30,
};
const PART_COUNT = 31;

/** Human-readable names for the hover tooltip (indexed by PART value). */
const PART_NAMES = [];
PART_NAMES[PART.PCB] = '24-layer PCB · Megtron-8';
PART_NAMES[PART.SMD] = 'Discrete passives';
PART_NAMES[PART.SUBSTRATE] = 'Organic package substrate';
PART_NAMES[PART.INTERPOSER] = 'CoWoS-Ω silicon interposer';
PART_NAMES[PART.DIE_A] = 'Compute die A · RV100';
PART_NAMES[PART.DIE_B] = 'Compute die B · RV100';
PART_NAMES[PART.BRIDGE] = 'Reticle-bridge link';
PART_NAMES[PART.CACHE] = 'Dark Matter Cache layer';
PART_NAMES[PART.BUMPS] = 'Hybrid-bond micro-bump field';
PART_NAMES[PART.HBM] = 'HBM4e Halo stack';
PART_NAMES[PART.PHOTONIC] = 'LightBridge photonic engine';
PART_NAMES[PART.FIBER] = 'Fibre pigtail';
PART_NAMES[PART.VRM] = 'Vertical power stage';
PART_NAMES[PART.INDUCTOR] = 'Coupled inductor';
PART_NAMES[PART.CAPS] = 'Bulk capacitor';
PART_NAMES[PART.COLDPLATE] = 'Vapour chamber lid';
PART_NAMES[PART.CHANNELS] = 'Micro-channel evaporator';
PART_NAMES[PART.FINS] = 'Skived fin stack';
PART_NAMES[PART.SHROUD] = 'Exoframe shroud';
PART_NAMES[PART.BACKPLATE] = 'Structural backplate';
PART_NAMES[PART.FINGERS] = 'PCIe Gen7 ×16 edge';
PART_NAMES[PART.HYPERMESH] = 'HyperMesh-7 fabric port';
PART_NAMES[PART.POWER] = '48 V direct-drive inlet';
PART_NAMES[PART.LOGO] = 'Civo × Vera Rubin mark';
PART_NAMES[PART.BRACKET] = 'I/O bracket';
PART_NAMES[PART.LIGHTBAR] = 'Telemetry light bar';
PART_NAMES[PART.SCREWS] = 'Torx retention';
PART_NAMES[PART.SECURITY] = 'Root-of-trust enclave';
PART_NAMES[PART.SCHED] = 'Rotation-curve scheduler';
PART_NAMES[PART.PORTS] = 'Optical MPO cage';
PART_NAMES[PART.FLOOR] = '';

/* Deterministic RNG so the board looks identical on every load. */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GEO = {
  pcb: { w: 32, h: 0.22, d: 12 },
  pkg: { x: -6.0, w: 11.0, h: 0.35, d: 8.2 },
  dieA: -7.7, dieB: -4.3,
  dieW: 3.0, dieD: 4.6, dieY: 1.02, dieH: 0.36,
  hbmX: [-10.6, -1.4], hbmZ: [-2.8, -0.95, 0.95, 2.8],
  photZ: -5.0, photX: [-8.5, -5.0, -1.5],
  coldY: 1.9,
};

function buildScene() {
  const B = new MeshBuilder();
  const rnd = mulberry32(0x5EEDCAFE);
  const P = GEO.pcb;

  /* ---------------------------------------------------------------- floor */
  B.add(plane(420, 420, 1, 1), xf([0, -8.2, 0]), MAT.FLOOR, PART.FLOOR);

  /* ------------------------------------------------------------------ PCB */
  B.add(box(P.w, P.h, P.d), xf([0, 0, 0]), MAT.PCB, PART.PCB, 1, 1.0);

  /* PCIe Gen7 edge connector: two gold pad banks either side of the key. */
  const fingerY = -P.h / 2 - 0.005;
  const bank = (x0, x1) => {
    const n = Math.round((x1 - x0) / 0.24);
    for (let i = 0; i < n; i++) {
      const x = x0 + i * 0.24 + 0.06;
      B.add(box(0.16, 0.02, 1.35), xf([x, fingerY, -P.d / 2 + 0.72]), MAT.GOLD, PART.FINGERS);
    }
  };
  bank(-11.4, -8.6);
  bank(-7.8, 3.6);

  /* --------------------------------------------------------- backplate */
  B.add(roundedBox(P.w, 0.3, P.d, 0.12, 2), xf([0, -0.47, 0]), MAT.ANODIZED, PART.BACKPLATE);
  // etched lime inlay running the length of the backplate
  B.add(box(20, 0.02, 0.12), xf([2, -0.63, -3.4]), MAT.LIME, PART.LOGO);
  B.add(box(20, 0.02, 0.12), xf([2, -0.63, 3.4]), MAT.LIME, PART.LOGO);

  /* --------------------------------------------------------- I/O bracket */
  B.add(roundedBox(0.28, 5.4, P.d + 0.6, 0.1, 2), xf([-16.1, 2.0, 0]), MAT.ALUM, PART.BRACKET);
  for (let i = 0; i < 4; i++) {
    const z = -4.2 + i * 2.8;
    B.add(roundedBox(0.9, 1.1, 2.0, 0.1, 2), xf([-15.5, 1.3, z]), MAT.CHROME, PART.PORTS);
    B.add(box(0.06, 0.55, 1.5), xf([-15.02, 1.3, z]), MAT.PLASTIC, PART.PORTS);
    B.add(box(0.04, 0.12, 1.2), xf([-14.98, 1.3, z]), MAT.FIBER, PART.PORTS, 1, i * 0.37);
  }

  /* ------------------------------------------------------------- package */
  const K = GEO.pkg;
  B.add(roundedBox(K.w, K.h, K.d, 0.06, 2), xf([K.x, 0.11 + K.h / 2, 0]), MAT.SUBSTRATE, PART.SUBSTRATE, 1, 2.0);
  B.add(box(K.w - 0.8, 0.18, K.d - 0.8), xf([K.x, 0.505, 0]), MAT.INTERPOSER, PART.INTERPOSER);

  /* Dark Matter Cache: a stacked-SRAM slab hybrid-bonded under the compute
     dies — invisible in the die shot until the die is lifted away. */
  for (const dx of [GEO.dieA, GEO.dieB]) {
    B.add(box(GEO.dieW + 0.1, 0.18, GEO.dieD + 0.1), xf([dx, 0.69, 0]), MAT.CACHE, PART.CACHE);
    B.add(box(GEO.dieW, 0.06, GEO.dieD), xf([dx, 0.81, 0]), MAT.SOLDER, PART.BUMPS);
  }

  /* Twin reticle-limit compute dies + the bridge that fuses them. */
  B.add(box(GEO.dieW, GEO.dieH, GEO.dieD), xf([GEO.dieA, GEO.dieY, 0]), MAT.DIE, PART.DIE_A, 1, 4.0);
  B.add(box(GEO.dieW, GEO.dieH, GEO.dieD), xf([GEO.dieB, GEO.dieY, 0]), MAT.DIE, PART.DIE_B, 1, 9.0);
  B.add(box(0.55, 0.30, GEO.dieD - 0.6), xf([(GEO.dieA + GEO.dieB) / 2, 0.99, 0]), MAT.INTERPOSER, PART.BRIDGE);

  /* On-die regions the camera can dive into. */
  const dieTop = GEO.dieY + GEO.dieH / 2;
  B.add(box(1.5, 0.02, 1.5), xf([GEO.dieA, dieTop + 0.011, 1.35]), MAT.SCHED, PART.SCHED);
  B.add(box(0.9, 0.02, 0.9), xf([GEO.dieB, dieTop + 0.011, -1.6]), MAT.SECURITY, PART.SECURITY);

  /* ------------------------------------------------------- HBM4e stacks */
  let hbmSeed = 0;
  for (const hx of GEO.hbmX) {
    for (const hz of GEO.hbmZ) {
      B.add(box(1.6, 0.85, 1.7), xf([hx, 1.025, hz]), MAT.HBM, PART.HBM, 1, hbmSeed++);
      B.add(box(1.7, 0.05, 1.8), xf([hx, 0.62, hz]), MAT.SOLDER, PART.HBM);
    }
  }

  /* ------------------------------------- co-packaged optics + pigtails */
  for (let i = 0; i < GEO.photX.length; i++) {
    const px = GEO.photX[i];
    B.add(box(2.2, 0.32, 1.5), xf([px, 0.27, GEO.photZ]), MAT.PHOTONIC, PART.PHOTONIC, 1, i);
    B.add(box(2.4, 0.06, 1.7), xf([px, 0.14, GEO.photZ]), MAT.SUBSTRATE, PART.PHOTONIC);
    // heat spreader ring
    B.add(box(2.6, 0.10, 0.12), xf([px, 0.20, GEO.photZ - 0.86]), MAT.COPPER, PART.PHOTONIC);
    // fibre pigtail arcing away to the bracket
    for (let f = 0; f < 3; f++) {
      const z0 = GEO.photZ - 0.4 + f * 0.4;
      const zEnd = -4.2 + i * 2.8 + (f - 1) * 0.3;
      const pathPts = [];
      for (let s = 0; s <= 16; s++) {
        const t = s / 16;
        const x = lerp(px - 1.2, -14.9, t);
        const y = 0.35 + Math.sin(t * Math.PI) * (0.55 + f * 0.12);
        const z = lerp(z0, zEnd, smoothstep(0, 1, t));
        pathPts.push([x, y, z]);
      }
      B.add(tube(pathPts, 0.055, 7), null, MAT.FIBER, PART.FIBER, 1, f * 0.3 + i * 0.11);
    }
  }

  /* ------------------------------------------------ vertical power stack */
  for (let r = 0; r < 2; r++) {
    const z = r ? 3.1 : -3.1;
    for (let i = 0; i < 8; i++) {
      const x = 1.6 + i * 1.42;
      B.add(roundedBox(0.95, 0.34, 0.95, 0.05, 2), xf([x, 0.28, z]), MAT.PLASTIC, PART.VRM);
      B.add(box(0.75, 0.02, 0.75), xf([x, 0.115, z]), MAT.GOLD, PART.VRM);
      B.add(roundedBox(1.15, 0.72, 1.15, 0.1, 2), xf([x, 0.47, z + (r ? 1.5 : -1.5)]), MAT.PLASTIC, PART.INDUCTOR);
      B.add(box(1.25, 0.16, 0.5), xf([x, 0.30, z + (r ? 1.5 : -1.5)]), MAT.COPPER, PART.INDUCTOR);
    }
  }
  for (let i = 0; i < 10; i++) {
    const x = 2.2 + (i % 5) * 2.2, z = i < 5 ? -0.9 : 0.9;
    B.add(cylinder(0.42, 0.42, 0.95, 18), xf([x, 0.585, z]), MAT.ALUM, PART.CAPS);
    B.add(cylinder(0.44, 0.44, 0.06, 18), xf([x, 1.03, z]), MAT.PLASTIC, PART.CAPS);
  }

  /* --------------------------------------------- 48 V inlet + fabric port */
  B.add(roundedBox(2.6, 1.0, 2.2, 0.12, 2), xf([13.6, 0.62, 0]), MAT.PLASTIC, PART.POWER);
  for (let i = 0; i < 6; i++) {
    B.add(box(0.22, 0.5, 0.22), xf([12.7 + (i % 3) * 0.7, 0.72, i < 3 ? -0.5 : 0.5]), MAT.GOLD, PART.POWER);
  }
  B.add(roundedBox(13.0, 0.9, 0.9, 0.1, 2), xf([-2.0, 0.56, 5.3]), MAT.PLASTIC, PART.HYPERMESH);
  for (let i = 0; i < 44; i++) {
    B.add(box(0.14, 0.5, 0.5), xf([-8.2 + i * 0.29, 0.58, 5.3]), MAT.GOLD, PART.HYPERMESH);
  }

  /* ---------------------------------------------------- discrete passives */
  const keepOut = (x, z) =>
    (x > K.x - K.w / 2 - 0.4 && x < K.x + K.w / 2 + 0.4 && Math.abs(z) < K.d / 2 + 0.4) ||
    (x > 0.6 && x < 12.6 && Math.abs(z) < 5.0) ||
    (z < -4.0 && x < 0.6) || (z > 4.6) || (x > 12.0);
  for (let i = 0; i < 260; i++) {
    const x = -15 + rnd() * 30, z = -5.4 + rnd() * 10.8;
    if (keepOut(x, z)) continue;
    const big = rnd() > 0.72;
    const w = big ? 0.34 : 0.16, d = big ? 0.18 : 0.09;
    const rot = rnd() > 0.5 ? Math.PI / 2 : 0;
    B.add(box(w, big ? 0.12 : 0.07, d), xf([x, 0.11 + (big ? 0.06 : 0.035), z], [0, rot, 0]),
      rnd() > 0.4 ? MAT.CERAMIC : MAT.PLASTIC, PART.SMD);
  }

  /* ---------------------------------------------- vapour chamber + fins */
  // Evaporator plate (micro-channel side faces the dies).
  B.add(box(23.5, 0.26, 10.6), xf([-2.2, 1.62, 0]), MAT.CHANNEL, PART.CHANNELS);
  // Condenser lid.
  B.add(roundedBox(23.5, 0.42, 10.6, 0.08, 2), xf([-2.2, 1.97, 0]), MAT.COPPER, PART.COLDPLATE);
  B.add(box(23.0, 0.05, 10.2), xf([-2.2, 1.45, 0]), MAT.GRAPHITE, PART.COLDPLATE);

  const finCount = 34;
  for (let i = 0; i < finCount; i++) {
    const z = -5.0 + (i / (finCount - 1)) * 10.0;
    B.add(box(22.0, 2.9, 0.09), xf([-2.2, 3.55, z]), MAT.ALUM, PART.FINS);
  }
  for (let i = 0; i < 3; i++) {
    B.add(box(0.5, 2.9, 10.2), xf([-12.6 + i * 10.4, 3.55, 0]), MAT.ALUM, PART.FINS);
  }

  /* ------------------------------------------------------ exoframe shroud */
  for (const z of [-6.35, 6.35]) {
    B.add(roundedBox(31.0, 5.6, 0.55, 0.14, 3), xf([-0.4, 2.6, z]), MAT.ANODIZED, PART.SHROUD);
  }
  B.add(roundedBox(0.55, 5.6, 13.2, 0.14, 3), xf([14.8, 2.6, 0]), MAT.ANODIZED, PART.SHROUD);
  /* Top deck: three milled plates with two intake slots between them. Closing
     the top gives the card a designed face instead of a haze of fin edges. */
  for (const [z, d] of [[-4.7, 3.2], [0, 4.2], [4.7, 3.2]]) {
    B.add(roundedBox(29.6, 0.38, d, 0.10, 2), xf([-0.4, 5.56, z]), MAT.ANODIZED, PART.SHROUD);
  }
  // lime inlays lining the intake slots
  for (const z of [-3.06, -2.14, 2.14, 3.06]) {
    B.add(box(28.4, 0.04, 0.09), xf([-0.4, 5.755, z]), MAT.LIME, PART.LIGHTBAR);
  }
  // telemetry light bar down the front rail
  B.add(box(26.0, 0.42, 0.05), xf([-1.4, 4.3, -6.64]), MAT.LIME, PART.LIGHTBAR);
  B.add(box(26.0, 0.42, 0.05), xf([-1.4, 4.3, 6.64]), MAT.LIME, PART.LIGHTBAR);
  // wordmark plate
  B.add(roundedBox(0.85, 0.85, 0.05, 0.12, 2), xf([7.1, 2.2, 6.66]), MAT.LIME, PART.LOGO);
  B.add(roundedBox(3.4, 0.52, 0.04, 0.08, 2), xf([9.3, 2.2, 6.65]), MAT.CHROME, PART.LOGO);
  B.add(roundedBox(3.0, 0.42, 0.04, 0.07, 2), xf([-9.5, 2.2, 6.65]), MAT.CHROME, PART.LOGO);

  /* --------------------------------------------------------------- screws */
  for (const sx of [-14.9, -0.4, 14.0]) {
    for (const sz of [-5.6, 5.6]) {
      B.add(cylinder(0.22, 0.24, 0.3, 12), xf([sx, -0.62, sz]), MAT.CHROME, PART.SCREWS);
    }
  }

  B.fixWinding();
  return B;
}

/** Points of interest on the finished board, in world space. */
const ANCHORS = {
  die: [(GEO.dieA + GEO.dieB) / 2, 1.22, 0],
  dieA: [GEO.dieA, 1.22, -0.6],
  cache: [GEO.dieA, 0.70, 2.35],
  hbm: [GEO.hbmX[0], 1.46, GEO.hbmZ[0]],
  optics: [GEO.photX[1], 0.45, GEO.photZ],
  vapour: [-2.2, 1.75, 3.6],
  power: [6.0, 0.85, 4.6],
  sched: [GEO.dieA, 1.23, 1.35],
  trust: [GEO.dieB, 1.23, -1.6],
};
