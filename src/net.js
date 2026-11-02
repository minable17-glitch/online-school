// 친구들과 실시간으로 함께 있기 (Supabase Realtime 사용)
// DB 테이블을 쓰지 않고, 같은 방(room)에 들어온 사람끼리 위치·동작 메시지만 주고받습니다.
// 그래서 schema.sql 을 고치거나 SQL 을 실행할 필요가 없습니다.
import { createClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 한 방(인스턴스)에 들어갈 수 있는 최대 인원. 꽉 차면 2번 방, 3번 방… 으로 자동 배정
export const ROOM_CAPACITY = 50;
const MAX_INSTANCES = 20;

export function connectRoom({ room, me, onState, onAction, onBall, onLeave, onCount, onStatus, onInstance, preferInstance }) {
  if (!URL || !KEY) return connectLocal({ room, me, onState, onAction, onBall, onLeave, onCount, onStatus });

  const supabase = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  let channel = null;
  let ready = false;
  let closed = false;
  const queue = [];

  const send = (event, payload) => {
    if (!ready || !channel) {
      if (queue.length < 20) queue.push([event, payload]);
      return;
    }
    channel.send({ type: 'broadcast', event, payload: { ...payload, id: me.id } });
  };

  // n번 방에 들어가 보기: 이미 꽉 찼으면 false
  function tryJoin(n) {
    return new Promise((resolve) => {
      const ch = supabase.channel(`school-${room}-${n}`, {
        config: { presence: { key: me.id }, broadcast: { self: false } },
      });
      let decided = false;
      const decide = async () => {
        if (decided || closed) return;
        decided = true;
        const others = Object.keys(ch.presenceState()).filter((k) => k !== me.id).length;
        if (others >= ROOM_CAPACITY) {
          await supabase.removeChannel(ch);
          resolve(false);
          return;
        }
        channel = ch;
        ready = true;
        onInstance?.(n);
        onStatus?.('online');
        await ch.track({ name: me.name, teacher: !!me.teacher });
        while (queue.length) {
          const [e, p] = queue.shift();
          send(e, p);
        }
        me.announce?.();
        resolve(true);
      };
      ch.on('broadcast', { event: 'state' }, ({ payload }) => channel === ch && onState(payload))
        .on('broadcast', { event: 'act' }, ({ payload }) => channel === ch && onAction(payload))
        .on('broadcast', { event: 'ball' }, ({ payload }) => channel === ch && onBall(payload))
        .on('presence', { event: 'sync' }, () => {
          if (!decided) return decide();
          if (channel === ch) onCount(Object.keys(ch.presenceState()).length);
        })
        .on('presence', { event: 'join' }, ({ key }) => {
          // 새 친구가 들어오면 내 현재 상태를 한 번 알려줌
          if (channel === ch && key !== me.id) me.announce?.();
        })
        .on('presence', { event: 'leave' }, ({ key }) => channel === ch && onLeave(key))
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // 지금 몇 명 있는지(presence)가 도착하면 결정. 아무도 없어서 안 오면 2초 뒤 결정
            setTimeout(decide, 2000);
          } else if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') && channel === ch) {
            ready = false;
            onStatus?.('offline');
          } else if (status === 'CHANNEL_ERROR' && !decided) {
            decided = true;
            onStatus?.('offline');
            resolve(true);
          }
        });
    });
  }

  (async () => {
    const start = Math.max(1, Math.min(MAX_INSTANCES, Number(preferInstance) || 1));
    for (let n = start; n <= MAX_INSTANCES && !closed; n++) {
      if (await tryJoin(n)) return;
    }
    onStatus?.('full');
  })();

  return {
    send,
    updateMe() {
      if (ready && channel) channel.track({ name: me.name, teacher: !!me.teacher });
    },
    close() {
      closed = true;
      if (channel) supabase.removeChannel(channel);
    },
  };
}

// Supabase 설정이 없을 때(개발용): 같은 브라우저의 다른 탭끼리만 연결
function connectLocal({ room, me, onState, onAction, onBall, onLeave, onCount, onStatus }) {
  if (typeof BroadcastChannel === 'undefined') {
    onStatus?.('solo');
    return { send() {}, updateMe() {}, close() {} };
  }
  const bc = new BroadcastChannel(`school-${room}`);
  const seen = new Map();
  const send = (event, payload) => bc.postMessage({ event, payload: { ...payload, id: me.id } });
  bc.onmessage = ({ data }) => {
    const { event, payload } = data || {};
    if (!payload?.id) return;
    if (event === 'bye') {
      seen.delete(payload.id);
      onLeave(payload.id);
    } else {
      if (!seen.has(payload.id)) me.announce?.();
      seen.set(payload.id, Date.now());
      if (event === 'state') onState(payload);
      else if (event === 'act') onAction(payload);
      else if (event === 'ball') onBall(payload);
    }
    onCount(seen.size + 1);
  };
  onStatus?.('solo');
  setTimeout(() => me.announce?.(), 100);
  return {
    send,
    updateMe() {},
    close() {
      send('bye', {});
      bc.close();
    },
  };
}
