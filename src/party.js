// 같이 하기 (놀이 방): 서버 없이 브로드캐스트로 모여서 동시에 시작
// 흐름: 주최자가 '같이 하기' → 근처 친구에게 참여 버튼(20초) → 주최자가 '시작' → 모두 같은 seed 로 같은 놀이 → 끝나면 결과 모아 순위
// 메시지(act): party.open / party.join / party.start / party.tick(놀이별 진행) / party.done(결과) / party.cancel
const NAMES = { run: '운동장 한 바퀴', tag: '얼음땡', dodge: '피구', jump: '멀리뛰기' };
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};

export function createParty({ me, myId, myName, others, send, hint, onStart }) {
  let room = null; // { id, host, game, seed, members: Map(id→name), state: 'open'|'playing'|'done', results: Map }
  let inviteTimer = null;

  // ── 모집 배너 (초대받은 사람) ──
  const invite = el('div', 'party-invite hidden');
  const inviteText = el('div', 'party-invite-text', '');
  const joinBtn = el('button', 'party-join', '참여!');
  joinBtn.type = 'button';
  const noBtn = el('button', 'party-no', '✕');
  noBtn.type = 'button';
  invite.append(inviteText, joinBtn, noBtn);
  document.body.append(invite);
  noBtn.addEventListener('click', () => {
    invite.classList.add('hidden');
    pending = null;
  });
  let pending = null; // 받은 초대
  joinBtn.addEventListener('click', () => {
    if (!pending) return;
    room = { ...pending, members: new Map(pending.members), results: new Map(), state: 'open' };
    room.members.set(myId, myName());
    send('act', { type: 'party.join', room: room.id, name: myName() });
    invite.classList.add('hidden');
    pending = null;
    showLobby();
  });

  // ── 대기방 (주최자·참여자 공통) ──
  const lobby = el('div', 'party-lobby hidden');
  const lobbyTitle = el('div', 'party-title', '');
  const lobbyList = el('div', 'party-list', '');
  const startBtn = el('button', 'party-start', '▶ 시작');
  startBtn.type = 'button';
  const leaveBtn = el('button', 'party-leave', '나가기');
  leaveBtn.type = 'button';
  lobby.append(lobbyTitle, lobbyList, startBtn, leaveBtn);
  document.body.append(lobby);
  function showLobby() {
    lobby.classList.remove('hidden');
    renderLobby();
  }
  function renderLobby() {
    if (!room) return;
    const isHost = room.host === myId;
    lobbyTitle.textContent = `${NAMES[room.game] || room.game} · ${room.members.size}명 모임`;
    lobbyList.innerHTML = [...room.members.entries()].map(([id, n]) => `<span class="party-chip${id === room.host ? ' host' : ''}">${n}${id === room.host ? ' 👑' : ''}</span>`).join('');
    startBtn.classList.toggle('hidden', !isHost);
    startBtn.textContent = room.members.size > 1 ? `▶ ${room.members.size}명 시작` : '▶ 혼자라도 시작';
  }
  startBtn.addEventListener('click', () => {
    if (!room || room.host !== myId) return;
    begin();
    send('act', { type: 'party.start', room: room.id, seed: room.seed, at: Date.now() + 1500, members: [...room.members.entries()] });
  });
  leaveBtn.addEventListener('click', () => {
    if (!room) return;
    if (room.host === myId) send('act', { type: 'party.cancel', room: room.id });
    else send('act', { type: 'party.leave', room: room.id });
    room = null;
    lobby.classList.add('hidden');
    clearTimeout(inviteTimer);
  });

  // ── 결과판 ──
  const result = el('div', 'sheet hidden');
  const resultCard = el('div', 'sheet-card result-card');
  result.append(resultCard);
  document.body.append(result);
  result.addEventListener('click', (e) => e.target === result && result.classList.add('hidden'));

  // 주최
  function host(game) {
    const near = [...others.values()].filter((o) => Math.hypot(o.avatar.pos.x - me.pos.x, o.avatar.pos.z - me.pos.z) < 40).length;
    room = { id: `${myId}-${Date.now().toString(36)}`, host: myId, game, seed: Math.floor(Math.random() * 1e9), members: new Map([[myId, myName()]]), results: new Map(), state: 'open' };
    send('act', { type: 'party.open', room: room.id, game, seed: room.seed, hostName: myName() });
    showLobby();
    hint(near ? `근처 친구 ${near}명에게 초대를 보냈어요. 모이면 시작을 눌러요` : '근처에 친구가 없어요. 혼자라도 시작할 수 있어요', 3000);
    clearTimeout(inviteTimer);
    inviteTimer = setTimeout(() => {
      if (room && room.state === 'open') hint('아직 시작 안 했어요. 시작 버튼을 눌러 주세요', 2000);
    }, 25000);
  }
  function begin() {
    if (!room) return;
    room.state = 'playing';
    lobby.classList.add('hidden');
    clearTimeout(inviteTimer);
    onStart(room.game, { seed: room.seed, members: room.members, party: api });
  }

  // 놀이에서 호출: 진행 상황 뿌리기 / 내 결과 보고
  function tick(payload) {
    if (!room || room.state !== 'playing') return;
    send('act', { type: 'party.tick', room: room.id, ...payload });
  }
  const tickHandlers = new Set();
  function onTick(fn) {
    tickHandlers.add(fn);
    return () => tickHandlers.delete(fn);
  }
  function done(score, label, better = 'high') {
    if (!room) return;
    room.results.set(myId, { n: myName(), v: score, label });
    send('act', { type: 'party.done', room: room.id, name: myName(), v: score, label });
    room.better = better;
    maybeFinish();
  }
  let finishTimer = null;
  function maybeFinish() {
    if (!room) return;
    const all = [...room.members.keys()].every((id) => room.results.has(id));
    clearTimeout(finishTimer);
    if (all) showResults();
    else finishTimer = setTimeout(showResults, 20000); // 누가 안 끝내도 20초 뒤 결과
  }
  function showResults() {
    if (!room) return;
    const r = room;
    room = null;
    const list = [...r.results.entries()].sort((a, b) => (r.better === 'low' ? a[1].v - b[1].v : b[1].v - a[1].v));
    const medals = ['🥇', '🥈', '🥉'];
    const missing = [...r.members.keys()].filter((id) => !r.results.has(id)).map((id) => r.members.get(id));
    resultCard.innerHTML = `<div class="result-emoji">🏁</div><h2>${NAMES[r.game] || r.game} 결과</h2><ol class="hall-list">${list.map(([id, e], i) => `<li class="${id === myId ? 'me' : ''}"><span class="hn">${medals[i] || ''} ${e.n}</span><span class="hv">${e.label}</span></li>`).join('')}</ol>${missing.length ? `<p class="hall-empty">아직 안 끝남: ${missing.join(', ')}</p>` : ''}`;
    const ok = el('button', 'close done', '확인');
    ok.type = 'button';
    ok.addEventListener('click', () => result.classList.add('hidden'));
    resultCard.append(ok);
    result.classList.remove('hidden');
    const myRank = list.findIndex(([id]) => id === myId);
    if (myRank === 0 && list.length > 1) me.say('내가 1등! 🏆');
  }

  // 받은 메시지
  function receive(a) {
    if (!a.type?.startsWith('party.')) return false;
    const fromName = a.name || a.hostName || others.get(a.id)?.avatar.name || '친구';
    if (a.type === 'party.open') {
      if (room) return true; // 이미 놀이 중
      const o = others.get(a.id);
      const far = o && Math.hypot(o.avatar.pos.x - me.pos.x, o.avatar.pos.z - me.pos.z) > 60;
      if (far) return true;
      pending = { id: a.room, host: a.id, game: a.game, seed: a.seed, members: [[a.id, fromName]] };
      inviteText.textContent = `${fromName}님이 ${NAMES[a.game] || a.game} 같이 하자고 해요!`;
      invite.classList.remove('hidden');
      clearTimeout(invite._t);
      invite._t = setTimeout(() => {
        invite.classList.add('hidden');
        pending = null;
      }, 20000);
    } else if (a.type === 'party.join') {
      if (room && room.id === a.room) {
        room.members.set(a.id, a.name || others.get(a.id)?.avatar.name || '친구');
        renderLobby();
        hint(`${fromName}님 참여!`, 1500);
      } else if (pending && pending.id === a.room) pending.members.push([a.id, fromName]);
    } else if (a.type === 'party.leave') {
      if (room && room.id === a.room) {
        room.members.delete(a.id);
        renderLobby();
      }
    } else if (a.type === 'party.cancel') {
      if (room && room.id === a.room && room.host !== myId) {
        room = null;
        lobby.classList.add('hidden');
        hint('주최자가 놀이를 취소했어요', 2000);
      }
      if (pending && pending.id === a.room) {
        pending = null;
        invite.classList.add('hidden');
      }
    } else if (a.type === 'party.start') {
      if (room && room.id === a.room && room.state === 'open') {
        room.members = new Map(a.members || [...room.members]);
        room.seed = a.seed;
        const delay = Math.max(0, (a.at || Date.now()) - Date.now());
        setTimeout(begin, delay);
      }
    } else if (a.type === 'party.tick') {
      if (room && room.id === a.room) for (const fn of tickHandlers) fn(a);
    } else if (a.type === 'party.done') {
      if (room && room.id === a.room) {
        room.results.set(a.id, { n: fromName, v: a.v, label: a.label });
        if (room.state === 'playing' && !room.results.has(myId)) hint(`${fromName}님 완주! ${a.label}`, 2000);
        maybeFinish();
      }
    }
    return true;
  }

  const api = { host, receive, tick, onTick, done, active: () => !!room, members: () => (room ? room.members : new Map()), hostId: () => room?.host, game: () => room?.game };
  return api;
}
