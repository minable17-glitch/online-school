// 시간대별 학교 밖·교문 풍경
// - 등교 시간: 교문지도 하는 학생부 선생님, 선도부, 복장 불량·지각으로 벌서는 학생들
// - 방과 후: 교문 밖에 병아리 장수, 떡볶이 포장마차, 뽑기(달고나) 할아버지
// 시간표(schedule.js)를 따르므로 모든 친구 화면에서 같은 때 나타남
import * as THREE from 'three';
import { Avatar } from './avatar.js';

const R = (a, b) => a + Math.random() * (b - a);

// 가게(방과 후) 손님이 할 수 있는 것
export const TREATS = [
  { emoji: '🐤', say: '병아리 샀다! 삐약삐약' },
  { emoji: '🍢', say: '떡볶이 맛있다!' },
  { emoji: '⭐', say: '뽑기 성공! 별 모양!' },
  { emoji: '💔', say: '아… 깨졌다' },
];

export function createEvents({ scene }) {
  const npcs = new Map(); // id → { avatar, spec }
  const props = new Map(); // id → THREE.Group

  // 등교 시간 사람들
  const MORNING = [
    {
      id: 'gate-teacher',
      name: '학생부 선생님',
      look: { outfit: 'gym', hair: 'buzz', hairColor: 'black', acc: 'none' },
      x: 67.2,
      z: 7.5,
      ry: Math.PI / 2,
      lines: ['명찰 어디 갔어?', '뛰지 말고 걸어 들어와라!', '지각이다, 지각!', '교복 단정히 입고!', '실내화 주머니 챙겼지?'],
    },
    { id: 'patrol1', name: '선도부', look: { outfit: 'navy', hair: 'short', hairColor: 'black', acc: 'none' }, x: 67.6, z: 5.0, ry: Math.PI / 2, lines: ['명찰 확인할게요~', '두발 검사 있어요!'], band: true },
    { id: 'patrol2', name: '선도부', look: { outfit: 'wine', hair: 'bob', hairColor: 'black', acc: 'none' }, x: 67.6, z: 10.2, ry: Math.PI / 2, lines: ['치마 길이 확인합니다~', '안녕하세요! 인사~'], band: true },
    { id: 'punish1', name: '복장 불량', look: { outfit: 'gymblue', hair: 'long', hairColor: 'brown', acc: 'cap' }, x: 55.5, z: 1.4, ry: 0, lines: ['체육복 입고 와서 걸렸어…', '팔 아파요…'], pose: 'handsup' },
    { id: 'punish2', name: '지각생', look: { outfit: 'green', hair: 'short', hairColor: 'dark', acc: 'none' }, x: 56.8, z: 1.4, ry: 0, lines: ['버스를 놓쳤어요…', '다신 지각 안 할게요!'], pose: 'handsup' },
    { id: 'punish3', name: '복장 불량', look: { outfit: 'navy', hair: 'pigtail', hairColor: 'gold', acc: 'none' }, x: 58.1, z: 1.4, ry: 0, lines: ['염색한 거 걸렸다…', '명찰 놓고 왔어요ㅠ'], pose: 'handsup' },
  ];

  // 방과 후 교문 밖 노점
  const AFTER = [
    {
      id: 'chick',
      name: '병아리 아저씨',
      look: { outfit: 'beige', hair: 'buzz', hairColor: 'black', acc: 'cap' },
      x: 72.4,
      z: 17.2,
      ry: Math.PI / 2,
      lines: ['병아리 한 마리 500원~', '삐약삐약 귀엽지?', '잘 키우면 닭 된다~'],
      treat: 0,
      button: '🐤 병아리 사기',
      prop: chickBox,
    },
    {
      id: 'tteok',
      name: '분식 아주머니',
      color: '#f2f2ee',
      look: { outfit: 'navy', hair: 'bun', hairColor: 'dark', acc: 'none' },
      x: 72.4,
      z: 23.2,
      ry: Math.PI / 2,
      lines: ['떡볶이 한 컵 500원!', '어묵 국물은 공짜야~', '맵게 해 줄까?'],
      treat: 1,
      button: '🍢 떡볶이 사 먹기',
      prop: tteokCart,
    },
    {
      id: 'ppopgi',
      name: '뽑기 할아버지',
      look: { outfit: 'suit', hair: 'buzz', hairColor: 'black', acc: 'glasses' },
      x: 72.4,
      z: -1.8,
      ry: Math.PI / 2,
      lines: ['별 모양 성공하면 하나 더~', '살살 해야 안 깨진다', '설탕 녹는 냄새 좋지?'],
      treat: 2,
      button: '🍭 뽑기 하기',
      prop: ppopgiStand,
    },
  ];

  function spawn(spec) {
    const a = new Avatar({ id: `ev-${spec.id}`, name: spec.name, look: spec.look, color: spec.color, occlude: true });
    a.pos.set(spec.x, 0, spec.z);
    a.root.rotation.y = spec.ry;
    if (spec.pose) a.play(spec.pose);
    if (spec.band) {
      // 선도부 완장
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.08, 10), new THREE.MeshStandardMaterial({ color: '#c8473d' }));
      band.position.y = -0.1;
      a.armL.add(band);
    }
    scene.add(a.root);
    npcs.set(spec.id, { avatar: a, spec, nextTalk: R(1, 5), greeted: false });
    if (spec.prop) {
      const g = spec.prop();
      g.position.set(spec.x + 1.0, 0, spec.z);
      scene.add(g);
      props.set(spec.id, g);
    }
  }

  let kind = null;
  // 0.3초마다
  // 교문지도 선생님·선도부와 교문 밖 노점은 시간에 상관없이 항상 있음
  function sync(period) {
    if (kind !== null) return;
    kind = period.kind;
    for (const spec of [...MORNING, ...AFTER]) spawn(spec);
  }

  // 매 프레임
  let t = 0;
  function update(dt, me, camPos) {
    t += dt;
    for (const n of npcs.values()) {
      const a = n.avatar;
      a.update(dt, () => 0);
      a.faceAngle(n.spec.ry, dt);
      if (camPos) a.tagHolder.visible = camPos.distanceTo(a.root.position) > 3.4;
      const d = Math.hypot(me.pos.x - a.pos.x, me.pos.z - a.pos.z);
      n.nextTalk -= dt;
      if (d < 6 && me.pos.y < 1) {
        if (!n.greeted) {
          n.greeted = true;
          a.say(n.spec.lines[0]);
          n.nextTalk = R(5, 8);
        } else if (n.nextTalk <= 0) {
          a.say(n.spec.lines[Math.floor(Math.random() * n.spec.lines.length)]);
          n.nextTalk = R(7, 12);
        }
      } else if (d > 10) n.greeted = false;
    }
    // 병아리 콩콩
    const box = props.get('chick');
    if (box) box.children.forEach((c, i) => c.userData.chick && (c.position.y = 0.62 + Math.abs(Math.sin(t * 6 + i)) * 0.04));
  }

  // 가까운 노점 (방과 후) → 버튼
  function nearVendor(me) {
    let best = null;
    let bd = 2.8;
    for (const n of npcs.values()) {
      if (n.spec.treat == null) continue;
      const d = Math.hypot(me.pos.x - (n.spec.x + 1.0), me.pos.z - n.spec.z);
      if (d < bd) {
        bd = d;
        best = n;
      }
    }
    return best;
  }

  return { sync, update, nearVendor, npcs };
}

// ── 노점 소품 ──
function mat(c, extra) {
  return new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...extra });
}
function chickBox() {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.7), mat('#b8915c'));
  box.position.y = 0.25;
  g.add(box);
  const inner = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 0.6), mat('#d8c39a'));
  inner.position.y = 0.5;
  g.add(inner);
  for (let i = 0; i < 9; i++) {
    const c = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), mat('#ffd84a'));
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), mat('#ffd84a'));
    head.position.set(0.05, 0.06, 0);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.04, 6), mat('#f08a24'));
    beak.rotation.z = -Math.PI / 2;
    beak.position.set(0.1, 0.06, 0);
    c.add(body, head, beak);
    c.position.set(-0.3 + (i % 3) * 0.3, 0.62, -0.2 + Math.floor(i / 3) * 0.2);
    c.rotation.y = i * 1.3;
    c.userData.chick = true;
    g.add(c);
  }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.25), new THREE.MeshBasicMaterial({ map: signTex('병아리 500원') }));
  sign.position.set(0.46, 0.3, 0);
  sign.rotation.y = Math.PI / 2;
  g.add(sign);
  return g;
}
function tteokCart() {
  const g = new THREE.Group();
  const cart = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.9, 1.8), mat('#d9d2bf'));
  cart.position.y = 0.45;
  g.add(cart);
  const pan = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 1.2), mat('#2b2b2b', { metalness: 0.6 }));
  pan.position.y = 0.94;
  g.add(pan);
  for (let i = 0; i < 18; i++) {
    const tk = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.16, 6), mat('#d8372a'));
    tk.rotation.z = Math.PI / 2;
    tk.rotation.y = i;
    tk.position.set(-0.25 + (i % 4) * 0.16, 1.0, -0.45 + Math.floor(i / 4) * 0.22);
    g.add(tk);
  }
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.25, 14), mat('#c9cdd0', { metalness: 0.6 }));
  pot.position.set(0, 1.03, 0.6);
  g.add(pot);
  for (const [px, pz] of [[-0.45, -0.85], [0.45, -0.85], [-0.45, 0.85], [0.45, 0.85]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.4, 6), mat('#8d9298'));
    pole.position.set(px, 1.6, pz);
    g.add(pole);
  }
  const tarp = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 2.1), mat('#e26a2c'));
  tarp.position.y = 2.32;
  g.add(tarp);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.35), new THREE.MeshBasicMaterial({ map: signTex('떡볶이 · 어묵') }));
  sign.position.set(0.51, 0.55, 0);
  sign.rotation.y = Math.PI / 2;
  g.add(sign);
  return g;
}
function ppopgiStand() {
  const g = new THREE.Group();
  const table = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 1.0), mat('#7a5434'));
  table.position.y = 0.3;
  g.add(table);
  const stove = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.12, 14), mat('#4a6fa0', { metalness: 0.4 }));
  stove.position.set(0, 0.66, -0.2);
  g.add(stove);
  const ladle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.04, 12), mat('#c9cdd0', { metalness: 0.7 }));
  ladle.position.set(0, 0.75, -0.2);
  g.add(ladle);
  for (let i = 0; i < 4; i++) {
    const cookie = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.012, 16), mat('#d9a441'));
    cookie.position.set(-0.2 + (i % 2) * 0.25, 0.61, 0.15 + Math.floor(i / 2) * 0.2);
    g.add(cookie);
  }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.25), new THREE.MeshBasicMaterial({ map: signTex('뽑기 300원') }));
  sign.position.set(0.41, 0.35, 0);
  sign.rotation.y = Math.PI / 2;
  g.add(sign);
  return g;
}
function signTex(text) {
  const c = document.createElement('canvas');
  c.width = 320;
  c.height = 90;
  const g = c.getContext('2d');
  g.fillStyle = '#fff6d6';
  g.fillRect(0, 0, 320, 90);
  g.strokeStyle = '#c8473d';
  g.lineWidth = 6;
  g.strokeRect(3, 3, 314, 84);
  g.fillStyle = '#c8473d';
  g.font = "700 46px 'Apple SD Gothic Neo','Noto Sans KR',sans-serif";
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 160, 48);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

