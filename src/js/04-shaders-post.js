/* ============================================================================
   04 · POST STACK — SSAO → bloom → depth of field → ACES grade → FXAA.
   The DoF is what sells the macro shots: when the camera dives to the die,
   the circuit of interest stays razor sharp while everything else melts.
   ========================================================================== */

const QUAD_VS = `#version 300 es
precision highp float;
out vec2 v_uv;
void main(){
  vec2 p = vec2((gl_VertexID<<1)&2, gl_VertexID&2);
  v_uv = p;
  gl_Position = vec4(p*2.0-1.0, 0.0, 1.0);
}`;

/* ------------------------------------------------------------------- SSAO */
const SSAO_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_depth;
uniform mat4 u_invProj;
uniform mat4 u_proj;
uniform vec2 u_res;
uniform float u_radius;
uniform float u_time;
out vec4 o;

float hash21(vec2 p){ vec3 p3=fract(vec3(p.xyx)*0.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }

vec3 viewPos(vec2 uv){
  float d = texture(u_depth, uv).r;
  vec4 ndc = vec4(uv*2.0-1.0, d*2.0-1.0, 1.0);
  vec4 vp = u_invProj*ndc;
  return vp.xyz/vp.w;
}

void main(){
  float d0 = texture(u_depth, v_uv).r;
  if(d0 >= 0.99999){ o = vec4(1.0); return; }
  vec3 P = viewPos(v_uv);
  vec3 n = normalize(cross(dFdx(P), dFdy(P)));
  if(n.z < 0.0) n = -n;

  float ang = hash21(v_uv*u_res)*6.2831853;
  float ca = cos(ang), sa = sin(ang);
  float occ = 0.0;
  const int N = 12;
  for(int i=0;i<N;i++){
    float fi = float(i);
    float a = (fi/float(N))*6.2831853*3.0;
    float r = (0.25 + 0.75*fract(fi*0.61803))*u_radius;
    vec3 dir = vec3(cos(a), sin(a), 0.0);
    dir.xy = vec2(dir.x*ca - dir.y*sa, dir.x*sa + dir.y*ca);
    dir.z = 0.35 + 0.65*fract(fi*0.3819);
    dir = normalize(dir);
    if(dot(dir, n) < 0.0) dir = -dir;
    vec3 sp = P + dir*r;
    vec4 cp = u_proj*vec4(sp, 1.0);
    vec2 suv = cp.xy/cp.w*0.5+0.5;
    if(suv.x<0.0||suv.x>1.0||suv.y<0.0||suv.y>1.0) continue;
    vec3 sampleP = viewPos(suv);
    float diff = sampleP.z - sp.z;
    float rangeCheck = smoothstep(0.0, 1.0, u_radius/max(abs(P.z - sampleP.z), 1e-4));
    occ += (diff > 0.012*u_radius ? 1.0 : 0.0)*rangeCheck;
  }
  float ao = 1.0 - occ/float(N);
  o = vec4(clamp(pow(ao, 1.6), 0.0, 1.0));
}`;

/* --------------------------------------------------------------- blur/copy */
const BLUR_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_tex;
uniform vec2 u_dir;       // texel-sized step
out vec4 o;
void main(){
  vec4 s = texture(u_tex, v_uv)*0.227027;
  s += (texture(u_tex, v_uv + u_dir*1.3846) + texture(u_tex, v_uv - u_dir*1.3846))*0.316216;
  s += (texture(u_tex, v_uv + u_dir*3.2308) + texture(u_tex, v_uv - u_dir*3.2308))*0.070270;
  o = s;
}`;

const COPY_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_tex;
out vec4 o;
void main(){ o = texture(u_tex, v_uv); }`;

const BRIGHT_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_threshold;
uniform float u_knee;
out vec4 o;
void main(){
  vec3 c = texture(u_tex, v_uv).rgb;
  float l = max(c.r, max(c.g, c.b));
  float soft = clamp(l - u_threshold + u_knee, 0.0, 2.0*u_knee);
  soft = soft*soft/(4.0*u_knee + 1e-5);
  float w = max(soft, l - u_threshold)/max(l, 1e-5);
  o = vec4(c*w, 1.0);
}`;

/* ---------------------------------------------------------------- composite */
const COMPOSITE_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_scene;
uniform sampler2D u_depth;
uniform sampler2D u_ao;
uniform sampler2D u_b0;
uniform sampler2D u_b1;
uniform sampler2D u_b2;
uniform sampler2D u_b3;
uniform sampler2D u_b4;
uniform sampler2D u_dofHalf;
uniform sampler2D u_dofQuarter;
uniform vec2  u_res;
uniform float u_time;
uniform float u_bloom;
uniform float u_aoAmt;
uniform float u_focusDist;    // view-space focal distance
uniform float u_dofAmt;       // 0 = pinhole, 1 = full macro bokeh
uniform float u_near;
uniform float u_far;
uniform float u_vignette;
uniform float u_exposure;
uniform float u_reveal;       // intro wipe 0..1
out vec4 o;

float hash21(vec2 p){ vec3 p3=fract(vec3(p.xyx)*0.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }

float linearDepth(float d){
  float z = d*2.0-1.0;
  return (2.0*u_near*u_far)/(u_far+u_near - z*(u_far-u_near));
}

vec3 aces(vec3 x){
  const float a=2.51, b=0.03, c=2.43, d=0.59, e=0.14;
  return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);
}

void main(){
  vec2 uv = v_uv;
  vec2 p = uv - 0.5;

  // Chromatic aberration grows toward the frame edge
  float ca = (0.0009 + 0.0022*u_dofAmt) * dot(p,p) * 4.0;
  vec3 col;
  col.r = texture(u_scene, uv + p*ca).r;
  col.g = texture(u_scene, uv).g;
  col.b = texture(u_scene, uv - p*ca).b;

  // Depth of field
  float z = linearDepth(texture(u_depth, uv).r);
  float coc = clamp(abs(z - u_focusDist)/max(u_focusDist*1.55, 0.05), 0.0, 1.0);
  coc = smoothstep(0.10, 1.0, coc)*u_dofAmt;
  if(coc > 0.001){
    vec3 h = texture(u_dofHalf, uv).rgb;
    vec3 q = texture(u_dofQuarter, uv).rgb;
    vec3 blurred = mix(h, q, smoothstep(0.25, 1.0, coc));
    col = mix(col, blurred, smoothstep(0.0, 0.55, coc));
  }

  // Ambient occlusion
  float ao = texture(u_ao, uv).r;
  col *= mix(1.0, ao, u_aoAmt);

  // Bloom
  vec3 b = texture(u_b0, uv).rgb*1.00
         + texture(u_b1, uv).rgb*0.85
         + texture(u_b2, uv).rgb*0.65
         + texture(u_b3, uv).rgb*0.48
         + texture(u_b4, uv).rgb*0.35;
  col += b*u_bloom*0.15;

  // Exposure + filmic tonemap
  col *= u_exposure;
  col = aces(col);

  // Grade: crushed blacks with a lime lean, cool highlights
  col = pow(col, vec3(0.98, 0.95, 1.02));
  col = mix(vec3(dot(col, vec3(0.299,0.587,0.114))), col, 1.12);
  col += vec3(0.003, 0.006, 0.002)*(1.0-col);

  // Vignette
  float vig = 1.0 - u_vignette*pow(length(p*vec2(1.0,1.05))*1.35, 2.3);
  col *= clamp(vig, 0.0, 1.0);

  // Linear → display. Everything above this line is linear light.
  col = pow(max(col, vec3(0.0)), vec3(1.0/2.2));

  // Film grain
  float g = hash21(uv*u_res + fract(u_time)*97.0) - 0.5;
  col += g*0.016*(1.0 - 0.7*dot(col, vec3(0.33)));

  // Intro reveal: a diagonal wipe with a lime leading edge.
  float sweep = uv.x*0.42 + (1.0-uv.y)*0.26;   // 0 .. 0.68 across the frame
  float e = u_reveal - sweep;                  // > 0 once the wipe has passed
  col *= smoothstep(-0.16, 0.10, e);
  col += vec3(0.639,0.902,0.208) * exp(-e*e*900.0) * 0.55;

  o = vec4(col, 1.0);
}`;

/* -------------------------------------------------------------------- FXAA */
const FXAA_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_tex;
uniform vec2 u_res;
out vec4 o;
float luma(vec3 c){ return dot(c, vec3(0.299,0.587,0.114)); }
void main(){
  vec2 px = 1.0/u_res;
  vec3 mC = texture(u_tex, v_uv).rgb;
  float lM = luma(mC);
  float lNW = luma(texture(u_tex, v_uv + vec2(-1.0,-1.0)*px).rgb);
  float lNE = luma(texture(u_tex, v_uv + vec2( 1.0,-1.0)*px).rgb);
  float lSW = luma(texture(u_tex, v_uv + vec2(-1.0, 1.0)*px).rgb);
  float lSE = luma(texture(u_tex, v_uv + vec2( 1.0, 1.0)*px).rgb);
  float lMin = min(lM, min(min(lNW,lNE), min(lSW,lSE)));
  float lMax = max(lM, max(max(lNW,lNE), max(lSW,lSE)));
  if(lMax - lMin < max(0.0312, lMax*0.125)){ o = vec4(mC,1.0); return; }
  vec2 dir = vec2(-((lNW+lNE)-(lSW+lSE)), ((lNW+lSW)-(lNE+lSE)));
  float red = max((lNW+lNE+lSW+lSE)*0.25*0.25, 0.006);
  float rcp = 1.0/(min(abs(dir.x), abs(dir.y)) + red);
  dir = clamp(dir*rcp, -8.0, 8.0)*px;
  vec3 a = 0.5*(texture(u_tex, v_uv + dir*(1.0/3.0-0.5)).rgb +
                texture(u_tex, v_uv + dir*(2.0/3.0-0.5)).rgb);
  vec3 b = a*0.5 + 0.25*(texture(u_tex, v_uv - dir*0.5).rgb +
                         texture(u_tex, v_uv + dir*0.5).rgb);
  float lB = luma(b);
  o = vec4((lB < lMin || lB > lMax) ? a : b, 1.0);
}`;
