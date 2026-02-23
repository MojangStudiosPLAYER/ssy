function pad(n) { return n < 10 ? "0" + n : "" + n; }

function updateClock() {
  const now = new Date();
  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const timeEl = document.getElementById("time");
  const dateEl = document.getElementById("date");
  if (timeEl) timeEl.textContent = `${hh}:${mm}`;
  if (dateEl) {
    const yyyy = now.getFullYear();
    const MM = pad(now.getMonth() + 1);
    const dd = pad(now.getDate());
    dateEl.textContent = `${yyyy}-${MM}-${dd}`;
  }
}

updateClock();
setInterval(updateClock, 1000);
const container = document.getElementById("webgl");
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.setSize(window.innerWidth, window.innerHeight);
if (container) container.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 5000);
camera.position.set(0, 320, 900);
camera.lookAt(0, 0, 0);
const ambient = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(ambient);
const hemi = new THREE.HemisphereLight(0x334466, 0x0b0a0a, 0.55);
scene.add(hemi);
const system = new THREE.Group();
system.rotation.x = THREE.MathUtils.degToRad(52);
scene.add(system);
const bodiesGroup = new THREE.Group();
const orbitsGroup = new THREE.Group();
system.add(orbitsGroup);
system.add(bodiesGroup);
const sunLight = new THREE.PointLight(0xffcc66, 2.2, 0, 2);
bodiesGroup.add(sunLight);
const sunGeo = new THREE.SphereGeometry(80, 48, 48);
const sunMat = new THREE.MeshStandardMaterial({ color: 0xfff1c0, emissive: 0xffc24a, emissiveIntensity: 1.2, roughness: 0.6, metalness: 0 });
const sun = new THREE.Mesh(sunGeo, sunMat);
sun.position.set(0, 0, 0);
bodiesGroup.add(sun);
function hexToCss(hexInt) {
  let s = hexInt.toString(16);
  while (s.length < 6) s = "0" + s;
  return "#" + s;
}
function mixChannel(c, k) {
  return Math.max(0, Math.min(255, Math.round(c * k)));
}
function shade(hexInt, k) {
  const r = (hexInt >> 16) & 255, g = (hexInt >> 8) & 255, b = hexInt & 255;
  return "#" + [mixChannel(r, k), mixChannel(g, k), mixChannel(b, k)]
    .map(x => x.toString(16).padStart(2, "0")).join("");
}
function createStripedTexture(baseHex) {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const base = hexToCss(baseHex);
  const darker = shade(baseHex, 0.7);
  const lighter = shade(baseHex, 1.15);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const bandCount = 12;
  for (let i = 0; i < bandCount; i++) {
    const y = (i / bandCount) * canvas.height;
    const h = (0.6 + Math.random() * 0.8) * (canvas.height / bandCount);
    ctx.fillStyle = i % 2 === 0 ? darker : lighter;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(0, y, canvas.width, h);
    ctx.globalAlpha = 1;
  }
  ctx.globalAlpha = 0.06;
  for (let i = 0; i < 300; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const w = 2 + Math.random() * 6;
    const h = 2 + Math.random() * 6;
    ctx.fillStyle = Math.random() > 0.5 ? "#ffffff" : "#000000";
    ctx.fillRect(x, y, w, h);
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.needsUpdate = true;
  return tex;
}
function rand01Seeded(x, y, s) {
  const n = Math.sin((x * 12.9898 + y * 78.233 + s * 437.585)) * 43758.5453;
  return n - Math.floor(n);
}
function fbm(x, y, octaves, seed) {
  let v = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < octaves; i++) {
    v += amp * rand01Seeded(x * freq, y * freq, seed + i * 97.1);
    amp *= 0.5;
    freq *= 2;
  }
  return v;
}
function createGasTexture(baseHex, seed) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024; canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const base = hexToCss(baseHex);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = img.data;
  const r0 = (baseHex >> 16) & 255, g0 = (baseHex >> 8) & 255, b0 = baseHex & 255;
  for (let y = 0; y < canvas.height; y++) {
    const t = y / canvas.height;
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      const band = Math.sin(t * Math.PI * 20 + fbm(x / 200, y / 40, 3, seed) * 2);
      const f = 0.25 * band + 0.5 * fbm(x / 350, y / 120, 4, seed + 19);
      const r = Math.max(0, Math.min(255, r0 * (0.9 + f * 0.2)));
      const g = Math.max(0, Math.min(255, g0 * (0.9 + f * 0.2)));
      const b = Math.max(0, Math.min(255, b0 * (0.9 + f * 0.2)));
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.needsUpdate = true;
  return tex;
}
function createRockyTexture(baseHex, seed) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024; canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const base = hexToCss(baseHex);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = img.data;
  const r0 = (baseHex >> 16) & 255, g0 = (baseHex >> 8) & 255, b0 = baseHex & 255;
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      const n = fbm(x / 140, y / 140, 5, seed) * 0.8 + fbm(x / 30, y / 30, 2, seed + 7) * 0.2;
      const f = 0.6 + n * 0.5;
      data[i] = Math.max(0, Math.min(255, r0 * f));
      data[i + 1] = Math.max(0, Math.min(255, g0 * f));
      data[i + 2] = Math.max(0, Math.min(255, b0 * f));
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  for (let k = 0; k < 35; k++) {
    const cx = Math.random() * canvas.width;
    const cy = Math.random() * canvas.height;
    const r = 6 + Math.random() * 20;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, "rgba(0,0,0,0.35)");
    grad.addColorStop(0.6, "rgba(0,0,0,0.1)");
    grad.addColorStop(1, "rgba(255,255,255,0.15)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.needsUpdate = true;
  return tex;
}
function createOceanTexture(seed) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024; canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(canvas.width, canvas.height);
  const data = img.data;
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      const nx = x / canvas.width, ny = y / canvas.height;
      const v = fbm(nx * 6, ny * 3, 5, seed);
      const land = v > 0.58;
      const coast = Math.abs(v - 0.58) < 0.02;
      let r = 40, g = 95, b = 180;
      if (land) { r = 80 + v * 60; g = 120 + v * 50; b = 60 + v * 20; }
      if (coast) { r += 30; g += 30; b += 30; }
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  ctx.globalAlpha = 0.12;
  for (let k = 0; k < 250; k++) {
    const cx = Math.random() * canvas.width;
    const cy = Math.random() * canvas.height;
    const r = 12 + Math.random() * 40;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, "rgba(255,255,255,0.5)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.needsUpdate = true;
  return tex;
}
function createIceTexture(seed) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024; canvas.height = 512;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#eaf4ff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = img.data;
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      const n = fbm(x / 140, y / 140, 4, seed);
      const f = 0.9 + n * 0.15;
      data[i] = Math.max(0, Math.min(255, 230 * f));
      data[i + 1] = Math.max(0, Math.min(255, 240 * f));
      data[i + 2] = Math.max(0, Math.min(255, 255 * f));
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  ctx.strokeStyle = "rgba(80,110,160,0.45)";
  ctx.lineWidth = 1.5;
  for (let k = 0; k < 60; k++) {
    let x = Math.random() * canvas.width;
    let y = Math.random() * canvas.height;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let i = 0; i < 80; i++) {
      x += (Math.random() - 0.5) * 8;
      y += (Math.random() - 0.5) * 4;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.needsUpdate = true;
  return tex;
}
function makePlanet(cfg) {
  const geo = new THREE.SphereGeometry(cfg.radius, 48, 48);
  const mat = new THREE.MeshPhysicalMaterial({
    color: cfg.color,
    roughness: cfg.roughness ?? 0.35,
    metalness: cfg.metalness ?? 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.0,
    transparent: false
  });
  let tex;
  const seed = cfg.seed ?? cfg.color;
  if (cfg.textureType === "gas") tex = createGasTexture(cfg.color, seed);
  else if (cfg.textureType === "rocky") tex = createRockyTexture(cfg.color, seed);
  else if (cfg.textureType === "ocean") tex = createOceanTexture(seed);
  else if (cfg.textureType === "ice") tex = createIceTexture(seed);
  else tex = createStripedTexture(cfg.color);
  mat.map = tex;
  mat.needsUpdate = true;
  const mesh = new THREE.Mesh(geo, mat);
  const planetGroup = new THREE.Group();
  planetGroup.rotation.z = THREE.MathUtils.degToRad(cfg.inclineZ || 0);
  planetGroup.rotation.x = THREE.MathUtils.degToRad(cfg.orbitTilt || 0);
  const a = cfg.rx, b = cfg.ry;
  const c = Math.sqrt(Math.max(a * a - b * b, 0));
  const centerShiftX = -c;
  const pts = [];
  for (let i = 0; i < 180; i++) {
    const th = (i / 180) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(th) * a + centerShiftX, Math.sin(th) * b, 0));
  }
  const orbitGeom = new THREE.BufferGeometry().setFromPoints(pts);
  const orbitLine = new THREE.LineLoop(orbitGeom, new THREE.LineBasicMaterial({ color: 0x5a6070, transparent: true, opacity: 0.35 }));
  orbitLine.renderOrder = 0;
  const orbitGroup = new THREE.Group();
  orbitGroup.rotation.z = THREE.MathUtils.degToRad(cfg.inclineZ || 0);
  orbitGroup.rotation.x = THREE.MathUtils.degToRad(cfg.orbitTilt || 0);
  orbitGroup.add(orbitLine);
  orbitsGroup.add(orbitGroup);
  planetGroup.add(mesh);
  bodiesGroup.add(planetGroup);
  const axis = new THREE.Vector3(0, 1, 0);
  axis.applyEuler(new THREE.Euler(
    THREE.MathUtils.degToRad(cfg.axisTilt || 0),
    0,
    THREE.MathUtils.degToRad(cfg.axisAzimuth || 0)
  )).normalize();
  return { mesh, rx: a, ry: b, period: cfg.period, spin: cfg.spin || 20, focusShiftX: centerShiftX, axis };
}
const planets = [
  makePlanet({ radius: 6, color: 0xc2b59b, textureType: "rocky", seed: 11, rx: 90, ry: 90, period: 6, inclineZ: 8, spin: 12, axisTilt: 2 }),
  makePlanet({ radius: 9, color: 0xd2a46b, textureType: "rocky", seed: 22, rx: 140, ry: 140, period: 10, inclineZ: -6, spin: 18, axisTilt: 177 }),
  makePlanet({ radius: 10, color: 0x5fa8ff, textureType: "ocean", seed: 33, rx: 190, ry: 190, period: 16, inclineZ: 12, orbitTilt: 2, spin: 16, axisTilt: 23.5 }),
  makePlanet({ radius: 14, color: 0x7aa3c9, textureType: "gas", seed: 44, rx: 240, ry: 240, period: 30, inclineZ: -14, orbitTilt: -3, spin: 20, axisTilt: 26.7 }),
  makePlanet({ radius: 12, color: 0x7b5d3e, textureType: "rocky", seed: 55, rx: 290, ry: 290, period: 40, inclineZ: 4, spin: 24, axisTilt: 3.1 }),
  makePlanet({ radius: 11, color: 0x6fa79f, textureType: "gas", seed: 66, rx: 340, ry: 340, period: 55, inclineZ: -10, spin: 28, axisTilt: 98 }),
  makePlanet({ radius: 10, color: 0x8f95a3, textureType: "gas", seed: 77, rx: 390, ry: 390, period: 70, inclineZ: 6, spin: 32, axisTilt: 28.3 }),
  makePlanet({ radius: 9, color: 0x87a3d1, textureType: "gas", seed: 88, rx: 440, ry: 440, period: 85, inclineZ: -8, orbitTilt: 3, spin: 36, axisTilt: 29.6 })
];
let start = performance.now();
function renderLoop() {
  const t = (performance.now() - start) / 1000;
  renderLoop.prev = renderLoop.prev ?? t;
  const dt = t - renderLoop.prev;
  renderLoop.prev = t;
  for (const p of planets) {
    const theta = (t % p.period) / p.period * Math.PI * 2;
    p.mesh.position.set(Math.cos(theta) * p.rx + p.focusShiftX, Math.sin(theta) * p.ry, 0);
    const dSpin = dt * (Math.PI * 2) / (p.spin || 20);
    p.mesh.rotateOnAxis(p.axis, dSpin);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(renderLoop);
}
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", onResize);
renderLoop();
