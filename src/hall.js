// 명예의 전당: 놀이 기록 상위 10명
// - 기기에 저장 + 같은 방 친구들과 주고받아 합침 (서버 없음: 들어올 때 내 판을 뿌리고, 받은 판과 합쳐서 더 좋은 기록만 남김)
// - 운동장 옆 돌 게시판에 1~5등이 새겨짐, 📜 버튼으로 전체 보기
import * as THREE from 'three';
import { textTex, FIELD_Y } from './world.js';

export const EVENTS = {
  run: { name: '운동장 한 바퀴', icon: '🏃', unit: (v) => `${v.toFixed(2)}초`, better: (a, b) => a < b },
  jump: { name: '멀리뛰기', icon: '🦘', unit: (v) => `${v.toFixed(2)}m`, better: (a, b) => a > b },
  sneak: { name: '몰래 들어가기', icon: '🕵️', unit: (v) => `${v | 0}점`, better: (a, b) => a > b },
  tag: { name: '얼음땡', icon: '🧊', unit: (v) => `${v | 0}점`, better: (a, b) => a > b },
  dodge: { name: '피구', icon: '🏐', unit: (v) => `${v | 0}점`, better: (a, b) => a > b },
};
const MAX = 10;
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};

export function createHall({ scene, store, send, myId, myName }) {
  const load = () => {
    try {
      const d = JSON.parse(store.get('school.hall') || '{}');
      for (const k of Object.keys(EVENTS)) d[k] = Array.isArray(d[k]) ? d[k] : [];
      return d;
    } catch {
      return Object.fromEntries(Object.keys(EVENTS).map((k) => [k, []]));
    }
  };
  let data = load();
  const save = () => store.set('school.hall', JSON.stringify(data));

  // 한 사람당 한 줄(최고 기록), 좋은 순으로 10명
  function merge(ev, entries) {
    const spec = EVENTS[ev];
    if (!spec) return false;
    const byId = new Map();
    for (const e of [...data[ev], ...entries]) {
      if (!e || typeof e.v !== 'number' || !Number.isFinite(e.v) || !e.id) continue;
      const cur = byId.get(e.id);
      if (!cur || spec.better(e.v, cur.v)) byId.set(e.id, { id: String(e.id).slice(0, 16), n: String(e.n || '?').slice(0, 12), v: e.v, t: e.t || Date.now() });
    }
    const list = [...byId.values()].sort((a, b) => (spec.better(a.v, b.v) ? -1 : spec.better(b.v, a.v) ? 1 : a.t - b.t)).slice(0, MAX);
    const changed = JSON.stringify(list) !== JSON.stringify(data[ev]);
    data[ev] = list;
    return changed;
  }

  // 내 새 기록
  function record(ev, v) {
    const entry = { id: myId, n: myName(), v, t: Date.now() };
    const before = data[ev].findIndex((e) => e.id === myId);
    merge(ev, [entry]);
    save();
    redraw();
    send('act', { type: 'hall', ev, list: [entry] });
    const rank = data[ev].findIndex((e) => e.id === myId);
    return { rank: rank < 0 ? null : rank + 1, improved: rank >= 0 && (before < 0 || rank < before) };
  }
  // 친구한테서 받은 판
  function receive(a) {
    if (a.type === 'hall' && a.ev && Array.isArray(a.list)) {
      if (merge(a.ev, a.list)) {
        save();
        redraw();
      }
    } else if (a.type === 'hallAll' && a.data) {
      let ch = false;
      for (const ev of Object.keys(EVENTS)) if (Array.isArray(a.data[ev]) && merge(ev, a.data[ev])) ch = true;
      if (ch) {
        save();
        redraw();
      }
    }
  }
  // 새 친구가 들어오면 내 판 전체를 보내 줌
  function share() {
    send('act', { type: 'hallAll', data });
  }

  // ── 3D 돌 게시판 (운동장 서쪽 스탠드 옆) ──
  const W = 4.2;
  const H = 2.4;
  const bx = -47.5;
  const bz = 20;
  const stone = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, H + 0.4, 0.3), new THREE.MeshStandardMaterial({ color: '#8d8a82', roughness: 0.85 }));
  stone.position.set(bx, FIELD_Y + H / 2 + 0.6, bz);
  stone.rotation.y = Math.PI / 2;
  stone.castShadow = true;
  scene.add(stone);
  const base = new THREE.Mesh(new THREE.BoxGeometry(W + 1.0, 0.6, 0.8), new THREE.MeshStandardMaterial({ color: '#6f6c66', roughness: 0.9 }));
  base.position.set(bx, FIELD_Y + 0.3, bz);
  base.rotation.y = Math.PI / 2;
  scene.add(base);
  const boardMat = new THREE.MeshBasicMaterial({ map: null });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(W, H), boardMat);
  board.position.set(bx + 0.16, FIELD_Y + H / 2 + 0.6, bz);
  board.rotation.y = Math.PI / 2;
  scene.add(board);
  function redraw() {
    const lines = ['🏆 명예의 전당 🏆'];
    for (const [k, spec] of Object.entries(EVENTS)) {
      const top = data[k].slice(0, 3);
      lines.push(`${spec.icon} ${spec.name}: ${top.length ? top.map((e, i) => `${['🥇', '🥈', '🥉'][i]}${e.n} ${spec.unit(e.v)}`).join('  ') : '아직 기록 없음'}`);
    }
    boardMat.map?.dispose();
    boardMat.map = textTex(1050, 600, '#2b2a28', '#f2e9d0', lines, 30, '#c9a35a');
    boardMat.needsUpdate = true;
  }
  redraw();

  // ── 전체 보기 시트 ──
  const sheet = el('div', 'sheet hidden');
  const card = el('div', 'sheet-card hall-card');
  sheet.append(card);
  document.body.append(sheet);
  sheet.addEventListener('click', (e) => e.target === sheet && sheet.classList.add('hidden'));
  function open(focus) {
    card.innerHTML = '<h2>🏆 명예의 전당</h2><p>같은 학교 친구들의 최고 기록 (상위 10명)</p>';
    const tabs = el('div', 'chips');
    const body = el('div', 'hall-body');
    let cur = focus && EVENTS[focus] ? focus : 'run';
    const render = () => {
      for (const c of tabs.children) c.classList.toggle('on', c.dataset.k === cur);
      const spec = EVENTS[cur];
      const list = data[cur];
      body.innerHTML = list.length
        ? `<ol class="hall-list">${list.map((e) => `<li class="${e.id === myId ? 'me' : ''}"><span class="hn">${e.n}</span><span class="hv">${spec.unit(e.v)}</span></li>`).join('')}</ol>`
        : '<p class="hall-empty">아직 기록이 없어요. 첫 기록의 주인공이 되어 보세요!</p>';
    };
    for (const [k, spec] of Object.entries(EVENTS)) {
      const c = el('button', 'chip', `${spec.icon} ${spec.name}`);
      c.type = 'button';
      c.dataset.k = k;
      c.addEventListener('click', () => {
        cur = k;
        render();
      });
      tabs.append(c);
    }
    const close = el('button', 'close', '닫기');
    close.type = 'button';
    close.addEventListener('click', () => sheet.classList.add('hidden'));
    card.append(tabs, body, close);
    render();
    sheet.classList.remove('hidden');
  }
  const nearBoard = (p) => Math.hypot(p.x - bx, p.z - bz) < 4 && p.y < 0;

  return { record, receive, share, open, nearBoard, data: () => data };
}
