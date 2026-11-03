// 귀여운 학생 아바타 (큰 머리 + 교복) 와 이름표·말풍선
import * as THREE from 'three';

// ── 꾸미기 선택지 ──
export const GENDERS = [
  { id: 'girl', name: '여학생' },
  { id: 'boy', name: '남학생' },
];
// 교복: 여학생은 치마 + 세일러 깃 + 리본, 남학생은 바지 + 넥타이. skirt 색은 체크무늬 느낌
export const OUTFITS = [
  { id: 'navy', name: '남색 교복', top: '#2f4a7a', pants: '#3b3f4a', skirt: '#2f4a7a', tie: '#c0453f' },
  { id: 'wine', name: '자주 교복', top: '#7a2f3f', pants: '#3b3f4a', skirt: '#6a2a38', tie: '#2f4a7a' },
  { id: 'green', name: '초록 교복', top: '#2f6a55', pants: '#3b3f4a', skirt: '#2a5a48', tie: '#c0453f' },
  { id: 'beige', name: '베이지 조끼', top: '#b89a6a', pants: '#4a4440', skirt: '#5a4a3a', tie: '#7a2f3f', vest: true },
  { id: 'sailor', name: '세일러복', top: '#f6f4ee', pants: '#2f4a7a', skirt: '#2f4a7a', tie: '#c0453f', sailor: true },
  { id: 'gym', name: '초록 체육복', top: '#2f7a52', pants: '#2f7a52', skirt: '#2f7a52', gym: true },
  { id: 'gymblue', name: '파란 체육복', top: '#2f58a8', pants: '#2f58a8', skirt: '#2f58a8', gym: true },
  { id: 'suit', name: '선생님 정장', top: '#6b5444', pants: '#3d3a37', skirt: '#3d3a37', tie: '#2f4a7a' },
];
export const HAIRS = [
  { id: 'short', name: '짧은 머리' },
  { id: 'buzz', name: '까까머리' },
  { id: 'bob', name: '단발' },
  { id: 'long', name: '긴 머리' },
  { id: 'pigtail', name: '양갈래' },
  { id: 'bun', name: '똥머리' },
  { id: 'twin', name: '양갈래 땋기' },
  { id: 'bangs', name: '앞머리 단발' },
  { id: 'ponytail', name: '포니테일' },
  { id: 'mushroom', name: '바가지머리' },
];
export const HAIR_COLORS = [
  { id: 'black', name: '검정', color: '#1f1f24' },
  { id: 'dark', name: '흑갈색', color: '#3b2a20' },
  { id: 'brown', name: '갈색', color: '#6b4a32' },
  { id: 'gold', name: '노랑', color: '#c9a04a' },
];
export const ACCS = [
  { id: 'none', name: '없음' },
  { id: 'glasses', name: '안경' },
  { id: 'cap', name: '야구모자' },
  { id: 'ribbon', name: '리본' },
  { id: 'hairpin', name: '머리핀' },
  { id: 'headband', name: '머리띠' },
  { id: 'hairnet', name: '위생모' },
];
export const BAGS = [
  { id: 'none', name: '없음' },
  { id: 'red', name: '빨간 책가방', color: '#c8473d' },
  { id: 'blue', name: '파란 책가방', color: '#2f58a8' },
  { id: 'black', name: '검정 책가방', color: '#2b2b2b' },
  { id: 'pink', name: '분홍 책가방', color: '#ee7fa6' },
];

export function defaultLook(id, isTeacher) {
  const h = hashCode(id);
  const girl = h % 2 === 0;
  return {
    gender: girl ? 'girl' : 'boy',
    outfit: isTeacher ? 'suit' : OUTFITS[h % 4].id,
    hair: girl ? ['bob', 'long', 'pigtail', 'bangs'][h % 4] : ['short', 'buzz', 'mushroom'][h % 3],
    hairColor: HAIR_COLORS[h % 2].id,
    acc: 'none',
    bag: isTeacher ? 'none' : BAGS[1 + (h % 4)].id,
  };
}

// 친구에게서 받은 값도 안전하게 정리
export function cleanLook(look, fallback) {
  const pick = (list, v, d) => (list.some((o) => o.id === v) ? v : d);
  const l = look && typeof look === 'object' ? look : {};
  return {
    gender: pick(GENDERS, l.gender, fallback.gender || 'girl'),
    outfit: pick(OUTFITS, l.outfit, fallback.outfit),
    hair: pick(HAIRS, l.hair, fallback.hair),
    hairColor: pick(HAIR_COLORS, l.hairColor, fallback.hairColor),
    acc: pick(ACCS, l.acc, fallback.acc),
    bag: pick(BAGS, l.bag, fallback.bag || 'none'),
  };
}
const FONT = "'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',sans-serif";

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function spriteFromCanvas(c, worldH) {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  const s = new THREE.Sprite(mat);
  s.scale.set((worldH * c.width) / c.height, worldH, 1);
  s.renderOrder = 10;
  return s;
}

// 참고 이미지처럼 "나 | 편안한 나무" 모양의 이름표
function makeNameTag(name, { isMe, isTeacher }) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  const font = `600 40px ${FONT}`;
  g.font = font;
  const badge = isMe ? '나' : isTeacher ? '선생님' : '';
  const badgeW = badge ? (badge.length > 1 ? 112 : 60) : 0;
  const textW = Math.min(g.measureText(name).width, 360);
  c.width = Math.ceil(textW + badgeW + (badge ? 52 : 44));
  c.height = 72;
  g.font = font;
  g.fillStyle = 'rgba(255,253,244,0.92)';
  roundRect(g, 0, 0, c.width, c.height, 36);
  g.fill();
  let x = 22;
  if (badge) {
    g.fillStyle = isTeacher && !isMe ? '#3f7e4e' : '#6d7466';
    roundRect(g, 8, 8, badgeW, 56, 28);
    g.fill();
    g.fillStyle = '#fff';
    g.font = `600 32px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(badge, 8 + badgeW / 2, 37);
    x = badgeW + 22;
  }
  g.font = font;
  g.fillStyle = '#2b2b2b';
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.fillText(name, x, 38, 360);
  return spriteFromCanvas(c, 0.34);
}

function makeBubble(text) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  const font = `500 36px ${FONT}`;
  g.font = font;
  // 줄바꿈 (한 줄 최대 약 14자)
  const lines = [];
  let cur = '';
  for (const ch of String(text)) {
    if (g.measureText(cur + ch).width > 440) {
      lines.push(cur);
      cur = ch;
    } else cur += ch;
  }
  if (cur) lines.push(cur);
  const w = Math.max(...lines.map((l) => g.measureText(l).width));
  c.width = Math.ceil(w + 48);
  c.height = lines.length * 46 + 40;
  g.font = font;
  g.fillStyle = '#ffffff';
  roundRect(g, 0, 0, c.width, c.height - 14, 22);
  g.fill();
  g.beginPath();
  g.moveTo(c.width / 2 - 12, c.height - 15);
  g.lineTo(c.width / 2 + 12, c.height - 15);
  g.lineTo(c.width / 2, c.height);
  g.fill();
  g.fillStyle = '#222';
  g.textBaseline = 'top';
  lines.forEach((l, i) => g.fillText(l, 24, 14 + i * 46));
  return spriteFromCanvas(c, (c.height / 100) * 0.42);
}

function makeEmoji(emoji) {
  const c = document.createElement('canvas');
  c.width = c.height = 96;
  const g = c.getContext('2d');
  g.font = `72px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(emoji, 48, 54);
  return spriteFromCanvas(c, 0.5);
}

function hashCode(str) {
  let h = 0;
  for (const ch of String(str)) h = (h * 31 + ch.codePointAt(0)) | 0;
  return Math.abs(h);
}

// 아바타 전체 크기 (1 = 약 2.2m). 0.78 → 약 1.7m
export const AVATAR_SCALE = 0.78;

export class Avatar {
  constructor({ id, name, color, look, isMe = false, isTeacher = false, occlude = false }) {
    this.occlude = occlude; // true 면 이름표·말풍선이 벽에 가려짐 (NPC)
    this.id = id;
    this.isMe = isMe;
    this.isTeacher = isTeacher;
    const mat = (c, extra) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, ...extra });
    this.mat = mat;
    const skin = mat('#f1c79a');
    const cloth = mat(color || '#2f4a7a');
    const shirt = mat('#f6f4ee');
    const pants = mat('#3b3f4a');
    const hair = mat('#1f1f24');
    this.mats = { cloth, pants, hair, tie: mat('#c0453f') };
    this.fixedColor = color;

    const root = new THREE.Group();
    root.scale.setScalar(AVATAR_SCALE); // 교실 높이에 비해 너무 커 보이지 않게 (약 1.7m)
    this.root = root;

    // 몸통(엉덩이 기준으로 숙일 수 있게)
    const body = new THREE.Group();
    body.position.y = 0.5;
    root.add(body);
    this.body = body;

    // 몸통: 위가 조금 좁은 둥근 통 + 아래 둥근 밑단
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.5, 18), cloth);
    torso.position.y = 0.3;
    body.add(torso);
    const hem = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), cloth);
    hem.position.y = 0.06;
    hem.scale.y = 0.35;
    body.add(hem);
    this.torso = torso;
    this.hem = hem;
    // 흰 셔츠 깃(둥근 V) + 넥타이 (남학생·선생님)
    const collar = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.2, 3), shirt);
    collar.rotation.x = Math.PI;
    collar.position.set(0, 0.5, 0.2);
    body.add(collar);
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.22, 0.03), this.mats.tie);
    tie.position.set(0, 0.36, 0.27);
    tie.rotation.x = -0.12;
    body.add(tie);
    this.collar = collar;
    this.tie = tie;
    // 세일러 깃 (여학생): 뒤로 네모난 흰 깃 + 가슴 앞 리본
    const sailor = new THREE.Group();
    const sBack = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.02, 0.3), shirt);
    sBack.position.set(0, 0.54, -0.12);
    sailor.add(sBack);
    for (const sx of [-1, 1]) {
      const flap = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.26), shirt);
      flap.position.set(sx * 0.13, 0.52, 0.12);
      flap.rotation.set(0.5, 0, sx * 0.25);
      sailor.add(flap);
      const bow = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 10), this.mats.tie);
      bow.rotation.z = (sx * Math.PI) / 2;
      bow.position.set(sx * 0.07, 0.4, 0.27);
      sailor.add(bow);
    }
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), this.mats.tie);
    knot.position.set(0, 0.4, 0.28);
    sailor.add(knot);
    const sLine = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.015, 0.02), this.mats.tie);
    sLine.position.set(0, 0.55, -0.26);
    sailor.add(sLine);
    body.add(sailor);
    this.sailor = sailor;
    // 체육복 흰 줄
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.295, 0.06, 18, 1, true), shirt);
    stripe.position.y = 0.3;
    body.add(stripe);
    this.stripe = stripe;
    // 가슴 명찰 (2000년대 학교 명찰: 흰 바탕에 이름)
    const tagMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const chestTag = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.05), tagMat);
    chestTag.position.set(0.14, 0.42, 0.285);
    chestTag.rotation.x = -0.15;
    body.add(chestTag);
    this.chestTag = chestTag;
    // 치마 (여학생): 아래로 퍼지는 주름치마
    const skirtMat = mat('#2f4a7a');
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.4, 0.24, 20, 1, true), skirtMat);
    skirtMat.side = THREE.DoubleSide;
    skirt.position.y = 0.0;
    body.add(skirt);
    for (let i = 0; i < 12; i++) {
      const pleat = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.025), skirtMat);
      const a = (i / 12) * Math.PI * 2;
      pleat.position.set(Math.sin(a) * 0.37, -0.01, Math.cos(a) * 0.37);
      pleat.rotation.y = a;
      skirt.add(pleat);
    }
    const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 20), skirtMat);
    waist.position.y = 0.12;
    skirt.add(waist);
    this.skirt = skirt;
    this.mats.skirt = skirtMat;
    // 책가방 (뒤)
    const bagMat = mat('#c8473d');
    const bag = new THREE.Group();
    const bagBody = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.16), bagMat);
    bagBody.position.set(0, 0.3, -0.3);
    const bagLid = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.18), bagMat);
    bagLid.position.set(0, 0.44, -0.3);
    const bagPocket = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.04), bagMat);
    bagPocket.position.set(0, 0.22, -0.39);
    bag.add(bagBody, bagLid, bagPocket);
    for (const sx of [-1, 1]) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 0.03), bagMat);
      strap.position.set(sx * 0.12, 0.32, -0.2);
      strap.rotation.x = 0.2;
      bag.add(strap);
    }
    body.add(bag);
    this.bag = bag;
    this.mats.bag = bagMat;

    // 머리
    const head = new THREE.Group();
    head.position.y = 0.92;
    body.add(head);
    this.head = head;
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.4, 26, 20), skin);
    headMesh.scale.set(1, 0.98, 0.96);
    head.add(headMesh);
    this.hairGroup = new THREE.Group();
    this.accGroup = new THREE.Group();
    head.add(this.hairGroup, this.accGroup);
    // 큰 반짝이 눈 (검은 눈동자 + 흰 하이라이트 2개) + 속눈썹 느낌의 위쪽 선
    const eyeMat = mat('#2a2522');
    const hiMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    this.eyes = [];
    for (const ex of [-0.14, 0.14]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.062, 12, 10), eyeMat);
      eye.position.set(ex, -0.01, 0.355);
      eye.scale.set(1, 1.35, 0.55);
      head.add(eye);
      this.eyes.push(eye);
      const hi = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), hiMat);
      hi.position.set(ex - 0.02, 0.03, 0.4);
      head.add(hi);
      const hi2 = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), hiMat);
      hi2.position.set(ex + 0.025, -0.03, 0.4);
      head.add(hi2);
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), mat('#f6a9a6'));
      cheek.position.set(ex * 1.7, -0.13, 0.32);
      cheek.scale.set(1, 0.55, 0.35);
      head.add(cheek);
    }
    // 작은 입 (살짝 웃는 선)
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 12, Math.PI), mat('#c0604f'));
    mouth.position.set(0, -0.14, 0.385);
    mouth.rotation.z = Math.PI;
    head.add(mouth);
    this.mouth = mouth;

    // 팔 (어깨 기준 회전)
    const makeArm = (side) => {
      const pivot = new THREE.Group();
      pivot.position.set(0.3 * side, 0.48, 0);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.3, 4, 10), cloth);
      arm.position.y = -0.19;
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.04, 10), shirt);
      cuff.position.y = -0.36;
      pivot.add(cuff);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), skin);
      hand.position.y = -0.42;
      pivot.add(arm, hand);
      pivot.rotation.z = 0.12 * side;
      body.add(pivot);
      return pivot;
    };
    this.armL = makeArm(-1);
    this.armR = makeArm(1);

    // 다리
    const makeLeg = (side) => {
      const pivot = new THREE.Group();
      pivot.position.set(0.13 * side, 0.5, 0);
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.3, 4, 10), pants);
      leg.position.y = -0.24;
      const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.16, 10), shirt);
      sock.position.y = -0.34;
      sock.visible = false;
      const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), mat('#f7f7f2'));
      shoe.position.set(0, -0.44, 0.05);
      shoe.scale.set(0.8, 0.45, 1.2);
      pivot.add(leg, sock, shoe);
      pivot.userData.sock = sock;
      pivot.userData.leg = leg;
      pivot.userData.shoe = shoe;
      root.add(pivot);
      return pivot;
    };
    this.legL = makeLeg(-1);
    this.legR = makeLeg(1);

    this.setLook(look || defaultLook(id, isTeacher));

    // 이름표
    this.tagHolder = new THREE.Group();
    this.tagHolder.position.y = 1.95;
    root.add(this.tagHolder);
    this.setName(name);

    // 상태
    this.pos = new THREE.Vector3();
    this.target = null;
    this.path = [];
    this.walkPhase = 0;
    this.speed = 0;
    this.sitChair = null;
    this.action = null; // { type, t }
    this.bubble = null;
    this.bubbleT = 0;
    this.emoji = null;
    this.emojiT = 0;
  }

  // 옷·머리·장식 바꾸기
  setLook(look) {
    const l = cleanLook(look, defaultLook(this.id, this.isTeacher));
    this.look = l;
    const o = OUTFITS.find((x) => x.id === l.outfit);
    const girl = l.gender === 'girl';
    this.mats.cloth.color.set(this.fixedColor || o.top);
    this.mats.pants.color.set(girl && !o.gym ? '#f6f4ee' : o.pants); // 여학생 교복은 흰 양말 다리
    this.mats.skirt.color.set(o.skirt || o.top);
    if (o.tie) this.mats.tie.color.set(o.tie);
    const uniform = !o.gym;
    this.tie.visible = uniform && !girl;
    this.collar.visible = uniform && !girl;
    this.sailor.visible = uniform && girl;
    this.stripe.visible = !!o.gym;
    this.skirt.visible = uniform && girl;
    this.hem.visible = !(uniform && girl);
    this.chestTag.visible = uniform;
    for (const lg of [this.legL, this.legR]) {
      lg.userData.sock.visible = false;
      lg.userData.leg.scale.set(1, 1, 1);
      lg.userData.leg.position.y = -0.24;
      lg.userData.shoe.material.color.set(uniform ? (girl ? '#2b2b2b' : '#3a3a3a') : '#f7f7f2'); // 교복엔 구두, 체육복엔 운동화
    }
    const bagSpec = BAGS.find((x) => x.id === l.bag);
    this.bag.visible = !!bagSpec?.color;
    if (bagSpec?.color) this.mats.bag.color.set(bagSpec.color);
    this.mats.hair.color.set(HAIR_COLORS.find((x) => x.id === l.hairColor).color);

    const clear = (g) => {
      for (const c of [...g.children]) {
        g.remove(c);
        c.traverse((m) => m.isMesh && m.geometry.dispose());
      }
    };
    clear(this.hairGroup);
    clear(this.accGroup);
    const hm = this.mats.hair;
    const add = (g, geo, mat, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.scale.set(sx, sy, sz);
      m.rotation.x = rx;
      g.add(m);
      return m;
    };
    const cap = (theta) => add(this.hairGroup, new THREE.SphereGeometry(0.42, 24, 12, 0, Math.PI * 2, 0, Math.PI * theta), hm, 0, 0.02, -0.03, 1, 1, 1, -0.35);
    switch (l.hair) {
      case 'buzz':
        add(this.hairGroup, new THREE.SphereGeometry(0.405, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.4), hm, 0, 0.01, -0.02, 1, 1, 1, -0.4);
        break;
      case 'bob':
        cap(0.42);
        add(this.hairGroup, new THREE.SphereGeometry(0.44, 24, 12, Math.PI * 0.6, Math.PI * 0.8, Math.PI * 0.25, Math.PI * 0.45), hm, 0, 0, 0);
        break;
      case 'long':
        cap(0.42);
        add(this.hairGroup, new THREE.SphereGeometry(0.44, 24, 12, Math.PI * 0.6, Math.PI * 0.8, Math.PI * 0.25, Math.PI * 0.45), hm, 0, 0, 0);
        add(this.hairGroup, new THREE.CapsuleGeometry(0.3, 0.35, 4, 12), hm, 0, -0.35, -0.2, 1.1, 1, 0.45);
        break;
      case 'pigtail':
        cap(0.42);
        for (const sx of [-1, 1]) add(this.hairGroup, new THREE.SphereGeometry(0.13, 12, 10), hm, 0.42 * sx, -0.05, -0.12, 0.9, 1.5, 0.9);
        break;
      case 'bun':
        cap(0.45);
        add(this.hairGroup, new THREE.SphereGeometry(0.16, 14, 12), hm, 0, 0.42, -0.12);
        break;
      case 'twin': {
        cap(0.42);
        for (const sx of [-1, 1]) {
          for (let i = 0; i < 4; i++) add(this.hairGroup, new THREE.SphereGeometry(0.085, 10, 8), hm, 0.4 * sx, 0.02 - i * 0.13, -0.08 - i * 0.03, 1, 1.1, 1);
          add(this.hairGroup, new THREE.SphereGeometry(0.03, 8, 6), this.mat('#ee7fa6'), 0.4 * sx, 0.08, -0.06);
        }
        break;
      }
      case 'bangs':
        cap(0.42);
        add(this.hairGroup, new THREE.SphereGeometry(0.44, 24, 12, Math.PI * 0.6, Math.PI * 0.8, Math.PI * 0.25, Math.PI * 0.45), hm, 0, 0, 0);
        add(this.hairGroup, new THREE.BoxGeometry(0.42, 0.14, 0.12), hm, 0, 0.19, 0.33); // 일자 앞머리
        break;
      case 'ponytail': {
        cap(0.42);
        add(this.hairGroup, new THREE.SphereGeometry(0.1, 10, 8), hm, 0, 0.3, -0.36);
        const tail = add(this.hairGroup, new THREE.CapsuleGeometry(0.09, 0.4, 4, 10), hm, 0, 0.0, -0.42);
        tail.rotation.x = 0.35;
        add(this.hairGroup, new THREE.TorusGeometry(0.06, 0.02, 6, 12), this.mat('#ee7fa6'), 0, 0.28, -0.36);
        break;
      }
      case 'mushroom':
        add(this.hairGroup, new THREE.SphereGeometry(0.45, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), hm, 0, 0.02, -0.02, 1, 0.9, 1, -0.2);
        break;
      default:
        cap(0.42);
    }
    const accMat = (c) => this.mat(c);
    if (l.acc === 'glasses') {
      const frame = accMat('#2a2a2e');
      for (const ex of [-0.13, 0.13]) add(this.accGroup, new THREE.TorusGeometry(0.075, 0.012, 6, 18), frame, ex, -0.02, 0.385);
      add(this.accGroup, new THREE.BoxGeometry(0.1, 0.015, 0.015), frame, 0, -0.01, 0.39);
    } else if (l.acc === 'cap') {
      const red = accMat('#c8473d');
      add(this.accGroup, new THREE.SphereGeometry(0.435, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.36), red, 0, 0.04, -0.02, 1, 1, 1, -0.2);
      add(this.accGroup, new THREE.CylinderGeometry(0.26, 0.26, 0.025, 20, 1, false, -Math.PI / 2, Math.PI), red, 0, 0.17, 0.3, 1, 1, 1.1, 0.12);
    } else if (l.acc === 'hairnet') {
      const net = accMat('#f7f7f4');
      const cap = add(this.accGroup, new THREE.SphereGeometry(0.47, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), net, 0, 0.05, -0.03, 1.02, 0.9, 1.02, -0.25);
      cap.castShadow = true;
      add(this.accGroup, new THREE.TorusGeometry(0.43, 0.035, 6, 24), net, 0, 0.06, -0.06, 1, 1, 1, Math.PI / 2 - 0.25);
    } else if (l.acc === 'hairpin') {
      const pin = accMat('#f2c230');
      for (const dx of [0, 0.07]) add(this.accGroup, new THREE.BoxGeometry(0.1, 0.018, 0.018), pin, 0.22 + dx, 0.3, 0.25).rotation.z = -0.5;
    } else if (l.acc === 'headband') {
      const hb = accMat('#ee7fa6');
      const band = add(this.accGroup, new THREE.TorusGeometry(0.42, 0.028, 8, 28, Math.PI), hb, 0, 0.06, 0.0);
      band.rotation.x = -0.9;
      band.rotation.z = 0;
    } else if (l.acc === 'ribbon') {
      const pink = accMat('#ee7fa6');
      for (const sx of [-1, 1]) {
        const m = add(this.accGroup, new THREE.ConeGeometry(0.09, 0.16, 12), pink, 0.2 + sx * 0.09, 0.36, 0.05);
        m.rotation.z = (sx * Math.PI) / 2;
      }
      add(this.accGroup, new THREE.SphereGeometry(0.045, 10, 8), pink, 0.2, 0.36, 0.05);
    }
    this.root.traverse((m) => {
      if (m.isMesh) m.castShadow = true;
    });
  }

  setName(name) {
    this.name = name;
    if (this.tag) {
      this.tagHolder.remove(this.tag);
      this.tag.material.map.dispose();
      this.tag.material.dispose();
    }
    this.tag = makeNameTag(name, { isMe: this.isMe, isTeacher: this.isTeacher });
    if (this.chestTag) {
      const c = document.createElement('canvas');
      c.width = 140;
      c.height = 50;
      const g = c.getContext('2d');
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, 140, 50);
      g.strokeStyle = '#2f4a7a';
      g.lineWidth = 4;
      g.strokeRect(2, 2, 136, 46);
      g.fillStyle = '#1f2a44';
      g.font = `700 24px ${FONT}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(String(name).slice(0, 5), 70, 26);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      this.chestTag.material.map?.dispose();
      this.chestTag.material.map = t;
      this.chestTag.material.needsUpdate = true;
    }
    if (this.occlude) this.tag.material.depthTest = true;
    this.tagHolder.add(this.tag);
  }

  say(text) {
    this.clearBubble();
    this.bubble = makeBubble(text);
    if (this.occlude) this.bubble.material.depthTest = true;
    this.bubble.position.y = 0.32 + this.bubble.scale.y / 2;
    this.tagHolder.add(this.bubble);
    this.bubbleT = 6;
  }

  clearBubble() {
    if (!this.bubble) return;
    this.tagHolder.remove(this.bubble);
    this.bubble.material.map.dispose();
    this.bubble.material.dispose();
    this.bubble = null;
  }

  showEmoji(e, secs) {
    if (this.emoji) {
      this.root.remove(this.emoji);
      this.emoji.material.map.dispose();
    }
    this.emoji = makeEmoji(e);
    this.emoji.position.set(0.55, 1.6, 0);
    this.root.add(this.emoji);
    this.emojiT = secs;
  }

  play(type) {
    const dur = { hand: 4, bow: 1.8, clap: 2.2, handsup: 1e9 }[type] || 2;
    this.action = { type, t: 0, dur };
    if (type === 'hand') this.showEmoji('✋', dur);
    if (type === 'clap') this.showEmoji('👏', dur);
  }

  update(dt, heightAt) {
    const r = this.root;
    // 이동
    let moving = false;
    if (this.target) {
      const dx = this.target.x - this.pos.x;
      const dz = this.target.z - this.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.06) {
        this.pos.x = this.target.x;
        this.pos.z = this.target.z;
        const reached = this.target;
        if (this.reroute && !reached.stair) {
          // 계단을 다 내려온/올라온 뒤에 새 목적지로 출발
          const r = this.reroute;
          this.reroute = null;
          this.target = null;
          this.path = [];
          r();
        } else if (this.path?.length) {
          this.target = this.path.shift();
        } else {
          this.target = null;
          this.onArrive?.();
        }
      } else {
        const step = this.frozen ? 0 : Math.min(dist, 4 * (this.speedMul || 1) * dt);
        this.pos.x += (dx / dist) * step;
        this.pos.z += (dz / dist) * step;
        this.faceAngle(Math.atan2(dx, dz), dt);
        moving = true;
      }
    }

    const groundY = this.sitChair ? this.sitChair.seatY - 0.5 * AVATAR_SCALE + 0.02 : heightAt(this.pos.x, this.pos.z, this.pos.y);
    // 계단에서는 바로 따라가고, 평지에서는 부드럽게
    const onStair = this.target?.stair;
    this.pos.y = onStair ? groundY : this.pos.y + (groundY - this.pos.y) * Math.min(1, dt * 12);
    r.position.copy(this.pos);
    if (this.jumpY) r.position.y += this.jumpY;
    if (this.sitChair) this.faceAngle(this.sitChair.ry, dt);

    // 걷는 동작
    if (this.forceMove) moving = true; // 놀이가 직접 위치를 움직일 때도 뛰는 동작
    this.speed += ((moving ? 1 : 0) - this.speed) * Math.min(1, dt * 8);
    this.walkPhase += dt * 9 * this.speed * (this.runSpeed ? 0.6 + this.runSpeed : 1);
    const swing = Math.sin(this.walkPhase) * 0.6 * this.speed;
    let legL = swing;
    let legR = -swing;
    let armLx = -swing * 0.8;
    let armRx = swing * 0.8;
    let armLz = -0.12;
    let armRz = 0.12;
    let bodyX = 0;
    let bob = Math.abs(Math.sin(this.walkPhase)) * 0.05 * this.speed;

    if (this.sitChair) {
      legL = legR = -Math.PI / 2;
      bob = 0;
    }

    // 동작(손들기/인사/박수)
    if (this.action) {
      const a = this.action;
      a.t += dt;
      const k = Math.min(1, a.t / 0.3, (a.dur - a.t) / 0.3); // 부드럽게 시작/끝
      if (a.type === 'hand') {
        armRx = -Math.PI * 0.95 * k + armRx * (1 - k);
        armRz = 0.12 + 0.15 * k;
        if (a.t > 0.3 && a.t < a.dur - 0.3) armRz += Math.sin(a.t * 6) * 0.08;
      } else if (a.type === 'handsup') {
        // 벌서기: 두 팔 번쩍
        armRx = armLx = -Math.PI * 0.95 * k;
        armLz = -0.12 - 0.1 * k;
        armRz = 0.12 + 0.1 * k;
      } else if (a.type === 'bow') {
        const p = Math.sin(Math.min(1, a.t / a.dur) * Math.PI);
        bodyX = 0.75 * p;
        armLx = armRx = -0.15 * p;
      } else if (a.type === 'clap') {
        const c = Math.abs(Math.sin(a.t * 11));
        armLx = armRx = -1.25 * k;
        armLz = -(0.12 + 0.45 * c) * k + 0.6 * k;
        armRz = (0.12 + 0.45 * c) * k - 0.6 * k;
      }
      if (a.t >= a.dur) this.action = null;
    }

    const ease = Math.min(1, dt * 14);
    const lerp = (o, key, v) => (o[key] += (v - o[key]) * ease);
    lerp(this.legL.rotation, 'x', legL);
    lerp(this.legR.rotation, 'x', legR);
    lerp(this.armL.rotation, 'x', armLx);
    lerp(this.armR.rotation, 'x', armRx);
    lerp(this.armL.rotation, 'z', armLz);
    lerp(this.armR.rotation, 'z', armRz);
    lerp(this.body.rotation, 'x', bodyX);
    this.body.position.y = 0.5 + bob;
    this.legL.position.y = this.legR.position.y = 0.5;

    // 말풍선/이모지 타이머
    if (this.bubble && (this.bubbleT -= dt) <= 0) this.clearBubble();
    if (this.emoji) {
      this.emojiT -= dt;
      this.emoji.position.y = 1.6 + Math.sin(this.emojiT * 4) * 0.05;
      if (this.emojiT <= 0) {
        this.root.remove(this.emoji);
        this.emoji.material.map.dispose();
        this.emoji = null;
      }
    }
  }

  faceAngle(target, dt) {
    let d = target - this.root.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.root.rotation.y += d * Math.min(1, dt * 10);
  }

  dispose() {
    this.root.traverse((o) => {
      if (o.isMesh) o.geometry.dispose();
      if (o.material) {
        o.material.map?.dispose();
        o.material.dispose();
      }
    });
    this.root.removeFromParent();
  }
}
