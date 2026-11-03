// 학생 NPC: 시간표대로 움직이는 학교 친구들
// - 등교: 등굣길(보도)에서 교문으로 들어와 자기 반으로 걸어감
// - 수업: 모두 자기 반 교실 자리에 앉음 (늦은 애는 뛰어 들어감)
// - 쉬는 시간: 복도에서 무리 지어 수다, 복도 왕복, 잡기 놀이로 뛰어다님
// - 점심: 급식실 자리에 앉거나, 운동장에서 놀거나, 복도에서 수다
// - 방과 후: 교문 밖 등굣길로 나가거나 운동장에 남아 놂
// 서버 없이 각자 화면에서 돌아감. 휴대폰이 버벅이지 않게 멀리 있거나 다른 층이면 그리지 않음
import { Avatar } from './avatar.js';
import { CLASSROOMS, levelY, levelOfY, Z_CORR, Z_BACK, FIELD_Y, OUT, GATE, BX, CAFE_DOOR } from './world.js';
import { schoolNow } from './schedule.js';

const NAMES = ['민수', '지은', '현우', '수진', '동현', '혜진', '준호', '유진', '성민', '은지', '재훈', '소영', '태윤', '미나', '상우', '다은', '진혁', '예린', '영호', '보람', '정훈', '슬기', '우진', '하늘'];
const CHAT = ['어제 그 드라마 봤어?', '숙제 보여줘~ 제발', '매점 갈 사람!', '다음 시간 뭐야?', '선생님 오신다!', '야 이거 봐 ㅋㅋ', '오늘 급식 뭐래?', '체육 시간에 축구 하자', '시험 범위 어디까지야?', '나 어제 PC방 갔다', '그 노래 진짜 좋더라', '방과 후에 떡볶이 먹자'];
const RUN = ['잡아 봐라~', '야 거기 서!', '헉헉', '복도에서 뛰지 말래~'];
const LATE = ['헉 종 쳤다!', '늦었다 늦었다!', '선생님보다 먼저!'];
const MORNING = ['안녕~', '숙제 했어?', '오늘 1교시 뭐지', '졸려…'];
const BYE = ['내일 봐~', '학원 가야 돼', '떡볶이 먹으러 갈래?', '잘 가~'];

const R = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export function createStudents({ scene, world, walkTo, sitOn, standUp, chairTakenBy, count = 20 }) {
  const homerooms = CLASSROOMS.filter((r) => r.type === 'class');
  const list = [];
  for (let i = 0; i < count; i++) {
    const room = homerooms[i % homerooms.length];
    const girl = i % 2 === 0;
    const look = {
      gender: girl ? 'girl' : 'boy',
      outfit: i % 7 === 3 ? 'beige' : 'navy',
      hair: girl ? pick(['bob', 'long', 'pigtail', 'bangs', 'ponytail', 'twin']) : pick(['short', 'buzz', 'mushroom', 'short']),
      hairColor: pick(['black', 'black', 'dark', 'brown']),
      acc: girl ? pick(['none', 'ribbon', 'hairpin', 'headband']) : pick(['none', 'none', 'glasses']),
      bag: pick(['red', 'blue', 'black', 'pink', 'blue']),
    };
    const name = `${room.id} ${NAMES[i % NAMES.length]}`;
    const a = new Avatar({ id: `stu-${i}`, name, look, occlude: true });
    a.root.visible = false;
    scene.add(a.root);
    list.push({ a, room, i, state: 'idle', next: 0, talk: R(2, 8), goal: null, chair: null, group: null });
  }

  // 자리 찾기: 그 교실 의자 중 빈 것
  const chairsOf = (roomId) => world.chairs.map((c, idx) => ({ c, idx })).filter(({ c }) => c.room === roomId);
  const taken = new Set();
  function freeChair(roomId, prefer) {
    const cs = chairsOf(roomId);
    const ordered = prefer != null ? [...cs.slice(prefer % cs.length), ...cs.slice(0, prefer % cs.length)] : cs;
    for (const { idx } of ordered) if (!taken.has(idx) && !chairTakenBy(idx)) return idx;
    return null;
  }
  const leaveChair = (s) => {
    if (s.chair != null) taken.delete(s.chair);
    s.chair = null;
    standUp(s.a);
  };
  const place = (s, x, y, z) => {
    leaveChair(s);
    s.a.pos.set(x, y, z);
    s.a.target = null;
    s.a.path = [];
    s.a.reroute = null;
  };
  const go = (s, x, y, z, speed = 0.6) => {
    s.a.speedMul = speed;
    if (!walkTo(s.a, { x, y, z })) place(s, x, y, z); // 길이 없으면 그냥 그 자리로
  };
  const sit = (s, idx) => {
    if (idx == null) return;
    taken.add(idx);
    s.chair = idx;
    const c = world.chairs[idx];
    s.a.speedMul = s.late ? 1.4 : 0.7;
    if (!walkTo(s.a, { x: c.x, y: c.seatY - 0.45, z: c.z }, idx)) {
      place(s, c.x, c.seatY - 0.45, c.z);
      sitOn(s.a, idx);
      taken.add(idx);
      s.chair = idx;
    } else {
      s.a.onArrive = () => sitOn(s.a, idx);
    }
  };
  // 교실 앞 복도 (앞문·뒷문 사이)
  const corridorSpot = (room, k = 0) => ({ x: (room.xs + room.xe) / 2 + (k - 1) * 0.8 + R(-0.2, 0.2), y: levelY(room.level), z: (Z_CORR + Z_BACK) / 2 + R(-0.6, 0.6) });
  const sidewalk = () => ({ x: R(OUT.wall + 3, OUT.curb - 1.5), y: 0, z: R(-30, 45) });
  const fieldSpot = () => ({ x: R(-38, 38), y: FIELD_Y, z: R(22, 60) });

  // ── 시간표가 바뀔 때 할 일 정하기 ──
  let kind = null;
  let first = true;
  function assign(k) {
    taken.clear();
    // 쉬는 시간 수다 무리: 같은 층 같은 교실 앞에 2~3명씩
    const groups = new Map();
    for (const s of list) {
      s.late = false;
      s.mode = null;
      const r = s.room;
      const roll = (s.i * 37 + Math.floor(Date.now() / 60000)) % 10;
      if (k === 'class') {
        s.mode = 'class';
        s.late = roll === 0 && !first; // 한 명쯤은 늦게 뛰어 들어옴
        if (first) {
          const idx = freeChair(r.id, s.i * 3);
          if (idx != null) {
            const c = world.chairs[idx];
            place(s, c.x, c.seatY - 0.45, c.z);
            sitOn(s.a, idx);
            taken.add(idx);
            s.chair = idx;
          }
        } else {
          leaveChair(s);
          s.next = R(0, s.late ? 6 : 1.5);
        }
      } else if (k === 'morning') {
        s.mode = 'arrive';
        const p = sidewalk();
        place(s, p.x, p.y, p.z);
        s.next = R(0, first ? 2 : 25);
      } else if (k === 'after') {
        s.mode = roll < 6 ? 'leave' : 'field';
        if (first) {
          const p = s.mode === 'leave' ? sidewalk() : fieldSpot();
          place(s, p.x, p.y, p.z);
        } else leaveChair(s);
        s.next = R(0, 10);
      } else {
        // break / lunch
        const lunch = k === 'lunch';
        s.mode = lunch ? (roll < 4 ? 'cafe' : roll < 7 ? 'field' : 'chat') : roll < 6 ? 'chat' : roll < 8 ? 'wander' : 'run';
        if (s.mode === 'chat') {
          const key = `${r.id}`;
          const g = groups.get(key) || [];
          g.push(s);
          groups.set(key, g);
          s.group = key;
          s.slot = g.length - 1;
        }
        if (first) {
          const p = s.mode === 'field' ? fieldSpot() : corridorSpot(r, s.slot ?? 1);
          place(s, p.x, p.y, p.z);
        } else leaveChair(s);
        s.next = R(0.2, 3);
      }
      s.goal = null;
    }
    first = false;
  }

  // 한 명의 다음 행동
  function act(s) {
    const r = s.room;
    switch (s.mode) {
      case 'class': {
        if (s.chair == null) {
          const idx = freeChair(r.id, s.i * 3);
          if (idx != null) sit(s, idx);
          if (s.late) s.a.say(pick(LATE));
        }
        s.next = 999;
        break;
      }
      case 'arrive': {
        // 보도 → 교문 → 교실 앞 복도
        if (!s.goal) {
          s.goal = 'gate';
          go(s, OUT.wall + 1.5, 0, R(GATE.z1 + 1, GATE.z2 - 1), 0.55);
          if (Math.random() < 0.3) s.a.say(pick(MORNING));
          s.next = 6;
        } else if (s.goal === 'gate' && !s.a.target) {
          s.goal = 'class';
          const p = corridorSpot(r, 1);
          go(s, p.x, p.y, p.z, 0.6);
          s.next = 999;
        } else s.next = 2;
        break;
      }
      case 'chat': {
        const p = corridorSpot(r, s.slot);
        if (!s.goal) {
          s.goal = 'spot';
          go(s, p.x, p.y, p.z, 0.6);
        }
        // 무리끼리 서로 바라보며 수다
        if (!s.a.target) {
          const center = { x: (r.xs + r.xe) / 2, z: (Z_CORR + Z_BACK) / 2 };
          s.a.faceAngle(Math.atan2(center.x - s.a.pos.x, center.z - s.a.pos.z), 1);
        }
        s.next = R(3, 6);
        break;
      }
      case 'wander': {
        const L = levelY(r.level);
        go(s, R(-BX + 9, BX - 9), L, (Z_CORR + Z_BACK) / 2 + R(-1, 1), 0.5);
        s.next = R(5, 10);
        break;
      }
      case 'run': {
        const L = levelY(r.level);
        const x = Math.max(-BX + 9, Math.min(BX - 9, s.a.pos.x + R(-12, 12)));
        go(s, x, L, (Z_CORR + Z_BACK) / 2 + R(-1.2, 1.2), 1.5);
        if (Math.random() < 0.35) s.a.say(pick(RUN));
        s.next = R(2, 4);
        break;
      }
      case 'cafe': {
        if (s.chair == null) {
          const idx = freeChair('cafe', s.i * 5);
          if (idx != null) sit(s, idx);
          else go(s, (CAFE_DOOR[0] + CAFE_DOOR[1]) / 2, 0.15, -24, 0.7);
        }
        s.next = 999;
        break;
      }
      case 'field': {
        const p = fieldSpot();
        go(s, p.x, p.y, p.z, Math.random() < 0.5 ? 1.3 : 0.6);
        s.next = R(4, 9);
        break;
      }
      case 'leave': {
        if (!s.goal) {
          s.goal = 'out';
          if (Math.random() < 0.4) s.a.say(pick(BYE));
          const p = sidewalk();
          go(s, p.x, p.y, p.z, 0.6);
        }
        s.next = 999;
        break;
      }
      default:
        s.next = 5;
    }
  }

  // ── 매 프레임 ──
  let syncT = 0;
  function update(dt, me, camPos) {
    syncT += dt;
    if (syncT > 0.5) {
      syncT = 0;
      const k = schoolNow().kind;
      if (k !== kind) {
        kind = k;
        assign(k);
      }
    }
    const myLvl = levelOfY(me.pos.y);
    const meInside = me.pos.z < 0 && me.pos.z > Z_BACK - 6 && Math.abs(me.pos.x) < BX;
    for (const s of list) {
      const a = s.a;
      s.next -= dt;
      if (s.next <= 0) act(s);
      a.update(dt, world.heightAt);
      // 멀리 있거나(55m), 건물 안에서 다른 층이면 그리지 않음
      const d = Math.hypot(a.pos.x - me.pos.x, a.pos.z - me.pos.z);
      const sInside = a.pos.z < 0 && a.pos.z > Z_BACK - 6 && Math.abs(a.pos.x) < BX;
      const otherFloor = (meInside || sInside) && levelOfY(a.pos.y) !== myLvl;
      a.root.visible = d < 55 && !otherFloor;
      if (!a.root.visible) continue;
      if (camPos) a.tagHolder.visible = Math.hypot(camPos.x - a.pos.x, camPos.z - a.pos.z) < 14;
      // 수다·혼잣말 (가까울 때만)
      s.talk -= dt;
      if (s.talk <= 0) {
        s.talk = R(6, 14);
        if (d < 12) {
          if (s.mode === 'chat' && !a.target) a.say(pick(CHAT));
          else if (s.mode === 'field' && Math.random() < 0.4) a.say(pick(['패스!', '여기여기!', '골~!', '야 같이 놀자']));
          else if (s.mode === 'class' && s.chair != null && Math.random() < 0.15) a.say(pick(['(소곤소곤)', '졸려…', '필기 다 했어?']));
        }
      }
    }
  }

  return {
    update,
    // 플레이어가 앉으려는 의자를 학생이 쓰고 있나
    holder: (idx) => list.find((s) => s.chair === idx && s.a.sitChairIndex === idx)?.a || null,
    count: () => list.length,
  };
}
