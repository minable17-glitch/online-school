// 🍚 옥상 비빔밥: 학교 곳곳에서 재료 5가지를 모아 옥상에서 비벼 먹기
// 재료: 🥬 상추(뒷마당 텃밭) · 🥚 계란(옥상 닭장) · 🍚 밥(급식) · 🌶️ 고추장(가정실 가정 선생님) · 🥣 양푼(매점)
// 기기에 저장. 다 만들면 '비빔밥 달인' 칭호, 근처 친구에게 나눠 주기
import * as THREE from 'three';
import { levelY, ROOF, textTex } from './world.js';

export const ITEMS = {
  lettuce: { icon: '🥬', name: '상추', where: '뒷마당 텃밭에서 따기' },
  egg: { icon: '🥚', name: '계란', where: '옥상 닭장 (닭이 낳음)' },
  rice: { icon: '🍚', name: '밥', where: '점심시간 급식 받을 때 한 공기 더' },
  gochujang: { icon: '🌶️', name: '고추장', where: '가정실 가정 선생님께 (수업 시간)' },
  bowl: { icon: '🥣', name: '양푼', where: '매점에서 사기' },
};
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};
const dayKey = () => Math.floor(Date.now() / 1000 / 1800);

export function createBibimbap({ scene, me, store, hint, getAmbience, send, others }) {
  const load = () => {
    try {
      return JSON.parse(store.get('school.bibim') || '{}');
    } catch {
      return {};
    }
  };
  let bag = load(); // { lettuce: n, egg: n, rice: n, gochujang: n, bowl: n, made: n, lettuceDay, riceDay, gochuDay }
  const save = () => store.set('school.bibim', JSON.stringify(bag));
  const count = (k) => bag[k] | 0;
  const add = (k, n = 1) => {
    bag[k] = count(k) + n;
    save();
  };
  const ready = () => Object.keys(ITEMS).every((k) => count(k) > 0);

  // ── 재료 가방 pill (들고 있는 재료 표시) ──
  const pill = el('button', 'pill bibim-pill hidden');
  pill.type = 'button';
  document.body.append(pill);
  const renderPill = () => {
    const have = Object.entries(ITEMS).filter(([k]) => count(k) > 0).map(([, v]) => v.icon).join('');
    pill.textContent = `🍚 ${have || '재료 모으기'}${ready() ? ' · 옥상으로!' : ''}`;
    pill.classList.toggle('ready', ready());
  };
  pill.addEventListener('click', () => openSheet());

  // ── 안내 시트 ──
  const sheet = el('div', 'sheet hidden');
  const card = el('div', 'sheet-card');
  sheet.append(card);
  document.body.append(sheet);
  sheet.addEventListener('click', (e) => e.target === sheet && sheet.classList.add('hidden'));
  function openSheet() {
    card.innerHTML = `<h2>🍚 옥상 비빔밥</h2><p>재료 5가지를 모아 옥상에서 비벼 먹어요${bag.made ? ` · 지금까지 ${bag.made}그릇` : ''}</p>`;
    const ul = el('ul', 'bibim-list');
    for (const [k, v] of Object.entries(ITEMS)) {
      const n = count(k);
      ul.append(el('li', n ? 'have' : '', `<span class="bi">${v.icon}</span><b>${v.name}</b><small>${n ? `${n}개 있음` : v.where}</small>${n ? '<span class="ok">✓</span>' : ''}`));
    }
    const tip = el('p', 'tip', ready() ? '재료가 다 모였어요! 옥상 버너 옆에서 🍚 비빔밥 만들기' : '재료는 게임 속 하루(30분)에 한 번씩 구할 수 있는 것도 있어요');
    const close = el('button', 'close', '닫기');
    close.type = 'button';
    close.addEventListener('click', () => sheet.classList.add('hidden'));
    card.append(ul, tip, close);
    sheet.classList.remove('hidden');
  }

  // ── 옥상 조리 자리 (휴대용 버너 + 양푼 + 돗자리) ──
  const COOK = { x: -30, y: levelY(ROOF), z: -5 };
  {
    const g = new THREE.Group();
    const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...o });
    const matMesh = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.02, 2.0), mat('#4f7fb0'));
    matMesh.position.y = 0.01;
    g.add(matMesh);
    for (let i = 0; i < 6; i++) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.022, 0.08), mat(i % 2 ? '#e8e8e8' : '#d94a4a'));
      stripe.position.set(0, 0.012, -0.9 + i * 0.36);
      g.add(stripe);
    }
    const burner = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.36), mat('#2b2b2b', { metalness: 0.4 }));
    burner.position.set(0, 0.08, 0);
    g.add(burner);
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 10).rotateX(Math.PI / 2), mat('#e04a3a'));
    knob.position.set(0.18, 0.08, 0.19);
    g.add(knob);
    const gas = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 10).rotateZ(Math.PI / 2), mat('#f2c230'));
    gas.position.set(-0.32, 0.06, 0);
    g.add(gas);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.2, 0.14, 20, 1, true), mat('#d9dde0', { metalness: 0.8, roughness: 0.25, side: THREE.DoubleSide }));
    bowl.position.set(0, 0.21, 0);
    g.add(bowl);
    const bowlBottom = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 20), mat('#d9dde0', { metalness: 0.8, roughness: 0.25 }));
    bowlBottom.position.set(0, 0.15, 0);
    g.add(bowlBottom);
    const spoons = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.015, 0.12), mat('#c9cdd0', { metalness: 0.7 }));
    spoons.position.set(0.5, 0.03, 0.4);
    g.add(spoons);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.3), new THREE.MeshBasicMaterial({ map: textTex(300, 90, '#fff8dc', '#c0392b', ['옥상 비빔밥 자리'], 34, '#7a5532'), side: THREE.DoubleSide }));
    sign.position.set(0, 0.9, -1.1);
    g.add(sign);
    g.position.set(COOK.x, COOK.y, COOK.z);
    scene.add(g);
  }
  const nearCook = () => Math.abs(me.pos.y - COOK.y) < 1 && Math.hypot(me.pos.x - COOK.x, me.pos.z - COOK.z) < 2.6;

  // ── 재료 얻기 (다른 모듈에서 호출) ──
  const ding = () => getAmbience()?.ding?.();
  function gain(k, msg) {
    add(k);
    renderPill();
    ding();
    me.showEmoji(ITEMS[k].icon, 4);
    hint(msg || `${ITEMS[k].icon} ${ITEMS[k].name}을(를) 얻었어요 (${count(k)}개)`, 2500);
    if (ready()) setTimeout(() => hint('🍚 재료가 다 모였어요! 옥상 비빔밥 자리로 가요', 3000), 2600);
  }
  // 텃밭: 하루 2번
  function pickLettuce() {
    const d = dayKey();
    if (bag.lettuceDay !== d) {
      bag.lettuceDay = d;
      bag.lettuceN = 0;
    }
    if ((bag.lettuceN | 0) >= 2) return hint('오늘은 상추를 다 땄어요. 다음 하루(30분 뒤)에 또 자라요', 2500);
    bag.lettuceN = (bag.lettuceN | 0) + 1;
    me.play('bow');
    gain('lettuce', `🥬 상추를 땄어요 (오늘 ${bag.lettuceN}/2)`);
  }
  // 급식: 하루 1번 밥 한 공기 더
  function takeRice() {
    const d = dayKey();
    if (bag.riceDay === d) return false;
    bag.riceDay = d;
    gain('rice', '🍚 밥 한 공기를 더 담았어요 (비빔밥용)');
    return true;
  }
  // 가정 선생님: 하루 1번
  function askGochujang(teacherAvatar) {
    const d = dayKey();
    if (bag.gochuDay === d) {
      teacherAvatar?.say('오늘은 벌써 줬잖니~ 내일 또 오렴');
      return;
    }
    bag.gochuDay = d;
    teacherAvatar?.say('비빔밥 해 먹게? 고추장 한 숟갈 줄게~');
    gain('gochujang', '🌶️ 가정 선생님께 고추장을 받았어요');
  }
  // 매점 양푼 (한 번만)
  function buyBowl() {
    if (count('bowl')) return hint('양푼은 이미 있어요', 1500);
    gain('bowl', '🥣 양푼을 샀어요');
  }
  // 닭장 계란 → 가방
  function takeEgg(n) {
    if (n <= 0) return;
    add('egg', n);
    renderPill();
    ding();
    me.showEmoji('🥚', 4);
    hint(`🥚 계란 ${n}개를 가방에 담았어요`, 2500);
  }

  // ── 옥상에서 만들기 ──
  const cookBtn = el('button', 'pill shop-btn bibim-cook hidden', '🍚 비빔밥 만들기');
  cookBtn.type = 'button';
  document.body.append(cookBtn);
  let cooking = false;
  cookBtn.addEventListener('click', () => {
    if (cooking) return;
    if (!ready()) return openSheet();
    cooking = true;
    cookBtn.classList.add('hidden');
    me.target = null;
    me.path = [];
    const steps = ['🥣 양푼에 밥 담고…', '🥬 상추 쭉쭉 찢어 넣고…', '🥚 계란 프라이 올리고…', '🌶️ 고추장 한 숟갈!', '🥄 슥슥 비비기~'];
    let i = 0;
    const tick = () => {
      if (i < steps.length) {
        me.say(steps[i]);
        me.play(i === 4 ? 'clap' : 'hand');
        ding();
        i++;
        setTimeout(tick, 1500);
        return;
      }
      for (const k of Object.keys(ITEMS)) if (k !== 'bowl') bag[k] = count(k) - 1; // 양푼은 남음
      bag.made = (bag.made | 0) + 1;
      save();
      renderPill();
      cooking = false;
      me.showEmoji('🍚', 30);
      me.say('옥상 비빔밥 완성! 같이 먹자~');
      // 근처 친구들에게 나눠 주기
      const near = [...others.values()].filter((o) => Math.abs(o.avatar.pos.y - COOK.y) < 1 && Math.hypot(o.avatar.pos.x - me.pos.x, o.avatar.pos.z - me.pos.z) < 8);
      send('act', { type: 'bibim', n: bag.made });
      const title = bag.made >= 5 ? '👑 비빔밥 달인' : bag.made >= 3 ? '🍳 비빔밥 요리사' : '🥄 첫 비빔밥';
      store.set('school.title', bag.made >= 3 ? title : '');
      const lines = [`지금까지 <b>${bag.made}그릇</b>`, near.length ? `근처 친구 ${near.length}명과 나눠 먹었어요 🍚` : '혼자 먹어도 맛있다~ 친구를 불러 보세요', bag.made === 3 ? '🍳 <b>비빔밥 요리사</b> 칭호를 얻었어요!' : bag.made === 5 ? '👑 <b>비빔밥 달인</b> 칭호를 얻었어요!' : bag.made < 5 ? `${5 - bag.made}그릇 더 만들면 👑 달인` : ''].filter(Boolean);
      card.innerHTML = `<div class="result-emoji">🍚</div><h2>옥상 비빔밥 완성!</h2>${lines.map((l) => `<p>${l}</p>`).join('')}`;
      const close = el('button', 'close done', '잘 먹겠습니다!');
      close.type = 'button';
      close.addEventListener('click', () => sheet.classList.add('hidden'));
      card.append(close);
      sheet.classList.remove('hidden');
    };
    tick();
  });

  // 친구가 만든 비빔밥 (받는 쪽)
  function receive(a, avatar) {
    if (a.type !== 'bibim' || !avatar) return false;
    avatar.showEmoji('🍚', 20);
    avatar.say('옥상 비빔밥 완성! 같이 먹자~');
    if (Math.abs(me.pos.y - COOK.y) < 1 && Math.hypot(avatar.pos.x - me.pos.x, avatar.pos.z - me.pos.z) < 8) {
      me.showEmoji('🍚', 15);
      me.say('잘 먹겠습니다! 🥄');
      hint(`${avatar.name}님이 만든 비빔밥을 같이 먹었어요`, 3000);
    }
    return true;
  }

  renderPill();
  let t = 0;
  return {
    ITEMS,
    pickLettuce,
    takeRice,
    askGochujang,
    buyBowl,
    takeEgg,
    receive,
    count,
    ready,
    title: () => store.get('school.title') || '',
    update(dt) {
      t += dt;
      if (t < 0.3) return;
      t = 0;
      const any = Object.keys(ITEMS).some((k) => count(k) > 0);
      pill.classList.toggle('hidden', !any && !bag.made);
      cookBtn.classList.toggle('hidden', !(nearCook() && !cooking));
      cookBtn.textContent = ready() ? '🍚 비빔밥 만들기' : '🍚 재료 보기';
    },
  };
}
