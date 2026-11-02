// 2000년대 감성의 3층 학교 (층마다 교실 10개 + 양쪽 계단 + 흙 운동장)
// 외부 3D 파일 없이 기본 도형 + 캔버스 무늬로 만들고, 같은 재질끼리 하나로 합쳐서
// 휴대폰에서도 가볍게 돌아가도록 했습니다.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ── 건물 치수 ─────────────────────────────────────────────
export const LEVEL_H = 3.6; // 층 높이
export const LEVELS = 3;
// 본관 1층 바닥은 땅보다 60cm 높음 (현관·옆문·뒷문에 돌계단)
export const BASE = 0.6;
export const levelY = (k) => BASE + k * LEVEL_H; // k층 바닥 높이 (0 = 1층)
export const ANNEX_FLOOR = 0.15; // 강당동 1층(급식실) 바닥
export const ROOF = LEVELS; // 옥상 = 4번째 층
export const levelOfY = (y) => Math.max(0, Math.min(ROOF, Math.round((y - BASE) / LEVEL_H)));

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

// 중앙 계단 (가운데 칸): 서쪽에서 동쪽으로 오르는 첫 단 → 동쪽 층계참 → 동쪽에서 서쪽으로 오르는 둘째 단
// 중앙 계단실 (본관 뒤로 튀어나옴): 복도(z0)에서 곧장 오르는 가운데 계단(반폭 cw) → 층계참(z1~z2) → 양옆 계단(sw1~sw2)으로 위층 복도
export const CSTAIR = { xs: -5, xe: 5, cw: 3.2, sw1: 3.2, sw2: 4.8, z0: Z_BACK, z1: Z_BACK - 4, z2: Z_BACK - 5.6, steps: 10 };
STAIRS.push({ center: true, xs: CSTAIR.xs, xe: CSTAIR.xe, xA: 0, xB: 4, mid: 0, zEntry: -12.3, zCorr: Z_CORR, zFlightEnd: FLIGHT_END, zLanding: -0.85, maxLevel: LEVELS - 1 });
// 화장실 (양끝 계단실 옆, 본관 뒤로 튀어나옴)
export const TOILET = { z1: Z_BACK - 5.2 };
// 뒷문 (급식실 가는 지붕 통로로 나가는 문): 가운데 칸 바로 동쪽
export const BACKDOOR = { x1: 14.5, x2: 16.5 };

// 층별 방 배치 (왼쪽 4칸 → 오른쪽 4칸). 학년마다 4반 + 특별실·행정 공간
const ROOM_PLAN = [
  [['principal', '교장실'], ['admin', '행정실'], ['staff', '교무실'], ['nurse', '보건실'], ['class', 1], ['class', 2], ['class', 3], ['class', 4]],
  [['class', 1], ['class', 2], ['class', 3], ['class', 4], ['science', '과학실'], ['art', '미술실'], ['computer', '컴퓨터실'], ['broadcast', '방송실']],
  [['class', 1], ['class', 2], ['class', 3], ['class', 4], ['music', '음악실'], ['av', '시청각실'], ['homeec', '가정실'], ['council', '학생회실']],
];
export const HALL_NAMES = ['중앙현관', '상담실', '도서실'];
// 칠판·교탁이 있는 (수업하는) 방
export const TEACHING = new Set(['class', 'science', 'art', 'music', 'computer', 'av', 'homeec', 'council', 'english']);
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
// 가운데 칸 2층 상담실 · 3층 도서실
{
  const h = SLOTS.find((s) => s.type === 'hall');
  CLASSROOMS.push({ id: 'counsel', name: '상담실', type: 'counsel', level: 1, xs: h.xs, xe: h.xe });
  CLASSROOMS.push({ id: 'library', name: '도서실', type: 'library', level: 2, xs: h.xs, xe: h.xe });
}

export function roomAt(x, z, y) {
  if (z < Z_CORR || z > Z_FRONT) return null;
  const k = levelOfY(y);
  return CLASSROOMS.find((c) => c.level === k && x > c.xs && x < c.xe) || null;
}

// 매점 위치 (운동장 옆)
export const STORE = { minX: -62, maxX: -52, minZ: -32, maxZ: -23.5, doorX1: -58, doorX2: -56 };
// 축구장 (공이 굴러다니는 범위)과 골대
// 본관 뒤 별관: 체육관 / 급식실
// 강당동: 본관 바로 뒤. 1층 급식실, 2층 강당(체육관). 본관 2층과 구름다리로, 1층은 지붕 있는 통로로 연결
export const ANNEX = { minX: 6, maxX: 36, minZ: -36, maxZ: -20 };
export const CAFE = { ...ANNEX, level: 0 };
export const GYM = { ...ANNEX, level: 1 };
export const BRIDGE = { minX: 10, maxX: 13, minZ: ANNEX.maxZ, maxZ: Z_BACK };
export const CAFE_DOOR = [20, 23];
// 중앙현관 바깥 계단: 너비(반), 계단참 끝, 계단 끝
export const ENTRY = { w: 5.2, landing: 1.4, depth: 3.0 };
// 구령대: 단상(반폭 x, 앞뒤 z1~z2, 높이 top) + 양옆 계단(바깥 끝 stairX, sz1~sz2)
export const PODIUM = { x: 6, z1: 11.4, z2: 14.8, top: 1.4, stairX: 8.8, sz1: 12.0, sz2: 13.8 };
// 정문: 동쪽 담장, 건물 앞 마당과 바로 이어짐
export const GATE = { z1: 4, z2: 13 };
// 학교 밖 등굣길 (보도 · 차도 · 건너편 가게들)
export const OUT = { wall: 69.6, curb: 82, road2: 90, shops: 96, maxX: 107 };
export const HOOPS = [
  { x: ANNEX.minX + 1.65, y: levelY(1) + 3.05, z: -26.4 },
  { x: ANNEX.maxX - 1.65, y: levelY(1) + 3.05, z: -26.4 },
  { x: 66 - 0.9 - 0.3, y: FIELD_Y + 3.05, z: 59, outdoor: true }, // 야외 농구장
];
// 운동장은 건물·앞마당보다 1.2m 낮음 (앞마당 끝에 계단식 관람석으로 내려감)
export const FIELD_Y = -1.2;
export const FIELD_Z = 15;
export const PITCH = { minX: -46.8, maxX: 46.8, minZ: 15.3, maxZ: 66.7, goalX: 43, goalZ1: 37.6, goalZ2: 44.4, goalDepth: 44.3 };

// 층별 길찾기 범위
export const NAV_BOUNDS = [
  { minX: -68.5, maxX: OUT.maxX, minZ: -45.5, maxZ: 72.5 }, // 1층 + 운동장 + 학교 밖 등굣길
  { minX: -BX, maxX: BX, minZ: ANNEX.minZ - 0.5, maxZ: Z_FRONT }, // 2층 + 구름다리 + 강당
  { minX: -BX, maxX: BX, minZ: Z_BACK - 6, maxZ: Z_FRONT },
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
  let yOff = 0; // 운동장처럼 땅이 낮은 구역을 만들 때 y 를 통째로 내림
  function push(mat, role, g) {
    g = g.index ? g.toNonIndexed() : g;
    if (yOff) g.translate(0, yOff, 0);
    g.computeBoundingBox();
    g.boundingBox.getCenter(v);
    const chunk = Math.floor((v.x + 90) / 18);
    const key = `${mat}|${role}|${chunk}`;
    if (!groups.has(key)) groups.set(key, { mat, role, geos: [] });
    groups.get(key).geos.push(g);
  }
  return {
    setY(v2) {
      yOff = v2;
    },
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
  const artEasels = []; // 미술실 이젤 캔버스 (내가 그린 그림을 걸 수 있음)

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
    blocks: canvasTex(128, 128, (g) => {
      const r = rand(41);
      const cols = ['#b9b3a6', '#c7c1b4', '#aaa498', '#b2775f', '#c3bdb0'];
      for (let row = 0; row < 8; row++) {
        const off = row % 2 ? 16 : 0;
        for (let x = -1; x < 4; x++) {
          const v = r();
          g.fillStyle = v < 0.12 ? cols[3] : cols[Math.floor(r() * 3) === 0 ? 0 : Math.floor(r() * 3) === 1 ? 1 : 4];
          g.fillRect(x * 32 + off + 1, row * 16 + 1, 30, 14);
        }
      }
      g.strokeStyle = 'rgba(70,64,56,0.35)';
      for (let row = 0; row <= 8; row++) {
        g.beginPath();
        g.moveTo(0, row * 16);
        g.lineTo(128, row * 16);
        g.stroke();
      }
    }),
    tile: canvasTex(64, 64, (g) => {
      g.fillStyle = '#f4f4f0';
      g.fillRect(0, 0, 64, 64);
      g.strokeStyle = '#c9c9c4';
      g.lineWidth = 3;
      g.strokeRect(0, 0, 64, 64);
    }),
    tileBeige: canvasTex(64, 64, (g) => {
      g.fillStyle = '#d9c9a6';
      g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#cdbb95';
      g.fillRect(2, 2, 30, 30);
      g.fillRect(34, 34, 28, 28);
      g.strokeStyle = '#b5a07c';
      g.lineWidth = 2;
      g.strokeRect(0, 0, 64, 64);
      g.beginPath();
      g.moveTo(32, 0);
      g.lineTo(32, 64);
      g.moveTo(0, 32);
      g.lineTo(64, 32);
      g.stroke();
    }),
    brick: canvasTex(128, 64, (g) => {
      g.fillStyle = '#c9c2b4';
      g.fillRect(0, 0, 128, 64);
      const cols = ['#a8503c', '#b35a44', '#9d4a38', '#b86350'];
      for (let r = 0; r < 4; r++) {
        const off = r % 2 ? 16 : 0;
        for (let c = -1; c < 5; c++) {
          g.fillStyle = cols[(r * 5 + c + 7) % cols.length];
          g.fillRect(c * 32 + off + 1, r * 16 + 1, 30, 14);
        }
      }
    }),
    tileCheck: canvasTex(64, 64, (g) => {
      g.fillStyle = '#b9c4bb';
      g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#8fa396';
      g.fillRect(0, 0, 32, 32);
      g.fillRect(32, 32, 32, 32);
      g.strokeStyle = '#7d8e84';
      g.lineWidth = 2;
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
    bronze: std('#6f5a3c', { metalness: 0.55, roughness: 0.45 }),
    gold: std('#d4a640', { metalness: 0.85, roughness: 0.3, emissive: '#3a2a08', emissiveIntensity: 0.25 }),
    patina: std('#4f7a64', { metalness: 0.35, roughness: 0.55 }),
    patinaDark: std('#36584a', { metalness: 0.35, roughness: 0.6 }),
    pinkPaint: std('#e7a7a9', { roughness: 0.7 }),
    blueDoor: std('#2f6fb3', { roughness: 0.5 }),
    bluePaint: std('#3d7cc4', { roughness: 0.55 }),
    orangePaint: std('#e8892e', { roughness: 0.55 }),
    darkMetal: std('#4a4f55', { metalness: 0.5, roughness: 0.45 }),
    blueMat: std('#2c5aa0', { roughness: 0.95 }),
    signGreen: std('#2f7d4a', { roughness: 0.5 }),
    slat: std('#d8d2c4', { roughness: 0.6 }),
    downlight: std('#ffffff', { emissive: '#fff6dc', emissiveIntensity: 1.2 }),
    granite: std('#a7a39b', { roughness: 0.7 }),
    wisteria: std('#9a7bd1'),
    chairDark: std('#7a3b20', { roughness: 0.45 }),
    steel: std('#c9cdd0', { metalness: 0.7, roughness: 0.3 }),
    tile: std('#ffffff', { map: tex.tile }, 3),
    tileBeige: std('#ffffff', { map: tex.tileBeige, roughness: 0.6 }, 2.5),
    tileCheck: std('#ffffff', { map: tex.tileCheck, roughness: 0.8 }, 2.5),
    ivory: std('#ece2c6', { roughness: 0.55 }),
    wine: std('#7a2e3a', { roughness: 0.9 }),
    brick: std('#ffffff', { map: tex.brick, roughness: 0.85 }, 1.6),
    tileDark: std('#3f6b52', { roughness: 0.5 }),
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
  const grassFlat = (w, h, x, z) => {
    const t = tex.grass.clone();
    t.needsUpdate = true;
    t.repeat.set(w / 5, h / 5);
    flat(w, h, t, x, 0, z);
  };
  // 잔디: 운동장(낮은 땅) 자리만 비워 두고 깔기
  grassFlat(400, 200 + FIELD_Z, 0, (-200 + FIELD_Z) / 2);
  grassFlat(400, 200 - 73.4, 0, (73.4 + 200) / 2);
  grassFlat(200 - 69.5, 73.4 - FIELD_Z, -(69.5 + 200) / 2, (FIELD_Z + 73.4) / 2);
  grassFlat(200 - 69.5, 73.4 - FIELD_Z, (69.5 + 200) / 2, (FIELD_Z + 73.4) / 2);
  tex.dirt.repeat.set(30, 13);
  flat(139, 59, tex.dirt, 0, FIELD_Y + 0.01, 44); // 운동장 둘레 흙 (낮은 땅)
  tex.blocks.repeat.set(137 / 1.6, 15 / 1.6);
  flat(137, 15, tex.blocks, 0, 0.015, 7.5); // 건물 앞 마당: 보도블록
  const backTex = tex.blocks.clone();
  backTex.needsUpdate = true;
  backTex.repeat.set(138 / 1.6, 34 / 1.6);
  flat(138, 34, backTex, 0, 0.015, -29); // 본관 뒤 마당 (보도블록)
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
  flat(94, 52, fieldTex, 0, FIELD_Y + 0.02, 41);

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
          solidWall(k, s.xs, -3.6, Z_FRONT - WALL_T, Z_FRONT, 'granite');
          solidWall(k, 3.6, s.xe, Z_FRONT - WALL_T, Z_FRONT, 'granite');
          B.box('cream', 'wall', -3.6, 3.6, L + 2.7, L + LEVEL_H - 0.2, Z_FRONT - WALL_T, Z_FRONT);
        } else windowWall(k, s.xs, s.xe, Z_FRONT - WALL_T, Z_FRONT);
      } else if (s.type === 'stair') {
        // 계단실 앞벽: 계단이 벽에 붙음 (유리창 없이, 층계참 높이에 좁은 간유리 띠만)
        const yb = k === 0 ? 0 : L - 0.2;
        B.box('band', 'wall', s.xs, s.xe, yb, L + 0.9, Z_FRONT - WALL_T, Z_FRONT);
        B.box('cream', 'wall', s.xs, s.xe, L + 0.9, L + 2.3, Z_FRONT - WALL_T, Z_FRONT);
        B.box('cream', 'wall', s.xs, s.xs + 1.2, L + 2.3, L + 3.0, Z_FRONT - WALL_T, Z_FRONT);
        B.box('cream', 'wall', s.xe - 1.2, s.xe, L + 2.3, L + 3.0, Z_FRONT - WALL_T, Z_FRONT);
        B.box('glass', 'glass', s.xs + 1.2, s.xe - 1.2, L + 2.3, L + 3.0, Z_FRONT - WALL_T + 0.06, Z_FRONT - 0.06);
        B.box('frame', 'deco', s.xs + 1.2, s.xe - 1.2, L + 2.3, L + 2.36, Z_FRONT - WALL_T - 0.02, Z_FRONT + 0.02);
        B.box('frame', 'deco', s.xs + 1.2, s.xe - 1.2, L + 2.94, L + 3.0, Z_FRONT - WALL_T - 0.02, Z_FRONT + 0.02);
        B.box('cream', 'wall', s.xs, s.xe, L + 3.0, L + LEVEL_H - 0.2, Z_FRONT - WALL_T, Z_FRONT);
        block(k, s.xs, s.xe, Z_FRONT - WALL_T, Z_FRONT);
      } else windowWall(k, s.xs, s.xe, Z_FRONT - WALL_T, Z_FRONT);
      // 뒷벽 (복도 창문)
      if (k === 1 && s.xs < BRIDGE.minX && s.xe > BRIDGE.maxX) {
        // 2층 복도 → 강당 구름다리 문
        windowWall(k, s.xs, BRIDGE.minX, Z_BACK, Z_BACK + WALL_T);
        windowWall(k, BRIDGE.maxX, s.xe, Z_BACK, Z_BACK + WALL_T);
        B.box('cream', 'wall', BRIDGE.minX, BRIDGE.maxX, L + 2.4, L + LEVEL_H - 0.2, Z_BACK, Z_BACK + WALL_T);
      } else if (s.type === 'hall') {
        // 가운데 칸 뒷벽 = 중앙 계단실 입구 (뚫림, 계단실 쪽에서 그림)
      } else if (s.type === 'stair') {
        // 계단실 칸 뒷벽 = 화장실 벽 (화장실 쪽에서 그림)
      } else if (k === 0 && s.xs < BACKDOOR.x1 && s.xe > BACKDOOR.x2) {
        // 뒷문 (체육관·급식실 가는 지붕 통로)
        windowWall(k, s.xs, BACKDOOR.x1, Z_BACK, Z_BACK + WALL_T);
        windowWall(k, BACKDOOR.x2, s.xe, Z_BACK, Z_BACK + WALL_T);
        B.box('cream', 'wall', BACKDOOR.x1, BACKDOOR.x2, L + 2.4, L + LEVEL_H - 0.2, Z_BACK, Z_BACK + WALL_T);
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
    if (st.center) continue;
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
  const cartSpots = []; // 급식차 자리 { x, y, z, level }
  const carts = []; // 급식차 위치 { x, z, level } (점심시간에 가까이 가면 급식 받기)
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
    const t = room.type === 'english' ? 'class' : room.type;
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
      B.box('locker', 'deco', xe - 0.6, xe - 0.1, L, L + 1.2, -6.6, -0.7);
      block(k, xe - 0.6, xe - 0.1, -6.6, -0.7);
      // 청소도구함 (뒤 왼쪽 구석, 하늘색 철제 2짝 문, 한쪽 문 열림 → 안에 빗자루·대걸레·쓰레받기)
      B.box('cabinet', 'deco', xe - 0.75, xe - 0.1, L, L + 1.8, -8.7, -7.0);
      B.box('partition', 'deco', xe - 0.76, xe - 0.75, L + 0.05, L + 1.75, -8.65, -7.9); // 닫힌 문짝
      B.box('steel', 'deco', xe - 0.78, xe - 0.76, L + 0.85, L + 0.95, -7.98, -7.94);
      {
        const dg = new THREE.BoxGeometry(0.01, 1.7, 0.8);
        dg.translate(0, 0, 0.4);
        dg.rotateY(-1.1);
        B.geo('partition', 'deco', dg, xe - 0.76, L + 0.9, -7.85); // 열린 문짝
      }
      B.box('tv', 'deco', xe - 0.72, xe - 0.13, L + 0.02, L + 1.78, -8.67, -7.03); // 안쪽 어두움
      B.geo('lectern', 'deco', new THREE.CylinderGeometry(0.015, 0.015, 1.3, 6), xe - 0.45, L + 0.75, -7.3); // 빗자루
      B.box('yellow', 'deco', xe - 0.55, xe - 0.35, L + 0.05, L + 0.3, -7.4, -7.2);
      B.geo('lectern', 'deco', new THREE.CylinderGeometry(0.015, 0.015, 1.4, 6), xe - 0.3, L + 0.8, -7.6); // 대걸레
      B.box('white', 'deco', xe - 0.4, xe - 0.2, L + 0.02, L + 0.12, -7.72, -7.5);
      B.box('blue', 'deco', xe - 0.55, xe - 0.3, L + 0.02, L + 0.14, -7.95, -7.8); // 쓰레받기
      const cabLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.14), new THREE.MeshBasicMaterial({ map: textTex(150, 42, '#ffffff', '#2b4a7a', ['청소 도구함'], 24, '#2b4a7a') }));
      cabLabel.rotation.y = -Math.PI / 2;
      cabLabel.position.set(xe - 0.765, L + 1.55, -8.3);
      scene.add(cabLabel);
      block(k, xe - 1.2, xe - 0.1, -8.75, -6.95);
      // 뒤 환경 게시판: 나무 테두리 + 초록 펠트판, 파스텔 스캘럽 띠, 제목, 알록달록 그림 작품, 종이꽃, 아래 울타리
      B.box('shelf', 'deco', xe - 0.14, xe - 0.1, L + 1.45, L + 2.65, -7.6, -1.4);
      const bbSeed = k * 7 + (room.id.codePointAt(2) || 0);
      const bbTex = canvasTex(1200, 240, (g, w, h) => {
        g.fillStyle = '#2f6b45';
        g.fillRect(0, 0, w, h);
        const pastel = ['#f9c6d0', '#bfe3f3', '#d9c7ef', '#fde9b5', '#c9ecc4'];
        for (let i = 0; i < 30; i++) {
          g.fillStyle = pastel[i % 5];
          g.beginPath();
          g.arc(20 + i * 40, 8, 20, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = '#fff8dc';
        g.fillRect(430, 26, 340, 44);
        g.strokeStyle = '#2b4a7a';
        g.lineWidth = 3;
        g.strokeRect(430, 26, 340, 44);
        g.fillStyle = ['#c0392b', '#2b4a7a', '#7b4fc9', '#1f7a3f'][bbSeed % 4];
        g.font = 'bold 30px sans-serif';
        g.textAlign = 'center';
        g.fillText(['꽃을 닮은 우리', '우리들의 솜씨', '꿈이 자라는 교실', '우리 반 바라기'][bbSeed % 4], 600, 58);
        const cols = ['#e74c3c', '#f39c12', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#e67e22', '#1abc9c', '#ff7eb6', '#74b9ff'];
        for (let i = 0; i < 9; i++) {
          const x = 150 + i * 100;
          const y = 88;
          g.fillStyle = '#ffffff';
          g.fillRect(x, y, 88, 118);
          for (let j = 0; j < 7; j++) {
            g.fillStyle = cols[(i * 3 + j * 5 + bbSeed) % cols.length];
            const sx = ((i * 13 + j * 29 + bbSeed * 7) % 60) + 8;
            const sy = ((i * 31 + j * 17 + bbSeed * 3) % 80) + 8;
            if ((i + j) % 3 === 0) {
              g.beginPath();
              g.arc(x + sx + 10, y + sy + 10, 12 + (j % 3) * 4, 0, Math.PI * 2);
              g.fill();
            } else g.fillRect(x + sx, y + sy, 18 + (j % 4) * 6, 14 + (j % 3) * 8);
          }
          g.strokeStyle = '#d0d0d0';
          g.lineWidth = 2;
          g.strokeRect(x, y, 88, 118);
        }
        // 양 끝 종이꽃 + 가지
        for (const bx of [60, 1140]) {
          g.strokeStyle = '#6b4a32';
          g.lineWidth = 6;
          g.beginPath();
          g.moveTo(bx, 230);
          g.lineTo(bx + (bx < 600 ? 20 : -20), 60);
          g.stroke();
          for (let i = 0; i < 9; i++) {
            g.fillStyle = ['#ff6b81', '#ffd166', '#a29bfe', '#ff9f43', '#fd79a8', '#55efc4'][i % 6];
            g.beginPath();
            g.arc(bx + ((i * 37) % 70) - 35, 60 + i * 18, 11, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = '#2ecc71';
            g.fillRect(bx + ((i * 37) % 70) - 20, 70 + i * 18, 10, 5);
          }
        }
        // 아래 나무 울타리 + 작은 꽃
        g.fillStyle = '#8d5a3c';
        for (let x = 130; x < 1070; x += 24) {
          g.fillRect(x, 212, 10, 24);
          g.beginPath();
          g.moveTo(x, 212);
          g.lineTo(x + 5, 204);
          g.lineTo(x + 10, 212);
          g.fill();
        }
        g.fillRect(130, 220, 940, 4);
        for (let x = 150; x < 1070; x += 70) {
          g.fillStyle = ['#ff7eb6', '#ffd166', '#74b9ff'][(x / 70) % 3 | 0];
          g.beginPath();
          g.arc(x, 232, 5, 0, Math.PI * 2);
          g.fill();
        }
      }, { repeat: false });
      const bb = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 1.2), new THREE.MeshBasicMaterial({ map: bbTex }));
      bb.rotation.y = -Math.PI / 2;
      bb.position.set(xe - 0.145, L + 2.05, -4.5);
      scene.add(bb);
      // 게시판 옆 작은 시간표·안내문 (오른쪽 끝)
      const notice = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), new THREE.MeshBasicMaterial({ map: textTex(100, 140, '#ffffff', '#333333', ['우리 반', '알림', '', '천천히', '조용히', '다정히'], 14, '#c0392b') }));
      notice.rotation.y = -Math.PI / 2;
      notice.position.set(xe - 0.135, L + 2.05, -1.0);
      scene.add(notice);
      // 칠판 위 급훈 액자 + 오른쪽 시간표 · 왼쪽 청소 당번표
      const motto = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.32), new THREE.MeshBasicMaterial({ map: textTex(330, 96, '#f7f2e2', '#2b2b2b', [['성실 · 근면 · 협동', '바른 생활 바른 마음', '최선을 다하자', '꿈을 향하여'][(room.level * 4 + (room.id.codePointAt(2) || 0)) % 4]], 40, '#5a4030') }));
      motto.rotation.y = Math.PI / 2;
      motto.position.set(xs + 0.13, L + 3.05, -4.5);
      scene.add(motto);
      const tt = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.62), new THREE.MeshBasicMaterial({ map: textTex(100, 124, '#ffffff', '#333333', ['시 간 표', '1 국어 2 수학', '3 영어 4 과학', '5 체육 6 음악', '7 자율'], 13, '#888888') }));
      tt.rotation.y = Math.PI / 2;
      tt.position.set(xs + 0.13, L + 2.25, -2.3);
      scene.add(tt);
      const duty = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.62), new THREE.MeshBasicMaterial({ map: textTex(100, 124, '#fff8dc', '#333333', ['청소 당번', '월: 1모둠', '화: 2모둠', '수: 3모둠', '목: 4모둠'], 13, '#888888') }));
      duty.rotation.y = Math.PI / 2;
      duty.position.set(xs + 0.13, L + 2.25, -6.8);
      scene.add(duty);
      // 칠판 턱: 분필·지우개, 구석에 손잡이 돌리는 분필털이
      B.box('darkWood', 'deco', xs + 0.13, xs + 0.3, L + 0.86, L + 0.9, -7.0, -2.0);
      for (let i = 0; i < 5; i++) B.box(i === 2 ? 'yellow' : 'white', 'deco', xs + 0.16, xs + 0.24, L + 0.9, L + 0.915, -5.2 + i * 0.12, -5.12 + i * 0.12);
      B.box('tv', 'deco', xs + 0.15, xs + 0.28, L + 0.9, L + 0.94, -4.0, -3.8);
      B.box('darkWood', 'deco', xs + 0.14, xs + 0.5, L + 0.9, L + 1.12, -6.95, -6.55);
      B.geo('tv', 'deco', new THREE.CylinderGeometry(0.03, 0.03, 0.08, 6).rotateZ(Math.PI / 2), xs + 0.54, L + 1.02, -6.75);
      B.box('white', 'deco', xs + 0.2, xs + 0.4, L + 1.0, L + 1.06, -6.85, -6.65);
      // 앞문 옆 초록 우유 상자 + 우유 팩, 뒤 구석 파란 양동이·대걸레·빗자루·쓰레기통
      // 우유 급식 상자 (초록 플라스틱, 앞쪽 칠판 벽 아래) + 우유팩
      B.box('leaf2', 'deco', xs + 0.15, xs + 0.75, L, L + 0.3, -3.3, -2.9);
      B.box('leaf2', 'deco', xs + 0.15, xs + 0.75, L + 0.3, L + 0.6, -3.3, -2.9);
      for (let i = 0; i < 6; i++) B.box('white', 'deco', xs + 0.2 + (i % 3) * 0.18, xs + 0.34 + (i % 3) * 0.18, L + 0.6, L + 0.72, -3.25 + Math.floor(i / 3) * 0.18, -3.13 + Math.floor(i / 3) * 0.18);
      block(k, xs + 0.1, xs + 0.8, -3.35, -2.85);
      B.geo('metal', 'deco', new THREE.CylinderGeometry(0.15, 0.13, 0.4, 10), xe - 0.9, L + 0.2, -1.1); // 쓰레기통
      block(k, xe - 1.1, xe - 0.7, -1.3, -0.9);
      // 1인용 책상 5줄 × 5열 (나무 상판 + 쇠 다리)
      for (let r = 0; r < 5; r++) {
        const dx = xs + 2.9 + r * 1.12;
        for (const cz of [-7.6, -5.95, -4.3, -2.65, -1.05]) {
          B.box('deskTop', 'deco', dx - 0.23, dx + 0.23, L + 0.72, L + 0.76, cz - 0.32, cz + 0.32);
          B.box('metal', 'deco', dx - 0.2, dx + 0.2, L + 0.55, L + 0.58, cz - 0.28, cz + 0.28);
          for (const lz of [cz - 0.28, cz + 0.28]) B.box('metal', 'deco', dx - 0.2, dx + 0.2, L, L + 0.72, lz - 0.02, lz + 0.02);
          block(k, dx - 0.23, dx + 0.23, cz - 0.32, cz + 0.32);
          studentChair(dx + 0.5, cz);
          // 책상 위: 교과서·공책·필통 (자리마다 다르게)
          const hsh = (Math.round(dx * 7) + Math.round(cz * 13) + k * 3) % 5;
          if (hsh === 0) B.box('books', 'deco', dx - 0.15, dx + 0.05, L + 0.76, L + 0.79, cz - 0.12, cz + 0.14);
          else if (hsh === 1) {
            B.box('blue', 'deco', dx - 0.18, dx + 0.02, L + 0.76, L + 0.785, cz - 0.14, cz + 0.12);
            B.box('red', 'deco', dx + 0.06, dx + 0.2, L + 0.76, L + 0.81, cz - 0.1, cz + 0.1);
          } else if (hsh === 2) B.box('ginkgo', 'deco', dx - 0.1, dx + 0.1, L + 0.76, L + 0.775, cz - 0.15, cz + 0.1);
        }
      }
      // 급식차 (복도, 앞문 옆) — 점심시간에만 나타남
      cartSpots.push({ x: xs + 3.4, z: Z_CORR - 0.6, y: L, level: k });
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
          artEasels.push(cv);
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
      // 역대 교장 사진 액자 줄 + 트로피 장
      for (let i = 0; i < 6; i++) {
        B.box('darkWood', 'deco', xs + 1.0 + i * 1.1, xs + 1.75 + i * 1.1, L + 2.15, L + 2.75, Z_CORR + 0.1, Z_CORR + 0.13);
        B.box(i % 2 ? 'beige' : 'white', 'deco', xs + 1.07 + i * 1.1, xs + 1.68 + i * 1.1, L + 2.22, L + 2.68, Z_CORR + 0.13, Z_CORR + 0.14);
      }
      B.box('shelf', 'deco', xe - 0.55, xe - 0.12, L, L + 1.8, -8.4, -6.4);
      B.box('glass', 'glass', xe - 0.57, xe - 0.55, L + 0.2, L + 1.75, -8.35, -6.45);
      for (let i = 0; i < 6; i++) B.geo('yellow', 'deco', new THREE.CylinderGeometry(0.05, 0.08, 0.25 + (i % 3) * 0.08, 10), xe - 0.33, L + 0.55 + Math.floor(i / 3) * 0.6, -8.1 + (i % 3) * 0.6);
      block(k, xe - 0.57, xe - 0.12, -8.4, -6.4);
      // 2000년대 교장실 디테일: 책상 위 명패·전화기·결재판·탁상달력·서류 더미, 교기, 교훈 액자, 벽시계, 화분 큰 것, 탁자 위 다과 쟁반·물주전자, 난초, 책장 상장
      B.box('tv', 'deco', xs + 1.3, xs + 1.5, L + 0.82, L + 0.92, -5.6, -5.3); // 전화기
      B.box('white', 'deco', xs + 1.32, xs + 1.48, L + 0.92, L + 0.95, -5.55, -5.35);
      B.box('blue', 'deco', xs + 1.7, xs + 2.0, L + 0.82, L + 0.85, -4.1, -3.7); // 결재판
      B.box('white', 'deco', xs + 1.72, xs + 1.98, L + 0.85, L + 0.86, -4.05, -3.75);
      B.box('white', 'deco', xs + 1.25, xs + 1.45, L + 0.82, L + 1.0, -3.6, -3.4); // 탁상달력
      for (let i = 0; i < 4; i++) B.box(i % 2 ? 'cork' : 'white', 'deco', xs + 1.55, xs + 2.0, L + 0.82 + i * 0.04, L + 0.86 + i * 0.04, -5.1 + i * 0.01, -4.6); // 서류
      B.geo('white', 'deco', new THREE.CylinderGeometry(0.04, 0.04, 0.12, 8), xs + 1.95, L + 0.88, -5.5); // 연필꽂이
      // 교기 (초록 깃발, 태극기 옆)
      B.geo('pole', 'deco', new THREE.CylinderGeometry(0.025, 0.025, 2.3, 8), xs + 0.5, L + 1.15, -2.0);
      const sflag2 = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshBasicMaterial({ map: textTex(180, 120, '#2f7d4a', '#f2c230', ['온라인중학교'], 26), side: THREE.DoubleSide }));
      sflag2.rotation.y = Math.PI / 2;
      sflag2.position.set(xs + 0.5, L + 1.95, -2.5);
      scene.add(sflag2);
      B.box('darkWood', 'deco', xs + 0.12, xs + 0.16, L + 2.3, L + 2.9, -5.4, -3.6); // 교훈 액자
      const edu = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.5), new THREE.MeshBasicMaterial({ map: textTex(340, 100, '#f7f2e2', '#2b2b2b', ['교훈 · 성실 · 협동 · 창의'], 36, '#5a4030') }));
      edu.rotation.y = Math.PI / 2;
      edu.position.set(xs + 0.165, L + 2.6, -4.5);
      scene.add(edu);
      const pclk = new THREE.Mesh(wallClockGeo, wallClockMat);
      pclk.rotation.y = Math.PI / 2;
      pclk.position.set(xs + 0.13, L + 2.6, -7.5);
      scene.add(pclk);
      // 탁자 위 다과 쟁반·물주전자·찻잔, 난초 화분
      B.box('steel', 'deco', xs + 5.5, xs + 6.5, L + 0.42, L + 0.44, -4.8, -4.2);
      B.geo('steel', 'deco', new THREE.CylinderGeometry(0.08, 0.1, 0.18, 10), xs + 5.7, L + 0.53, -4.5);
      for (let i = 0; i < 3; i++) B.geo('white', 'deco', new THREE.CylinderGeometry(0.04, 0.03, 0.06, 10), xs + 6.0 + i * 0.18, L + 0.47, -4.5);
      B.box('cork', 'deco', xs + 5.1, xs + 5.4, L + 0.42, L + 0.47, -4.7, -4.3); // 다과 접시
      B.geo('white', 'deco', new THREE.CylinderGeometry(0.12, 0.09, 0.2, 10), xs + 2.3, L + 0.92, -7.2); // 난초 화분 (책상 끝 사이드)
      B.geo('shrub', 'deco', new THREE.IcosahedronGeometry(0.15, 0), xs + 2.3, L + 1.12, -7.2);
      B.box('darkWood', 'deco', xs + 2.0, xs + 2.6, L, L + 0.82, -7.5, -6.9); // 사이드 장
      block(k, xs + 2.0, xs + 2.6, -7.5, -6.9);
      // 책장 위 상장·상패
      for (let i = 0; i < 3; i++) B.box('white', 'deco', xs + 0.2, xs + 0.24, L + 2.2, L + 2.5, -2.4 + i * 0.5, -2.15 + i * 0.5);
      B.box('gold', 'deco', xs + 0.3, xs + 0.42, L + 2.12, L + 2.45, -1.2, -1.0);
      // 바닥 카펫 (소파 자리) + 창가 벨벳 커튼 느낌은 기존 커튼 사용
      B.box('wine', 'deco', xs + 4.5, xs + 8.6, L + 0.005, L + 0.02, -6.8, -2.2);
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
      // 2000년대 교무실 디테일: 커피포트·커피믹스 탁자, 식기건조대·머그잔, 복사기, 심야전기 히터, 출석부 꽂이,
      // 책상마다 교무수첩·서류 더미·전화기, 교무실 칠판 옆 주번 명단, 벽걸이 선풍기, 신문꽂이, 학교 종(핸드벨)
      B.box('deskTop', 'deco', xe - 2.2, xe - 0.9, L + 0.72, L + 0.76, -8.4, -7.6); // 탁자
      for (const lx of [xe - 2.1, xe - 1.0]) B.box('metal', 'deco', lx - 0.03, lx + 0.03, L, L + 0.72, -8.3, -7.7);
      B.geo('white', 'deco', new THREE.CylinderGeometry(0.1, 0.11, 0.22, 10), xe - 2.0, L + 0.87, -8.0); // 커피포트
      B.box('tv', 'deco', xe - 2.05, xe - 1.95, L + 0.98, L + 1.0, -8.05, -7.95);
      B.box('yellow', 'deco', xe - 1.7, xe - 1.45, L + 0.76, L + 0.95, -8.2, -8.0); // 커피믹스 상자
      B.box('red', 'deco', xe - 1.7, xe - 1.45, L + 0.76, L + 0.9, -7.95, -7.75); // 설탕통
      B.box('steel', 'deco', xe - 1.4, xe - 0.95, L + 0.76, L + 0.78, -8.35, -7.65); // 식기건조대
      for (let i = 0; i < 4; i++) B.geo(['white', 'blue', 'ginkgo', 'white'][i], 'deco', new THREE.CylinderGeometry(0.045, 0.04, 0.09, 10), xe - 1.32 + (i % 2) * 0.2, L + 0.83, -8.25 + Math.floor(i / 2) * 0.3);
      block(k, xe - 2.25, xe - 0.85, -8.45, -7.55);
      // 복사기 (문 옆)
      B.box('cabinet', 'deco', xe - 1.0, xe - 0.2, L, L + 0.95, -6.6, -5.8);
      B.box('white', 'deco', xe - 1.05, xe - 0.15, L + 0.95, L + 1.05, -6.65, -5.75);
      B.box('tv', 'deco', xe - 0.9, xe - 0.3, L + 1.05, L + 1.1, -6.3, -6.1);
      B.box('white', 'deco', xe - 1.3, xe - 1.0, L + 0.5, L + 0.53, -6.5, -5.9); // 용지 받침
      block(k, xe - 1.35, xe - 0.15, -6.7, -5.7);
      // 심야전기 히터 (크림색 큰 상자, 앞쪽 벽)
      B.box('beige', 'deco', xs + 2.6, xs + 4.6, L, L + 0.75, -8.75, -8.35);
      for (let i = 0; i < 12; i++) B.box('cabinet', 'deco', xs + 2.7 + i * 0.16, xs + 2.74 + i * 0.16, L + 0.1, L + 0.65, -8.35, -8.33);
      block(k, xs + 2.55, xs + 4.65, -8.8, -8.3);
      // 출석부 꽂이 (벽 선반에 반별로 꽂힌 초록 출석부)
      B.box('shelf', 'deco', xs + 5.2, xs + 7.6, L + 1.5, L + 1.55, -8.75, -8.45);
      B.box('shelf', 'deco', xs + 5.2, xs + 7.6, L + 1.85, L + 1.9, -8.75, -8.45);
      for (let i = 0; i < 12; i++) B.box(i % 3 === 2 ? 'leaf1' : 'leaf2', 'deco', xs + 5.3 + i * 0.19, xs + 5.44 + i * 0.19, L + 1.55, L + 1.83, -8.7, -8.5);
      const attLabel = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.18), new THREE.MeshBasicMaterial({ map: textTex(300, 54, '#ffffff', '#2b4a7a', ['출 석 부'], 32, '#2b4a7a') }));
      attLabel.position.set(xs + 6.4, L + 2.05, -8.44);
      scene.add(attLabel);
      // 책상마다 전화기·교무수첩·서류 더미
      for (const cx of [xs + 3.4, xs + 6.4]) for (const dz of [-6.4, -5.6, -3.4, -2.6]) {
        B.box('tv', 'deco', cx + 0.42, cx + 0.6, L + 0.76, L + 0.83, dz - 0.3, dz - 0.1);
        B.box('leaf2', 'deco', cx - 0.9 + 0.05, cx - 0.55, L + 0.76, L + 0.8, dz - 0.3, dz - 0.05);
        for (let i = 0; i < 3; i++) B.box(i % 2 ? 'cork' : 'white', 'deco', cx - 0.9 + 0.05, cx - 0.55, L + 0.8 + i * 0.03, L + 0.83 + i * 0.03, dz + 0.05, dz + 0.3);
      }
      // 주번 명단 + 벽걸이 선풍기 + 신문꽂이 + 핸드벨
      const duty2 = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.8), new THREE.MeshBasicMaterial({ map: textTex(120, 160, '#fff8dc', '#333333', ['이번 주 주번', '1-1 김○○', '2-3 이○○', '3-2 박○○', '', '교무 일정', '월 교직원회의'], 13, '#888888') }));
      duty2.rotation.y = Math.PI / 2;
      duty2.position.set(xs + 0.13, L + 1.8, -1.6);
      scene.add(duty2);
      B.geo('white', 'deco', new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16).rotateX(Math.PI / 2), xe - 0.6, L + 2.6, Z_CORR + 0.25);
      B.geo('white', 'deco', new THREE.CylinderGeometry(0.03, 0.03, 0.25, 6).rotateX(Math.PI / 2), xe - 0.6, L + 2.6, Z_CORR + 0.12);
      B.box('lectern', 'deco', xs + 0.15, xs + 0.55, L, L + 0.9, -8.5, -7.9); // 신문꽂이
      for (let i = 0; i < 4; i++) B.box('white', 'deco', xs + 0.2 + i * 0.08, xs + 0.24 + i * 0.08, L + 0.9, L + 1.3, -8.45, -7.95);
      block(k, xs + 0.15, xs + 0.55, -8.5, -7.9);
      B.geo('gold', 'deco', new THREE.ConeGeometry(0.07, 0.12, 12), xs + 3.4 + 0.7, L + 0.82, -6.4 - 0.1); // 핸드벨
      B.geo('darkWood', 'deco', new THREE.CylinderGeometry(0.012, 0.012, 0.1, 6), xs + 3.4 + 0.7, L + 0.93, -6.4 - 0.1);
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
      // 2000년대 보건실 디테일: 약장 속 약병·붕대, 시력검사표·신체 포스터, 침대 옆 작은 탁자·물컵, 체온계·소독약·솜 쟁반, 하늘색 체중계,
      // 세면대·비누·수건, 휴지통(빨간 뚜껑), 담요 접어둔 것, 보건일지, 안대 걸이, 작은 냉장고(얼음주머니), 긴 의자
      for (let i = 0; i < 8; i++) B.box(['white', 'yellow', 'blue', 'red'][i % 4], 'deco', xs + 0.2 + (i % 4) * 0.1, xs + 0.26 + (i % 4) * 0.1, L + 1.0 + Math.floor(i / 4) * 0.4, L + 1.12 + Math.floor(i / 4) * 0.4, -7.2, -7.0); // 약병
      for (let i = 0; i < 3; i++) B.geo('white', 'deco', new THREE.CylinderGeometry(0.05, 0.05, 0.06, 10).rotateZ(Math.PI / 2), xs + 0.37, L + 0.65, -6.3 + i * 0.15); // 붕대 롤
      B.box('glass', 'glass', xs + 0.6, xs + 0.62, L + 0.5, L + 1.8, -7.45, -5.55); // 약장 유리문
      const eye = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.9), new THREE.MeshBasicMaterial({ map: textTex(100, 180, '#ffffff', '#111111', ['시력검사표', 'ㄷ  ㅇ  ㄱ', 'ㅁ ㅇ ㅈ ㄷ', 'ㄱㅇㅁㅅㄷ', 'ㅅㅈㄷㅇㄱㅁ'], 13, '#888888') }));
      eye.rotation.y = Math.PI / 2;
      eye.position.set(xs + 0.13, L + 1.9, -3.0);
      scene.add(eye);
      const body = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.85), new THREE.MeshBasicMaterial({ map: textTex(120, 170, '#e8f4ff', '#2b4a7a', ['바른 자세', '🧍', '손 씻기', '6단계'], 16, '#2b4a7a') }));
      body.position.set(xs + 4.5, L + 2.1, Z_CORR + 0.12);
      scene.add(body);
      B.geo('metal', 'deco', new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8), xs + 0.55, L + 0.35, -4.15); // 키재기 눈금 막대 보강
      // 침대 사이 작은 탁자 + 물컵·체온계 쟁반, 접은 담요, 안대
      B.box('white', 'deco', xe - 1.9, xe - 1.3, L, L + 0.6, -6.3, -5.8);
      B.box('steel', 'deco', xe - 1.85, xe - 1.35, L + 0.6, L + 0.62, -6.25, -5.85);
      B.geo('white', 'deco', new THREE.CylinderGeometry(0.035, 0.03, 0.09, 10), xe - 1.75, L + 0.66, -6.1);
      B.box('white', 'deco', xe - 1.55, xe - 1.4, L + 0.62, L + 0.635, -6.15, -6.0);
      B.box('paleGreen', 'deco', xe - 0.65, xe - 0.25, L + 0.72, L + 0.84, -7.6, -7.3); // 접은 담요
      block(k, xe - 1.95, xe - 1.25, -6.35, -5.75);
      // 하늘색 체중계 + 세면대·비누·수건
      B.box('blue', 'deco', xs + 1.0, xs + 1.4, L, L + 0.06, -4.3, -3.9);
      B.box('white', 'deco', xs + 1.1, xs + 1.3, L + 0.06, L + 0.1, -4.25, -4.15);
      B.box('white', 'deco', xs + 0.15, xs + 0.65, L + 0.7, L + 0.85, -1.3, -0.8); // 세면대
      B.box('white', 'deco', xs + 0.15, xs + 0.3, L, L + 0.7, -1.15, -0.95);
      B.geo('steel', 'deco', new THREE.CylinderGeometry(0.02, 0.02, 0.2, 6), xs + 0.25, L + 0.95, -1.05);
      B.geo('yellow', 'deco', new THREE.SphereGeometry(0.035, 8, 6).scale(1, 0.6, 1.3), xs + 0.5, L + 0.87, -0.9);
      B.box('ginkgo', 'deco', xs + 0.7, xs + 0.74, L + 1.0, L + 1.35, -1.25, -0.95); // 수건
      block(k, xs + 0.1, xs + 0.7, -1.35, -0.75);
      B.geo('white', 'deco', new THREE.CylinderGeometry(0.14, 0.12, 0.35, 10), xs + 3.0, L + 0.18, -1.0); // 휴지통
      B.geo('red', 'deco', new THREE.CylinderGeometry(0.15, 0.15, 0.03, 10), xs + 3.0, L + 0.37, -1.0);
      block(k, xs + 2.8, xs + 3.2, -1.2, -0.8);
      // 소독약·솜 쟁반 + 보건일지 (책상 위)
      B.box('steel', 'deco', xs + 1.1, xs + 1.5, L + 0.76, L + 0.78, -2.3, -2.0);
      B.geo('white', 'deco', new THREE.CylinderGeometry(0.04, 0.04, 0.14, 8), xs + 1.2, L + 0.85, -2.15);
      B.geo('white', 'deco', new THREE.SphereGeometry(0.04, 8, 6), xs + 1.4, L + 0.82, -2.15);
      B.box('leaf2', 'deco', xs + 1.55, xs + 1.95, L + 0.76, L + 0.8, -1.7, -1.3);
      // 작은 냉장고 (얼음주머니) + 긴 나무 의자 (기다리는 학생)
      B.box('white', 'deco', xs + 3.4, xs + 4.0, L, L + 0.85, -8.6, -8.0);
      B.box('steel', 'deco', xs + 3.95, xs + 4.0, L + 0.3, L + 0.7, -8.5, -8.48);
      block(k, xs + 3.35, xs + 4.05, -8.65, -7.95);
      B.box('chair', 'chair', xs + 5.0, xs + 7.4, L + 0.42, L + 0.47, -8.5, -8.1);
      B.box('chair', 'chair', xs + 5.0, xs + 7.4, L + 0.47, L + 0.85, -8.55, -8.5);
      for (const lx of [xs + 5.1, xs + 7.3]) B.box('metal', 'deco', lx - 0.03, lx + 0.03, L, L + 0.42, -8.45, -8.15);
      block(k, xs + 4.95, xs + 7.45, -8.6, -8.05);
      for (const cx of [xs + 5.5, xs + 6.3, xs + 7.0]) chairs.push({ x: cx, z: -8.3, seatY: L + 0.47, ry: Math.PI, level: k, room: room.id });
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
      new THREE.MeshBasicMaterial({ map: textTex(256, 92, '#f7f2e2', '#2b2b2b', [room.type === 'class' ? room.id.replace('-', ' - ') : room.name], 54, '#7a5532'), side: THREE.DoubleSide }),
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
      const x1 = k === 0 && s.xs < BACKDOOR.x1 && s.xe > BACKDOOR.x2 ? BACKDOOR.x2 + 0.4 : s.xs + 2.2;
      const x2 = k === 1 && s.xs < BRIDGE.minX && s.xe > BRIDGE.maxX ? BRIDGE.minX - 0.6 : s.xe - 2.2;
      B.box('lectern', 'deco', x1, x2, L, L + 0.85, Z_BACK + 0.2, Z_BACK + 0.6);
      const n = Math.round((x2 - x1) / 0.5);
      for (let i = 1; i < n; i++) B.box('darkWood', 'deco', x1 + i * 0.5 - 0.02, x1 + i * 0.5 + 0.02, L + 0.05, L + 0.8, Z_BACK + 0.6, Z_BACK + 0.62);
      B.box('darkWood', 'deco', x1, x2, L + 0.42, L + 0.45, Z_BACK + 0.6, Z_BACK + 0.62);
      block(k, x1, x2, Z_BACK + 0.2, Z_BACK + 0.6);
    }
  }

  // ── 상담실(2층) · 도서실(3층): 가운데 칸 ──
  for (const room of CLASSROOMS.filter((r) => r.type === 'counsel' || r.type === 'library')) {
    const k = room.level;
    const L = levelY(k);
    const { xs, xe } = room;
    const ox = (xs + xe) / 2;
    const Bx = {
      box: (m, r, x1, x2, y1, y2, z1, z2) => B.box(m, r, x1 + ox, x2 + ox, y1, y2, z1, z2),
      geo: (m, r, g, x, y, z) => B.geo(m, r, g, x + ox, y, z),
    };
    const blockx = (kk, x1, x2, z1, z2) => block(kk, x1 + ox, x2 + ox, z1, z2);
    if (room.type === 'counsel') {
      // 상담실: 소파 두 개 마주 보고, 낮은 탁자, 화분, 책장
      sofa(k, L, ox - 2.0, ox + 2.0, -6.4, -5.6, 'z-');
      sofa(k, L, ox - 2.0, ox + 2.0, -3.4, -2.6, 'z+');
      Bx.box('white', 'deco', -1.2, 1.2, L + 0.38, L + 0.42, -5.0, -4.0);
      Bx.box('metal', 'deco', -1.0, 1.0, L, L + 0.38, -4.55, -4.45);
      blockx(k, -1.2, 1.2, -5.0, -4.0);
      plant(xs + 0.6, -1.0, L);
      plant(xe - 0.6, -1.0, L);
      blockx(k, (xs - ox) + 0.35, (xs - ox) + 0.85, -1.25, -0.75);
      blockx(k, (xe - ox) - 0.85, (xe - ox) - 0.35, -1.25, -0.75);
      Bx.box('shelf', 'deco', (xs - ox) + 0.1, (xs - ox) + 0.5, L, L + 2.0, -8.4, -6.0);
      blockx(k, (xs - ox) + 0.1, (xs - ox) + 0.5, -8.4, -6.0);
    } else {
      // 도서실: 알록달록한 책이 꽂힌 벽 책장·가운데 양면 책장, 대출 데스크와 사서 선생님, 열람 탁자, 잡지꽂이, 반납함
      const bookCols = ['red', 'yellow', 'blue', 'leaf2', 'books', 'ginkgo', 'white', 'cork', 'tv'];
      let bi = 0;
      const bookRow = (alongX, a1, a2, y, c1, c2) => {
        let a = a1;
        while (a < a2 - 0.05) {
          const w = 0.05 + ((bi * 7) % 5) * 0.012;
          const h = 0.22 + ((bi * 11) % 4) * 0.03;
          const e = Math.min(a2, a + w);
          if (alongX) Bx.box(bookCols[bi % bookCols.length], 'deco', a, e - 0.005, y, y + h, c1, c2);
          else Bx.box(bookCols[bi % bookCols.length], 'deco', c1, c2, y, y + h, a, e - 0.005);
          a = e;
          bi++;
        }
      };
      for (const x1 of [(xs - ox) + 0.1, (xe - ox) - 0.5]) {
        Bx.box('shelf', 'deco', x1, x1 + 0.4, L, L + 2.2, -8.6, -0.6);
        for (let i = 0; i < 5; i++) {
          Bx.box('shelf', 'deco', x1, x1 + 0.4, L + 0.05 + i * 0.43, L + 0.08 + i * 0.43, -8.6, -0.6);
          bookRow(false, -8.5, -0.7, L + 0.08 + i * 0.43, x1 + 0.05, x1 + 0.35);
        }
        blockx(k, x1, x1 + 0.4, -8.6, -0.6);
      }
      // 가운데 양면 책장 2개
      for (const [x1, x2] of [[-3.8, -0.9], [0.9, 3.8]]) {
        Bx.box('shelf', 'deco', x1, x2, L, L + 1.6, -6.15, -5.65);
        for (let i = 0; i < 3; i++) {
          Bx.box('shelf', 'deco', x1, x2, L + 0.05 + i * 0.5, L + 0.08 + i * 0.5, -6.17, -5.63);
          bookRow(true, x1 + 0.05, x2 - 0.05, L + 0.08 + i * 0.5, -6.12, -5.92);
          bookRow(true, x1 + 0.05, x2 - 0.05, L + 0.08 + i * 0.5, -5.88, -5.68);
        }
        blockx(k, x1, x2, -6.15, -5.65);
      }
      // 대출 데스크 + 모니터 + 도장, 사서 선생님 자리
      Bx.box('lectern', 'deco', -3.6, -1.5, L, L + 0.95, -7.9, -7.3);
      Bx.box('white', 'deco', -3.65, -1.45, L + 0.95, L + 0.99, -7.95, -7.25);
      Bx.box('beige', 'deco', -3.0, -2.6, L + 0.99, L + 1.35, -8.0, -7.6);
      Bx.box('screen', 'deco', -2.98, -2.62, L + 1.05, L + 1.31, -7.6, -7.59);
      Bx.box('red', 'deco', -2.1, -1.95, L + 0.99, L + 1.05, -7.6, -7.45);
      blockx(k, -3.65, -1.45, -7.95, -7.25);
      const desk = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), new THREE.MeshBasicMaterial({ map: textTex(240, 60, '#3f7e4e', '#ffffff', ['대출 · 반납'], 34) }));
      desk.position.set(ox - 2.55, L + 0.75, -7.24);
      scene.add(desk);
      staffSeats.push({ room: room.id, level: k, x: ox - 2.55, z: -8.45, seatY: L + 0.5, ry: 0, role: 'librarian' });
      // 반납함
      Bx.box('blue', 'deco', 1.3, 1.9, L, L + 0.8, -8.5, -8.0);
      Bx.box('tv', 'deco', 1.4, 1.8, L + 0.6, L + 0.64, -8.0, -7.99);
      blockx(k, 1.3, 1.9, -8.5, -8.0);
      // 열람 탁자 2개 + 의자 (앉을 수 있음)
      for (const tz of [-3.9, -1.6]) {
        Bx.box('deskTop', 'deco', -1.8, 1.8, L + 0.72, L + 0.77, tz - 0.45, tz + 0.45);
        for (const lx of [-1.6, 1.6]) Bx.box('metal', 'deco', lx - 0.04, lx + 0.04, L, L + 0.72, tz - 0.35, tz + 0.35);
        blockx(k, -1.8, 1.8, tz - 0.45, tz + 0.45);
        for (const cx of [-1.15, 0, 1.15]) {
          for (const [cz, ry] of [[tz - 0.8, 0], [tz + 0.8, Math.PI]]) {
            if (cz > -0.75) continue; // 창가 쪽 의자는 생략
            Bx.box('chair', 'chair', cx - 0.2, cx + 0.2, L + 0.42, L + 0.46, cz - 0.19, cz + 0.19);
            const bz = ry === 0 ? cz - 0.19 : cz + 0.17;
            Bx.box('chair', 'chair', cx - 0.19, cx + 0.19, L + 0.46, L + 0.86, bz, bz + 0.03);
            for (const lz of [cz - 0.16, cz + 0.16]) Bx.box('metal', 'deco', cx - 0.17, cx + 0.17, L, L + 0.42, lz - 0.01, lz + 0.01);
            chairs.push({ x: cx + ox, z: cz, seatY: L + 0.45, ry, level: k, room: 'library' });
          }
        }
        Bx.box('ginkgo', 'deco', -0.9, -0.6, L + 0.77, L + 0.8, tz - 0.25, tz - 0.05);
        Bx.box('blue', 'deco', 0.4, 0.7, L + 0.77, L + 0.82, tz + 0.05, tz + 0.25);
      }
      // 잡지꽂이 (창가)
      const rack = new THREE.BoxGeometry(1.2, 1.0, 0.08);
      rack.rotateX(-0.3);
      Bx.geo('shelf', 'deco', rack, 3.0, L + 0.6, -1.05);
      for (let i = 0; i < 4; i++) Bx.box(bookCols[i + 1], 'deco', 2.5 + i * 0.28, 2.75 + i * 0.28, L + 0.45, L + 0.85, -0.95, -0.9);
      blockx(k, 2.35, 3.65, -1.3, -0.7);
      // 표어 · 조용히
      const motto = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.5), new THREE.MeshBasicMaterial({ map: textTex(600, 100, '#f7f2e2', '#3b5a8a', ['책 속에 길이 있다'], 54, '#7a5532') }));
      motto.position.set(ox + 1.3, L + 2.55, Z_CORR + 0.13);
      scene.add(motto);
      const quiet = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.3), new THREE.MeshBasicMaterial({ map: textTex(240, 80, '#c8473d', '#ffffff', ['쉿! 조용히'], 40) }));
      quiet.rotation.y = -Math.PI / 2;
      quiet.position.set(xe - 0.52, L + 2.45, -4.6);
      scene.add(quiet);
        }
  }

  // ── 가운데 칸 1층: 중앙현관 로비 (양쪽 신발장 + 트로피 진열장 + 학교 안내도) ──
  const hall = SLOTS.find((s) => s.type === 'hall');
  {
    const L = levelY(0);
    B.box('locker', 'deco', hall.xe - 0.6, hall.xe - 0.1, L, L + 1.8, -8, -1);
    block(0, hall.xe - 0.6, hall.xe - 0.1, -8, -1);
    B.box('locker', 'deco', hall.xs + 0.1, hall.xs + 0.6, L, L + 1.8, -8, -4.6);
    block(0, hall.xs + 0.1, hall.xs + 0.6, -8, -4.6);
    B.box('darkWood', 'deco', hall.xs + 0.1, hall.xs + 0.6, L, L + 2.0, -4.2, -1.2);
    B.box('glass', 'glass', hall.xs + 0.55, hall.xs + 0.6, L + 0.9, L + 1.9, -4.1, -1.3);
    for (let i = 0; i < 6; i++) B.geo('gold', 'deco', new THREE.ConeGeometry(0.09, 0.26, 10), hall.xs + 0.35, L + 1.05 + (i % 2) * 0.45, -3.9 + i * 0.48);
    block(0, hall.xs + 0.1, hall.xs + 0.6, -4.2, -1.2);
    const map = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.0), new THREE.MeshBasicMaterial({ map: textTex(420, 300, '#f4efe0', '#2b4a7a', ['학교 안내도', '1층 교무실·행정실·보건실', '2층 상담실 · 3층 도서실'], 34, '#7a5532') }));
    map.rotation.y = -Math.PI / 2;
    map.position.set(hall.xe - 0.62, L + 2.6, -5.5);
    scene.add(map);
    for (const lx of [-2.5, 2.5]) for (const lz of [-7, -2]) B.box('lamp', 'deco', lx - 0.6, lx + 0.6, L + 3.32, L + 3.38, lz - 0.08, lz + 0.08);
  }

  // ── 중앙 계단실 (본관 뒤로 튀어나옴): 복도에서 곧장 오르는 넓은 가운데 계단 → 창문 있는 층계참 → 양옆으로 꺾여 올라가는 계단 ──
  // 테라조 계단 + 주황 미끄럼방지 + 스테인리스 난간, 층계참에 큰 벽시계·액자
  {
    const C = CSTAIR;
    const top = levelY(LEVELS);
    const n = C.steps;
    const run = (C.z0 - C.z1) / n;
    const rise = 1.8 / n;
    // 바깥 벽 (서·동) + 뒤벽(층계참 높이마다 창문 띠) + 지붕
    B.box('cream', 'wall', C.xs - WALL_T, C.xs, 0, top, C.z2 - WALL_T, C.z0);
    B.box('cream', 'wall', C.xe, C.xe + WALL_T, 0, top, C.z2 - WALL_T, C.z0);
    {
      const zb1 = C.z2 - WALL_T;
      const zb2 = C.z2;
      let y = 0;
      for (let k = 0; k < LEVELS - 1; k++) {
        const Lp = levelY(k) + 1.8;
        B.box('cream', 'wall', C.xs - WALL_T, C.xe + WALL_T, y, Lp + 0.9, zb1, zb2);
        B.box('cream', 'wall', C.xs - WALL_T, C.xs + 0.6, Lp + 0.9, Lp + 2.5, zb1, zb2);
        B.box('cream', 'wall', C.xe - 0.6, C.xe + WALL_T, Lp + 0.9, Lp + 2.5, zb1, zb2);
        B.box('glass', 'glass', C.xs + 0.6, C.xe - 0.6, Lp + 0.9, Lp + 2.5, zb1 + 0.06, zb2 - 0.06);
        for (let i = 0; i <= 4; i++) {
          const wx = C.xs + 0.6 + ((C.xe - C.xs - 1.2) * i) / 4;
          B.box('frame', 'deco', wx - 0.04, wx + 0.04, Lp + 0.9, Lp + 2.5, zb1 - 0.02, zb2 + 0.02);
        }
        B.box('frame', 'deco', C.xs + 0.6, C.xe - 0.6, Lp + 1.7, Lp + 1.76, zb1 - 0.02, zb2 + 0.02);
        y = Lp + 2.5;
      }
      B.box('cream', 'wall', C.xs - WALL_T, C.xe + WALL_T, y, top, zb1, zb2);
    }
    B.box('roof', 'wall', C.xs - WALL_T - 0.2, C.xe + WALL_T + 0.2, top, top + 0.2, C.z2 - WALL_T - 0.2, C.z0);
    B.box('cream', 'wall', C.xs - WALL_T, C.xe + WALL_T, top, top + 0.6, C.z2 - WALL_T, C.z2 - WALL_T + 0.2); // 옥상 난간 느낌
    block(ROOF, C.xs - 0.5, C.xe + 0.5, C.z2 - 1, C.z0);
    // 복도 뒤벽: 계단실 입구는 뚫림, 위에 보만
    for (let k = 0; k < LEVELS; k++) {
      const L = levelY(k);
      B.box('cream', 'wall', C.xs - WALL_T, C.xe + WALL_T, L + 2.7, L + LEVEL_H - 0.2, Z_BACK, Z_BACK + WALL_T);
      const lintelSign = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.34), new THREE.MeshBasicMaterial({ map: textTex(280, 68, '#2f6a3f', '#ffffff', [k === 0 ? '중앙 계단 · 2층 ↑' : k === LEVELS - 1 ? '중앙 계단 · 아래로 ↓' : `중앙 계단 · ${k + 2}층 ↑`], 34) }));
      lintelSign.position.set(0, L + 2.95, Z_BACK + WALL_T + 0.02);
      scene.add(lintelSign);
    }
    const rail = (x, z1, z2, y1, y2) => {
      // 비스듬한 스테인리스 손잡이 (z1,y1) → (z2,y2) + 기둥
      const len = Math.hypot(z2 - z1, y2 - y1);
      const g = new THREE.CylinderGeometry(0.03, 0.03, len, 8);
      g.rotateX(Math.PI / 2 + Math.atan2(y2 - y1, z2 - z1) * -1);
      B.geo('steel', 'deco', g, x, (y1 + y2) / 2 + 0.95, (z1 + z2) / 2);
      const nPost = Math.max(2, Math.round(Math.abs(z2 - z1) / 0.8));
      for (let i = 0; i <= nPost; i++) {
        const t = i / nPost;
        const z = z1 + (z2 - z1) * t;
        const y = y1 + (y2 - y1) * t;
        B.geo('steel', 'deco', new THREE.CylinderGeometry(0.018, 0.018, 0.95, 6), x, y + 0.475, z);
      }
    };
    const flatRail = (x1, x2, y, z) => {
      const g = new THREE.CylinderGeometry(0.03, 0.03, Math.abs(x2 - x1), 8);
      g.rotateZ(Math.PI / 2);
      B.geo('steel', 'deco', g, (x1 + x2) / 2, y + 0.95, z);
      for (let x = Math.min(x1, x2); x <= Math.max(x1, x2) + 0.01; x += 0.6) B.geo('steel', 'deco', new THREE.CylinderGeometry(0.018, 0.018, 0.95, 6), x, y + 0.475, z);
    };
    for (let k = 0; k < LEVELS; k++) {
      const L = levelY(k);
      if (k < LEVELS - 1) {
        // 가운데 계단 (복도 z0 → 층계참 z1)
        for (let i = 0; i < n; i++) {
          const t = L + rise * (i + 1);
          B.box('terrazzo', 'stair', -C.cw, C.cw, Math.max(k === 0 ? 0 : L - 0.2, t - 0.45), t, C.z0 - run * (i + 1), C.z0 - run * i);
          B.box('orangePaint', 'deco', -C.cw + 0.05, C.cw - 0.05, t, t + 0.01, C.z0 - run * (i + 1), C.z0 - run * (i + 1) + 0.06);
        }
        // 층계참 (가로로 길게, 뒤쪽 창문 아래)
        B.box('terrazzo', 'stair', C.xs, C.xe, L + 1.6, L + 1.8, C.z2, C.z1);
        if (k === 0) B.box('cream', 'wall', C.xs, C.xe, 0, 1.6, C.z2, C.z1);
        // 양옆 계단 (층계참 z1 → 위층 복도 z0)
        for (const sx of [-1, 1]) {
          const xa = Math.min(sx * C.sw1, sx * C.sw2);
          const xb = Math.max(sx * C.sw1, sx * C.sw2);
          for (let i = 0; i < n; i++) {
            const t = L + 1.8 + rise * (i + 1);
            B.box('terrazzo', 'stair', xa, xb, t - 0.45, t, C.z1 + run * i, C.z1 + run * (i + 1));
            B.box('orangePaint', 'deco', xa + 0.05, xb - 0.05, t, t + 0.01, C.z1 + run * (i + 1) - 0.06, C.z1 + run * (i + 1));
          }
          // 양옆 계단 밑 비스듬한 판
          const g = new THREE.BoxGeometry(xb - xa, 0.25, Math.hypot(C.z0 - C.z1, 1.8));
          g.rotateX(-Math.atan2(1.8, C.z0 - C.z1));
          B.geo('concrete', 'wall', g, (xa + xb) / 2, L + 1.8 + 0.9 - 0.36, (C.z0 + C.z1) / 2);
          // 양옆 계단 안쪽 난간 (가운데 계단과 사이)
          rail(sx * (C.sw1 + 0.03), C.z1, C.z0, L + 1.8, L + 3.6);
          // 1층은 양옆 계단 밑이 뚫려 보이지 않게 계단 밑 창고 벽 (계단 경사 따라 높이가 올라감)
          if (k === 0) {
            for (let i = 0; i < 6; i++) {
              const za = C.z1 + ((C.z0 - C.z1) * i) / 6;
              const zb = C.z1 + ((C.z0 - C.z1) * (i + 1)) / 6;
              const topY = L + 1.8 + (1.8 * i) / 6 - 0.3;
              B.box('cream', 'wall', xa, xb, 0, topY, za, zb);
            }
            B.box('door', 'deco', sx > 0 ? xa + 0.02 : xb - 0.06, sx > 0 ? xa + 0.06 : xb - 0.02, L, L + 1.6, C.z0 - 1.6, C.z0 - 0.7); // 창고 문
          }
        }
        // 가운데 계단 밑 비스듬한 판
        {
          const g = new THREE.BoxGeometry(C.cw * 2, 0.25, Math.hypot(C.z0 - C.z1, 1.8));
          g.rotateX(Math.atan2(1.8, C.z0 - C.z1));
          B.geo('concrete', 'wall', g, 0, L + 0.9 - 0.36, (C.z0 + C.z1) / 2);
        }
        // 가운데 계단 양옆 난간
        for (const sx of [-1, 1]) rail(sx * (C.cw - 0.08), C.z0, C.z1, L, L + 1.8);
        // 층계참 벽: 큰 벽시계 + 액자 + 소화기
        const clock = new THREE.Mesh(new THREE.CircleGeometry(0.42, 32), new THREE.MeshBasicMaterial({ map: textTex(200, 200, '#fbf8f0', '#2b2b2b', ['12', '9      3', '6'], 34, '#5a4030') }));
        clock.position.set(0, L + 1.8 + 3.0, C.z2 + 0.02);
        scene.add(clock);
        B.geo('tv', 'deco', new THREE.BoxGeometry(0.02, 0.3, 0.015), 0, L + 1.8 + 3.1, C.z2 + 0.03);
        B.geo('tv', 'deco', new THREE.BoxGeometry(0.22, 0.02, 0.015), 0.1, L + 1.8 + 3.0, C.z2 + 0.03);
        const frame = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.4), new THREE.MeshBasicMaterial({ map: textTex(120, 280, '#f7f2e2', '#3b3226', ['바', '른', '생', '활'], 40, '#5a4030') }));
        frame.position.set(C.xs + 0.3 + 0.35, L + 1.8 + 2.2, C.z2 + 0.02);
        frame.position.x = C.xs + 0.35;
        scene.add(frame);
        B.box('red', 'deco', C.xe - 0.55, C.xe - 0.2, L + 1.8, L + 1.8 + 0.5, C.z2 + 0.05, C.z2 + 0.35);
        B.geo('red', 'deco', new THREE.CylinderGeometry(0.07, 0.07, 0.4, 10), C.xe - 0.37, L + 1.8 + 0.72, C.z2 + 0.2);
      } else {
        // 꼭대기 층: 가운데 뚫린 자리 앞 난간
        flatRail(-C.cw, C.cw, L, C.z0 - 0.08);
      }
      // 위층: 가운데 계단 시작과 양옆 계단 도착 사이 짧은 난간 기둥
      if (k > 0) for (const sx of [-1, 1]) B.geo('steel', 'deco', new THREE.CylinderGeometry(0.03, 0.03, 0.95, 8), sx * (C.cw + 0.02), L + 0.475, C.z0 - 0.08);
      // 형광등
      B.box('lamp', 'deco', -0.6, 0.6, L + 3.32, L + 3.38, C.z1 - 0.08, C.z1 + 0.08);
      block(k, C.xs - WALL_T, C.xe + WALL_T, C.z2 - WALL_T, C.z0); // 평면 길찾기에서는 제외 (계단 경로점으로만)
    }
  }

  // 글자 팻말 (평면)
  const signPlane = (lines, w, h, x, y, z, ry = 0, bg = '#2f6a3f', fg = '#ffffff', size = 44, border) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: textTex(Math.round(w * 200), Math.round(h * 200), bg, fg, lines, size, border), side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.rotation.y = ry;
    scene.add(m);
    return m;
  };
  // ── 화장실 (양끝 계단실 옆, 본관 뒤로 튀어나온 7×5m): 서쪽 남자 · 동쪽 여자 ──
  // 흰 타일 벽·바닥, 하늘색 칸막이 변기 칸 4개, 소변기(남), 세면대 3개 + 큰 거울, 청소 도구, 환풍기
  for (let k = 0; k < LEVELS; k++) {
    const L = levelY(k);
    const yb = k === 0 ? 0 : L - 0.2;
    for (const st of STAIRS) {
      if (st.center) continue;
      const west = st.xs < 0;
      const dir = west ? 1 : -1; // 바깥 벽 → 복도 가운데 방향
      const outer = west ? st.xs : st.xe; // 건물 끝 벽
      const inner = west ? st.xe : st.xs;
      const ix1 = Math.min(outer + dir * WALL_T, inner - dir * WALL_T);
      const ix2 = Math.max(outer + dir * WALL_T, inner - dir * WALL_T);
      const z1 = TOILET.z1 + WALL_T; // 안쪽 뒤벽
      const z2 = Z_BACK; // 복도 쪽 벽 (문 있음)
      // 바닥 + 벽 + 지붕
      B.box('tileCheck', 'floor', ix1, ix2, yb, L + 0.01, z1, z2);
      B.box('cream', 'wall', Math.min(outer, outer + dir * WALL_T), Math.max(outer, outer + dir * WALL_T), yb, L + LEVEL_H - 0.2, TOILET.z1, z2);
      B.box('cream', 'wall', Math.min(inner, inner - dir * WALL_T), Math.max(inner, inner - dir * WALL_T), yb, L + LEVEL_H - 0.2, TOILET.z1, z2);
      // 뒤벽: 위쪽 작은 창 (불투명 유리 느낌)
      B.box('cream', 'wall', outer, inner, yb, L + 2.0, TOILET.z1, z1);
      B.box('cream', 'wall', outer, inner, L + 2.6, L + LEVEL_H - 0.2, TOILET.z1, z1);
      B.box('glass', 'glass', ix1 + 0.3, ix2 - 0.3, L + 2.0, L + 2.6, TOILET.z1 + 0.06, z1 - 0.06);
      for (let i = 0; i <= 4; i++) {
        const wx = ix1 + 0.3 + ((ix2 - ix1 - 0.6) * i) / 4;
        B.box('frame', 'deco', wx - 0.03, wx + 0.03, L + 2.0, L + 2.6, TOILET.z1 - 0.02, z1 + 0.02);
      }
      B.box('cream', 'wall', outer, inner, L + 2.0, L + 2.6, TOILET.z1, TOILET.z1 + 0.02);
      if (k === LEVELS - 1) {
        B.box('roof', 'wall', Math.min(outer, inner) - 0.2, Math.max(outer, inner) + 0.2, L + LEVEL_H - 0.2, L + LEVEL_H, TOILET.z1 - 0.2, z2);
        block(ROOF, Math.min(outer, inner) - 0.5, Math.max(outer, inner) + 0.5, TOILET.z1 - 1, z2);
      } else B.box('cream', 'wall', outer, inner, L + LEVEL_H - 0.2, L + LEVEL_H, TOILET.z1, z2); // 위층 바닥 두께
      // 벽 전체 베이지 타일 (그 시절 학교 화장실)
      B.box('tileBeige', 'deco', ix1, ix2, L, L + 2.0, z1, z1 + 0.03);
      B.box('tileBeige', 'deco', ix1, ix2, L + 2.6, L + LEVEL_H - 0.2, z1, z1 + 0.03);
      B.box('tileBeige', 'deco', Math.min(outer + dir * WALL_T, outer + dir * (WALL_T + 0.03)), Math.max(outer + dir * WALL_T, outer + dir * (WALL_T + 0.03)), L, L + LEVEL_H - 0.2, z1, z2);
      B.box('tileBeige', 'deco', Math.min(inner - dir * WALL_T, inner - dir * (WALL_T + 0.03)), Math.max(inner - dir * WALL_T, inner - dir * (WALL_T + 0.03)), L, L + LEVEL_H - 0.2, z1, z2);
      B.box('tileBeige', 'deco', ix1, ix2, L, L + LEVEL_H - 0.2, z2 - 0.03, z2);
      // 허리 높이 어두운 초록 띠 타일 (그 시절 화장실 포인트)
      B.box('tileDark', 'deco', ix1, ix2, L + 1.5, L + 1.62, z1, z1 + 0.035);
      B.box('tileDark', 'deco', Math.min(outer + dir * WALL_T, outer + dir * (WALL_T + 0.035)), Math.max(outer + dir * WALL_T, outer + dir * (WALL_T + 0.035)), L + 1.5, L + 1.62, z1, z2);
      B.box('tileDark', 'deco', Math.min(inner - dir * WALL_T, inner - dir * (WALL_T + 0.035)), Math.max(inner - dir * WALL_T, inner - dir * (WALL_T + 0.035)), L + 1.5, L + 1.62, z1, z2);
      B.box('tileDark', 'deco', ix1, ix2, L + 1.5, L + 1.62, z2 - 0.035, z2);
      // 바닥 배수구 (쇠창살)
      B.box('darkMetal', 'deco', (ix1 + ix2) / 2 - 0.15, (ix1 + ix2) / 2 + 0.15, L + 0.011, L + 0.02, z1 + 2.6, z1 + 2.9);
      // 복도 쪽 벽: 문 자리(안쪽 끝)만 뚫림
      const dA = inner - dir * 1.8;
      const dB = inner - dir * 0.8;
      const [da, db] = [Math.min(dA, dB), Math.max(dA, dB)];
      B.box('cream', 'wall', Math.min(outer, inner), da, yb, L + LEVEL_H - 0.2, Z_BACK, Z_BACK + WALL_T);
      B.box('cream', 'wall', db, Math.max(outer, inner), yb, L + LEVEL_H - 0.2, Z_BACK, Z_BACK + WALL_T);
      B.box('cream', 'wall', da, db, L + 2.1, L + LEVEL_H - 0.2, Z_BACK, Z_BACK + WALL_T);
      B.box('woodFrame', 'deco', da - 0.05, da, L, L + 2.13, Z_BACK - 0.02, Z_BACK + WALL_T + 0.02);
      B.box('woodFrame', 'deco', db, db + 0.05, L, L + 2.13, Z_BACK - 0.02, Z_BACK + WALL_T + 0.02);
      B.box('woodFrame', 'deco', da - 0.05, db + 0.05, L + 2.1, L + 2.15, Z_BACK - 0.02, Z_BACK + WALL_T + 0.02);
      B.box('door', 'deco', da + 0.03, da + 0.07, L, L + 2.08, Z_BACK - 0.9, Z_BACK); // 복도 쪽으로 열린 문짝
      B.box('steel', 'deco', da + 0.02, da + 0.08, L + 0.95, L + 1.05, Z_BACK - 0.25, Z_BACK - 0.15);
      // 표지판 (남 / 여)
      const male = west;
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: textTex(100, 100, male ? '#2f6fb3' : '#d9607a', '#ffffff', [male ? '남' : '여'], 56) }));
      sign.position.set((da + db) / 2, L + 2.5, Z_BACK + WALL_T + 0.02);
      scene.add(sign);
      const label = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.3), new THREE.MeshBasicMaterial({ map: textTex(260, 60, '#f7f2e2', '#2b2b2b', [male ? '남자 화장실' : '여자 화장실'], 34, '#7a5532') }));
      label.position.set((da + db) / 2, L + 2.95, Z_BACK + WALL_T + 0.02);
      scene.add(label);
      // 변기 칸 4개 (뒤벽 따라, 깊이 1.3): 상아색 칸막이 + 스테인리스 테두리·발, 문은 반쯤 열림, 쪼그려 앉는 동양식 변기
      const sd = 1.3;
      const sw = (ix2 - ix1 - 0.2) / 5;
      const first = west ? ix1 + 0.1 : ix2 - 0.1 - sw * 4; // 복도 가운데 쪽 한 칸은 청소 도구함
      for (let i = 0; i < 4; i++) {
        const sa = first + i * sw;
        const sb = sa + sw;
        const panel = (x1, x2, zz1, zz2) => {
          B.box('ivory', 'deco', x1, x2, L + 0.18, L + 2.0, zz1, zz2);
          B.box('steel', 'deco', x1 - 0.005, x2 + 0.005, L + 1.98, L + 2.02, zz1 - 0.005, zz2 + 0.005);
          B.box('steel', 'deco', x1 - 0.005, x2 + 0.005, L + 0.16, L + 0.2, zz1 - 0.005, zz2 + 0.005);
        };
        panel(sa, sa + 0.03, z1, z1 + sd);
        if (i === 3) panel(sb - 0.03, sb, z1, z1 + sd);
        for (const fz of [z1 + 0.2, z1 + sd - 0.2]) B.geo('steel', 'deco', new THREE.CylinderGeometry(0.02, 0.02, 0.18, 6), sa + 0.015, L + 0.09, fz);
        // 문짝: 짝수 칸은 반쯤 열림, 홀수 칸은 닫힘
        if (i % 2 === 0) {
          const dg = new THREE.BoxGeometry(sw - 0.16, 1.82, 0.03);
          dg.translate((sw - 0.16) / 2, 0, 0);
          dg.rotateY(-0.55);
          B.geo('ivory', 'deco', dg, sa + 0.08, L + 1.09, z1 + sd - 0.015);
        } else {
          B.box('ivory', 'deco', sa + 0.08, sb - 0.08, L + 0.18, L + 2.0, z1 + sd - 0.03, z1 + sd);
          B.box('steel', 'deco', sb - 0.22, sb - 0.17, L + 0.95, L + 1.05, z1 + sd - 0.05, z1 + sd + 0.01);
        }
        // 동양식 변기 (바닥에 묻힌 흰 도기 + 길쭉한 구멍) + 물탱크 파이프
        B.box('white', 'deco', (sa + sb) / 2 - 0.22, (sa + sb) / 2 + 0.22, L + 0.01, L + 0.06, z1 + 0.25, z1 + 0.85);
        B.box('tv', 'deco', (sa + sb) / 2 - 0.07, (sa + sb) / 2 + 0.07, L + 0.06, L + 0.065, z1 + 0.35, z1 + 0.75);
        // 높은 물탱크(고가 수조) + 내려오는 파이프 + 당기는 쇠줄
        B.box('cabinet', 'deco', (sa + sb) / 2 - 0.22, (sa + sb) / 2 + 0.22, L + 2.1, L + 2.4, z1 + 0.04, z1 + 0.2);
        B.geo('steel', 'deco', new THREE.CylinderGeometry(0.02, 0.02, 2.05, 6), (sa + sb) / 2 + 0.3, L + 1.08, z1 + 0.1);
        B.geo('tv', 'deco', new THREE.CylinderGeometry(0.006, 0.006, 0.9, 4), (sa + sb) / 2 - 0.12, L + 1.65, z1 + 0.22);
        B.geo('darkWood', 'deco', new THREE.CylinderGeometry(0.02, 0.02, 0.08, 6), (sa + sb) / 2 - 0.12, L + 1.18, z1 + 0.22);
        B.box('cork', 'deco', sa + 0.08, sa + 0.2, L + 1.1, L + 1.25, z1 + 0.6, z1 + 0.72); // 휴지
      }
      block(k, ix1, ix2, z1, z1 + sd + 0.1);
      // 남은 한 칸: 청소 도구 (대걸레·양동이·빗자루)
      {
        const cx = west ? ix2 - 0.1 - sw / 2 : ix1 + 0.1 + sw / 2;
        B.geo('blue', 'deco', new THREE.CylinderGeometry(0.17, 0.14, 0.3, 10), cx - 0.25, L + 0.15, z1 + 0.5);
        B.geo('lectern', 'deco', new THREE.CylinderGeometry(0.015, 0.015, 1.4, 6), cx - 0.2, L + 0.9, z1 + 0.35);
        B.geo('lectern', 'deco', new THREE.CylinderGeometry(0.015, 0.015, 1.2, 6), cx + 0.2, L + 0.8, z1 + 0.25);
        B.box('yellow', 'deco', cx + 0.1, cx + 0.3, L, L + 0.25, z1 + 0.15, z1 + 0.4);
      }
      // 세면대 3개 + 큰 거울 (건물 끝 벽 쪽)
      const sinkX = outer + dir * (WALL_T + 0.03);
      for (let i = 0; i < 3; i++) {
        const sz = z1 + sd + 0.5 + i * 0.85;
        B.box('white', 'deco', Math.min(sinkX, sinkX + dir * 0.55), Math.max(sinkX, sinkX + dir * 0.55), L + 0.72, L + 0.87, sz - 0.3, sz + 0.3);
        B.box('white', 'deco', Math.min(sinkX, sinkX + dir * 0.14), Math.max(sinkX, sinkX + dir * 0.14), L, L + 0.72, sz - 0.1, sz + 0.1);
        B.geo('steel', 'deco', new THREE.CylinderGeometry(0.02, 0.02, 0.22, 6), sinkX + dir * 0.12, L + 0.97, sz);
        B.box('steel', 'deco', sinkX + dir * 0.12 - 0.02, sinkX + dir * 0.12 + 0.02, L + 1.06, L + 1.08, Math.min(sz, sz + 0.14), Math.max(sz, sz + 0.14));
      }
      const mirror = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.8), new THREE.MeshStandardMaterial({ color: '#dfeaf0', metalness: 0.3, roughness: 0.15, emissive: '#8fa6b4', emissiveIntensity: 0.35 }));
      mirror.rotation.y = west ? Math.PI / 2 : -Math.PI / 2;
      mirror.position.set(sinkX + dir * 0.005, L + 1.7, z1 + sd + 0.5 + 0.85);
      scene.add(mirror);
      B.box('frame', 'deco', Math.min(sinkX, sinkX + dir * 0.02), Math.max(sinkX, sinkX + dir * 0.02), L + 1.28, L + 2.12, z1 + sd + 0.03, z1 + sd + 2.67); // 거울 테두리
      B.box('lamp', 'deco', Math.min(sinkX, sinkX + dir * 0.08), Math.max(sinkX, sinkX + dir * 0.08), L + 2.18, L + 2.24, z1 + sd + 0.5, z1 + sd + 2.2); // 거울 위 형광등
      // 세면대마다 줄에 매단 비누 (그물망) + 긴 수도 파이프
      for (let i = 0; i < 3; i++) {
        const sz = z1 + sd + 0.5 + i * 0.85;
        B.geo('tv', 'deco', new THREE.CylinderGeometry(0.004, 0.004, 0.3, 4), sinkX + dir * 0.1, L + 1.13, sz + 0.3);
        B.geo('yellow', 'deco', new THREE.SphereGeometry(0.045, 8, 6).scale(1, 0.7, 1.3), sinkX + dir * 0.1, L + 0.97, sz + 0.3);
      }
      B.geo('steel', 'deco', new THREE.CylinderGeometry(0.02, 0.02, 2.4, 6).rotateX(Math.PI / 2), sinkX + dir * 0.1, L + 1.1, z1 + sd + 1.35);
      // 철망 휴지통 + 표어들
      B.geo('metal', 'deco', new THREE.CylinderGeometry(0.17, 0.14, 0.4, 10), sinkX + dir * 0.45, L + 0.2, z1 + sd + 3.1);
      block(k, Math.min(sinkX + dir * 0.2, sinkX + dir * 0.7), Math.max(sinkX + dir * 0.2, sinkX + dir * 0.7), z1 + sd + 2.85, z1 + sd + 3.35);
      signPlane(['물을 아껴 씁시다'], 0.8, 0.22, sinkX + dir * 0.012, L + 2.4, z1 + sd + 1.35, west ? Math.PI / 2 : -Math.PI / 2, '#2b4a7a', '#ffffff', 30);
      signPlane(['🚭 금연 · 깨끗이 사용합시다'], 1.3, 0.24, (ix1 + ix2) / 2, L + 2.3, z2 - 0.04, Math.PI, '#ffffff', '#c0392b', 28, '#c0392b');
      signPlane(['사용 후 물을 꼭 내립시다'], 1.0, 0.22, (ix1 + ix2) / 2, L + 2.7, z1 + 0.04, 0, '#ffffff', '#2b4a7a', 28, '#2b4a7a');
      block(k, Math.min(sinkX, sinkX + dir * 0.7), Math.max(sinkX, sinkX + dir * 0.7), z1 + sd + 0.1, z2);
      // 소변기 4개 (남자) / 추가 변기 칸 느낌의 낮은 칸막이(여자)는 생략, 안쪽 벽(복도 가운데 쪽)에 붙임
      const uX = inner - dir * (WALL_T + 0.03);
      if (male) {
        for (let i = 0; i < 4; i++) {
          const uz = z1 + sd + 0.6 + i * 0.75;
          const g = new THREE.CylinderGeometry(0.17, 0.12, 0.55, 12, 1, false, 0, Math.PI);
          g.rotateY(west ? Math.PI / 2 : -Math.PI / 2);
          B.geo('white', 'deco', g, uX, L + 0.72, uz);
          B.geo('white', 'deco', new THREE.SphereGeometry(0.17, 12, 8, 0, Math.PI, 0, Math.PI / 2).rotateY(west ? Math.PI / 2 : -Math.PI / 2), uX, L + 1.0, uz);
          B.geo('steel', 'deco', new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6), uX - dir * 0.02, L + 1.3, uz);
          B.box('steel', 'deco', uX - 0.04, uX + 0.04, L + 1.42, L + 1.5, uz - 0.04, uz + 0.04);
          if (i < 3) {
            B.box('ivory', 'deco', Math.min(uX, uX - dir * 0.45), Math.max(uX, uX - dir * 0.45), L + 0.55, L + 1.45, uz + 0.375 - 0.015, uz + 0.375 + 0.015);
            B.box('steel', 'deco', Math.min(uX, uX - dir * 0.46), Math.max(uX, uX - dir * 0.46), L + 1.44, L + 1.47, uz + 0.375 - 0.02, uz + 0.375 + 0.02);
          }
        }
        // 소변기 위 자동 세정 수조 + 가로 파이프
        B.box('cabinet', 'deco', Math.min(uX, uX - dir * 0.2), Math.max(uX, uX - dir * 0.2), L + 2.15, L + 2.45, z1 + sd + 1.3, z1 + sd + 1.9);
        B.geo('steel', 'deco', new THREE.CylinderGeometry(0.02, 0.02, 3.0, 6).rotateX(Math.PI / 2), uX - dir * 0.03, L + 1.55, z1 + sd + 1.7);
        block(k, Math.min(uX, uX - dir * 0.6), Math.max(uX, uX - dir * 0.6), z1 + sd + 0.1, z1 + sd + 3.4);
      } else {
        // 여자 화장실: 안쪽 벽에 손 건조기 + 휴지통 + 거울 한 장 더
        B.box('white', 'deco', Math.min(uX, uX - dir * 0.2), Math.max(uX, uX - dir * 0.2), L + 1.1, L + 1.4, z1 + sd + 0.6, z1 + sd + 0.9);
        B.box('metal', 'deco', Math.min(uX, uX - dir * 0.35), Math.max(uX, uX - dir * 0.35), L, L + 0.6, z1 + sd + 1.2, z1 + sd + 1.55);
        block(k, Math.min(uX, uX - dir * 0.45), Math.max(uX, uX - dir * 0.45), z1 + sd + 1.1, z1 + sd + 1.65);
      }
      // 환풍기 + 형광등
      B.geo('metal', 'deco', new THREE.CylinderGeometry(0.2, 0.2, 0.06, 12).rotateX(Math.PI / 2), ix1 + 0.6, L + 2.3, TOILET.z1 + 0.05);
      for (const lz of [z1 + 1.2, z1 + 3.4]) B.box('lamp', 'deco', (ix1 + ix2) / 2 - 0.6, (ix1 + ix2) / 2 + 0.6, L + 3.32, L + 3.38, lz - 0.08, lz + 0.08);
    }
  }

  // ── 복도 소품: 소화기 · 소화전 · 정수기 · 전신 거울 · 쓰레기통 · 표어 · 비상구 등 ──
  for (let k = 0; k < LEVELS; k++) {
    const L = levelY(k);
    for (const s of SLOTS) {
      if (s.type !== 'class') continue;
      // 소화기 (교실 앞문·뒷문 사이, 복도 벽 아래)
      const fx = (s.xs + s.xe) / 2;
      B.box('red', 'deco', fx - 0.18, fx + 0.18, L, L + 0.55, Z_CORR - 0.42, Z_CORR - 0.12);
      B.geo('red', 'deco', new THREE.CylinderGeometry(0.08, 0.08, 0.45, 10), fx, L + 0.78, Z_CORR - 0.27);
      B.geo('tv', 'deco', new THREE.CylinderGeometry(0.03, 0.03, 0.1, 6), fx, L + 1.05, Z_CORR - 0.27);
      block(k, fx - 0.25, fx + 0.25, Z_CORR - 0.5, Z_CORR);
      // 복도 표어 (문 위)
      const slog = ['복도에서는 오른쪽으로 걷자', '뛰지 맙시다 · 조용히', '바른 말 고운 말', '실내화를 신읍시다'][(s.n + k) % 4];
      const sp = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.36), new THREE.MeshBasicMaterial({ map: textTex(480, 72, '#2b4a7a', '#ffffff', [slog], 38) }));
      sp.position.set(fx, L + 2.75, Z_CORR - 0.12);
      scene.add(sp);
    }
    // 정수기 + 전신 거울 (가운데 칸 복도 뒤 창 아래)
    const hallS = SLOTS.find((s) => s.type === 'hall');
    const wx = hallS.xs - 0.7;
    B.box('white', 'deco', wx - 0.3, wx + 0.3, L, L + 1.25, Z_BACK + 0.2, Z_BACK + 0.75);
    B.box('blue', 'deco', wx - 0.22, wx + 0.22, L + 1.25, L + 1.65, Z_BACK + 0.25, Z_BACK + 0.7); // 물통
    B.box('red', 'deco', wx - 0.1, wx - 0.04, L + 0.9, L + 0.97, Z_BACK + 0.75, Z_BACK + 0.82);
    B.box('blue', 'deco', wx + 0.04, wx + 0.1, L + 0.9, L + 0.97, Z_BACK + 0.75, Z_BACK + 0.82);
    B.box('white', 'deco', wx - 0.35, wx - 0.3, L + 0.7, L + 1.2, Z_BACK + 0.2, Z_BACK + 0.5); // 종이컵 통
    block(k, wx - 0.4, wx + 0.4, Z_BACK + 0.1, Z_BACK + 0.9);
    const mx = hallS.xs - 1.65;
    B.box('darkWood', 'deco', mx - 0.45, mx + 0.45, L, L + 1.9, Z_BACK + 0.2, Z_BACK + 0.28);
    const mir = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 1.7), new THREE.MeshStandardMaterial({ color: '#dfeaf0', metalness: 0.3, roughness: 0.15, emissive: '#8fa6b4', emissiveIntensity: 0.35 }));
    mir.position.set(mx, L + 0.95, Z_BACK + 0.29);
    scene.add(mir);
    const mt = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.22), new THREE.MeshBasicMaterial({ map: textTex(270, 66, '#2f6a3f', '#ffffff', ['용의 · 복장 점검'], 34) }));
    mt.position.set(mx, L + 2.05, Z_BACK + 0.3);
    scene.add(mt);
    block(k, mx - 0.5, mx + 0.5, Z_BACK + 0.1, Z_BACK + 0.4);
    // 계단실 옆: 소화전(빨간 철제함) + 쓰레기통 2개 (일반 / 재활용)
    for (const st of STAIRS) {
      if (st.center) continue;
      const west = st.xs < 0;
      const ex = west ? st.xe + 0.5 : st.xs - 0.5;
      B.box('red', 'deco', ex - 0.35, ex + 0.35, L + 0.9, L + 1.7, Z_CORR - 0.3, Z_CORR - 0.1);
      B.box('white', 'deco', ex - 0.25, ex + 0.25, L + 1.45, L + 1.6, Z_CORR - 0.31, Z_CORR - 0.3);
      const hs = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.16), new THREE.MeshBasicMaterial({ map: textTex(180, 48, '#c8473d', '#ffffff', ['소 화 전'], 30) }));
      hs.position.set(ex, L + 1.52, Z_CORR - 0.305);
      scene.add(hs);
      for (const [dx, mat, lab] of [[west ? 1.2 : -1.2, 'leaf2', '재활용'], [west ? 1.75 : -1.75, 'metal', '일반']]) {
        B.box(mat, 'deco', ex + dx - 0.2, ex + dx + 0.2, L, L + 0.7, Z_CORR - 0.55, Z_CORR - 0.15);
        const bl = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.14), new THREE.MeshBasicMaterial({ map: textTex(102, 42, '#ffffff', '#222222', [lab], 26) }));
        bl.position.set(ex + dx, L + 0.45, Z_CORR - 0.555);
        scene.add(bl);
      }
      block(k, Math.min(ex - 0.3, ex + (west ? 2.0 : -2.0)), Math.max(ex + 0.3, ex + (west ? 2.0 : -2.0)), Z_CORR - 0.6, Z_CORR);
      // 비상구 표시등 (계단실 입구 위)
      const ex2 = west ? st.xe - 1.0 : st.xs + 1.0;
      B.box('leaf2', 'deco', ex2 - 0.25, ex2 + 0.25, L + 2.5, L + 2.75, Z_CORR - 0.14, Z_CORR - 0.06);
      const exitSign = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.22), new THREE.MeshBasicMaterial({ map: textTex(144, 66, '#2f8f4a', '#ffffff', ['비상구 →'], 34) }));
      exitSign.position.set(ex2, L + 2.62, Z_CORR - 0.145);
      scene.add(exitSign);
    }
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
  for (const [x1, x2] of [[-BX + 2, -23], [-9, -6], [6, 9], [23, BX - 2]]) {
    B.box('band', 'deco', x1, x2, 0, 0.35, 1, 2.6);
    for (let x = x1 + 1; x < x2; x += 2.2) B.geo('shrub', 'deco', new THREE.IcosahedronGeometry(0.6, 1), x, 0.7, 1.8);
    block(0, x1, x2, 1, 2.6);
  }
  // 건물 앞 필로티 느낌 쉼터: 크림색 평지붕 + 쇠기둥 + 나무 벤치 3개 (운동장 쪽을 봄)
  for (const sx of [-1, 1]) {
    const x1 = Math.min(sx * 10, sx * 22);
    const x2 = Math.max(sx * 10, sx * 22);
    B.box('cream', 'deco', x1 - 0.2, x2 + 0.2, 3.05, 3.3, 0, 4.2);
    B.box('band', 'deco', x1 - 0.2, x2 + 0.2, 2.75, 3.05, 4.0, 4.2);
    for (const px of [x1 + 0.3, (x1 + x2) / 2, x2 - 0.3]) {
      B.geo('steel', 'deco', new THREE.CylinderGeometry(0.08, 0.08, 3.05, 10), px, 1.52, 3.9);
      block(0, px - 0.2, px + 0.2, 3.7, 4.1);
    }
    for (let i = 0; i < 3; i++) {
      const bx = x1 + 2 + i * 4;
      // 나무 벤치 (앉을 수 있음, 운동장 쪽을 봄): 널판 좌석 + 등받이 + 쇠 다리
      for (const sz of [1.95, 2.17, 2.39]) B.box('chair', 'chair', bx - 1.1, bx + 1.1, 0.45, 0.5, sz - 0.1, sz + 0.1);
      for (const sy of [0.65, 0.85]) B.box('chair', 'chair', bx - 1.1, bx + 1.1, sy - 0.08, sy + 0.08, 1.84, 1.9);
      for (const lx of [bx - 1, bx + 1]) {
        B.box('metal', 'deco', lx - 0.03, lx + 0.03, 0, 0.5, 1.95, 2.4);
        B.box('metal', 'deco', lx - 0.03, lx + 0.03, 0.5, 1.0, 1.82, 1.88);
      }
      block(0, bx - 1.2, bx + 1.2, 1.75, 2.5);
      for (const cx of [bx - 0.55, bx + 0.55]) chairs.push({ x: cx, z: 2.15, seatY: 0.5, ry: 0, level: 0, room: null });
    }
    B.box('tv', 'deco', (x1 + x2) / 2 - 0.3, (x1 + x2) / 2 + 0.3, 0, 0.7, 0.4, 1.0); // 쓰레기통
    block(0, (x1 + x2) / 2 - 0.4, (x1 + x2) / 2 + 0.4, 0.3, 1.1);
    for (const lx of [x1 + 3, x2 - 3]) B.box('lamp', 'deco', lx - 0.6, lx + 0.6, 2.98, 3.04, 2.0, 2.16);
  }
  // 앞마당 끝 계단식 관람석 (운동장으로 3단 내려감) + 파랑/노랑 줄무늬 차양, 양옆은 경사로
  {
    const stripe = canvasTex(64, 64, (g) => {
      g.fillStyle = '#2f6fb3';
      g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#f2c230';
      g.fillRect(0, 0, 64, 16);
      g.fillRect(0, 32, 64, 16);
    });
    const stripeMat = new THREE.MeshStandardMaterial({ map: stripe, roughness: 0.6, side: THREE.DoubleSide });
    for (let i = 0; i < 3; i++) {
      const top = -0.3 * (i + 1);
      B.box('concrete', 'floor', -47, 47, FIELD_Y - 0.1, top, FIELD_Z + i, FIELD_Z + i + 1);
      B.box('yellow', 'deco', -46.8, 46.8, top, top + 0.012, FIELD_Z + i + 0.9, FIELD_Z + i + 1);
    }
    B.box('concrete', 'wall', -47.3, -47, FIELD_Y - 0.1, 0.05, FIELD_Z, FIELD_Z + 3);
    B.box('concrete', 'wall', 47, 47.3, FIELD_Y - 0.1, 0.05, FIELD_Z, FIELD_Z + 3);
    for (const sx of [-1, 1]) {
      // 양옆 경사로 (비스듬한 콘크리트)
      const g = new THREE.BoxGeometry(69.5 - 47.3, 0.12, Math.hypot(3, 1.2));
      g.rotateX(Math.atan2(1.2, 3)); // 운동장 쪽(+z)으로 내려감
      B.geo('concrete', 'floor', g, sx * (47.3 + 69.5) / 2, FIELD_Y / 2 - 0.06, FIELD_Z + 1.5);
      // 경사로 속 (흙) 채우기: 아래가 비어 보이지 않게
      for (let i = 0; i < 6; i++) {
        const za = FIELD_Z + i * 0.5;
        const top = (FIELD_Y * (za + 0.5 - FIELD_Z)) / 3 - 0.06;
        B.box('concrete', 'wall', Math.min(sx * 47.3, sx * 69.5), Math.max(sx * 47.3, sx * 69.5), FIELD_Y - 0.3, top, za, za + 0.5);
      }
    }
    // 차양: 8m 짜리 비스듬한 판 + 앞뒤 쇠기둥 (구령대 자리는 비움)
    for (let x0 = -46; x0 < 46; x0 += 9) {
      const x1 = x0;
      const x2 = Math.min(46, x0 + 8);
      if (x2 > -9.5 && x1 < 9.5) continue;
      const g = new THREE.BoxGeometry(x2 - x1, 0.05, 3.9);
      g.rotateX(0.14);
      const m = new THREE.Mesh(g, stripeMat);
      m.position.set((x1 + x2) / 2, 2.2, FIELD_Z + 1.55);
      m.castShadow = true;
      scene.add(m);
      for (const px of [x1 + 0.3, x2 - 0.3]) {
        B.geo('steel', 'deco', new THREE.CylinderGeometry(0.05, 0.05, 2.45, 8), px, 1.22, FIELD_Z - 0.15);
        B.geo('steel', 'deco', new THREE.CylinderGeometry(0.05, 0.05, 3.1, 8), px, FIELD_Y + 1.55, FIELD_Z + 3.3);
        block(0, px - 0.15, px + 0.15, FIELD_Z - 0.3, FIELD_Z);
        block(0, px - 0.15, px + 0.15, FIELD_Z + 3.15, FIELD_Z + 3.45);
      }
      B.box('metal', 'deco', x1, x2, 2.36, 2.4, FIELD_Z - 0.15, FIELD_Z - 0.1);
    }
  }
  // ── 구령대: 분홍 단상 + 양옆 계단 + 스테인리스 난간 + 파란 문 + 아치 지붕(앞 주황 · 뒤 파란 기둥) ──
  {
    const { x: GX, z1, z2, top, stairX, sz1, sz2 } = PODIUM;
    // 단상 몸통 + 윗면 + 테두리
    B.box('pinkPaint', 'wall', -GX, GX, 0, top - 0.05, z1, z2);
    B.box('granite', 'floor', -GX - 0.05, GX + 0.05, top - 0.05, top, z1 - 0.05, z2 + 0.05);
    B.box('white', 'deco', -GX - 0.06, GX + 0.06, top - 0.18, top - 0.05, z2, z2 + 0.06);
    B.box('band', 'deco', -GX - 0.02, GX + 0.02, 0, 0.15, z1 - 0.02, z2 + 0.02);
    // 앞면: 파란 창고 문(두 짝) + 스피커 두 개
    B.box('blueDoor', 'deco', -0.95, 0.95, 0.05, 1.15, z2, z2 + 0.04);
    B.box('frame', 'deco', -0.02, 0.02, 0.05, 1.15, z2 + 0.04, z2 + 0.05);
    for (const sx of [-1, 1]) {
      B.box('steel', 'deco', sx * 0.12 - 0.02, sx * 0.12 + 0.02, 0.5, 0.7, z2 + 0.04, z2 + 0.07);
      B.box('tv', 'deco', sx * 3.2 - 0.28, sx * 3.2 + 0.28, 0.45, 0.95, z2, z2 + 0.25);
      B.box('metal', 'deco', sx * 3.2 - 0.2, sx * 3.2 + 0.2, 0.55, 0.85, z2 + 0.25, z2 + 0.27);
    }
    // 위쪽 앞 난간 (스테인리스 기둥 + 가로대 2줄)
    const rz = z2 - 0.12;
    for (let x = -GX + 0.1; x <= GX - 0.09; x += 1) B.geo('steel', 'deco', new THREE.CylinderGeometry(0.03, 0.03, 1, 8), x, top + 0.5, rz);
    for (const h of [0.5, 1.0]) {
      const r = new THREE.CylinderGeometry(0.035, 0.035, GX * 2 - 0.2, 8);
      r.rotateZ(Math.PI / 2);
      B.geo('steel', 'deco', r, 0, top + h, rz);
    }
    // 뒤쪽 낮은 벽 + 현수막
    B.box('pinkPaint', 'wall', -GX, GX, top, top + 0.9, z1, z1 + 0.15);
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 0.9), new THREE.MeshBasicMaterial({ map: textTex(760, 90, '#fdfaf0', '#1f4f8f', ['꿈과 희망이 자라는 온라인중학교'], 54, '#c9302c') }));
    banner.position.set(0, top + 2.6, z1 + 0.32);
    scene.add(banner);
    B.box('steel', 'deco', -3.85, 3.85, top + 3.06, top + 3.1, z1 + 0.28, z1 + 0.31);
    for (const sx of [-1, 1]) B.geo('steel', 'deco', new THREE.CylinderGeometry(0.035, 0.035, 3.1, 8), sx * 3.85, top + 1.55, z1 + 0.3);
    // 막힘: 단상 가장자리 (계단 자리는 열림)
    block(0, -GX - 0.2, GX + 0.2, z2 - 0.3, z2 + 0.2);
    block(0, -GX - 0.2, GX + 0.2, z1 - 0.2, z1 + 0.35);
    for (const sx of [-1, 1]) {
      const xa = Math.min(sx * (GX - 0.25), sx * (GX + 0.25));
      const xb = Math.max(sx * (GX - 0.25), sx * (GX + 0.25));
      block(0, xa, xb, z1, sz1);
      block(0, xa, xb, sz2, z2);
    }
    // 양옆 계단 (5단) + 비스듬한 스테인리스 손잡이
    const run = stairX - GX;
    const n = 5;
    for (const sx of [-1, 1]) {
      for (let i = 0; i < n; i++) {
        const a = sx * (GX + (i * run) / n);
        const b = sx * (GX + ((i + 1) * run) / n);
        const h = top - (i * top) / n;
        B.box('granite', 'floor', Math.min(a, b), Math.max(a, b), 0, h, sz1, sz2);
        B.box('orangePaint', 'deco', Math.min(a, b), Math.max(a, b), h, h + 0.012, sz1 + 0.02, sz2 - 0.02);
      }
      const len = Math.hypot(run, top);
      const ang = Math.atan2(top, run);
      for (const rz2 of [sz1 + 0.06, sz2 - 0.06]) {
        const r = new THREE.CylinderGeometry(0.035, 0.035, len, 8);
        r.rotateZ(Math.PI / 2 + (sx > 0 ? -ang : ang));
        B.geo('steel', 'deco', r, sx * (GX + run / 2), top / 2 + 0.95, rz2);
        for (const px of [GX + 0.05, stairX - 0.1]) {
          const ph = px < GX + 0.1 ? top : 0;
          B.geo('steel', 'deco', new THREE.CylinderGeometry(0.03, 0.03, 0.95, 8), sx * px, ph + 0.47, rz2);
        }
        block(0, Math.min(sx * GX, sx * stairX), Math.max(sx * GX, sx * stairX), rz2 - 0.15, rz2 + 0.15);
      }
    }
    // 기둥: 앞 주황 · 뒤 파랑, 그 위로 둥근 아치 지붕 (어두운 철판 + 테두리)
    const R = 7.4;
    const post = top + 3.4;
    const cz1 = z1 - 0.4;
    const cz2 = z2 + 0.5;
    for (const sx of [-1, 1]) {
      for (const [cz, mat] of [[cz1, 'bluePaint'], [cz2, 'orangePaint']]) {
        B.geo(mat, 'deco', new THREE.CylinderGeometry(0.2, 0.2, post, 14), sx * (R - 0.15), post / 2, cz);
        B.geo('steel', 'deco', new THREE.CylinderGeometry(0.3, 0.3, 0.2, 14), sx * (R - 0.15), 0.1, cz);
        block(0, sx * (R - 0.15) - 0.3, sx * (R - 0.15) + 0.3, cz - 0.3, cz + 0.3);
      }
      B.box('darkMetal', 'deco', sx * (R - 0.15) - 0.12, sx * (R - 0.15) + 0.12, post - 0.25, post, cz1, cz2);
    }
    const g = new THREE.CylinderGeometry(R, R, cz2 - cz1 + 0.6, 32, 1, true, Math.PI / 2, Math.PI);
    g.rotateX(Math.PI / 2);
    g.scale(1, 0.32, 1);
    const roof = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: '#5a6168', metalness: 0.5, roughness: 0.5, side: THREE.DoubleSide }));
    roof.position.set(0, post, (cz1 + cz2) / 2);
    roof.castShadow = true;
    scene.add(roof);
    const zf = cz2 + 0.3;
    for (const [zz, rr] of [[zf, 0.09], [cz1 - 0.3, 0.06]]) {
      const t = new THREE.TorusGeometry(R, rr, 8, 40, Math.PI);
      t.scale(1, 0.32, 1);
      B.geo('steel', 'deco', t, 0, post, zz);
    }
    // 앞쪽 아치 아래 둥근 고리 장식 + 가운데 학교 마크
    for (let i = 1; i < 12; i++) {
      const a = (i / 12) * Math.PI;
      const ring = new THREE.TorusGeometry(0.22, 0.035, 6, 16);
      B.geo('steel', 'deco', ring, Math.cos(a) * (R - 0.45), post + Math.sin(a) * (R - 0.45) * 0.32 - 0.08, zf);
    }
    const mark = new THREE.Mesh(new THREE.CircleGeometry(0.55, 28), new THREE.MeshBasicMaterial({ map: textTex(128, 128, '#2f7d4a', '#ffffff', ['온'], 80, '#f2c230') }));
    mark.position.set(0, post + R * 0.32 - 0.85, zf + 0.06);
    scene.add(mark);
  }
  // 국기 게양대 3개 (구령대 서쪽)
  [-10.5, -12, -13.5].forEach((x, i) => {
    B.geo('pole', 'deco', new THREE.CylinderGeometry(0.05, 0.08, i === 1 ? 9 : 8, 8), x, i === 1 ? 4.5 : 4, 13.2);
    B.geo('granite', 'deco', new THREE.CylinderGeometry(0.3, 0.35, 0.3, 12), x, 0.15, 13.2);
    block(0, x - 0.35, x + 0.35, 12.85, 13.55);
  });
  const flagBig = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1), new THREE.MeshStandardMaterial({ map: taegukTex, side: THREE.DoubleSide }));
  flagBig.position.set(-11.2, 8.3, 13.2);
  scene.add(flagBig);
  animated.push((t) => {
    flagBig.rotation.y = Math.sin(t * 1.3) * 0.15;
  });

  B.setY(FIELD_Y); // 여기부터 운동장 안 (낮은 땅)
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
    net.position.set(gx + back, FIELD_Y + 1.22, 41);
    scene.add(net);
    block(0, Math.min(gx, gx + back) - 0.1, Math.max(gx, gx + back) + 0.1, 37.2, 44.8);
  }
  // 스탠드 (서쪽 계단식 관람석) — 운동장 땅 기준
  for (let i = 0; i < 4; i++) B.box('concrete', 'wall', -50 - 2 * (i + 1), -50 - 2 * i, FIELD_Y - 0.1, FIELD_Y + 0.45 * (i + 1), 18, 64);
  block(0, -60, -50, 18, 64);
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
  B.setY(0);
  // 벤치
  for (const [bx, bz] of [[-20, 9], [20, 9], [-32, 9], [32, 9]]) {
    B.box('chair', 'deco', bx - 1.1, bx + 1.1, 0.45, 0.5, bz - 0.3, bz + 0.3);
    B.box('metal', 'deco', bx - 1, bx - 0.9, 0, 0.45, bz - 0.25, bz + 0.25);
    B.box('metal', 'deco', bx + 0.9, bx + 1, 0, 0.45, bz - 0.25, bz + 0.25);
    block(0, bx - 1.1, bx + 1.1, bz - 0.3, bz + 0.3);
  }
  // ── 매점 (뒷마당 구석 작은 가건물, 파란 지붕): 창구 · 손글씨 가격표 · 차양 · 빈 상자·음료 상자 더미 ──
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
    B.box('lectern', 'deco', S.minX + 1.5, S.maxX - 1.5, 0, 1.0, S.minZ + 1.6, S.minZ + 2.2);
    B.box('white', 'deco', S.minX + 1.4, S.maxX - 1.4, 1.0, 1.05, S.minZ + 1.5, S.minZ + 2.3);
    B.box('tv', 'deco', S.minX + 4.3, S.minX + 4.9, 1.05, 1.35, S.minZ + 1.6, S.minZ + 2.0);
    block(0, S.minX, S.maxX, S.minZ, S.minZ + 2.2);
    // 뒤쪽 진열장 (계산대 너머)
    B.box('shelf', 'deco', S.minX + 0.5, S.maxX - 0.5, 0, 2.2, S.minZ + 0.2, S.minZ + 0.6);
    // 왼쪽 과자 진열대
    B.box('shelf', 'deco', S.minX + 0.2, S.minX + 0.7, 0, 2.0, S.minZ + 2.7, S.minZ + 7.5);
    block(0, S.minX + 0.2, S.minX + 0.7, S.minZ + 2.7, S.minZ + 7.5);
    const snackCols = ['red', 'yellow', 'blue', 'leaf2', 'ginkgo', 'books'];
    let ci = 0;
    for (let row = 0; row < 4; row++) {
      for (let z = S.minZ + 2.85; z < S.minZ + 7.2; z += 0.42) {
        const h = 0.22 + ((ci * 7) % 5) * 0.03;
        const y = 0.15 + row * 0.48;
        B.box(snackCols[ci++ % snackCols.length], 'deco', S.minX + 0.25, S.minX + 0.62, y, y + h, z, z + 0.32);
        // 뒤쪽 진열장에도
        const bx = S.minX + 0.8 + ((z - S.minZ - 2.85) / 0.42) * 0.85;
        B.box(snackCols[(ci + 2) % snackCols.length], 'deco', bx, bx + 0.9, y, y + h, S.minZ + 0.25, S.minZ + 0.55);
      }
    }
    // 아이스크림 냉동고
    B.box('white', 'deco', S.maxX - 1.6, S.maxX - 0.25, 0, 0.9, S.minZ + 3, S.minZ + 5.6);
    B.box('glass', 'glass', S.maxX - 1.55, S.maxX - 0.3, 0.9, 0.95, S.minZ + 3.05, S.minZ + 5.55);
    block(0, S.maxX - 1.6, S.maxX - 0.25, S.minZ + 3, S.minZ + 5.6);
    const storeSign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 0.6),
      new THREE.MeshBasicMaterial({ map: textTex(400, 100, '#2f5aa8', '#ffffff', ['매  점'], 64) }),
    );
    storeSign.position.set((S.doorX1 + S.doorX2) / 2, 2.95, S.maxZ + 0.03);
    scene.add(storeSign);
    // 창구: 앞 유리창 아래 턱 + 미닫이 작은 창 + 손글씨 가격표 + 줄무늬 차양
    B.box('lectern', 'deco', S.doorX2 + 0.6, S.maxX - 0.6, 0.95, 1.05, S.maxZ, S.maxZ + 0.35);
    B.box('frame', 'deco', S.doorX2 + 1.6, S.doorX2 + 1.64, 1.05, 2.25, S.maxZ - 0.1, S.maxZ + 0.02);
    const price = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 1.0),
      new THREE.MeshBasicMaterial({ map: textTex(220, 200, '#fff8dc', '#c0392b', ['매점 가격표', '빵 500 · 우유 300', '컵라면 700 · 음료 500', '아이스크림 300', '쭈쭈바 200'], 24, '#2b2b2b') }),
    );
    price.position.set(S.minX + 1.4, 1.75, S.maxZ + 0.04);
    scene.add(price);
    const ban = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.3), new THREE.MeshBasicMaterial({ map: textTex(440, 60, '#ffffff', '#c0392b', ['외상 사절 · 수업 시간 판매 안 함'], 30, '#c0392b') }));
    ban.position.set(S.doorX2 + 2.4, 2.45, S.maxZ + 0.04);
    scene.add(ban);
    {
      const aw = new THREE.BoxGeometry(S.maxX - S.minX - 0.4, 0.04, 1.3);
      aw.rotateX(0.35);
      B.geo('blueRoof', 'deco', aw, (S.minX + S.maxX) / 2, 2.75, S.maxZ + 0.6);
      for (const ax of [S.minX + 0.5, S.maxX - 0.5]) B.geo('metal', 'deco', new THREE.CylinderGeometry(0.03, 0.03, 2.7, 6), ax, 1.35, S.maxZ + 1.15);
      block(0, S.minX + 0.3, S.minX + 0.7, S.maxZ + 0.95, S.maxZ + 1.35);
      block(0, S.maxX - 0.7, S.maxX - 0.3, S.maxZ + 0.95, S.maxZ + 1.35);
    }
    // 바깥 빈 상자·음료 상자 더미, 쓰레기통, 낡은 벤치
    for (let i = 0; i < 5; i++) B.box(i % 2 ? 'cork' : 'blue', 'deco', S.maxX + 0.3 + (i % 2) * 0.55, S.maxX + 0.8 + (i % 2) * 0.55, Math.floor(i / 2) * 0.35, Math.floor(i / 2) * 0.35 + 0.33, S.maxZ - 1.6, S.maxZ - 1.1);
    B.box('red', 'deco', S.maxX + 0.3, S.maxX + 0.8, 0, 0.33, S.maxZ - 2.3, S.maxZ - 1.8);
    block(0, S.maxX + 0.2, S.maxX + 1.5, S.maxZ - 2.5, S.maxZ - 1.0);
    B.geo('metal', 'deco', new THREE.CylinderGeometry(0.25, 0.22, 0.7, 12), S.minX - 0.6, 0.35, S.maxZ + 0.3);
    block(0, S.minX - 0.9, S.minX - 0.3, S.maxZ, S.maxZ + 0.6);
    B.box('chair', 'deco', S.minX - 3.2, S.minX - 1.2, 0.42, 0.48, S.maxZ + 0.6, S.maxZ + 1.0);
    for (const bx of [S.minX - 3.0, S.minX - 1.4]) B.box('metal', 'deco', bx - 0.04, bx + 0.04, 0, 0.42, S.maxZ + 0.65, S.maxZ + 0.95);
    block(0, S.minX - 3.3, S.minX - 1.1, S.maxZ + 0.5, S.maxZ + 1.1);

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
  const flatBlocks = (x1, x2, z1, z2) => pave(x1, x2, z1, z2, tex.blocks, 0.02, 1.6);

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
    B.box('terrazzo', 'floor', A.minX, A.maxX, 0, ANNEX_FLOOR, A.minZ, A.maxZ);
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
    // 90~2000년대 급식실: 긴 스테인리스 식탁 (6인) + 붙박이 둥근 의자, 줄줄이 배치
    for (const tz of [-30.6, -28.2, -25.8, -23.4]) {
      for (const tx0 of [8.5, 15.5, 25.5]) {
        if (tz > -24.5 && tx0 > 14 && tx0 < 26) continue; // 출입구 앞은 비워 둠
        const tx1 = tx0 + (tx0 === 15.5 ? 5.0 : 6.0);
        B.box('steel', 'deco', tx0, tx1, 0.72, 0.76, tz - 0.4, tz + 0.4);
        B.box('metal', 'deco', tx0 + 0.3, tx1 - 0.3, 0.68, 0.72, tz - 0.35, tz + 0.35);
        for (const lx of [tx0 + 0.5, (tx0 + tx1) / 2, tx1 - 0.5]) {
          B.geo('metal', 'deco', new THREE.CylinderGeometry(0.035, 0.035, 0.68, 8), lx, 0.34, tz);
          const foot = new THREE.CylinderGeometry(0.03, 0.03, 1.9, 6).rotateX(Math.PI / 2);
          B.geo('metal', 'deco', foot, lx, 0.06, tz);
        }
        block(0, tx0, tx1, tz - 1.05, tz + 1.05);
        const n = Math.round((tx1 - tx0) / 1.0);
        for (let q = 0; q < n; q++) {
          const cx = tx0 + 0.5 + q * ((tx1 - tx0 - 1.0) / (n - 1));
          for (const sgn of [-1, 1]) {
            const cz = tz + sgn * 0.8;
            B.geo('chairDark', 'chair', new THREE.CylinderGeometry(0.17, 0.17, 0.04, 14), cx, 0.45, cz);
            B.geo('metal', 'deco', new THREE.CylinderGeometry(0.025, 0.025, 0.43, 6), cx, 0.22, cz);
            const arm = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6).rotateX(Math.PI / 2);
            B.geo('metal', 'deco', arm, cx, 0.1, tz + sgn * 0.4);
            chairs.push({ x: cx, z: cz, seatY: 0.45, ry: sgn > 0 ? Math.PI : 0, level: 0, room: 'cafe' });
          }
        }
      }
    }
    // 허리 높이 흰 타일 벽 + 초록 띠 (양 옆·앞 벽)
    for (const [x1, x2, z1, z2] of [[A.minX + T, A.minX + T + 0.03, A.minZ + 1, A.maxZ - 1], [A.maxX - T - 0.03, A.maxX - T, A.minZ + 1, A.maxZ - 1], [A.minX + 1, CAFE_DOOR[0] - 0.3, A.maxZ - T - 0.03, A.maxZ - T], [CAFE_DOOR[1] + 0.3, A.maxX - 1, A.maxZ - T - 0.03, A.maxZ - T]]) {
      B.box('tile', 'deco', x1, x2, 0.02, 1.2, z1, z2);
      B.box('tileDark', 'deco', x1 - 0.002, x2 + 0.002, 1.2, 1.28, z1, z2);
    }
    // 식판 반납구 (스테인리스 선반 + 잔반통·국물통) — 동쪽 벽
    B.box('steel', 'deco', A.maxX - 1.6, A.maxX - T, 0.8, 0.86, -31.2, -28.6);
    B.box('steel', 'deco', A.maxX - 1.6, A.maxX - T, 0, 0.8, -31.2, -30.9);
    B.box('steel', 'deco', A.maxX - 1.6, A.maxX - T, 0, 0.8, -28.9, -28.6);
    for (let n = 0; n < 10; n++) B.box('steel', 'deco', A.maxX - 1.3, A.maxX - 0.6, 0.86 + n * 0.025, 0.875 + n * 0.025, -31.0, -30.4);
    B.geo('leaf2', 'deco', new THREE.CylinderGeometry(0.3, 0.26, 0.6, 12), A.maxX - 0.9, 0.3, -29.9);
    B.geo('leaf2', 'deco', new THREE.CylinderGeometry(0.3, 0.26, 0.6, 12), A.maxX - 0.9, 0.3, -29.1);
    B.box('blue', 'deco', A.maxX - 1.5, A.maxX - 0.4, 0.86, 0.9, -29.4, -28.7); // 수저통 받침
    const retSign = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.3), new THREE.MeshBasicMaterial({ map: textTex(280, 60, '#2b4a7a', '#ffffff', ['식판 · 수저 반납 → 잔반은 통에'], 26) }));
    retSign.rotation.y = -Math.PI / 2;
    retSign.position.set(A.maxX - T - 0.04, 1.7, -29.9);
    scene.add(retSign);
    block(0, A.maxX - 1.8, A.maxX, -31.4, -28.4);
    // 손 씻는 긴 세면대 (서쪽 벽) + 비누·수건, 정수기
    B.box('white', 'deco', A.minX + T, A.minX + 0.75, 0.7, 0.85, -31.5, -29.0);
    B.box('white', 'deco', A.minX + T, A.minX + 0.4, 0, 0.7, -31.5, -29.0);
    for (let i = 0; i < 4; i++) {
      const sz = -31.2 + i * 0.65;
      B.geo('steel', 'deco', new THREE.CylinderGeometry(0.02, 0.02, 0.2, 6), A.minX + 0.4, 0.95, sz);
      B.geo('yellow', 'deco', new THREE.SphereGeometry(0.035, 8, 6).scale(1, 0.6, 1.3), A.minX + 0.6, 0.87, sz + 0.3);
    }
    B.box('ginkgo', 'deco', A.minX + 0.75, A.minX + 0.79, 0.95, 1.3, -29.3, -29.0);
    const mirror2 = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshStandardMaterial({ color: '#dfeaf0', metalness: 0.3, roughness: 0.15, emissive: '#8fa6b4', emissiveIntensity: 0.35 }));
    mirror2.rotation.y = Math.PI / 2;
    mirror2.position.set(A.minX + T + 0.04, 1.65, -30.25);
    scene.add(mirror2);
    block(0, A.minX, A.minX + 0.9, -31.7, -28.8);
    B.box('white', 'deco', A.minX + T, A.minX + 0.75, 0, 1.2, -26.0, -25.4); // 정수기
    B.box('blue', 'deco', A.minX + 0.3, A.minX + 0.7, 1.2, 1.6, -25.95, -25.45);
    block(0, A.minX, A.minX + 0.9, -26.2, -25.2);
    // 급식 표어 + 식사 예절 포스터 + 조리실 작은 창 (주방 벽)
    const slogan2 = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 0.5), new THREE.MeshBasicMaterial({ map: textTex(800, 100, '#c8473d', '#ffffff', ['잔반 없는 날 · 골고루 먹고 튼튼하게'], 44) }));
    slogan2.position.set(12, 3.0, kz + 0.05);
    scene.add(slogan2);
    const manners = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.5), new THREE.MeshBasicMaterial({ map: textTex(240, 300, '#fff8dc', '#2b2b2b', ['식사 예절', '', '1. 줄을 서서', '2. 손 씻고', '3. 조용히', '4. 남기지 않기', '5. 식판은 반납'], 24, '#2b4a7a') }));
    manners.position.set(A.maxX - 4.5, 2.4, kz + 0.05);
    scene.add(manners);
    B.box('steel', 'deco', A.minX + 2.0, A.minX + 3.4, 1.3, 2.2, kz + 0.02, kz + 0.06);
    B.box('glass', 'glass', A.minX + 2.1, A.minX + 3.3, 1.4, 2.1, kz + 0.03, kz + 0.05);
    // 벽걸이 선풍기 2대 (그 시절 급식실 필수)
    for (const fx of [A.minX + 6, A.maxX - 6]) {
      B.geo('white', 'deco', new THREE.CylinderGeometry(0.22, 0.22, 0.1, 16).rotateX(Math.PI / 2), fx, 3.1, A.maxZ - T - 0.3);
      B.geo('white', 'deco', new THREE.CylinderGeometry(0.03, 0.03, 0.25, 6).rotateX(Math.PI / 2), fx, 3.1, A.maxZ - T - 0.12);
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
    // 2000년대 강당 디테일: 무대 위 연단(교장 선생님 훈화) + 마이크, 무대 옆 피아노, 접이식 의자 몇 줄(앉기), 현수막, 벽 환풍기, 농구공 바구니, 체조 매트, 뜀틀
    B.box('darkWood', 'deco', 23.5, 24.3, L1 + 1.0, L1 + 2.1, A.minZ + 1.0, A.minZ + 1.6);
    B.box('darkWood', 'deco', 23.4, 24.4, L1 + 2.1, L1 + 2.16, A.minZ + 0.9, A.minZ + 1.7);
    B.geo('tv', 'deco', new THREE.CylinderGeometry(0.012, 0.012, 0.45, 6), 23.9, L1 + 2.38, A.minZ + 1.3);
    B.geo('tv', 'deco', new THREE.SphereGeometry(0.04, 8, 6), 23.9, L1 + 2.62, A.minZ + 1.3);
    B.box('tv', 'deco', A.minX + 4.5, A.minX + 6.0, L1 + 1.0, L1 + 2.2, A.minZ + 0.6, A.minZ + 1.2); // 피아노
    B.box('white', 'deco', A.minX + 4.6, A.minX + 5.9, L1 + 1.72, L1 + 1.76, A.minZ + 1.2, A.minZ + 1.4);
    for (let i = 0; i < 9; i++) B.box('tv', 'deco', A.minX + 4.65 + i * 0.14, A.minX + 4.72 + i * 0.14, L1 + 1.76, L1 + 1.78, A.minZ + 1.22, A.minZ + 1.32);
    const banner2 = new THREE.Mesh(new THREE.PlaneGeometry(7.0, 0.8), new THREE.MeshBasicMaterial({ map: textTex(700, 80, '#ffffff', '#c0392b', ['제 25회 학예발표회 · 꿈을 노래하자'], 42, '#2b4a7a') }));
    banner2.position.set(21, L1 + 3.3, A.minZ + T + 0.12);
    scene.add(banner2);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 10; c++) {
        const cx = 12 + c * 2.0;
        const cz = A.minZ + 6.5 + r * 1.1;
        B.box('metal', 'chair', cx - 0.22, cx + 0.22, L1 + 0.45, L1 + 0.48, cz - 0.22, cz + 0.22);
        B.box('metal', 'chair', cx - 0.22, cx + 0.22, L1 + 0.48, L1 + 0.9, cz - 0.24, cz - 0.21);
        for (const [lx, lz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) B.box('metal', 'deco', cx + lx - 0.01, cx + lx + 0.01, L1, L1 + 0.45, cz + lz - 0.01, cz + lz + 0.01);
        chairs.push({ x: cx, z: cz, seatY: L1 + 0.48, ry: Math.PI, level: 1, room: 'gym' });
      }
      block(1, 11.6, 30.4, A.minZ + 6.5 + r * 1.1 - 0.3, A.minZ + 6.5 + r * 1.1 + 0.3);
    }
    for (const fx of [A.minX + 5, A.maxX - 5]) {
      B.geo('metal', 'deco', new THREE.CylinderGeometry(0.35, 0.35, 0.1, 16).rotateX(Math.PI / 2), fx, TOP - 1.2, A.maxZ - T - 0.08);
      B.geo('tv', 'deco', new THREE.CylinderGeometry(0.06, 0.06, 0.14, 8).rotateX(Math.PI / 2), fx, TOP - 1.2, A.maxZ - T - 0.12);
    }
    B.box('metal', 'deco', A.maxX - 1.6, A.maxX - 0.6, L1, L1 + 0.7, -22.6, -21.6); // 농구공 바구니
    for (let i = 0; i < 5; i++) B.geo('orangePaint', 'deco', new THREE.SphereGeometry(0.12, 10, 8), A.maxX - 1.35 + (i % 3) * 0.25, L1 + 0.75 + Math.floor(i / 3) * 0.2, -22.35 + (i % 2) * 0.3);
    block(1, A.maxX - 1.8, A.maxX - 0.4, -22.8, -21.4);
    B.box('blue', 'deco', A.minX + 0.6, A.minX + 2.6, L1, L1 + 0.5, -23.0, -21.2); // 매트 더미
    B.box('lectern', 'deco', A.minX + 3.0, A.minX + 3.8, L1, L1 + 1.1, -22.4, -21.6); // 뜀틀
    for (let i = 0; i < 4; i++) B.box('deskTop', 'deco', A.minX + 3.0 - i * 0.05, A.minX + 3.8 + i * 0.05, L1 + 0.25 * i, L1 + 0.25 * i + 0.03, -22.4 - i * 0.03, -21.6 + i * 0.03);
    block(1, A.minX + 0.4, A.minX + 4.0, -23.2, -21.0);
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
    const bx = (BACKDOOR.x1 + BACKDOOR.x2) / 2;
    pave(bx - W, bx + W, zMid - W, Z_BACK);
    archRoof('z', zMid + W, Z_BACK, bx);
    tactile(bx - 0.15, bx + 0.15, zMid, Z_BACK);
    for (const x of [bx - W, bx + W]) woodPost(x, Z_BACK - 1.5);
    pave(bx - W, cafeX + W, zMid - W, zMid + W);
    archRoof('x', bx - W, cafeX + W, zMid);
    tactile(bx, cafeX, zMid - 0.15, zMid + 0.15);
    for (let x = bx - W; x <= cafeX + W + 0.01; x += 2.5) {
      if (Math.abs(x - bx) > W + 0.4) woodPost(x, zMid + W);
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

  // ── 중앙현관: 깊은 차양(루버 천장 + 매입등 + 표어 띠) · 화강암 계단(주황 미끄럼방지) · 유리문 · 파란 매트 · 학교 표지판 · X배너 ──
  {
    const L = levelY(0);
    const { w: EW, landing, depth } = ENTRY;
    // 유리 출입문: 고정창 3칸 + 열린 문 두 곳
    for (const [x1, x2] of [[-3.6, -2.4], [-0.6, 0.6], [2.4, 3.6]]) {
      B.box('glass', 'glass', x1, x2, L, L + 2.6, -0.15, -0.05);
      block(0, x1, x2, -0.2, 0);
    }
    for (const x of [-3.6, -2.4, -0.6, 0.6, 2.4, 3.6]) B.box('steel', 'deco', x - 0.05, x + 0.05, L, L + 2.7, -0.18, -0.02);
    B.box('steel', 'deco', -3.6, 3.6, L + 2.6, L + 2.7, -0.18, -0.02);
    B.box('steel', 'deco', -3.6, 3.6, L, L + 0.08, -0.18, -0.02);
    for (const [a, sgn] of [[-2.4, 1], [-0.6, -1], [0.6, 1], [2.4, -1]]) {
      // 안쪽으로 활짝 열린 문짝 + 손잡이
      const x = a + sgn * 0.06;
      B.box('glass', 'glass', x - 0.03, x + 0.03, L + 0.05, L + 2.55, -1.0, -0.12);
      B.box('steel', 'deco', x - 0.04, x + 0.04, L + 0.05, L + 0.15, -1.0, -0.12);
      B.box('steel', 'deco', x - 0.05, x + 0.05, L + 0.9, L + 1.1, -0.95, -0.9);
    }
    B.box('granite', 'wall', -3.6, 3.6, L + 2.7, L + 3.3, 0, 0.03);
    const entSign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.42), new THREE.MeshBasicMaterial({ map: textTex(360, 84, '#f7f2e2', '#2b2b2b', ['중앙현관'], 50, '#7a5532') }));
    entSign.position.set(0, L + 3.0, 0.05);
    scene.add(entSign);
    B.box('leaf1', 'deco', -1.3, 1.3, L, L + 0.02, -1.6, -0.5); // 안쪽 초록 발판

    // 계단참 + 4단 돌계단 (각 단 끝에 주황 미끄럼방지 줄)
    B.box('granite', 'floor', -EW, EW, 0, BASE, Z_FRONT, landing);
    B.box('orangePaint', 'deco', -EW + 0.1, EW - 0.1, BASE, BASE + 0.012, landing - 0.08, landing - 0.02);
    const run = (depth - landing) / 4;
    for (let i = 0; i < 3; i++) {
      const h = BASE * (1 - (i + 1) / 4);
      const za = landing + i * run;
      B.box('granite', 'floor', -EW, EW, 0, h, za, za + run);
      B.box('orangePaint', 'deco', -EW + 0.1, EW - 0.1, h, h + 0.012, za + run - 0.08, za + run - 0.02);
    }
    // 계단 양옆 화강암 볼(측벽)
    for (const sx of [-1, 1]) {
      B.box('granite', 'wall', sx * EW - 0.2, sx * EW + 0.2, 0, BASE + 0.15, Z_FRONT, depth - run);
      block(0, sx * EW - 0.25, sx * EW + 0.25, Z_FRONT, depth - run);
    }
    B.box('blueMat', 'deco', -2.6, 2.6, BASE, BASE + 0.015, 0.15, 1.15);
    // 계단 앞 초록·회색 보도
    const greenPave = canvasTex(128, 128, (g) => {
      g.fillStyle = '#7d8a7f';
      g.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++) {
          g.fillStyle = (i + j) % 3 === 0 ? '#5f8f6a' : (i * j) % 2 ? '#a3a7a2' : '#8f948f';
          g.fillRect(i * 32 + 1, j * 32 + 1, 30, 30);
        }
    });
    pave(-EW - 2, EW + 2, depth, depth + 4, greenPave, 0.022, 1.6);

    // 차양: 두꺼운 콘크리트 판 + 앞 테두리 표어 + 아래 루버(나무색 살) + 매입등
    const cy = L + 3.4;
    const cz = depth + 1.4;
    B.box('concrete', 'deco', -EW - 0.3, EW + 0.3, cy + 0.12, cy + 0.6, Z_FRONT, cz);
    B.box('slat', 'deco', -EW - 0.3, EW + 0.3, cy, cy + 0.12, cz - 0.15, cz);
    for (let x = -EW - 0.15; x <= EW + 0.15; x += 0.22) B.box('slat', 'deco', x - 0.06, x + 0.06, cy + 0.04, cy + 0.12, Z_FRONT + 0.1, cz - 0.15);
    for (const lx of [-3.4, 0, 3.4]) for (const lz of [1.2, 3.2]) B.geo('downlight', 'deco', new THREE.CylinderGeometry(0.12, 0.12, 0.03, 12), lx, cy + 0.02, lz);
    const slogan = new THREE.Mesh(
      new THREE.PlaneGeometry(EW * 2 + 0.4, 0.42),
      new THREE.MeshBasicMaterial({ map: textTex(1100, 84, '#e9e7e1', '#1d3f7a', ['꿈과 끼를 키우는 · 바른 인성 · 미래 주도 인재'], 50) }),
    );
    slogan.position.set(0, cy + 0.36, cz + 0.01);
    scene.add(slogan);
    // 차양 받치는 화강암 기둥
    for (const sx of [-1, 1]) {
      B.box('granite', 'wall', sx * (EW + 0.05) - 0.3, sx * (EW + 0.05) + 0.3, 0, cy + 0.12, cz - 0.75, cz - 0.15);
      block(0, sx * (EW + 0.05) - 0.35, sx * (EW + 0.05) + 0.35, cz - 0.8, cz - 0.1);
    }

    // 가운데 초록 학교 표지판 (계단참 위)
    B.geo('steel', 'deco', new THREE.CylinderGeometry(0.25, 0.3, 0.06, 16), 0, BASE + 0.03, 0.85);
    B.geo('steel', 'deco', new THREE.CylinderGeometry(0.035, 0.035, 1.3, 8), 0, BASE + 0.65, 0.85);
    B.box('signGreen', 'deco', -0.42, 0.42, BASE + 1.0, BASE + 1.75, 0.82, 0.88);
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.7), new THREE.MeshBasicMaterial({ map: textTex(160, 144, '#2f7d4a', '#ffffff', ['온라인', '중학교'], 40, '#f2c230') }));
    logo.position.set(0, BASE + 1.375, 0.885);
    scene.add(logo);
    block(0, -0.35, 0.35, 0.6, 1.1);

    // X배너 두 개 (계단참 양 끝)
    const xBanner = (x, lines, bg) => {
      for (const s of [-1, 1]) {
        const leg = new THREE.CylinderGeometry(0.015, 0.015, 1.9, 6);
        leg.rotateX(s * 0.18);
        B.geo('metal', 'deco', leg, x, BASE + 0.95, 0.7);
        const leg2 = new THREE.CylinderGeometry(0.015, 0.015, 1.9, 6);
        leg2.rotateZ(s * 0.18);
        B.geo('metal', 'deco', leg2, x, BASE + 0.95, 0.68);
      }
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.7), new THREE.MeshBasicMaterial({ map: textTex(120, 340, bg, '#ffffff', lines, 30), side: THREE.DoubleSide }));
      p.position.set(x, BASE + 1.05, 0.72);
      scene.add(p);
      block(0, x - 0.35, x + 0.35, 0.4, 1.0);
    };
    xBanner(-EW + 0.6, ['학교폭력', '없는', '행복한', '학교'], '#c9302c');
    xBanner(EW - 0.6, ['신입생', '여러분', '입학을', '축하해요'], '#1f6fb5');
  }

  // ── 뒷문 돌계단 (복도 → 지붕 통로) ──
  for (let i = 0; i < 3; i++) {
    const za = Z_BACK - 1.2 + i * 0.4;
    const h = (BASE * (i + 0.5)) / 3;
    B.box('granite', 'floor', BACKDOOR.x1 - 0.7, BACKDOOR.x2 + 0.7, 0, h, za, za + 0.4);
    B.box('orangePaint', 'deco', BACKDOOR.x1 - 0.6, BACKDOOR.x2 + 0.6, h, h + 0.012, za + 0.02, za + 0.08);
  }

  // ── 옆 출입문(계단실): 철문 틀 + 작은 차양 + 돌계단 3단 + 바깥 보도블록 ──
  for (const side of [-1, 1]) {
    const wx = side * BX;
    const out = side; // 바깥 방향
    B.box('steel', 'deco', wx - 0.12, wx + 0.12, BASE, BASE + 2.3, -11.5, -11.38);
    B.box('steel', 'deco', wx - 0.12, wx + 0.12, BASE, BASE + 2.3, -9.62, -9.5);
    B.box('steel', 'deco', wx - 0.12, wx + 0.12, BASE + 2.22, BASE + 2.32, -11.5, -9.5);
    B.box('door', 'deco', wx - 0.6 * out - 0.02, wx - 0.6 * out + 0.02, BASE, BASE + 2.2, -9.6, -9.0); // 안쪽으로 열린 철문
    B.box('concrete', 'deco', Math.min(wx, wx + out * 1.6), Math.max(wx, wx + out * 1.6), BASE + 2.6, BASE + 2.75, -12.2, -8.8);
    for (let i = 0; i < 3; i++) {
      const a = wx + out * i * 0.4;
      const b = wx + out * (i + 1) * 0.4;
      const h = BASE * (1 - (i + 0.5) / 3);
      B.box('granite', 'floor', Math.min(a, b), Math.max(a, b), 0, h, -11.6, -9.4);
      B.box('orangePaint', 'deco', Math.min(a, b), Math.max(a, b), h, h + 0.012, -11.5, -9.5);
    }
    flatBlocks(side > 0 ? wx : wx - 5, side > 0 ? wx + 5 : wx, -14, -7);
    // 계단 옆은 막아서 모서리로 뛰어내리지 않게
    const sa = Math.min(wx, wx + out * 1.2);
    const sb = Math.max(wx, wx + out * 1.2);
    block(0, sa, sb, -11.9, -11.6);
    block(0, sa, sb, -9.4, -9.1);
  }
  for (const [a, b] of [[BACKDOOR.x1 - 1.0, BACKDOOR.x1 - 0.7], [BACKDOOR.x2 + 0.7, BACKDOOR.x2 + 1.0]]) block(0, a, b, Z_BACK - 1.2, Z_BACK);

  // ── 동상: 세종대왕(금빛, 앉은 모습) · 이순신(청동, 칼 짚고 선 모습) ──
  // 몸은 기본 도형을 조합해서 만듦 (로컬 좌표 → 크기 S 배로 키워서 받침대 위에 올림)
  const statue = (cx, baseY, cz, S) => {
    const put = (mat, g, lx, ly, lz) => {
      g.translate(lx, ly, lz);
      g.scale(S, S, S);
      B.geo(mat, 'deco', g, cx, baseY, cz);
    };
    const up = new THREE.Vector3(0, 1, 0);
    return {
      put,
      box: (mat, x1, x2, y1, y2, z1, z2) => put(mat, new THREE.BoxGeometry(x2 - x1, y2 - y1, z2 - z1), (x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2),
      ball: (mat, r, x, y, z, sx = 1, sy = 1, sz = 1) => {
        const g = new THREE.SphereGeometry(r, 16, 12);
        g.scale(sx, sy, sz);
        put(mat, g, x, y, z);
      },
      // a → b 로 이어지는 원기둥(팔·다리·소매)
      limb: (mat, a, b, r1, r2 = r1) => {
        const A = new THREE.Vector3(...a);
        const Bv = new THREE.Vector3(...b);
        const d = Bv.clone().sub(A);
        const g = new THREE.CylinderGeometry(r2, r1, d.length(), 12);
        g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, d.normalize()));
        const m = A.add(Bv).multiplyScalar(0.5);
        put(mat, g, m.x, m.y, m.z);
      },
      lathe: (mat, pts, y, z = 0, sz = 1) => {
        const g = new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), 20);
        g.scale(1, 1, sz);
        put(mat, g, 0, y, z);
      },
    };
  };
  const statueBed = (x, z) => {
    B.box('band', 'deco', x - 1.9, x + 1.9, 0, 0.3, z - 1.9, z + 1.9);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      B.geo('shrub', 'deco', new THREE.IcosahedronGeometry(0.32, 1), x + Math.sin(a) * 1.55, 0.55, z + Math.cos(a) * 1.55);
    }
    block(0, x - 1.9, x + 1.9, z - 1.9, z + 1.9);
  };
  const carve = (x, y, z, w, h, lines, size, bg = '#8e8a82', fg = '#2b2722') => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: textTex(Math.round(w * 300), Math.round(h * 300), bg, fg, lines, size) }));
    m.position.set(x, y, z);
    scene.add(m);
  };
  {
    // 세종대왕: 계단식 화강암 받침 → 장식 의자 → 곤룡포(가슴 흉배·옥대) → 오른손 들고 왼손엔 펼친 책 → 익선관
    const x = -13;
    const z = 6.5;
    statueBed(x, z);
    B.box('granite', 'deco', x - 1.2, x + 1.2, 0.3, 0.55, z - 1.2, z + 1.2);
    B.box('granite', 'deco', x - 1.0, x + 1.0, 0.55, 0.8, z - 1.0, z + 1.0);
    B.box('granite', 'wall', x - 0.82, x + 0.82, 0.8, 1.95, z - 0.82, z + 0.82);
    B.box('granite', 'deco', x - 0.95, x + 0.95, 1.95, 2.1, z - 0.95, z + 0.95);
    carve(x, 1.38, z + 0.83, 1.2, 0.5, ['세종대왕'], 92);
    const s = statue(x, 2.1, z, 1.25);
    const G = 'gold';
    // 발판 + 의자(용상)
    s.box(G, -0.62, 0.62, 0, 0.1, -0.5, 0.78);
    s.box(G, -0.64, 0.64, 0.1, 0.55, -0.5, 0.32);
    s.box(G, -0.6, 0.6, 0.12, 0.5, 0.32, 0.36); // 앞 장식판
    for (const sx of [-1, 1]) {
      s.box(G, sx * 0.64 - 0.07, sx * 0.64 + 0.07, 0.55, 0.85, -0.5, 0.3); // 팔걸이
      s.limb(G, [sx * 0.64, 0.85, 0.3], [sx * 0.64, 0.85, 0.42], 0.08); // 팔걸이 끝 말림
      s.limb(G, [sx * 0.58, 0.55, -0.5], [sx * 0.58, 2.05, -0.5], 0.055); // 등받이 기둥
      s.ball(G, 0.08, sx * 0.58, 2.1, -0.5); // 기둥 꼭지
    }
    s.box(G, -0.58, 0.58, 0.55, 1.9, -0.56, -0.44); // 등받이
    s.box(G, -0.5, 0.5, 0.8, 1.7, -0.44, -0.42); // 등받이 안쪽 장식판
    {
      const crest = new THREE.TorusGeometry(0.5, 0.05, 8, 20, Math.PI);
      crest.scale(1, 0.45, 1);
      s.put(G, crest, 0, 1.9, -0.5);
    }
    // 다리(곤룡포 자락이 무릎을 덮고 발까지)
    s.box(G, -0.38, 0.38, 0.5, 0.72, -0.3, 0.4); // 허벅지
    {
      const robe = new THREE.CylinderGeometry(0.4, 0.46, 0.5, 16, 1, false, -Math.PI / 2, Math.PI);
      s.put(G, robe, 0, 0.35, 0.3);
    }
    for (const sx of [-1, 1]) s.ball(G, 0.08, sx * 0.14, 0.15, 0.6, 1, 0.6, 1.6); // 신발 코
    // 몸통 (곤룡포, 앞뒤로 약간 납작)
    s.lathe(G, [[0.01, 0], [0.42, 0], [0.4, 0.2], [0.34, 0.5], [0.3, 0.72], [0.18, 0.82], [0.01, 0.84]], 0.65, -0.1, 0.72);
    {
      // 가슴 둥근 흉배(용무늬) — 금빛 테두리 안에 어두운 원판
      const disc = new THREE.CylinderGeometry(0.13, 0.13, 0.03, 20);
      disc.rotateX(Math.PI / 2 - 0.12);
      s.put('bronze', disc, 0, 1.13, 0.15);
      const rim = new THREE.TorusGeometry(0.13, 0.015, 6, 20);
      rim.rotateX(-0.12);
      s.put(G, rim, 0, 1.13, 0.165);
      s.ball(G, 0.05, 0, 1.13, 0.17, 1, 1, 0.4);
    }
    {
      const belt = new THREE.TorusGeometry(0.38, 0.035, 8, 24);
      belt.rotateX(Math.PI / 2);
      belt.scale(1, 1, 0.74);
      s.put(G, belt, 0, 0.86, -0.1);
    }
    for (const sx of [-1, 1]) s.ball(G, 0.15, sx * 0.3, 1.36, -0.1, 1, 0.8, 1); // 어깨
    // 왼팔: 무릎 위 책을 받침 (넓은 소매)
    s.limb(G, [-0.34, 1.36, -0.1], [-0.42, 1.0, 0.05], 0.1, 0.11);
    s.limb(G, [-0.42, 1.0, 0.05], [-0.26, 0.86, 0.32], 0.12, 0.17);
    s.ball(G, 0.06, -0.22, 0.82, 0.38);
    // 펼친 책
    for (const sx of [-1, 1]) {
      const page = new THREE.BoxGeometry(0.17, 0.02, 0.24);
      page.rotateZ(sx * 0.18);
      s.put(G, page, -0.12 + sx * 0.085, 0.8 + 0.015, 0.3);
    }
    // 오른팔: 앞으로 들어 손바닥을 펴 보임
    s.limb(G, [0.34, 1.36, -0.1], [0.46, 1.04, 0.1], 0.1, 0.11);
    s.limb(G, [0.46, 1.04, 0.1], [0.42, 1.36, 0.36], 0.11, 0.14);
    s.ball(G, 0.13, 0.47, 1.12, 0.22, 0.6, 1.3, 1); // 늘어진 소매 자락
    s.box(G, 0.36, 0.48, 1.38, 1.56, 0.36, 0.41); // 펼친 손바닥
    for (let f = 0; f < 4; f++) s.box(G, 0.365 + f * 0.03, 0.385 + f * 0.03, 1.56, 1.63, 0.37, 0.4);
    // 목 · 머리 · 수염
    s.limb(G, [0, 1.46, -0.1], [0, 1.58, -0.08], 0.075);
    s.ball(G, 0.16, 0, 1.7, -0.07, 0.95, 1.08, 1);
    s.box(G, -0.02, 0.02, 1.66, 1.74, 0.07, 0.11); // 코
    s.box(G, -0.07, 0.07, 1.62, 1.635, 0.07, 0.1); // 콧수염
    {
      const beard = new THREE.ConeGeometry(0.055, 0.16, 10);
      beard.rotateX(Math.PI);
      s.put(G, beard, 0, 1.51, 0.05);
    }
    for (const sx of [-1, 1]) s.ball(G, 0.035, sx * 0.16, 1.7, -0.08, 0.6, 1, 1); // 귀
    // 익선관: 둥근 모자 + 뒤로 솟은 턱 + 위로 선 날개 두 개
    s.limb(G, [0, 1.76, -0.08], [0, 1.88, -0.08], 0.165, 0.16);
    s.ball(G, 0.15, 0, 1.9, -0.04, 1, 0.55, 0.9);
    s.ball(G, 0.13, 0, 1.97, -0.15, 1, 0.9, 0.8);
    for (const sx of [-1, 1]) {
      const wing = new THREE.BoxGeometry(0.1, 0.15, 0.02);
      wing.rotateZ(-sx * 0.25);
      s.put(G, wing, sx * 0.1, 2.1, -0.2);
    }
  }
  {
    // 이순신: 2단 받침(명판) → 장화 → 긴 갑옷 자락 → 비늘 갑옷 몸통 · 견갑 → 오른손 허리, 왼손 장검 → 투구(목가리개 · 술)
    const x = 13;
    const z = 6.5;
    statueBed(x, z);
    B.box('granite', 'deco', x - 1.15, x + 1.15, 0.3, 0.7, z - 1.15, z + 1.15);
    B.box('granite', 'wall', x - 0.85, x + 0.85, 0.7, 2.2, z - 0.85, z + 0.85);
    B.box('granite', 'deco', x - 0.95, x + 0.95, 2.2, 2.35, z - 0.95, z + 0.95);
    carve(x, 1.5, z + 0.86, 1.4, 0.6, ['충무공', '이순신 장군'], 66);
    const s = statue(x, 2.35, z, 1.3);
    const P = 'patina';
    const D = 'patinaDark';
    s.box(D, -0.42, 0.42, 0, 0.06, -0.3, 0.32); // 발 받침
    for (const sx of [-1, 1]) {
      s.limb(P, [sx * 0.13, 0.06, 0.02], [sx * 0.14, 0.62, 0], 0.085, 0.09); // 장화
      s.box(P, sx * 0.13 - 0.08, sx * 0.13 + 0.08, 0.06, 0.14, 0.0, 0.2); // 발끝
    }
    // 갑옷 자락 (무릎 아래까지 퍼지는 치마 모양)
    s.lathe(P, [[0.2, 0.0], [0.37, 0.0], [0.34, 0.25], [0.3, 0.55], [0.28, 0.65], [0.2, 0.66]], 0.45, 0, 0.82);
    {
      const slit = new THREE.BoxGeometry(0.05, 0.6, 0.06);
      s.put(D, slit, 0, 0.75, 0.28); // 앞트임
    }
    // 허리띠 + 몸통 갑옷 + 가슴 원형 호심경
    {
      const belt = new THREE.TorusGeometry(0.29, 0.04, 8, 24);
      belt.rotateX(Math.PI / 2);
      belt.scale(1, 1, 0.82);
      s.put(D, belt, 0, 1.1, 0);
    }
    s.lathe(P, [[0.01, 0], [0.29, 0], [0.31, 0.25], [0.33, 0.45], [0.25, 0.58], [0.01, 0.6]], 1.1, 0, 0.75);
    {
      const disc = new THREE.CylinderGeometry(0.09, 0.09, 0.03, 16);
      disc.rotateX(Math.PI / 2);
      s.put(D, disc, 0, 1.45, 0.24);
    }
    for (let r = 0; r < 4; r++) s.box(D, -0.26, 0.26, 1.17 + r * 0.1, 1.185 + r * 0.1, 0.19, 0.23); // 비늘 줄무늬
    // 견갑 (어깨 덮개)
    for (const sx of [-1, 1]) {
      s.ball(P, 0.17, sx * 0.32, 1.6, 0, 1, 0.7, 1.05);
      s.box(D, sx * 0.32 - 0.16, sx * 0.32 + 0.16, 1.47, 1.5, -0.15, 0.15);
    }
    // 오른팔: 주먹 쥐고 허리에
    s.limb(P, [0.36, 1.58, 0], [0.48, 1.3, 0.02], 0.09, 0.1);
    s.limb(P, [0.48, 1.3, 0.02], [0.3, 1.14, 0.12], 0.09, 0.08);
    s.ball(P, 0.065, 0.28, 1.13, 0.13);
    // 왼팔: 몸 앞에 세운 장검 손잡이를 꽉 잡음
    s.limb(P, [-0.36, 1.58, 0], [-0.4, 1.3, 0.12], 0.09, 0.1);
    s.limb(P, [-0.4, 1.3, 0.12], [-0.2, 1.32, 0.34], 0.09, 0.08);
    s.ball(P, 0.07, -0.18, 1.33, 0.37);
    // 장검: 칼끝은 발 옆 땅, 칼집은 길고 곧게
    s.limb(D, [-0.24, 0.06, 0.42], [-0.18, 1.22, 0.38], 0.035, 0.03); // 칼집
    s.box(D, -0.27, -0.1, 1.22, 1.25, 0.34, 0.42); // 코등이
    s.limb(P, [-0.18, 1.25, 0.38], [-0.18, 1.5, 0.37], 0.025); // 손잡이
    s.ball(D, 0.035, -0.18, 1.52, 0.37);
    // 목 · 얼굴 · 수염
    s.limb(P, [0, 1.68, 0], [0, 1.78, 0], 0.075);
    s.ball(P, 0.15, 0, 1.88, 0.01, 0.95, 1.08, 1);
    s.box(P, -0.02, 0.02, 1.85, 1.92, 0.14, 0.17); // 코
    s.box(D, -0.08, 0.08, 1.8, 1.815, 0.13, 0.16); // 콧수염
    {
      const beard = new THREE.ConeGeometry(0.05, 0.13, 10);
      beard.rotateX(Math.PI);
      s.put(D, beard, 0, 1.72, 0.1);
    }
    // 투구: 둥근 챙 + 높은 원뿔 + 꼭대기 술 + 목가리개(뒤·옆)
    s.limb(P, [0, 1.94, 0], [0, 2.02, 0], 0.18, 0.17);
    {
      const brim = new THREE.CylinderGeometry(0.22, 0.24, 0.03, 18);
      s.put(D, brim, 0, 1.97, 0.02);
      const cone = new THREE.ConeGeometry(0.15, 0.32, 16);
      s.put(P, cone, 0, 2.18, 0);
      const flap = new THREE.CylinderGeometry(0.2, 0.25, 0.26, 16, 1, true, 0.5, Math.PI * 2 - 1.0);
      s.put(D, flap, 0, 1.84, -0.01);
    }
    s.limb(D, [0, 2.32, 0], [0, 2.42, 0], 0.015);
    s.ball(D, 0.06, 0, 2.46, 0, 1, 1.4, 1); // 투구 술
    // 등 뒤로 늘어진 전포 자락
    s.box(D, -0.26, 0.26, 0.55, 1.55, -0.3, -0.25);
  }

  // ── 등나무 쉼터 (나무 퍼걸러 + 보라색 꽃송이 + 벤치) ──
  {
    const x1 = -44;
    const x2 = -34;
    const z1 = 3.5;
    const z2 = 9.5;
    for (const x of [x1, (x1 + x2) / 2, x2]) for (const z of [z1, z2]) {
      B.box('trunk', 'deco', x - 0.12, x + 0.12, 0, 2.6, z - 0.12, z + 0.12);
      block(0, x - 0.2, x + 0.2, z - 0.2, z + 0.2);
    }
    for (const z of [z1, z2]) B.box('trunk', 'deco', x1 - 0.4, x2 + 0.4, 2.6, 2.8, z - 0.1, z + 0.1);
    for (let x = x1; x <= x2 + 0.01; x += 0.6) B.box('trunk', 'deco', x - 0.05, x + 0.05, 2.8, 2.9, z1 - 0.5, z2 + 0.5);
    for (let i = 0; i < 14; i++) {
      const lx = x1 + 0.6 + ((i * 7) % 14) * ((x2 - x1 - 1.2) / 13);
      const lz = z1 + 0.6 + ((i * 3) % 5) * ((z2 - z1 - 1.2) / 4);
      const leaf = new THREE.IcosahedronGeometry(0.9, 1);
      leaf.scale(1.2, 0.45, 1.2);
      B.geo(i % 3 ? 'leaf2' : 'leaf1', 'deco', leaf, lx, 3.1, lz);
      B.geo('wisteria', 'deco', new THREE.ConeGeometry(0.16, 0.6, 8).rotateX(Math.PI), lx + 0.4, 2.45, lz + 0.2);
      B.geo('wisteria', 'deco', new THREE.ConeGeometry(0.13, 0.5, 8).rotateX(Math.PI), lx - 0.3, 2.5, lz - 0.3);
    }
    for (const bz of [z1 + 1.2, z2 - 1.2]) {
      B.box('chair', 'deco', x1 + 1, x2 - 1, 0.45, 0.5, bz - 0.3, bz + 0.3);
      for (const bx of [x1 + 1.2, (x1 + x2) / 2, x2 - 1.2]) B.box('metal', 'deco', bx - 0.05, bx + 0.05, 0, 0.45, bz - 0.25, bz + 0.25);
      block(0, x1 + 1, x2 - 1, bz - 0.3, bz + 0.3);
    }
  }

  // ── 스탠드 지붕 (아치형 반투명 지붕 + 나무 기둥) ──
  {
    B.setY(FIELD_Y);
    archRoof('z', 18, 64, -54.5, { R: 5.6, post: 3.4 + FIELD_Y, flat: 0.32, rib: 4.6 });
    for (let z = 18; z <= 64.01; z += 4.6) {
      woodPost(-49.4, z, 3.4);
      woodPost(-59.6, z, 3.4);
    }
    B.setY(0);
  }

  // ── 경비실 (정문 안쪽) ──
  {
    const x1 = 61;
    const x2 = 64.6;
    const z1 = GATE.z1 - 4.5;
    const z2 = GATE.z1 - 1.5;
    B.box('band', 'wall', x1, x2, 0, 0.9, z1, z2);
    B.box('cream', 'wall', x1, x2, 0.9, 1.2, z1, z2);
    B.box('glass', 'glass', x1 - 0.02, x2 + 0.02, 1.2, 2.2, z1 + 0.15, z2 - 0.15);
    B.box('cream', 'wall', x1, x2, 2.2, 2.7, z1, z2);
    for (const [cx, cz] of [[x1, z1], [x2, z1], [x1, z2], [x2, z2]]) B.box('cream', 'wall', cx - 0.12, cx + 0.12, 0.9, 2.2, cz - 0.12, cz + 0.12);
    B.box('blueRoof', 'wall', x1 - 0.4, x2 + 0.4, 2.7, 2.9, z1 - 0.4, z2 + 0.4);
    const gsign = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), new THREE.MeshBasicMaterial({ map: textTex(240, 60, '#2f5aa8', '#ffffff', ['경비실'], 40) }));
    gsign.rotation.y = Math.PI / 2;
    gsign.position.set(x2 + 0.02, 2.45, (z1 + z2) / 2);
    scene.add(gsign);
    block(0, x1, x2, z1, z2);
  }


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
  scoreBoard.position.set(0, FIELD_Y + 3.2, 67.6);
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
  B.setY(FIELD_Y);
  for (let x = -64; x <= 64; x += 8) if (Math.abs(x) > 8) tree(x, 69.5, ti++);
  for (let z = 6; z <= 64; z += 8) {
    B.setY(z > FIELD_Z ? FIELD_Y : 0);
    tree(-66, z, ti++);
    if (z > GATE.z2 + 6) tree(66, z, ti++);
  }
  B.setY(0);
  // ── 서쪽 마당: 쓰레기 분리수거장 · 소각장 · 수돗가 · 음수대 · 체육 창고 · 체력단련장 ──
  {
    // 분리수거장: 콘크리트 바닥 + 철기둥 + 함석 지붕 + 뒤·옆 철망, 색깔별 수거함 + 마대
    const x1 = -62;
    const x2 = -55;
    const z1 = -13.6;
    const z2 = -10.2;
    B.box('concrete', 'deco', x1 - 0.3, x2 + 0.3, 0, 0.08, z1 - 0.3, z2 + 0.3);
    for (const x of [x1, x2]) for (const z of [z1, z2]) B.geo('metal', 'deco', new THREE.CylinderGeometry(0.06, 0.06, 2.5, 8), x, 1.25, z);
    {
      const g = new THREE.BoxGeometry(x2 - x1 + 0.8, 0.06, z2 - z1 + 0.8);
      g.rotateX(-0.12);
      B.geo('metal', 'deco', g, (x1 + x2) / 2, 2.55, (z1 + z2) / 2);
    }
    B.box('fence', 'deco', x1, x2, 0.1, 2.3, z1 - 0.03, z1);
    B.box('fence', 'deco', x1 - 0.03, x1, 0.1, 2.3, z1, z2);
    const bins = [['red', '캔'], ['yellow', '병'], ['blue', '플라스틱'], ['leaf2', '종이']];
    bins.forEach(([mat, label], i) => {
      const bx = x1 + 0.9 + i * 1.6;
      B.box(mat, 'deco', bx - 0.5, bx + 0.5, 0.08, 1.1, z1 + 0.3, z1 + 1.3);
      B.box('tv', 'deco', bx - 0.52, bx + 0.52, 1.1, 1.18, z1 + 0.28, z1 + 1.32);
      signPlane([label], 0.7, 0.3, bx, 0.7, z1 + 1.31, 0, '#ffffff', '#222222', 60);
    });
    for (let i = 0; i < 3; i++) B.box('white', 'deco', x1 + 0.6 + i * 0.9, x1 + 1.3 + i * 0.9, 0.08, 0.95, z2 - 1.2, z2 - 0.4); // 마대
    B.box('cork', 'deco', x2 - 1.6, x2 - 0.3, 0.08, 0.6, z2 - 1.3, z2 - 0.3); // 종이 박스 더미
    signPlane(['분리수거장'], 2.0, 0.42, (x1 + x2) / 2, 2.2, z2 + 0.42, 0, '#2f6a3f', '#ffffff', 46);
    block(0, x1 - 0.3, x2 + 0.3, z1 - 0.3, z2 + 0.3);
  }
  {
    // 소각장 (옛날 벽돌 소각로, 지금은 안 씀): 벽돌 몸통 + 철문 + 높은 굴뚝
    const x = -65.5;
    const z = -12;
    B.box('band', 'deco', x - 1.3, x + 1.3, 0, 2.0, z - 1.2, z + 1.2);
    B.box('tv', 'deco', x - 1.35, x + 1.35, 2.0, 2.15, z - 1.25, z + 1.25);
    B.box('darkMetal', 'deco', x - 0.45, x + 0.45, 0.3, 1.2, z + 1.2, z + 1.26);
    B.geo('steel', 'deco', new THREE.CylinderGeometry(0.03, 0.03, 0.25, 6), x + 0.3, 0.75, z + 1.3);
    B.geo('darkMetal', 'deco', new THREE.CylinderGeometry(0.28, 0.32, 6, 12), x - 0.6, 5, z - 0.5);
    B.geo('tv', 'deco', new THREE.CylinderGeometry(0.34, 0.34, 0.3, 12), x - 0.6, 7.9, z - 0.5);
    signPlane(['소각장', '사용 금지'], 1.0, 0.5, x, 1.6, z + 1.27, 0, '#c8473d', '#ffffff', 40);
    block(0, x - 1.5, x + 1.5, z - 1.4, z + 1.5);
  }
  {
    // 수돗가: 긴 콘크리트 물받이 + 흰 타일 + 수도관 + 꼭지 6개 + 배수구
    const x1 = -60;
    const x2 = -52;
    const z = -4.5;
    B.box('concrete', 'deco', x1, x2, 0, 0.75, z - 0.55, z + 0.4);
    B.box('tile', 'deco', x1 - 0.02, x2 + 0.02, 0.2, 0.75, z + 0.4, z + 0.43);
    B.box('tile', 'deco', x1 - 0.02, x2 + 0.02, 0.2, 0.75, z - 0.58, z - 0.55);
    B.box('metal', 'deco', x1 + 0.3, x2 - 0.3, 0.62, 0.75, z - 0.35, z + 0.2); // 물받이 속
    B.box('granite', 'deco', x1 - 0.05, x2 + 0.05, 0.75, 0.8, z - 0.6, z + 0.45);
    B.box('tile', 'deco', x1, x2, 0.8, 1.5, z - 0.6, z - 0.5); // 뒤 타일 벽
    {
      const pipe = new THREE.CylinderGeometry(0.03, 0.03, x2 - x1 - 0.6, 8);
      pipe.rotateZ(Math.PI / 2);
      B.geo('steel', 'deco', pipe, (x1 + x2) / 2, 1.3, z - 0.45);
    }
    for (let i = 0; i < 6; i++) {
      const fx = x1 + 0.9 + i * 1.25;
      B.geo('steel', 'deco', new THREE.CylinderGeometry(0.025, 0.025, 0.35, 8), fx, 1.12, z - 0.45);
      B.box('steel', 'deco', fx - 0.04, fx + 0.04, 0.92, 0.98, z - 0.47, z - 0.25); // 주둥이
      B.geo('blue', 'deco', new THREE.CylinderGeometry(0.06, 0.06, 0.03, 8), fx, 1.32, z - 0.45); // 손잡이
    }
    signPlane(['손을 깨끗이 씻읍시다'], 1.8, 0.3, (x1 + x2) / 2, 1.3, z - 0.49, 0, '#ffffff', '#2b4a7a', 40, '#2b4a7a');
    flatBlocks(x1 - 1, x2 + 1, z - 1.6, z + 2.0);
    block(0, x1, x2, z - 0.65, z + 0.5);
    // 음수대 (화강암 받침 + 스테인리스 대야)
    B.box('granite', 'deco', x2 + 1.2, x2 + 1.9, 0, 0.85, z - 0.3, z + 0.4);
    B.geo('steel', 'deco', new THREE.CylinderGeometry(0.3, 0.22, 0.12, 14), x2 + 1.55, 0.9, z + 0.05);
    B.geo('steel', 'deco', new THREE.CylinderGeometry(0.02, 0.02, 0.25, 6), x2 + 1.55, 1.05, z - 0.15);
    block(0, x2 + 1.1, x2 + 2.0, z - 0.4, z + 0.5);
  }
  {
    // 체육 창고: 회색 벽돌 창고 + 철제 미닫이문 + 간판, 앞에 콘·허들
    const x1 = -68.5;
    const x2 = -63;
    const z1 = -6.5;
    const z2 = -0.8;
    B.box('concrete', 'wall', x1, x2, 0, 3.0, z1, z2);
    B.box('roof', 'deco', x1 - 0.3, x2 + 0.3, 3.0, 3.25, z1 - 0.3, z2 + 0.3);
    B.box('darkMetal', 'deco', x2, x2 + 0.08, 0, 2.3, (z1 + z2) / 2 - 1.2, (z1 + z2) / 2 + 1.2);
    B.box('steel', 'deco', x2 + 0.08, x2 + 0.12, 0, 2.3, (z1 + z2) / 2 - 1.3, (z1 + z2) / 2 - 1.2);
    B.box('metal', 'deco', x2, x2 + 0.15, 2.3, 2.45, (z1 + z2) / 2 - 2.5, (z1 + z2) / 2 + 1.3); // 레일
    B.box('glass', 'glass', x1 + 1, x2 - 1, 2.0, 2.6, z1 - 0.02, z1 + 0.02);
    signPlane(['체육 창고'], 1.6, 0.42, x2 + 0.14, 2.75, (z1 + z2) / 2, Math.PI / 2, '#f7f2e2', '#2b2b2b', 50, '#7a5532');
    for (let i = 0; i < 4; i++) B.geo('orangePaint', 'deco', new THREE.ConeGeometry(0.2, 0.45, 10), x2 + 0.8, 0.22, z2 - 0.4 - i * 0.5);
    for (let i = 0; i < 2; i++) {
      const hz = z1 + 0.8 + i * 1.2;
      B.box('white', 'deco', x2 + 0.5, x2 + 1.5, 0.75, 0.82, hz - 0.03, hz + 0.03);
      for (const hx of [x2 + 0.55, x2 + 1.45]) B.box('metal', 'deco', hx - 0.02, hx + 0.02, 0, 0.75, hz - 0.02, hz + 0.02);
    }
    block(0, x1 - 0.3, x2 + 1.7, z1 - 0.3, z2 + 0.3);
  }
  {
    // 체력단련장: 평행봉 · 윗몸일으키기대 · 턱걸이대 · 안내판 (앞마당 서쪽 끝)
    const sx = -60;
    const sz = 5;
    // 평행봉
    for (const dz of [-0.35, 0.35]) {
      for (const dx of [-1.2, 1.2]) B.geo('metal', 'deco', new THREE.CylinderGeometry(0.04, 0.04, 1.4, 8), sx + dx, 0.7, sz + dz);
      const bar = new THREE.CylinderGeometry(0.035, 0.035, 2.8, 8);
      bar.rotateZ(Math.PI / 2);
      B.geo('steel', 'deco', bar, sx, 1.4, sz + dz);
    }
    block(0, sx - 1.5, sx + 1.5, sz - 0.6, sz + 0.6);
    // 윗몸일으키기대 3개 (비스듬한 나무판 + 발걸이)
    for (let i = 0; i < 3; i++) {
      const bx = sx - 6 + i * 1.3;
      const g = new THREE.BoxGeometry(0.45, 0.05, 1.8);
      g.rotateX(-0.28);
      B.geo('lectern', 'deco', g, bx, 0.45, sz + 4);
      for (const lz of [sz + 3.2, sz + 4.8]) B.box('metal', 'deco', bx - 0.2, bx + 0.2, 0, lz > sz + 4 ? 0.65 : 0.2, lz - 0.02, lz + 0.02);
      const foot = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6);
      foot.rotateZ(Math.PI / 2);
      B.geo('steel', 'deco', foot, bx, 0.95, sz + 4.85);
      block(0, bx - 0.3, bx + 0.3, sz + 3.0, sz + 5.0);
    }
    // 턱걸이대 (높이 다른 3단)
    [1.6, 2.0, 2.4].forEach((h, i) => {
      const bx = sx + 3 + i * 1.6;
      for (const dx of [-0.7, 0.7]) B.geo('metal', 'deco', new THREE.CylinderGeometry(0.04, 0.04, h, 8), bx + dx, h / 2, sz + 4.5);
      const bar = new THREE.CylinderGeometry(0.03, 0.03, 1.4, 8);
      bar.rotateZ(Math.PI / 2);
      B.geo('steel', 'deco', bar, bx, h, sz + 4.5);
      block(0, bx - 0.9, bx + 0.9, sz + 4.3, sz + 4.7);
    });
    B.geo('metal', 'deco', new THREE.CylinderGeometry(0.04, 0.04, 1.9, 8), sx + 8, 0.95, sz - 1);
    signPlane(['체력단련장', '바르게 사용합시다'], 1.4, 0.7, sx + 8, 2.1, sz - 1, 0, '#2b4a7a', '#ffffff', 36);
    block(0, sx + 7.6, sx + 8.4, sz - 1.4, sz - 0.6);
  }
  tree(-50.5, -12, 101);
  tree(-66, -8.5, 102);

  // ── 뒷마당: 보일러실 + 높은 굴뚝 · 기름 탱크 · LPG 가스통 보관함 · 정화조 뚜껑 ──
  {
    const x1 = -22;
    const x2 = -16;
    const z1 = -21.5;
    const z2 = -16.5;
    B.box('band', 'wall', x1, x2, 0, 3.4, z1, z2);
    B.box('cream', 'deco', x1 - 0.05, x2 + 0.05, 2.9, 3.0, z1 - 0.05, z2 + 0.05);
    B.box('roof', 'deco', x1 - 0.3, x2 + 0.3, 3.4, 3.6, z1 - 0.3, z2 + 0.3);
    B.box('darkMetal', 'deco', x1 + 1.5, x2 - 1.5, 0, 2.3, z2, z2 + 0.08); // 큰 철문
    B.box('steel', 'deco', (x1 + x2) / 2 - 0.02, (x1 + x2) / 2 + 0.02, 0, 2.3, z2 + 0.08, z2 + 0.1);
    B.box('glass', 'glass', x1 + 0.5, x1 + 1.2, 2.0, 2.6, z2 - 0.02, z2 + 0.02);
    B.geo('band', 'deco', new THREE.CylinderGeometry(0.55, 0.7, 14, 14), x1 + 1.2, 7, z1 + 1.2); // 굴뚝
    B.geo('tv', 'deco', new THREE.CylinderGeometry(0.62, 0.62, 0.5, 14), x1 + 1.2, 14.1, z1 + 1.2);
    for (let i = 0; i < 3; i++) B.geo('steel', 'deco', new THREE.TorusGeometry(0.6, 0.03, 6, 16), x1 + 1.2, 4 + i * 4, z1 + 1.2);
    signPlane(['보일러실', '관계자 외 출입금지'], 1.5, 0.55, (x1 + x2) / 2, 2.65, z2 + 0.1, 0, '#f7f2e2', '#2b2b2b', 36, '#7a5532');
    // 기름 탱크 (누운 원통)
    const tank = new THREE.CylinderGeometry(0.9, 0.9, 3.6, 16);
    tank.rotateZ(Math.PI / 2);
    B.geo('metal', 'deco', tank, x2 + 2.8, 1.3, (z1 + z2) / 2);
    for (const dx of [-1.2, 1.2]) B.box('concrete', 'deco', x2 + 2.8 + dx - 0.2, x2 + 2.8 + dx + 0.2, 0, 0.7, (z1 + z2) / 2 - 0.9, (z1 + z2) / 2 + 0.9);
    block(0, x1 - 0.3, x2 + 5.2, z1 - 0.3, z2 + 0.4);
  }
  {
    // LPG 가스통 보관함 (급식실 뒤, 철망 상자)
    const x1 = 1.5;
    const x2 = 5;
    const z1 = -24.5;
    const z2 = -22.5;
    B.box('concrete', 'deco', x1 - 0.2, x2 + 0.2, 0, 0.12, z1 - 0.2, z2 + 0.2);
    for (let i = 0; i < 4; i++) B.geo('metal', 'deco', new THREE.CylinderGeometry(0.32, 0.32, 1.3, 12), x1 + 0.5 + i * 0.85, 0.77, (z1 + z2) / 2);
    for (let i = 0; i < 4; i++) B.geo('steel', 'deco', new THREE.CylinderGeometry(0.08, 0.1, 0.12, 8), x1 + 0.5 + i * 0.85, 1.48, (z1 + z2) / 2);
    for (const x of [x1, x2]) for (const z of [z1, z2]) B.geo('metal', 'deco', new THREE.CylinderGeometry(0.03, 0.03, 1.8, 6), x, 0.9, z);
    B.box('fence', 'deco', x1, x2, 0.12, 1.8, z2 - 0.02, z2 + 0.02);
    B.box('fence', 'deco', x1, x2, 0.12, 1.8, z1 - 0.02, z1 + 0.02);
    B.box('fence', 'deco', x1 - 0.02, x1 + 0.02, 0.12, 1.8, z1, z2);
    B.box('fence', 'deco', x2 - 0.02, x2 + 0.02, 0.12, 1.8, z1, z2);
    B.box('metal', 'deco', x1 - 0.1, x2 + 0.1, 1.8, 1.86, z1 - 0.1, z2 + 0.1);
    signPlane(['LPG · 화기 엄금'], 1.2, 0.3, (x1 + x2) / 2, 1.5, z2 + 0.04, 0, '#c8473d', '#ffffff', 36);
    block(0, x1 - 0.2, x2 + 0.2, z1 - 0.2, z2 + 0.2);
  }
  for (const [mx, mz] of [[-8, -19], [-6.2, -19], [-4.4, -19]]) B.geo('darkMetal', 'deco', new THREE.CylinderGeometry(0.4, 0.4, 0.04, 16), mx, 0.03, mz); // 정화조 뚜껑

  // ── 동쪽 마당: 교직원 주차장 (흰 선 · 2000년대 승용차 · 봉고) ──
  {
    const x1 = 50;
    const x2 = 67;
    const z1 = -13;
    const z2 = 0;
    pave(x1, x2, z1, z2, tex.concrete, 0.025, 4);
    const car = (cx, cz, body, van = false) => {
      const w = 1.75;
      const len = van ? 4.6 : 4.4;
      if (van) {
        B.box(body, 'deco', cx - w / 2, cx + w / 2, 0.45, 1.95, cz - len / 2, cz + len / 2);
        B.box('glass', 'glass', cx - w / 2 - 0.01, cx + w / 2 + 0.01, 1.1, 1.75, cz + len / 2 - 1.4, cz + len / 2 - 0.5);
        B.box('glass', 'glass', cx - w / 2 + 0.2, cx + w / 2 - 0.2, 1.15, 1.8, cz + len / 2 - 0.02, cz + len / 2 + 0.02);
      } else {
        B.box(body, 'deco', cx - w / 2, cx + w / 2, 0.45, 1.0, cz - len / 2, cz + len / 2);
        B.box(body, 'deco', cx - w / 2 + 0.12, cx + w / 2 - 0.12, 1.0, 1.5, cz - len / 2 + 0.9, cz + len / 2 - 1.2);
        B.box('glass', 'glass', cx - w / 2 + 0.1, cx + w / 2 - 0.1, 1.05, 1.45, cz - len / 2 + 0.95, cz + len / 2 - 1.25);
      }
      for (const dx of [-w / 2 + 0.1, w / 2 - 0.1]) for (const dz of [-len / 2 + 0.8, len / 2 - 0.8]) {
        const wheel = new THREE.CylinderGeometry(0.33, 0.33, 0.2, 14);
        wheel.rotateZ(Math.PI / 2);
        B.geo('tv', 'deco', wheel, cx + dx, 0.33, cz + dz);
        B.geo('steel', 'deco', new THREE.CylinderGeometry(0.14, 0.14, 0.22, 10).rotateZ(Math.PI / 2), cx + dx, 0.33, cz + dz);
      }
      B.box('red', 'deco', cx - w / 2 + 0.1, cx - w / 2 + 0.5, 0.7, 0.9, cz - len / 2 - 0.02, cz - len / 2); // 후미등
      B.box('red', 'deco', cx + w / 2 - 0.5, cx + w / 2 - 0.1, 0.7, 0.9, cz - len / 2 - 0.02, cz - len / 2);
      B.box('white', 'deco', cx - 0.25, cx + 0.25, 0.55, 0.7, cz - len / 2 - 0.02, cz - len / 2); // 번호판
      block(0, cx - w / 2 - 0.2, cx + w / 2 + 0.2, cz - len / 2 - 0.3, cz + len / 2 + 0.3);
    };
    const cols = ['steel', 'tv', 'white', 'blue', 'white', 'cabinet'];
    for (let i = 0; i < 6; i++) {
      const cx = x1 + 1.8 + i * 2.7;
      B.box('white', 'deco', cx - 1.25, cx - 1.2, 0.03, 0.04, z1 + 0.5, z1 + 6.5);
      if (i === 5) B.box('white', 'deco', cx + 1.2, cx + 1.25, 0.03, 0.04, z1 + 0.5, z1 + 6.5);
      if (i !== 2) car(cx, z1 + 3.5, cols[i], i === 4);
    }
    B.box('white', 'deco', x1 + 0.5, x1 + 1.8 + 5 * 2.7 + 1.25, 0.03, 0.04, z1 + 6.45, z1 + 6.5);
    B.geo('metal', 'deco', new THREE.CylinderGeometry(0.04, 0.04, 2.4, 8), x1 + 1, 1.2, z2 - 0.8);
    signPlane(['교직원 주차장', '학생 출입 주의'], 1.5, 0.6, x1 + 1, 2.5, z2 - 0.8, 0, '#2b4a7a', '#ffffff', 36);
    block(0, x1 + 0.6, x1 + 1.4, z2 - 1.2, z2 - 0.4);
    // 차 막는 노란 볼라드
    for (let z = z1 + 8; z < z2; z += 2) {
      B.geo('yellow', 'deco', new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8), x1 - 0.3, 0.4, z);
      block(0, x1 - 0.5, x1 - 0.1, z - 0.2, z + 0.2);
    }
  }

  // ── 앞마당: 교훈석 · 알림 게시판 · 멀리뛰기 모래밭 · 야외 농구장 ──
  {
    // 교훈석 (큰 화강암 자연석)
    const g = new THREE.IcosahedronGeometry(1.1, 1);
    g.scale(1.4, 0.9, 0.8);
    B.geo('granite', 'deco', g, -9, 0.95, 4.6);
    B.box('granite', 'deco', -10.2, -7.8, 0, 0.3, 3.9, 5.3);
    signPlane(['성실 · 협동 · 창의'], 1.6, 0.5, -9, 1.05, 5.45, 0, '#9d9992', '#1f1b16', 44);
    block(0, -10.4, -7.6, 3.7, 5.5);
    // 알림 게시판 (유리 덮인 게시판, 기둥 두 개)
    for (const px of [7.4, 10.6]) B.geo('metal', 'deco', new THREE.CylinderGeometry(0.05, 0.05, 2.4, 8), px, 1.2, 4.2);
    B.box('darkWood', 'deco', 7.2, 10.8, 1.1, 2.4, 4.1, 4.2);
    B.box('glass', 'glass', 7.3, 10.7, 1.2, 2.3, 4.2, 4.23);
    signPlane(['알 림', '학부모 총회 · 수학여행 안내', '교내 체육대회 5월 둘째 주', '교복 공동구매 신청'], 3.3, 1.1, 9, 1.75, 4.19, 0, '#f4efe0', '#2b2b2b', 30, '#2f6a3f');
    B.box('roof', 'deco', 7.0, 11.0, 2.4, 2.55, 3.9, 4.4);
    block(0, 7.1, 10.9, 3.9, 4.5);
    B.setY(FIELD_Y);
    // 멀리뛰기 모래밭 + 도움닫기 (운동장 동쪽 끝)
    const sandTex = canvasTex(128, 128, speckle('#e3cfa6', ['#d8c293', '#ebdab8', '#cdb88e'], 1200, 5, 2));
    pave(50, 58, 19, 23, sandTex, FIELD_Y + 0.03, 2);
    B.box('concrete', 'deco', 49.9, 58.1, 0, 0.12, 18.9, 19.05);
    B.box('concrete', 'deco', 49.9, 58.1, 0, 0.12, 22.95, 23.1);
    B.box('concrete', 'deco', 49.9, 50.05, 0, 0.12, 19, 23);
    B.box('concrete', 'deco', 57.95, 58.1, 0, 0.12, 19, 23);
    pave(58, 66, 20.2, 21.8, tex.concrete, FIELD_Y + 0.025, 3); // 도움닫기 길
    B.box('white', 'deco', 58.2, 58.4, 0.026, 0.03, 20.2, 21.8); // 발 구름판
    signPlane(['멀리뛰기'], 1.0, 0.3, 54, FIELD_Y + 0.6, 18.85, 0, '#ffffff', '#2b4a7a', 44, '#2b4a7a');
    // 야외 농구장 (반 코트): 콘크리트 + 흰 선 + 철제 골대
    const bx1 = 52;
    const bx2 = 66;
    const bz1 = 52;
    const bz2 = 66;
    pave(bx1, bx2, bz1, bz2, tex.concrete, FIELD_Y + 0.025, 4);
    const line = (x1, x2, z1, z2) => B.box('white', 'deco', x1, x2, 0.03, 0.04, z1, z2);
    line(bx1 + 0.3, bx2 - 0.3, bz1 + 0.3, bz1 + 0.38);
    line(bx1 + 0.3, bx2 - 0.3, bz2 - 0.38, bz2 - 0.3);
    line(bx1 + 0.3, bx1 + 0.38, bz1 + 0.3, bz2 - 0.3);
    line(bx2 - 0.38, bx2 - 0.3, bz1 + 0.3, bz2 - 0.3);
    line(bx2 - 6, bx2 - 5.92, bz1 + 4.5, bz2 - 4.5); // 자유투 라인
    line(bx2 - 6, bx2 - 0.3, bz1 + 4.5, bz1 + 4.58);
    line(bx2 - 6, bx2 - 0.3, bz2 - 4.58, bz2 - 4.5);
    {
      const hx = bx2 - 0.9;
      const hz = (bz1 + bz2) / 2;
      B.geo('metal', 'deco', new THREE.CylinderGeometry(0.08, 0.08, 3.6, 10), hx + 0.6, 1.8, hz);
      B.box('metal', 'deco', hx, hx + 0.6, 3.3, 3.4, hz - 0.05, hz + 0.05);
      B.box('white', 'deco', hx - 0.04, hx, 2.9, 3.95, hz - 0.9, hz + 0.9); // 백보드
      B.box('red', 'deco', hx - 0.05, hx - 0.04, 3.05, 3.5, hz - 0.3, hz + 0.3);
      const ring = new THREE.TorusGeometry(0.23, 0.02, 6, 18);
      ring.rotateX(Math.PI / 2);
      B.geo('orangePaint', 'deco', ring, hx - 0.3, 3.05, hz);
      block(0, hx - 0.2, hx + 0.9, hz - 0.3, hz + 0.3);
    }
    B.setY(0);
  }

  flatBlocks(STORE.minX - 3.5, STORE.maxX + 2, STORE.maxZ, STORE.maxZ + 4); // 매점 앞 보도블록
  // ── 뒷마당 채우기: 텃밭 · 비닐하우스 · 야외학습장 · 폐 책걸상 더미 · 컨테이너 창고 · 급식 하역장 · 후문 · 배드민턴장 · 뒷담 나무 ──
  {
    // 학교 텃밭 (서쪽 뒤): 흙 고랑 + 상추·고추·토마토 지주대, 낮은 철망 울타리, 팻말
    const gx1 = -64;
    const gx2 = -44;
    const gz1 = -43.2;
    const gz2 = -35.5;
    pave(gx1, gx2, gz1, gz2, tex.dirt, 0.022, 3);
    for (let r = 0; r < 6; r++) {
      const rz = gz1 + 0.9 + r * 1.2;
      B.box('trunk', 'deco', gx1 + 0.6, gx2 - 0.6, 0.02, 0.18, rz - 0.3, rz + 0.3); // 고랑
      for (let x = gx1 + 1.0; x < gx2 - 0.8; x += 0.75) {
        if (r < 3) B.geo(r === 0 ? 'leaf2' : 'leaf1', 'deco', new THREE.IcosahedronGeometry(0.18, 0), x, 0.3, rz);
        else {
          B.geo('lectern', 'deco', new THREE.CylinderGeometry(0.015, 0.015, 1.1, 5), x, 0.65, rz);
          B.geo('leaf1', 'deco', new THREE.IcosahedronGeometry(0.16, 0), x, 0.6, rz + 0.05);
          if (Math.round(x * 4) % 3 === 0) B.geo(r === 5 ? 'red' : 'leaf2', 'deco', new THREE.SphereGeometry(0.06, 6, 5), x + 0.08, 0.8, rz + 0.1);
        }
      }
    }
    for (const [a, b, c, d] of [[gx1, gx2, gz1 - 0.02, gz1 + 0.02], [gx1, gx2, gz2 - 0.02, gz2 + 0.02], [gx1 - 0.02, gx1 + 0.02, gz1, gz2], [gx2 - 0.02, gx2 + 0.02, gz1, gz2]])
      B.box('fence', 'deco', a, b, 0.05, 0.7, c, d);
    for (let x = gx1; x <= gx2 + 0.01; x += 2.5) for (const z of [gz1, gz2]) B.geo('metal', 'deco', new THREE.CylinderGeometry(0.025, 0.025, 0.8, 6), x, 0.4, z);
    B.geo('metal', 'deco', new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6), gx2 + 0.5, 0.8, gz2 + 0.3);
    signPlane(['사랑의 학교 텃밭', '1학년 · 환경반'], 1.4, 0.6, gx2 + 0.5, 1.7, gz2 + 0.3, 0, '#5a8a3c', '#ffffff', 36);
    B.geo('blue', 'deco', new THREE.CylinderGeometry(0.18, 0.15, 0.3, 10), gx2 + 1.2, 0.15, gz2 + 0.6); // 물뿌리개 통
    B.geo('steel', 'deco', new THREE.CylinderGeometry(0.03, 0.03, 1.0, 6), gx1 + 0.4, 0.5, gz2 + 0.8); // 수도
    B.box('steel', 'deco', gx1 + 0.4, gx1 + 0.6, 0.95, 1.0, gz2 + 0.78, gz2 + 0.82);
    block(0, gx1 - 0.2, gx2 + 1.5, gz1 - 0.2, gz2 + 0.2);
    // 비닐하우스 (반투명 흰 비닐 + 쇠 파이프 뼈대)
    const hx1 = -42;
    const hx2 = -34;
    const hz1 = -43.5;
    const hz2 = -36.5;
    {
      const g = new THREE.CylinderGeometry(2.2, 2.2, hx2 - hx1, 18, 1, true, 0, Math.PI);
      g.rotateZ(Math.PI / 2);
      g.scale(1, 1.2, (hz2 - hz1) / 4.4);
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: '#f4f7f2', transparent: true, opacity: 0.55, roughness: 0.6, side: THREE.DoubleSide }));
      m.position.set((hx1 + hx2) / 2, 0.05, (hz1 + hz2) / 2);
      m.castShadow = true;
      scene.add(m);
      for (const ex of [hx1, hx2]) {
        const c = new THREE.CircleGeometry(2.2, 18, 0, Math.PI);
        c.scale(1, 1.2, 1);
        c.scale((hz2 - hz1) / 4.4, 1, 1);
        c.rotateY(Math.PI / 2);
        const cm = new THREE.Mesh(c, new THREE.MeshStandardMaterial({ color: '#f4f7f2', transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
        cm.position.set(ex, 0.05, (hz1 + hz2) / 2);
        scene.add(cm);
      }
      for (let x = hx1; x <= hx2 + 0.01; x += 1.6) {
        const r = new THREE.TorusGeometry(2.2, 0.025, 6, 18, Math.PI);
        r.scale((hz2 - hz1) / 4.4, 1.2, 1);
        r.rotateY(Math.PI / 2);
        B.geo('metal', 'deco', r, x, 0.05, (hz1 + hz2) / 2);
      }
      B.box('door', 'deco', hx2 - 0.02, hx2 + 0.02, 0, 1.9, (hz1 + hz2) / 2 - 0.5, (hz1 + hz2) / 2 + 0.5);
      for (let i = 0; i < 2; i++) B.box('trunk', 'deco', hx1 + 0.5, hx2 - 0.5, 0.02, 0.15, hz1 + 1.2 + i * 2.6, hz1 + 2.2 + i * 2.6);
      for (let x = hx1 + 0.9; x < hx2 - 0.5; x += 0.8) for (let i = 0; i < 2; i++) B.geo('leaf1', 'deco', new THREE.IcosahedronGeometry(0.2, 0), x, 0.3, hz1 + 1.7 + i * 2.6);
      signPlane(['비닐하우스 · 원예반'], 1.4, 0.3, hx2 + 0.03, 2.2, (hz1 + hz2) / 2, Math.PI / 2, '#f7f2e2', '#2b2b2b', 36, '#7a5532');
      block(0, hx1 - 0.3, hx2 + 0.3, hz1 - 0.3, hz2 + 0.3);
    }
    // 폐 책걸상 더미 (버리는 낡은 책상·의자 쌓아 둠) + 팻말
    const px = -26;
    const pz = -42;
    for (let i = 0; i < 9; i++) {
      const x = px + (i % 3) * 1.1 + ((i * 7) % 3) * 0.1;
      const z = pz + Math.floor(i / 3) * 0.9;
      const lvl = Math.floor(i / 4);
      const y = lvl * 0.85;
      const g = new THREE.BoxGeometry(0.65, 0.04, 0.45);
      g.rotateY(((i * 37) % 7) * 0.1 - 0.3);
      B.geo('deskTop', 'deco', g, x, y + 0.72, z);
      for (const [dx, dz] of [[-0.28, -0.18], [0.28, -0.18], [-0.28, 0.18], [0.28, 0.18]]) B.geo('metal', 'deco', new THREE.CylinderGeometry(0.015, 0.015, 0.7, 5), x + dx, y + 0.36, z + dz);
    }
    for (let i = 0; i < 5; i++) {
      const g = new THREE.BoxGeometry(0.38, 0.04, 0.38);
      g.rotateZ(i % 2 ? 0.4 : -0.3);
      g.rotateY(i * 0.7);
      B.geo('chair', 'deco', g, px + 3.6 + (i % 2) * 0.5, 0.3 + i * 0.28, pz + 0.3 + (i % 3) * 0.4);
    }
    B.box('cork', 'deco', px - 0.8, px - 0.2, 0, 0.5, pz - 0.3, pz + 1.2); // 낡은 책 묶음
    signPlane(['폐기물 적치장', '손대지 마시오'], 1.2, 0.55, px + 1.8, 1.6, pz + 1.9, 0, '#c8473d', '#ffffff', 36);
    B.geo('metal', 'deco', new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6), px + 1.8, 0.8, pz + 1.9);
    block(0, px - 1.0, px + 4.6, pz - 0.6, pz + 2.2);
    // 파란 컨테이너 창고 (동쪽 뒤)
    const cx1 = 40;
    const cx2 = 46;
    const cz1 = -43;
    const cz2 = -40.6;
    B.box('blue', 'deco', cx1, cx2, 0.1, 2.7, cz1, cz2);
    for (let x = cx1 + 0.3; x < cx2; x += 0.3) B.box('tv', 'deco', x - 0.015, x + 0.015, 0.2, 2.6, cz2, cz2 + 0.01);
    B.box('darkMetal', 'deco', cx2 - 1.3, cx2 - 0.2, 0.1, 2.3, cz2, cz2 + 0.03);
    B.box('steel', 'deco', cx2 - 0.8, cx2 - 0.75, 1.0, 1.3, cz2 + 0.03, cz2 + 0.06);
    B.box('concrete', 'deco', cx1 - 0.2, cx2 + 0.2, 0, 0.1, cz1 - 0.2, cz2 + 0.2);
    signPlane(['창 고'], 0.9, 0.35, (cx1 + cx2) / 2, 2.2, cz2 + 0.02, 0, '#ffffff', '#2b4a7a', 44, '#2b4a7a');
    block(0, cx1 - 0.3, cx2 + 0.3, cz1 - 0.3, cz2 + 0.3);
    // 급식실 뒤 하역장: 높은 콘크리트 단 + 식자재 트럭 + 음식물 쓰레기통 + 빈 상자
    const dx1 = 14;
    const dx2 = 24;
    const dz1 = -39.5;
    const dz2 = ANNEX.minZ;
    B.box('concrete', 'wall', dx1, dx2, 0, 0.9, dz1, dz2);
    B.box('yellow', 'deco', dx1, dx2, 0.9, 0.92, dz1, dz1 + 0.1);
    B.box('steel', 'deco', dx1 + 0.3, dx2 - 0.3, 0.3, 0.9, dz1 + 0.02, dz1 + 0.06); // 완충 고무판 느낌
    const dg = new THREE.BoxGeometry(2.0, 0.12, 3.2);
    dg.rotateX(-Math.atan2(0.9, 3.0));
    B.geo('concrete', 'wall', dg, dx1 - 1.1, 0.45, dz1 + 1.5); // 경사로
    block(0, dx1 - 2.2, dx2 + 0.2, dz1 - 0.3, dz2);
    // 1톤 트럭 (흰 캡 + 파란 짐칸 덮개)
    {
      const tx = (dx1 + dx2) / 2;
      const tz = dz1 - 2.8;
      B.box('white', 'deco', tx - 0.9, tx + 0.9, 0.5, 2.0, tz - 2.4, tz - 1.2);
      B.box('glass', 'glass', tx - 0.8, tx + 0.8, 1.2, 1.85, tz - 2.42, tz - 2.38);
      B.box('glass', 'glass', tx - 0.91, tx + 0.91, 1.2, 1.8, tz - 2.2, tz - 1.4);
      B.box('metal', 'deco', tx - 0.9, tx + 0.9, 0.5, 0.75, tz - 1.2, tz + 1.4);
      B.box('blue', 'deco', tx - 0.95, tx + 0.95, 0.75, 1.0, tz - 1.2, tz + 1.4);
      B.box('white', 'deco', tx - 0.95, tx + 0.95, 1.0, 2.1, tz - 1.2, tz + 1.4);
      signPlane(['○○유통 · 식자재'], 1.6, 0.3, tx, 1.6, tz + 1.41, 0, '#2b4a7a', '#ffffff', 34);
      for (const [wx, wz] of [[-0.9, -1.6], [0.9, -1.6], [-0.9, 0.9], [0.9, 0.9]]) {
        const w = new THREE.CylinderGeometry(0.33, 0.33, 0.22, 12);
        w.rotateZ(Math.PI / 2);
        B.geo('tv', 'deco', w, tx + wx, 0.33, tz + wz);
      }
      block(0, tx - 1.2, tx + 1.2, tz - 2.7, tz + 1.7);
    }
    for (let i = 0; i < 3; i++) {
      const bx = dx2 + 1.0 + i * 0.9;
      B.box('leaf2', 'deco', bx - 0.35, bx + 0.35, 0, 0.9, dz1 + 0.5, dz1 + 1.2);
      B.box('leaf1', 'deco', bx - 0.38, bx + 0.38, 0.9, 0.98, dz1 + 0.47, dz1 + 1.23);
      signPlane(['음식물'], 0.5, 0.2, bx, 0.6, dz1 + 0.49, 0, '#ffffff', '#2f6a3f', 40);
    }
    block(0, dx2 + 0.5, dx2 + 3.3, dz1 + 0.3, dz1 + 1.4);
    for (let i = 0; i < 4; i++) B.box('cork', 'deco', dx1 - 1.0 + (i % 2) * 0.7, dx1 - 0.4 + (i % 2) * 0.7, Math.floor(i / 2) * 0.45, Math.floor(i / 2) * 0.45 + 0.42, dz2 - 1.3, dz2 - 0.7);
    block(0, dx1 - 1.2, dx1 + 0.5, dz2 - 1.5, dz2 - 0.5);
    // 후문 (뒷담 쪽문): 철제 쪽문 + 기둥 + 작은 팻말 (잠겨 있음)
    const fx = -8;
    for (const px2 of [fx - 0.9, fx + 0.9]) B.box('band', 'deco', px2 - 0.25, px2 + 0.25, 0, 2.4, -46.5, -45.7);
    B.box('darkMetal', 'deco', fx - 0.65, fx + 0.65, 0.05, 2.1, -46.05, -45.95);
    for (let x = fx - 0.5; x <= fx + 0.5; x += 0.25) B.box('steel', 'deco', x - 0.015, x + 0.015, 0.2, 2.0, -45.95, -45.92);
    signPlane(['후문 · 하교 후 잠금'], 1.2, 0.3, fx, 2.6, -45.6, 0, '#f7f2e2', '#2b2b2b', 32, '#7a5532');
    B.geo('metal', 'deco', new THREE.CylinderGeometry(0.04, 0.04, 3.5, 8), fx + 1.6, 1.75, -45.2);
    B.geo('lamp', 'deco', new THREE.SphereGeometry(0.18, 10, 8), fx + 1.6, 3.6, -45.2);
    flatBlocks(fx - 2.5, fx + 2.5, -45.7, -41);
    block(0, fx - 1.3, fx + 1.3, -46.5, -45.6);
    // 배드민턴장 (동쪽 뒤): 흰 선 + 네트
    const bx1 = 52;
    const bx2 = 65.4;
    const bz1 = -31;
    const bz2 = -24.9;
    const line = (x1, x2, z1, z2) => B.box('white', 'deco', x1, x2, 0.03, 0.04, z1, z2);
    line(bx1, bx2, bz1, bz1 + 0.05);
    line(bx1, bx2, bz2 - 0.05, bz2);
    line(bx1, bx1 + 0.05, bz1, bz2);
    line(bx2 - 0.05, bx2, bz1, bz2);
    line(bx1, bx2, (bz1 + bz2) / 2 - 0.025, (bz1 + bz2) / 2 + 0.025);
    line((bx1 + bx2) / 2 - 0.025, (bx1 + bx2) / 2 + 0.025, bz1, bz2);
    for (const z of [bz1 - 0.5, bz2 + 0.5]) {
      B.geo('metal', 'deco', new THREE.CylinderGeometry(0.04, 0.04, 1.55, 8), (bx1 + bx2) / 2, 0.775, z);
      block(0, (bx1 + bx2) / 2 - 0.2, (bx1 + bx2) / 2 + 0.2, z - 0.2, z + 0.2);
    }
    const net = new THREE.Mesh(new THREE.PlaneGeometry(bz2 - bz1 + 1, 0.76), new THREE.MeshStandardMaterial({ color: '#1f2a33', transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
    net.rotation.y = Math.PI / 2;
    net.position.set((bx1 + bx2) / 2, 1.17, (bz1 + bz2) / 2);
    scene.add(net);
    B.box('white', 'deco', (bx1 + bx2) / 2 - 0.01, (bx1 + bx2) / 2 + 0.01, 1.53, 1.57, bz1 - 0.5, bz2 + 0.5);
    signPlane(['배드민턴장'], 1.0, 0.3, (bx1 + bx2) / 2, 0.4, bz1 - 0.6, 0, '#ffffff', '#2b4a7a', 40, '#2b4a7a');
    // 뒷담 따라 나무, 배수로 (본관 뒤)
    for (let x = -62; x <= 62; x += 11) if (!(x > 12 && x < 26) && !(x > -30 && x < -20) && !(x > 38 && x < 48) && Math.abs(x + 8) > 2.5) tree(x, -44.3, 120 + Math.round(x));
    for (let x = -46; x <= 46; x += 10) if (Math.abs(x) > 6 && Math.abs(x) < 39) B.box('darkMetal', 'deco', x - 2, x + 2, 0.02, 0.035, Z_BACK - 6.3, Z_BACK - 5.9);
  }

  // 담장 + 정문
  // 학교 담장: 붉은 벽돌 기단(1.1m) + 콘크리트 갓돌 + 초록 철제 창살(2.1m까지) + 8m 마다 벽돌 기둥(갓 씌움)
  const wallSeg = (x1, x2, z1, z2) => {
    const thinX = x2 - x1 < 1;
    B.box('brick', 'wall', x1, x2, -1.4, 1.1, z1, z2);
    B.box('concrete', 'deco', x1 - 0.05, x2 + 0.05, 1.1, 1.18, z1 - 0.05, z2 + 0.05);
    const cx = (x1 + x2) / 2;
    const cz = (z1 + z2) / 2;
    const a1 = thinX ? z1 : x1;
    const a2 = thinX ? z2 : x2;
    // 가로대 2줄 + 창살
    for (const y of [1.3, 2.0]) {
      if (thinX) B.box('fence', 'deco', cx - 0.03, cx + 0.03, y - 0.03, y + 0.03, a1, a2);
      else B.box('fence', 'deco', a1, a2, y - 0.03, y + 0.03, cz - 0.03, cz + 0.03);
    }
    for (let a = a1 + 0.1; a < a2; a += 0.16) {
      if (thinX) B.box('fence', 'deco', cx - 0.015, cx + 0.015, 1.18, 2.1, a, a + 0.03);
      else B.box('fence', 'deco', a, a + 0.03, 1.18, 2.1, cz - 0.015, cz + 0.015);
      if (Math.round((a - a1) / 0.16) % 4 === 0) {
        if (thinX) B.geo('fence', 'deco', new THREE.ConeGeometry(0.03, 0.08, 4), cx, 2.14, a + 0.015);
        else B.geo('fence', 'deco', new THREE.ConeGeometry(0.03, 0.08, 4), a + 0.015, 2.14, cz);
      }
    }
    for (let a = a1; a <= a2 + 0.01; a += 8) {
      const px = thinX ? cx : Math.min(a, a2);
      const pz = thinX ? Math.min(a, a2) : cz;
      B.box('brick', 'deco', px - 0.28, px + 0.28, 0, 2.3, pz - 0.28, pz + 0.28);
      B.box('concrete', 'deco', px - 0.34, px + 0.34, 2.3, 2.42, pz - 0.34, pz + 0.34);
      B.geo('concrete', 'deco', new THREE.ConeGeometry(0.34, 0.2, 4), px, 2.52, pz);
    }
  };
  wallSeg(-69.5, -69.1, -46, FIELD_Z);
  wallSeg(69.1, 69.5, -46, GATE.z1);
  wallSeg(69.1, 69.5, GATE.z2, FIELD_Z);
  wallSeg(-69.5, 69.5, -46.4, -46);
  B.setY(FIELD_Y); // 운동장 둘레 담장은 낮은 땅 기준
  wallSeg(-69.5, 69.5, 73, 73.4);
  wallSeg(-69.5, -69.1, FIELD_Z, 73.4);
  wallSeg(69.1, 69.5, FIELD_Z, 73.4);
  B.setY(0);
  // ── 교문 (실제 교문처럼) ──
  // 벽돌 큰 기둥 + 화강암 머릿돌, 바퀴 달린 철제 미닫이 교문(반쯤 열림) + 바닥 레일, 기둥에 학교 이름
  {
    const gx = 69.3;
    for (const gz of [GATE.z1 - 0.7, GATE.z2 + 0.7]) {
      B.box('band', 'wall', gx - 0.7, gx + 0.7, 0, 3.2, gz - 0.7, gz + 0.7);
      B.box('granite', 'deco', gx - 0.85, gx + 0.85, 3.2, 3.45, gz - 0.85, gz + 0.85);
      B.box('granite', 'deco', gx - 0.6, gx + 0.6, 3.45, 3.6, gz - 0.6, gz + 0.6);
      B.geo('lamp', 'deco', new THREE.SphereGeometry(0.22, 14, 10), gx, 3.85, gz);
      block(0, gx - 0.7, gx + 0.7, gz - 0.7, gz + 0.7);
    }
    for (const face of [1, -1]) {
      const nm = new THREE.Mesh(
        new THREE.PlaneGeometry(0.9, 2.3),
        new THREE.MeshBasicMaterial({ map: textTex(128, 330, '#e8e2d2', '#1f1f1f', ['온', '라', '인', '중', '학', '교'], 46, '#8a8578') }),
      );
      nm.rotation.y = face > 0 ? Math.PI / 2 : -Math.PI / 2;
      nm.position.set(gx + face * 0.71, 1.7, GATE.z1 - 0.7);
      scene.add(nm);
    }
    // 바닥 레일
    B.box('metal', 'deco', gx - 0.12, gx - 0.08, 0, 0.03, GATE.z1, GATE.z2 + 6);
    B.box('metal', 'deco', gx + 0.08, gx + 0.12, 0, 0.03, GATE.z1, GATE.z2 + 6);
    // 철제 미닫이 교문: 담장 쪽으로 밀어 열어 둔 상태 (일부는 열린 문 안쪽에 걸쳐 있음)
    const gz1 = GATE.z2 - 1.6;
    const gz2 = GATE.z2 + 5.6;
    B.box('fence', 'deco', gx - 0.06, gx + 0.06, 0.18, 0.28, gz1, gz2);
    B.box('fence', 'deco', gx - 0.06, gx + 0.06, 1.95, 2.05, gz1, gz2);
    B.box('fence', 'deco', gx - 0.06, gx + 0.06, 1.0, 1.06, gz1, gz2);
    for (let z = gz1; z <= gz2 + 0.01; z += 0.16) B.box('fence', 'deco', gx - 0.025, gx + 0.025, 0.18, 2.05, z - 0.02, z + 0.02);
    for (let z = gz1 + 0.2; z < gz2; z += 1.2) {
      const tip = new THREE.ConeGeometry(0.05, 0.16, 6);
      B.geo('yellow', 'deco', tip, gx, 2.13, z);
    }
    for (const wz of [gz1 + 0.4, gz2 - 0.4]) B.geo('tv', 'deco', new THREE.CylinderGeometry(0.09, 0.09, 0.07, 12).rotateZ(Math.PI / 2), gx, 0.1, wz);
    block(0, gx - 0.1, gx + 0.1, gz1, gz2);
    // 교명석 (학교 이름을 새긴 큰 돌, 교문 밖)
    const stone = new THREE.IcosahedronGeometry(1.0, 1);
    stone.scale(1.5, 1.1, 0.7);
    B.geo('granite', 'deco', stone, 72.6, 0.9, GATE.z1 - 2.2);
    B.box('granite', 'deco', 71.4, 73.8, 0, 0.25, GATE.z1 - 2.8, GATE.z1 - 1.6);
    const carve = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.6), new THREE.MeshBasicMaterial({ map: textTex(380, 120, '#9d998f', '#2b2b2b', ['온라인중학교'], 60), transparent: true }));
    carve.rotation.y = Math.PI / 2;
    carve.position.set(74.15, 1.0, GATE.z1 - 2.2);
    scene.add(carve);
    block(0, 71.3, 73.9, GATE.z1 - 2.9, GATE.z1 - 1.5);
  }
  // 학교 담장은 교문 말고는 지나갈 수 없음
  block(0, 69.0, 69.6, -46, GATE.z1);
  block(0, 69.0, 69.6, GATE.z2, 73.4);

  // ── 학교 밖 등굣길 ──
  {
    const O = OUT;
    // 보도 (학교 쪽, 건너편)
    flatBlocks(O.wall, O.curb, -45, 72.5);
    flatBlocks(O.road2, O.shops, -45, 72.5);
    B.box('granite', 'deco', O.curb - 0.18, O.curb, 0, 0.13, -45, 72.5);
    B.box('granite', 'deco', O.road2, O.road2 + 0.18, 0, 0.13, -45, 72.5);
    // 차도 (아스팔트 + 노란 중앙선) + 어린이 보호구역 빨간 포장 + 횡단보도
    const roadTex = canvasTex(128, 256, (g, w, h) => {
      speckle('#3e4044', ['#46484c', '#36383b', '#505257'], 900, 23, 2)(g, w, h);
      g.fillStyle = '#e8c23a';
      g.fillRect(w / 2 - 5, 0, 3, h);
      g.fillRect(w / 2 + 2, 0, 3, h);
    });
    roadTex.repeat.set(1, 117.5 / 8);
    flat(O.road2 - O.curb, 117.5, roadTex, (O.curb + O.road2) / 2, 0.01, (72.5 - 45) / 2);
    const zoneTex = canvasTex(64, 64, speckle('#a83a32', ['#b5443b', '#9a332c'], 300, 31, 2));
    zoneTex.repeat.set(2, 6);
    const zone = new THREE.Mesh(new THREE.PlaneGeometry(O.road2 - O.curb, 34), new THREE.MeshStandardMaterial({ map: zoneTex, roughness: 0.95 }));
    zone.rotation.x = -Math.PI / 2;
    zone.position.set((O.curb + O.road2) / 2, 0.015, 8.5);
    zone.receiveShadow = true;
    scene.add(zone);
    walkables.push(zone);
    const zoneText = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.6), new THREE.MeshBasicMaterial({ map: textTex(600, 160, 'rgba(0,0,0,0)', '#ffffff', ['어린이 보호구역'], 96), transparent: true }));
    zoneText.rotation.x = -Math.PI / 2;
    zoneText.rotation.z = Math.PI / 2;
    zoneText.position.set((O.curb + O.road2) / 2, 0.02, -2);
    scene.add(zoneText);
    for (let x = O.curb + 0.3; x < O.road2 - 0.3; x += 0.9) B.box('white', 'deco', x, x + 0.5, 0.016, 0.022, GATE.z1 + 1.5, GATE.z2 - 1.5); // 횡단보도
    // 어린이 보호구역 표지판 + 노란 보행 안전 울타리
    for (const [sx, sz] of [[O.curb - 0.5, -6], [O.curb - 0.5, 24]]) {
      B.geo('pole', 'deco', new THREE.CylinderGeometry(0.04, 0.04, 2.6, 8), sx, 1.3, sz);
      const sg = new THREE.Mesh(
        new THREE.PlaneGeometry(0.8, 0.8),
        new THREE.MeshBasicMaterial({ map: textTex(200, 200, '#f2c230', '#1f1f1f', ['어린이', '보호구역'], 42, '#c8473d'), side: THREE.DoubleSide }),
      );
      sg.rotation.y = Math.PI / 2;
      sg.position.set(sx, 2.35, sz);
      scene.add(sg);
      block(0, sx - 0.15, sx + 0.15, sz - 0.15, sz + 0.15);
    }
    for (const [z1, z2] of [[-30, GATE.z1 - 0.5], [GATE.z2 + 0.5, 60]]) {
      for (let z = z1; z < z2; z += 2) B.box('yellow', 'deco', O.curb - 0.42, O.curb - 0.36, 0, 0.9, z, z + 0.06);
      B.box('yellow', 'deco', O.curb - 0.42, O.curb - 0.36, 0.82, 0.9, z1, z2);
      block(0, O.curb - 0.5, O.curb - 0.28, z1, z2);
    }
    // 가로수 · 가로등
    let ti2 = 3;
    for (let z = -40; z <= 68; z += 9) {
      if (z > GATE.z1 - 4 && z < GATE.z2 + 4) continue;
      tree(O.curb - 1.4, z, ti2++);
    }
    for (let z = -36; z <= 66; z += 18) {
      B.geo('pole', 'deco', new THREE.CylinderGeometry(0.06, 0.09, 5.2, 8), O.curb - 0.9, 2.6, z);
      B.box('pole', 'deco', O.curb - 0.9, O.curb + 0.4, 5.1, 5.2, z - 0.05, z + 0.05);
      B.box('lamp', 'deco', O.curb + 0.1, O.curb + 0.6, 4.95, 5.1, z - 0.15, z + 0.15);
      block(0, O.curb - 1.05, O.curb - 0.75, z - 0.15, z + 0.15);
    }
    // 건너편 가게들: 학원 · 분식집 · 문방구 · 슈퍼
    const shop = (z1, z2, name, signBg, signFg, wallMat, awning, floors = 1) => {
      const x1 = O.shops;
      const x2 = O.maxX;
      const H = floors * 3.2;
      B.box(wallMat, 'wall', x1, x2, 0, H, z1, z2);
      B.box('glass', 'glass', x1 - 0.06, x1, 0.3, 2.5, z1 + 0.5, z2 - 0.5);
      B.box('frame', 'deco', x1 - 0.08, x1, 0.3, 0.36, z1 + 0.5, z2 - 0.5);
      for (let z = z1 + 0.5; z <= z2 - 0.49; z += (z2 - z1 - 1) / 3) B.box('frame', 'deco', x1 - 0.08, x1, 0.3, 2.5, z - 0.04, z + 0.04);
      if (floors > 1) for (let f = 1; f < floors; f++) B.box('glass', 'glass', x1 - 0.06, x1, f * 3.2 + 0.9, f * 3.2 + 2.4, z1 + 1, z2 - 1);
      // 줄무늬 차양
      const aw = new THREE.BoxGeometry(1.4, 0.06, z2 - z1 - 0.6);
      aw.rotateZ(-0.35);
      B.geo(awning, 'deco', aw, x1 - 0.65, 2.85, (z1 + z2) / 2);
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(z2 - z1 - 1, 0.9), new THREE.MeshBasicMaterial({ map: textTex(600, 110, signBg, signFg, [name], 76) }));
      sg.rotation.y = -Math.PI / 2;
      sg.position.set(x1 - 0.05, 3.4, (z1 + z2) / 2);
      if (floors > 1) sg.position.y = H - 0.7;
      scene.add(sg);
      block(0, x1 - 0.1, x2, z1, z2);
    };
    shop(-24, -12, '해법 보습학원', '#2f5aa8', '#ffffff', 'cream', 'blue', 2);
    shop(-10, 0, '행복 슈퍼', '#2f7a52', '#ffffff', 'cream', 'leaf2');
    shop(2, 15, '으뜸 문구 · 완구', '#e1b43a', '#c8473d', 'cream', 'red');
    shop(17, 27, '엄마손 분식', '#c8473d', '#ffffff', 'cream', 'yellow');
    shop(29, 41, '동네 문방구 2호점', '#f2ead6', '#2b2b2b', 'band', 'blue');
    // 문방구 앞: 오락기 2대 + 뽑기 기계
    for (const [z, col] of [[4.2, 'blue'], [5.4, 'red']]) {
      B.box(col, 'deco', O.shops - 1.1, O.shops - 0.3, 0, 1.55, z - 0.45, z + 0.45);
      B.box('screen', 'deco', O.shops - 1.11, O.shops - 1.1, 0.95, 1.4, z - 0.3, z + 0.3);
      B.box('tv', 'deco', O.shops - 1.35, O.shops - 1.1, 0.8, 0.88, z - 0.4, z + 0.4);
      block(0, O.shops - 1.4, O.shops - 0.3, z - 0.45, z + 0.45);
    }
    for (const z of [12.2, 13.2]) {
      B.box('red', 'deco', O.shops - 0.9, O.shops - 0.3, 0, 0.8, z - 0.35, z + 0.35);
      B.box('glass', 'glass', O.shops - 0.88, O.shops - 0.32, 0.8, 1.3, z - 0.33, z + 0.33);
      for (let c = 0; c < 6; c++) B.geo(['yellow', 'blue', 'leaf2', 'white'][c % 4], 'deco', new THREE.SphereGeometry(0.07, 8, 6), O.shops - 0.6 + ((c % 2) - 0.5) * 0.2, 0.9 + Math.floor(c / 2) * 0.1, z - 0.15 + (c % 3) * 0.12);
      block(0, O.shops - 0.9, O.shops - 0.3, z - 0.35, z + 0.35);
    }
  }


  // 급식차 그룹 (점심시간에만 보임): 스테인리스 2단 카트 + 밥통·국통·반찬통 + 식판 더미 + 국자
  const cartGroup = new THREE.Group();
  cartGroup.visible = false;
  scene.add(cartGroup);
  {
    const CB = createBatcher();
    for (const c of cartSpots) {
      const { x: cx, z: cz2, y: L } = c;
      CB.box('steel', 'deco', cx - 0.45, cx + 0.45, L + 0.1, L + 0.14, cz2 - 0.3, cz2 + 0.3);
      CB.box('steel', 'deco', cx - 0.45, cx + 0.45, L + 0.82, L + 0.86, cz2 - 0.3, cz2 + 0.3);
      for (const [px, pz] of [[-0.42, -0.27], [0.42, -0.27], [-0.42, 0.27], [0.42, 0.27]]) {
        CB.geo('steel', 'deco', new THREE.CylinderGeometry(0.015, 0.015, 0.76, 6), cx + px, L + 0.48, cz2 + pz);
        CB.geo('tv', 'deco', new THREE.CylinderGeometry(0.05, 0.05, 0.03, 8).rotateZ(Math.PI / 2), cx + px, L + 0.05, cz2 + pz);
      }
      CB.geo('steel', 'deco', new THREE.CylinderGeometry(0.17, 0.17, 0.3, 14), cx - 0.25, L + 1.01, cz2);
      CB.geo('steel', 'deco', new THREE.CylinderGeometry(0.15, 0.15, 0.3, 14), cx + 0.12, L + 1.01, cz2);
      CB.box('steel', 'deco', cx + 0.3, cx + 0.45, L + 0.86, L + 1.0, cz2 - 0.25, cz2 + 0.25);
      for (let i = 0; i < 8; i++) CB.box('steel', 'deco', cx - 0.2, cx + 0.2, L + 0.14 + i * 0.02, L + 0.155 + i * 0.02, cz2 - 0.15, cz2 + 0.15);
      CB.geo('steel', 'deco', new THREE.CylinderGeometry(0.012, 0.012, 0.5, 6).rotateX(Math.PI / 2), cx - 0.3, L + 0.62, cz2 - 0.18);
      carts.push({ x: cx, z: cz2, level: c.level });
    }
    CB.build(cartGroup, mats);
  }
  const built = B.build(scene, mats);
  walkables.push(...built.floor);

  // ── 높이: 지금 높이(curY)와 가장 가까운 바닥/계단 면 ──
  function heightAt(x, z, curY = 0) {
    const nearest = (cands) => cands.reduce((b, c) => (Math.abs(c - curY) < Math.abs(b - curY) ? c : b));
    // 강당동: 1층 급식실 / 2층 강당
    if (x > ANNEX.minX && x < ANNEX.maxX && z > ANNEX.minZ && z < ANNEX.maxZ) return nearest([ANNEX_FLOOR, levelY(1)]);
    // 구름다리 위 / 그 아래 땅
    if (x > BRIDGE.minX && x < BRIDGE.maxX && z > BRIDGE.minZ && z < BRIDGE.maxZ) return nearest([0, levelY(1)]);
    // 현관 앞 돌계단 (계단참 → 4단 내려감)
    if (Math.abs(x) < ENTRY.w && z > Z_FRONT && z < ENTRY.depth) {
      if (z < ENTRY.landing) return BASE;
      const step = Math.min(3, Math.floor(((z - ENTRY.landing) / (ENTRY.depth - ENTRY.landing)) * 4));
      return BASE * (1 - (step + 1) / 4);
    }
    // 중앙 계단실 (본관 뒤): 가운데 계단 / 층계참 / 양옆 계단
    if (x > CSTAIR.xs && x < CSTAIR.xe && z < CSTAIR.z0 && z > CSTAIR.z2 - 0.3) {
      const C = CSTAIR;
      const c = [];
      for (let k = 0; k < LEVELS - 1; k++) {
        const L = levelY(k);
        if (z <= C.z1) c.push(L + 1.8);
        else if (Math.abs(x) < C.cw) c.push(L + (1.8 * (C.z0 - z)) / (C.z0 - C.z1));
        else c.push(L + 1.8 + (1.8 * (z - C.z1)) / (C.z0 - C.z1));
      }
      return nearest(c);
    }
    // 화장실 (양끝 계단실 옆, 본관 뒤)
    if (Math.abs(x) > BX - STAIR_W && Math.abs(x) < BX && z < Z_BACK && z > TOILET.z1) {
      const c = [];
      for (let k = 0; k < LEVELS; k++) c.push(levelY(k));
      return nearest(c);
    }
    // 뒷문 계단 (복도 → 지붕 통로)
    if (x > BACKDOOR.x1 - 0.7 && x < BACKDOOR.x2 + 0.7 && z < Z_BACK && z > Z_BACK - 1.2) return BASE * Math.max(0, (z - (Z_BACK - 1.2)) / 1.2);
    // 옆문 계단 (계단실 → 바깥)
    if (Math.abs(x) > BX && Math.abs(x) < BX + 1.2 && z > -11.6 && z < -9.4) return BASE * Math.max(0, 1 - (Math.abs(x) - BX) / 1.2);
    // 운동장 (앞마당보다 낮음): 관람석 3단 → 운동장, 양옆은 경사로
    if (z > FIELD_Z && z < 73 && Math.abs(x) < 69.5) {
      if (z < FIELD_Z + 3) {
        if (Math.abs(x) <= 47) return -0.3 * (Math.min(2, Math.floor(z - FIELD_Z)) + 1);
        return (FIELD_Y * (z - FIELD_Z)) / 3;
      }
      return FIELD_Y;
    }
    // 구령대 (단상 위 + 양옆 계단)
    if (Math.abs(x) < PODIUM.x && z > PODIUM.z1 && z < PODIUM.z2) return PODIUM.top;
    if (Math.abs(x) >= PODIUM.x && Math.abs(x) < PODIUM.stairX && z > PODIUM.sz1 && z < PODIUM.sz2) {
      const i = Math.min(4, Math.floor(((Math.abs(x) - PODIUM.x) / (PODIUM.stairX - PODIUM.x)) * 5));
      return PODIUM.top - (i * PODIUM.top) / 5;
    }
    if (x < -BX || x > BX || z < Z_BACK || z > Z_FRONT) return 0;
    const st = STAIRS.find((s) => !s.center && x >= s.xs && x <= s.xe);
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
    artEasels,
    chairMeshes: built.chair,
    stairMeshes: built.stair,
    staffSeats,
    carts,
    setCartsVisible: (v) => {
      cartGroup.visible = v;
    },
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
