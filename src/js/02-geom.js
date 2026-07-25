/* ============================================================================
   02 · GEOMETRY — procedural primitives + a single interleaved mega-buffer.

   Everything in the scene is baked into ONE vertex buffer. Per-vertex we carry
   a "info" vec4 = (materialId, partId, detailScale, seed) so a single draw call
   can render dozens of physically different surfaces, and so the vertex shader
   can offset / dissolve individual parts (explode view, cutaways) by indexing a
   small uniform array. One draw call for the whole GPU; one for shadows; one
   for the picking buffer.
   ========================================================================== */

/** Build a TRS matrix. rot is XYZ euler in radians. */
function xf(t = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) {
  const [rx, ry, rz] = r;
  const cx = Math.cos(rx), sx = Math.sin(rx);
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const cz = Math.cos(rz), sz = Math.sin(rz);
  // R = Rz * Ry * Rx  (column-major)
  const m = new Float32Array(16);
  const m00 = cz * cy, m01 = cz * sy * sx - sz * cx, m02 = cz * sy * cx + sz * sx;
  const m10 = sz * cy, m11 = sz * sy * sx + cz * cx, m12 = sz * sy * cx - cz * sx;
  const m20 = -sy, m21 = cy * sx, m22 = cy * cx;
  m[0] = m00 * s[0]; m[1] = m10 * s[0]; m[2] = m20 * s[0]; m[3] = 0;
  m[4] = m01 * s[1]; m[5] = m11 * s[1]; m[6] = m21 * s[1]; m[7] = 0;
  m[8] = m02 * s[2]; m[9] = m12 * s[2]; m[10] = m22 * s[2]; m[11] = 0;
  m[12] = t[0]; m[13] = t[1]; m[14] = t[2]; m[15] = 1;
  return m;
}

/* ---------------------------------------------------------------- primitives */

/** Axis-aligned box centred on the origin. Per-face UVs run 0..1. */
function box(w, h, d) {
  const x = w / 2, y = h / 2, z = d / 2;
  const P = [], N = [], U = [], I = [];
  const faces = [
    { n: [1, 0, 0], o: [x, 0, 0], u: [0, 0, -1], v: [0, 1, 0], su: d, sv: h },
    { n: [-1, 0, 0], o: [-x, 0, 0], u: [0, 0, 1], v: [0, 1, 0], su: d, sv: h },
    { n: [0, 1, 0], o: [0, y, 0], u: [1, 0, 0], v: [0, 0, 1], su: w, sv: d },
    { n: [0, -1, 0], o: [0, -y, 0], u: [1, 0, 0], v: [0, 0, -1], su: w, sv: d },
    { n: [0, 0, 1], o: [0, 0, z], u: [1, 0, 0], v: [0, 1, 0], su: w, sv: h },
    { n: [0, 0, -1], o: [0, 0, -z], u: [-1, 0, 0], v: [0, 1, 0], su: w, sv: h },
  ];
  for (const f of faces) {
    const base = P.length / 3;
    for (let j = 0; j < 2; j++) {
      for (let i = 0; i < 2; i++) {
        const a = (i - 0.5) * f.su, b = (j - 0.5) * f.sv;
        P.push(f.o[0] + f.u[0] * a + f.v[0] * b,
          f.o[1] + f.u[1] * a + f.v[1] * b,
          f.o[2] + f.u[2] * a + f.v[2] * b);
        N.push(f.n[0], f.n[1], f.n[2]);
        U.push(i, j);
      }
    }
    I.push(base, base + 1, base + 3, base, base + 3, base + 2);
  }
  return { P, N, U, I };
}

/** Box with rounded edges & corners — the workhorse for anything machined. */
function roundedBox(w, h, d, r, seg = 3) {
  r = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
  const half = [w / 2, h / 2, d / 2];
  const P = [], N = [], U = [], I = [];
  // Sample positions along one axis: dense at the rounded ends, one flat span.
  const coords = (hh) => {
    const a = [];
    for (let i = 0; i <= seg; i++) a.push(-hh + r * (1 - Math.cos((i / seg) * Math.PI / 2)));
    for (let i = 0; i <= seg; i++) a.push(hh - r + r * Math.sin((i / seg) * Math.PI / 2));
    return a;
  };
  const axes = [
    { n: 0, u: 2, v: 1, s: 1 }, { n: 0, u: 2, v: 1, s: -1 },
    { n: 1, u: 0, v: 2, s: 1 }, { n: 1, u: 0, v: 2, s: -1 },
    { n: 2, u: 0, v: 1, s: 1 }, { n: 2, u: 0, v: 1, s: -1 },
  ];
  for (const ax of axes) {
    const cu = coords(half[ax.u]), cv = coords(half[ax.v]);
    const base = P.length / 3;
    for (let j = 0; j < cv.length; j++) {
      for (let i = 0; i < cu.length; i++) {
        const a = ax.s > 0 ? cu[i] : -cu[i], b = cv[j];
        // Point on the true box face, and the same point clamped inside the
        // rounding inset — the offset between them is the surface normal.
        const p = [0, 0, 0], q = [0, 0, 0];
        p[ax.n] = ax.s * half[ax.n]; q[ax.n] = ax.s * (half[ax.n] - r);
        p[ax.u] = a; q[ax.u] = clamp(a, -(half[ax.u] - r), half[ax.u] - r);
        p[ax.v] = b; q[ax.v] = clamp(b, -(half[ax.v] - r), half[ax.v] - r);
        const dv = [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
        const l = Math.hypot(dv[0], dv[1], dv[2]) || 1;
        const n = [dv[0] / l, dv[1] / l, dv[2] / l];
        P.push(q[0] + n[0] * r, q[1] + n[1] * r, q[2] + n[2] * r);
        N.push(n[0], n[1], n[2]);
        U.push(i / (cu.length - 1), j / (cv.length - 1));
      }
    }
    const W = cu.length;
    for (let j = 0; j < cv.length - 1; j++) {
      for (let i = 0; i < cu.length - 1; i++) {
        const k = base + j * W + i;
        I.push(k, k + 1, k + W + 1, k, k + W + 1, k + W);
      }
    }
  }
  return { P, N, U, I };
}

/** Y-axis cylinder centred on the origin. */
function cylinder(rTop, rBot, h, seg = 20, caps = true) {
  const P = [], N = [], U = [], I = [];
  const base = 0;
  for (let j = 0; j <= 1; j++) {
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      const rr = j ? rTop : rBot;
      P.push(c * rr, (j - 0.5) * h, s * rr);
      const slope = (rBot - rTop) / h;
      const n = [c, slope, s], l = Math.hypot(n[0], n[1], n[2]);
      N.push(n[0] / l, n[1] / l, n[2] / l);
      U.push(i / seg, j);
    }
  }
  for (let i = 0; i < seg; i++) {
    const k = base + i;
    I.push(k, k + seg + 1, k + seg + 2, k, k + seg + 2, k + 1);
  }
  if (caps) {
    for (let j = 0; j <= 1; j++) {
      const rr = j ? rTop : rBot, y = (j - 0.5) * h, ny = j ? 1 : -1;
      const c0 = P.length / 3;
      P.push(0, y, 0); N.push(0, ny, 0); U.push(0.5, 0.5);
      for (let i = 0; i <= seg; i++) {
        const a = (i / seg) * Math.PI * 2;
        P.push(Math.cos(a) * rr, y, Math.sin(a) * rr);
        N.push(0, ny, 0);
        U.push(0.5 + Math.cos(a) * 0.5, 0.5 + Math.sin(a) * 0.5);
      }
      for (let i = 0; i < seg; i++) {
        if (j) I.push(c0, c0 + 1 + i, c0 + 2 + i);
        else I.push(c0, c0 + 2 + i, c0 + 1 + i);
      }
    }
  }
  return { P, N, U, I };
}

/** Swept tube through a polyline — optical fibres, heatpipes, cabling. */
function tube(path, r, seg = 10) {
  const P = [], N = [], U = [], I = [];
  const n = path.length;
  let up = [0, 1, 0];
  for (let k = 0; k < n; k++) {
    const p = path[k];
    const prev = path[Math.max(0, k - 1)], next = path[Math.min(n - 1, k + 1)];
    const t = V3.norm(V3.sub(next, prev));
    let side = V3.norm([up[1] * t[2] - up[2] * t[1], up[2] * t[0] - up[0] * t[2], up[0] * t[1] - up[1] * t[0]]);
    if (!isFinite(side[0]) || V3.len(side) < 1e-4) side = [1, 0, 0];
    const nrm = V3.norm([t[1] * side[2] - t[2] * side[1], t[2] * side[0] - t[0] * side[2], t[0] * side[1] - t[1] * side[0]]);
    up = nrm;
    const rr = typeof r === 'function' ? r(k / (n - 1)) : r;
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      const dir = [side[0] * c + nrm[0] * s, side[1] * c + nrm[1] * s, side[2] * c + nrm[2] * s];
      P.push(p[0] + dir[0] * rr, p[1] + dir[1] * rr, p[2] + dir[2] * rr);
      N.push(dir[0], dir[1], dir[2]);
      U.push(i / seg, k / (n - 1));
    }
  }
  const W = seg + 1;
  for (let k = 0; k < n - 1; k++) {
    for (let i = 0; i < seg; i++) {
      const a = k * W + i;
      I.push(a, a + W, a + W + 1, a, a + W + 1, a + 1);
    }
  }
  return { P, N, U, I };
}

/** Catmull-Rom through a list of waypoints — used to route cabling. */
function smoothPath(pts, samples = 44) {
  const P = [pts[0], ...pts, pts[pts.length - 1]];
  const segs = P.length - 3;
  const per = Math.max(2, Math.round(samples / segs));
  const out = [];
  for (let s = 0; s < segs; s++) {
    const p0 = P[s], p1 = P[s + 1], p2 = P[s + 2], p3 = P[s + 3];
    for (let i = 0; i < per; i++) {
      const t = i / per, t2 = t * t, t3 = t2 * t;
      const p = [0, 0, 0];
      for (let k = 0; k < 3; k++) {
        p[k] = 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t
          + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2
          + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
      }
      out.push(p);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** Flat XZ plane, subdivided. */
function plane(w, d, sx = 1, sz = 1) {
  const P = [], N = [], U = [], I = [];
  for (let j = 0; j <= sz; j++) {
    for (let i = 0; i <= sx; i++) {
      P.push((i / sx - 0.5) * w, 0, (j / sz - 0.5) * d);
      N.push(0, 1, 0);
      U.push(i / sx, j / sz);
    }
  }
  for (let j = 0; j < sz; j++) {
    for (let i = 0; i < sx; i++) {
      const k = j * (sx + 1) + i;
      I.push(k, k + sx + 1, k + sx + 2, k, k + sx + 2, k + 1);
    }
  }
  return { P, N, U, I };
}

/* ------------------------------------------------------------------ builder */

class MeshBuilder {
  constructor() {
    this.P = []; this.N = []; this.U = []; this.F = []; this.I = [];
    this.bounds = { min: [1e9, 1e9, 1e9], max: [-1e9, -1e9, -1e9] };
  }

  /**
   * Append a primitive.
   * @param g   primitive {P,N,U,I}
   * @param m   4x4 transform (or null)
   * @param mat material id  (see MAT.* in the shader)
   * @param part part id — drives explode offset / dissolve / picking
   * @param det detail scale hint handed to the procedural shaders
   * @param seed per-instance random seed
   */
  add(g, m, mat, part, det = 1, seed = 0) {
    const base = this.P.length / 3;
    const nm = m ? M4.invert(M4.create(), m) : null; // normals: transpose(inverse)
    for (let i = 0; i < g.P.length; i += 3) {
      let x = g.P[i], y = g.P[i + 1], z = g.P[i + 2];
      let nx = g.N[i], ny = g.N[i + 1], nz = g.N[i + 2];
      if (m) {
        const px = m[0] * x + m[4] * y + m[8] * z + m[12];
        const py = m[1] * x + m[5] * y + m[9] * z + m[13];
        const pz = m[2] * x + m[6] * y + m[10] * z + m[14];
        x = px; y = py; z = pz;
        const ax = nm[0] * nx + nm[1] * ny + nm[2] * nz;
        const ay = nm[4] * nx + nm[5] * ny + nm[6] * nz;
        const az = nm[8] * nx + nm[9] * ny + nm[10] * nz;
        const l = Math.hypot(ax, ay, az) || 1;
        nx = ax / l; ny = ay / l; nz = az / l;
      }
      this.P.push(x, y, z);
      this.N.push(nx, ny, nz);
      this.F.push(mat, part, det, seed);
      const b = this.bounds;
      b.min[0] = Math.min(b.min[0], x); b.min[1] = Math.min(b.min[1], y); b.min[2] = Math.min(b.min[2], z);
      b.max[0] = Math.max(b.max[0], x); b.max[1] = Math.max(b.max[1], y); b.max[2] = Math.max(b.max[2], z);
    }
    for (let i = 0; i < g.U.length; i++) this.U.push(g.U[i]);
    for (let i = 0; i < g.I.length; i++) this.I.push(base + g.I[i]);
    return this;
  }

  get triCount() { return this.I.length / 3; }

  /**
   * Normals are the source of truth; winding is derived from them.
   * Every primitive here is generated from an explicit outward normal, but the
   * index order that falls out of a (u,v) parameter grid only agrees with that
   * normal when u × v happens to point along it — which it does not for half
   * the faces of a box. Rather than hand-verify six cross products per
   * primitive, flip any triangle whose geometric normal opposes its vertex
   * normals. Back-face culling and two-sided lighting then behave everywhere.
   */
  fixWinding() {
    const P = this.P, N = this.N, I = this.I;
    let flipped = 0;
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
      const e1x = P[b] - P[a], e1y = P[b + 1] - P[a + 1], e1z = P[b + 2] - P[a + 2];
      const e2x = P[c] - P[a], e2y = P[c + 1] - P[a + 1], e2z = P[c + 2] - P[a + 2];
      const gx = e1y * e2z - e1z * e2y;
      const gy = e1z * e2x - e1x * e2z;
      const gz = e1x * e2y - e1y * e2x;
      const nx = N[a] + N[b] + N[c], ny = N[a + 1] + N[b + 1] + N[c + 1],
        nz = N[a + 2] + N[b + 2] + N[c + 2];
      if (gx * nx + gy * ny + gz * nz < 0) {
        const tmp = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = tmp;
        flipped++;
      }
    }
    this.flipped = flipped;
    return flipped;
  }

  /** Interleave into one Float32Array: pos3 nrm3 uv2 info4 = 12 floats/vertex. */
  pack() {
    const n = this.P.length / 3;
    const v = new Float32Array(n * 12);
    for (let i = 0; i < n; i++) {
      const o = i * 12;
      v[o] = this.P[i * 3]; v[o + 1] = this.P[i * 3 + 1]; v[o + 2] = this.P[i * 3 + 2];
      v[o + 3] = this.N[i * 3]; v[o + 4] = this.N[i * 3 + 1]; v[o + 5] = this.N[i * 3 + 2];
      v[o + 6] = this.U[i * 2]; v[o + 7] = this.U[i * 2 + 1];
      v[o + 8] = this.F[i * 4]; v[o + 9] = this.F[i * 4 + 1];
      v[o + 10] = this.F[i * 4 + 2]; v[o + 11] = this.F[i * 4 + 3];
    }
    const idx = this.P.length / 3 > 65535
      ? new Uint32Array(this.I) : new Uint16Array(this.I);
    return { vertices: v, indices: idx, vertexCount: n };
  }
}
