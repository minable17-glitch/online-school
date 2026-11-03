// 학교 놀이들
// - 🏃 운동장 달리기: 트랙 한 바퀴 기록 (체크포인트 4개 돌기), 최고 기록 저장
// - 🏃 멀리뛰기: 도움닫기 후 타이밍 맞춰 뛰기
// - 🕵️ 교문 몰래 들어가기: 선도부·학생부 선생님의 시야(레이더)를 피해 현관까지
// - 🗺️ 보물찾기: 게임 속 하루마다 학교 곳곳에 숨은 쪽지 3장
// - 🐤 병아리 키우기: 산 병아리가 옥상 닭장에서 자라고 계란을 낳음
// - 🧊 얼음땡 (단체): 술래 NPC 한 명이 운동장을 뛰어다님, 잡히면 얼음, 친구가 '땡' 해 주면 풀림
// - 🏐 피구 (단체): 운동장 코트 안에서 날아오는 공 피하기, 오래 버티기
import * as THREE from 'three';
import { PITCH, FIELD_Y, FIELD_Z, GATE, OUT, ENTRY, levelY, ROOF, BX, Z_BACK, textTex } from './world.js';
import { Avatar } from './avatar.js';
import { schoolNow } from './schedule.js';

const R = (a, b) => a + Math.random() * (b - a);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};
const mmss = (sec) => `${Math.floor(sec / 60)}:${String((sec % 60).toFixed(2)).padStart(5, '0')}`;

export function createGames({ scene, me, world, store, hint, getAmbience, onAct, isTeacher }) {
  const ambience = { ding: () => getAmbience()?.ding?.(), rimHit: (v) => getAmbience()?.rimHit?.(v) };
  // ── 공통 HUD: 진행 중 게임 pill + 그만두기 ──
  const hud = el('div', 'game-hud hidden');
  const hudText = el('span', 'game-hud-text', '');
  const quitBtn = el('button', 'game-hud-quit', '✕');
  quitBtn.type = 'button';
  hud.append(hudText, quitBtn);
  document.body.append(hud);
  // 놀이 고르기 버튼 + 시트
  const playBtn = el('button', 'pill shop-btn play-btn hidden', '🎲 놀이하기');
  playBtn.type = 'button';
  document.body.append(playBtn);
  const sheet = el('div', 'sheet hidden');
  const card = el('div', 'sheet-card');
  card.append(el('h2', null, '여기서 할 수 있는 놀이'), el('p', null, '하나 골라 보세요'));
  const list = el('div', 'play-list');
  const close = el('button', 'close', '닫기');
  close.type = 'button';
  card.append(list, close);
  sheet.append(card);
  document.body.append(sheet);
  close.addEventListener('click', () => sheet.classList.add('hidden'));
  sheet.addEventListener('click', (e) => e.target === sheet && sheet.classList.add('hidden'));
  playBtn.addEventListener('click', () => {
    list.innerHTML = '';
    for (const g of available()) {
      const b = el('button', 'play-item', `<span class="ico">${g.icon}</span><b>${g.name}</b><small>${g.desc}</small>`);
      b.type = 'button';
      b.addEventListener('click', () => {
        sheet.classList.add('hidden');
        g.start();
      });
      list.append(b);
    }
    sheet.classList.remove('hidden');
  });

  let active = null; // { name, update(dt), stop(), hudText() }
  const startGame = (g) => {
    stopGame(true);
    active = g;
    hud.classList.remove('hidden');
    playBtn.classList.add('hidden');
  };
  const stopGame = (silent) => {
    if (!active) return;
    const g = active;
    active = null;
    hud.classList.add('hidden');
    g.stop?.(silent);
  };
  quitBtn.addEventListener('click', () => {
    hint('놀이를 그만뒀어요');
    stopGame(true);
  });

  const best = (k) => Number(store.get(`school.best.${k}`)) || 0;
  const setBest = (k, v) => store.set(`school.best.${k}`, String(v));

  // 결과 시트
  const resultSheet = el('div', 'sheet hidden');
  const resultCard = el('div', 'sheet-card result-card');
  resultSheet.append(resultCard);
  document.body.append(resultSheet);
  const showResult = (title, lines, emoji = '🎉') => {
    resultCard.innerHTML = `<div class="result-emoji">${emoji}</div><h2>${title}</h2>${lines.map((l) => `<p>${l}</p>`).join('')}`;
    const ok = el('button', 'close done', '확인');
    ok.type = 'button';
    ok.addEventListener('click', () => resultSheet.classList.add('hidden'));
    resultCard.append(ok);
    resultSheet.classList.remove('hidden');
  };

  // ── 체크포인트 깃발 (달리기·보물 공용) ──
  const flagMat = new THREE.MeshStandardMaterial({ color: '#ff5a36', side: THREE.DoubleSide });
  const makeFlag = (x, y, z, color = '#ff5a36') => {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6), new THREE.MeshStandardMaterial({ color: '#dddddd' }));
    pole.position.y = 0.8;
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.35), color === '#ff5a36' ? flagMat : new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide }));
    flag.position.set(0.25, 1.4, 0);
    g.add(pole, flag);
    g.position.set(x, y, z);
    scene.add(g);
    return g;
  };

  // ════════════════════════════════════════════════
  // 🏃 운동장 달리기 (트랙 한 바퀴)
  // ════════════════════════════════════════════════
  const TRACK = [
    { x: 0, z: PITCH.minZ + 3 },
    { x: PITCH.maxX - 6, z: (PITCH.minZ + PITCH.maxZ) / 2 },
    { x: 0, z: PITCH.maxZ - 3 },
    { x: PITCH.minX + 6, z: (PITCH.minZ + PITCH.maxZ) / 2 },
  ];
  function startRun() {
    const flags = [];
    let next = 1;
    let t = 0;
    let countdownStart = 0;
    let started = false;
    const start = TRACK[0];
    const startPos = () => Math.hypot(me.pos.x - start.x, me.pos.z - start.z) < 2.5;
    flags.push(makeFlag(start.x, FIELD_Y, start.z, '#2fd36b'));
    for (let i = 1; i < TRACK.length; i++) flags.push(makeFlag(TRACK[i].x, FIELD_Y, TRACK[i].z));
    hint('초록 깃발에서 출발해요! 빨간 깃발을 차례로 돌고 돌아오기', 3000);
    me.speedMul = 1.35; // 달리기 중엔 빠르게
    startGame({
      name: 'run',
      update(dt) {
        if (!started) {
          if (!startPos()) {
            hudText.textContent = '🏃 초록 깃발로 가세요';
            return;
          }
          if (!countdownStart) countdownStart = performance.now();
          const countdown = 3 - (performance.now() - countdownStart) / 1000;
          hudText.textContent = countdown > 0 ? `🏃 ${Math.ceil(countdown)}…` : '🏃 출발!';
          if (countdown <= 0) {
            started = true;
            ambience.ding();
          }
          return;
        }
        t += dt;
        const target = TRACK[next % TRACK.length];
        if (Math.hypot(me.pos.x - target.x, me.pos.z - target.z) < 2.5) {
          flags[next % TRACK.length].visible = false;
          next++;
          ambience.ding();
          if (next > TRACK.length) {
            const b = best('run');
            const rec = !b || t < b;
            if (rec) setBest('run', t);
            me.say(rec ? '신기록이다! 🏃' : '휴, 다 뛰었다~');
            onAct?.('run', Math.round(t * 100) / 100);
            showResult('달리기 완주!', [`기록 <b>${mmss(t)}</b>`, rec ? '🏅 내 최고 기록 경신!' : `최고 기록 ${mmss(b)}`], '🏃');
            stopGame();
            return;
          }
        }
        hudText.textContent = `🏃 ${mmss(t)} · ${next}/${TRACK.length} 깃발`;
      },
      stop() {
        me.speedMul = 1;
        for (const f of flags) scene.remove(f);
      },
    });
  }

  // ════════════════════════════════════════════════
  // 🏃 멀리뛰기 (타이밍 게임)
  // ════════════════════════════════════════════════
  const JUMP = { runStart: { x: 65, z: 21 }, board: { x: 58.3, z: 21 }, pitX: 50 };
  function startJump() {
    let phase = 'go'; // go → run → fly → done
    let power = 0;
    let dir = 1;
    let lastT = performance.now();
    let flyT = 0;
    let from = null;
    let dist = 0;
    const bar = el('div', 'jump-bar');
    const fill = el('div', 'jump-fill');
    bar.append(fill);
    document.body.append(bar);
    const tap = () => {
      if (phase !== 'run') return;
      phase = 'fly';
      from = { x: me.pos.x, z: me.pos.z };
      dist = 2.2 + power * 5.3; // 2.2 ~ 7.5m
      flyT = 0;
      me.target = null;
      me.path = [];
      me.play('hand');
    };
    bar.addEventListener('pointerdown', tap);
    hint('도움닫기 끝에서 게이지가 꽉 찰 때 막대를 눌러요!', 3000);
    startGame({
      name: 'jump',
      update(dt) {
        if (phase === 'go') {
          hudText.textContent = '🏃 도움닫기 시작점(콘크리트 길 끝)으로 가세요';
          if (Math.hypot(me.pos.x - JUMP.runStart.x, me.pos.z - JUMP.runStart.z) < 2) {
            phase = 'run';
            bar.classList.add('show');
            me.target = { x: JUMP.board.x - 0.5, z: JUMP.board.z };
            me.path = [];
            me.speedMul = 1.6;
          }
          return;
        }
        if (phase === 'run') {
          const rdt = Math.min(0.1, (performance.now() - lastT) / 1000);
          lastT = performance.now();
          power += dir * rdt * 1.6;
          if (power > 1) {
            power = 1;
            dir = -1;
          } else if (power < 0) {
            power = 0;
            dir = 1;
          }
          fill.style.width = `${power * 100}%`;
          fill.style.background = power > 0.85 ? '#2fd36b' : power > 0.6 ? '#f2c230' : '#e8584f';
          hudText.textContent = '🏃 지금! 막대를 눌러요';
          if (!me.target && Math.abs(me.pos.x - (JUMP.board.x - 0.5)) < 0.3) {
            // 구름판에 도착했는데 안 눌렀으면 그냥 밟고 넘어감 (실격)
            hint('구름판을 그냥 밟았어요… 다시!', 2000);
            phase = 'go';
            bar.classList.remove('show');
            me.speedMul = 1;
          }
          return;
        }
        if (phase === 'fly') {
          me.target = null;
          me.path = [];
          flyT += dt;
          const dur = 0.8;
          const k = Math.min(1, flyT / dur);
          me.pos.x = from.x - dist * k;
          me.pos.z = from.z;
          me.jumpY = Math.sin(k * Math.PI) * 1.4;
          if (k >= 1) {
            me.jumpY = 0;
            const landed = Math.max(0, from.x - me.pos.x - (from.x - JUMP.board.x));
            const m = Math.round(landed * 100) / 100;
            const b = best('jump');
            const rec = m > b;
            if (rec) setBest('jump', m);
            me.say(rec ? `${m}m! 신기록!` : `${m}m 뛰었다~`);
            onAct?.('jump', m);
            showResult('멀리뛰기', [`<b>${m} m</b>`, rec ? '🏅 내 최고 기록 경신!' : `최고 기록 ${b} m`], '🦘');
            stopGame();
          }
        }
      },
      stop() {
        me.speedMul = 1;
        me.jumpY = 0;
        bar.remove();
      },
    });
  }

  // ════════════════════════════════════════════════
  // 🕵️ 교문 몰래 들어가기 (레이더 피하기)
  // ════════════════════════════════════════════════
  // 감시자: 학생부 선생님 + 선도부 2명이 교문~현관 사이를 돌아다니며 부채꼴 시야로 봄
  function startSneak() {
    const guards = [];
    const cones = [];
    const specs = [
      { name: '학생부 선생님', look: { outfit: 'gym', hair: 'buzz', hairColor: 'black', acc: 'none' }, path: [{ x: 62, z: 8.5 }, { x: 50, z: 8.5 }, { x: 50, z: 2 }, { x: 62, z: 2 }], speed: 1.6, fov: 0.9, range: 7 },
      { name: '선도부', look: { outfit: 'navy', hair: 'short', hairColor: 'black', acc: 'none' }, path: [{ x: 40, z: 4 }, { x: 25, z: 4 }, { x: 25, z: 11 }, { x: 40, z: 11 }], speed: 1.9, fov: 0.75, range: 6 },
      { name: '선도부', look: { outfit: 'wine', hair: 'bob', hairColor: 'black', acc: 'none' }, path: [{ x: 16, z: 9 }, { x: 8, z: 3 }, { x: 16, z: 1.5 }, { x: 22, z: 6 }], speed: 2.1, fov: 0.75, range: 6 },
    ];
    for (const sp of specs) {
      const a = new Avatar({ id: `guard-${Math.random()}`, name: sp.name, look: sp.look, occlude: true });
      a.pos.set(sp.path[0].x, 0, sp.path[0].z);
      scene.add(a.root);
      const cone = new THREE.Mesh(
        new THREE.CircleGeometry(sp.range, 24, -sp.fov, sp.fov * 2),
        new THREE.MeshBasicMaterial({ color: '#ffd23a', transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
      );
      cone.rotation.x = -Math.PI / 2;
      cone.position.y = 0.05;
      scene.add(cone);
      cones.push(cone);
      guards.push({ a, sp, i: 1, blink: 0 });
    }
    let t = 0;
    let caught = 0;
    const goal = { x: 0, z: ENTRY.depth + 1 };
    const startX = OUT.wall + 3;
    let phase = me.pos.x > OUT.wall ? 'play' : 'go';
    hint(phase === 'go' ? '먼저 교문 밖 등굣길로 나가세요' : '노란 시야를 피해서 중앙현관까지! 들키면 다시 교문으로', 3200);
    startGame({
      name: 'sneak',
      update(dt) {
        t += dt;
        for (const g of guards) {
          const { a, sp } = g;
          const tgt = sp.path[g.i];
          const dx = tgt.x - a.pos.x;
          const dz = tgt.z - a.pos.z;
          const d = Math.hypot(dx, dz);
          if (d < 0.3) g.i = (g.i + 1) % sp.path.length;
          else {
            a.pos.x += (dx / d) * sp.speed * dt;
            a.pos.z += (dz / d) * sp.speed * dt;
            a.faceAngle(Math.atan2(dx, dz), dt * 3);
          }
          // 가끔 멈춰서 두리번
          g.blink -= dt;
          if (g.blink < 0) {
            g.blink = R(3, 7);
            a.say(['흠…', '거기 누구야?', '뛰지 마라~', '명찰!'][Math.floor(Math.random() * 4)]);
          }
          a.update(dt, world.heightAt);
          const cone = cones[guards.indexOf(g)];
          cone.position.set(a.pos.x, a.pos.y + 0.05, a.pos.z);
          cone.rotation.z = -a.root.rotation.y + Math.PI / 2;
        }
        if (phase === 'go') {
          hudText.textContent = '🕵️ 교문 밖으로 나가서 시작';
          if (me.pos.x > OUT.wall) {
            phase = 'play';
            t = 0;
            hint('시작! 노란 시야를 피해 현관까지', 2000);
          }
          return;
        }
        // 들켰나?
        if (me.pos.x < OUT.wall && me.pos.x > -8) {
          for (const g of guards) {
            const { a, sp } = g;
            const dx = me.pos.x - a.pos.x;
            const dz = me.pos.z - a.pos.z;
            const d = Math.hypot(dx, dz);
            if (d > sp.range) continue;
            const ang = Math.atan2(dx, dz);
            let diff = Math.abs(ang - a.root.rotation.y);
            diff = Math.min(diff, Math.PI * 2 - diff);
            if (diff < sp.fov) {
              caught++;
              a.say('야! 거기 서!');
              me.say('앗, 들켰다!');
              me.showEmoji('💦', 3);
              ambience.rimHit(1);
              hint(`들켰어요! 교문 밖에서 다시 (${caught}번째)`, 2200);
              me.target = null;
              me.path = [];
              me.pos.set(startX, 0, (GATE.z1 + GATE.z2) / 2);
              return;
            }
          }
        }
        if (Math.hypot(me.pos.x - goal.x, me.pos.z - goal.z) < 3) {
          const score = Math.max(0, Math.round(100 - t - caught * 15));
          const b = best('sneak');
          const rec = score > b;
          if (rec) setBest('sneak', score);
          me.say('무사히 들어왔다! 😎');
          onAct?.('sneak', score);
          showResult('몰래 들어가기 성공!', [`걸린 시간 ${mmss(t)} · 들킨 횟수 ${caught}번`, `점수 <b>${score}</b>${rec ? ' 🏅 신기록' : ` (최고 ${b})`}`], '🕵️');
          stopGame();
          return;
        }
        hudText.textContent = `🕵️ ${mmss(t)} · 들킴 ${caught}`;
      },
      stop() {
        for (const g of guards) g.a.dispose();
        for (const c of cones) scene.remove(c);
      },
    });
  }

  // ════════════════════════════════════════════════
  // 🗺️ 보물찾기 (하루마다 쪽지 3장)
  // ════════════════════════════════════════════════
  const SPOTS = [
    { x: -13, y: 0, z: 9.5, hint: '세종대왕님 발밑' },
    { x: 13, y: 0, z: 9.5, hint: '이순신 장군 발밑' },
    { x: -39, y: 0, z: 6, hint: '등나무 쉼터 벤치 아래' },
    { x: 54, y: FIELD_Y, z: 33, hint: '정글짐 안' },
    { x: 0, y: 1.4, z: 13, hint: '구령대 위' },
    { x: -57, y: 0, z: -7, hint: '수돗가 옆' },
    { x: -57, y: 0, z: -22, hint: '매점 앞 벤치' },
    { x: 20, y: 0, z: -22, hint: '급식실 가는 통로' },
    { x: -26, y: 0, z: -24, hint: '자전거 보관대' },
    { x: 0, y: levelY(ROOF), z: -5, hint: '옥상 가운데' },
    { x: 0, y: levelY(0), z: -5, hint: '중앙현관 로비' },
    { x: -44, y: levelY(1), z: -11.5, hint: '2층 서쪽 계단 앞' },
    { x: 0, y: levelY(2), z: -5, hint: '도서실' },
    { x: 60, y: 0, z: -6, hint: '교직원 주차장' },
    { x: 55, y: 0, z: -37, hint: '텃밭 끝' },
  ];
  const dayKey = () => Math.floor(Date.now() / 1000 / 1800);
  const hashDay = (d, i) => ((d * 7919 + i * 104729) % 1000003) % SPOTS.length;
  function todaySpots() {
    const d = dayKey();
    const idx = new Set();
    let i = 0;
    while (idx.size < 3) idx.add(hashDay(d, i++));
    return [...idx].map((k) => SPOTS[k]);
  }
  let treasure = null; // { day, found:Set, meshes }
  const noteMat = new THREE.MeshStandardMaterial({ color: '#fff3a8', side: THREE.DoubleSide, emissive: '#6a5a10', emissiveIntensity: 0.4 });
  function ensureTreasure() {
    const d = dayKey();
    if (treasure && treasure.day === d) return treasure;
    if (treasure) for (const m of treasure.meshes) scene.remove(m);
    const found = new Set(JSON.parse(store.get(`school.treasure.${d}`) || '[]'));
    const meshes = todaySpots().map((s, i) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.2), noteMat);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = i;
      m.position.set(s.x, s.y + 0.04, s.z);
      m.visible = !found.has(i);
      scene.add(m);
      return m;
    });
    treasure = { day: d, found, meshes, spots: todaySpots() };
    return treasure;
  }
  function startTreasure() {
    const tr = ensureTreasure();
    if (tr.found.size >= 3) {
      showResult('오늘 보물은 다 찾았어요', ['다음 하루(30분 뒤)에 새 쪽지가 숨겨져요'], '🗺️');
      return;
    }
    const hints = tr.spots.map((s, i) => (tr.found.has(i) ? `✅ ${s.hint}` : `❓ ${s.hint}`));
    showResult('보물찾기', ['학교 어딘가에 노란 쪽지 3장이 숨어 있어요', ...hints, '가까이 가면 저절로 주워요'], '🗺️');
  }
  // 보물 쪽지는 놀이와 상관없이 가까이 가면 항상 주움
  function tickTreasure() {
    const tr2 = ensureTreasure();
    tr2.spots.forEach((s, i) => {
      if (tr2.found.has(i)) return;
      if (Math.hypot(me.pos.x - s.x, me.pos.z - s.z) < 1.4 && Math.abs(me.pos.y - s.y) < 1.5) {
        tr2.found.add(i);
        tr2.meshes[i].visible = false;
        store.set(`school.treasure.${tr2.day}`, JSON.stringify([...tr2.found]));
        ambience.ding();
        me.showEmoji('📜', 4);
        const total = Number(store.get('school.treasure.total') || 0) + 1;
        store.set('school.treasure.total', String(total));
        if (tr2.found.size >= 3) {
          me.say('보물 다 찾았다! 🎉');
          onAct?.('treasure', 3);
          showResult('보물 3장 모두 찾음!', ['매점 아주머니가 간식 하나 공짜로 주실 거예요 🍞', `지금까지 찾은 쪽지: ${total}장`], '🎉');
          store.set('school.coupon', '1');
        } else {
          me.say(`쪽지 찾았다! (${tr2.found.size}/3)`);
          hint(`쪽지 ${tr2.found.size}/3 · 남은 곳: ${tr2.spots.filter((_, j) => !tr2.found.has(j)).map((q) => q.hint).join(', ')}`, 3500);
        }
      }
    });
  }

  // ════════════════════════════════════════════════
  // 🐤 병아리 키우기 (옥상 닭장)
  // ════════════════════════════════════════════════
  // 저장: { list:[{name, born(day), fed(day)}], eggs }
  const coopPos = { x: 30, y: levelY(ROOF), z: -6 };
  const coopGroup = new THREE.Group();
  scene.add(coopGroup);
  const loadCoop = () => {
    try {
      return JSON.parse(store.get('school.coop') || '{"list":[],"eggs":0}');
    } catch {
      return { list: [], eggs: 0 };
    }
  };
  const saveCoop = (c) => store.set('school.coop', JSON.stringify(c));
  const chickMeshes = [];
  const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 });
  function rebuildCoop() {
    for (const m of chickMeshes) coopGroup.remove(m);
    chickMeshes.length = 0;
    const c = loadCoop();
    const today = dayKey();
    c.list.forEach((ch, i) => {
      const age = today - ch.born; // 지난 '하루' 수
      const grown = age >= 3;
      const g = new THREE.Group();
      const s = grown ? 1.9 : 1 + Math.min(2, age) * 0.25;
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.09 * s, 10, 8), mat(grown ? '#f4f0e6' : '#ffd84a'));
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.06 * s, 8, 6), mat(grown ? '#f4f0e6' : '#ffd84a'));
      head.position.set(0.07 * s, 0.07 * s, 0);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.018 * s, 0.05 * s, 6), mat('#f08a24'));
      beak.rotation.z = -Math.PI / 2;
      beak.position.set(0.13 * s, 0.07 * s, 0);
      g.add(body, head, beak);
      if (grown) {
        const comb = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.02), mat('#e23b3b'));
        comb.position.set(0.07 * s, 0.15 * s, 0);
        g.add(comb);
      }
      g.position.set(coopPos.x - 1.1 + (i % 4) * 0.7, coopPos.y + 0.09 * s, coopPos.z - 0.6 + Math.floor(i / 4) * 0.6);
      g.rotation.y = i * 1.7;
      g.userData.bob = i;
      coopGroup.add(g);
      chickMeshes.push(g);
    });
    coopLabel.material.map = textTex(300, 70, '#fff8dc', '#333333', [`우리 반 닭장 · ${c.list.length}마리 · 계란 ${c.eggs}개`], 26, '#7a5532');
    coopLabel.material.needsUpdate = true;
  }
  const coopLabel = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.46), new THREE.MeshBasicMaterial({ map: textTex(300, 70, '#fff8dc', '#333333', ['우리 반 닭장'], 26, '#7a5532') }));
  coopLabel.position.set(coopPos.x, coopPos.y + 1.5, coopPos.z + 1.1);
  scene.add(coopLabel);
  rebuildCoop();
  // 새 하루가 되면 다 자란 닭이 계란을 낳음 (하루에 1개씩, 모이를 준 닭만)
  let lastEggDay = Number(store.get('school.coop.eggday') || 0);
  function tickCoop() {
    const d = dayKey();
    if (d === lastEggDay) return;
    const c = loadCoop();
    let laid = 0;
    for (const ch of c.list) if (d - ch.born >= 3 && ch.fed === d - 1) laid++;
    if (laid) {
      c.eggs += laid;
      saveCoop(c);
      hint(`옥상 닭장에서 계란 ${laid}개를 낳았어요! 🥚`, 3500);
    }
    lastEggDay = d;
    store.set('school.coop.eggday', String(d));
    rebuildCoop();
  }
  function addChick() {
    const c = loadCoop();
    if (c.list.length >= 8) {
      hint('닭장이 꽉 찼어요 (8마리)', 2000);
      return false;
    }
    const names = ['삐약이', '노랑이', '콩이', '병순이', '방울이', '초코', '쌀알이', '꼬꼬'];
    c.list.push({ name: names[c.list.length % names.length], born: dayKey(), fed: -1 });
    saveCoop(c);
    rebuildCoop();
    hint(`병아리 '${c.list.at(-1).name}'가 옥상 닭장으로 갔어요 🐤`, 3000);
    return true;
  }
  function nearCoop() {
    return Math.abs(me.pos.y - coopPos.y) < 1 && Math.hypot(me.pos.x - coopPos.x, me.pos.z - coopPos.z) < 3.2;
  }
  function feedCoop() {
    const c = loadCoop();
    if (!c.list.length) return hint('아직 병아리가 없어요. 교문 밖 병아리 아저씨한테 사 오세요', 3000);
    const d = dayKey();
    let n = 0;
    for (const ch of c.list) if (ch.fed !== d) {
      ch.fed = d;
      n++;
    }
    saveCoop(c);
    me.play('hand');
    me.showEmoji('🌾', 4);
    ambience.ding();
    if (n) {
      me.say('모이 먹어라~ 꼬꼬');
      hint(`${n}마리에게 모이를 줬어요. 다 자란 닭은 다음 날 계란을 낳아요`, 3500);
    } else hint('오늘은 벌써 모이를 줬어요', 2000);
    const today = c.list.map((ch) => `${ch.name} ${d - ch.born >= 3 ? '🐔' : '🐤'}`).join(' · ');
    hint(today, 3500);
  }
  function collectEggs() {
    const c = loadCoop();
    if (!c.eggs) return hint('아직 계란이 없어요', 1800);
    showResult('계란 바구니', [`지금까지 모은 계란 <b>${c.eggs}개</b>`, '나중에 옥상 비빔밥 재료로 써요 🍚'], '🥚');
  }

  // ════════════════════════════════════════════════
  // 🧊 얼음땡 (단체): 술래 NPC가 운동장을 뛰어다님
  // ════════════════════════════════════════════════
  const inField = (p) => p.x > PITCH.minX + 1 && p.x < PITCH.maxX - 1 && p.z > PITCH.minZ + 1 && p.z < PITCH.maxZ - 1;
  function startTag() {
    const it = new Avatar({ id: `it-${Math.random()}`, name: '술래', look: { outfit: 'gym', hair: 'short', hairColor: 'black', acc: 'cap' }, occlude: true });
    it.pos.set(0, FIELD_Y, 41);
    scene.add(it.root);
    let frozen = 0;
    let t = 0;
    let dodges = 0;
    let retarget = 0;
    let tgt = { x: 0, z: 41 };
    const frozenUntil = { v: 0 };
    hint('술래가 쫓아와요! 운동장 안에서 60초 동안 안 잡히기. 잡히면 3초 얼음', 3500);
    startGame({
      name: 'tag',
      update(dt) {
        t += dt;
        const chasing = inField(me.pos) && performance.now() > frozenUntil.v;
        retarget -= dt;
        if (chasing) tgt = { x: me.pos.x, z: me.pos.z };
        else if (retarget <= 0) {
          retarget = R(1.5, 3);
          tgt = { x: R(PITCH.minX + 5, PITCH.maxX - 5), z: R(PITCH.minZ + 5, PITCH.maxZ - 5) };
        }
        const dx = tgt.x - it.pos.x;
        const dz = tgt.z - it.pos.z;
        const d = Math.hypot(dx, dz);
        const sp = chasing ? 3.6 + Math.min(1.2, t / 30) : 2.5;
        if (d > 0.2) {
          it.pos.x += (dx / d) * sp * dt;
          it.pos.z += (dz / d) * sp * dt;
          it.faceAngle(Math.atan2(dx, dz), dt * 4);
        }
        it.pos.x = Math.max(PITCH.minX + 1, Math.min(PITCH.maxX - 1, it.pos.x));
        it.pos.z = Math.max(PITCH.minZ + 1, Math.min(PITCH.maxZ - 1, it.pos.z));
        it.update(dt, world.heightAt);
        if (chasing && d < 0.9) {
          frozen++;
          frozenUntil.v = performance.now() + 3000;
          me.target = null;
          me.path = [];
          me.frozen = true;
          me.say('얼음!');
          me.showEmoji('🧊', 3);
          it.say('잡았다~ 얼음!');
          setTimeout(() => {
            me.frozen = false;
            me.say('땡!');
          }, 3000);
        }
        if (chasing && d > 0.9 && d < 2.2) dodges += dt;
        if (!inField(me.pos)) hudText.textContent = '🧊 운동장 안으로 들어가요!';
        else hudText.textContent = `🧊 ${Math.max(0, 60 - t).toFixed(0)}초 남음 · 잡힘 ${frozen}`;
        if (t >= 60) {
          const score = Math.max(0, Math.round(100 - frozen * 20 + dodges * 3));
          const b = best('tag');
          const rec = score > b;
          if (rec) setBest('tag', score);
          it.say('휴, 그만하자~');
          me.say(frozen ? '아슬아슬했다!' : '한 번도 안 잡혔다! 😎');
          onAct?.('tag', score);
          showResult('얼음땡 끝!', [`잡힌 횟수 ${frozen}번 · 아슬아슬 피하기 ${dodges.toFixed(0)}초`, `점수 <b>${score}</b>${rec ? ' 🏅 신기록' : ` (최고 ${b})`}`], '🧊');
          stopGame();
        }
      },
      stop() {
        me.frozen = false;
        it.dispose();
      },
    });
  }

  // ════════════════════════════════════════════════
  // 🏐 피구 (단체): 코트 안에서 날아오는 공 피하기
  // ════════════════════════════════════════════════
  function startDodge() {
    const court = { x1: -14, x2: 14, z1: 30, z2: 52 };
    const throwers = [];
    const balls = [];
    const ballGeo = new THREE.SphereGeometry(0.22, 12, 10);
    const ballMat = new THREE.MeshStandardMaterial({ color: '#e04a3a', roughness: 0.6 });
    const lines = [];
    const lineMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    for (const [x1, x2, z1, z2] of [[court.x1, court.x2, court.z1, court.z1 + 0.1], [court.x1, court.x2, court.z2 - 0.1, court.z2], [court.x1, court.x1 + 0.1, court.z1, court.z2], [court.x2 - 0.1, court.x2, court.z1, court.z2]]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(x2 - x1, z2 - z1), lineMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set((x1 + x2) / 2, FIELD_Y + 0.03, (z1 + z2) / 2);
      scene.add(m);
      lines.push(m);
    }
    const spots = [
      { x: court.x1 - 2.5, z: 35 }, { x: court.x1 - 2.5, z: 47 }, { x: court.x2 + 2.5, z: 35 }, { x: court.x2 + 2.5, z: 47 }, { x: 0, z: court.z1 - 2.5 }, { x: 0, z: court.z2 + 2.5 },
    ];
    const looks = [
      { outfit: 'gymblue', hair: 'short', hairColor: 'black', acc: 'none' },
      { outfit: 'gymblue', hair: 'bob', hairColor: 'brown', acc: 'none' },
      { outfit: 'gymblue', hair: 'buzz', hairColor: 'dark', acc: 'none' },
      { outfit: 'gymblue', hair: 'pigtail', hairColor: 'black', acc: 'none' },
      { outfit: 'gymblue', hair: 'long', hairColor: 'dark', acc: 'none' },
      { outfit: 'gymblue', hair: 'short', hairColor: 'brown', acc: 'cap' },
    ];
    spots.forEach((s, i) => {
      const a = new Avatar({ id: `thrower-${i}-${Math.random()}`, name: '상대팀', look: looks[i], occlude: true });
      a.pos.set(s.x, FIELD_Y, s.z);
      scene.add(a.root);
      throwers.push({ a, next: R(1, 3) });
    });
    let t = 0;
    let hits = 0;
    let dodged = 0;
    const inCourt = () => me.pos.x > court.x1 && me.pos.x < court.x2 && me.pos.z > court.z1 && me.pos.z < court.z2;
    hint('흰 선 안(코트)에서 60초 동안 공을 피하세요! 공이 오면 옆으로!', 3500);
    startGame({
      name: 'dodge',
      update(dt) {
        t += dt;
        const rate = 1 + Math.min(1.5, t / 25);
        for (const th of throwers) {
          th.a.faceAngle(Math.atan2(me.pos.x - th.a.pos.x, me.pos.z - th.a.pos.z), dt * 3);
          th.a.update(dt, world.heightAt);
          th.next -= dt * rate;
          if (th.next <= 0 && inCourt()) {
            th.next = R(2.5, 5);
            th.a.play('hand');
            // 내 위치 + 약간의 예측
            const lead = me.target ? 0.5 : 0;
            const aim = { x: me.pos.x + (me.target ? (me.target.x - me.pos.x) * lead : 0), z: me.pos.z + (me.target ? (me.target.z - me.pos.z) * lead : 0) };
            const m = new THREE.Mesh(ballGeo, ballMat);
            const from = new THREE.Vector3(th.a.pos.x, FIELD_Y + 1.2, th.a.pos.z);
            const to = new THREE.Vector3(aim.x, FIELD_Y + 0.6, aim.z);
            const dur = from.distanceTo(to) / 9;
            m.position.copy(from);
            scene.add(m);
            balls.push({ m, from, to, dur, t: 0, done: false });
          }
        }
        for (let i = balls.length - 1; i >= 0; i--) {
          const b = balls[i];
          b.t += dt;
          const k = Math.min(1, b.t / b.dur);
          b.m.position.lerpVectors(b.from, b.to, k);
          b.m.position.y += Math.sin(k * Math.PI) * 1.0;
          if (!b.done && k > 0.6 && b.m.position.distanceTo(new THREE.Vector3(me.pos.x, me.pos.y + 0.7, me.pos.z)) < 0.75) {
            b.done = true;
            hits++;
            me.say('아야!');
            me.showEmoji('💥', 2);
            ambience.rimHit(1);
          }
          if (k >= 1) {
            if (!b.done) dodged++;
            scene.remove(b.m);
            balls.splice(i, 1);
          }
        }
        hudText.textContent = inCourt() ? `🏐 ${Math.max(0, 60 - t).toFixed(0)}초 · 맞음 ${hits} · 피함 ${dodged}` : '🏐 흰 선 안으로 들어가요!';
        if (t >= 60 || hits >= 5) {
          const score = Math.max(0, dodged * 10 - hits * 15 + (hits < 5 ? 30 : 0));
          const b = best('dodge');
          const rec = score > b;
          if (rec) setBest('dodge', score);
          me.say(hits >= 5 ? '아웃… 다음엔 꼭!' : '살아남았다! 🏐');
          onAct?.('dodge', score);
          showResult(hits >= 5 ? '아웃!' : '피구 끝!', [`피한 공 ${dodged}개 · 맞은 공 ${hits}개`, `점수 <b>${score}</b>${rec ? ' 🏅 신기록' : ` (최고 ${b})`}`], hits >= 5 ? '💥' : '🏐');
          stopGame();
        }
      },
      stop() {
        for (const th of throwers) th.a.dispose();
        for (const b of balls) scene.remove(b.m);
        for (const l of lines) scene.remove(l);
      },
    });
  }

  // ── 어디서 어떤 놀이를 할 수 있나 ──
  const onField = () => me.pos.z > FIELD_Z && me.pos.z < 73 && Math.abs(me.pos.x) < 69 && me.pos.y < 0;
  const onRoof = () => Math.abs(me.pos.y - levelY(ROOF)) < 1 && Math.abs(me.pos.x) < BX && me.pos.z < 0 && me.pos.z > Z_BACK;
  const nearGateIn = () => me.pos.x > 40 && me.pos.y < 1 && me.pos.z > -2 && me.pos.z < 16;
  const nearJump = () => me.pos.x > 48 && me.pos.z > 17 && me.pos.z < 25 && me.pos.y < 0;
  function available() {
    const g = [];
    if (onField()) {
      g.push({ icon: '🏃', name: '운동장 한 바퀴', desc: `깃발 4개 돌고 돌아오기${best('run') ? ` · 최고 ${mmss(best('run'))}` : ''}`, start: startRun });
      g.push({ icon: '🧊', name: '얼음땡', desc: `술래 피해 60초 버티기${best('tag') ? ` · 최고 ${best('tag')}점` : ''}`, start: startTag });
      g.push({ icon: '🏐', name: '피구', desc: `날아오는 공 피하기${best('dodge') ? ` · 최고 ${best('dodge')}점` : ''}`, start: startDodge });
      if (nearJump()) g.push({ icon: '🦘', name: '멀리뛰기', desc: `타이밍 맞춰 점프${best('jump') ? ` · 최고 ${best('jump')}m` : ''}`, start: startJump });
    }
    if (nearGateIn() || me.pos.x > OUT.wall) g.push({ icon: '🕵️', name: '몰래 들어가기', desc: `선도부 시야 피해 현관까지${best('sneak') ? ` · 최고 ${best('sneak')}점` : ''}`, start: startSneak });
    g.push({ icon: '🗺️', name: '보물찾기 힌트', desc: `오늘의 쪽지 ${ensureTreasure().found.size}/3`, start: startTreasure });
    if (onRoof() && nearCoop()) {
      g.push({ icon: '🌾', name: '모이 주기', desc: '옥상 닭장 병아리에게', start: feedCoop });
      g.push({ icon: '🥚', name: '계란 바구니', desc: '모은 계란 보기', start: collectEggs });
    }
    return g;
  }

  let syncT = 0;
  return {
    update(dt) {
      // 점프 높이: 아바타 루트에 더함
      if (me.jumpY) me.root.position.y = me.pos.y + me.jumpY;
      if (active) active.update(dt);
      syncT += dt;
      if (syncT > 0.3) {
        syncT = 0;
        tickTreasure();
        tickCoop();
        const canPlay = !active && !isTeacher && available().length > 0;
        playBtn.classList.toggle('hidden', !canPlay);
        if (canPlay) playBtn.textContent = onRoof() && nearCoop() ? '🐤 닭장' : nearGateIn() || me.pos.x > OUT.wall ? '🕵️ 놀이하기' : onField() ? '🎲 운동장 놀이' : '🗺️ 보물찾기';
      }
      // 닭 꼬물거림
      const now = performance.now() / 1000;
      for (const g of chickMeshes) g.position.y += Math.sin(now * 6 + g.userData.bob) * 0.0015;
    },
    addChick,
    hasCoupon: () => store.get('school.coupon') === '1',
    useCoupon: () => store.set('school.coupon', '0'),
    isActive: () => !!active,
    nowKind: () => schoolNow().kind,
  };
}
