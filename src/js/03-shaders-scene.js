/* ============================================================================
   03 · SCENE SHADERS — GLSL ES 3.00
   A single über-shader renders every surface on the card. Materials are
   *computed*, not textured: PCB routing, die floorplans, HBM laminations,
   micro-channel copper, photonic waveguides and BGA micro-bumps are all
   evaluated analytically, so the camera can push in to sub-millimetre macro
   distances and the detail keeps resolving instead of turning to mush.
   Frequency-aware fades (fwidth) keep it alias-free at every zoom level.
   ========================================================================== */

const GLSL_COMMON = /* glsl */`
#define PI 3.14159265359
const vec3 LIME     = vec3(0.639, 0.902, 0.208);
const vec3 LIME_HOT = vec3(0.827, 1.000, 0.306);
const vec3 CYAN     = vec3(0.278, 0.784, 0.816);

float hash11(float p){ p=fract(p*0.1031); p*=p+33.33; p*=p+p; return fract(p); }
float hash21(vec2 p){ vec3 p3=fract(vec3(p.xyx)*0.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
vec2  hash22(vec2 p){ vec3 p3=fract(vec3(p.xyx)*vec3(0.1031,0.1030,0.0973)); p3+=dot(p3,p3.yzx+33.33); return fract((p3.xx+p3.yz)*p3.zy); }

float vnoise(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),
             mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x), f.y);
}
float fbm(vec2 p){
  float a=0.5, s=0.0;
  for(int i=0;i<5;i++){ s+=a*vnoise(p); p*=2.02; a*=0.5; }
  return s;
}
/* Fade out detail finer than a pixel — procedural mip-mapping. */
float lodFade(float feature, vec2 uv){
  float px = max(fwidth(uv.x), fwidth(uv.y)) + 1e-9;
  return smoothstep(px*1.5, px*4.0, feature);
}
float aastep(float e, float x){ float w = fwidth(x)*0.8 + 1e-6; return smoothstep(e-w, e+w, x); }
/* Screen-space-constant grid lines with spacing S. */
float gridLine(vec2 p, float S){
  vec2 q = p/S;
  vec2 g = abs(fract(q - 0.5) - 0.5) / max(fwidth(q), vec2(1e-6));
  return 1.0 - min(min(g.x, g.y), 1.0);
}
float rect(vec2 p, vec2 h){ vec2 d=abs(p)-h; return min(max(d.x,d.y),0.0)+length(max(d,0.0)); }
`;

/* -------------------------------------------------------------------------- */

const SCENE_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 a_pos;
layout(location=1) in vec3 a_nrm;
layout(location=2) in vec2 a_uv;
layout(location=3) in vec4 a_info;   // matId, partId, detailScale, seed

uniform mat4 u_viewProj;
uniform vec4 u_part[32];             // xyz = explode offset, w = alpha/dissolve
uniform vec4 u_partFx[32];           // x = highlight, y = reserved

out vec3 v_wpos;
out vec3 v_nrm;
out vec2 v_uv;
out vec4 v_info;
out float v_alpha;
out float v_hl;

void main(){
  int pid = int(a_info.y + 0.5);
  vec4 pp  = u_part[pid];
  vec3 wp  = a_pos + pp.xyz;
  v_wpos = wp;
  v_nrm  = normalize(a_nrm);
  v_uv   = a_uv;
  v_info = a_info;
  v_alpha = pp.w;
  v_hl = u_partFx[pid].x;
  gl_Position = u_viewProj * vec4(wp, 1.0);
}`;

/* -------------------------------------------------------------------------- */

const SCENE_FS = `#version 300 es
precision highp float;
precision highp sampler2DShadow;

in vec3 v_wpos;
in vec3 v_nrm;
in vec2 v_uv;
in vec4 v_info;
in float v_alpha;
in float v_hl;

uniform vec3  u_camPos;
uniform float u_time;
uniform mat4  u_lightVP;
uniform sampler2D u_shadow;
uniform float u_shadowTexel;
uniform float u_xrayAmt;     // cutaway "energised" edge amount
uniform vec3  u_focusPoint;  // macro focus centre (world)
uniform float u_focusAmt;

layout(location=0) out vec4 o_color;

${GLSL_COMMON}

/* ---------------------------------------------------------- material ids */
#define M_PCB        0
#define M_SUBSTRATE  1
#define M_DIE        2
#define M_HBM        3
#define M_ANODIZED   4
#define M_ALUM       5
#define M_COPPER     6
#define M_GOLD       7
#define M_PLASTIC    8
#define M_LIME       9
#define M_FIBER     10
#define M_CERAMIC   11
#define M_CHROME    12
#define M_PHOTONIC  13
#define M_SOLDER    14
#define M_GRAPHITE  15
#define M_FLOOR     16
#define M_SCHED     17
#define M_SECURITY  18
#define M_CHANNEL   19
#define M_INTERPOSER 20
#define M_CACHE     21

/* --------------------------------------------------------- bump plumbing */
vec3 g_bumpN;
float g_h;
vec3 applyBump(vec3 n, float h, float strength){
  vec3 dpx = dFdx(v_wpos), dpy = dFdy(v_wpos);
  float dhx = dFdx(h), dhy = dFdy(h);
  vec3 r1 = cross(dpy, n), r2 = cross(n, dpx);
  float det = dot(dpx, r1);
  vec3 grad = (r1*dhx + r2*dhy) / (abs(det) < 1e-9 ? 1e-9 : det);
  return normalize(n - strength*grad);
}

/* ------------------------------------------------------------- patterns */
/* Orthogonal PCB routing: cells hold H/V wires plus the occasional via. */
float traceLayer(vec2 p, float w, float sd, out float via, out float pad){
  vec2 id = floor(p), f = fract(p);
  float hh = hash21(id + sd), hv = hash21(id + sd + 31.7), hd = hash21(id + sd + 7.13);
  float m = 0.0; via = 0.0; pad = 0.0;
  if(hh > 0.42) m = max(m, 1.0 - smoothstep(w, w + 0.02, abs(f.y - 0.5)));
  if(hv > 0.52) m = max(m, 1.0 - smoothstep(w, w + 0.02, abs(f.x - 0.5)));
  if(hd > 0.86 && hh > 0.42){
    float d = length(f - 0.5);
    pad = 1.0 - smoothstep(0.16, 0.185, d);
    via = 1.0 - smoothstep(0.06, 0.075, d);
    m = max(m, pad);
  }
  return m;
}

/* Rows of micro-cells: what a logic block looks like under a microscope. */
float logicCells(vec2 uv, float density){
  vec2 g = uv * density;
  vec2 id = floor(g), f = fract(g);
  float row = hash21(vec2(id.y, 3.0));
  float on = step(0.35, hash21(id + row*17.0));
  float cell = (1.0 - smoothstep(0.30, 0.40, abs(f.x - 0.5))) *
               (1.0 - smoothstep(0.32, 0.42, abs(f.y - 0.5)));
  return cell * on;
}

/* --------------------------------------------------------------- MATERIAL */
void material(int id, vec3 op, vec2 uv, float det, float seed, vec3 n,
              out vec3 albedo, out float rough, out float metal, out vec3 emis){
  albedo = vec3(0.5); rough = 0.5; metal = 0.0; emis = vec3(0.0);
  float t = u_time;
  float h = 0.0;                     // height field for bump
  float bumpStr = 0.0;
  vec2 wuv = op.xz;                  // world-planar coords (cm)

  if(id == M_PCB){
    vec2 p = wuv * 2.2;
    float via1, pad1, via2, pad2;
    float t1 = traceLayer(p, 0.055, seed, via1, pad1);
    float t2 = traceLayer(p*3.3 + 11.0, 0.07, seed + 5.0, via2, pad2);
    float f1 = lodFade(0.09, wuv), f2 = lodFade(0.03, wuv);
    t1 *= f1; t2 *= f2*0.75;
    float tr = max(t1, t2);
    vec3 mask = vec3(0.020, 0.052, 0.030);                 // dark green solder mask
    vec3 buried = mix(mask, vec3(0.055, 0.085, 0.045), tr); // copper glowing under mask
    albedo = buried;
    // Exposed gold pads
    float exposed = max(via1*f1, via2*f2);
    albedo = mix(albedo, vec3(0.72, 0.55, 0.20), exposed);
    metal = exposed*0.9;
    rough = mix(0.34, 0.28, exposed);
    // Silkscreen: white outlines + lime marks
    vec2 sg = wuv*0.55;
    float silk = step(0.93, hash21(floor(sg))) * (1.0 - smoothstep(0.02, 0.05, abs(fract(sg.y)-0.5)));
    silk *= lodFade(0.05, wuv);
    albedo = mix(albedo, vec3(0.55), silk*0.8);
    // Woven glass fibre weave, only visible in extreme macro
    float weave = sin(wuv.x*260.0)*sin(wuv.y*260.0);
    h = tr*0.6 + exposed*0.4 + weave*0.05*lodFade(0.006, wuv);
    bumpStr = 0.035;
    rough = mix(rough, 0.42, 1.0-tr);
  }
  else if(id == M_SUBSTRATE){
    vec2 p = wuv*7.0;
    float via, pad;
    float tr = traceLayer(p, 0.06, seed+3.0, via, pad) * lodFade(0.03, wuv);
    float tr2 = traceLayer(p*2.6+3.0, 0.08, seed+9.0, via, pad) * lodFade(0.012, wuv);
    albedo = mix(vec3(0.048, 0.042, 0.034), vec3(0.40, 0.29, 0.12), max(tr, tr2*0.8));
    metal = max(tr, tr2)*0.85;
    rough = 0.33;
    h = max(tr, tr2*0.7);
    bumpStr = 0.02;
  }
  else if(id == M_INTERPOSER){
    albedo = vec3(0.10, 0.115, 0.14); rough = 0.30; metal = 0.35;
    float lines = 1.0 - smoothstep(0.0, 0.02, abs(fract(wuv.x*60.0)-0.5));
    albedo += vec3(0.03,0.05,0.02)*lines*lodFade(0.01, wuv);
  }
  else if(id == M_DIE){
    /* Compute-die floorplan: SM tiles, cache banks, NoC lanes with traffic. */
    vec2 f = uv;
    vec2 grid = vec2(10.0, 14.0);
    vec2 g = f*grid, gi = floor(g), gf = fract(g);
    float gut = 0.055;                                   // NoC gutters
    float inTile = (1.0 - aastep(1.0-gut, max(abs(gf.x-0.5), abs(gf.y-0.5))*2.0));
    // central cache band
    float cache = 1.0 - smoothstep(0.05, 0.075, abs(f.y - 0.5));
    vec3 base = vec3(0.055, 0.062, 0.090);
    // per-tile tone variation
    float tv = hash21(gi + seed);
    vec3 tile = base * (0.75 + 0.5*tv);
    // register rows inside each tile
    float rows = logicCells(gf, 26.0) * lodFade(1.0/(grid.x*26.0), f);
    tile += vec3(0.10, 0.115, 0.135)*rows;
    // cache banks: vertical SRAM stripes
    float banks = (1.0 - smoothstep(0.0, 0.06, abs(fract(f.x*90.0)-0.5)))*lodFade(0.011, f);
    vec3 cacheCol = vec3(0.085,0.10,0.125) + vec3(0.06,0.075,0.09)*banks;
    albedo = mix(tile, cacheCol, cache);
    albedo = mix(vec3(0.028,0.032,0.05), albedo, inTile);   // gutters are darker
    metal = 0.55; rough = mix(0.22, 0.34, tv);
    // NoC traffic: packets running down the gutters
    float lane = (1.0-inTile);
    float pulseX = smoothstep(0.86, 1.0, sin((gi.y*1.7 + f.x*36.0) - t*3.4));
    float pulseY = smoothstep(0.90, 1.0, sin((gi.x*2.3 + f.y*30.0) + t*2.6));
    emis += LIME * lane * (pulseX+pulseY) * 0.85;
    emis += LIME * lane * 0.045;
    // Metal-stack shimmer
    float shimmer = fbm(f*40.0 + t*0.05);
    albedo += vec3(0.02,0.03,0.05)*shimmer;
    h = inTile*0.5 + rows*0.35 + cache*0.2;
    bumpStr = 0.010;
  }
  else if(id == M_SCHED){
    /* Rotation-curve scheduler: concentric orbits with a *flat* velocity
       profile — the galactic-rotation nod. */
    vec2 c = uv - 0.5;
    float r = length(c)*2.0, a = atan(c.y, c.x);
    albedo = vec3(0.05,0.06,0.085); metal=0.5; rough=0.25;
    float ring = 0.0;
    for(int i=1;i<=6;i++){
      float rr = float(i)/6.5;
      ring = max(ring, 1.0 - smoothstep(0.004, 0.010, abs(r-rr)));
    }
    albedo += vec3(0.06,0.08,0.10)*ring;
    // orbiting warps — all at the same angular speed regardless of radius
    float orb = 0.0;
    for(int i=1;i<=6;i++){
      float rr = float(i)/6.5;
      float ang = a + t*0.9 + float(i)*1.7;
      float d = length(c*2.0 - rr*vec2(cos(ang), sin(ang)));
      orb += exp(-d*d*900.0);
    }
    emis += LIME_HOT*orb*1.35 + LIME*ring*0.16;
    float cells = logicCells(uv, 60.0)*lodFade(0.0166, uv);
    albedo += vec3(0.05,0.06,0.07)*cells;
    h = ring*0.4 + cells*0.3; bumpStr = 0.01;
  }
  else if(id == M_SECURITY){
    /* Tamper-respondent mesh: a serpentine sense wire over the enclave. */
    albedo = vec3(0.045,0.05,0.055); metal=0.4; rough=0.3;
    vec2 g = uv*vec2(14.0, 14.0); vec2 gi=floor(g), gf=fract(g);
    float sery = 1.0 - smoothstep(0.05,0.09, abs(gf.y-0.5));
    float serx = 1.0 - smoothstep(0.05,0.09, abs(gf.x-0.5));
    float w = mix(sery, serx, step(0.5, hash21(gi)));
    w *= lodFade(0.07, uv);
    albedo = mix(albedo, vec3(0.55,0.42,0.16), w);
    metal = mix(metal, 0.9, w);
    float alarm = 0.5+0.5*sin(t*2.0);
    emis += LIME*w*0.35*alarm;
    h = w; bumpStr = 0.012;
  }
  else if(id == M_HBM){
    if(abs(n.y) > 0.5){
      /* Top: laser-etched marking */
      albedo = vec3(0.048,0.050,0.056); rough=0.42; metal=0.25;
      vec2 g = uv*vec2(16.0,22.0); vec2 gi=floor(g), gf=fract(g);
      float txt = step(0.55, hash21(gi+seed)) * step(gi.y, 9.0) * step(4.0, gi.y);
      txt *= (1.0-smoothstep(0.34,0.44,abs(gf.x-0.5)))*(1.0-smoothstep(0.30,0.40,abs(gf.y-0.5)));
      txt *= lodFade(0.05, uv);
      albedo = mix(albedo, vec3(0.30,0.31,0.33), txt);
      float logo = 1.0 - rect(uv-vec2(0.5,0.78), vec2(0.26,0.055));
      logo = smoothstep(0.985, 1.0, logo)*lodFade(0.08, uv);
      albedo = mix(albedo, LIME*0.35, logo);
      emis += LIME*logo*0.18;
      h = txt*0.5+logo*0.3; bumpStr=0.006;
    } else {
      /* Sides: 16 laminated DRAM dies + TSV seams */
      float layers = 16.0;
      float y = uv.y*layers;
      float seam = 1.0 - smoothstep(0.0, 0.09, abs(fract(y)-0.5));
      seam *= lodFade(1.0/layers*0.2, uv);
      albedo = mix(vec3(0.10,0.105,0.115), vec3(0.030,0.032,0.036), seam);
      rough = mix(0.34, 0.55, seam);
      metal = 0.3;
      h = -seam; bumpStr = 0.02;
    }
  }
  else if(id == M_ANODIZED){
    /* Bead-blasted black anodise: dark, mostly matte, with a slow waviness so
       big flat panels never read as a single mirror. */
    albedo = vec3(0.0400,0.0415,0.0430); rough = 0.42; metal = 0.22;
    float brush = fbm(vec2(op.x*180.0, op.z*7.0))*0.5 + fbm(vec2(op.z*180.0, op.x*7.0))*0.5;
    rough += (brush-0.5)*0.07;
    float flake = hash21(floor(op.xz*900.0))*lodFade(0.0022, op.xz);
    albedo += vec3(0.02)*step(0.988, flake);
    h = brush; bumpStr = 0.004;
  }
  else if(id == M_CACHE){
    /* Dark Matter Cache: dense SRAM macros under a gravitational-lensing
       shimmer. Mostly unlit — you only see it by what bends around it. */
    albedo = vec3(0.018,0.020,0.026); metal = 0.45; rough = 0.30;
    vec2 g = uv*vec2(26.0, 34.0); vec2 gi = floor(g), gf = fract(g);
    float macro = (1.0 - aastep(0.86, max(abs(gf.x-0.5), abs(gf.y-0.5))*2.0));
    float bank = (1.0-smoothstep(0.0,0.08,abs(fract(gf.x*7.0)-0.5)))*lodFade(0.0055, uv);
    albedo += vec3(0.030,0.034,0.045)*macro + vec3(0.02,0.024,0.03)*bank*macro;
    // halo contours — mass density falling off from the centre
    float r = length(uv-0.5)*2.0;
    float contour = 1.0 - smoothstep(0.0, 0.02, abs(fract(r*5.0 - t*0.10) - 0.5));
    emis += LIME*contour*0.10*(1.0-r);
    emis += mix(CYAN,LIME,0.5)*macro*0.02;
    h = macro*0.5 + bank*0.2; bumpStr = 0.012;
  }
  else if(id == M_ALUM){
    albedo = vec3(0.72,0.735,0.75); rough = 0.26; metal = 1.0;
    float brush = fbm(vec2(op.x*300.0, op.z*4.0));
    rough += (brush-0.5)*0.12;
    h = brush; bumpStr = 0.004;
  }
  else if(id == M_COPPER){
    albedo = vec3(0.90,0.48,0.28); rough = 0.24; metal = 1.0;
    float brush = fbm(vec2(op.x*220.0, op.z*6.0));
    rough += (brush-0.5)*0.10;
    h = brush; bumpStr = 0.004;
  }
  else if(id == M_CHANNEL){
    /* Two-phase micro-channel cold plate: 0.18 mm channels + coolant flow. */
    float chans = 90.0;
    float c = fract(uv.y*chans);
    float prof = smoothstep(0.0,0.22,c)*smoothstep(1.0,0.78,c);
    float f = lodFade(1.0/chans, uv);
    prof = mix(0.5, prof, f);
    albedo = mix(vec3(0.42,0.20,0.11), vec3(0.74,0.43,0.26), prof);
    metal = 1.0; rough = mix(0.5, 0.2, prof);
    // vapour slugs sprinting along the channels
    float lane = floor(uv.y*chans);
    float flow = fract(uv.x*1.6 - t*0.55 + hash11(lane)*1.0);
    float slug = smoothstep(0.62,0.98,flow)*(1.0-prof)*f;
    emis += mix(CYAN, LIME, 0.35)*slug*0.85;
    h = prof; bumpStr = 0.03;
  }
  else if(id == M_GOLD){
    albedo = vec3(0.94,0.73,0.31); rough = 0.19; metal = 1.0;
    float wear = fbm(op.xz*60.0);
    rough += wear*0.10;
  }
  else if(id == M_PLASTIC){
    albedo = vec3(0.022,0.024,0.026); rough = 0.55; metal = 0.0;
    float grain = fbm(op.xz*400.0);
    rough += (grain-0.5)*0.15;
    h = grain; bumpStr = 0.003;
  }
  else if(id == M_CERAMIC){
    albedo = vec3(0.26,0.20,0.14); rough = 0.62; metal = 0.0;
    float ends = smoothstep(0.34,0.42, abs(uv.x-0.5));
    albedo = mix(albedo, vec3(0.62,0.62,0.64), ends);
    metal = ends*0.8; rough = mix(rough, 0.30, ends);
  }
  else if(id == M_CHROME){
    albedo = vec3(0.55,0.56,0.58); rough = 0.08; metal = 1.0;
  }
  else if(id == M_GRAPHITE){
    albedo = vec3(0.045,0.047,0.05); rough = 0.72; metal = 0.2;
    float flake = fbm(op.xz*220.0);
    albedo += vec3(0.03)*flake;
  }
  else if(id == M_SOLDER){
    /* Micro-bump field — procedural hemispheres, sharp at any magnification. */
    float N = 46.0;
    vec2 g = uv*N; vec2 gf = fract(g)-0.5;
    float d = length(gf);
    float f = lodFade(1.0/N, uv);
    float ball = 1.0 - smoothstep(0.30, 0.36, d);
    ball *= f;
    albedo = mix(vec3(0.10,0.10,0.115), vec3(0.72,0.73,0.78), ball);
    metal = mix(0.2, 1.0, ball); rough = mix(0.6, 0.22, ball);
    h = sqrt(max(0.0, 0.1225 - d*d))*ball;
    bumpStr = 0.12;
  }
  else if(id == M_PHOTONIC){
    /* Silicon-photonics engine: waveguides carrying real traffic. */
    albedo = vec3(0.055,0.065,0.075); metal=0.5; rough=0.25;
    float wg = 0.0, light = 0.0;
    for(int i=0;i<8;i++){
      float fi = float(i);
      float y0 = (fi+0.5)/8.0;
      float yy = y0 + 0.045*sin(uv.x*6.2831 + fi*0.9);
      float d = abs(uv.y - yy);
      float line = 1.0 - smoothstep(0.004, 0.009, d);
      wg = max(wg, line);
      float ph = fract(uv.x*0.9 - t*(0.35 + 0.05*fi) + hash11(fi)*1.0);
      light += line * smoothstep(0.55, 1.0, ph) * 1.0;
    }
    float f = lodFade(0.012, uv);
    wg *= f; light *= f;
    albedo = mix(albedo, vec3(0.35,0.42,0.48), wg);
    emis += mix(CYAN, LIME, 0.25) * (light*1.25 + wg*0.12);
    // ring modulators
    for(int i=0;i<4;i++){
      vec2 cc = vec2(0.18+0.22*float(i), 0.5);
      float d = abs(length(uv-cc) - 0.035);
      float ring = (1.0-smoothstep(0.004,0.008,d))*f;
      emis += LIME_HOT*ring*(0.3+0.3*sin(t*3.0+float(i)));
      albedo = mix(albedo, vec3(0.3,0.35,0.4), ring);
    }
    h = wg*0.5; bumpStr = 0.01;
  }
  else if(id == M_FIBER){
    albedo = vec3(0.02,0.05,0.05); rough = 0.12; metal = 0.0;
    float run = fract(uv.y*1.0 - t*0.7 + seed);
    float pulse = smoothstep(0.55,1.0,run);
    emis += mix(CYAN, LIME, 0.35) * (0.10 + 0.75*pulse);
  }
  else if(id == M_LIME){
    albedo = LIME*0.25; rough = 0.28; metal = 0.0;
    float breathe = 0.86 + 0.14*sin(t*1.6 + op.x*0.6);
    emis += LIME_HOT * 0.85 * breathe;
  }
  else if(id == M_FLOOR){
    /* A survey grid that dissolves into the void — it grounds the card
       without ever becoming a lit surface. */
    vec2 p = op.xz - vec2(-2.0, 0.0);
    float d = length(p);
    float fade = exp(-d*0.052);
    float minor = gridLine(p, 2.0);
    float major = gridLine(p, 12.0);
    albedo = vec3(0.0);
    rough = 1.0; metal = 0.0;
    emis = LIME*(minor*0.020 + major*0.075)*fade
         + vec3(0.030,0.046,0.032)*exp(-d*0.075);
  }
  rough = clamp(rough, 0.035, 1.0);
  g_h = h; g_bumpN = (bumpStr > 0.0) ? applyBump(n, h, bumpStr) : n;
}

/* --------------------------------------------------------------- lighting */
vec3 envColor(vec3 d, float rough){
  float up = d.y*0.5 + 0.5;
  vec3 c = mix(vec3(0.010,0.011,0.014), vec3(0.048,0.055,0.065), up);
  float sh = mix(0.35, 0.02, rough);              // lobe sharpness
  // main softbox, high and slightly behind the camera
  vec3 sb = normalize(vec3(0.25, 0.92, 0.30));
  c += vec3(1.0,0.99,0.96) * smoothstep(0.90-sh*2.2, 0.995, dot(d, sb)) * (2.6 - rough*1.1);
  // broad front fill so machined metal has something to hold
  c += vec3(0.11,0.13,0.16) * smoothstep(-0.35, 1.0, dot(d, normalize(vec3(0.15,0.30,0.94))));
  // lime strip light, back-left
  vec3 s1 = normalize(vec3(-0.85, 0.28, -0.45));
  c += LIME * smoothstep(0.92-sh*2.0, 0.999, dot(d, s1)) * (0.72 - rough*0.40);
  // cool strip, back-right
  vec3 s2 = normalize(vec3(0.80, 0.16, -0.58));
  c += CYAN * smoothstep(0.93-sh*1.8, 0.999, dot(d, s2)) * (0.52 - rough*0.30);
  // floor bounce
  c += vec3(0.028,0.045,0.026) * smoothstep(0.15, -0.75, d.y);
  return max(c, vec3(0.0));
}

vec3 F_schlick(vec3 f0, float u){ return f0 + (1.0-f0)*pow(1.0-u, 5.0); }
float D_ggx(float nh, float a){ float a2=a*a; float d=nh*nh*(a2-1.0)+1.0; return a2/(PI*d*d+1e-7); }
float V_smith(float nv, float nl, float a){
  float a2=a*a;
  float gv = nl*sqrt(nv*nv*(1.0-a2)+a2);
  float gl = nv*sqrt(nl*nl*(1.0-a2)+a2);
  return 0.5/max(gv+gl, 1e-6);
}
vec2 envBRDF(float nv, float rough){
  vec4 c0 = vec4(-1.0,-0.0275,-0.572,0.022), c1 = vec4(1.0,0.0425,1.04,-0.04);
  vec4 r = rough*c0 + c1;
  float a004 = min(r.x*r.x, exp2(-9.28*nv))*r.x + r.y;
  return vec2(-1.04,1.04)*a004 + r.zw;
}

float shadowAt(vec3 wp, float ndl){
  vec4 lp = u_lightVP * vec4(wp, 1.0);
  vec3 pc = lp.xyz/lp.w * 0.5 + 0.5;
  if(pc.x<0.001||pc.x>0.999||pc.y<0.001||pc.y>0.999||pc.z>1.0) return 1.0;
  float bias = max(0.0016*(1.0-ndl), 0.0006);
  float s = 0.0;
  for(int y=-1;y<=1;y++){
    for(int x=-1;x<=1;x++){
      vec2 o = vec2(float(x), float(y))*u_shadowTexel;
      float d = texture(u_shadow, pc.xy+o).r;
      s += (pc.z - bias > d) ? 0.0 : 1.0;
    }
  }
  return s/9.0;
}

/* specW lets the fill and rim lights contribute light without stamping a
   giant specular sheen across the card's flat panels. */
vec3 shade(vec3 N, vec3 V, vec3 L, vec3 lc, vec3 albedo, float rough, float metal,
           float shadow, float specW){
  vec3 H = normalize(V+L);
  float nl = max(dot(N,L), 0.0), nv = max(dot(N,V), 1e-4);
  float nh = max(dot(N,H), 0.0), vh = max(dot(V,H), 0.0);
  float a = rough*rough;
  vec3 f0 = mix(vec3(0.04), albedo, metal);
  vec3 F = F_schlick(f0, vh);
  float D = D_ggx(nh, a);
  float Vs = V_smith(nv, nl, a);
  vec3 spec = F*D*Vs*specW;
  vec3 diff = (1.0-F)*(1.0-metal)*albedo/PI;
  return (diff+spec)*lc*nl*shadow;
}

/* Ordered dither — lets cutaway parts fade out inside the opaque pass. */
float dither(vec2 fc){
  int x = int(mod(fc.x, 4.0)), y = int(mod(fc.y, 4.0));
  float m[16] = float[16](0.0,8.0,2.0,10.0, 12.0,4.0,14.0,6.0, 3.0,11.0,1.0,9.0, 15.0,7.0,13.0,5.0);
  return (m[y*4+x]+0.5)/16.0;
}

void main(){
  float alpha = v_alpha;
  if(alpha < 0.999){
    if(dither(gl_FragCoord.xy) > alpha) discard;
  }
  int mid = int(v_info.x + 0.5);
  vec3 N = normalize(v_nrm);
  if(!gl_FrontFacing) N = -N;
  vec3 V = normalize(u_camPos - v_wpos);

  vec3 albedo; float rough; float metal; vec3 emis;
  material(mid, v_wpos, v_uv, v_info.z, v_info.w, N, albedo, rough, metal, emis);
  N = g_bumpN;

  /* The floor is scenography, not a material: no env, no specular, just a
     grid that the card's shadow pools into. */
  if(mid == M_FLOOR){
    float sh = shadowAt(v_wpos, 1.0);
    o_color = vec4(emis*mix(0.06, 1.0, sh), 1.0);
    return;
  }

  float nv = max(dot(N,V), 1e-4);

  // Key light (warm-white, high right) + shadow
  vec3 Lk = normalize(vec3(0.42, 0.86, 0.30));
  float shadow = shadowAt(v_wpos, max(dot(N,Lk),0.0));
  vec3 col = shade(N, V, Lk, vec3(1.00,0.98,0.94)*3.6, albedo, rough, metal, shadow, 1.0);
  // Lime rim, almost horizontal so it catches edges rather than panel tops
  vec3 Lr = normalize(vec3(-0.88, 0.09, -0.47));
  col += shade(N, V, Lr, LIME*1.15, albedo, rough, metal, 1.0, 0.45);
  // Fresnel edge light — separates the silhouette from the void.
  col += LIME * pow(1.0 - nv, 5.0) * 0.30;
  // Cool fill from the front-left, diffuse-dominant
  vec3 Lf = normalize(vec3(-0.52, 0.14, 0.84));
  col += shade(N, V, Lf, vec3(0.42,0.52,0.60)*1.45, albedo, rough, metal, 1.0, 0.22);

  // Image-based ambient
  vec3 f0 = mix(vec3(0.04), albedo, metal);
  vec3 R = reflect(-V, N);
  vec2 ab = envBRDF(nv, rough);
  vec3 irr = envColor(N, 1.0);
  col += irr*albedo*(1.0-metal)*0.55;
  col += envColor(R, rough)*(f0*ab.x + ab.y);

  col += emis;


  // Cutaway edge: parts mid-dissolve glow at their fringe
  float diss = 1.0 - alpha;
  col += LIME_HOT * diss * (1.0-diss) * 4.0 * u_xrayAmt;

  // Hover / selection highlight — fresnel rim in brand lime
  if(v_hl > 0.001){
    float fres = pow(1.0 - nv, 2.5);
    col += LIME * fres * v_hl * 2.2;
    col += LIME * v_hl * 0.10;
  }

  o_color = vec4(col, 1.0);
}`;

/* ---------------------------------------------------- depth / shadow pass */

const DEPTH_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 a_pos;
layout(location=3) in vec4 a_info;
uniform mat4 u_viewProj;
uniform vec4 u_part[32];
out float v_alpha;
void main(){
  int pid = int(a_info.y+0.5);
  vec4 pp = u_part[pid];
  v_alpha = pp.w;
  gl_Position = u_viewProj * vec4(a_pos + pp.xyz, 1.0);
}`;

const DEPTH_FS = `#version 300 es
precision highp float;
in float v_alpha;
out vec4 o;
void main(){ if(v_alpha < 0.5) discard; o = vec4(1.0); }`;

/* ------------------------------------------------------------ picking pass */

const PICK_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 a_pos;
layout(location=3) in vec4 a_info;
uniform mat4 u_viewProj;
uniform vec4 u_part[32];
flat out float v_pid;
out float v_alpha;
void main(){
  int pid = int(a_info.y+0.5);
  vec4 pp = u_part[pid];
  v_pid = a_info.y;
  v_alpha = pp.w;
  gl_Position = u_viewProj * vec4(a_pos + pp.xyz, 1.0);
}`;

const PICK_FS = `#version 300 es
precision highp float;
flat in float v_pid;
in float v_alpha;
out vec4 o;
void main(){
  if(v_alpha < 0.5) discard;
  o = vec4((v_pid+1.0)/255.0, 0.0, 0.0, 1.0);
}`;

/* --------------------------------------------------------------- backdrop */

const BG_VS = `#version 300 es
precision highp float;
out vec2 v_uv;
void main(){
  vec2 p = vec2((gl_VertexID<<1)&2, gl_VertexID&2);
  v_uv = p;
  gl_Position = vec4(p*2.0-1.0, 0.0, 1.0);
}`;

const BG_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform vec2 u_res;
uniform float u_time;
uniform float u_focusAmt;
out vec4 o;
${GLSL_COMMON}
void main(){
  vec2 uv = v_uv;
  vec2 p = (uv - 0.5) * vec2(u_res.x/u_res.y, 1.0);
  vec3 c = mix(vec3(0.0075,0.009,0.0105), vec3(0.001,0.0012,0.0015), length(p)*0.75);
  // Rubin's rotation curves: faint concentric arcs
  float d = length(p*vec2(1.0,1.35) - vec2(0.0,-0.05));
  for(int i=0;i<5;i++){
    float r = 0.30 + float(i)*0.17;
    float ring = exp(-pow((d-r)*90.0, 2.0));
    c += LIME*ring*0.020;
  }
  // volumetric lime bloom behind the card
  c += LIME * exp(-d*d*5.0) * 0.055;
  c += CYAN * exp(-pow(length(p-vec2(0.55,0.25)),2.0)*9.0) * 0.020;
  // drifting galactic dust
  float n = fbm(p*3.0 + vec2(u_time*0.012, 0.0));
  c += LIME * n*n * 0.020;
  // vignette + dither to kill banding
  c *= 1.0 - 0.55*pow(length(p*0.85), 2.2);
  c += (hash21(gl_FragCoord.xy + u_time)-0.5)*0.0022;
  o = vec4(c, 1.0);
}`;

/* ---------------------------------------------------------------- particles */

const DUST_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 a_pos;
layout(location=1) in vec2 a_rnd;
uniform mat4 u_viewProj;
uniform float u_time;
uniform float u_pixelRatio;
out float v_a;
void main(){
  vec3 p = a_pos;
  p.y += sin(u_time*0.25 + a_rnd.x*30.0)*1.2;
  p.x += cos(u_time*0.18 + a_rnd.y*24.0)*1.0;
  vec4 cp = u_viewProj*vec4(p,1.0);
  gl_Position = cp;
  gl_PointSize = (2.0 + a_rnd.x*3.5) * u_pixelRatio * (14.0/max(cp.w,0.6));
  v_a = (0.25 + a_rnd.y*0.75);
}`;

const DUST_FS = `#version 300 es
precision highp float;
in float v_a;
out vec4 o;
void main(){
  vec2 d = gl_PointCoord - 0.5;
  float m = exp(-dot(d,d)*14.0);
  o = vec4(vec3(0.639,0.902,0.208)*m*v_a*0.5, 1.0);
}`;
