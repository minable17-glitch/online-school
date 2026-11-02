// 특별실 놀이
// - 미술실: 그림 그리기 (다 그리면 이젤 캔버스에 걸림)
// - 음악실: 피아노 치기 (근처 친구들에게도 들림)
// - 컴퓨터실: 떨어지는 블록 쌓기 게임 (1~3칸짜리 작은 블록, 한 줄이 꽉 차면 사라짐)
import * as THREE from 'three';
import { playPianoNote, unlockAudio } from './audio.js';

const ROOM_BTN = {
  art: '🎨 그림 그리기',
  music: '🎹 피아노 치기',
  computer: '🕹️ 블록 쌓기 게임',
};

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

// 바닥에서 올라오는 시트(카드) 하나 만들기
function makeSheet(title, sub) {
  const sheet = el('div', 'sheet hidden act-sheet');
  const card = el('div', 'sheet-card act-card');
  card.append(el('h2', null, title), el('p', null, sub));
  const body = el('div', 'act-body');
  const close = el('button', 'close', '닫기');
  close.type = 'button';
  card.append(body, close);
  sheet.append(card);
  document.body.append(sheet);
  sheet.addEventListener('click', (e) => e.target === sheet && close.click());
  return { sheet, body, close };
}

export function createActivities({ me, world, onNote, onAct }) {
  const btn = el('button', 'pill shop-btn act-btn hidden');
  btn.type = 'button';
  document.body.append(btn);
  let roomType = null;
  let open = null;

  // ── 그림 그리기 ──
  const art = makeSheet('미술 시간 🎨', '손가락(마우스)으로 그려요 · 다 그리면 이젤에 걸려요');
  const cv = el('canvas', 'draw-canvas');
  cv.width = 480;
  cv.height = 600;
  const g = cv.getContext('2d');
  const clearCanvas = () => {
    g.fillStyle = '#fffdf6';
    g.fillRect(0, 0, cv.width, cv.height);
  };
  clearCanvas();
  const tools = el('div', 'draw-tools');
  const COLORS = ['#222222', '#e23b3b', '#f08a24', '#f5d33b', '#3fa34d', '#2f7fd6', '#7b4fc9', '#8a5a3a', '#ffffff'];
  let color = COLORS[0];
  let size = 8;
  for (const c of COLORS) {
    const b = el('button', 'sw-btn');
    b.type = 'button';
    b.style.background = c;
    b.title = c === '#ffffff' ? '지우개' : c;
    if (c === '#ffffff') b.textContent = '🧽';
    b.addEventListener('click', () => {
      color = c;
      for (const x of tools.querySelectorAll('.sw-btn')) x.classList.toggle('on', x === b);
    });
    tools.append(b);
  }
  tools.firstChild.classList.add('on');
  const sizes = el('div', 'draw-tools');
  for (const [label, s] of [['가늘게', 4], ['보통', 8], ['굵게', 18]]) {
    const b = el('button', 'chip', label);
    b.type = 'button';
    if (s === size) b.classList.add('on');
    b.addEventListener('click', () => {
      size = s;
      for (const x of sizes.querySelectorAll('.chip')) x.classList.toggle('on', x === b);
    });
    sizes.append(b);
  }
  const clearBtn = el('button', 'chip', '🗑 새 종이');
  clearBtn.type = 'button';
  clearBtn.addEventListener('click', clearCanvas);
  const hangBtn = el('button', 'chip on', '🖼 이젤에 걸기');
  hangBtn.type = 'button';
  sizes.append(clearBtn, hangBtn);
  art.body.append(cv, tools, sizes);
  {
    let last = null;
    const pos = (e) => {
      const r = cv.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * cv.width, y: ((e.clientY - r.top) / r.height) * cv.height };
    };
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture(e.pointerId);
      last = pos(e);
      g.fillStyle = color;
      g.beginPath();
      g.arc(last.x, last.y, size / 2, 0, Math.PI * 2);
      g.fill();
    });
    cv.addEventListener('pointermove', (e) => {
      if (!last) return;
      const p = pos(e);
      g.strokeStyle = color;
      g.lineWidth = size;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(last.x, last.y);
      g.lineTo(p.x, p.y);
      g.stroke();
      last = p;
    });
    for (const ev of ['pointerup', 'pointercancel']) cv.addEventListener(ev, () => (last = null));
  }
  let easelIdx = 0;
  hangBtn.addEventListener('click', () => {
    const easel = world.artEasels[easelIdx % world.artEasels.length];
    easelIdx++;
    if (easel) {
      const copy = document.createElement('canvas');
      copy.width = cv.width;
      copy.height = cv.height;
      copy.getContext('2d').drawImage(cv, 0, 0);
      const t = new THREE.CanvasTexture(copy);
      t.colorSpace = THREE.SRGBColorSpace;
      easel.material.map?.dispose();
      easel.material.map = t;
      easel.material.color.set('#ffffff');
      easel.material.needsUpdate = true;
    }
    me.say('그림 완성! 이젤에 걸었어요 🎨');
    onAct?.('art');
    hide();
  });

  // ── 피아노 ──
  const piano = makeSheet('음악실 피아노 🎹', '건반을 눌러 보세요 · 옆 친구들에게도 들려요');
  const kb = el('div', 'piano');
  const WHITE = [0, 2, 4, 5, 7, 9, 11];
  const NAMES = ['도', '레', '미', '파', '솔', '라', '시'];
  let octave = 60; // 가운데 도
  const keys = [];
  const nWhite = 15;
  for (let i = 0; i < nWhite; i++) {
    const semis = Math.floor(i / 7) * 12 + WHITE[i % 7];
    const k = el('button', 'key white', `<span>${NAMES[i % 7]}</span>`);
    k.type = 'button';
    k.dataset.s = semis;
    kb.append(k);
    keys.push(k);
    // 검은 건반 (미·시 다음에는 없음)
    if (i < nWhite - 1 && i % 7 !== 2 && i % 7 !== 6) {
      const bk = el('button', 'key black');
      bk.type = 'button';
      bk.dataset.s = semis + 1;
      bk.style.left = `calc(6px + (100% - 12px) * ${(i + 1 - 0.32) / nWhite})`;
      bk.style.width = `calc((100% - 12px) * ${0.64 / nWhite})`;
      kb.append(bk);
      keys.push(bk);
    }
  }
  const press = (k) => {
    const midi = octave + Number(k.dataset.s);
    playPianoNote(midi, 0.7);
    onNote?.(midi);
    k.classList.add('down');
    setTimeout(() => k.classList.remove('down'), 160);
    noteCount++;
  };
  let noteCount = 0;
  for (const k of keys) {
    k.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      unlockAudio();
      press(k);
    });
  }
  const octRow = el('div', 'draw-tools');
  for (const [label, o] of [['낮은 음', 48], ['가운데', 60], ['높은 음', 72]]) {
    const b = el('button', `chip${o === octave ? ' on' : ''}`, label);
    b.type = 'button';
    b.addEventListener('click', () => {
      octave = o;
      for (const x of octRow.querySelectorAll('.chip')) x.classList.toggle('on', x === b);
    });
    octRow.append(b);
  }
  // 따라 치기: 학교 종 (솔솔라라 솔솔미 솔솔미미레)
  const song = el('p', 'song', '따라 쳐 볼까? 🎵 <b>솔 솔 라 라 솔 솔 미 · 솔 솔 미 미 레</b>');
  piano.body.append(kb, octRow, song);
  // 키보드로도: a s d f g h j k = 도~도
  const KEYMAP = { a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12, o: 13, l: 14 };

  // ── 블록 쌓기 게임 ──
  const game = makeSheet('컴퓨터실 🕹️ 블록 쌓기', '작은 블록을 쌓아 한 줄을 꽉 채우면 사라져요');
  const COLS = 9;
  const ROWS = 15;
  const CELL = 26;
  const gc = el('canvas', 'game-canvas');
  gc.width = COLS * CELL;
  gc.height = ROWS * CELL;
  const gg = gc.getContext('2d');
  const info = el('div', 'game-info', '');
  const pad = el('div', 'game-pad');
  const PADS = [['◀', 'left'], ['⟳', 'rot'], ['▶', 'right'], ['⬇', 'drop']];
  for (const [label, act] of PADS) {
    const b = el('button', 'pad-btn', label);
    b.type = 'button';
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      control(act);
    });
    pad.append(b);
  }
  const startBtn = el('button', 'chip on', '▶ 시작');
  startBtn.type = 'button';
  startBtn.addEventListener('click', () => newGame());
  game.body.append(info, gc, pad, startBtn);
  // 1~3칸짜리 블록 모양 (우리 학교만의 작은 블록)
  const SHAPES = [
    [[0, 0]],
    [[0, 0], [1, 0]],
    [[0, 0], [1, 0], [2, 0]],
    [[0, 0], [1, 0], [0, 1]],
    [[0, 0], [1, 1]],
  ];
  const PCOL = ['#e8584f', '#f2a33a', '#f5d33b', '#4fb065', '#3f8fe0', '#8b62d6'];
  let grid;
  let cur = null;
  let score = 0;
  let lines = 0;
  let best = 0;
  try {
    best = Number(localStorage.getItem('school-block-best')) || 0;
  } catch {
    best = 0;
  }
  let fallT = 0;
  let running = false;
  let over = false;
  const cells = (p) => p.shape.map(([x, y]) => [p.x + x, p.y + y]);
  const fits = (p) => cells(p).every(([x, y]) => x >= 0 && x < COLS && y < ROWS && (y < 0 || !grid[y][x]));
  function spawn() {
    const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)].map((c) => [...c]);
    cur = { shape, x: Math.floor(COLS / 2) - 1, y: -1, col: PCOL[Math.floor(Math.random() * PCOL.length)] };
    if (!fits(cur)) {
      cur.y = -2;
      if (!fits(cur)) endGame();
    }
  }
  function newGame() {
    grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    score = 0;
    lines = 0;
    running = true;
    over = false;
    startBtn.textContent = '↺ 다시 하기';
    spawn();
    draw();
  }
  function endGame() {
    running = false;
    over = true;
    if (score > best) {
      best = score;
      try {
        localStorage.setItem('school-block-best', String(best));
      } catch {
        /* 저장 안 되면 그냥 넘어감 */
      }
    }
    me.say(`블록 쌓기 ${score}점!`);
    onAct?.('game', score);
  }
  function lock() {
    for (const [x, y] of cells(cur)) {
      if (y < 0) {
        endGame();
        return;
      }
      grid[y][x] = cur.col;
    }
    let cleared = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
      if (grid[y].every(Boolean)) {
        grid.splice(y, 1);
        grid.unshift(Array(COLS).fill(null));
        cleared++;
        y++;
      }
    }
    if (cleared) {
      lines += cleared;
      score += [0, 100, 300, 600, 1000][Math.min(4, cleared)];
      playPianoNote(72 + cleared * 4, 0.4);
    } else score += 5;
    spawn();
  }
  function control(act) {
    if (!running || !cur) return;
    const t = { ...cur, shape: cur.shape };
    if (act === 'left') t.x--;
    else if (act === 'right') t.x++;
    else if (act === 'rot') {
      t.shape = cur.shape.map(([x, y]) => [y, -x]);
      const minX = Math.min(...t.shape.map((c) => c[0]));
      const minY = Math.min(...t.shape.map((c) => c[1]));
      t.shape = t.shape.map(([x, y]) => [x - minX, y - minY]);
    } else if (act === 'drop') {
      while (fits({ ...cur, y: cur.y + 1 })) cur.y++;
      lock();
      draw();
      return;
    }
    if (fits(t)) cur = t;
    draw();
  }
  function draw() {
    gg.fillStyle = '#10161f';
    gg.fillRect(0, 0, gc.width, gc.height);
    gg.strokeStyle = 'rgba(255,255,255,0.05)';
    for (let x = 1; x < COLS; x++) gg.strokeRect(x * CELL, 0, 0, gc.height);
    const box = (x, y, c) => {
      if (y < 0) return;
      gg.fillStyle = c;
      gg.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
      gg.fillStyle = 'rgba(255,255,255,0.25)';
      gg.fillRect(x * CELL + 3, y * CELL + 3, CELL - 6, 4);
    };
    if (grid) for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (grid[y][x]) box(x, y, grid[y][x]);
    if (cur && running) {
      // 떨어질 자리 미리 보기
      const ghost = { ...cur };
      while (fits({ ...ghost, y: ghost.y + 1 })) ghost.y++;
      gg.globalAlpha = 0.22;
      for (const [x, y] of cells(ghost)) box(x, y, cur.col);
      gg.globalAlpha = 1;
      for (const [x, y] of cells(cur)) box(x, y, cur.col);
    }
    if (!running) {
      gg.fillStyle = 'rgba(0,0,0,0.55)';
      gg.fillRect(0, gc.height / 2 - 40, gc.width, 80);
      gg.fillStyle = '#fff';
      gg.font = 'bold 20px sans-serif';
      gg.textAlign = 'center';
      gg.fillText(over ? `끝! ${score}점` : '시작을 눌러요', gc.width / 2, gc.height / 2 + 7);
    }
    info.innerHTML = `점수 <b>${score}</b> · 줄 <b>${lines}</b> · 최고 <b>${best}</b>`;
  }
  draw();

  // ── 열고 닫기 ──
  const sheets = { art, music: piano, computer: game };
  function show(type) {
    unlockAudio();
    hide();
    open = type;
    sheets[type].sheet.classList.remove('hidden');
    if (type === 'computer') draw();
    noteCount = 0;
  }
  function hide() {
    if (open === 'music' && noteCount > 4) me.say('🎵 피아노 연주 끝!');
    if (open === 'computer') running = false;
    if (open) sheets[open].sheet.classList.add('hidden');
    open = null;
  }
  for (const s of Object.values(sheets)) s.close.addEventListener('click', hide);
  btn.addEventListener('click', () => roomType && show(roomType));

  window.addEventListener('keydown', (e) => {
    if (open === 'music' && !e.repeat && KEYMAP[e.key] != null) {
      const k = keys.find((x) => Number(x.dataset.s) === KEYMAP[e.key]);
      if (k) press(k);
    } else if (open === 'computer') {
      const m = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'rot', ArrowDown: 'drop', ' ': 'drop' }[e.key];
      if (m) {
        e.preventDefault();
        control(m);
      }
    }
  });

  return {
    // 0.3초마다: 지금 있는 방에 맞는 버튼 보이기
    sync(room) {
      roomType = room && ROOM_BTN[room.type] ? room.type : null;
      btn.classList.toggle('hidden', !roomType || !!open);
      if (roomType) btn.textContent = ROOM_BTN[roomType];
      if (open && open !== roomType) hide();
    },
    update(dt) {
      if (!running || open !== 'computer') return;
      fallT += dt;
      const speed = Math.max(0.12, 0.7 - lines * 0.03);
      if (fallT > speed) {
        fallT = 0;
        if (fits({ ...cur, y: cur.y + 1 })) cur.y++;
        else lock();
        draw();
      }
    },
    isOpen: () => !!open,
  };
}
