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
const system = new THREE.Group();
system.rotation.x = THREE.MathUtils.degToRad(52);
scene.add(system);
const sunLight = new THREE.PointLight(0xffcc66, 2.2, 0, 2);
system.add(sunLight);
const sunGeo = new THREE.SphereGeometry(80, 48, 48);
const sunMat = new THREE.MeshStandardMaterial({ color: 0xfff1c0, emissive: 0xffc24a, emissiveIntensity: 1.2, roughness: 0.6, metalness: 0 });
const sun = new THREE.Mesh(sunGeo, sunMat);
sun.position.set(0, 0, 0);
system.add(sun);
function makePlanet(cfg) {
  const geo = new THREE.SphereGeometry(cfg.radius, 48, 48);
  const mat = new THREE.MeshStandardMaterial({ color: cfg.color, roughness: 0.9, metalness: 0.1 });
  const mesh = new THREE.Mesh(geo, mat);
  const group = new THREE.Group();
  group.rotation.z = THREE.MathUtils.degToRad(cfg.inclineZ || 0);
  group.rotation.x = THREE.MathUtils.degToRad(cfg.orbitTilt || 0);
  const pts = [];
  for (let i = 0; i < 180; i++) {
    const th = (i / 180) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(th) * cfg.rx, Math.sin(th) * cfg.ry, 0));
  }
  const orbitGeom = new THREE.BufferGeometry().setFromPoints(pts);
  const orbitLine = new THREE.LineLoop(orbitGeom, new THREE.LineBasicMaterial({ color: 0x5a6070, transparent: true, opacity: 0.35 }));
  group.add(orbitLine);
  group.add(mesh);
  system.add(group);
  return { mesh, rx: cfg.rx, ry: cfg.ry, period: cfg.period, spin: cfg.spin || 20 };
}
const planets = [
  makePlanet({ radius: 6, color: 0xc2b59b, rx: 90, ry: 70, period: 6, inclineZ: 8, spin: 12 }),
  makePlanet({ radius: 9, color: 0xd2a46b, rx: 140, ry: 120, period: 10, inclineZ: -6, spin: 18 }),
  makePlanet({ radius: 10, color: 0x5fa8ff, rx: 190, ry: 150, period: 16, inclineZ: 12, orbitTilt: 2, spin: 16 }),
  makePlanet({ radius: 14, color: 0x7aa3c9, rx: 240, ry: 210, period: 30, inclineZ: -14, orbitTilt: -3, spin: 20 }),
  makePlanet({ radius: 12, color: 0x7b5d3e, rx: 290, ry: 230, period: 40, inclineZ: 4, spin: 24 }),
  makePlanet({ radius: 11, color: 0x6fa79f, rx: 340, ry: 270, period: 55, inclineZ: -10, spin: 28 }),
  makePlanet({ radius: 10, color: 0x8f95a3, rx: 390, ry: 300, period: 70, inclineZ: 6, spin: 32 }),
  makePlanet({ radius: 9, color: 0x87a3d1, rx: 440, ry: 330, period: 85, inclineZ: -8, orbitTilt: 3, spin: 36 })
];
let start = performance.now();
function renderLoop() {
  const t = (performance.now() - start) / 1000;
  for (const p of planets) {
    const theta = (t % p.period) / p.period * Math.PI * 2;
    p.mesh.position.set(Math.cos(theta) * p.rx, Math.sin(theta) * p.ry, 0);
    p.mesh.rotation.y += (Math.PI * 2) / (p.spin * 60);
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
