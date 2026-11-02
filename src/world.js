// 2000년대 감성의 3층 학교 (층마다 교실 10개 + 양쪽 계단 + 흙 운동장)
// 외부 3D 파일 없이 기본 도형 + 캔버스 무늬로 만들고, 같은 재질끼리 하나로 합쳐서
// 휴대폰에서도 가볍게 돌아가도록 했습니다.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ── 건물 치수 ─────────────────────────────────────────────
export const LEVEL_H = 3.6; // 층 높이
export const LEVELS = 3;
export const levelY = (k) => 0.15 + k * LEVEL_H; // k층 바닥 높이 (0 = 1층)
export const ROOF = LEVELS; // 옥상 = 4번째 층
export const levelOfY = (y) => Math.max(0, Math.min(ROOF, Math.round((y - 0.15) / LEVEL_H)));

const SLOT = 9; // 교실 가로
const STAIR_W = 7; // 계단실 가로
const HALL_W = 9; // 가운데(현관/교무실/도서실)
const Z_FRONT = 0; // 운동장 쪽 벽
export const Z_CORR = -9; // 교실 / 복도 경계
export const Z_BACK = -14; // 건물 뒤쪽 벽 (복도 폭 5m)
const FLIGHT_END = -1.6; // 계단 층계참 시작
export const BX = (2 * STAIR_W + 8 * SLOT + HALL_W) / 2; // 건물 반폭 = 47.5

// 가로 방향 칸 배치: 계단 | 왼쪽 4칸 | 가운데 | 오른쪽 4칸 | 계단
const SLOTS = [];
{
  let x = -BX;
  const push = (type, w, n) => {
    SLOTS.push({ type, xs: x, xe: x + w, n });
    x += w;
  };
  push('stair', STAIR_W);
  for (let i = 0; i < 4; i++) push('class', SLOT, i);
  push('hall', HALL_W);
  for (let i = 4; i < 8; i++) push('class', SLOT, i);
  push('stair', STAIR_W);
}

export const STAIRS = SLOTS.filter((s) => s.type === 'stair').map((s) => ({
  xs: s.xs,
  xe: s.xe,
  xA: s.xs + 1.75, // 복도에서 앞으로 올라가는 쪽
  xB: s.xs + 5.25, // 층계참에서 꺾여 뒤로 올라가는 쪽
  mid: s.xs + 3.5,
  zEntry: -10.5,
  zCorr: Z_CORR,
  zFlightEnd: FLIGHT_END,
  zLanding: -0.85,
}));

// 층별 방 배치 (왼쪽 4칸 → 오른쪽 4칸). 학년마다 4반 + 특별실·행정 공간
const ROOM_PLAN = [
  [['principal', '교장실'], ['admin', '행정실'], ['staff', '교무실'], ['nurse', '보건실'], ['class', 1], ['class', 2], ['class', 3], ['class', 4]],
  [['class', 1], ['class', 2], ['class', 3], ['class', 4], ['science', '과학실'], ['art', '미술실'], ['computer', '컴퓨터실'], ['broadcast', '방송실']],
  [['class', 1], ['class', 2], ['class', 3], ['class', 4], ['music', '음악실'], ['av', '시청각실'], ['homeec', '가정실'], ['council', '학생회실']],
];
export const HALL_NAMES = ['중앙현관', '상담실', '도서실'];
// 칠판·교탁이 있는 (수업하는) 방
export const TEACHING = new Set(['class', 'science', 'art', 'music', 'computer', 'av', 'homeec', 'council']);
// 사무 공간 (전화·타자 소리)
export const OFFICE_ROOMS = new Set(['principal', 'admin', 'staff', 'nurse', 'broadcast']);

export const CLASSROOMS = [];
for (let k = 0; k < LEVELS; k++) {
  for (const s of SLOTS) {
    if (s.type !== 'class') continue;
    const [type, v] = ROOM_PLAN[k][s.n];
    if (type === 'class') CLASSROOMS.push({ id: `${k + 1}-${v}`, name: `${k + 1}학년 ${v}반`, type, level: k, xs: s.xs, xe: s.xe });
    else CLASSROOMS.push({ id: type, name: v, type, level: k, xs: s.xs, xe: s.xe });
  }
}

export function roomAt(x, z, y) {
  if (z < Z_CORR || z > Z_FRONT) return null;
  const k = levelOfY(y);
  return CLASSROOMS.find((c) => c.level === k && x > c.xs && x < c.xe) || null;
}

// 매점 위치 (운동장 옆)
export const STORE = { minX: 36, maxX: 46, minZ: 4, maxZ: 12.5, doorX1: 40, doorX2: 42 };
// 축구장 (공이 굴러다니는 범위)과 골대
// 본관 뒤 별관: 체육관 / 급식실
// 강당동: 본관 바로 뒤. 1층 급식실, 2층 강당(체육관). 본관 2층과 구름다리로, 1층은 지붕 있는 통로로 연결
export const ANNEX = { minX: 6, maxX: 36, minZ: -36, maxZ: -20 };
export const CAFE = { ...ANNEX, level: 0 };
export const GYM = { ...ANNEX, level: 1 };
export const BRIDGE = { minX: 10, maxX: 13, minZ: ANNEX.maxZ, maxZ: Z_BACK };
export const CAFE_DOOR = [20, 23];
export const HOOPS = [
  { x: ANNEX.minX + 1.65, y: levelY(1) + 3.05, z: -26.4 },
  { x: ANNEX.maxX - 1.65, y: levelY(1) + 3.05, z: -26.4 },
];
export const PITCH = { minX: -46.8, maxX: 46.8, minZ: 15.3, maxZ: 66.7, goalX: 43, goalZ1: 37.6, goalZ2: 44.4, goalDepth: 44.3 };

// 층별 길찾기 범위
export const NAV_BOUNDS = [
  { minX: -68.5, maxX: 68.5, minZ: -45.5, maxZ: 72.5 }, // 1층 + 바깥(담장 안)
  { minX: -BX, maxX: BX, minZ: ANNEX.minZ - 0.5, maxZ: Z_FRONT }, // 2층 + 구름다리 + 강당
  { minX: -BX, maxX: BX, minZ: Z_BACK, maxZ: Z_FRONT },
  { minX: -BX, maxX: BX, minZ: Z_BACK, maxZ: Z_FRONT }, // 옥상
];

// ── 캔버스 무늬 ───────────────────────────────────────────
function rand(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function canvasTex(w, h, draw, { repeat = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

const speckle = (base, colors, n, seed, sz = 3) => (g, w, h) => {
  const r = rand(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    g.fillStyle = colors[Math.floor(r() * colors.length)];
    g.fillRect(r() * w, r() * h, 1 + r() * sz, 1 + r() * sz);
  }
};

const FONT = "'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',sans-serif";

function textTex(w, h, bg, fg, lines, size, border) {
  return canvasTex(
    w,
    h,
    (g) => {
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);
      if (border) {
        g.strokeStyle = border;
        g.lineWidth = Math.max(4, h * 0.06);
        g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth);
      }
      g.fillStyle = fg;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      lines.forEach((ln, i) => {
        g.font = `700 ${size}px ${FONT}`;
        g.fillText(ln, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.2, w - 20);
      });
    },
    { repeat: false },
  );
}

// 칠판 (반마다 따로)
export function drawBoardCanvas(c, text) {
  const g = c.getContext('2d');
  g.fillStyle = '#2e5040';
  g.fillRect(0, 0, c.width, c.height);
  const r = rand(3);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(255,255,255,${r() * 0.05})`;
    g.fillRect(r() * c.width, r() * c.height, 10 + r() * 40, 2);
  }
  const lines = String(text || '').split('\n').slice(0, 5);
  const size = lines.length > 3 ? 30 : 38;
  g.font = `600 ${size}px ${FONT}`;
  g.fillStyle = '#f4f1e6';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const top = c.height / 2 - ((lines.length - 1) * size * 1.25) / 2;
  lines.forEach((ln, i) => g.fillText(ln, c.width / 2, top + i * size * 1.25, c.width - 30));
}

// 음악가 초상화 (간단한 그림 + 이름)
function portraitTex(name) {
  return canvasTex(
    150,
    190,
    (g) => {
      g.fillStyle = '#6b4a2c';
      g.fillRect(0, 0, 150, 190);
      g.fillStyle = '#efe6d0';
      g.fillRect(10, 10, 130, 170);
      g.fillStyle = '#f0c8a0';
      g.beginPath();
      g.ellipse(75, 75, 30, 36, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = name === '베토벤' ? '#3a3a3a' : '#e9e9e9';
      g.beginPath();
      g.ellipse(75, 55, 42, 30, 0, Math.PI, 0);
      g.fill();
      g.fillRect(33, 55, 14, 45);
      g.fillRect(103, 55, 14, 45);
      g.fillStyle = '#2b2b2b';
      g.fillRect(40, 118, 70, 40);
      g.fillStyle = '#2b2b2b';
      g.font = `700 22px ${FONT}`;
      g.textAlign = 'center';
      g.fillText(name, 75, 176);
    },
    { repeat: false },
  );
}

// ── 같은 재질끼리 합치는 도우미 (그리기 횟수를 줄여 휴대폰에서도 빠르게) ──
function createBatcher() {
  const groups = new Map();
  const v = new THREE.Vector3();
  function push(mat, role, g) {
    g = g.index ? g.toNonIndexed() : g;
    g.computeBoundingBox();
    g.boundingBox.getCenter(v);
    const chunk = Math.floor((v.x + 90) / 18);
    const key = `${mat}|${role}|${chunk}`;
    if (!groups.has(key)) groups.set(key, { mat, role, geos: [] });
    groups.get(key).geos.push(g);
  }
  return {
    box(mat, role, x1, x2, y1, y2, z1, z2) {
      const g = new THREE.BoxGeometry(Math.abs(x2 - x1) || 0.001, Math.abs(y2 - y1) || 0.001, Math.abs(z2 - z1) || 0.001);
      g.translate((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
      push(mat, role, g);
    },
    geo(mat, role, g, x, y, z) {
      g.translate(x, y, z);
      push(mat, role, g);
    },
    build(scene, mats) {
      const out = { floor: [], wall: [], glass: [], chair: [], deco: [], stair: [] };
      for (const { mat, role, geos } of groups.values()) {
        const m = mats[mat];
        for (const g of geos) {
          // 어느 방향 면이든 실제 크기에 맞게 무늬가 반복되도록 UV 다시 계산
          const p = g.attributes.position;
          const n = g.attributes.normal;
          const uv = g.attributes.uv;
          const s = m.userData.uvScale || 1;
          for (let i = 0; i < p.count; i++) {
            const ax = Math.abs(n.getX(i));
            const ay = Math.abs(n.getY(i));
            const az = Math.abs(n.getZ(i));
            if (ay >= ax && ay >= az) uv.setXY(i, p.getX(i) * s, p.getZ(i) * s);
            else if (ax >= az) uv.setXY(i, p.getZ(i) * s, p.getY(i) * s);
            else uv.setXY(i, p.getX(i) * s, p.getY(i) * s);
          }
        }
        const merged = mergeGeometries(geos, false);
        geos.forEach((g) => g.dispose());
        const mesh = new THREE.Mesh(merged, m);
        mesh.castShadow = role !== 'glass' && role !== 'floor';
        mesh.receiveShadow = role !== 'glass';
        mesh.userData.role = role;
        scene.add(mesh);
        out[role].push(mesh);
      }
      return out;
    },
  };
}

// ── 공간 만들기 ───────────────────────────────────────────
export function buildWorld(scene, { menu = [] } = {}) {
  const B = createBatcher();
  const blocks = [[], [], [], []]; // 층별 막힌 영역 (1~3층 + 옥상)
  const block = (k, x1, x2, z1, z2) =>
    blocks[k].push({ minX: Math.min(x1, x2), maxX: Math.max(x1, x2), minZ: Math.min(z1, z2), maxZ: Math.max(z1, z2) });
  const chairs = [];
  const boards = new Map(); // 반 id → { canvas, texture }
  const animated = [];

  // 재질
  const std = (color, extra = {}, uvScale = 1) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });
    m.userData.uvScale = uvScale;
    return m;
  };
  const tex = {
    wood: canvasTex(256, 256, (g, w) => {
      const r = rand(29);
      for (let i = 0; i < 8; i++) {
        const l = r() * 22;
        g.fillStyle = `rgb(${172 + l},${122 + l},${74 + l})`;
        g.fillRect(0, (i * w) / 8, w, w / 8);
        g.fillStyle = 'rgba(70,40,20,0.35)';
        g.fillRect(0, (i * w) / 8, w, 2);
        g.fillRect((i * 97) % w, (i * w) / 8, 2, w / 8);
      }
    }),
    terrazzo: canvasTex(256, 256, speckle('#b9b6aa', ['#8e8b80', '#d8d5ca', '#a49f90', '#6f6c64'], 2600, 5, 3)),
    dirt: canvasTex(256, 256, speckle('#c4a479', ['#b39066', '#d2b48b', '#a9875c', '#cbb08a'], 3000, 11, 3)),
    grass: canvasTex(256, 256, speckle('#7c9a4e', ['#6b8a42', '#8fae5c', '#97884f'], 2600, 7, 4)),
    concrete: canvasTex(256, 256, speckle('#c9c4b8', ['#bdb8ab', '#d3cfc4', '#b0ab9e'], 1800, 17, 2)),
    curtain: canvasTex(128, 64, (g) => {
      g.fillStyle = '#e6cf74';
      g.fillRect(0, 0, 128, 64);
      g.fillStyle = 'rgba(160,120,40,0.45)';
      for (let x = 8; x < 128; x += 16) for (let y = 8; y < 64; y += 16) {
        g.beginPath();
        g.arc(x + (y % 32 ? 8 : 0), y, 3, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = 'rgba(255,255,255,0.25)';
      for (let x = 0; x < 128; x += 8) g.fillRect(x, 0, 2, 64);
    }),
    tile: canvasTex(64, 64, (g) => {
      g.fillStyle = '#f4f4f0';
      g.fillRect(0, 0, 64, 64);
      g.strokeStyle = '#c9c9c4';
      g.lineWidth = 3;
      g.strokeRect(0, 0, 64, 64);
    }),
    locker: canvasTex(128, 128, (g) => {
      g.fillStyle = '#b48552';
      g.fillRect(0, 0, 128, 128);
      g.strokeStyle = '#7a5532';
      g.lineWidth = 4;
      g.strokeRect(4, 4, 120, 120);
      g.fillStyle = '#d8d8d8';
      g.fillRect(96, 54, 14, 20);
    }),
  };
  const mats = {
    floorWood: std('#ffffff', { map: tex.wood }, 0.5),
    corridorWood: std('#9a6a42', { map: tex.wood, roughness: 0.35, metalness: 0.05 }, 0.45),
    woodFrame: std('#7a4a2a'),
    darkWood: std('#4a2e1e'),
    corrGlass: std('#9fb7c4', { roughness: 0.15, metalness: 0.3, emissive: '#3c4f5a', emissiveIntensity: 0.25 }),
    labTop: std('#1f2326', { roughness: 0.35 }),
    curtain: std('#ffffff', { map: tex.curtain }, 1.2),
    sofa: std('#3d2a20', { roughness: 0.5 }),
    sheet: std('#f4f4ef'),
    paleGreen: std('#b9d8c2'),
    beige: std('#d9d2bf'),
    screen: std('#17232b', { roughness: 0.3, emissive: '#22323d', emissiveIntensity: 0.4 }),
    cabinet: std('#8d9298', { metalness: 0.4, roughness: 0.5 }),
    redLamp: std('#ff3b30', { emissive: '#ff2a1f', emissiveIntensity: 0.9 }),
    partition: std('#a9c2c8', { roughness: 0.9 }),
    pillarWood: std('#c8652e', { roughness: 0.6 }),
    chairDark: std('#7a3b20', { roughness: 0.45 }),
    steel: std('#c9cdd0', { metalness: 0.7, roughness: 0.3 }),
    tile: std('#ffffff', { map: tex.tile }, 3),
    terrazzo: std('#ffffff', { map: tex.terrazzo, roughness: 0.5 }, 0.5),
    cream: std('#efe4c8'),
    band: std('#b8745d'),
    green: std('#86a58d'),
    white: std('#f2f2ee'),
    roof: std('#5f8f62', { roughness: 0.6 }), // 초록 방수 페인트 옥상
    tank: std('#4a86c5', { roughness: 0.4 }),
    concrete: std('#ffffff', { map: tex.concrete }, 0.3),
    glass: (() => {
      const m = new THREE.MeshStandardMaterial({ color: '#9cc3d8', transparent: true, opacity: 0.32, roughness: 0.1, metalness: 0.2, depthWrite: false });
      m.userData.uvScale = 1;
      return m;
    })(),
    frame: std('#dcdcd6', { metalness: 0.3, roughness: 0.5 }),
    deskTop: std('#d9b27c'),
    metal: std('#5c6770', { metalness: 0.4, roughness: 0.5 }),
    chair: std('#c08a55'),
    door: std('#8a5a3a'),
    locker: std('#ffffff', { map: tex.locker }, 2.5),
    lectern: std('#8a5a36'),
    tv: std('#26272a', { roughness: 0.4 }),
    lamp: std('#ffffff', { emissive: '#fff8e6', emissiveIntensity: 0.9 }),
    cork: std('#b98c5c'),
    shelf: std('#7a5434'),
    books: std('#9b4a3a'),
    trunk: std('#6b4a32'),
    leaf1: std('#4f7d3a'),
    leaf2: std('#6a9447'),
    ginkgo: std('#e0b93a'),
    shrub: std('#3f6e35'),
    pole: std('#d9dde0', { metalness: 0.6, roughness: 0.3 }),
    red: std('#c8473d', { metalness: 0.2 }),
    yellow: std('#e1b43a', { metalness: 0.2 }),
    blue: std('#3b6fb0', { metalness: 0.2 }),
    fence: std('#5b7d5a', { metalness: 0.3 }),
    blueRoof: std('#3d6fa8', { roughness: 0.6 }),
  };

  // 하늘/조명
  scene.background = new THREE.Color('#bcd5e8');
  scene.fog = new THREE.Fog('#cddde8', 60, 170);
  scene.add(new THREE.HemisphereLight('#eef4ff', '#7a7355', 1.25));
  const sun = new THREE.DirectionalLight('#fff2dc', 2.1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -28, right: 28, top: 28, bottom: -28, near: 1, far: 90 });
  sun.shadow.bias = -0.0006;
  scene.add(sun, sun.target);

  // ── 땅 ──
  const walkables = [];
  const flat = (w, h, map, x, y, z) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, roughness: 1 }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    m.receiveShadow = true;
    scene.add(m);
    walkables.push(m);
    return m;
  };
  tex.grass.repeat.set(80, 80);
  flat(400, 400, tex.grass, 0, 0, 0);
  tex.dirt.repeat.set(30, 13);
  flat(137, 58, tex.dirt, 0, 0.01, 43.5); // 운동장 둘레 흙
  tex.concrete.repeat.set(30, 4);
  flat(137, 15, tex.concrete, 0, 0.015, 7.5); // 건물 앞 시멘트 마당
  const backTex = tex.concrete.clone();
  backTex.needsUpdate = true;
  backTex.repeat.set(30, 7);
  flat(138, 34, backTex, 0, 0.015, -29); // 본관 뒤 마당
  // 흙 운동장 (트랙 선)
  const fieldTex = canvasTex(
    1024,
    576,
    (g, w, h) => {
      speckle('#c4a479', ['#b39066', '#d2b48b', '#a9875c', '#cbb08a'], 26000, 11, 3)(g, w, h);
      g.strokeStyle = 'rgba(255,255,255,0.85)';
      g.lineWidth = 5;
      for (const inset of [40, 70]) {
        const rr = (h - inset * 2) / 2;
        g.beginPath();
        g.moveTo(inset + rr, inset);
        g.lineTo(w - inset - rr, inset);
        g.arc(w - inset - rr, h / 2, rr, -Math.PI / 2, Math.PI / 2);
        g.lineTo(inset + rr, h - inset);
        g.arc(inset + rr, h / 2, rr, Math.PI / 2, (Math.PI * 3) / 2);
        g.stroke();
      }
      g.beginPath();
      g.moveTo(w / 2, 100);
      g.lineTo(w / 2, h - 100);
      g.stroke();
      g.beginPath();
      g.arc(w / 2, h / 2, 50, 0, Math.PI * 2);
      g.stroke();
    },
    { repeat: false },
  );
  flat(94, 52, fieldTex, 0, 0.02, 41);

  // ── 건물: 바닥판 ──
  const WALL_T = 0.2;
  for (let k = 0; k <= LEVELS; k++) {
    const L = levelY(k);
    const yb = k === 0 ? 0 : L - 0.2;
    for (const s of SLOTS) {
      if (k === LEVELS) {
        // 옥상 바닥 (계단 자리는 뚫림)
        B.box('roof', 'floor', s.xs, s.xe, yb, L, Z_BACK, s.type === 'stair' ? Z_CORR : Z_FRONT);
        continue;
      }
      if (s.type === 'class') B.box('floorWood', 'floor', s.xs, s.xe, yb, L, Z_CORR, Z_FRONT);
      else if (s.type === 'hall' || k === 0) B.box('terrazzo', 'floor', s.xs, s.xe, yb, L, Z_CORR, Z_FRONT);
      // 계단실 2·3층은 계단 자리 뚫림
      B.box('corridorWood', 'floor', s.xs, s.xe, yb, L, Z_BACK, Z_CORR); // 복도 (니스 칠한 나무 마루)
    }
  }
  // 옥상 난간
  const roofY = levelY(LEVELS);
  B.box('cream', 'wall', -BX, BX, roofY, roofY + 1, Z_FRONT - 0.25, Z_FRONT);
  B.box('cream', 'wall', -BX, BX, roofY, roofY + 1, Z_BACK, Z_BACK + 0.25);
  B.box('cream', 'wall', -BX, -BX + 0.25, roofY, roofY + 1, Z_BACK, Z_FRONT);
  B.box('cream', 'wall', BX - 0.25, BX, roofY, roofY + 1, Z_BACK, Z_FRONT);
  // 난간 위 초록 철망 + 막힌 영역
  B.box('fence', 'deco', -BX, BX, roofY + 1, roofY + 1.8, Z_FRONT - 0.14, Z_FRONT - 0.11);
  B.box('fence', 'deco', -BX, BX, roofY + 1, roofY + 1.8, Z_BACK + 0.11, Z_BACK + 0.14);
  block(ROOF, -BX, BX, Z_FRONT - 0.25, Z_FRONT);
  block(ROOF, -BX, BX, Z_BACK, Z_BACK + 0.25);
  block(ROOF, -BX, -BX + 0.25, Z_BACK, Z_FRONT);
  block(ROOF, BX - 0.25, BX, Z_BACK, Z_FRONT);

  // 창문 벽 (아래 벽돌색 띠 + 유리 + 위 크림색)
  function windowWall(k, x1, x2, z1, z2) {
    const L = levelY(k);
    const yb = k === 0 ? 0 : L - 0.2;
    B.box('band', 'wall', x1, x2, yb, L + 0.9, z1, z2);
    B.box('glass', 'glass', x1, x2, L + 0.9, L + 2.7, z1 + 0.06, z2 - 0.06);
    B.box('cream', 'wall', x1, x2, L + 2.7, L + LEVEL_H - 0.2, z1, z2);
    const n = Math.max(1, Math.round((x2 - x1) / 1.5));
    for (let i = 0; i <= n; i++) {
      const x = x1 + ((x2 - x1) * i) / n;
      B.box('frame', 'deco', x - 0.04, x + 0.04, L + 0.9, L + 2.7, z1 - 0.02, z2 + 0.02);
    }
    B.box('frame', 'deco', x1, x2, L + 1.8, L + 1.86, z1 - 0.02, z2 + 0.02);
    block(k, x1, x2, z1, z2);
  }
  function solidWall(k, x1, x2, z1, z2, mat = 'cream') {
    const L = levelY(k);
    const yb = k === 0 ? 0 : L - 0.2;
    B.box(mat, 'wall', x1, x2, yb, L + LEVEL_H - 0.2, z1, z2);
    block(k, x1, x2, z1, z2);
  }
  // 문 있는 벽 (교실 앞문/뒷문)
  function wallWithDoors(k, x1, x2, z1, z2, doors) {
    const L = levelY(k);
    let cur = x1;
    for (const [d1, d2] of doors) {
      if (d1 > cur) solidWall(k, cur, d1, z1, z2);
      B.box('cream', 'wall', d1, d2, L + 2.25, L + LEVEL_H - 0.2, z1, z2);
      // 반쯤 열린 나무 미닫이문 (위쪽 유리 두 칸) + 바닥 레일
      B.box('door', 'deco', d1 - 0.85, d1 + 0.05, L, L + 2.2, z1 - 0.07, z1 - 0.02);
      B.box('glass', 'glass', d1 - 0.78, d1 - 0.02, L + 1.15, L + 2.05, z1 - 0.085, z1 - 0.075);
      B.box('woodFrame', 'deco', d1 - 0.43, d1 - 0.37, L + 1.12, L + 2.08, z1 - 0.09, z1 - 0.07);
      B.box('woodFrame', 'deco', d1 - 0.82, d1 + 0.02, L + 1.1, L + 1.15, z1 - 0.09, z1 - 0.07);
      B.box('woodFrame', 'deco', d1 - 0.82, d1 + 0.02, L + 2.05, L + 2.1, z1 - 0.09, z1 - 0.07);
      B.box('metal', 'deco', d1 - 0.95, d2 + 0.1, L, L + 0.02, z1 - 0.1, z1);
      B.box('woodFrame', 'deco', d1 - 0.06, d1, L, L + 2.25, z1 - 0.05, z2 + 0.05);
      B.box('woodFrame', 'deco', d2, d2 + 0.06, L, L + 2.25, z1 - 0.05, z2 + 0.05);
      B.box('woodFrame', 'deco', d1 - 0.06, d2 + 0.06, L + 2.2, L + 2.3, z1 - 0.05, z2 + 0.05);
      cur = d2;
    }
    if (x2 > cur) solidWall(k, cur, x2, z1, z2);
    // 나무 걸레받이 + 나무 창틀 복도 창 (그 시절 학교 복도), 양쪽 면
    for (const [fz0, fz1] of [[z1 - 0.03, z1], [z2, z2 + 0.03]]) {
      B.box('woodFrame', 'deco', x1, x2, L, L + 0.15, fz0, fz1);
      let c2 = x1;
      for (const [d1, d2] of [...doors, [x2, x2]]) {
        const a = c2 + 0.25;
        const b = d1 - 0.25;
        if (b - a > 1.2) {
          B.box('corrGlass', 'deco', a, b, L + 1.35, L + 2.15, fz0, fz1);
          B.box('woodFrame', 'deco', a - 0.05, b + 0.05, L + 1.3, L + 1.36, fz0 - 0.02, fz1 + 0.02);
          B.box('woodFrame', 'deco', a - 0.05, b + 0.05, L + 2.14, L + 2.2, fz0 - 0.02, fz1 + 0.02);
          const n = Math.max(2, Math.round((b - a) / 0.9));
          for (let q = 0; q <= n; q++) {
            const x = a + ((b - a) * q) / n;
            B.box('woodFrame', 'deco', x - 0.035, x + 0.035, L + 1.3, L + 2.2, fz0 - 0.02, fz1 + 0.02);
          }
        }
        c2 = d2;
      }
    }
  }

  for (let k = 0; k < LEVELS; k++) {
    const L = levelY(k);
    for (const s of SLOTS) {
      // 앞벽 (운동장 쪽)
      if (s.type === 'hall') {
        if (k === 0) {
          solidWall(k, s.xs, -2.5, Z_FRONT - WALL_T, Z_FRONT);
          solidWall(k, 2.5, s.xe, Z_FRONT - WALL_T, Z_FRONT);
          B.box('cream', 'wall', -2.5, 2.5, L + 2.6, L + LEVEL_H - 0.2, Z_FRONT - WALL_T, Z_FRONT);
        } else solidWall(k, s.xs, s.xe, Z_FRONT - WALL_T, Z_FRONT);
      } else windowWall(k, s.xs, s.xe, Z_FRONT - WALL_T, Z_FRONT);
      // 뒷벽 (복도 창문)
      if (k === 1 && s.xs < BRIDGE.minX && s.xe > BRIDGE.maxX) {
        // 2층 복도 → 강당 구름다리 문
        windowWall(k, s.xs, BRIDGE.minX, Z_BACK, Z_BACK + WALL_T);
        windowWall(k, BRIDGE.maxX, s.xe, Z_BACK, Z_BACK + WALL_T);
        B.box('cream', 'wall', BRIDGE.minX, BRIDGE.maxX, L + 2.4, L + LEVEL_H - 0.2, Z_BACK, Z_BACK + WALL_T);
      } else if (s.type === 'hall' && k === 0) {
        // 중앙현관 뒷문 (체육관·급식실 가는 길)
        windowWall(k, s.xs, -2, Z_BACK, Z_BACK + WALL_T);
        windowWall(k, 2, s.xe, Z_BACK, Z_BACK + WALL_T);
        B.box('cream', 'wall', -2, 2, L + 2.4, L + LEVEL_H - 0.2, Z_BACK, Z_BACK + WALL_T);
      } else windowWall(k, s.xs, s.xe, Z_BACK, Z_BACK + WALL_T);
      // 교실/복도 경계 벽
      if (s.type === 'class') {
        wallWithDoors(k, s.xs, s.xe, Z_CORR - 0.1, Z_CORR + 0.1, [[s.xs + 0.5, s.xs + 2.4], [s.xe - 2.4, s.xe - 0.5]]);
      } else if (s.type === 'hall' && k > 0) {
        wallWithDoors(k, s.xs, s.xe, Z_CORR - 0.1, Z_CORR + 0.1, [[-0.8, 0.8]]);
      }
    }
    // 칸 사이 칸막이 벽
    for (let i = 1; i < SLOTS.length; i++) {
      const x = SLOTS[i].xs;
      solidWall(k, x - 0.1, x + 0.1, Z_CORR, Z_FRONT - WALL_T);
    }
    // 양 끝 벽 (1층은 계단실 옆문)
    for (const sx of [-BX, BX]) {
      const x1 = sx < 0 ? sx : sx - WALL_T;
      const x2 = x1 + WALL_T;
      if (k === 0) {
        solidWall(k, x1, x2, Z_BACK, -11.4);
        solidWall(k, x1, x2, -9.6, Z_FRONT);
        B.box('cream', 'wall', x1, x2, L + 2.25, L + LEVEL_H - 0.2, -11.4, -9.6);
      } else solidWall(k, x1, x2, Z_BACK, Z_FRONT);
    }
  }

  // ── 계단 (꺾인 계단: 복도 → 앞으로 반 층 → 층계참 → 뒤로 반 층) ──
  const STEPS = 12;
  const run = (FLIGHT_END - Z_CORR) / STEPS;
  for (const st of STAIRS) {
    B.box('cream', 'wall', st.mid - 0.1, st.mid + 0.1, 0, levelY(LEVELS) + 3, Z_CORR, FLIGHT_END);
    for (let k = 0; k <= ROOF; k++) block(k, st.xs, st.xe, Z_CORR, Z_FRONT); // 계단 구역은 평면 길찾기에서 제외
    // 옥상 계단실 (옥탑): 안쪽 벽에 옥상으로 나가는 문
    {
      const y0 = levelY(ROOF);
      const y1 = y0 + 3.2;
      const outer = st.xs < 0 ? st.xs : st.xe - WALL_T;
      const inner = st.xs < 0 ? st.xe - WALL_T : st.xs;
      B.box('cream', 'wall', outer, outer + WALL_T, y0, y1, Z_BACK, Z_FRONT);
      B.box('cream', 'wall', st.xs, st.xe, y0, y1, Z_FRONT - WALL_T, Z_FRONT);
      B.box('cream', 'wall', st.xs, st.xe, y0, y1, Z_BACK, Z_BACK + WALL_T);
      B.box('cream', 'wall', inner, inner + WALL_T, y0, y1, -9.6, Z_FRONT);
      B.box('cream', 'wall', inner, inner + WALL_T, y0, y1, Z_BACK, -11.4);
      B.box('cream', 'wall', inner, inner + WALL_T, y0 + 2.25, y1, -11.4, -9.6);
      B.box('door', 'deco', inner - 0.02, inner + WALL_T + 0.02, y0, y0 + 2.2, -9.6, -9.0); // 열린 철문
      B.box('roof', 'wall', st.xs - 0.2, st.xe + 0.2, y1, y1 + 0.2, Z_BACK - 0.2, Z_FRONT + 0.2);
      block(ROOF, outer, outer + WALL_T, Z_BACK, Z_FRONT);
      block(ROOF, inner, inner + WALL_T, -9.6, Z_FRONT);
      block(ROOF, inner, inner + WALL_T, Z_BACK, -11.4);
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(0.9, 0.3),
        new THREE.MeshBasicMaterial({ map: textTex(256, 86, '#2f7a52', '#ffffff', ['옥상'], 52), side: THREE.DoubleSide }),
      );
      sign.rotation.y = Math.PI / 2;
      sign.position.set(inner + WALL_T / 2 + (st.xs < 0 ? 0.13 : -0.13), y0 + 2.6, -10.5);
      scene.add(sign);
    }
    for (let k = 0; k < LEVELS; k++) {
      const L = levelY(k);
      for (let i = 0; i < STEPS; i++) {
        const topA = L + 0.15 * (i + 1);
        B.box('terrazzo', 'stair', st.xs + 0.2, st.mid - 0.1, Math.max(L, topA - 0.45), topA, Z_CORR + run * i, Z_CORR + run * (i + 1));
        const topB = L + 1.8 + 0.15 * (i + 1);
        B.box('terrazzo', 'stair', st.mid + 0.1, st.xe - 0.2, topB - 0.45, topB, FLIGHT_END - run * (i + 1), FLIGHT_END - run * i);
      }
      B.box('terrazzo', 'stair', st.xs + 0.2, st.xe - 0.2, L + 1.6, L + 1.8, FLIGHT_END, Z_FRONT - WALL_T); // 층계참
      // 난간
      const len = FLIGHT_END - Z_CORR;
      for (const [x, up] of [[st.mid - 0.15, true], [st.mid + 0.15, false]]) {
        const g = new THREE.BoxGeometry(0.05, 0.05, Math.hypot(len, 1.8));
        g.rotateX(Math.atan2(1.8, len) * (up ? -1 : 1));
        B.geo('metal', 'deco', g, x, L + (up ? 0 : 1.8) + 0.9 + 0.9, (Z_CORR + FLIGHT_END) / 2);
      }
    }
  }

  // ── 옥상 소품: 물탱크, 실외기, 벤치, 화분 ──
  {
    const y = levelY(ROOF);
    for (const [tx, tz] of [[-20, -6], [24, -6]]) {
      B.box('metal', 'deco', tx - 1.4, tx + 1.4, y, y + 0.6, tz - 1.4, tz + 1.4);
      B.geo('tank', 'deco', new THREE.CylinderGeometry(1.2, 1.2, 2.2, 20), tx, y + 1.7, tz);
      B.geo('tank', 'deco', new THREE.SphereGeometry(1.2, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), tx, y + 2.8, tz);
      block(ROOF, tx - 1.5, tx + 1.5, tz - 1.5, tz + 1.5);
    }
    for (let x = -36; x <= 36; x += 12) {
      if (Math.abs(x) < 6) continue;
      B.box('white', 'deco', x - 0.5, x + 0.5, y, y + 0.7, -11.6, -11.0);
      B.geo('metal', 'deco', new THREE.CylinderGeometry(0.22, 0.22, 0.04, 16), x, y + 0.45, -10.99);
      block(ROOF, x - 0.5, x + 0.5, -11.6, -11.0);
    }
    for (const bx of [-8, 8]) {
      B.box('chair', 'deco', bx - 1.1, bx + 1.1, y + 0.45, y + 0.5, -2.2, -1.6);
      B.box('metal', 'deco', bx - 1, bx - 0.9, y, y + 0.45, -2.15, -1.65);
      B.box('metal', 'deco', bx + 0.9, bx + 1, y, y + 0.45, -2.15, -1.65);
      block(ROOF, bx - 1.1, bx + 1.1, -2.2, -1.6);
    }
    for (let x = -36; x <= 36; x += 9) {
      B.box('band', 'deco', x - 0.4, x + 0.4, y, y + 0.5, -0.9, -0.35);
      B.geo('shrub', 'deco', new THREE.IcosahedronGeometry(0.4, 1), x, y + 0.8, -0.62);
      block(ROOF, x - 0.4, x + 0.4, -0.9, -0.35);
    }
  }

  // ── 교실 안 ──
  const taegukTex = canvasTex(
    120,
    80,
    (g) => {
      g.fillStyle = '#fff';
      g.fillRect(0, 0, 120, 80);
      g.fillStyle = '#2f5aa8';
      g.beginPath();
      g.arc(60, 40, 18, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#cd2e3a';
      g.beginPath();
      g.arc(60, 40, 18, Math.PI, 0);
      g.fill();
      g.beginPath();
      g.arc(51, 40, 9, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#2f5aa8';
      g.beginPath();
      g.arc(69, 40, 9, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#111';
      for (const [x, y] of [[20, 14], [100, 14], [20, 66], [100, 66]]) for (let i = 0; i < 3; i++) g.fillRect(x - 9, y - 6 + i * 5, 18, 3);
    },
    { repeat: false },
  );
  const taegukMat = new THREE.MeshBasicMaterial({ map: taegukTex });
  const signGeo = new THREE.PlaneGeometry(0.9, 0.32);

  // 벽시계 (교실 앞)
  const wallClockTex = canvasTex(
    128,
    128,
    (g) => {
      g.fillStyle = '#fbfaf4';
      g.strokeStyle = '#333';
      g.lineWidth = 8;
      g.beginPath();
      g.arc(64, 64, 58, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.fillStyle = '#333';
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        g.fillRect(64 + Math.sin(a) * 46 - 3, 64 - Math.cos(a) * 46 - 3, 6, 6);
      }
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(64, 64);
      g.lineTo(64, 30);
      g.moveTo(64, 64);
      g.lineTo(88, 72);
      g.stroke();
    },
    { repeat: false },
  );
  const wallClockMat = new THREE.MeshBasicMaterial({ map: wallClockTex, transparent: true });
  const wallClockGeo = new THREE.CircleGeometry(0.22, 24);
  const staffSeats = []; // NPC 직원이 앉는 자리 { room, x, z, seatY, ry, role }

  // 천장 선풍기 (그 시절 교실 필수품)
  const ceilingFan = (x, z, L) => {
    B.geo('white', 'deco', new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8), x, L + 3.25, z);
    B.geo('white', 'deco', new THREE.CylinderGeometry(0.12, 0.12, 0.1, 12), x, L + 3.05, z);
    for (let b = 0; b < 3; b++) {
      const blade = new THREE.BoxGeometry(0.75, 0.015, 0.14);
      blade.translate(0.45, 0, 0);
      blade.rotateY((b / 3) * Math.PI * 2 + 0.4);
      B.geo('white', 'deco', blade, x, L + 3.02, z);
    }
  };
  // 창가 노란 커튼 (위 주름 + 양쪽으로 묶인 커튼)
  // 창가 노란 커튼: 커튼봉 + 주름 장식 + 창틀마다 주름지게 묶인 커튼 (그 시절 교실)
  const pleats = (cx, w, y1, y2, n = 6) => {
    for (let i = 0; i < n; i++) {
      const a = cx - w / 2 + (w * i) / n;
      const deep = i % 2 === 0;
      B.box('curtain', 'deco', a, a + w / n + 0.01, y1, y2, deep ? -0.44 : -0.38, deep ? -0.3 : -0.26);
    }
  };
  const curtains = (xs, xe, L) => {
    B.box('metal', 'deco', xs + 0.15, xe - 0.15, L + 2.78, L + 2.81, -0.34, -0.31);
    // 위 주름 장식 (발란스)
    const vn = Math.round((xe - xs - 0.3) / 0.18);
    for (let i = 0; i < vn; i++) {
      const a = xs + 0.15 + i * ((xe - xs - 0.3) / vn);
      B.box('curtain', 'deco', a, a + (xe - xs - 0.3) / vn + 0.01, L + 2.62, L + 3.02, i % 2 ? -0.46 : -0.41, i % 2 ? -0.3 : -0.25);
    }
    // 창틀마다 양쪽으로 모아 묶은 커튼
    const panes = Math.max(1, Math.round((xe - xs) / 1.5));
    for (let i = 0; i <= panes; i++) {
      const cx = Math.min(xe - 0.42, Math.max(xs + 0.42, xs + ((xe - xs) * i) / panes));
      const w = i === 0 || i === panes ? 0.55 : 0.7;
      pleats(cx, w, L + 0.85, L + 2.62);
      B.box('yellow', 'deco', cx - w / 2 - 0.02, cx + w / 2 + 0.02, L + 1.45, L + 1.5, -0.46, -0.24); // 묶은 끈
    }
  };
  // 사무용 책상 + 브라운관 모니터 (모니터는 앉은 사람 쪽을 봄: facing = +1 이면 +x 쪽 사람)
  const officeDesk = (k, L, x1, x2, z1, z2, monitorX, monitorZ, facing) => {
    B.box('deskTop', 'deco', x1, x2, L + 0.72, L + 0.76, z1, z2);
    B.box('cabinet', 'deco', x1 + 0.05, x1 + 0.45, L, L + 0.72, z1 + 0.05, z2 - 0.05);
    B.box('metal', 'deco', x2 - 0.08, x2 - 0.03, L, L + 0.72, z1 + 0.05, z2 - 0.05);
    if (monitorX != null) {
      B.box('beige', 'deco', monitorX - 0.2, monitorX + 0.2, L + 0.76, L + 1.12, monitorZ - 0.2, monitorZ + 0.2);
      B.box('screen', 'deco', monitorX + facing * 0.2, monitorX + facing * 0.205, L + 0.82, L + 1.08, monitorZ - 0.16, monitorZ + 0.16);
      B.box('beige', 'deco', monitorX + facing * 0.32 - 0.12, monitorX + facing * 0.32 + 0.12, L + 0.76, L + 0.78, monitorZ - 0.22, monitorZ + 0.22);
      // 서류 더미
      B.box('white', 'deco', monitorX - facing * 0.3 - 0.12, monitorX - facing * 0.3 + 0.12, L + 0.76, L + 0.86, monitorZ + 0.25, monitorZ + 0.45);
    }
    block(k, x1, x2, z1, z2);
  };
  const officeChair = (x, z, L) => {
    B.geo('sofa', 'deco', new THREE.CylinderGeometry(0.22, 0.22, 0.08, 12), x, L + 0.46, z);
    B.geo('metal', 'deco', new THREE.CylinderGeometry(0.03, 0.03, 0.42, 8), x, L + 0.21, z);
  };
  const sofa = (k, L, x1, x2, z1, z2, backSide) => {
    B.box('sofa', 'deco', x1, x2, L, L + 0.45, z1, z2);
    const t = 0.18;
    if (backSide === 'z-') B.box('sofa', 'deco', x1, x2, L + 0.45, L + 0.85, z1, z1 + t);
    if (backSide === 'z+') B.box('sofa', 'deco', x1, x2, L + 0.45, L + 0.85, z2 - t, z2);
    if (backSide === 'x+') B.box('sofa', 'deco', x2 - t, x2, L + 0.45, L + 0.85, z1, z2);
    if (backSide === 'x-') B.box('sofa', 'deco', x1, x1 + t, L + 0.45, L + 0.85, z1, z2);
    block(k, x1, x2, z1, z2);
  };
  const plant = (x, z, L) => {
    B.geo('band', 'deco', new THREE.CylinderGeometry(0.2, 0.16, 0.4, 12), x, L + 0.2, z);
    B.geo('leaf1', 'deco', new THREE.IcosahedronGeometry(0.35, 1), x, L + 0.75, z);
  };

  for (const room of CLASSROOMS) {
    const L = levelY(room.level);
    const { xs, xe } = room;
    const k = room.level;
    const t = room.type;
    const teaching = TEACHING.has(t);

    // 형광등 + 창가 커튼 (모든 방)
    for (const lx of [xs + 2.5, xs + 6.5]) for (const lz of [-7, -4.5, -2]) B.box('lamp', 'deco', lx - 0.6, lx + 0.6, L + 3.32, L + 3.38, lz - 0.08, lz + 0.08);
    curtains(xs, xe, L);

    // 학생 의자 하나 (기본: 칠판 쪽을 바라봄)
    const studentChair = (chx, sz, ry = -Math.PI / 2) => {
      B.box('chair', 'chair', chx - 0.2, chx + 0.2, L + 0.42, L + 0.46, sz - 0.19, sz + 0.19);
      if (ry === -Math.PI / 2) B.box('chair', 'chair', chx + 0.17, chx + 0.21, L + 0.46, L + 0.86, sz - 0.19, sz + 0.19);
      if (ry === 0) B.box('chair', 'chair', chx - 0.19, chx + 0.19, L + 0.46, L + 0.86, sz - 0.21, sz - 0.17);
      if (ry === Math.PI) B.box('chair', 'chair', chx - 0.19, chx + 0.19, L + 0.46, L + 0.86, sz + 0.17, sz + 0.21);
      B.box('metal', 'deco', chx - 0.17, chx + 0.17, L, L + 0.42, sz - 0.17, sz - 0.15);
      B.box('metal', 'deco', chx - 0.17, chx + 0.17, L, L + 0.42, sz + 0.15, sz + 0.17);
      chairs.push({ x: chx, z: sz, seatY: L + 0.45, ry, level: k, room: room.id });
    };
    const stool = (sx, sz, ry) => {
      B.geo('chair', 'chair', new THREE.CylinderGeometry(0.17, 0.17, 0.05, 14), sx, L + 0.43, sz);
      for (const [a, b] of [[-0.11, -0.11], [0.11, -0.11], [-0.11, 0.11], [0.11, 0.11]]) B.box('chair', 'deco', sx + a - 0.02, sx + a + 0.02, L, L + 0.42, sz + b - 0.02, sz + b + 0.02);
      chairs.push({ x: sx, z: sz, seatY: L + 0.45, ry, level: k, room: room.id });
    };

    if (teaching) {
      // 칠판 (서쪽 벽)
      B.box('lectern', 'deco', xs + 0.1, xs + 0.16, L + 0.95, L + 2.45, -7.1, -1.9);
      B.box('frame', 'deco', xs + 0.1, xs + 0.3, L + 0.9, L + 0.95, -7.0, -2.0);
      const bc = document.createElement('canvas');
      bc.width = 640;
      bc.height = 256;
      const defaultText =
        {
          music: '♪ 음악실 ♪\n도 레 미 파 솔 라 시 도',
          art: '미술실\n오늘은 수채화 그리기',
          science: '과학실\n실험 안전 수칙을 지켜요\n보안경 · 장갑 착용!',
          computer: '컴퓨터실\n타자 연습 300타 도전!',
          av: '시청각실\n영화 감상 시간',
          homeec: '가정실\n바느질 기초 - 홈질, 박음질',
          council: '학생회실\n이번 주 안건: 체육대회',
        }[t] || `${room.name}\n오늘도 즐겁게!`;
      drawBoardCanvas(bc, defaultText);
      const bt = new THREE.CanvasTexture(bc);
      bt.colorSpace = THREE.SRGBColorSpace;
      const board = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.4), new THREE.MeshStandardMaterial({ map: bt, roughness: 0.95 }));
      board.rotation.y = Math.PI / 2;
      board.position.set(xs + 0.17, L + 1.7, -4.5);
      scene.add(board);
      boards.set(room.id, { canvas: bc, texture: bt, name: room.name, defaultText, text: defaultText });
      // 태극기 + 벽시계 + 스피커
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.4), taegukMat);
      flag.rotation.y = Math.PI / 2;
      flag.position.set(xs + 0.12, L + 2.85, -4.5);
      scene.add(flag);
      const clk = new THREE.Mesh(wallClockGeo, wallClockMat);
      clk.rotation.y = Math.PI / 2;
      clk.position.set(xs + 0.13, L + 2.85, -6.3);
      scene.add(clk);
      if (t !== 'music') {
        // 나무 TV 장 (칠판 왼편 창가 쪽, 양쪽 문이 열려 있음) + 브라운관 TV + 비디오
        B.box('lectern', 'deco', xs + 0.1, xs + 0.85, L, L + 0.75, -1.85, -0.55); // 아래 칸
        B.box('darkWood', 'deco', xs + 0.1, xs + 0.16, L + 0.75, L + 2.0, -1.85, -0.55); // 뒤판
        B.box('lectern', 'deco', xs + 0.1, xs + 0.85, L + 1.98, L + 2.05, -1.85, -0.55); // 윗판
        B.box('lectern', 'deco', xs + 0.1, xs + 0.85, L + 0.75, L + 2.0, -1.85, -1.8); // 옆판
        B.box('lectern', 'deco', xs + 0.1, xs + 0.85, L + 0.75, L + 2.0, -0.6, -0.55);
        B.box('tv', 'deco', xs + 0.25, xs + 0.8, L + 0.95, L + 1.6, -1.6, -0.8);
        B.box('screen', 'deco', xs + 0.8, xs + 0.81, L + 1.03, L + 1.53, -1.5, -0.9);
        B.box('tv', 'deco', xs + 0.3, xs + 0.8, L + 0.78, L + 0.9, -1.5, -0.9);
        B.box('lectern', 'deco', xs + 0.85, xs + 1.45, L + 0.05, L + 2.0, -1.88, -1.85);
        B.box('lectern', 'deco', xs + 0.85, xs + 1.45, L + 0.05, L + 2.0, -0.55, -0.52);
        B.box('metal', 'deco', xs + 1.38, xs + 1.42, L + 1.0, L + 1.1, -1.92, -1.88);
        B.box('metal', 'deco', xs + 1.38, xs + 1.42, L + 1.0, L + 1.1, -0.52, -0.48);
        block(k, xs + 0.1, xs + 1.45, -1.9, -0.5);
        // 스피커 (TV 장 위)
        B.box('lectern', 'deco', xs + 0.1, xs + 0.38, L + 2.65, L + 3.05, -1.4, -1.0);
        B.box('tv', 'deco', xs + 0.38, xs + 0.39, L + 2.7, L + 3.0, -1.35, -1.05);
        // 파란 선풍기 (TV 장 옆, 칠판 아래)
        B.geo('blue', 'deco', new THREE.CylinderGeometry(0.2, 0.22, 0.05, 16), xs + 0.6, L + 0.03, -2.35);
        B.geo('white', 'deco', new THREE.CylinderGeometry(0.025, 0.025, 1.0, 8), xs + 0.6, L + 0.55, -2.35);
        const fanHead = new THREE.CylinderGeometry(0.22, 0.22, 0.12, 18);
        fanHead.rotateZ(Math.PI / 2);
        B.geo('blue', 'deco', fanHead, xs + 0.66, L + 1.12, -2.35);
        block(k, xs + 0.35, xs + 0.85, -2.6, -2.1);
      }
      // 교탁: 나무 컴퓨터 교탁 (윗판 유리창 아래로 모니터가 보임) + 서랍장
      B.box('deskTop', 'deco', xs + 1.2, xs + 2.0, L + 0.74, L + 0.78, -5.1, -3.9);
      B.box('darkWood', 'deco', xs + 1.18, xs + 2.02, L + 0.73, L + 0.765, -5.12, -3.88);
      B.box('corrGlass', 'deco', xs + 1.35, xs + 1.85, L + 0.781, L + 0.785, -4.85, -4.3);
      B.box('screen', 'deco', xs + 1.38, xs + 1.82, L + 0.6, L + 0.62, -4.8, -4.35);
      B.box('deskTop', 'deco', xs + 1.95, xs + 2.0, L, L + 0.74, -5.05, -3.95);
      B.box('deskTop', 'deco', xs + 1.25, xs + 1.95, L, L + 0.74, -4.3, -3.95);
      for (let d = 0; d < 3; d++) B.box('metal', 'deco', xs + 1.2, xs + 1.22, L + 0.15 + d * 0.22, L + 0.2 + d * 0.22, -4.2, -4.05);
      B.box('white', 'deco', xs + 1.15, xs + 1.3, L + 0.6, L + 0.63, -4.95, -4.4);
      block(k, xs + 1.15, xs + 2.05, -5.15, -3.85);
      if (t !== 'av' && t !== 'council') {
        ceilingFan(xs + 3.6, -4.5, L);
        ceilingFan(xs + 6.8, -4.5, L);
      }
    }

    if (t === 'music') {
      // 업라이트 피아노 + 의자
      B.box('tv', 'deco', xs + 0.35, xs + 0.85, L, L + 1.3, -2.4, -0.6);
      B.box('white', 'deco', xs + 0.85, xs + 1.1, L + 0.72, L + 0.78, -2.3, -0.7);
      for (let i = 0; i < 10; i++) B.box('tv', 'deco', xs + 0.95, xs + 1.08, L + 0.78, L + 0.8, -2.2 + i * 0.15, -2.14 + i * 0.15);
      B.box('chair', 'deco', xs + 1.3, xs + 1.7, L + 0.45, L + 0.5, -1.9, -1.1);
      block(k, xs + 0.35, xs + 1.1, -2.4, -0.6);
    }

    if (t === 'class') {
      // 사물함 + 게시판 (뒤쪽 벽)
      B.box('locker', 'deco', xe - 0.6, xe - 0.1, L, L + 1.2, -8.6, -0.7);
      block(k, xe - 0.6, xe - 0.1, -8.6, -0.7);
      B.box('cork', 'deco', xe - 0.13, xe - 0.1, L + 1.5, L + 2.6, -7.5, -1.5);
      // 1인용 책상 5줄 × 5열 (나무 상판 + 쇠 다리)
      for (let r = 0; r < 5; r++) {
        const dx = xs + 2.9 + r * 1.12;
        for (const cz of [-7.6, -5.95, -4.3, -2.65, -1.05]) {
          B.box('deskTop', 'deco', dx - 0.23, dx + 0.23, L + 0.72, L + 0.76, cz - 0.32, cz + 0.32);
          B.box('metal', 'deco', dx - 0.2, dx + 0.2, L + 0.55, L + 0.58, cz - 0.28, cz + 0.28);
          for (const lz of [cz - 0.28, cz + 0.28]) B.box('metal', 'deco', dx - 0.2, dx + 0.2, L, L + 0.72, lz - 0.02, lz + 0.02);
          block(k, dx - 0.23, dx + 0.23, cz - 0.32, cz + 0.32);
          studentChair(dx + 0.5, cz);
        }
      }
    } else if (t === 'science') {
      // 과학실: 검은 상판 실험대 + 개수대·수도꼭지, 나무 의자, 지구본·비커 장
      for (const tx of [xs + 3.3, xs + 6.4]) {
        for (const tz of [-7.0, -4.5, -2.0]) {
          B.box('lectern', 'deco', tx - 0.55, tx + 0.55, L, L + 0.82, tz - 0.9, tz + 0.9);
          B.box('labTop', 'deco', tx - 0.6, tx + 0.6, L + 0.82, L + 0.88, tz - 0.95, tz + 0.95);
          B.box('pole', 'deco', tx - 0.25, tx + 0.25, L + 0.8, L + 0.885, tz - 0.85, tz - 0.45);
          B.geo('pole', 'deco', new THREE.CylinderGeometry(0.02, 0.02, 0.35, 8), tx, L + 1.05, tz - 0.38);
          const spout = new THREE.CylinderGeometry(0.015, 0.015, 0.18, 8);
          spout.rotateX(Math.PI / 2);
          B.geo('pole', 'deco', spout, tx, L + 1.22, tz - 0.47);
          block(k, tx - 0.6, tx + 0.6, tz - 0.95, tz + 0.95);
          for (const side of [-1, 1]) for (const dz of [-0.4, 0.4]) stool(tx + side * 0.9, tz + dz, side < 0 ? Math.PI / 2 : -Math.PI / 2);
        }
      }
      B.box('cabinet', 'deco', xe - 0.6, xe - 0.1, L, L + 2.0, -8.6, -0.7);
      B.box('glass', 'glass', xe - 0.62, xe - 0.6, L + 0.9, L + 1.9, -8.5, -0.8);
      block(k, xe - 0.6, xe - 0.1, -8.6, -0.7);
      for (let i = 0; i < 6; i++) {
        B.geo('blue', 'deco', new THREE.SphereGeometry(0.17, 14, 10), xe - 0.35, L + 2.2, -8.1 + i * 1.4);
        B.geo('pole', 'deco', new THREE.CylinderGeometry(0.03, 0.06, 0.06, 8), xe - 0.35, L + 2.02, -8.1 + i * 1.4);
        B.geo('glass', 'glass', new THREE.CylinderGeometry(0.06, 0.06, 0.18, 10), xe - 0.35, L + 1.0, -7.8 + i * 1.3);
      }
    } else if (t === 'music') {
      for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) studentChair(xs + 3.2 + r * 1.3, -7.4 + i * 1.25);
      for (const sz of [-6.2, -4.5, -2.8]) {
        B.box('metal', 'deco', xs + 2.38, xs + 2.42, L, L + 1.1, sz - 0.02, sz + 0.02);
        const plate = new THREE.BoxGeometry(0.02, 0.32, 0.45);
        plate.rotateZ(0.35);
        B.geo('metal', 'deco', plate, xs + 2.4, L + 1.2, sz);
        block(k, xs + 2.3, xs + 2.5, sz - 0.1, sz + 0.1);
      }
      ['베토벤', '모차르트', '바흐', '슈베르트'].forEach((nm, i) => {
        const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.95), new THREE.MeshBasicMaterial({ map: portraitTex(nm) }));
        pic.rotation.y = -Math.PI / 2;
        pic.position.set(xe - 0.14, L + 2.05, -7 + i * 1.6);
        scene.add(pic);
      });
    } else if (t === 'art' || t === 'homeec') {
      // 미술실·가정실: 모둠 책상 4개 + 둥근 의자
      for (const tx of [xs + 3.4, xs + 6.3]) {
        for (const tz of [-6.3, -2.9]) {
          B.box('deskTop', 'deco', tx - 0.75, tx + 0.75, L + 0.72, L + 0.78, tz - 0.6, tz + 0.6);
          for (const [lx, lz] of [[-0.65, -0.5], [0.65, -0.5], [-0.65, 0.5], [0.65, 0.5]]) B.box('metal', 'deco', tx + lx - 0.03, tx + lx + 0.03, L, L + 0.72, tz + lz - 0.03, tz + lz + 0.03);
          block(k, tx - 0.75, tx + 0.75, tz - 0.6, tz + 0.6);
          for (const side of [-1, 1]) for (const dz of [-0.3, 0.3]) stool(tx + side * 1.02, tz + dz, side < 0 ? Math.PI / 2 : -Math.PI / 2);
          if (t === 'art') {
            B.geo('blue', 'deco', new THREE.CylinderGeometry(0.07, 0.07, 0.14, 10), tx - 0.3, L + 0.85, tz);
            B.box('white', 'deco', tx + 0.1, tx + 0.45, L + 0.78, L + 0.8, tz - 0.15, tz + 0.15);
          } else {
            // 재봉틀 두 대
            for (const sz of [tz - 0.3, tz + 0.3]) {
              B.box('white', 'deco', tx - 0.18, tx + 0.18, L + 0.78, L + 0.88, sz - 0.12, sz + 0.12);
              B.box('white', 'deco', tx + 0.08, tx + 0.16, L + 0.88, L + 1.08, sz - 0.08, sz + 0.08);
              B.box('white', 'deco', tx - 0.16, tx + 0.16, L + 1.02, L + 1.1, sz - 0.07, sz + 0.07);
            }
          }
        }
      }
      if (t === 'art') {
        const canvasCols = ['#e8a33d', '#6aa9d8', '#d86a7a', '#7cbf6a'];
        for (let i = 0; i < 4; i++) {
          const ex = xs + 2.8 + i * 1.45;
          for (const dx of [-0.25, 0.25]) {
            const leg = new THREE.BoxGeometry(0.04, 1.7, 0.04);
            leg.rotateX(-0.12);
            B.geo('lectern', 'deco', leg, ex + dx, L + 0.85, -0.8);
          }
          const cv = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.75), new THREE.MeshStandardMaterial({ color: canvasCols[i], roughness: 0.9 }));
          cv.rotation.x = -0.12;
          cv.rotation.y = Math.PI;
          cv.position.set(ex, L + 1.2, -0.9);
          scene.add(cv);
          block(k, ex - 0.35, ex + 0.35, -1.05, -0.55);
        }
        B.box('white', 'deco', xs + 2.0, xs + 2.5, L, L + 1.0, -8.4, -7.9);
        B.geo('white', 'deco', new THREE.CylinderGeometry(0.12, 0.2, 0.3, 14), xs + 2.25, L + 1.15, -8.15);
        B.geo('white', 'deco', new THREE.SphereGeometry(0.2, 16, 12), xs + 2.25, L + 1.45, -8.15);
        block(k, xs + 2.0, xs + 2.5, -8.4, -7.9);
        B.box('locker', 'deco', xe - 0.6, xe - 0.1, L, L + 1.2, -8.6, -0.7);
        block(k, xe - 0.6, xe - 0.1, -8.6, -0.7);
        const paints = ['red', 'yellow', 'blue', 'leaf2', 'books', 'ginkgo'];
        for (let i = 0; i < 12; i++) B.geo(paints[i % paints.length], 'deco', new THREE.CylinderGeometry(0.08, 0.08, 0.16, 10), xe - 0.35, L + 1.28, -8.2 + i * 0.62);
      } else {
        // 가스레인지 조리대 (뒤쪽 벽)
        B.box('white', 'deco', xe - 0.7, xe - 0.1, L, L + 0.9, -8.6, -0.7);
        B.box('labTop', 'deco', xe - 0.72, xe - 0.1, L + 0.9, L + 0.94, -8.6, -0.7);
        for (let i = 0; i < 4; i++) for (const dz of [-0.25, 0.25]) B.geo('metal', 'deco', new THREE.TorusGeometry(0.09, 0.015, 6, 16).rotateX(Math.PI / 2), xe - 0.4, L + 0.95, -7.6 + i * 1.9 + dz);
        block(k, xe - 0.72, xe - 0.1, -8.6, -0.7);
      }
    } else if (t === 'computer') {
      // 컴퓨터실: 긴 책상 4줄, 베이지색 브라운관 모니터
      for (let r = 0; r < 4; r++) {
        const dx = xs + 2.8 + r * 1.5;
        for (const [z1, z2] of [[-8.4, -5.0], [-4.0, -0.7]]) {
          B.box('deskTop', 'deco', dx - 0.35, dx + 0.35, L + 0.72, L + 0.76, z1, z2);
          B.box('metal', 'deco', dx - 0.3, dx + 0.3, L, L + 0.72, z1 + 0.05, z1 + 0.1);
          B.box('metal', 'deco', dx - 0.3, dx + 0.3, L, L + 0.72, z2 - 0.1, z2 - 0.05);
          block(k, dx - 0.35, dx + 0.35, z1, z2);
          for (let m = 0; m < 3; m++) {
            const mz = z1 + 0.55 + m * ((z2 - z1 - 1.1) / 2);
            B.box('beige', 'deco', dx - 0.3, dx + 0.1, L + 0.76, L + 1.12, mz - 0.2, mz + 0.2);
            B.box('screen', 'deco', dx + 0.1, dx + 0.105, L + 0.82, L + 1.08, mz - 0.16, mz + 0.16);
            B.box('beige', 'deco', dx + 0.15, dx + 0.3, L + 0.76, L + 0.78, mz - 0.22, mz + 0.22);
            studentChair(dx + 0.65, mz);
          }
        }
      }
      B.box('cabinet', 'deco', xe - 0.6, xe - 0.1, L, L + 1.6, -8.6, -5);
      block(k, xe - 0.6, xe - 0.1, -8.6, -5);
    } else if (t === 'av') {
      // 시청각실: 내려오는 흰 스크린, 천장 프로젝터, 의자 줄
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.9), new THREE.MeshStandardMaterial({ color: '#f4f4ef', roughness: 0.9 }));
      scr.rotation.y = Math.PI / 2;
      scr.position.set(xs + 0.3, L + 1.85, -4.5);
      scene.add(scr);
      B.box('metal', 'deco', xs + 0.25, xs + 0.35, L + 2.8, L + 2.9, -6.8, -2.2);
      B.box('beige', 'deco', xs + 4.0, xs + 4.6, L + 2.9, L + 3.15, -4.8, -4.2);
      B.box('metal', 'deco', xs + 4.25, xs + 4.35, L + 3.15, L + 3.4, -4.55, -4.45);
      for (let r = 0; r < 5; r++) for (let i = 0; i < 6; i++) studentChair(xs + 2.9 + r * 1.2, -7.4 + i * 1.25);
    } else if (t === 'council') {
      // 학생회실: 긴 회의 탁자 + 의자, 트로피 장, 현수막
      B.box('darkWood', 'deco', xs + 2.6, xs + 7.2, L + 0.72, L + 0.78, -5.3, -3.7);
      for (const lx of [xs + 2.8, xs + 7.0]) B.box('metal', 'deco', lx - 0.05, lx + 0.05, L, L + 0.72, -5.1, -3.9);
      block(k, xs + 2.6, xs + 7.2, -5.3, -3.7);
      for (let i = 0; i < 5; i++) {
        const cx = xs + 3.0 + i * 0.95;
        studentChair(cx, -5.85, 0);
        studentChair(cx, -3.15, Math.PI);
      }
      B.box('shelf', 'deco', xe - 0.5, xe - 0.1, L, L + 1.8, -8.4, -6.0);
      for (let i = 0; i < 4; i++) B.geo('yellow', 'deco', new THREE.CylinderGeometry(0.06, 0.1, 0.3, 10), xe - 0.3, L + 1.95, -8.1 + i * 0.6);
      block(k, xe - 0.5, xe - 0.1, -8.4, -6.0);
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.6), new THREE.MeshBasicMaterial({ map: textTex(680, 120, '#c8473d', '#ffffff', ['온라인중학교 학생회'], 64) }));
      banner.rotation.y = -Math.PI / 2;
      banner.position.set(xe - 0.12, L + 2.6, -3.0);
      scene.add(banner);
    } else if (t === 'principal') {
      // 교장실: 큰 책상, 태극기·교기, 가죽 소파 세트, 책장
      B.box('darkWood', 'deco', xs + 1.2, xs + 2.1, L, L + 0.78, -5.8, -3.2);
      B.box('darkWood', 'deco', xs + 1.15, xs + 2.15, L + 0.78, L + 0.82, -5.85, -3.15);
      block(k, xs + 1.15, xs + 2.15, -5.85, -3.15);
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.12), new THREE.MeshBasicMaterial({ map: textTex(256, 60, '#2b2b2b', '#f2d590', ['교 장'], 40) }));
      plate.rotation.y = Math.PI / 2;
      plate.position.set(xs + 2.17, L + 0.9, -4.5);
      scene.add(plate);
      officeChair(xs + 0.75, -4.5, L);
      staffSeats.push({ room: room.id, x: xs + 0.75, z: -4.5, seatY: L + 0.5, ry: Math.PI / 2, role: 'principal' });
      B.geo('pole', 'deco', new THREE.CylinderGeometry(0.025, 0.025, 2.3, 8), xs + 0.5, L + 1.15, -7.0);
      const pflag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshStandardMaterial({ map: taegukTex, side: THREE.DoubleSide }));
      pflag.rotation.y = Math.PI / 2;
      pflag.position.set(xs + 0.5, L + 1.95, -6.5);
      scene.add(pflag);
      B.box('yellow', 'deco', xs + 5.0, xs + 7.0, L + 0.38, L + 0.42, -5.0, -4.0);
      B.box('metal', 'deco', xs + 5.1, xs + 6.9, L, L + 0.38, -4.6, -4.4);
      block(k, xs + 5.0, xs + 7.0, -5.0, -4.0);
      sofa(k, L, xs + 4.8, xs + 7.2, -6.4, -5.6, 'z-');
      sofa(k, L, xs + 4.8, xs + 7.2, -3.4, -2.6, 'z+');
      sofa(k, L, xs + 7.5, xs + 8.3, -5.1, -3.9, 'x+');
      B.box('shelf', 'deco', xs + 0.15, xs + 0.55, L, L + 2.1, -2.6, -0.8);
      for (let i = 0; i < 4; i++) B.box('books', 'deco', xs + 0.17, xs + 0.53, L + 0.2 + i * 0.5, L + 0.48 + i * 0.5, -2.5, -0.9);
      block(k, xs + 0.15, xs + 0.55, -2.6, -0.8);
      plant(xe - 0.6, -1.0, L);
      block(k, xe - 0.85, xe - 0.35, -1.25, -0.75);
    } else if (t === 'admin') {
      // 행정실: 민원 창구 카운터, 사무 책상 + 모니터, 서류 캐비닛, 금고
      B.box('lectern', 'deco', xs + 2.6, xs + 6.4, L, L + 1.05, -7.6, -7.2);
      B.box('white', 'deco', xs + 2.55, xs + 6.45, L + 1.05, L + 1.1, -7.65, -7.15);
      block(k, xs + 2.6, xs + 6.4, -7.6, -7.2);
      for (const [dx, dz] of [[xs + 3.2, -5.3], [xs + 5.8, -5.3], [xs + 3.2, -2.6], [xs + 5.8, -2.6]]) {
        officeDesk(k, L, dx - 0.7, dx + 0.7, dz - 0.4, dz + 0.4, dx, dz, 1);
        officeChair(dx, dz + 0.85, L);
      }
      staffSeats.push({ room: room.id, x: xs + 3.2, z: -4.45, seatY: L + 0.5, ry: Math.PI, role: 'admin' });
      B.box('cabinet', 'deco', xs + 0.15, xs + 0.65, L, L + 1.4, -6.5, -1.0);
      for (let i = 0; i < 4; i++) B.box('metal', 'deco', xs + 0.65, xs + 0.67, L + 0.2 + i * 0.32, L + 0.24 + i * 0.32, -6.3, -1.2);
      block(k, xs + 0.15, xs + 0.65, -6.5, -1.0);
      B.box('tv', 'deco', xe - 0.9, xe - 0.2, L, L + 0.9, -1.5, -0.8);
      block(k, xe - 0.9, xe - 0.2, -1.5, -0.8);
    } else if (t === 'staff') {
      // 교무실: 하늘색 칸막이 책상 섬, 나무 회전의자, 흰 서랍장, 초록 행사판 칠판, 스탠드 에어컨
      const woodChair = (x, z, back) => {
        B.geo('chairDark', 'deco', new THREE.CylinderGeometry(0.22, 0.22, 0.06, 12), x, L + 0.47, z);
        B.box('chairDark', 'deco', x - 0.2, x + 0.2, L + 0.55, L + 0.95, z + back * 0.2 - 0.03, z + back * 0.2 + 0.03);
        B.geo('metal', 'deco', new THREE.CylinderGeometry(0.03, 0.03, 0.44, 8), x, L + 0.22, z);
        B.geo('metal', 'deco', new THREE.CylinderGeometry(0.22, 0.22, 0.03, 10), x, L + 0.02, z);
      };
      for (const cx of [xs + 3.4, xs + 6.4]) {
        for (const [za, zb, mid] of [[-6.4, -5.6, -6.0], [-3.4, -2.6, -3.0]]) {
          for (const dz of [za, zb]) {
            B.box('deskTop', 'deco', cx - 0.9, cx + 0.9, L + 0.72, L + 0.76, dz - 0.4, dz + 0.4);
            B.box('white', 'deco', cx + 0.4, cx + 0.85, L, L + 0.72, dz - 0.35, dz + 0.35);
            for (let d = 0; d < 3; d++) B.box('metal', 'deco', cx + 0.5, cx + 0.75, L + 0.15 + d * 0.22, L + 0.17 + d * 0.22, dz + (dz < mid ? -0.36 : 0.35), dz + (dz < mid ? -0.35 : 0.36));
            const mz = dz + (dz < mid ? 0.15 : -0.15);
            B.box('beige', 'deco', cx - 0.5, cx - 0.1, L + 0.76, L + 1.12, mz - 0.2, mz + 0.2);
            B.box('screen', 'deco', cx - 0.48, cx - 0.12, L + 0.82, L + 1.08, mz + (dz < mid ? -0.205 : 0.2), mz + (dz < mid ? -0.2 : 0.205));
            B.box('white', 'deco', cx + 0.05, cx + 0.35, L + 0.76, L + 0.9, mz - 0.15, mz + 0.15);
            B.box('books', 'deco', cx + 0.1, cx + 0.3, L + 0.9, L + 1.0, mz - 0.1, mz + 0.1);
          }
          // 칸막이 (가운데 + 양 끝)
          B.box('partition', 'deco', cx - 0.95, cx + 0.95, L, L + 1.25, mid - 0.03, mid + 0.03);
          B.box('frame', 'deco', cx - 0.95, cx + 0.95, L + 1.25, L + 1.28, mid - 0.04, mid + 0.04);
          for (const ex of [cx - 0.95, cx + 0.95]) B.box('partition', 'deco', ex - 0.03, ex + 0.03, L, L + 1.25, za - 0.45, zb + 0.45);
          block(k, cx - 0.95, cx + 0.95, za - 0.45, zb + 0.45);
        }
        woodChair(cx, -7.2, -1);
        woodChair(cx, -4.8, 1);
        woodChair(cx, -4.2, -1);
        woodChair(cx, -1.8, 1);
      }
      staffSeats.push({ room: room.id, x: xs + 3.4, z: -7.2, seatY: L + 0.5, ry: 0, role: 'staff1' });
      staffSeats.push({ room: room.id, x: xs + 6.4, z: -1.8, seatY: L + 0.5, ry: Math.PI, role: 'staff2' });
      // 초록 월중 행사 칠판 (칸이 나뉜) + 태극기
      const sched = canvasTex(
        900,
        300,
        (g, w, h) => {
          g.fillStyle = '#2e5040';
          g.fillRect(0, 0, w, h);
          g.strokeStyle = 'rgba(255,255,255,0.7)';
          g.lineWidth = 2;
          for (let c = 0; c <= 7; c++) {
            g.beginPath();
            g.moveTo(40 + c * 115, 50);
            g.lineTo(40 + c * 115, h - 20);
            g.stroke();
          }
          for (let r = 0; r <= 5; r++) {
            g.beginPath();
            g.moveTo(40, 50 + r * 46);
            g.lineTo(w - 55, 50 + r * 46);
            g.stroke();
          }
          g.fillStyle = '#f4f1e6';
          g.font = `600 28px ${FONT}`;
          g.textAlign = 'center';
          g.fillText('월중 행사', w / 2, 34);
          g.font = `500 18px ${FONT}`;
          const items = ['체육대회', '중간고사', '학부모 상담', '현장학습', '교직원 회의', '방과후', '대청소'];
          items.forEach((it, i) => g.fillText(it, 40 + 57 + (i % 7) * 115, 50 + 30 + ((i * 3) % 5) * 46));
        },
        { repeat: false },
      );
      const wb = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.5), new THREE.MeshStandardMaterial({ map: sched, roughness: 0.95 }));
      wb.rotation.y = Math.PI / 2;
      wb.position.set(xs + 0.18, L + 1.75, -4.5);
      scene.add(wb);
      B.box('lectern', 'deco', xs + 0.1, xs + 0.16, L + 0.95, L + 2.55, -6.9, -2.1);
      const sflag = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.4), taegukMat);
      sflag.rotation.y = Math.PI / 2;
      sflag.position.set(xs + 0.13, L + 2.9, -6.0);
      scene.add(sflag);
      // 스탠드 에어컨 2대 (창가)
      for (const ax of [xs + 0.8, xs + 1.6]) {
        B.box('white', 'deco', ax - 0.3, ax + 0.3, L, L + 1.85, -1.3, -0.85);
        for (let v = 0; v < 6; v++) B.box('frame', 'deco', ax - 0.25, ax + 0.25, L + 1.35 + v * 0.07, L + 1.37 + v * 0.07, -0.86, -0.84);
      }
      block(k, xs + 0.5, xs + 1.9, -1.3, -0.85);
      // 정수기 + 화분
      B.box('white', 'deco', xe - 0.6, xe - 0.15, L, L + 1.2, -1.4, -0.9);
      B.geo('blue', 'deco', new THREE.CylinderGeometry(0.15, 0.15, 0.4, 12), xe - 0.38, L + 1.4, -1.15);
      block(k, xe - 0.6, xe - 0.15, -1.4, -0.9);
      plant(xe - 0.5, -8.3, L);
      block(k, xe - 0.75, xe - 0.25, -8.55, -8.05);
    } else if (t === 'nurse') {
      // 보건실: 침대 2개 + 커튼, 약장, 키·몸무게 재는 기계, 책상
      for (const bz of [-7.2, -4.9]) {
        B.box('metal', 'deco', xe - 2.2, xe - 0.2, L + 0.35, L + 0.45, bz - 0.5, bz + 0.5);
        B.box('sheet', 'deco', xe - 2.15, xe - 0.25, L + 0.45, L + 0.6, bz - 0.45, bz + 0.45);
        B.box('sheet', 'deco', xe - 0.6, xe - 0.3, L + 0.6, L + 0.72, bz - 0.3, bz + 0.3);
        B.box('paleGreen', 'deco', xe - 2.0, xe - 0.6, L + 0.6, L + 0.64, bz - 0.44, bz + 0.44);
        for (const lx of [xe - 2.15, xe - 0.25]) for (const lz of [bz - 0.45, bz + 0.45]) B.box('metal', 'deco', lx - 0.02, lx + 0.02, L, L + 0.45, lz - 0.02, lz + 0.02);
        B.box('paleGreen', 'deco', xe - 2.4, xe - 2.35, L + 0.3, L + 2.4, bz - 0.6, bz + 0.2);
        block(k, xe - 2.4, xe - 0.2, bz - 0.6, bz + 0.55);
      }
      B.box('metal', 'deco', xe - 2.4, xe - 0.2, L + 2.4, L + 2.43, -7.8, -4.3);
      B.box('sheet', 'deco', xs + 0.15, xs + 0.6, L, L + 1.9, -7.5, -5.5);
      B.box('red', 'deco', xs + 0.6, xs + 0.62, L + 1.5, L + 1.6, -6.6, -6.4);
      B.box('red', 'deco', xs + 0.6, xs + 0.62, L + 1.45, L + 1.65, -6.55, -6.45);
      block(k, xs + 0.15, xs + 0.6, -7.5, -5.5);
      B.box('white', 'deco', xs + 0.3, xs + 0.8, L, L + 0.1, -4.4, -3.9);
      B.geo('pole', 'deco', new THREE.CylinderGeometry(0.03, 0.03, 2.0, 8), xs + 0.4, L + 1.0, -4.15);
      block(k, xs + 0.3, xs + 0.8, -4.4, -3.9);
      officeDesk(k, L, xs + 1.0, xs + 2.0, -2.4, -1.2, xs + 1.5, -1.8, -1);
      officeChair(xs + 2.4, -1.8, L);
      staffSeats.push({ room: room.id, x: xs + 2.4, z: -1.8, seatY: L + 0.5, ry: -Math.PI / 2, role: 'nurse' });
    } else if (t === 'broadcast') {
      // 방송실: 방송 콘솔, 마이크, 모니터, 테이프 장, ON AIR 등
      B.box('darkWood', 'deco', xs + 0.15, xs + 1.0, L, L + 0.8, -7.0, -2.0);
      B.box('tv', 'deco', xs + 0.2, xs + 0.95, L + 0.8, L + 0.9, -6.4, -2.6);
      const knobs = ['red', 'yellow', 'blue', 'white'];
      for (let i = 0; i < 24; i++) B.box(knobs[i % 4], 'deco', xs + 0.35 + (i % 3) * 0.2, xs + 0.4 + (i % 3) * 0.2, L + 0.9, L + 0.93, -6.2 + Math.floor(i / 3) * 0.45, -6.15 + Math.floor(i / 3) * 0.45);
      for (const mz of [-5.0, -3.6]) {
        B.geo('metal', 'deco', new THREE.CylinderGeometry(0.015, 0.015, 0.4, 6), xs + 0.85, L + 1.1, mz);
        B.geo('tv', 'deco', new THREE.SphereGeometry(0.05, 10, 8), xs + 0.85, L + 1.32, mz);
      }
      for (let i = 0; i < 3; i++) {
        B.box('tv', 'deco', xs + 0.15, xs + 0.6, L + 1.3, L + 1.75, -6.4 + i * 1.6, -5.4 + i * 1.6);
        B.box('screen', 'deco', xs + 0.6, xs + 0.61, L + 1.35, L + 1.7, -6.3 + i * 1.6, -5.5 + i * 1.6);
      }
      block(k, xs + 0.15, xs + 1.0, -7.0, -2.0);
      studentChair(xs + 1.5, -4.3);
      B.box('shelf', 'deco', xe - 0.5, xe - 0.1, L, L + 2.0, -8.4, -1.0);
      const tapes = ['books', 'tv', 'red', 'blue'];
      for (let i = 0; i < 16; i++) B.box(tapes[i % 4], 'deco', xe - 0.48, xe - 0.12, L + 0.15 + (i % 4) * 0.48, L + 0.35 + (i % 4) * 0.48, -8.2 + Math.floor(i / 4) * 1.8, -7.0 + Math.floor(i / 4) * 1.8);
      block(k, xe - 0.5, xe - 0.1, -8.4, -1.0);
      const onair = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.3), new THREE.MeshBasicMaterial({ map: textTex(300, 100, '#c81e1e', '#ffffff', ['ON AIR'], 64) }));
      onair.rotation.y = -Math.PI / 2;
      onair.position.set(xe - 0.12, L + 2.6, -4.5);
      scene.add(onair);
    }

    // 반 팻말 (복도로 튀어나온)
    const sign = new THREE.Mesh(
      signGeo,
      new THREE.MeshBasicMaterial({ map: textTex(256, 92, '#f7f2e2', '#2b2b2b', [t === 'class' ? room.id.replace('-', ' - ') : room.name], 54, '#7a5532'), side: THREE.DoubleSide }),
    );
    sign.rotation.y = Math.PI / 2;
    sign.position.set(xs + 1.4, L + 2.7, Z_CORR - 0.55);
    scene.add(sign);
  }

  // 복도: 창가 아래 나무 사물함(칸칸이 신발장 느낌)
  for (let k = 0; k < LEVELS; k++) {
    const L = levelY(k);
    for (const s of SLOTS) {
      if (s.type !== 'class') continue;
      const x1 = s.xs + 2.2;
      const x2 = k === 1 && s.xs < BRIDGE.minX && s.xe > BRIDGE.maxX ? BRIDGE.minX - 0.6 : s.xe - 2.2;
      B.box('lectern', 'deco', x1, x2, L, L + 0.85, Z_BACK + 0.2, Z_BACK + 0.6);
      const n = Math.round((x2 - x1) / 0.5);
      for (let i = 1; i < n; i++) B.box('darkWood', 'deco', x1 + i * 0.5 - 0.02, x1 + i * 0.5 + 0.02, L + 0.05, L + 0.8, Z_BACK + 0.6, Z_BACK + 0.62);
      B.box('darkWood', 'deco', x1, x2, L + 0.42, L + 0.45, Z_BACK + 0.6, Z_BACK + 0.62);
      block(k, x1, x2, Z_BACK + 0.2, Z_BACK + 0.6);
    }
  }

  // 가운데 칸: 1층 중앙현관(신발장), 2층 상담실, 3층 도서실
  const hall = SLOTS.find((s) => s.type === 'hall');
  {
    const L = levelY(0);
    for (const [x1, x2] of [[hall.xs + 0.1, hall.xs + 0.6], [hall.xe - 0.6, hall.xe - 0.1]]) {
      B.box('locker', 'deco', x1, x2, L, L + 1.8, -8, -1);
      block(0, x1, x2, -8, -1);
    }
    B.box('concrete', 'wall', -3.2, 3.2, 3.25, 3.45, 0, 3.2);
    for (const px of [-2.9, 2.9]) {
      B.geo('concrete', 'deco', new THREE.CylinderGeometry(0.15, 0.15, 3.25, 10), px, 1.62, 2.9);
      block(0, px - 0.2, px + 0.2, 2.7, 3.1);
    }
  }
  for (let k = 1; k < LEVELS; k++) {
    const L = levelY(k);
    curtains(hall.xs, hall.xe, L);
    if (k === 1) {
      // 상담실: 소파 두 개 마주 보고, 낮은 탁자, 화분, 책장
      sofa(k, L, -2.0, 2.0, -6.4, -5.6, 'z-');
      sofa(k, L, -2.0, 2.0, -3.4, -2.6, 'z+');
      B.box('white', 'deco', -1.2, 1.2, L + 0.38, L + 0.42, -5.0, -4.0);
      B.box('metal', 'deco', -1.0, 1.0, L, L + 0.38, -4.55, -4.45);
      block(k, -1.2, 1.2, -5.0, -4.0);
      plant(hall.xs + 0.6, -1.0, L);
      plant(hall.xe - 0.6, -1.0, L);
      block(k, hall.xs + 0.35, hall.xs + 0.85, -1.25, -0.75);
      block(k, hall.xe - 0.85, hall.xe - 0.35, -1.25, -0.75);
      B.box('shelf', 'deco', hall.xs + 0.1, hall.xs + 0.5, L, L + 2.0, -8.4, -6.0);
      block(k, hall.xs + 0.1, hall.xs + 0.5, -8.4, -6.0);
    } else {
      for (const x1 of [hall.xs + 0.1, hall.xe - 0.5]) {
        B.box('shelf', 'deco', x1, x1 + 0.4, L, L + 2.2, -8.6, -0.6);
        for (let i = 0; i < 4; i++) B.box('books', 'deco', x1 + 0.02, x1 + 0.38, L + 0.2 + i * 0.52, L + 0.5 + i * 0.52, -8.5, -0.7);
        block(k, x1, x1 + 0.4, -8.6, -0.6);
      }
      for (const z of [-6.5, -2.5]) {
        B.box('deskTop', 'deco', -1.8, 1.8, L + 0.72, L + 0.76, z - 0.8, z + 0.8);
        B.box('metal', 'deco', -1.7, 1.7, L, L + 0.72, z - 0.05, z + 0.05);
        block(k, -1.8, 1.8, z - 0.8, z + 0.8);
      }
    }
    const sign = new THREE.Mesh(
      signGeo,
      new THREE.MeshBasicMaterial({ map: textTex(256, 92, '#f7f2e2', '#2b2b2b', [HALL_NAMES[k]], 50, '#7a5532'), side: THREE.DoubleSide }),
    );
    sign.position.set(0, L + 2.7, Z_CORR - 0.12);
    scene.add(sign);
    for (const lx of [-2.5, 2.5]) for (const lz of [-7, -2]) B.box('lamp', 'deco', lx - 0.6, lx + 0.6, L + 3.32, L + 3.38, lz - 0.08, lz + 0.08);
  }
  // 복도 형광등
  for (let k = 0; k < LEVELS; k++) for (let x = -BX + 4; x < BX - 3; x += 6) B.box('lamp', 'deco', x - 0.6, x + 0.6, levelY(k) + 3.32, levelY(k) + 3.38, (Z_BACK + Z_CORR) / 2 - 0.08, (Z_BACK + Z_CORR) / 2 + 0.08);

  // 가운데 시계탑 + 학교 이름
  const towerTop = levelY(LEVELS) + 3.2;
  B.box('cream', 'wall', -4.6, 4.6, 3.6, towerTop, Z_FRONT, Z_FRONT + 0.5);
  B.box('band', 'wall', -4.8, 4.8, towerTop, towerTop + 0.3, Z_FRONT - 0.2, Z_FRONT + 0.7);
  const nameSign = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 1.5), new THREE.MeshBasicMaterial({ map: textTex(1024, 200, '#efe4c8', '#5a3a26', ['온라인중학교'], 150) }));
  nameSign.position.set(0, levelY(1) + 1.8, Z_FRONT + 0.52);
  scene.add(nameSign);
  const clockC = document.createElement('canvas');
  clockC.width = clockC.height = 256;
  const clockT = new THREE.CanvasTexture(clockC);
  clockT.colorSpace = THREE.SRGBColorSpace;
  const drawClock = () => {
    const g = clockC.getContext('2d');
    g.clearRect(0, 0, 256, 256);
    g.fillStyle = '#fbfaf4';
    g.strokeStyle = '#3a3a3a';
    g.lineWidth = 12;
    g.beginPath();
    g.arc(128, 128, 118, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = '#333';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.fillRect(128 + Math.sin(a) * 96 - 4, 128 - Math.cos(a) * 96 - 4, 8, 8);
    }
    const d = new Date();
    const hand = (a, len, w) => {
      g.lineWidth = w;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(128, 128);
      g.lineTo(128 + Math.sin(a) * len, 128 - Math.cos(a) * len);
      g.stroke();
    };
    hand((((d.getHours() % 12) + d.getMinutes() / 60) / 12) * Math.PI * 2, 55, 10);
    hand((d.getMinutes() / 60) * Math.PI * 2, 85, 6);
    clockT.needsUpdate = true;
  };
  drawClock();
  setInterval(drawClock, 30000);
  const clockMesh = new THREE.Mesh(new THREE.CircleGeometry(1.3, 40), new THREE.MeshBasicMaterial({ map: clockT, transparent: true }));
  clockMesh.position.set(0, levelY(LEVELS) + 1.4, Z_FRONT + 0.52);
  scene.add(clockMesh);

  // ── 운동장 ──
  // 화단 (건물 앞)
  for (const [x1, x2] of [[-BX + 2, -6], [6, BX - 2]]) {
    B.box('band', 'deco', x1, x2, 0, 0.35, 1, 2.6);
    for (let x = x1 + 1; x < x2; x += 2.2) B.geo('shrub', 'deco', new THREE.IcosahedronGeometry(0.6, 1), x, 0.7, 1.8);
    block(0, x1, x2, 1, 2.6);
  }
  // 조회대
  B.box('concrete', 'wall', -4, 4, 0, 1.2, 12, 15);
  for (let i = 0; i < 3; i++) B.box('concrete', 'deco', -1.5, 1.5, 0, 0.4 * (i + 1), 15 + (2 - i) * 0.4, 15 + (3 - i) * 0.4);
  B.box('metal', 'deco', -4, 4, 2.0, 2.05, 12.05, 12.1);
  block(0, -4, 4, 12, 16.2);
  // 국기 게양대 3개
  [-8, -9.6, -11.2].forEach((x, i) => {
    B.geo('pole', 'deco', new THREE.CylinderGeometry(0.05, 0.08, i === 1 ? 9 : 8, 8), x, i === 1 ? 4.5 : 4, 13.5);
    block(0, x - 0.2, x + 0.2, 13.3, 13.7);
  });
  const flagBig = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1), new THREE.MeshStandardMaterial({ map: taegukTex, side: THREE.DoubleSide }));
  flagBig.position.set(-8.8, 8.3, 13.5);
  scene.add(flagBig);
  animated.push((t) => {
    flagBig.rotation.y = Math.sin(t * 1.3) * 0.15;
  });

  // 축구 골대
  for (const gx of [-43, 43]) {
    const back = gx > 0 ? 1.5 : -1.5;
    for (const pz of [37.35, 44.65]) {
      B.geo('white', 'deco', new THREE.CylinderGeometry(0.06, 0.06, 2.44, 8), gx, 1.22, pz);
      B.box('white', 'deco', gx, gx + back, 0, 0.06, pz - 0.03, pz + 0.03);
    }
    B.box('white', 'deco', gx - 0.06, gx + 0.06, 2.4, 2.5, 37.35, 44.65);
    const net = new THREE.Mesh(
      new THREE.PlaneGeometry(7.3, 2.44),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }),
    );
    net.rotation.y = Math.PI / 2;
    net.position.set(gx + back, 1.22, 41);
    scene.add(net);
    block(0, Math.min(gx, gx + back) - 0.1, Math.max(gx, gx + back) + 0.1, 37.2, 44.8);
  }
  // 스탠드 (서쪽 계단식 관람석)
  for (let i = 0; i < 4; i++) B.box('concrete', 'wall', -50 - 2 * (i + 1), -50 - 2 * i, 0, 0.45 * (i + 1), 18, 64);
  block(0, -60, -50, 18, 64);
  // 철봉 (동쪽)
  [1.2, 1.5, 1.8].forEach((h, i) => {
    const z = 21 + i * 2.2;
    for (const pz of [z - 0.9, z + 0.9]) B.geo('metal', 'deco', new THREE.CylinderGeometry(0.05, 0.05, h, 8), 53, h / 2, pz);
    const bar = new THREE.CylinderGeometry(0.025, 0.025, 1.8, 8);
    bar.rotateX(Math.PI / 2);
    B.geo('pole', 'deco', bar, 53, h, z);
    block(0, 52.8, 53.2, z - 1, z + 1);
  });
  // 정글짐
  {
    const gx = 54;
    const gz = 32;
    const cols = ['red', 'yellow', 'blue'];
    for (let a = 0; a <= 3; a++) {
      for (let b = 0; b <= 3; b++) {
        B.geo(cols[(a + b) % 3], 'deco', new THREE.CylinderGeometry(0.04, 0.04, 3, 6), gx + a, 1.5, gz + b);
        const hx = new THREE.CylinderGeometry(0.04, 0.04, 3, 6);
        hx.rotateZ(Math.PI / 2);
        B.geo(cols[(a + b + 1) % 3], 'deco', hx, gx + 1.5, a, gz + b);
        const hz = new THREE.CylinderGeometry(0.04, 0.04, 3, 6);
        hz.rotateX(Math.PI / 2);
        B.geo(cols[(a + b + 2) % 3], 'deco', hz, gx + b, a, gz + 1.5);
      }
    }
    block(0, gx - 0.2, gx + 3.2, gz - 0.2, gz + 3.2);
  }
  // 그네
  {
    const gx = 54;
    const gz = 44;
    for (const pz of [gz - 2, gz + 2]) {
      for (const dx of [-0.7, 0.7]) {
        const p = new THREE.CylinderGeometry(0.06, 0.06, 2.7, 8);
        p.rotateZ(dx > 0 ? -0.25 : 0.25);
        B.geo('red', 'deco', p, gx + dx * 0.5, 1.3, pz);
      }
    }
    const top = new THREE.CylinderGeometry(0.06, 0.06, 4.2, 8);
    top.rotateX(Math.PI / 2);
    B.geo('red', 'deco', top, gx, 2.6, gz);
    for (const sz of [gz - 0.9, gz + 0.9]) {
      B.box('metal', 'deco', gx - 0.01, gx + 0.01, 0.5, 2.6, sz - 0.25, sz - 0.23);
      B.box('metal', 'deco', gx - 0.01, gx + 0.01, 0.5, 2.6, sz + 0.23, sz + 0.25);
      B.box('yellow', 'deco', gx - 0.2, gx + 0.2, 0.46, 0.52, sz - 0.27, sz + 0.27);
    }
    block(0, gx - 1.2, gx + 1.2, gz - 2.2, gz + 2.2);
  }
  // 벤치
  for (const [bx, bz] of [[-20, 9], [20, 9], [-32, 9], [32, 9]]) {
    B.box('chair', 'deco', bx - 1.1, bx + 1.1, 0.45, 0.5, bz - 0.3, bz + 0.3);
    B.box('metal', 'deco', bx - 1, bx - 0.9, 0, 0.45, bz - 0.25, bz + 0.25);
    B.box('metal', 'deco', bx + 0.9, bx + 1, 0, 0.45, bz - 0.25, bz + 0.25);
    block(0, bx - 1.1, bx + 1.1, bz - 0.3, bz + 0.3);
  }
  // ── 매점 (운동장 옆 작은 가건물, 파란 지붕) ──
  {
    const S = STORE;
    const H = 3.6;
    B.box('cream', 'wall', S.minX, S.maxX, 0, H, S.minZ, S.minZ + 0.2);
    B.box('cream', 'wall', S.minX, S.minX + 0.2, 0, H, S.minZ, S.maxZ);
    B.box('cream', 'wall', S.maxX - 0.2, S.maxX, 0, H, S.minZ, S.maxZ);
    block(0, S.minX, S.maxX, S.minZ, S.minZ + 0.2);
    block(0, S.minX, S.minX + 0.2, S.minZ, S.maxZ);
    block(0, S.maxX - 0.2, S.maxX, S.minZ, S.maxZ);
    // 앞벽 (가운데 문, 양옆 큰 유리창)
    const z1 = S.maxZ - 0.2;
    for (const [x1, x2] of [[S.minX, S.doorX1], [S.doorX2, S.maxX]]) {
      B.box('band', 'wall', x1, x2, 0, 0.9, z1, S.maxZ);
      B.box('glass', 'glass', x1, x2, 0.9, 2.3, z1 + 0.05, S.maxZ - 0.05);
      B.box('frame', 'deco', x1, x2, 2.3, 2.36, z1 - 0.02, S.maxZ + 0.02);
      B.box('cream', 'wall', x1, x2, 2.3, H, z1, S.maxZ);
      block(0, x1, x2, z1, S.maxZ);
    }
    B.box('cream', 'wall', S.doorX1, S.doorX2, 2.3, H, z1, S.maxZ);
    // 파란 지붕 (처마)
    B.box('blueRoof', 'wall', S.minX - 0.5, S.maxX + 0.5, H, H + 0.2, S.minZ - 0.4, S.maxZ + 1.2);
    // 바닥
    B.box('terrazzo', 'deco', S.minX + 0.2, S.maxX - 0.2, 0, 0.03, S.minZ + 0.2, z1);
    // 계산대 + 금전등록기
    B.box('lectern', 'deco', S.minX + 1.5, S.maxX - 1.5, 0, 1.0, 5.6, 6.2);
    B.box('white', 'deco', S.minX + 1.4, S.maxX - 1.4, 1.0, 1.05, 5.5, 6.3);
    B.box('tv', 'deco', 40.3, 40.9, 1.05, 1.35, 5.6, 6.0);
    block(0, S.minX, S.maxX, S.minZ, 6.2);
    // 뒤쪽 진열장 (계산대 너머)
    B.box('shelf', 'deco', S.minX + 0.5, S.maxX - 0.5, 0, 2.2, S.minZ + 0.2, S.minZ + 0.6);
    // 왼쪽 과자 진열대
    B.box('shelf', 'deco', S.minX + 0.2, S.minX + 0.7, 0, 2.0, 6.7, 11.5);
    block(0, S.minX + 0.2, S.minX + 0.7, 6.7, 11.5);
    const snackCols = ['red', 'yellow', 'blue', 'leaf2', 'ginkgo', 'books'];
    let ci = 0;
    for (let row = 0; row < 4; row++) {
      for (let z = 6.85; z < 11.2; z += 0.42) {
        const h = 0.22 + ((ci * 7) % 5) * 0.03;
        const y = 0.15 + row * 0.48;
        B.box(snackCols[ci++ % snackCols.length], 'deco', S.minX + 0.25, S.minX + 0.62, y, y + h, z, z + 0.32);
        // 뒤쪽 진열장에도
        const bx = S.minX + 0.8 + ((z - 6.85) / 0.42) * 0.85;
        B.box(snackCols[(ci + 2) % snackCols.length], 'deco', bx, bx + 0.9, y, y + h, S.minZ + 0.25, S.minZ + 0.55);
      }
    }
    // 아이스크림 냉동고
    B.box('white', 'deco', S.maxX - 1.6, S.maxX - 0.25, 0, 0.9, 7, 9.6);
    B.box('glass', 'glass', S.maxX - 1.55, S.maxX - 0.3, 0.9, 0.95, 7.05, 9.55);
    block(0, S.maxX - 1.6, S.maxX - 0.25, 7, 9.6);
    const storeSign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 0.6),
      new THREE.MeshBasicMaterial({ map: textTex(400, 100, '#2f5aa8', '#ffffff', ['매  점'], 64) }),
    );
    storeSign.position.set((S.doorX1 + S.doorX2) / 2, 2.95, S.maxZ + 0.03);
    scene.add(storeSign);
  }

  // ── 아치 지붕 도구 (연결 통로·스탠드 공용): 반투명 파랑/흰 줄무늬 지붕 + 금속 뼈대 + 나무 감은 기둥 ──
  const paveTex = canvasTex(128, 128, (g) => {
    const cols = ['#a85b58', '#5e9a87'];
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      g.fillStyle = cols[(Math.floor(x / 2) + Math.floor(y / 2)) % 2];
      g.fillRect(x * 32, y * 32, 32, 32);
      g.strokeStyle = 'rgba(0,0,0,0.18)';
      g.lineWidth = 2;
      g.strokeRect(x * 32 + 1, y * 32 + 1, 30, 30);
    }
  });
  const roofTex = canvasTex(256, 32, (g) => {
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? '#e9f1f4' : '#3f8fc0';
      g.fillRect(i * 32, 0, 32, 32);
    }
  });
  const roofMat = new THREE.MeshStandardMaterial({ map: roofTex, side: THREE.DoubleSide, transparent: true, opacity: 0.88, roughness: 0.4 });
  const pave = (x1, x2, z1, z2, tex = paveTex, y = 0.025, tile = 1.2) => {
    const t = tex.clone();
    t.needsUpdate = true;
    t.repeat.set((x2 - x1) / tile, (z2 - z1) / tile);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x2 - x1, z2 - z1), new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }));
    m.rotation.x = -Math.PI / 2;
    m.position.set((x1 + x2) / 2, y, (z1 + z2) / 2);
    m.receiveShadow = true;
    scene.add(m);
    walkables.push(m);
  };
  const archRoof = (axis, a1, a2, c, { R = 1.9, post = 2.3, flat = 0.55, rib = 2.5 } = {}) => {
    const len = a2 - a1;
    const g = new THREE.CylinderGeometry(R, R, len, 20, 1, true, axis === 'z' ? Math.PI / 2 : Math.PI, Math.PI);
    if (axis === 'z') g.rotateX(Math.PI / 2);
    else g.rotateZ(-Math.PI / 2);
    g.scale(1, flat, 1);
    const m = new THREE.Mesh(g, roofMat);
    if (axis === 'z') m.position.set(c, post, (a1 + a2) / 2);
    else m.position.set((a1 + a2) / 2, post, c);
    m.castShadow = true;
    scene.add(m);
    for (let a = a1; a <= a2 + 0.01; a += rib) {
      const r = new THREE.TorusGeometry(R, 0.035, 6, 18, Math.PI);
      r.scale(1, flat, 1);
      if (axis === 'x') r.rotateY(Math.PI / 2);
      if (axis === 'z') B.geo('metal', 'deco', r, c, post, a);
      else B.geo('metal', 'deco', r, a, post, c);
    }
  };
  const woodPost = (x, z, h = 2.3) => {
    B.geo('pillarWood', 'deco', new THREE.CylinderGeometry(0.09, 0.09, h, 10), x, h / 2, z);
    B.geo('steel', 'deco', new THREE.CylinderGeometry(0.13, 0.15, 0.28, 10), x, 0.14, z);
    block(0, x - 0.18, x + 0.18, z - 0.18, z + 0.18);
  };
  const tactile = (x1, x2, z1, z2) => B.box('yellow', 'deco', x1, x2, 0.025, 0.035, z1, z2);

  // ── 강당동 (1층 급식실 · 2층 강당) ──
  const menuSign = { tex: null };
  const cookSpots = [];
  {
    const A = ANNEX;
    const T = 0.25;
    const L1 = levelY(1);
    const TOP = L1 + 6.2;
    // 벽 한 줄: 아래 벽돌띠 + 창 + 위 크림색, doors 는 [x1,x2] (가로벽) 또는 [z1,z2] (세로벽)
    const run = (k, y0, y1, x1, x2, z1, z2, doors, wLo, wHi) => {
      const alongX = x2 - x1 > z2 - z1;
      const a1 = alongX ? x1 : z1;
      const a2 = alongX ? x2 : z2;
      const piece = (p1, p2) => {
        const bx = alongX ? [p1, p2, z1, z2] : [x1, x2, p1, p2];
        B.box('band', 'wall', bx[0], bx[1], y0, y0 + wLo, bx[2], bx[3]);
        B.box('glass', 'glass', bx[0], bx[1], y0 + wLo, y0 + wHi, bx[2], bx[3]);
        B.box('cream', 'wall', bx[0], bx[1], y0 + wHi, y1, bx[2], bx[3]);
        const n = Math.max(1, Math.round((p2 - p1) / 1.5));
        for (let q = 1; q < n; q++) {
          const m = p1 + ((p2 - p1) * q) / n;
          if (alongX) B.box('frame', 'deco', m - 0.04, m + 0.04, y0 + wLo, y0 + wHi, z1 - 0.02, z2 + 0.02);
          else B.box('frame', 'deco', x1 - 0.02, x2 + 0.02, y0 + wLo, y0 + wHi, m - 0.04, m + 0.04);
        }
        block(k, bx[0], bx[1], bx[2], bx[3]);
      };
      let cur = a1;
      for (const [d1, d2] of doors) {
        if (d1 > cur) piece(cur, d1);
        const bx = alongX ? [d1, d2, z1, z2] : [x1, x2, d1, d2];
        B.box('cream', 'wall', bx[0], bx[1], y0 + 2.5, y1, bx[2], bx[3]);
        B.box('steel', 'deco', bx[0] - (alongX ? 0.06 : 0.02), bx[1] + (alongX ? 0.06 : 0.02), y0 + 2.4, y0 + 2.5, bx[2] - 0.03, bx[3] + 0.03);
        cur = d2;
      }
      if (a2 > cur) piece(cur, a2);
    };
    // 바닥: 1층 인조석, 2층(강당) 나무 바닥판, 지붕
    B.box('terrazzo', 'floor', A.minX, A.maxX, 0, levelY(0), A.minZ, A.maxZ);
    B.box('floorWood', 'floor', A.minX, A.maxX, L1 - 0.2, L1, A.minZ, A.maxZ);
    // 1층 벽
    run(0, 0, L1 - 0.2, A.minX, A.maxX, A.maxZ - T, A.maxZ, [CAFE_DOOR], 1.0, 2.6);
    run(0, 0, L1 - 0.2, A.minX, A.maxX, A.minZ, A.minZ + T, [], 1.6, 2.6);
    run(0, 0, L1 - 0.2, A.minX, A.minX + T, A.minZ, A.maxZ, [], 1.0, 2.6);
    run(0, 0, L1 - 0.2, A.maxX - T, A.maxX, A.minZ, A.maxZ, [], 1.0, 2.6);
    // 2층 강당 벽 (높은 창)
    run(1, L1 - 0.2, TOP, A.minX, A.maxX, A.maxZ - T, A.maxZ, [[BRIDGE.minX, BRIDGE.maxX]], 4.2, 5.8);
    run(1, L1 - 0.2, TOP, A.minX, A.maxX, A.minZ, A.minZ + T, [], 4.2, 5.8);
    run(1, L1 - 0.2, TOP, A.minX, A.minX + T, A.minZ, A.maxZ, [], 4.2, 5.8);
    run(1, L1 - 0.2, TOP, A.maxX - T, A.maxX, A.minZ, A.maxZ, [], 4.2, 5.8);
    // 층 사이 벽돌색 띠 + 둥근 파란 지붕
    B.box('band', 'wall', A.minX - 0.05, A.maxX + 0.05, L1 - 0.4, L1, A.maxZ - 0.05, A.maxZ + 0.05);
    B.box('blueRoof', 'wall', A.minX - 0.4, A.maxX + 0.4, TOP, TOP + 0.25, A.minZ - 0.4, A.maxZ + 0.4);
    {
      const arch = new THREE.CylinderGeometry(11, 11, A.maxX - A.minX + 0.8, 32, 1, false, Math.PI / 2 - 0.9, 1.8);
      arch.rotateZ(Math.PI / 2);
      arch.scale(1, 0.22, 1);
      B.geo('blueRoof', 'wall', arch, (A.minX + A.maxX) / 2, TOP + 0.25 - 11 * Math.cos(0.9) * 0.22, (A.minZ + A.maxZ) / 2);
    }
    const sign = (text, x, y, z, w = 3.4) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: textTex(512, 128, '#f2ead6', '#3b2617', [text], 70, '#7a5532') }));
      m.position.set(x, y, z);
      scene.add(m);
    };
    sign('강당 · 급식실', (A.minX + A.maxX) / 2, L1 + 1.5, A.maxZ + 0.03, 4.4);
    sign('급 식 실', (CAFE_DOOR[0] + CAFE_DOOR[1]) / 2, 2.9, A.maxZ + 0.03, 2.4);

    // ── 1층 급식실 ──
    const kz = A.minZ + T; // 주방 벽
    const lineZ = -33.6; // 배식대 앞면
    B.box('tile', 'deco', A.minX + 2, A.maxX - 2, 0, 2.4, kz, kz + 0.02);
    B.box('steel', 'deco', A.maxX - 2.4, A.maxX - 1.2, 0, 2.1, kz + 0.05, kz + 0.85);
    B.box('steel', 'deco', A.minX + 3, A.maxX - 3, 0, 0.95, lineZ - 0.8, lineZ);
    const foods = ['white', 'books', 'red', 'leaf2', 'yellow', 'white', 'books', 'red'];
    for (let i = 0; i < 8; i++) {
      const fx = A.minX + 4.5 + i * 2.6;
      B.box('steel', 'deco', fx - 0.55, fx + 0.55, 0.95, 1.08, lineZ - 0.7, lineZ - 0.1);
      B.box(foods[i], 'deco', fx - 0.5, fx + 0.5, 1.08, 1.1, lineZ - 0.65, lineZ - 0.15);
      B.geo('steel', 'deco', new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8), fx + 0.3, 1.25, lineZ - 0.5);
    }
    {
      const guard = new THREE.BoxGeometry(A.maxX - A.minX - 6, 0.5, 0.02);
      guard.rotateX(-0.35);
      B.geo('glass', 'glass', guard, (A.minX + A.maxX) / 2, 1.45, lineZ - 0.15);
      for (const gx of [A.minX + 3.05, (A.minX + A.maxX) / 2, A.maxX - 3.05]) B.box('steel', 'deco', gx - 0.03, gx + 0.03, 0.95, 1.7, lineZ - 0.2, lineZ - 0.14);
      for (const ry of [0.82, 0.9]) B.box('steel', 'deco', A.minX + 3, A.maxX - 3, ry, ry + 0.03, lineZ + 0.25, lineZ + 0.3);
      for (const rz of [lineZ + 0.05, lineZ + 0.3]) B.box('steel', 'deco', A.minX + 3, A.maxX - 3, 0.8, 0.95, rz - 0.01, rz + 0.01);
    }
    block(0, A.minX, A.maxX, A.minZ, lineZ + 0.3);
    B.box('steel', 'deco', A.minX + 1.4, A.minX + 2.6, 0, 0.75, lineZ - 0.2, lineZ + 0.6);
    for (const sx of [A.minX + 1.7, A.minX + 2.3]) for (let n = 0; n < 12; n++) B.box('steel', 'deco', sx - 0.25, sx + 0.25, 0.75 + n * 0.025, 0.765 + n * 0.025, lineZ, lineZ + 0.4);
    block(0, A.minX + 1.4, A.minX + 2.6, lineZ - 0.2, lineZ + 0.6);
    for (const cx of [15, 21, 27]) cookSpots.push({ x: cx, z: lineZ - 1.35 });
    // 메뉴판 · 빨간 디지털 시계 · 벽걸이 TV · 게시판
    const mt = textTex(512, 360, '#24402f', '#f4f1e6', ['오늘의 급식', ...(menu.length ? menu : ['오늘은 급식이 없어요'])], 40, '#8a5a36');
    const mb = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.7), new THREE.MeshBasicMaterial({ map: mt }));
    mb.position.set(21, 2.55, kz + 0.05);
    scene.add(mb);
    menuSign.tex = mt;
    menuSign.mesh = mb;
    const dclockC = document.createElement('canvas');
    dclockC.width = 320;
    dclockC.height = 110;
    const dclockT = new THREE.CanvasTexture(dclockC);
    dclockT.colorSpace = THREE.SRGBColorSpace;
    const drawDigital = () => {
      const g = dclockC.getContext('2d');
      g.fillStyle = '#121212';
      g.fillRect(0, 0, 320, 110);
      const d = new Date(Date.now() + 9 * 3600 * 1000);
      g.fillStyle = '#ff3b2a';
      g.font = `700 78px 'Courier New', monospace`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(`${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`, 160, 58);
      dclockT.needsUpdate = true;
    };
    drawDigital();
    setInterval(drawDigital, 20000);
    const dclock = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.34), new THREE.MeshBasicMaterial({ map: dclockT }));
    dclock.position.set(29.5, 3.1, kz + 0.05);
    scene.add(dclock);
    B.box('metal', 'deco', A.minX + T, A.minX + 0.5, 3.25, 3.35, -28.2, -27.8);
    B.box('tv', 'deco', A.minX + 0.3, A.minX + 0.9, 2.6, 3.2, -28.5, -27.5);
    B.box('screen', 'deco', A.minX + 0.9, A.minX + 0.91, 2.67, 3.13, -28.4, -27.6);
    B.box('cork', 'deco', A.minX + T, A.minX + T + 0.03, 1.4, 2.4, -32.5, -30.5);
    for (let i = 0; i < 4; i++) B.box('white', 'deco', A.minX + T + 0.03, A.minX + T + 0.04, 1.55 + (i % 2) * 0.4, 1.85 + (i % 2) * 0.4, -32.3 + Math.floor(i / 2) * 0.9, -31.7 + Math.floor(i / 2) * 0.9);
    // 둥근 식탁 + 철제 의자
    for (const tz of [-30.4, -26.9, -23.4]) {
      for (let tx = 9.5; tx <= 33; tx += 4.6) {
        if (tz > -24 && tx > 17 && tx < 25) continue; // 출입구 앞은 비워 둠
        B.geo('white', 'deco', new THREE.CylinderGeometry(0.62, 0.62, 0.04, 24), tx, 0.74, tz);
        B.geo('metal', 'deco', new THREE.CylinderGeometry(0.05, 0.05, 0.72, 8), tx, 0.36, tz);
        B.geo('metal', 'deco', new THREE.CylinderGeometry(0.3, 0.3, 0.03, 16), tx, 0.02, tz);
        block(0, tx - 0.62, tx + 0.62, tz - 0.62, tz + 0.62);
        for (let a = 0; a < 4; a++) {
          const ang = (a / 4) * Math.PI * 2 + Math.PI / 4;
          const cx = tx + Math.sin(ang) * 0.95;
          const cz = tz + Math.cos(ang) * 0.95;
          B.geo('chairDark', 'chair', new THREE.CylinderGeometry(0.19, 0.19, 0.04, 14), cx, 0.45, cz);
          const back = new THREE.BoxGeometry(0.36, 0.38, 0.03);
          back.translate(0, 0.66, 0.2);
          back.rotateY(ang);
          B.geo('metal', 'deco', back, cx, 0, cz);
          for (const [lx, lz] of [[-0.13, -0.13], [0.13, -0.13], [-0.13, 0.13], [0.13, 0.13]]) B.box('metal', 'deco', cx + lx - 0.012, cx + lx + 0.012, 0, 0.44, cz + lz - 0.012, cz + lz + 0.012);
          chairs.push({ x: cx, z: cz, seatY: 0.45, ry: ang + Math.PI, level: 0, room: 'cafe' });
          if (a % 2 === 0) B.box('steel', 'deco', tx + Math.sin(ang) * 0.38 - 0.16, tx + Math.sin(ang) * 0.38 + 0.16, 0.76, 0.78, tz + Math.cos(ang) * 0.38 - 0.12, tz + Math.cos(ang) * 0.38 + 0.12);
        }
      }
    }
    for (let x = A.minX + 3; x < A.maxX - 2; x += 5) for (const z of [-31, -27, -23]) B.box('lamp', 'deco', x - 0.6, x + 0.6, L1 - 0.28, L1 - 0.22, z - 0.08, z + 0.08);

    // ── 2층 강당 ──
    const courtTex = canvasTex(
      1024,
      440,
      (g, w, h) => {
        for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) g.drawImage(tex.wood.image, (i * w) / 4, (j * h) / 2, w / 4, h / 2);
        g.strokeStyle = '#f5f1e6';
        g.lineWidth = 5;
        const m = 30;
        g.strokeRect(m, m, w - 2 * m, h - 2 * m);
        g.beginPath();
        g.moveTo(w / 2, m);
        g.lineTo(w / 2, h - m);
        g.stroke();
        g.beginPath();
        g.arc(w / 2, h / 2, 55, 0, Math.PI * 2);
        g.stroke();
        g.fillStyle = 'rgba(190,70,50,0.55)';
        for (const side of [0, 1]) {
          const x0 = side ? w - m - 160 : m;
          g.fillRect(x0, h / 2 - 70, 160, 140);
          g.strokeRect(x0, h / 2 - 70, 160, 140);
          g.beginPath();
          const cx = side ? w - m : m;
          g.arc(cx, h / 2, 200, side ? Math.PI / 2 : -Math.PI / 2, side ? (Math.PI * 3) / 2 : Math.PI / 2);
          g.stroke();
        }
      },
      { repeat: false },
    );
    const court = new THREE.Mesh(new THREE.PlaneGeometry(A.maxX - A.minX - 0.6, 12), new THREE.MeshStandardMaterial({ map: courtTex, roughness: 0.5 }));
    court.rotation.x = -Math.PI / 2;
    court.position.set((A.minX + A.maxX) / 2, L1 + 0.02, -26.4);
    court.receiveShadow = true;
    scene.add(court);
    // 무대 + 빨간 커튼 + 태극기 + 학교 이름
    B.box('lectern', 'wall', A.minX + 4, A.maxX - 4, L1, L1 + 1.0, A.minZ + T, A.minZ + 3.4);
    for (let i = 0; i < 3; i++) B.box('lectern', 'deco', 18.5, 23.5, L1, L1 + 0.33 * (i + 1), A.minZ + 3.4 + (2 - i) * 0.35, A.minZ + 3.4 + (3 - i) * 0.35);
    block(1, A.minX + 4, A.maxX - 4, A.minZ, A.minZ + 4.5);
    B.box('red', 'deco', A.minX + 4.5, A.maxX - 4.5, L1 + 1.0, L1 + 5.0, A.minZ + T, A.minZ + T + 0.08);
    const gflag = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.2), taegukMat);
    gflag.position.set(21, L1 + 5.4, A.minZ + T + 0.03);
    scene.add(gflag);
    sign('온라인중학교 강당', 21, L1 + 4.4, A.minZ + T + 0.1, 4.2);
    // 농구 골대 (벽걸이)
    for (const hp of HOOPS) {
      const dir = hp.x < 21 ? 1 : -1;
      const wallX = dir > 0 ? A.minX + T : A.maxX - T;
      B.box('white', 'deco', hp.x - dir * 0.45 - 0.03, hp.x - dir * 0.45 + 0.03, hp.y - 0.15, hp.y + 0.9, hp.z - 0.9, hp.z + 0.9);
      B.box('red', 'deco', hp.x - dir * 0.43 - 0.01, hp.x - dir * 0.43 + 0.01, hp.y + 0.05, hp.y + 0.45, hp.z - 0.3, hp.z + 0.3);
      B.box('metal', 'deco', Math.min(wallX, hp.x - dir * 0.45), Math.max(wallX, hp.x - dir * 0.45), hp.y + 0.25, hp.y + 0.35, hp.z - 0.05, hp.z + 0.05);
      const rim = new THREE.TorusGeometry(0.23, 0.02, 8, 24);
      rim.rotateX(Math.PI / 2);
      B.geo('red', 'deco', rim, hp.x, hp.y, hp.z);
      const net = new THREE.Mesh(
        new THREE.CylinderGeometry(0.23, 0.15, 0.4, 16, 1, true),
        new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, side: THREE.DoubleSide, wireframe: true }),
      );
      net.position.set(hp.x, hp.y - 0.2, hp.z);
      scene.add(net);
    }
    for (let x = A.minX + 4; x < A.maxX - 2; x += 6.5) for (const z of [-32, -26.5, -22]) B.box('lamp', 'deco', x - 0.4, x + 0.4, TOP - 0.6, TOP - 0.5, z - 0.4, z + 0.4);
    // 2층 강당은 구름다리 말고는 바깥과 이어지지 않음 (길찾기)
    block(1, -BX, BRIDGE.minX, A.maxZ, Z_BACK);
    block(1, BRIDGE.maxX, BX, A.maxZ, Z_BACK);
    block(1, -BX, A.minX, A.minZ - 0.5, A.maxZ);
    block(1, A.maxX, BX, A.minZ - 0.5, A.maxZ);
  }

  // ── 구름다리 (본관 2층 ↔ 강당) ──
  {
    const L1 = levelY(1);
    const Bd = BRIDGE;
    B.box('terrazzo', 'floor', Bd.minX, Bd.maxX, L1 - 0.3, L1, Bd.minZ, Bd.maxZ);
    for (const [x1, x2] of [[Bd.minX, Bd.minX + 0.2], [Bd.maxX - 0.2, Bd.maxX]]) {
      B.box('band', 'wall', x1, x2, L1, L1 + 1.0, Bd.minZ, Bd.maxZ);
      B.box('glass', 'glass', x1, x2, L1 + 1.0, L1 + 2.3, Bd.minZ, Bd.maxZ);
      for (let z = Bd.minZ + 1.5; z < Bd.maxZ; z += 1.5) B.box('frame', 'deco', x1 - 0.02, x2 + 0.02, L1 + 1.0, L1 + 2.3, z - 0.04, z + 0.04);
      block(1, x1, x2, Bd.minZ, Bd.maxZ);
    }
    B.box('cream', 'wall', Bd.minX - 0.1, Bd.maxX + 0.1, L1 + 2.3, L1 + 2.6, Bd.minZ, Bd.maxZ);
    B.box('band', 'deco', Bd.minX - 0.1, Bd.maxX + 0.1, L1 - 0.6, L1 - 0.3, Bd.minZ, Bd.maxZ);
    for (const lz of [-18.5, -15.5]) B.box('lamp', 'deco', 11.1, 11.9, L1 + 2.24, L1 + 2.3, lz - 0.08, lz + 0.08);
  }

  // ── 지붕 있는 연결 통로: 본관 뒷문 → 급식실 문 (필로티처럼 기둥 + 아치 지붕 + 보도블록) ──
  {
    const W = 1.6;
    const zMid = -17;
    const cafeX = (CAFE_DOOR[0] + CAFE_DOOR[1]) / 2;
    pave(-W, W, zMid - W, Z_BACK);
    archRoof('z', zMid + W, Z_BACK, 0);
    tactile(-0.15, 0.15, zMid, Z_BACK);
    for (const x of [-W, W]) woodPost(x, Z_BACK - 0.5);
    pave(-W, cafeX + W, zMid - W, zMid + W);
    archRoof('x', -W, cafeX + W, zMid);
    tactile(0, cafeX, zMid - 0.15, zMid + 0.15);
    for (let x = -W; x <= cafeX + W + 0.01; x += 2.5) {
      if (Math.abs(x) > W + 0.4) woodPost(x, zMid + W);
      if (Math.abs(x - cafeX) > W + 0.4) woodPost(x, zMid - W);
    }
    pave(cafeX - W, cafeX + W, ANNEX.maxZ, zMid - W);
    tactile(cafeX - 0.15, cafeX + 0.15, ANNEX.maxZ, zMid - W);
  }

  // ── 자전거 보관대 (뒷마당, 지붕) ──
  {
    const x1 = -32;
    const x2 = -20;
    const z1 = -26;
    const z2 = -22;
    for (const x of [x1, (x1 + x2) / 2, x2]) for (const z of [z1, z2]) B.geo('metal', 'deco', new THREE.CylinderGeometry(0.06, 0.06, 2.4, 8), x, 1.2, z);
    B.box('fence', 'deco', x1 - 0.3, x2 + 0.3, 2.4, 2.5, z1 - 0.4, z2 + 0.4);
    for (let x = x1 + 0.6; x < x2; x += 0.8) {
      const ring = new THREE.TorusGeometry(0.32, 0.025, 6, 16);
      B.geo('metal', 'deco', ring, x, 0.32, (z1 + z2) / 2);
      if (Math.round(x * 10) % 3 === 0) {
        const wheel = new THREE.TorusGeometry(0.33, 0.03, 6, 18);
        B.geo('tv', 'deco', wheel, x + 0.05, 0.36, z1 + 0.9);
        B.geo('tv', 'deco', wheel.clone(), x + 0.05, 0.36, z2 - 0.9);
        B.box('red', 'deco', x, x + 0.06, 0.4, 0.8, z1 + 0.9, z2 - 0.9);
      }
    }
    block(0, x1 - 0.3, x2 + 0.3, z1 - 0.3, z2 + 0.3);
  }

  // 점수판 (운동장 동쪽 끝, 축구 점수 표시)
  const scoreC = document.createElement('canvas');
  scoreC.width = 512;
  scoreC.height = 200;
  const scoreT = new THREE.CanvasTexture(scoreC);
  scoreT.colorSpace = THREE.SRGBColorSpace;
  const drawScore = (blue, white) => {
    const g = scoreC.getContext('2d');
    g.fillStyle = '#1f2a24';
    g.fillRect(0, 0, 512, 200);
    g.font = `700 44px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#7fb4ff';
    g.fillText('청팀', 128, 50);
    g.fillStyle = '#ffffff';
    g.fillText('백팀', 384, 50);
    g.font = `700 100px ${FONT}`;
    g.fillStyle = '#ffd34d';
    g.fillText(String(blue), 128, 135);
    g.fillText(String(white), 384, 135);
    g.fillText(':', 256, 130);
    scoreT.needsUpdate = true;
  };
  drawScore(0, 0);
  const scoreBoard = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.56), new THREE.MeshBasicMaterial({ map: scoreT }));
  scoreBoard.position.set(0, 3.2, 67.6);
  scoreBoard.rotation.y = Math.PI;
  scene.add(scoreBoard);
  for (const px of [-1.8, 1.8]) {
    B.geo('metal', 'deco', new THREE.CylinderGeometry(0.08, 0.08, 2.5, 8), px, 1.25, 67.7);
    block(0, px - 0.2, px + 0.2, 67.5, 67.9);
  }

  // 나무 (플라타너스 + 노란 은행나무)
  const tree = (x, z, i) => {
    const s = 0.9 + ((i * 37) % 10) / 18;
    B.geo('trunk', 'deco', new THREE.CylinderGeometry(0.2 * s, 0.3 * s, 2.6 * s, 8), x, 1.3 * s, z);
    const leaf = i % 3 === 0 ? 'ginkgo' : i % 2 ? 'leaf1' : 'leaf2';
    B.geo(leaf, 'deco', new THREE.IcosahedronGeometry(1.8 * s, 1), x, 3.3 * s, z);
    B.geo(leaf, 'deco', new THREE.IcosahedronGeometry(1.3 * s, 1), x + 0.6 * s, 4.3 * s, z - 0.4 * s);
    block(0, x - 0.45, x + 0.45, z - 0.45, z + 0.45);
  };
  let ti = 0;
  for (let x = -64; x <= 64; x += 8) if (Math.abs(x) > 8) tree(x, 69.5, ti++);
  for (let z = 6; z <= 64; z += 8) {
    tree(-66, z, ti++);
    tree(66, z, ti++);
  }
  // 담장 + 정문
  const wallSeg = (x1, x2, z1, z2) => {
    B.box('cream', 'deco', x1, x2, 0, 0.9, z1, z2);
    const thinX = x2 - x1 < 1;
    if (thinX) B.box('fence', 'deco', (x1 + x2) / 2 - 0.02, (x1 + x2) / 2 + 0.02, 0.9, 2.0, z1, z2);
    else B.box('fence', 'deco', x1, x2, 0.9, 2.0, (z1 + z2) / 2 - 0.02, (z1 + z2) / 2 + 0.02);
  };
  wallSeg(-69.5, -5.5, 73, 73.4);
  wallSeg(5.5, 69.5, 73, 73.4);
  wallSeg(-69.5, -69.1, -46, 73.4);
  wallSeg(69.1, 69.5, -46, 73.4);
  wallSeg(-69.5, 69.5, -46.4, -46);
  for (const gx of [-5.5, 5.5]) B.box('band', 'deco', gx - 0.5, gx + 0.5, 0, 2.8, 72.7, 73.7);
  const gateSign = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 2),
    new THREE.MeshBasicMaterial({ map: textTex(128, 320, '#f0ead8', '#2b2b2b', ['온', '라', '인', '중', '학', '교'], 44) }),
  );
  gateSign.position.set(-5.5, 1.5, 72.68);
  gateSign.rotation.y = Math.PI;
  scene.add(gateSign);

  const built = B.build(scene, mats);
  walkables.push(...built.floor);

  // ── 높이: 지금 높이(curY)와 가장 가까운 바닥/계단 면 ──
  function heightAt(x, z, curY = 0) {
    const nearest = (cands) => cands.reduce((b, c) => (Math.abs(c - curY) < Math.abs(b - curY) ? c : b));
    // 강당동: 1층 급식실 / 2층 강당
    if (x > ANNEX.minX && x < ANNEX.maxX && z > ANNEX.minZ && z < ANNEX.maxZ) return nearest([levelY(0), levelY(1)]);
    // 구름다리 위 / 그 아래 땅
    if (x > BRIDGE.minX && x < BRIDGE.maxX && z > BRIDGE.minZ && z < BRIDGE.maxZ) return nearest([0, levelY(1)]);
    if (x < -BX || x > BX || z < Z_BACK || z > Z_FRONT) return 0;
    const st = STAIRS.find((s) => x >= s.xs && x <= s.xe);
    const cands = [];
    if (st && z > Z_CORR) {
      for (let k = 0; k < LEVELS; k++) {
        const L = levelY(k);
        if (z >= FLIGHT_END) cands.push(L + 1.8);
        else if (x < st.mid) cands.push(L + (1.8 * (z - Z_CORR)) / (FLIGHT_END - Z_CORR));
        else cands.push(L + 1.8 + (1.8 * (FLIGHT_END - z)) / (FLIGHT_END - Z_CORR));
      }
    } else {
      for (let k = 0; k <= ROOF; k++) cands.push(levelY(k));
    }
    let best = cands[0];
    for (const c of cands) if (Math.abs(c - curY) < Math.abs(best - curY)) best = c;
    return best;
  }

  // 칠판 글씨 바꾸기 (같은 글이면 다시 그리지 않음). text 가 없으면 기본 글
  function writeBoard(id, text) {
    const b = boards.get(id);
    if (!b) return;
    const t = text || b.defaultText;
    if (t === b.text) return;
    b.text = t;
    drawBoardCanvas(b.canvas, t);
    b.texture.needsUpdate = true;
  }

  // 급식 메뉴판 다시 쓰기 (게임 속 하루가 바뀔 때)
  let menuKey = (menu || []).join();
  function setMenu(next) {
    const k = (next || []).join();
    if (!menuSign.mesh || k === menuKey) return;
    menuKey = k;
    menuSign.mesh.material.map.dispose();
    menuSign.mesh.material.map = textTex(512, 360, '#24402f', '#f4f1e6', ['오늘의 급식', ...(next.length ? next : ['오늘은 급식이 없어요'])], 40, '#8a5a36');
    menuSign.mesh.material.needsUpdate = true;
  }

  return {
    writeBoard,
    setMenu,
    walkables,
    occluders: [...built.wall, ...built.floor, ...built.glass],
    tapBlockers: built.wall,
    chairMeshes: built.chair,
    stairMeshes: built.stair,
    staffSeats,
    cookSpots,
    chairs,
    blocks,
    heightAt,
    sun,
    drawScore,
    update(t) {
      animated.forEach((f) => f(t));
    },
  };
}
