/* ============================================================================
   08 · RENDERER — orchestrates the frame.
   shadow → backdrop → forward PBR → dust → SSAO → DoF → bloom → grade → FXAA
   ========================================================================== */

class Renderer {
  constructor(canvas) {
    const attrs = {
      alpha: false, antialias: false, depth: true, stencil: false,
      premultipliedAlpha: false, preserveDrawingBuffer: false,
      powerPreference: 'high-performance', desynchronized: false,
    };
    const gl = canvas.getContext('webgl2', attrs);
    if (!gl) throw new Error('WebGL2 unavailable');
    this.gl = gl;
    this.canvas = canvas;

    this.hasFloat = !!gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('OES_texture_float_linear');
    const maxSamples = gl.getParameter(gl.MAX_SAMPLES) || 0;
    this.samples = Math.min(4, maxSamples);

    this.progs = {
      scene: new Program(gl, SCENE_VS, SCENE_FS, 'scene'),
      depth: new Program(gl, DEPTH_VS, DEPTH_FS, 'depth'),
      pick: new Program(gl, PICK_VS, PICK_FS, 'pick'),
      bg: new Program(gl, BG_VS, BG_FS, 'bg'),
      dust: new Program(gl, DUST_VS, DUST_FS, 'dust'),
      ssao: new Program(gl, QUAD_VS, SSAO_FS, 'ssao'),
      blur: new Program(gl, QUAD_VS, BLUR_FS, 'blur'),
      copy: new Program(gl, QUAD_VS, COPY_FS, 'copy'),
      bright: new Program(gl, QUAD_VS, BRIGHT_FS, 'bright'),
      comp: new Program(gl, QUAD_VS, COMPOSITE_FS, 'composite'),
      fxaa: new Program(gl, QUAD_VS, FXAA_FS, 'fxaa'),
    };

    this.emptyVao = gl.createVertexArray();
    this._buildMesh();
    this._buildDust();

    const F = this.hasFloat;
    this.shadowSize = 2048;
    this.shadowT = new Target(gl, this.shadowSize, this.shadowSize, { depthTexture: true, filter: false });
    this.sceneT = new Target(gl, 2, 2, { float: F, depthTexture: true, samples: this.samples });
    this.aoT = new Target(gl, 2, 2, {});
    this.aoTmp = new Target(gl, 2, 2, {});
    this.dofHalf = new Target(gl, 2, 2, { float: F });
    this.dofHalfTmp = new Target(gl, 2, 2, { float: F });
    this.dofQuad = new Target(gl, 2, 2, { float: F });
    this.dofQuadTmp = new Target(gl, 2, 2, { float: F });
    this.bloom = [];
    for (let i = 0; i < 5; i++) {
      this.bloom.push({
        a: new Target(gl, 2, 2, { float: F }),
        b: new Target(gl, 2, 2, { float: F }),
      });
    }
    this.ldrT = new Target(gl, 2, 2, {});
    this.pickT = new Target(gl, 2, 2, { depth: true, filter: false });

    this.lightVP = M4.create();
    this.viewProj = M4.create();
    this.view = M4.create();
    this.proj = M4.create();
    this.invProj = M4.create();
    this._pickPixel = new Uint8Array(4);
    this.width = 2; this.height = 2; this.dpr = 1;
  }

  /* ------------------------------------------------------------- geometry */
  _buildMesh() {
    const gl = this.gl;
    const builder = buildScene();
    const packed = builder.pack();
    this.triCount = builder.triCount;
    this.vertCount = packed.vertexCount;
    this.indexCount = packed.indices.length;
    this.indexType = packed.indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, packed.vertices, gl.STATIC_DRAW);
    const S = 12 * 4;
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, S, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, S, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, S, 24);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.FLOAT, false, S, 32);
    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, packed.indices, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
  }

  _buildDust() {
    const gl = this.gl;
    const N = 900;
    const data = new Float32Array(N * 5);
    const rnd = mulberry32(77);
    for (let i = 0; i < N; i++) {
      const r = 12 + Math.pow(rnd(), 0.6) * 46;
      const a = rnd() * Math.PI * 2;
      data[i * 5] = Math.cos(a) * r;
      data[i * 5 + 1] = -6 + rnd() * 30;
      data[i * 5 + 2] = Math.sin(a) * r * 0.8;
      data[i * 5 + 3] = rnd();
      data[i * 5 + 4] = rnd();
    }
    this.dustCount = N;
    this.dustVao = gl.createVertexArray();
    gl.bindVertexArray(this.dustVao);
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 20, 12);
    gl.bindVertexArray(null);
  }

  /* --------------------------------------------------------------- resize */
  resize(w, h, dpr) {
    this.width = Math.max(2, Math.round(w * dpr));
    this.height = Math.max(2, Math.round(h * dpr));
    this.dpr = dpr;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    const W = this.width, H = this.height;
    this.sceneT.resize(W, H);
    this.ldrT.resize(W, H);
    this.aoT.resize(W >> 1, H >> 1);
    this.aoTmp.resize(W >> 1, H >> 1);
    this.dofHalf.resize(W >> 1, H >> 1);
    this.dofHalfTmp.resize(W >> 1, H >> 1);
    this.dofQuad.resize(W >> 2, H >> 2);
    this.dofQuadTmp.resize(W >> 2, H >> 2);
    for (let i = 0; i < this.bloom.length; i++) {
      const s = 1 << (i + 1);
      this.bloom[i].a.resize(W / s, H / s);
      this.bloom[i].b.resize(W / s, H / s);
    }
    this.pickT.resize(Math.max(2, W >> 1), Math.max(2, H >> 1));
  }

  /* ------------------------------------------------------------- helpers */
  _quad(prog, uniforms, target) {
    const gl = this.gl;
    if (target) { target.bind(); } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this.width, this.height);
    }
    prog.use(uniforms);
    gl.bindVertexArray(this.emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  _blurInto(src, tmp, dst, radius) {
    this._quad(this.progs.blur, { u_tex: src.tex, u_dir: [radius / dst.w, 0] }, tmp);
    this._quad(this.progs.blur, { u_tex: tmp.tex, u_dir: [0, radius / dst.h] }, dst);
  }

  /* -------------------------------------------------------------- camera */
  setCamera(cam, aspect) {
    const near = Math.max(0.004, cam.dist * 0.012);
    const far = Math.max(400, cam.dist * 60);
    this.near = near; this.far = far;
    M4.perspective(this.proj, cam.fov, aspect, near, far);
    M4.lookAt(this.view, cam.pos, cam.target, [0, 1, 0]);
    M4.mul(this.viewProj, this.proj, this.view);
    M4.invert(this.invProj, this.proj);
  }

  /* ---------------------------------------------------------------- draw */
  render(s) {
    const gl = this.gl;
    const parts = s.parts, partFx = s.partFx;

    /* --- shadow map ---------------------------------------------------- */
    const lightDir = V3.norm([0.42, 0.86, 0.30]);
    const centre = [-2, 1.5, 0], ext = 21;
    const eye = V3.add(centre, V3.scale(lightDir, 40));
    const lv = M4.lookAt(M4.create(), eye, centre, [0, 1, 0]);
    const lp = M4.ortho(M4.create(), -ext, ext, -ext * 0.62, ext * 0.62, 1, 90);
    M4.mul(this.lightVP, lp, lv);

    this.shadowT.bind();
    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.FRONT);
    this.progs.depth.use({ u_viewProj: this.lightVP, u_part: parts });
    gl.bindVertexArray(this.vao);
    gl.drawElements(gl.TRIANGLES, this.indexCount, this.indexType, 0);
    gl.cullFace(gl.BACK);

    /* --- main pass ----------------------------------------------------- */
    this.sceneT.bind();
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    this.progs.bg.use({ u_res: [this.width, this.height], u_time: s.time, u_focusAmt: s.focusAmt });
    gl.bindVertexArray(this.emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    this.progs.scene.use({
      u_viewProj: this.viewProj,
      u_camPos: s.camPos,
      u_time: s.time,
      u_lightVP: this.lightVP,
      u_shadow: this.shadowT.depthTex,
      u_shadowTexel: 1 / this.shadowSize,
      u_part: parts,
      u_partFx: partFx,
      u_xrayAmt: s.xray,
      u_focusPoint: s.focusPoint,
      u_focusAmt: s.focusAmt,
    });
    gl.bindVertexArray(this.vao);
    gl.drawElements(gl.TRIANGLES, this.indexCount, this.indexType, 0);

    // atmospheric dust
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.depthMask(false);
    this.progs.dust.use({ u_viewProj: this.viewProj, u_time: s.time, u_pixelRatio: this.dpr });
    gl.bindVertexArray(this.dustVao);
    gl.drawArrays(gl.POINTS, 0, this.dustCount);
    gl.depthMask(true);
    gl.disable(gl.BLEND);

    this.sceneT.resolve();

    /* --- SSAO ---------------------------------------------------------- */
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    this._quad(this.progs.ssao, {
      u_depth: this.sceneT.depthTex,
      u_invProj: this.invProj,
      u_proj: this.proj,
      u_res: [this.aoT.w, this.aoT.h],
      u_radius: s.aoRadius,
      u_time: s.time,
    }, this.aoT);
    this._blurInto(this.aoT, this.aoTmp, this.aoT, 1.0);

    /* --- depth of field source ----------------------------------------- */
    this._quad(this.progs.copy, { u_tex: this.sceneT.tex }, this.dofHalf);
    this._blurInto(this.dofHalf, this.dofHalfTmp, this.dofHalf, 1.4);
    this._quad(this.progs.copy, { u_tex: this.dofHalf.tex }, this.dofQuad);
    this._blurInto(this.dofQuad, this.dofQuadTmp, this.dofQuad, 1.8);

    /* --- bloom chain ---------------------------------------------------- */
    this._quad(this.progs.bright, {
      u_tex: this.sceneT.tex, u_threshold: 1.30, u_knee: 0.6,
    }, this.bloom[0].a);
    this._blurInto(this.bloom[0].a, this.bloom[0].b, this.bloom[0].a, 1.2);
    for (let i = 1; i < this.bloom.length; i++) {
      this._quad(this.progs.copy, { u_tex: this.bloom[i - 1].a.tex }, this.bloom[i].a);
      this._blurInto(this.bloom[i].a, this.bloom[i].b, this.bloom[i].a, 1.3);
    }

    /* --- composite + FXAA ---------------------------------------------- */
    this._quad(this.progs.comp, {
      u_scene: this.sceneT.tex,
      u_depth: this.sceneT.depthTex,
      u_ao: this.aoT.tex,
      u_b0: this.bloom[0].a.tex,
      u_b1: this.bloom[1].a.tex,
      u_b2: this.bloom[2].a.tex,
      u_b3: this.bloom[3].a.tex,
      u_b4: this.bloom[4].a.tex,
      u_dofHalf: this.dofHalf.tex,
      u_dofQuarter: this.dofQuad.tex,
      u_res: [this.width, this.height],
      u_time: s.time,
      u_bloom: s.bloom,
      u_aoAmt: s.ao,
      u_focusDist: s.focusDist,
      u_dofAmt: s.dof,
      u_near: this.near,
      u_far: this.far,
      u_vignette: s.vignette,
      u_exposure: s.exposure,
      u_reveal: s.reveal,
    }, this.ldrT);

    this._quad(this.progs.fxaa, { u_tex: this.ldrT.tex, u_res: [this.width, this.height] }, null);
    gl.enable(gl.CULL_FACE);
  }

  /** Read the part id under a CSS-pixel coordinate. Returns -1 for background. */
  pick(x, y, parts) {
    const gl = this.gl;
    const t = this.pickT;
    t.bind();
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    this.progs.pick.use({ u_viewProj: this.viewProj, u_part: parts });
    gl.bindVertexArray(this.vao);
    gl.drawElements(gl.TRIANGLES, this.indexCount, this.indexType, 0);
    const px = clamp(Math.round(x * this.dpr / 2), 0, t.w - 1);
    const py = clamp(Math.round((this.height / this.dpr - y) * this.dpr / 2), 0, t.h - 1);
    gl.readPixels(px, py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, this._pickPixel);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return this._pickPixel[0] - 1;
  }
}
