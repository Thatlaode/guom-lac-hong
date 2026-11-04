const GradeShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, ab: { value: 0.0015 }, tint: { value: 0 } },
  vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader: `uniform sampler2D tDiffuse;uniform float time,ab,tint;varying vec2 vUv;
  float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233))+time)*43758.5453);}
  vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
  void main(){vec2 d=vUv-.5;float r=dot(d,d);vec2 o=d*r*ab*8.;
  vec3 c=vec3(texture2D(tDiffuse,vUv+o).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-o).b);
  c=aces(c*1.2);c=pow(c,vec3(.68));float l=dot(c,vec3(.3,.59,.11));c=mix(c,vec3(l)*vec3(.7,.9,1.),tint*.7);
  c*=1.-r*1.1;c+=(h(vUv*1000.)-.5)*.025;gl_FragColor=vec4(c,1.);}`
};
class Fx {
  constructor(scene) {
    const N = this.N = 700; this.scene = scene; this.pos = new Float32Array(N * 3); this.col = new Float32Array(N * 3); this.vel = []; this.bc = []; this.life = new Float32Array(N); this.max = new Float32Array(N);
    this.i = 0; this.acc = 0; this.acc2 = 0; this.sw = []; this.gh = [];
    for (let i = 0; i < N; i++) { this.pos[i * 3 + 1] = -999; this.vel.push(new T.Vector3()); this.bc.push([0, 0, 0]); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(this.pos, 3)); g.setAttribute('color', new T.BufferAttribute(this.col, 3));
    this.pts = new T.Points(g, new T.PointsMaterial({ size: 0.17, map: glowMap('rgba(255,255,255,1)'), vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false })); this.pts.frustumCulled = false; scene.add(this.pts);
    this.gTex = glowMap('rgba(160,255,210,1)');
    this.bfTex = canvasTex(x => { x.fillStyle = 'rgba(190,255,170,.95)'; x.shadowColor = '#9dffd0'; x.shadowBlur = 6; [-1, 1].forEach(s => { x.beginPath(); x.ellipse(32 + s * 11, 26, 11, 16, -s * 0.5, 0, 7); x.fill(); x.beginPath(); x.ellipse(32 + s * 8, 42, 7, 10, s * 0.4, 0, 7); x.fill(); }); x.fillStyle = '#fff'; x.fillRect(31, 18, 2, 28); });
  }
  emit(x, y, z, vx, vy, vz, life, c) { const i = this.i = (this.i + 1) % this.N; this.pos.set([x, y, z], i * 3); this.vel[i].set(vx, vy, vz); this.life[i] = this.max[i] = life; this.bc[i] = c; }
  burst(x, y, z, n) { for (let j = 0; j < n; j++) { const a = Math.random() * 6.283, b = Math.random() * 3.14 - 1.57, sp = 2 + Math.random() * 3; this.emit(x, y, z, Math.cos(a) * Math.cos(b) * sp, Math.sin(b) * sp, Math.sin(a) * Math.cos(b) * sp, 0.8 + Math.random() * 0.5, Math.random() < 0.5 ? [0.5, 1, 0.8] : [1, 0.85, 0.4]); } }
  sparks(x, y, z, n, c, sp = 3) { for (let j = 0; j < n; j++) { const a = Math.random() * 6.283, b = Math.random() * 3.14 - 1.57, s = sp * (0.4 + Math.random()); this.emit(x, y, z, Math.cos(a) * Math.cos(b) * s, Math.sin(b) * s + 1, Math.sin(a) * Math.cos(b) * s, 0.5 + Math.random() * 0.5, c); } }
  ghost(x, y, z) { const s = new T.Sprite(new T.SpriteMaterial({ map: this.gTex, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8 })); s.scale.set(1.1, 2.3, 1); s.position.set(x, y + 1, z); this.scene.add(s); this.gh.push({ s, t: 0 }); }
  swarm(o) { for (let i = 0; i < 30; i++) { const s = new T.Sprite(new T.SpriteMaterial({ map: this.bfTex, blending: T.AdditiveBlending, depthWrite: false, transparent: true })); this.scene.add(s); this.sw.push({ s, a: i / 30 * 6.283, i, t: 0, o: o.clone() }); } }
  update(dt, pl, T0) {
    const P = pl.g.position, N = this.N;
    this.acc += (40 + pl.speed * 100 + (pl.act ? 120 : 0) + (pl.atk >= 0 ? 100 : 0) + (pl.flying ? 60 : 0)) * dt;
    while (this.acc >= 1) { this.acc--; const a = Math.random() * 6.283, r = 0.35 + Math.random() * 0.25; this.emit(P.x + Math.cos(a) * r, P.y + Math.random() * 1.7, P.z + Math.sin(a) * r, -Math.sin(a) * 0.6, 0.5 + Math.random() * 0.5, Math.cos(a) * 0.6, 1.2, Math.random() < 0.65 ? [0.45, 1, 0.75] : [1, 0.85, 0.4]); }
    if (pl.y < 0.05) { this.acc2 += pl.speed * 28 * dt; while (this.acc2 >= 1) { this.acc2--; this.emit(P.x + (Math.random() - 0.5) * 0.3, P.y - pl.y + 0.05, P.z + (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.4, 0.3, (Math.random() - 0.5) * 0.4, 1.6, [1, 0.8, 0.9]); } }
    for (let i = 0; i < N; i++) {
      if (this.life[i] <= 0) { this.pos[i * 3 + 1] = -999; continue; }
      this.life[i] -= dt; const v = this.vel[i]; this.pos[i * 3] += v.x * dt; this.pos[i * 3 + 1] += v.y * dt; this.pos[i * 3 + 2] += v.z * dt; v.multiplyScalar(1 - dt * 1.5); v.y += dt * 0.5;
      const f = Math.max(0, this.life[i] / this.max[i]); this.col[i * 3] = this.bc[i][0] * f; this.col[i * 3 + 1] = this.bc[i][1] * f; this.col[i * 3 + 2] = this.bc[i][2] * f;
    }
    this.pts.geometry.attributes.position.needsUpdate = true; this.pts.geometry.attributes.color.needsUpdate = true;
    for (let j = this.sw.length - 1; j >= 0; j--) {
      const b = this.sw[j]; b.t += dt; const u = b.t / 4.5;
      if (u >= 1) { this.scene.remove(b.s); b.s.material.dispose(); this.sw.splice(j, 1); continue; }
      const a = b.a + b.t * (1.4 + b.i * 0.03), r = 0.6 + u * 6 * (0.5 + (b.i % 5) * 0.15);
      b.s.position.set(b.o.x + Math.cos(a) * r, b.o.y + 0.8 + u * 5 + Math.sin(b.t * 2 + b.i) * 0.3, b.o.z + Math.sin(a) * r);
      b.s.scale.set(0.12 + 0.4 * Math.abs(Math.sin(T0 * 12 + b.i)), 0.4, 1); b.s.material.opacity = Math.min(1, (1 - u) * 3);
    }
    for (let j = this.gh.length - 1; j >= 0; j--) {
      const g = this.gh[j]; g.t += dt; const u = g.t / 0.7;
      if (u >= 1) { this.scene.remove(g.s); g.s.material.dispose(); this.gh.splice(j, 1); continue; }
      g.s.material.opacity = 0.8 * (1 - u); g.s.scale.x = 1.1 * (1 + u * 0.4);
    }
  }
}
