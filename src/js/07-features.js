/* ============================================================================
   07 · FEATURE DATABASE
   Eight invented-but-plausible subsystems. Each one owns a camera framing, a
   cutaway recipe (which parts dissolve, which lift away) and a macro framing
   that puts the lens millimetres from the silicon.
   ========================================================================== */

const COOLER = [PART.SHROUD, PART.FINS, PART.COLDPLATE, PART.CHANNELS, PART.LIGHTBAR];
const COOLER_KEEP_CHANNELS = [PART.SHROUD, PART.FINS, PART.COLDPLATE, PART.LIGHTBAR];

const FEATURES = [
  {
    id: 'die',
    side: 'left',
    tag: '01',
    kicker: 'COMPUTE',
    title: 'Twin-Reticle Compute Engine',
    teaser: 'Two reticle-limit dies fused into one logical GPU.',
    anchor: ANCHORS.die,
    view: { target: ANCHORS.die, yaw: 0.30, pitch: 0.72, dist: 11.5 },
    macro: { target: [GEO.dieA + 0.3, 1.21, -0.4], yaw: 0.22, pitch: 0.55, dist: 1.35 },
    hide: COOLER,
    lift: {},
    macroHint: 'Streaming-multiprocessor tiles · 26 µm cell rows · live NoC packets',
    specs: [
      ['Transistors', '208 B'],
      ['Process', 'TSMC N2P-A'],
      ['Die area', '2 × 858 mm²'],
      ['Bridge bandwidth', '24 TB/s'],
      ['FP4 dense', '41 PFLOPS'],
      ['SM count', '2 × 192'],
    ],
    body: `Rubin abandons the single-die ceiling. Two reticle-limit dies sit 4 mm apart on a
    CoWoS-Ω interposer and are stitched by a <b>silicon reticle bridge</b> carrying 24 TB/s of
    coherent traffic — enough that the scheduler, the cache hierarchy and the memory controllers
    all believe they are running on one piece of silicon. Cross-die latency is 11 ns, roughly the
    cost of an on-die L2 hop on the previous generation.`,
  },
  {
    id: 'cache',
    side: 'left',
    tag: '02',
    kicker: 'MEMORY',
    title: 'Dark Matter Cache',
    teaser: '1.2 GB of SRAM you never see — bonded beneath the dies.',
    anchor: ANCHORS.cache,
    view: { target: [GEO.dieA, 0.9, 0.4], yaw: -0.55, pitch: 0.55, dist: 10.0 },
    macro: { target: [GEO.dieA + 0.2, 0.70, 1.9], yaw: -0.35, pitch: 0.30, dist: 1.6 },
    hide: COOLER,
    lift: { [PART.DIE_A]: [0, 3.4, 0], [PART.BUMPS]: [0, 1.6, 0], [PART.SCHED]: [0, 3.4, 0] },
    macroHint: 'Hybrid-bond micro-bumps at 3 µm pitch over stacked SRAM macros',
    specs: [
      ['Capacity', '1.2 GB'],
      ['Bandwidth', '128 TB/s'],
      ['Load-to-use', '11 ns'],
      ['Bond pitch', '3 µm'],
      ['Bonding', 'Hybrid Cu–Cu'],
      ['Power', '0.19 pJ/bit'],
    ],
    body: `Named for the astronomer who proved the universe is mostly made of things you cannot see,
    the <b>Dark Matter Cache</b> is a full SRAM wafer hybrid-bonded <i>underneath</i> each compute die.
    It never appears in the occupancy model and it is never explicitly addressed — the memory system
    simply behaves as though HBM were twenty times faster than it is. Lift the die away and the
    cache is right there, holding 1.2 GB at 128 TB/s.`,
  },
  {
    id: 'hbm',
    side: 'left',
    tag: '03',
    kicker: 'BANDWIDTH',
    title: 'HBM4e Halo Stacks',
    teaser: '288 GB at 22.4 TB/s, ringed around the compute.',
    anchor: ANCHORS.hbm,
    view: { target: [GEO.hbmX[0], 1.1, GEO.hbmZ[0]], yaw: -0.95, pitch: 0.42, dist: 8.0 },
    macro: { target: [GEO.hbmX[0] - 0.72, 1.05, GEO.hbmZ[0] - 0.5], yaw: -1.02, pitch: 0.30, dist: 3.3 },
    hide: COOLER,
    lift: {},
    macroHint: 'Sixteen laminated DRAM dies · through-silicon vias at the seam',
    specs: [
      ['Capacity', '288 GB'],
      ['Bandwidth', '22.4 TB/s'],
      ['Stacks', '8 × 16-high'],
      ['Per stack', '36 GB · 2.8 TB/s'],
      ['Interface', '2048-bit @ 11 Gb/s'],
      ['Refresh', 'Zero-stall ZQ'],
    ],
    body: `Eight 16-high HBM4e stacks form a halo around the compute dies — close enough that the
    longest wire on the interposer is under 9 mm. Each stack carries its own base-die memory
    controller with an <b>on-package refresh scheduler</b>, so refresh never collides with a tensor
    load. Aggregate: 288 GB, 22.4 TB/s, and a measured 94% bus utilisation on 4-bit attention kernels.`,
  },
  {
    id: 'optics',
    side: 'left',
    tag: '04',
    kicker: 'FABRIC',
    title: 'LightBridge Co-Packaged Optics',
    teaser: 'Photons leave the package — copper never gets a chance.',
    anchor: ANCHORS.optics,
    view: { target: [GEO.photX[1], 0.6, GEO.photZ + 0.4], yaw: 0.15, pitch: 0.40, dist: 8.5 },
    macro: { target: [GEO.photX[1] + 0.1, 0.44, GEO.photZ], yaw: 0.08, pitch: 0.52, dist: 2.3 },
    hide: COOLER,
    lift: {},
    macroHint: 'Silicon waveguides, ring modulators and live traffic at 1310 nm',
    specs: [
      ['Aggregate', '51.2 Tb/s'],
      ['Engines', '3 × 17.1 Tb/s'],
      ['Energy', '4.1 pJ/bit'],
      ['Reach', '2 km · SMF'],
      ['Wavelengths', '16 λ per fibre'],
      ['Latency add', '38 ns'],
    ],
    body: `Electrical SerDes stop at the package edge. Three silicon-photonics engines sit inside the
    lid, modulating 16 wavelengths per fibre with micro-ring resonators tuned by an on-die thermal
    control loop. The result is <b>51.2 Tb/s leaving the accelerator as light</b>, at a third of the
    energy per bit of a retimed copper link, and with a flat latency profile out to two kilometres —
    a rack becomes a plausible unit of compute.`,
  },
  {
    id: 'vapour',
    side: 'right',
    tag: '05',
    kicker: 'THERMAL',
    title: 'Two-Phase Micro-Channel Evaporator',
    teaser: '1.9 kW pulled out through 0.18 mm channels.',
    anchor: ANCHORS.vapour,
    view: { target: [-3.0, 2.5, 0.6], yaw: 0.42, pitch: 0.66, dist: 16.5 },
    macro: { target: [-6.0, 2.76, 1.6], yaw: 0.30, pitch: 0.33, dist: 4.4 },
    hide: COOLER_KEEP_CHANNELS,
    lift: { [PART.CHANNELS]: [0, 1.1, 0] },
    macroHint: 'Skived copper fins · 0.18 mm channels · vapour slugs in flight',
    specs: [
      ['Heat removed', '1.9 kW'],
      ['Channels', '2,048 × 0.18 mm'],
      ['Working fluid', 'R-1233zd(E)'],
      ['ΔT die-to-fluid', '14 °C'],
      ['Pump power', '9 W'],
      ['Dryout margin', '1.6×'],
    ],
    body: `A single-phase cold plate gives up somewhere north of a kilowatt. Rubin's evaporator is
    <b>two-phase</b>: the coolant boils directly above the hotspots, and the latent heat of
    vaporisation does the work. 2,048 skived channels, each 180 µm wide, sit 400 µm from the die
    surface. Vapour quality is measured per-channel and the pump trims flow in 12 ms — you can watch
    the slugs sprint down the channels in the macro view.`,
  },
  {
    id: 'power',
    side: 'right',
    tag: '06',
    kicker: 'POWER',
    title: 'Vertical Power Delivery',
    teaser: '48 V straight to 0.62 V, 1,850 A, in one conversion.',
    anchor: ANCHORS.power,
    view: { target: [6.0, 0.8, 2.4], yaw: 0.75, pitch: 0.55, dist: 12.0 },
    macro: { target: [4.4, 0.75, 4.6], yaw: 0.55, pitch: 0.28, dist: 2.0 },
    hide: COOLER,
    lift: {},
    macroHint: 'Coupled inductors, GaN half-bridges and the backside power via field',
    specs: [
      ['Peak current', '1,850 A'],
      ['Conversion', '48 V → 0.62 V'],
      ['Efficiency', '96.4%'],
      ['Phases', '16 coupled'],
      ['Transient', '2.1 mV/A'],
      ['Delivery', 'Backside PDN'],
    ],
    body: `Sixteen GaN half-bridges convert 48 V to core voltage in a single stage, directly beneath
    the package. Power reaches the transistors from the <i>back</i> of the wafer through a dedicated
    via layer, so the front-side metal stack is freed for signal routing — worth roughly 7% frequency
    at the same power. Droop is held to 2.1 mV/A through a 1,850 A load step.`,
  },
  {
    id: 'sched',
    side: 'right',
    tag: '07',
    kicker: 'SILICON',
    title: 'Rotation-Curve Scheduler',
    teaser: 'Every SM turns at the same speed, whatever its radius.',
    anchor: ANCHORS.sched,
    view: { target: [GEO.dieA, 1.2, 1.35], yaw: 0.18, pitch: 0.80, dist: 6.0 },
    macro: { target: [GEO.dieA, 1.22, 1.35], yaw: 0.10, pitch: 0.88, dist: 1.05 },
    hide: COOLER,
    lift: {},
    macroHint: 'Warp orbits held at constant angular velocity across the die',
    specs: [
      ['Resident warps', '128 K'],
      ['Rebalance', 'every 4 ns'],
      ['Occupancy flatness', '99.2%'],
      ['Tail jitter', '< 0.3%'],
      ['Domains', '384 SMs'],
      ['Overhead', '0.4% area'],
    ],
    body: `Vera Rubin's great discovery was that galaxies rotate <i>flat</i>: stars at the edge move as
    fast as stars near the core, which is how we know dark matter is there. Rubin's hardware scheduler
    borrows the idea. Warps at the electrically distant edge of the die are held at the <b>same
    effective throughput</b> as warps beside the cache, by continuously redistributing power budget and
    issue slots. The occupancy curve across 384 SMs comes out flat to 99.2%.`,
  },
  {
    id: 'trust',
    side: 'right',
    tag: '08',
    kicker: 'SECURITY',
    title: 'Photon-Sealed Root of Trust',
    teaser: 'Post-quantum attestation, sealed under a tamper mesh.',
    anchor: ANCHORS.trust,
    view: { target: [GEO.dieB, 1.2, -1.6], yaw: -0.22, pitch: 0.78, dist: 5.5 },
    macro: { target: [GEO.dieB, 1.22, -1.6], yaw: -0.10, pitch: 0.86, dist: 0.95 },
    hide: COOLER,
    lift: {},
    macroHint: 'Serpentine tamper-sense mesh over the enclave, sampled at 4 GHz',
    specs: [
      ['Signature', 'ML-DSA-87'],
      ['Key exchange', 'ML-KEM-1024'],
      ['Tamper mesh', '100 µm serpentine'],
      ['Zeroise', '8 ms'],
      ['Boot chain', 'Fully attested'],
      ['Tenancy', 'Hardware-partitioned'],
    ],
    body: `Every tenant on a shared accelerator wants proof of what they are running on. A dedicated
    enclave on die B holds post-quantum identity keys behind a <b>serpentine tamper mesh</b> — a
    100 µm sense wire woven over the block, sampled at 4 GHz. Break it, probe it, chill it, and the
    keys are gone in 8 ms. Attestation covers the boot chain, the firmware, the optics and the
    scheduler's partition table.`,
  },
];

/** Headline numbers shown in the overview spec ribbon. */
const HEADLINE = [
  ['41', 'PFLOPS FP4'],
  ['288', 'GB HBM4e'],
  ['22.4', 'TB/s memory'],
  ['51.2', 'Tb/s optical'],
  ['208', 'B transistors'],
  ['1.9', 'kW two-phase'],
];
