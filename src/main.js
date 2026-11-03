// 온라인 학교 — 3층 학교 건물과 운동장을 아바타로 걸어 다니고, 의자에 앉고,
// 손들기/인사/박수/말하기를 같은 방에 들어온 친구들과 실시간으로 함께 하는 페이지.
//
// 주소 예시:  ?room=우리학교            → "우리학교" 방에 입장 (운동장에서 시작)
//            ?room=우리학교&class=2-3  → 2학년 3반 교실에서 시작
//            ?room=우리학교&teacher=1  → 선생님 이름표로 입장
import * as THREE from 'three';
import './school.css';
import { buildWorld, roomAt, CLASSROOMS, OFFICE_ROOMS, TEACHING, levelY, levelOfY, STORE, ROOF, GYM, CAFE, HOOPS, STAIRS, Z_BACK, Z_CORR, BX, BRIDGE, HALL_NAMES, OUT, GATE, FIELD_Y } from './world.js';
import { createSoccer } from './soccer.js';
import { createTeachers, SUBJECTS } from './teachers.js';
import { createEvents, TREATS } from './events.js';
import { Avatar, AVATAR_SCALE, GENDERS, OUTFITS, HAIRS, HAIR_COLORS, ACCS, BAGS, cleanLook, defaultLook } from './avatar.js';
import { schoolNow, todayMenu, setTestTime } from './schedule.js';
import { createNavigator } from './pathfind.js';
import { connectRoom } from './net.js';
import { playSchoolBell, playClap, playPop, unlockAudio, playPianoNote } from './audio.js';
import { createActivities } from './activities.js';
import { createGames } from './games.js';
import { createHall } from './hall.js';
import { createParty } from './party.js';
import { createBibimbap } from './bibimbap.js';
import { createAmbience } from './ambience.js';

const params = new URLSearchParams(location.search);
const room = (params.get('room') || '우리학교').slice(0, 30);
const isTeacher = params.get('teacher') === '1';
const DEBUG = params.get('debug') === '1';
const startClass = CLASSROOMS.find((c) => c.id === params.get('class'));
if (params.get('debug') === '1' && params.get('time') != null) setTestTime(params.get('time'));

// ── 내 정보 (이 기기에 기억) ──
const ADJ = ['씩씩한', '반짝이는', '포근한', '즐거운', '용감한', '느긋한', '다정한', '호기심 많은', '상냥한', '튼튼한'];
const NOUN = ['연필', '지우개', '새싹', '도토리', '공책', '나무', '구름', '별빛', '책갈피', '크레파스'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const store = {
  get(k) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* 저장 불가 환경 무시 */
    }
  },
};
let myId = store.get('school.id');
if (!myId) {
  myId = Math.random().toString(36).slice(2, 10);
  store.set('school.id', myId);
}
// 같은 기기에서 탭을 여러 개 열어도 서로 다른 사람으로 보이도록 탭마다 꼬리표를 붙임
myId = `${myId}-${Math.random().toString(36).slice(2, 5)}`;
let myName = store.get('school.name') || (isTeacher ? '선생님' : `${pick(ADJ)} ${pick(NOUN)}`);

// ── 렌더러 / 장면 ──
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 260);
const world = buildWorld(scene, { menu: todayMenu() });
const inRect = (r, x, z) => x > r.minX && x < r.maxX && z > r.minZ && z < r.maxZ;
const nav = createNavigator(world.blocks);

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w < h ? 62 : 50;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ── 아바타들 ──
let myLook = (() => {
  try {
    return cleanLook(JSON.parse(store.get('school.look') || 'null'), defaultLook(myId, isTeacher));
  } catch {
    return defaultLook(myId, isTeacher);
  }
})();
const me = new Avatar({ id: myId, name: myName, look: myLook, isMe: true, isTeacher });
if (startClass) {
  // 교실 앞쪽 통로에서 칠판을 보며 시작
  const L = levelY(startClass.level);
  me.pos.set(startClass.xs + 2.3, L, -3.15 + (Math.random() - 0.5) * 0.3);
  me.root.rotation.y = -Math.PI / 2;
} else {
  // 학교 밖 등굣길에서 시작 → 교문으로 걸어 들어오기
  me.pos.set(OUT.curb - 3 + Math.random() * 1.5, 0, 24 + Math.random() * 3);
  me.root.rotation.y = Math.atan2(OUT.wall - me.pos.x, (GATE.z1 + GATE.z2) / 2 - me.pos.z);
}
scene.add(me.root);

const others = new Map(); // id → { avatar, lastSeen }

// ── 축구공 ──
const scorePill = document.getElementById('scorePill');
function drawScore(blue, white) {
  world.drawScore(blue, white);
  document.getElementById('scoreBlue').textContent = blue;
  document.getElementById('scoreWhite').textContent = white;
}
const soccer = createSoccer({
  scene,
  myId,
  send: (snap) => net.send('ball', snap),
  drawScore,
  onGoal(side, b) {
    const v = Math.max(0.15, 1 - Math.hypot(b.x - me.pos.x, b.z - me.pos.z) / 80);
    hint(`⚽ 골~~! ${side === 'blue' ? '청팀' : '백팀'} 득점!`, 2400);
    ambience?.cheer(v);
  },
  onKickSound(b, mine) {
    const v = mine ? 1 : Math.max(0, 1 - Math.hypot(b.x - me.pos.x, b.z - me.pos.z) / 30);
    ambience?.kick(v);
  },
});
function onBall(s) {
  soccer.apply(s);
}

// ── NPC 선생님들 ──
const teachers = createTeachers({ scene, world });
// ── 등교 시간 교문지도 · 방과 후 노점 ──
const events = createEvents({ scene });
// 특별실 놀이 (미술실 그림 · 음악실 피아노 · 컴퓨터실 블록 게임)
const activities = createActivities({
  me,
  world,
  onNote: (n) => net.send('act', { type: 'note', n }),
  onAct: (kind, score) => net.send('act', { type: kind, score }),
});
// 명예의 전당 (놀이 기록, 친구들과 합침)
const hall = createHall({ scene, store, send: (e, p) => net.send(e, p), myId, myName: () => myName });
// 같이 하기 (놀이 방)
const party = createParty({ me, myId, myName: () => myName, others, send: (e, p) => net.send(e, p), hint, onStart: (game, opts) => games.startParty(game, opts) });
// 옥상 비빔밥 (재료 모으기)
const bibim = createBibimbap({ scene, me, store, hint, getAmbience: () => ambience, send: (e, p) => net.send(e, p), others });
// 운동장·교문·보물·닭장 놀이
const games = createGames({
  hall,
  party,
  others,
  bibim,
  scene,
  me,
  world,
  store,
  hint,
  getAmbience: () => ambience,
  onAct: (kind, score) => net.send('act', { type: 'game2', kind, score }),
  isTeacher,
});

// ── 매점 아주머니 ──
const npc = new Avatar({ id: 'store-npc', name: '매점 아주머니', color: '#c0603f', occlude: true });
npc.pos.set((STORE.minX + STORE.maxX) / 2, 0, STORE.minZ + 1.0);
npc.root.rotation.y = 0;
scene.add(npc.root);

// ── 급식실 조리사님 (위생모 + 앞치마) ──
const cooks = world.cookSpots.map(({ x, z }, i) => {
  const c = new Avatar({ id: `cafe-cook-${i}`, name: '조리사님', color: '#f2f2ee', occlude: true, look: { outfit: 'navy', hair: 'bun', hairColor: 'dark', acc: 'hairnet' } });
  c.pos.set(x, 0.15, z);
  c.root.rotation.y = 0;
  scene.add(c.root);
  return c;
});
const cook = cooks[1];

// ── 농구 슛 (체육관) ──
const shots = []; // 날아가는 공들
const ballGeo = new THREE.SphereGeometry(0.12, 16, 12);
const ballMat = new THREE.MeshStandardMaterial({ color: '#d9692b', roughness: 0.7 });
function nearestHoop(p) {
  let best = null;
  let bd = Infinity;
  HOOPS.forEach((h, i) => {
    const d = Math.hypot(h.x - p.x, h.z - p.z);
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  return { index: best, dist: bd };
}
// from 아바타에서 hoop 으로 공 던지기 (ok: 골인 여부)
function launchShot(avatar, hoopIndex, ok) {
  const h = HOOPS[hoopIndex];
  const start = new THREE.Vector3(avatar.pos.x, avatar.pos.y + 1.9 * AVATAR_SCALE, avatar.pos.z);
  const d = Math.hypot(h.x - start.x, h.z - start.z);
  const end = ok ? new THREE.Vector3(h.x, h.y, h.z) : new THREE.Vector3(h.x + (Math.random() - 0.5) * 0.5, h.y + 0.05, h.z + (Math.random() < 0.5 ? -0.3 : 0.3));
  const mesh = new THREE.Mesh(ballGeo, ballMat);
  mesh.castShadow = true;
  scene.add(mesh);
  avatar.faceAngle(Math.atan2(h.x - avatar.pos.x, h.z - avatar.pos.z), 1);
  avatar.play('hand');
  shots.push({ mesh, start, end, ok, t: 0, dur: 0.7 + d * 0.06, peak: 1.4 + d * 0.12, phase: 'fly', vel: null, avatar, life: 3 });
}
function updateShots(dt) {
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    s.life -= dt;
    if (s.phase === 'fly') {
      s.t += dt;
      const k = Math.min(1, s.t / s.dur);
      s.mesh.position.lerpVectors(s.start, s.end, k);
      s.mesh.position.y += Math.sin(k * Math.PI) * s.peak;
      if (k >= 1) {
        s.phase = 'fall';
        const v = distVolumeXZ(s.end);
        if (s.ok) {
          s.vel = new THREE.Vector3(0, -1, 0);
          ambience?.swish(v);
        } else {
          s.vel = new THREE.Vector3((s.start.x - s.end.x) * 0.25, 2.5, (Math.random() - 0.5) * 3);
          ambience?.rimHit(v);
        }
      }
    } else {
      s.vel.y -= 9.8 * dt;
      s.mesh.position.addScaledVector(s.vel, dt);
      if (s.mesh.position.y < 0.12) {
        s.mesh.position.y = 0.12;
        s.vel.y = Math.abs(s.vel.y) * 0.6;
        s.vel.x *= 0.7;
        s.vel.z *= 0.7;
      }
    }
    s.mesh.rotation.x += dt * 8;
    if (s.life <= 0) {
      scene.remove(s.mesh);
      shots.splice(i, 1);
    }
  }
}
function distVolumeXZ(p) {
  return Math.max(0, 1 - Math.hypot(p.x - me.pos.x, p.z - me.pos.z) / 30);
}
let myBaskets = 0;

function chairTakenBy(index) {
  if (me.sitChairIndex === index) return me;
  for (const { avatar } of others.values()) if (avatar.sitChairIndex === index) return avatar;
  return null;
}

function sitOn(avatar, index) {
  const chair = world.chairs[index];
  if (!chair) return;
  avatar.sitChair = chair;
  avatar.sitChairIndex = index;
  avatar.pos.x = chair.x;
  avatar.pos.z = chair.z;
}
function standUp(avatar) {
  if (avatar.sitChair) avatar.pos.y = avatar.sitChair.seatY - 0.45 * AVATAR_SCALE;
  avatar.root.rotation.z = 0;
  avatar.sitChair = null;
  avatar.sitChairIndex = null;
}

// dest: {x, y, z}
function walkTo(avatar, dest, chairIndex = null) {
  // 계단을 오르내리는 중이면 계단을 다 지난 뒤에 새로 출발
  if (avatar.target?.stair) {
    avatar.reroute = () => walkTo(avatar, dest, chairIndex);
    return true;
  }
  standUp(avatar);
  const path = nav.findPath(avatar.pos, { ...dest, allowBlocked: chairIndex != null });
  if (!path || !path.length) return false;
  avatar.target = path.shift();
  avatar.path = path;
  avatar.onArrive = chairIndex == null ? null : () => sitOn(avatar, chairIndex);
  return true;
}

let inStore = false;

// ── 카메라 (내 아바타 뒤를 따라감, 끌어서 회전) ──
const cam = { yaw: startClass ? 0 : me.root.rotation.y + Math.PI, pitch: 0.4, dist: 6.5, cur: 6.5, focus: new THREE.Vector3() };
if (startClass) cam.yaw = Math.PI / 2;
const camRay = new THREE.Raycaster();
function updateCamera(dt) {
  const target = new THREE.Vector3(me.pos.x, me.pos.y + 1.3 * AVATAR_SCALE, me.pos.z);
  cam.focus.lerp(target, Math.min(1, dt * 8));
  // 매점 안은 좁아서 카메라를 가까이, 조금 위에서 내려다보게
  const pitch = inStore ? Math.max(cam.pitch, 0.55) : cam.pitch;
  const maxDist = inStore ? Math.min(cam.dist, 3.2) : cam.dist;
  const dir = new THREE.Vector3(
    Math.sin(cam.yaw) * Math.cos(pitch),
    Math.sin(pitch),
    Math.cos(cam.yaw) * Math.cos(pitch),
  );
  // 벽·천장·기둥이 가리면 카메라를 그 앞으로 당김
  camRay.set(cam.focus, dir);
  camRay.far = maxDist;
  const hit = camRay.intersectObjects(world.occluders, false)[0];
  const d = hit ? Math.max(0.6, hit.distance - 0.35) : maxDist;
  cam.cur += (d - cam.cur) * Math.min(1, dt * (d < cam.cur ? 25 : 4));
  camera.position.copy(cam.focus).addScaledVector(dir, cam.cur);
  camera.lookAt(cam.focus);
  // 너무 가까우면 내 이름표가 화면을 가리지 않게 숨김
  me.tagHolder.visible = cam.cur > 2.2;
}

// ── 안내 문구 ──
const hintEl = document.getElementById('hint');
let hintTimer = null;
function hint(text, ms = 1800) {
  hintEl.textContent = text;
  hintEl.classList.add('show');
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => hintEl.classList.remove('show'), ms);
}

// ── 네트워크 ──
let net = { send() {}, updateMe() {}, close() {} };
let peopleCount = 1;
const roomLabel = document.getElementById('roomLabel');
const netDot = document.getElementById('netDot');
let netStatus = 'connecting';
let whereText = '';
let instanceNo = 0;
function renderRoomLabel() {
  const who =
    netStatus === 'solo' && peopleCount < 2
      ? '혼자 모드'
      : netStatus === 'full'
        ? '방이 모두 가득 찼어요'
        : netStatus === 'connecting'
          ? '연결 중…'
          : `${instanceNo ? `${instanceNo}번 방 · ` : ''}${peopleCount}명`;
  roomLabel.textContent = `${room} · ${who}${whereText ? ` · ${whereText}` : ''}`;
  netDot.classList.toggle('on', netStatus === 'online');
}

let pendingChair = null;
function myState() {
  const t = me.path?.length ? me.path[me.path.length - 1] : me.target;
  const fin = me.finalDest || t;
  return {
    name: myName,
    look: myLook,
    teacher: isTeacher,
    x: +me.pos.x.toFixed(2),
    y: +me.pos.y.toFixed(2),
    z: +me.pos.z.toFixed(2),
    tx: fin && (me.target || me.reroute) ? +fin.x.toFixed(2) : null,
    ty: fin && (me.target || me.reroute) ? +(fin.y ?? me.pos.y).toFixed(2) : null,
    tz: fin && (me.target || me.reroute) ? +fin.z.toFixed(2) : null,
    sit: me.sitChairIndex ?? (me.onArrive ? pendingChair : null),
  };
}
const announce = () => {
  net.send('state', myState());
  // 마지막으로 공을 찬 사람이 새로 온 친구에게 공 위치·점수를 알려줌
  if (soccer.iKickedLast) net.send('ball', soccer.snapshot());
  hall?.share();
};

function getOther(id, name, teacher, look) {
  let o = others.get(id);
  if (!o) {
    const avatar = new Avatar({ id, name: name || '친구', isTeacher: !!teacher, look });
    scene.add(avatar.root);
    o = { avatar, lastSeen: performance.now() };
    others.set(id, o);
  }
  o.lastSeen = performance.now();
  if (name && name !== o.avatar.name) o.avatar.setName(name);
  return o;
}

function onState(s) {
  if (!s?.id || s.id === myId) return;
  const isNew = !others.has(s.id);
  const { avatar } = getOther(s.id, s.name, s.teacher, s.look);
  if (s.look && JSON.stringify(cleanLook(s.look, avatar.look)) !== JSON.stringify(avatar.look)) avatar.setLook(s.look);
  const sy = Number.isFinite(s.y) ? s.y : 0;
  // 많이 어긋나 있거나 다른 층이면 순간이동, 아니면 자연스럽게 걸어감
  if (isNew || Math.hypot(avatar.pos.x - s.x, avatar.pos.z - s.z) > 4 || Math.abs(avatar.pos.y - sy) > 1.5) {
    avatar.pos.set(s.x, sy, s.z);
    avatar.target = null;
    avatar.path = [];
    avatar.reroute = null;
  }
  if (s.sit != null && s.tx == null) {
    sitOn(avatar, s.sit);
  } else if (s.tx != null) {
    walkTo(avatar, { x: s.tx, y: s.ty ?? sy, z: s.tz }, s.sit ?? null);
  } else if (!avatar.target) {
    standUp(avatar);
    if (Math.hypot(avatar.pos.x - s.x, avatar.pos.z - s.z) > 0.3) walkTo(avatar, { x: s.x, y: sy, z: s.z });
  }
}

function distVolume(avatar) {
  const d = avatar.pos.distanceTo(me.pos);
  return Math.max(0, 1 - d / 25);
}

function onAction(a) {
  if (!a?.id || a.id === myId) return;
  // 명예의 전당 판은 친구 상태보다 먼저 올 수 있으니 바로 합침
  if (a.type === 'hall' || a.type === 'hallAll') return hall.receive(a);
  if (party.receive(a)) return;
  const o = others.get(a.id);
  if (!o) return;
  o.lastSeen = performance.now();
  if (a.type === 'talk') {
    o.avatar.say(String(a.text || '').slice(0, 60));
    playPop(distVolume(o.avatar));
  } else if (a.type === 'shoot') {
    const hi = a.hoop | 0;
    if (HOOPS[hi]) launchShot(o.avatar, hi, !!a.ok);
  } else if (a.type === 'treat') {
    const tr = TREATS[a.i | 0];
    if (tr) {
      o.avatar.showEmoji(tr.emoji, 20);
      o.avatar.say(tr.say);
    }
  } else if (a.type === 'meal') {
    o.avatar.showEmoji('🍱', 30);
    o.avatar.say('잘 먹겠습니다!');
  } else if (a.type === 'eat') {
    const item = SNACKS[a.item | 0];
    if (item) {
      o.avatar.showEmoji(item[0], 15);
      o.avatar.say(`${item[1]} 냠냠!`);
    }
  } else if (a.type === 'note') {
    const n = a.n | 0;
    if (n >= 36 && n <= 96) playPianoNote(n, distVolume(o.avatar) * 0.7);
    o.avatar.showEmoji('🎵', 2);
  } else if (a.type === 'art') {
    o.avatar.showEmoji('🎨', 8);
    o.avatar.say('그림 완성!');
  } else if (a.type === 'bibim') {
    bibim.receive(a, o.avatar);
  } else if (a.type === 'game2') {
    const names = { run: '운동장 한 바퀴', jump: '멀리뛰기', sneak: '몰래 들어가기', treasure: '보물찾기', tag: '얼음땡', dodge: '피구' };
    o.avatar.say(`${names[a.kind] || '놀이'} ${a.kind === 'run' ? `${a.score}초` : a.kind === 'jump' ? `${a.score}m` : a.kind === 'treasure' ? '다 찾음!' : `${a.score | 0}점`}!`);
  } else if (a.type === 'game') {
    o.avatar.say(`블록 쌓기 ${a.score | 0}점!`);
  } else if (['hand', 'bow', 'clap'].includes(a.type)) {
    o.avatar.play(a.type);
    if (a.type === 'clap') playClap(distVolume(o.avatar));
  }
}

function onLeave(id) {
  const o = others.get(id);
  if (!o) return;
  o.avatar.dispose();
  others.delete(id);
}

// ── 입력: 탭하면 이동 / 끌면 회전 / 두 손가락으로 확대 ──
const raycaster = new THREE.Raycaster();
const pointers = new Map();
let dragMoved = false;
let pinchDist = 0;

canvas.addEventListener('pointerdown', (e) => {
  unlockAudio();
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
  if (pointers.size === 1) dragMoved = false;
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
    dragMoved = true;
  }
});

canvas.addEventListener('pointermove', (e) => {
  const p = pointers.get(e.pointerId);
  if (!p) return;
  const dx = e.clientX - p.x;
  const dy = e.clientY - p.y;
  p.x = e.clientX;
  p.y = e.clientY;
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinchDist) cam.dist = THREE.MathUtils.clamp(cam.dist * (pinchDist / d), 3, 16);
    pinchDist = d;
    return;
  }
  if (Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > 8) dragMoved = true;
  if (dragMoved) {
    cam.yaw -= dx * 0.006;
    cam.pitch = THREE.MathUtils.clamp(cam.pitch + dy * 0.004, 0.08, 1.3);
  }
});

const endPointer = (e) => {
  const had = pointers.delete(e.pointerId);
  if (pointers.size < 2) pinchDist = 0;
  if (had && pointers.size === 0 && !dragMoved && e.type === 'pointerup') handleTap(e.clientX, e.clientY);
};
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

canvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    cam.dist = THREE.MathUtils.clamp(cam.dist * (1 + e.deltaY * 0.001), 3, 16);
  },
  { passive: false },
);

const tapTargets = [soccer.mesh, ...world.walkables, ...world.tapBlockers, ...world.chairMeshes, ...world.stairMeshes, ...world.swingSeats];
const tmpN = new THREE.Vector3();

function handleTap(cx, cy) {
  const ndc = new THREE.Vector2((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObjects(tapTargets, false)[0];
  if (DEBUG) console.log('tap', hit?.object.userData.role, hit && [hit.point.x.toFixed(2), hit.point.y.toFixed(2), hit.point.z.toFixed(2)].join(','));
  if (!hit) return hint('가까운 빈 바닥을 눌러주세요');

  // 공을 눌렀나? → 공 너머로 달려가서 차기
  if (hit.object === soccer.mesh) {
    const bx = soccer.ball.x;
    const bz = soccer.ball.z;
    let dx = bx - me.pos.x;
    let dz = bz - me.pos.z;
    const d = Math.hypot(dx, dz) || 1;
    dx /= d;
    dz /= d;
    let dest = { x: bx + dx * 1.2, y: 0, z: bz + dz * 1.2 };
    if (nav.blockedAt(dest.x, dest.z, 0)) dest = { x: bx, y: 0, z: bz };
    pendingChair = null;
    me.finalDest = dest;
    if (!walkTo(me, dest)) return hint('공에 갈 수 없어요');
    me.onArrive = () => {
      me.finalDest = null;
    };
    announce();
    return;
  }

  // 의자를 눌렀나?
  if (hit.object.userData.role === 'chair') {
    let idx = -1;
    let bestD = 0.8;
    world.chairs.forEach((c, i) => {
      const d = Math.hypot(c.x - hit.point.x, c.z - hit.point.z) + Math.abs(c.seatY - hit.point.y) * 0.5;
      if (d < bestD) {
        bestD = d;
        idx = i;
      }
    });
    if (idx < 0) return;
    return sitAt(idx);
  }

  // 정글짐 꼭대기를 눌렀나? → 올라가기 / 내려오기
  if (hit.object.userData.role === 'stair' && hit.point.y > world.jungle.top - 0.5 && hit.point.y < world.jungle.top + 0.5 && hit.point.x > world.jungle.x1 - 1 && hit.point.x < world.jungle.x2 + 1) {
    const J = world.jungle;
    const onTop = Math.abs(me.pos.y - J.top) < 0.5;
    if (onTop) {
      // 내려오기: 가장 가까운 바깥 바닥으로
      const ox = me.pos.x < (J.x1 + J.x2) / 2 ? J.x1 - 0.8 : J.x2 + 0.8;
      me.target = null;
      me.path = [];
      me.pos.set(ox, FIELD_Y, Math.max(J.z1, Math.min(J.z2, me.pos.z)));
      me.play('hand');
      return hint('정글짐에서 내려왔어요', 1200);
    }
    const near = Math.hypot(me.pos.x - Math.max(J.x1, Math.min(J.x2, me.pos.x)), me.pos.z - Math.max(J.z1, Math.min(J.z2, me.pos.z))) < 1.6;
    if (!near) {
      // 먼저 정글짐 옆으로 걸어가기
      const side = { x: J.x1 - 0.8, y: FIELD_Y, z: (J.z1 + J.z2) / 2 };
      goTo(side, 0);
      return hint('정글짐 옆에 가서 다시 눌러요', 1600);
    }
    me.target = null;
    me.path = [];
    me.pos.set(Math.max(J.x1 + 0.3, Math.min(J.x2 - 0.3, hit.point.x)), J.top, Math.max(J.z1 + 0.3, Math.min(J.z2 - 0.3, hit.point.z)));
    me.play('hand');
    me.say('정글짐 꼭대기다!');
    return;
  }
  // 계단을 눌렀나? → 한 층 올라가거나 내려가기
  if (hit.object.userData.role === 'stair') {
    const st = STAIRS.find((t) => hit.point.x >= t.xs - 0.5 && hit.point.x <= t.xe + 0.5) || STAIRS[0];
    const flightBase = Math.max(0, Math.min(ROOF - 1, Math.floor((hit.point.y - levelY(0)) / 3.6)));
    const myLevel = levelOfY(me.pos.y);
    const target = myLevel <= flightBase ? flightBase + 1 : flightBase;
    return goTo({ x: st.xA, y: levelY(target), z: st.zEntry }, target);
  }

  // 벽을 눌렀나? → 벽 너머(교실 안 등)로 문을 통해 들어가기
  tmpN.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
  if (hit.object.userData.role === 'wall' || tmpN.y < 0.5) {
    const lvl = Math.abs(hit.point.y - me.pos.y) < 3.2 ? levelOfY(me.pos.y) : levelOfY(hit.point.y - 1.2);
    const dir = raycaster.ray.direction;
    // 벽 너머가 교실이면: 그 교실 앞문/뒷문 중 가까운 쪽 바로 안으로
    const probe = { x: hit.point.x + dir.x * 1.2, z: hit.point.z + dir.z * 1.2 };
    const r = roomAt(probe.x, probe.z, levelY(lvl)) || roomAt(hit.point.x, hit.point.z - 0.3, levelY(lvl));
    if (r) {
      const doorX = [r.xs + 1.45, r.xe - 1.45].sort((a, b) => Math.abs(a - me.pos.x) - Math.abs(b - me.pos.x))[0];
      return goTo({ x: doorX, y: levelY(r.level), z: Z_CORR + 0.5 }, r.level);
    }
    for (const step of [1.0, 1.8, 2.8, 4, 5.5]) {
      const q = { x: hit.point.x + dir.x * step, y: levelY(lvl), z: hit.point.z + dir.z * step };
      if (!nav.blockedAt(q.x, q.z, q.y)) return goTo(q, lvl);
    }
    return hint('가까운 빈 바닥을 눌러주세요');
  }

  // 바닥
  const p = hit.point;
  if (nav.blockedAt(p.x, p.z, p.y)) return hint('가까운 빈 바닥을 눌러주세요');
  goTo({ x: p.x, y: p.y, z: p.z }, levelOfY(p.y));
}

// idx 번 의자로 가서 앉기
function sitAt(idx) {
  const taker = chairTakenBy(idx);
  if (taker && taker !== me) return hint('이미 친구가 앉아 있어요');
  if (taker === me) return;
  const c = world.chairs[idx];
  pendingChair = idx;
  const dest = { x: c.x, y: c.seatY - 0.45 * AVATAR_SCALE, z: c.z };
  me.finalDest = dest;
  if (walkTo(me, dest, idx)) {
    const done = me.onArrive;
    if (done) {
      me.onArrive = () => {
        done();
        pendingChair = null;
        me.finalDest = null;
        ambience?.chairCreak(1);
        announce();
      };
    }
    announce();
  } else hint('그 자리로 갈 수 없어요');
}

// ── 가정 선생님께 고추장 받기 (가정실, 수업 시간) ──
const gochuBtn = document.createElement('button');
gochuBtn.type = 'button';
gochuBtn.className = 'pill shop-btn gochu-btn hidden';
gochuBtn.textContent = '🌶️ 고추장 받기';
document.body.append(gochuBtn);
let gochuTeacher = null;
function updateGochuBtn() {
  const r = roomAt(me.pos.x, me.pos.z, me.pos.y);
  gochuTeacher = r?.type === 'homeec' ? teachers.nearTeacher('가정', r.id) : null;
  const near = gochuTeacher && Math.hypot(gochuTeacher.pos.x - me.pos.x, gochuTeacher.pos.z - me.pos.z) < 3.5;
  gochuBtn.classList.toggle('hidden', !near);
}
gochuBtn.addEventListener('click', () => {
  unlockAudio();
  if (gochuTeacher) bibim.askGochujang(gochuTeacher);
});

// ── 방과 후 노점 버튼 ──
const vendorBtn = document.getElementById('vendorBtn');
let vendorNear = null;
function updateVendorBtn() {
  vendorNear = events.nearVendor(me);
  vendorBtn.classList.toggle('hidden', !vendorNear);
  if (vendorNear) vendorBtn.textContent = vendorNear.spec.button;
}
let lastTreat = 0;
vendorBtn.addEventListener('click', () => {
  unlockAudio();
  if (!vendorNear || performance.now() - lastTreat < 1500) return;
  lastTreat = performance.now();
  let i = vendorNear.spec.treat;
  if (i === 2 && Math.random() < 0.45) i = 3; // 뽑기는 깨질 때도 있음
  if (i === 0 && !games.addChick()) return; // 병아리는 옥상 닭장으로
  me.showEmoji(TREATS[i].emoji, 20);
  me.say(TREATS[i].say);
  ambience?.ding();
  vendorNear.avatar.say(i === 3 ? '아이고, 아깝다~ 다시 해 봐!' : '고맙다~ 또 와!');
  net.send('act', { type: 'treat', i });
});

// ── 의자 근처: 앉기 / 일어나기 버튼 ──
const sitBtn = document.getElementById('sitBtn');
let nearChair = -1;
function updateSitBtn() {
  if (me.sitChairIndex != null) {
    nearChair = -1;
    sitBtn.textContent = '🧍 일어나기';
    sitBtn.classList.remove('hidden');
    return;
  }
  nearChair = -1;
  if (!me.target) {
    let best = 1.4;
    const k = levelOfY(me.pos.y);
    world.chairs.forEach((c, i) => {
      if ((c.level ?? 0) !== k || Math.abs(c.x - me.pos.x) > best || Math.abs(c.z - me.pos.z) > best) return;
      const d = Math.hypot(c.x - me.pos.x, c.z - me.pos.z);
      if (d < best && !chairTakenBy(i)) {
        best = d;
        nearChair = i;
      }
    });
  }
  sitBtn.textContent = '🪑 앉기';
  sitBtn.classList.toggle('hidden', nearChair < 0);
}
sitBtn.addEventListener('click', () => {
  unlockAudio();
  if (me.sitChairIndex != null) {
    standUp(me);
    ambience?.chairCreak(0.6);
    announce();
    updateSitBtn();
    return;
  }
  if (nearChair >= 0) sitAt(nearChair);
});

// 목적지로 걸어가기 (층이 다르면 계단으로)
function goTo(dest, level) {
  pendingChair = null;
  me.finalDest = dest;
  if (!walkTo(me, dest)) return hint('가까운 빈 바닥을 눌러주세요');
  me.onArrive = () => {
    me.finalDest = null;
  };
  if (level !== levelOfY(me.pos.y)) hint(level === ROOF ? '옥상으로 올라가요' : `${level + 1}층으로 가요`, 1600);
  showMarker(dest);
  announce();
}

// ── 계단 근처: 위층 / 아래층 버튼 ──
const upBtn = document.getElementById('upBtn');
const downBtn = document.getElementById('downBtn');
const stairBar = document.getElementById('stairBar');
function nearStair() {
  const { x, z } = me.pos;
  if (z > Z_CORR + 0.5 || z < Z_BACK) return null;
  return STAIRS.find((t) => x > t.xs - 2.5 && x < t.xe + 2.5) || null;
}
function updateStairBar() {
  const st = nearStair();
  const k = levelOfY(me.pos.y);
  const show = !!st && !me.target?.stair;
  stairBar.classList.toggle('hidden', !show);
  if (!show) return;
  upBtn.classList.toggle('hidden', k >= ROOF);
  downBtn.classList.toggle('hidden', k <= 0);
  upBtn.textContent = k + 1 === ROOF ? '⬆ 옥상으로' : `⬆ ${k + 2}층으로`;
  downBtn.textContent = k - 1 === 0 ? '⬇ 1층으로' : `⬇ ${k}층으로`;
}
for (const [btn, d] of [[upBtn, 1], [downBtn, -1]]) {
  btn.addEventListener('click', () => {
    const st = nearStair();
    if (!st) return;
    const target = Math.max(0, Math.min(ROOF, levelOfY(me.pos.y) + d));
    goTo({ x: d > 0 ? st.xB : st.xA, y: levelY(target), z: st.zEntry }, target);
  });
}

// 누른 곳 표시 (작은 동그라미)
const marker = new THREE.Mesh(
  new THREE.RingGeometry(0.18, 0.28, 24),
  new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, depthWrite: false }),
);
marker.rotation.x = -Math.PI / 2;
marker.visible = false;
scene.add(marker);
let markerT = 0;
function showMarker(p) {
  marker.position.set(p.x, p.y + 0.03, p.z);
  marker.visible = true;
  markerT = 0;
}

// ── 아래 버튼들 ──
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const talkBtn = document.querySelector('[data-act="talk"]');
let lastAct = 0;

document.querySelectorAll('.actions button').forEach((btn) => {
  btn.addEventListener('click', () => {
    unlockAudio();
    const type = btn.dataset.act;
    if (type === 'talk') {
      const open = chatForm.classList.toggle('hidden') === false;
      talkBtn.classList.toggle('active', open);
      if (open) chatInput.focus();
      return;
    }
    if (performance.now() - lastAct < 700) return; // 연타 방지
    lastAct = performance.now();
    me.play(type);
    if (type === 'clap') playClap(1);
    net.send('act', { type });
  });
});

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = chatInput.value.trim().slice(0, 60);
  if (!text) return;
  me.say(text);
  playPop(0.6);
  net.send('act', { type: 'talk', text });
  chatInput.value = '';
  chatInput.blur();
  chatForm.classList.add('hidden');
  talkBtn.classList.remove('active');
});

// 종소리
const bellBtn = document.getElementById('bellBtn');
let stopBell = null;
bellBtn.addEventListener('click', () => {
  if (stopBell) {
    stopBell();
    stopBell = null;
    bellBtn.textContent = '종소리 듣기';
  } else {
    stopBell = playSchoolBell(true);
    bellBtn.textContent = '종소리 멈추기';
  }
});

// 주변 소리 켜기/끄기
const soundBtn = document.getElementById('soundBtn');
let ambience = null;
let muted = store.get('school.muted') === '1';
function renderSoundBtn() {
  soundBtn.textContent = muted ? '🔇 주변 소리 꺼짐' : '🔊 주변 소리';
}
renderSoundBtn();
soundBtn.addEventListener('click', () => {
  unlockAudio();
  muted = !muted;
  store.set('school.muted', muted ? '1' : '0');
  ambience?.setMuted(muted);
  renderSoundBtn();
});

// 장소에 따라 들리는 소리 섞기
const FIELD = { minX: -46, maxX: 46, minZ: 16, maxZ: 66 };
function soundMix() {
  const { x, y, z } = me.pos;
  const k = levelOfY(y);
  const inBack = z <= Z_BACK && z > Z_BACK - 6 && (Math.abs(x) < 5.2 || (Math.abs(x) > BX - 7.2 && Math.abs(x) < BX)); // 뒤로 튀어나온 중앙 계단실·화장실
  const inBuilding = Math.abs(x) < BX && z < 0 && (z > Z_BACK || inBack) && k < ROOF; // 옥상은 바깥처럼
  const room = roomAt(x, z, y);
  const inHallRoom = inBuilding && Math.abs(x) < 4.5 && z > -9;
  const dx = Math.max(FIELD.minX - x, 0, x - FIELD.maxX);
  const dz = Math.max(FIELD.minZ - z, 0, z - FIELD.maxZ);
  const near = Math.max(0, 1 - Math.hypot(dx, dz) / 70);
  const open = 16000;
  const muffled = 650;
  const mix = {};
  // 잔잔한 배경 음악 (sounds.json 의 bgm): 바깥은 조금 크게, 실내 수업 중엔 아주 작게
  {
    const kind = schoolNow().kind;
    const quiet = inBuilding && (kind === 'class' || room);
    mix.bgm = [quiet ? 0.07 : 0.16, open];
  }
  const inShop = x > STORE.minX && x < STORE.maxX && z > STORE.minZ && z < STORE.maxZ;
  // 점심시간엔 급식실이 시끌벅적
  const lunch = schoolNow().kind === 'lunch';
  const cafeLevel = lunch ? 1 : 0.12; // 점심때만 북적
  if (inRect(GYM, x, z) && k === 1) {
    mix.gym = [1, open];
    mix.field = [0.15, muffled];
  } else if (inRect(CAFE, x, z) && k === 0) {
    mix.cafe = [cafeLevel, open];
    mix.field = [0.15, muffled];
  } else if (inShop) {
    mix.field = [0.4, 1000];
    mix.outdoor = [0.3, 1000];
  } else if (!inBuilding) {
    mix.field = [0.25 + 0.75 * near, open];
    mix.outdoor = [1, open];
    mix.corridor = [0.12, muffled];
    mix.classroom = [0.1, muffled];
    // 별관 근처에서는 체육관·급식실 소리가 벽 너머로
    mix.gym = [Math.max(0, 1 - Math.hypot(x - 21, z + 28) / 30) * 0.4, muffled];
    mix.cafe = [Math.max(0, 1 - Math.hypot(x - 21, z + 28) / 30) * 0.5 * cafeLevel, muffled];
  } else {
    // 건물 안: 운동장 소리는 창문 너머로 작고 먹먹하게
    mix.field = [room ? 0.35 : 0.22, room ? 1200 : muffled];
    mix.outdoor = [0.12, muffled];
    if (room && OFFICE_ROOMS.has(room.type)) {
      mix.office = [1, open];
      mix.corridor = [0.25, 900];
    } else if (room) {
      const sub = teachers.subjectOf(room);
      mix.classroom = [1, open];
      mix.teacher = [sub && sub !== '음악' ? 1 : 0, open];
      mix.music = [sub === '음악' ? 1 : 0, open];
      mix.corridor = [0.25, 900];
    } else if (inHallRoom && k === 1) {
      mix.library = [0.6, open]; // 상담실: 조용
      mix.corridor = [0.2, 900];
    } else if (inHallRoom && k === 2) {
      mix.library = [1, open];
      mix.corridor = [0.15, 900];
    } else {
      mix.corridor = [1, open];
      mix.classroom = [0.3, 900]; // 복도에서 들리는 옆 교실 소리
      mix.teacher = [0.25, 900];
      const musicRoom = CLASSROOMS.find((c) => c.type === 'music');
      if (k === musicRoom.level && teachers.subjectOf(musicRoom)) mix.music = [Math.max(0, 1 - Math.abs((musicRoom.xs + musicRoom.xe) / 2 - x) / 25) * 0.6, 1200];
    }
  }
  // 교실·복도·사무실은 합성 소리 없이.
  // 쉬는 시간·점심시간엔 교실·복도에 웅성웅성 (녹음 파일 'classroom' 이 있을 때만), 수업 시간엔 조용
  for (const key of ['classroom', 'teacher', 'corridor', 'office', 'library']) delete mix[key];
  const rest = schoolNow().kind !== 'class';
  if (rest && inBuilding) {
    if (room && TEACHING.has(room.type)) mix.classroom = [0.7, open];
    else if (!room) mix.classroom = [0.45, 1600]; // 복도: 옆 교실들 웅성거림이 벽 너머로
  }
  return mix;
}

// ── 매점 ──
const SNACKS = [
  ['🥞', '꿀호떡'],
  ['🍢', '컵떡볶이'],
  ['🧊', '슬러시'],
  ['🍌', '바나나우유'],
  ['🌭', '핫바'],
  ['🍜', '컵라면'],
  ['🍦', '아이스크림'],
  ['🥐', '소시지빵'],
];
const shopBtn = document.getElementById('shopBtn');
const shopSheet = document.getElementById('shopSheet');
const shopMenu = document.getElementById('shopMenu');
SNACKS.forEach(([emoji, name], i) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.innerHTML = `<span>${emoji}</span>${name}`;
  btn.addEventListener('click', () => {
    shopSheet.classList.add('hidden');
    ambience?.ding();
    me.showEmoji(emoji, 15);
    me.say(`${name} 냠냠!`);
    if (games.hasCoupon()) {
      games.useCoupon();
      npc.say('보물 다 찾았다며? 이건 공짜야~ 🎁');
    } else npc.say(['고마워~ 또 와!', '맛있게 먹어~', '흘리지 말고~'][i % 3]);
    net.send('act', { type: 'eat', item: i });
  });
  shopMenu.appendChild(btn);
});
{
  // 양푼 (비빔밥 재료, 한 번만)
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.innerHTML = '<span>🥣</span>양푼 500원';
  btn.addEventListener('click', () => {
    shopSheet.classList.add('hidden');
    npc.say(bibim.count('bowl') ? '양푼은 하나면 되지~' : '옥상에서 비빔밥 해 먹게? 조심해서 써~');
    bibim.buyBowl();
  });
  shopMenu.appendChild(btn);
}
shopBtn.addEventListener('click', () => {
  unlockAudio();
  shopSheet.classList.remove('hidden');
});
document.getElementById('shopClose').addEventListener('click', () => shopSheet.classList.add('hidden'));
shopSheet.addEventListener('click', (e) => {
  if (e.target === shopSheet) shopSheet.classList.add('hidden');
});
// ── 체육관 슛 / 급식 받기 버튼 ──
const shootBtn = document.getElementById('shootBtn');
const mealBtn = document.getElementById('mealBtn');
let lastShot = 0;
shootBtn.addEventListener('click', () => {
  unlockAudio();
  if (performance.now() - lastShot < 1200) return;
  lastShot = performance.now();
  const { index, dist } = nearestHoop(me.pos);
  // 가까울수록 잘 들어감
  const chance = Math.max(0.15, Math.min(0.9, 0.95 - (dist - 1.5) * 0.09));
  const ok = Math.random() < chance;
  standUp(me);
  me.target = null;
  me.path = [];
  launchShot(me, index, ok);
  net.send('act', { type: 'shoot', hoop: index, ok });
  setTimeout(() => {
    if (ok) {
      myBaskets++;
      hint(`🏀 골인! (오늘 ${myBaskets}골)`, 1800);
    } else hint('아깝다! 다시 던져봐요', 1400);
  }, 900);
});
mealBtn.addEventListener('click', () => {
  unlockAudio();
  ambience?.ding();
  me.showEmoji('🍱', 30);
  me.say('잘 먹겠습니다!');
  if (inCafeNow) cook.say(['맛있게 먹어라~', '남기지 말고~', '많이 먹어!'][Math.floor(Math.random() * 3)]);
  else hint('급식 당번이 식판에 담아 줬어요 🍚', 2500);
  setTimeout(() => bibim.takeRice(), 2600);
  hint(`오늘의 급식: ${todayMenu().join(' · ')}`, 4000);
  net.send('act', { type: 'meal' });
});
let inCafeNow = false;
function updateAnnex() {
  const { x, z } = me.pos;
  const g = inRect(GYM, x, z) && levelOfY(me.pos.y) === 1;
  const c = inRect(CAFE, x, z) && levelOfY(me.pos.y) === 0;
  const nh = nearestHoop(me.pos);
  const nearHoop = nh.dist < 10 && (g || (HOOPS[nh.index].outdoor && levelOfY(me.pos.y) === 0));
  shootBtn.classList.toggle('hidden', !nearHoop);
  // 점심시간엔 복도 급식차 옆에서도 급식 받기 (교실 배식)
  const lv = levelOfY(me.pos.y);
  world.setCartsVisible(schoolNow().kind === 'lunch');
  const nearCart = schoolNow().kind === 'lunch' && world.carts.some((ct) => ct.level === lv && Math.hypot(ct.x - x, ct.z - z) < 2.2);
  mealBtn.classList.toggle('hidden', !(c || nearCart));
  if (c && !inCafeNow) cook.say(`오늘은 ${todayMenu()[2]}다~ 줄 서라~`);
  inCafeNow = c;
}

function updateStore() {
  const { x, z } = me.pos;
  const now = x > STORE.minX && x < STORE.maxX && z > STORE.minZ && z < STORE.maxZ;
  if (now !== inStore) {
    inStore = now;
    shopBtn.classList.toggle('hidden', !now);
    if (now) npc.say('어서 와~ 뭐 줄까?');
    else shopSheet.classList.add('hidden');
  }
}

// ── 시간표: 지금 몇 교시인지 표시 + 바뀔 때 종 ──
const periodPill = document.getElementById('periodPill');
let periodKey = null;
function updatePeriod(first) {
  const p = schoolNow();
  periodPill.innerHTML = `${p.icon} <b>${p.text}</b> · ${p.sub}`;
  if (periodKey && p.key !== periodKey && !first) {
    world.setMenu(todayMenu());
    hint(`🔔 ${p.text}${p.kind === 'class' ? ' 시작!' : ''}`, 3000);
    if (!muted && !stopBell) playSchoolBell(false);
  }
  periodKey = p.key;
}
updatePeriod(true);

// ── 아바타 꾸미기 ──
const lookSheet = document.getElementById('lookSheet');
const lookOptions = document.getElementById('lookOptions');
const lookName = document.getElementById('lookName');
const LOOK_SECTIONS = [
  { key: 'gender', title: '성별', list: GENDERS },
  { key: 'outfit', title: '교복 · 체육복 (여학생은 치마, 남학생은 바지)', list: OUTFITS, swatch: (o) => o.top },
  { key: 'hair', title: '머리 모양', list: HAIRS },
  { key: 'hairColor', title: '머리 색', list: HAIR_COLORS, swatch: (o) => o.color },
  { key: 'acc', title: '머리 꾸미기', list: ACCS },
  { key: 'bag', title: '책가방', list: BAGS, swatch: (o) => o.color || '#eee' },
];
function renderLookOptions() {
  lookOptions.innerHTML = '';
  for (const sec of LOOK_SECTIONS) {
    const t = document.createElement('span');
    t.className = 'look-sec';
    t.textContent = sec.title;
    const wrap = document.createElement('div');
    wrap.className = 'chips';
    for (const o of sec.list) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `chip${myLook[sec.key] === o.id ? ' on' : ''}`;
      if (sec.swatch) {
        const sw = document.createElement('i');
        sw.className = 'sw';
        sw.style.background = sec.swatch(o);
        b.appendChild(sw);
      }
      b.appendChild(document.createTextNode(o.name));
      b.addEventListener('click', () => {
        myLook = { ...myLook, [sec.key]: o.id };
        me.setLook(myLook);
        renderLookOptions();
      });
      wrap.appendChild(b);
    }
    lookOptions.append(t, wrap);
  }
}
function openLook() {
  lookName.value = myName;
  renderLookOptions();
  lookSheet.classList.remove('hidden');
  // 내 모습이 잘 보이게 카메라를 앞쪽으로
  cam.yaw = me.root.rotation.y;
  cam.dist = Math.min(cam.dist, 4.5);
}
function closeLook() {
  lookSheet.classList.add('hidden');
  const v = lookName.value.trim().slice(0, 12);
  if (v && v !== myName) {
    myName = v;
    store.set('school.name', myName);
    me.setName(myName);
    net.updateMe();
  }
  store.set('school.look', JSON.stringify(myLook));
  announce();
}
document.getElementById('lookBtn').addEventListener('click', openLook);
document.getElementById('lookDone').addEventListener('click', closeLook);
lookSheet.addEventListener('click', (e) => {
  if (e.target === lookSheet) closeLook();
});

// 이름 바꾸기 (왼쪽 위 방 이름 누르기)
document.getElementById('roomBadge').addEventListener('click', () => {
  const v = window.prompt('내 이름을 바꿀까요? (12자까지)', myName);
  if (!v || !v.trim()) return;
  myName = v.trim().slice(0, 12);
  store.set('school.name', myName);
  me.setName(myName);
  net.updateMe();
  announce();
});

// ── 입장 화면 ──
const intro = document.getElementById('intro');
const nameInput = document.getElementById('nameInput');
// ── 장소 이동: 목록에서 누르면 거기까지 자동으로 걸어감 (층·계단·건물 사이 길찾기 포함) ──
{
  const sheet = document.getElementById('placeSheet');
  const list = document.getElementById('placeList');
  const L0 = levelY(0);
  const SECTIONS = [
    ['밖 · 운동장', [
      ['🏫', '중앙현관 앞', 0, 0, 6, 0],
      ['🚪', '교문', 66, 0, 8.5, 0],
      ['🛣️', '등굣길', 80, 0, 10, 0],
      ['⚽', '운동장 가운데', 0, FIELD_Y, 41, 0],
      ['📣', '구령대 앞', 0, 0, 17.5, 0],
      ['🏆', '명예의 전당', -45, FIELD_Y, 20, 0],
      ['🦘', '멀리뛰기', 60, FIELD_Y, 21, 0],
      ['🏀', '야외 농구장', 58, FIELD_Y, 58, 0],
      ['🪢', '그네·정글짐', 52, FIELD_Y, 40, 0],
      ['🌳', '등나무 쉼터', -39, 0, 7, 0],
      ['🗿', '동상', 0, 0, 9, 0],
    ]],
    ['뒷마당', [
      ['🏪', '매점', (STORE.minX + STORE.maxX) / 2, 0, STORE.maxZ + 1.5, 0],
      ['🥬', '텃밭', -54, 0, -34.5, 0],
      ['🚲', '자전거 보관대', -26, 0, -20, 0],
      ['🏸', '배드민턴장', 58, 0, -28, 0],
      ['🚗', '주차장', 58, 0, -8, 0],
      ['🚰', '수돗가', -56, 0, -3, 0],
    ]],
    ['급식실 · 강당', [
      ['🍚', '급식실', 21.5, 0.15, -27, 0],
      ['🏟️', '강당', 21, levelY(1), -24, 1],
    ]],
    ['1층', [
      ['🏛️', '중앙현관 로비', 0, L0, -4, 0],
      ['🚻', '1층 화장실(남)', -44, L0, -16, 0],
      ['🚻', '1층 화장실(여)', 44, L0, -16, 0],
    ]],
    ['2층', [['🚻', '2층 화장실(남)', -44, levelY(1), -16, 1], ['🚻', '2층 화장실(여)', 44, levelY(1), -16, 1]]],
    ['3층', [['🚻', '3층 화장실(남)', -44, levelY(2), -16, 2], ['🚻', '3층 화장실(여)', 44, levelY(2), -16, 2]]],
    ['옥상', [
      ['🌤️', '옥상', 0, levelY(ROOF), -6, ROOF],
      ['🐤', '닭장', 30, levelY(ROOF), -3.5, ROOF],
      ['🍚', '비빔밥 자리', -30, levelY(ROOF), -3.5, ROOF],
    ]],
  ];
  // 교실·특별실·사무실은 CLASSROOMS 에서 층별로
  const roomIcon = (t) => ({ class: '📚', science: '🔬', art: '🎨', computer: '💻', broadcast: '📻', music: '🎹', av: '📽️', homeec: '🧵', council: '🗳️', principal: '🏫', admin: '🗂️', staff: '👩‍🏫', nurse: '🩺', counsel: '💬', library: '📖', english: '🔤' })[t] || '🏫';
  for (let k = 0; k < 3; k++) {
    const sec = SECTIONS.find((s) => s[0] === `${k + 1}층`);
    const rooms = CLASSROOMS.filter((r) => r.level === k);
    for (const r of rooms) sec[1].push([roomIcon(r.type), r.name, r.type === 'counsel' || r.type === 'library' ? (r.xs + r.xe) / 2 : r.xs + 1.45, levelY(k), r.type === 'counsel' ? -2 : r.type === 'library' ? Z_CORR + 0.6 : Z_CORR + 0.5, k]); // 교실은 앞문 바로 안쪽
    // 화장실은 뒤로
    sec[1].sort((a, b) => (a[1].includes('화장실') ? 1 : 0) - (b[1].includes('화장실') ? 1 : 0));
  }
  const render = () => {
    list.innerHTML = '';
    for (const [title, items] of SECTIONS) {
      list.append(Object.assign(document.createElement('div'), { className: 'place-sec', textContent: title }));
      const grid = document.createElement('div');
      grid.className = 'place-grid';
      for (const [icon, name, x, y, z, lvl] of items) {
        const b = document.createElement('button');
        b.type = 'button';
        b.innerHTML = `<span>${icon}</span>${name}`;
        if (whereText === name) b.classList.add('here');
        b.addEventListener('click', () => {
          sheet.classList.add('hidden');
          unlockAudio();
          if (me.sitChairIndex != null) standUp(me);
          const ok = goTo({ x, y, z }, lvl);
          if (ok !== undefined) return;
          hint(`${icon} ${name}(으)로 가요`, 1800);
        });
        grid.append(b);
      }
      list.append(grid);
    }
  };
  document.getElementById('placeBtn').addEventListener('click', () => {
    render();
    sheet.classList.remove('hidden');
  });
  document.getElementById('placeClose').addEventListener('click', () => sheet.classList.add('hidden'));
  sheet.addEventListener('click', (e) => e.target === sheet && sheet.classList.add('hidden'));
}

// ── 방(서버) 바꾸기: 처음엔 자동 배정(우리학교), 들어온 뒤 원하는 방으로 이동 ──
{
  const sheet = document.getElementById('roomSheet');
  const list = document.getElementById('roomList');
  const input = document.getElementById('roomInput');
  const PRESET = ['우리학교', ...[1, 2, 3].flatMap((g) => [1, 2, 3, 4].map((c) => `${g}-${c}반`))];
  const goRoom = (name) => {
    const r = String(name || '').trim().slice(0, 30);
    if (!r || r === room) return sheet.classList.add('hidden');
    const u = new URL(location.href);
    u.searchParams.set('room', r);
    location.href = u.toString();
  };
  document.getElementById('roomBtn').addEventListener('click', () => {
    document.getElementById('roomNow').textContent = `지금: ${room}${instanceNo ? ` ${instanceNo}번 방` : ''} · ${peopleCount}명`;
    list.innerHTML = '';
    for (const r of PRESET) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = r === '우리학교' ? '🏫 우리학교 (전체 · 자동)' : r;
      b.classList.toggle('on', r === room);
      b.addEventListener('click', () => goRoom(r));
      list.appendChild(b);
    }
    input.value = PRESET.includes(room) ? '' : room;
    sheet.classList.remove('hidden');
  });
  document.getElementById('roomGo').addEventListener('click', () => goRoom(input.value));
  input.addEventListener('keydown', (e) => e.key === 'Enter' && goRoom(input.value));
  document.getElementById('roomClose').addEventListener('click', () => sheet.classList.add('hidden'));
  sheet.addEventListener('click', (e) => e.target === sheet && sheet.classList.add('hidden'));
}
document.getElementById('introRoom').textContent = `${room}${startClass ? ` · ${startClass.name}` : ''}${isTeacher ? ' · 선생님으로 입장' : ''}`;
nameInput.value = myName;
document.getElementById('introForm').addEventListener('submit', (e) => {
  e.preventDefault();
  unlockAudio();
  const v = nameInput.value.trim().slice(0, 12);
  if (v) {
    myName = v;
    store.set('school.name', myName);
    me.setName(myName);
  }
  intro.remove();
  start();
});

function start() {
  const meRef = {
    id: myId,
    get name() {
      return myName;
    },
    teacher: isTeacher,
    announce,
  };
  net = connectRoom({
    room,
    me: meRef,
    onState,
    onAction,
    onBall,
    onLeave,
    onCount(n) {
      peopleCount = Math.max(1, n);
      renderRoomLabel();
    },
    onStatus(s) {
      netStatus = s;
      renderRoomLabel();
      if (s === 'full') hint('지금 접속한 친구가 너무 많아서 혼자 모드예요. 잠시 후 다시 들어와 보세요', 5000);
      else if (s === 'offline') hint('서버 연결이 끊겨서 혼자 모드예요. 새로고침하면 다시 연결돼요', 5000);
    },
    onInstance(n) {
      instanceNo = n;
      renderRoomLabel();
    },
    preferInstance: params.get('instance'),
  });
  renderRoomLabel();
  setTimeout(() => hint(startClass ? '가까운 빈 바닥을 눌러주세요' : '🏫 교문으로 들어가 볼까요?', 2800), 400);

  ambience = createAmbience();
  ambience.setMuted(muted);
  ambience.setMix(soundMix());
  ambience.start();
  // 시간표에 맞춰 수업 시작·끝날 때 종이 울림
  updatePeriod(true);
  setInterval(() => updatePeriod(false), 1000);

  // 주기적으로 내 위치 알림 + 오래 소식 없는 친구 정리
  // (서버 사용량을 아끼려고 12초마다, 위치만)
  setInterval(() => {
    net.send('state', myState());
    const now = performance.now();
    for (const [id, o] of others) if (now - o.lastSeen > 45000) onLeave(id);
  }, 12000);
  window.addEventListener('pagehide', () => net.close());
}
renderRoomLabel();

// 지금 어디에 있는지 (교실 이름 / 층)
let lastWhere = '';
function updateWhere() {
  const r = roomAt(me.pos.x, me.pos.z, me.pos.y);
  const inBack = me.pos.z <= Z_BACK && me.pos.z > Z_BACK - 6 && (Math.abs(me.pos.x) < 5.2 || (Math.abs(me.pos.x) > BX - 7.2 && Math.abs(me.pos.x) < BX));
  const inBuilding = Math.abs(me.pos.x) < BX && me.pos.z < 0 && (me.pos.z > Z_BACK || inBack);
  const shop = me.pos.x > STORE.minX && me.pos.x < STORE.maxX && me.pos.z > STORE.minZ && me.pos.z < STORE.maxZ;
  const onRoof = inBuilding && levelOfY(me.pos.y) === ROOF;
  const lv = levelOfY(me.pos.y);
  const annex = inRect(GYM, me.pos.x, me.pos.z)
    ? lv === 1
      ? '강당'
      : '급식실'
    : inRect(BRIDGE, me.pos.x, me.pos.z) && lv === 1
      ? '구름다리'
      : null;
  const hallRoom = inBuilding && !onRoof && Math.abs(me.pos.x) < 4.5 && me.pos.z > Z_CORR ? HALL_NAMES[levelOfY(me.pos.y)] : null;
  const backName = inBack ? (Math.abs(me.pos.x) < 5.2 ? '중앙 계단' : me.pos.x < 0 ? '남자 화장실' : '여자 화장실') : null;
  const w = r ? r.name : onRoof ? '옥상' : backName ? backName : hallRoom ? hallRoom : inBuilding ? `${levelOfY(me.pos.y) + 1}층` : shop ? '매점' : annex || (me.pos.x > OUT.wall ? '등굣길' : me.pos.z < Z_BACK ? '뒷마당' : '운동장');
  if (w !== lastWhere) {
    if (r && lastWhere && !TEACHING.has(r.type)) {
      hint(r.name, 1800);
    } else if (r && lastWhere) {
      const sub = teachers.subjectOf(r);
      const cls = schoolNow().kind === 'class';
      hint(`${r.name} · ${sub ? `${sub} 시간 (${SUBJECTS[sub].name})` : cls ? '자습 시간 · 선생님 없음' : '쉬는 시간'}`, 2200);
    } else if (annex && lastWhere) hint(w, 1500);
    lastWhere = w;
    whereText = w;
    renderRoomLabel();
  }
}

// ── 발소리 · 미닫이문 소리 ──
let lastStep = 0;
let prevPos = null;
function groundKind() {
  const { x, y, z } = me.pos;
  const k = levelOfY(y);
  if (Math.abs(x) < BX && z < 0 && z > Z_BACK) {
    if (k === ROOF) return 'hard';
    if (STAIRS.some((t) => (t.center ? z < Z_BACK : z > Z_CORR) && x > t.xs && x < t.xe)) return 'hard';
    if (Math.abs(x) < 4.5 && z > Z_CORR && k === 0) return 'hard'; // 중앙현관
    return 'wood';
  }
  if (inRect(GYM, x, z)) return k === 1 ? 'wood' : 'hard';
  if (inRect(BRIDGE, x, z) && k === 1) return 'hard';
  if (inRect(STORE, x, z)) return 'hard';
  if (z >= 0 && z < 15) return 'hard'; // 건물 앞 시멘트 마당
  if (z <= Z_BACK && z > -46) return 'hard'; // 뒷마당
  if (Math.abs(x) > 66 || z > 68) return 'grass';
  return 'dirt';
}
function stepSounds() {
  // 걸음 박자에 맞춰 한 발씩
  const n = Math.floor(me.walkPhase / Math.PI);
  if (n !== lastStep) {
    lastStep = n;
    if (me.speed > 0.5 && !me.sitChair) ambience?.step(groundKind(), 1);
  }
  // 교실 문(복도 ↔ 교실 경계)을 지나가면 드르륵
  const p = me.pos;
  if (prevPos && (prevPos.z - Z_CORR) * (p.z - Z_CORR) < 0 && Math.abs(p.x) < BX) {
    const r = roomAt(p.x, Math.max(p.z, prevPos.z), p.y);
    if (r && levelOfY(p.y) < ROOF) ambience?.slideDoor(1);
  }
  prevPos = { x: p.x, y: p.y, z: p.z };
}

// ── 매 프레임 ──
const clock = new THREE.Clock();
let whereT = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  me.update(dt, world.heightAt);
  for (const { avatar } of others.values()) avatar.update(dt, world.heightAt);
  npc.update(dt, () => 0);
  for (const c of cooks) c.update(dt, () => 0);
  updateShots(dt);
  stepSounds();
  events.update(dt, me, camera.position);
  activities.update(dt);
  games.update(dt);
  bibim.update(dt);
  teachers.update(dt, me, roomAt(me.pos.x, me.pos.z, me.pos.y)?.id, camera.position);
  soccer.update(dt, me, !!me.target);
  {
    const sitting = new Set();
    if (me.sitChairIndex != null) sitting.add(me.sitChairIndex);
    for (const { avatar } of others.values()) if (avatar.sitChairIndex != null) sitting.add(avatar.sitChairIndex);
    world.update(clock.elapsedTime, sitting);
    // 그네에 앉은 아바타는 그네를 따라 흔들림
    const ride = (av) => {
      const c = av.sitChair;
      if (!c?.swing) return;
      const ang = world.swingAngle(av.sitChairIndex);
      const L = 2.1;
      av.root.position.x = c.x + Math.sin(ang) * L;
      av.root.position.y = c.seatY - 0.45 * AVATAR_SCALE + (L - Math.cos(ang) * L);
      av.root.rotation.z = -ang;
    };
    ride(me);
    for (const { avatar } of others.values()) ride(avatar);
  }
  if (marker.visible) {
    markerT += dt;
    marker.scale.setScalar(1 + markerT * 1.5);
    marker.material.opacity = Math.max(0, 0.9 - markerT * 1.2);
    if (markerT > 0.8) marker.visible = false;
  }
  if ((whereT += dt) > 0.3) {
    whereT = 0;
    updateWhere();
    updateStore();
    updateAnnex();
    updateStairBar();
    updateSitBtn();
    teachers.sync(me);
    events.sync(schoolNow());
    updateVendorBtn();
    updateGochuBtn();
    activities.sync(roomAt(me.pos.x, me.pos.z, me.pos.y));
    scorePill.classList.toggle('hidden', lastWhere !== '운동장');
    ambience?.setMix(soundMix());
  }
  // 그림자 영역이 내 주변을 따라오도록
  world.sun.position.set(me.pos.x + 18, me.pos.y + 30, me.pos.z + 22);
  world.sun.target.position.set(me.pos.x, me.pos.y, me.pos.z);
  updateCamera(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
cam.focus.set(me.pos.x, me.pos.y + 1.3 * AVATAR_SCALE, me.pos.z);
frame();

// 자동 점검용 (주소에 debug=1 이 있을 때만)
if (params.get('debug') === '1') window.__school = { me, walkTo, world, nav, others, soccer, npc, cam, teachers, hall, games };

// ── PWA: 앱처럼 설치 + 오프라인 저장 ──
if ('serviceWorker' in navigator && !DEBUG && location.hostname !== 'localhost') {
  window.addEventListener('load', () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {}));
}
{
  const installBtn = document.getElementById('installBtn');
  const iosTip = document.getElementById('iosTip');
  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || navigator.standalone;
  let deferred = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    if (!standalone) installBtn.classList.remove('hidden');
  });
  installBtn.addEventListener('click', async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice.catch(() => null);
    deferred = null;
    installBtn.classList.add('hidden');
  });
  window.addEventListener('appinstalled', () => installBtn.classList.add('hidden'));
  // 아이폰 사파리는 설치 버튼 대신 안내
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (ios && !standalone) iosTip.classList.remove('hidden');
}

// ── 📷 사진 찍기: 지금 화면(또는 셀카)을 찍어 2000년대 디카 느낌 날짜 + 학교 이름을 넣고 저장·공유 ──
{
  const sheet = document.getElementById('photoSheet');
  const img = document.getElementById('photoImg');
  const flash = document.getElementById('photoFlash');
  let lastBlob = null;
  let selfieMode = false;
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
  async function shoot(selfie) {
    unlockAudio();
    sheet.classList.add('hidden');
    document.body.classList.add('shooting');
    const saved = { yaw: cam.yaw, pitch: cam.pitch, dist: cam.dist };
    if (selfie) {
      // 내 얼굴 쪽으로 카메라 돌리고 브이(손 들기)
      cam.yaw = me.root.rotation.y;
      cam.pitch = 0.12;
      cam.dist = 2.4;
      me.target = null;
      me.path = [];
      me.play('hand');
      await new Promise((r) => setTimeout(r, 650));
      await nextFrame();
    } else {
      await nextFrame();
    }
    // 화면을 한 번 그린 직후 바로 읽기 (preserveDrawingBuffer 없이도 됨)
    renderer.render(scene, camera);
    const src = renderer.domElement;
    const W = src.width;
    const H = src.height;
    const pad = Math.round(Math.min(W, H) * 0.04);
    const bottom = Math.round(Math.min(W, H) * 0.14);
    const c = document.createElement('canvas');
    c.width = W + pad * 2;
    c.height = H + pad + bottom;
    const g = c.getContext('2d');
    // 폴라로이드 느낌 흰 테두리
    g.fillStyle = '#fbfaf5';
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(src, pad, pad, W, H);
    // 옛날 디카 주황 날짜
    const d = new Date();
    const stamp = `'${String(d.getFullYear()).slice(2)} ${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getDate()).padStart(2, '0')}`;
    const fs = Math.round(Math.min(W, H) * 0.05);
    g.font = `700 ${fs}px 'Courier New', monospace`;
    g.textAlign = 'right';
    g.textBaseline = 'bottom';
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillText(stamp, pad + W - fs * 0.6 + 2, pad + H - fs * 0.5 + 2);
    g.fillStyle = '#ff9a2e';
    g.fillText(stamp, pad + W - fs * 0.6, pad + H - fs * 0.5);
    // 아래 글씨: 학교 이름 · 장소 · 내 이름
    const fs2 = Math.round(bottom * 0.3);
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.fillStyle = '#2b2b2b';
    g.font = `700 ${fs2}px 'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',sans-serif`;
    g.fillText(`🏫 온라인 학교 · ${whereText || room}`, pad, H + pad + bottom * 0.38);
    g.fillStyle = '#888';
    g.font = `500 ${Math.round(fs2 * 0.75)}px 'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',sans-serif`;
    g.fillText(`${myName} · ${schoolNow().text}`, pad, H + pad + bottom * 0.72);
    // 찰칵
    flash.classList.remove('hidden');
    flash.style.animation = 'none';
    void flash.offsetWidth;
    flash.style.animation = '';
    setTimeout(() => flash.classList.add('hidden'), 450);
    ambience?.ding?.();
    document.body.classList.remove('shooting');
    if (selfie) Object.assign(cam, saved);
    lastBlob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9));
    if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
    img.src = URL.createObjectURL(lastBlob);
    selfieMode = selfie;
    document.getElementById('photoSelfie').textContent = selfie ? '🖼️ 풍경' : '🤳 셀카';
    sheet.classList.remove('hidden');
  }
  document.getElementById('photoBtn').addEventListener('click', () => shoot(false));
  document.getElementById('photoAgain').addEventListener('click', () => shoot(selfieMode));
  document.getElementById('photoSelfie').addEventListener('click', () => shoot(!selfieMode));
  document.getElementById('photoClose').addEventListener('click', () => sheet.classList.add('hidden'));
  document.getElementById('photoSave').addEventListener('click', async () => {
    if (!lastBlob) return;
    const d = new Date();
    const name = `온라인학교_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}.jpg`;
    const file = new File([lastBlob], name, { type: 'image/jpeg' });
    // 휴대폰: 공유 창(카톡·갤러리 저장 등), PC: 바로 내려받기
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: '온라인 학교', text: '🏫 온라인 학교에서 찍은 사진' });
        return;
      } catch (e) {
        if (e?.name === 'AbortError') return;
      }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(lastBlob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    hint('사진을 저장했어요 📷', 1800);
  });
}
