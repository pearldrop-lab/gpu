/* ============================================================================
   05 · GL — a tiny WebGL2 wrapper: programs with reflected uniforms, render
   targets (with optional MSAA resolve), and a fullscreen-triangle helper.
   ========================================================================== */

class Program {
  constructor(gl, vsSrc, fsSrc, name) {
    this.gl = gl;
    this.name = name;
    const vs = this._compile(gl.VERTEX_SHADER, vsSrc, name + '.vs');
    const fs = this._compile(gl.FRAGMENT_SHADER, fsSrc, name + '.fs');
    const p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error(`link ${name}: ${gl.getProgramInfoLog(p)}`);
    }
    gl.deleteShader(vs); gl.deleteShader(fs);
    this.p = p;
    this.u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i);
      const base = info.name.replace(/\[0\]$/, '');
      this.u[base] = { loc: gl.getUniformLocation(p, info.name), type: info.type, size: info.size };
    }
    this._unit = 0;
  }
  _compile(type, src, label) {
    const gl = this.gl;
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s);
      const lines = src.split('\n').map((l, i) => `${String(i + 1).padStart(4)}| ${l}`);
      const m = /ERROR:\s*\d+:(\d+)/.exec(log);
      const ctx = m ? lines.slice(Math.max(0, +m[1] - 6), +m[1] + 4).join('\n') : '';
      throw new Error(`compile ${label}: ${log}\n${ctx}`);
    }
    return s;
  }
  use(uniforms) {
    const gl = this.gl;
    gl.useProgram(this.p);
    this._unit = 0;
    if (uniforms) this.set(uniforms);
    return this;
  }
  set(uniforms) {
    const gl = this.gl;
    for (const k in uniforms) {
      const d = this.u[k];
      if (!d) continue;
      const v = uniforms[k];
      switch (d.type) {
        case gl.FLOAT: Array.isArray(v) || ArrayBuffer.isView(v) ? gl.uniform1fv(d.loc, v) : gl.uniform1f(d.loc, v); break;
        case gl.FLOAT_VEC2: gl.uniform2fv(d.loc, v); break;
        case gl.FLOAT_VEC3: gl.uniform3fv(d.loc, v); break;
        case gl.FLOAT_VEC4: gl.uniform4fv(d.loc, v); break;
        case gl.INT: case gl.BOOL: gl.uniform1i(d.loc, v); break;
        case gl.INT_VEC2: gl.uniform2iv(d.loc, v); break;
        case gl.FLOAT_MAT4: gl.uniformMatrix4fv(d.loc, false, v); break;
        case gl.FLOAT_MAT3: gl.uniformMatrix3fv(d.loc, false, v); break;
        case gl.SAMPLER_2D: {
          const unit = this._unit++;
          gl.activeTexture(gl.TEXTURE0 + unit);
          gl.bindTexture(gl.TEXTURE_2D, v);
          gl.uniform1i(d.loc, unit);
          break;
        }
        default: break;
      }
    }
    return this;
  }
}

class Target {
  /** @param opts {float, depth, depthTexture, filter, samples} */
  constructor(gl, w, h, opts = {}) {
    this.gl = gl; this.w = Math.max(1, w | 0); this.h = Math.max(1, h | 0);
    this.opts = opts;
    this._build();
  }
  _build() {
    const gl = this.gl, o = this.opts, { w, h } = this;
    const internal = o.float ? gl.RGBA16F : gl.RGBA8;
    const type = o.float ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;
    const filter = o.filter === false ? gl.NEAREST : gl.LINEAR;

    this.fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);

    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, gl.RGBA, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tex, 0);

    if (o.depthTexture) {
      this.depthTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.depthTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, w, h, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.depthTex, 0);
    } else if (o.depth) {
      this.rb = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, this.rb);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.rb);
    }

    // Optional multisampled companion, resolved into the textures above.
    if (o.samples > 1) {
      this.msFb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.msFb);
      this.msColor = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, this.msColor);
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, o.samples, internal, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, this.msColor);
      this.msDepth = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, this.msDepth);
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, o.samples, gl.DEPTH_COMPONENT24, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.msDepth);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        gl.deleteFramebuffer(this.msFb); this.msFb = null;
      }
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  /** Framebuffer to draw into (multisampled one when available). */
  get drawFb() { return this.msFb || this.fb; }
  bind() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.drawFb);
    gl.viewport(0, 0, this.w, this.h);
  }
  /** Resolve MSAA into the sampleable textures. */
  resolve() {
    if (!this.msFb) return;
    const gl = this.gl;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.msFb);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.fb);
    let mask = gl.COLOR_BUFFER_BIT;
    if (this.depthTex) mask |= gl.DEPTH_BUFFER_BIT;
    gl.blitFramebuffer(0, 0, this.w, this.h, 0, 0, this.w, this.h, mask, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  resize(w, h) {
    w = Math.max(1, w | 0); h = Math.max(1, h | 0);
    if (w === this.w && h === this.h) return;
    this.dispose();
    this.w = w; this.h = h;
    this._build();
  }
  dispose() {
    const gl = this.gl;
    gl.deleteFramebuffer(this.fb);
    gl.deleteTexture(this.tex);
    if (this.depthTex) gl.deleteTexture(this.depthTex);
    if (this.rb) gl.deleteRenderbuffer(this.rb);
    if (this.msFb) { gl.deleteFramebuffer(this.msFb); gl.deleteRenderbuffer(this.msColor); gl.deleteRenderbuffer(this.msDepth); }
    this.msFb = null;
  }
}
