// NPC 선생님들
// - 수업 시간에만 교실에 계심. 어느 교실에 어느 선생님이 계실지는 '교실 이름 + 몇 교시'로 정해서
//   모든 친구 화면에서 똑같음 (서버 필요 없음)
// - 일반 교실: 수학 / 국어 / 선생님 없음(자습) 중 하나
// - 음악실: 음악 선생님 (피아노), 미술실: 미술 선생님 (돌아다니며 봐 주심)
// - 쉬는 시간·점심시간엔 선생님이 안 계심
// - 휴대폰이 버벅이지 않도록, 내 근처(같은 층) 교실의 선생님만 화면에 만듦
import { Avatar } from './avatar.js';
import { CLASSROOMS, levelY, levelOfY } from './world.js';
import { schoolNow } from './schedule.js';

export const SUBJECTS = {
  수학: {
    name: '수학 선생님',
    look: { outfit: 'suit', hair: 'short', hairColor: 'black', acc: 'glasses' },
    boards: [
      '수학 · 일차방정식\n2x + 3 = 11\nx = ?',
      '수학 · 피타고라스 정리\na² + b² = c²\n3, 4 이면 c = ?',
      '수학 · 연립방정식\nx + y = 10\nx − y = 2',
      '수학 · 원의 넓이\nS = πr²\nr = 3 일 때?',
    ],
    lines: ['자, 이 문제 풀어볼 사람?', '공식 외웠지? 시험에 나온다~', '칠판 잘 봐라~ 여기 중요해!', '계산 실수 조심하고!', '익힘책 다음 시간까지 풀어 와요~', '졸지 말고! 거기 뒤에!'],
    greet: '어서 와, 빈자리에 앉아라~',
  },
  국어: {
    name: '국어 선생님',
    look: { outfit: 'beige', hair: 'long', hairColor: 'dark', acc: 'none' },
    boards: [
      '국어 · 소나기 (황순원)\n"이 바보"\n소녀의 마음은?',
      '국어 · 진달래꽃 (김소월)\n시의 화자는\n어떤 마음일까?',
      '국어 · 문법\n품사의 종류\n명사 · 동사 · 형용사',
      '국어 · 속담\n가는 말이 고와야\n오는 말이 곱다',
    ],
    lines: ['밑줄 쫙~ 별표 세 개!', '이 부분 시험에 꼭 나온다~', '자, 다 같이 읽어볼까?', '작가가 하고 싶은 말이 뭘까?', '교과서 펴라~', '글씨 또박또박 써야지~'],
    greet: '어서 와, 교과서 펴고 앉자~',
  },
  음악: {
    name: '음악 선생님',
    look: { outfit: 'wine', hair: 'bob', hairColor: 'brown', acc: 'ribbon' },
    boards: ['♪ 음악 · 함께 불러요\n학교 종이 땡땡땡\n솔솔라라 솔솔미'],
    lines: ['자, 다 같이 따라 불러보자~', '리코더 챙겨 왔지?', '박자 맞춰서~ 하나 둘 셋 넷!', '목소리 더 크게~!'],
    greet: '어서 와~ 같이 노래하자!',
  },
  미술: {
    name: '미술 선생님',
    look: { outfit: 'green', hair: 'bun', hairColor: 'dark', acc: 'none' },
    boards: ['미술 · 수채화\n물 조절이 핵심!\n밝은 색부터 칠해요'],
    lines: ['물통 엎지르지 않게 조심~', '색깔 참 예쁘게 칠했네!', '스케치는 연하게 해보자', '다 그리면 뒤에 붙여 놓자~'],
    greet: '앞치마 입고 앉으렴~',
  },
  과학: {
    name: '과학 선생님',
    color: '#f2f2ee', // 흰 실험 가운
    look: { outfit: 'navy', hair: 'short', hairColor: 'black', acc: 'glasses' },
    boards: ['과학 · 산과 염기\n리트머스 종이\n빨강? 파랑?', '과학 · 물질의 상태\n고체 · 액체 · 기체', '과학 · 현미경 관찰\n양파 표피 세포'],
    lines: ['보안경 꼭 쓰고!', '알코올램프 조심해라~', '수도꼭지 잠갔지?', '관찰한 것 실험 보고서에 적자~', '장난치면 위험해요!'],
    greet: '자리에 앉고, 실험 도구 만지지 마~',
  },
  정보: {
    name: '정보 선생님',
    look: { outfit: 'gymblue', hair: 'short', hairColor: 'dark', acc: 'glasses' },
    boards: ['정보 · 타자 연습\n한글 300타 도전!', '정보 · 인터넷 예절\n악플 NO, 선플 YES'],
    lines: ['게임하는 거 다 보인다~', '자리 비우면 로그아웃!', '타자 몇 타 나왔어?', '마우스 던지지 마라~'],
    greet: '컴퓨터 켜고 자리에 앉자~',
  },
  가정: {
    name: '가정 선생님',
    look: { outfit: 'beige', hair: 'bob', hairColor: 'brown', acc: 'none' },
    boards: ['가정 · 바느질 기초\n홈질 · 박음질 · 감침질'],
    lines: ['바늘 조심~ 손가락 찔린다!', '재봉틀 천천히 밟아라~', '실 매듭 잘 지었네!', '다 하면 정리 정돈~'],
    greet: '앞치마 입고 모둠별로 앉자~',
  },
  영어: {
    name: '영어 선생님',
    look: { outfit: 'wine', hair: 'long', hairColor: 'brown', acc: 'glasses' },
    boards: ['English · Greetings\nHow are you?\nI\'m fine, thank you.', 'English · Lesson 3\nWhat time is it?\nIt\'s 9 o\'clock.'],
    lines: ['Repeat after me~', '단어 시험 다음 시간!', '발음 또박또박~', 'Good job! 박수~'],
    greet: 'Hello! Sit down, please~',
  },
};

// 늘 자리에 계신 분들 (교장실·행정실·교무실·보건실)
export const STAFF = {
  principal: {
    name: '교장 선생님',
    look: { outfit: 'suit', hair: 'buzz', hairColor: 'black', acc: 'glasses' },
    lines: ['허허, 공부 열심히 하고 있니?', '교장실은 처음이지? 앉아 봐라~', '복도에서 뛰면 안 된다~', '꿈을 크게 가져라!'],
    greet: '어서 오너라~',
  },
  admin: {
    name: '행정실 주무관',
    look: { outfit: 'beige', hair: 'short', hairColor: 'dark', acc: 'none' },
    lines: ['서류는 창구에 내 주세요~', '분실물은 여기서 찾아가요', '방과후 신청서 받습니다~'],
    greet: '무슨 일로 왔어요?',
  },
  staff1: {
    name: '담임 선생님',
    look: { outfit: 'suit', hair: 'long', hairColor: 'dark', acc: 'glasses' },
    lines: ['숙제 냈니?', '교무실엔 조용히~', '종례 때 보자~', '심부름 왔구나?'],
    greet: '응, 무슨 일이니?',
  },
  staff2: {
    name: '체육 선생님',
    look: { outfit: 'gym', hair: 'buzz', hairColor: 'black', acc: 'none' },
    lines: ['체육복 챙겨 왔지?', '다음 시간 운동장 집합!', '줄 똑바로 서라~'],
    greet: '오~ 왔냐!',
  },
  librarian: {
    name: '사서 선생님',
    look: { outfit: 'beige', hair: 'bob', hairColor: 'black', acc: 'glasses' },
    lines: ['도서실에선 조용히~', '대출 기간은 2주야', '다 읽은 책은 반납함에 넣어 주렴', '새로 들어온 책 구경해 볼래?'],
    greet: '어서 와, 책 빌리러 왔니?',
  },
  nurse: {
    name: '보건 선생님',
    color: '#f2f2ee',
    look: { outfit: 'navy', hair: 'bob', hairColor: 'dark', acc: 'none' },
    lines: ['어디 아프니?', '침대에서 잠깐 쉬었다 가렴', '손 깨끗이 씻자~', '물 많이 마셔야 해!'],
    greet: '어서 와, 어디 아파서 왔니?',
  },
};

function hash(str) {
  let h = 7;
  for (const ch of String(str)) h = (h * 31 + ch.codePointAt(0)) | 0;
  return Math.abs(h);
}

// 이 교실, 이 시간의 과목 (없으면 null)
export function subjectOf(room, period = schoolNow()) {
  if (!room || period.kind !== 'class') return null;
  if (room.type === 'music') return '음악';
  if (room.type === 'art') return '미술';
  if (room.type === 'science') return '과학';
  if (room.type === 'computer') return '정보';
  if (room.type === 'homeec') return '가정';
  if (room.type === 'english') return '영어';
  if (room.type !== 'class') return null;
  return ['수학', '국어', null][hash(`${room.id}|${period.key}`) % 3];
}

const R = (a, b) => a + Math.random() * (b - a);

// 돌아다니는 선생님의 동선: 가운데 통로(hub) ↔ 둘레 지점(spots)
const ROAM = {
  미술: (xs) => ({ hub: { x: xs + 4.85, z: -4.6 }, spots: [{ x: xs + 1.7, z: -4.6 }, { x: xs + 7.9, z: -4.6 }, { x: xs + 4.85, z: -1.8 }, { x: xs + 4.85, z: -7.6 }] }),
  과학: (xs) => ({ hub: { x: xs + 4.85, z: -3.25 }, spots: [{ x: xs + 2.4, z: -3.25 }, { x: xs + 7.85, z: -3.25 }, { x: xs + 4.85, z: -5.75 }, { x: xs + 4.85, z: -0.9 }] }),
};
ROAM.가정 = ROAM.미술;

export function createTeachers({ scene, world }) {
  const active = new Map(); // 교실 id → 선생님 NPC
  let periodKey = null;
  let period = schoolNow();

  function refreshBoards() {
    for (const room of CLASSROOMS) {
      const sub = subjectOf(room, period);
      let text = null; // null = 기본 글
      if (sub) {
        const list = SUBJECTS[sub].boards;
        text = list[hash(`${room.id}|${period.key}|b`) % list.length];
      } else if (period.kind === 'class') {
        text = `${room.name}\n자습 시간\n조용히 공부해요`;
      }
      world.writeBoard(room.id, text);
    }
  }

  function spawn(room, sub) {
    const info = SUBJECTS[sub];
    const a = new Avatar({ id: `teacher-${room.id}`, name: info.name, look: info.look, color: info.color, occlude: true });
    const L = levelY(room.level);
    const t = { avatar: a, room, sub, L, nextMove: R(1, 4), nextTalk: R(1, 4), writing: 0, greeted: false };
    if (sub === '음악') {
      // 피아노 의자에 앉아 계심
      a.pos.set(room.xs + 1.5, L, -1.5);
      a.sitChair = { seatY: L + 0.5, ry: -Math.PI / 2 };
      a.root.rotation.y = -Math.PI / 2;
    } else if (ROAM[sub]) {
      const h = ROAM[sub](room.xs).hub;
      a.pos.set(h.x, L, h.z);
    } else {
      a.pos.set(room.xs + 0.85, L, -4.5);
      a.root.rotation.y = Math.PI / 2;
    }
    scene.add(a.root);
    active.set(room.id, t);
  }

  function despawn(id) {
    const t = active.get(id);
    if (!t) return;
    t.avatar.dispose();
    active.delete(id);
  }

  // 0.3초마다: 시간표 바뀌었는지, 내 근처에 어떤 선생님을 보여줄지
  function sync(me) {
    period = schoolNow();
    if (period.key !== periodKey) {
      periodKey = period.key;
      refreshBoards();
      for (const id of [...active.keys()]) despawn(id);
    }
    const k = levelOfY(me.pos.y);
    const inBuilding = me.pos.z < 1 && me.pos.z > -15;
    for (const room of CLASSROOMS) {
      const sub = subjectOf(room, period);
      const near = inBuilding && room.level === k && Math.abs((room.xs + room.xe) / 2 - me.pos.x) < 26;
      if (sub && near && !active.has(room.id)) spawn(room, sub);
      else if ((!sub || !near) && active.has(room.id)) despawn(room.id);
    }
    // 직원 NPC (시간과 관계없이 늘 자리에)
    for (const seat of world.staffSeats) {
      const room = CLASSROOMS.find((c) => c.id === seat.room) || { id: seat.room, level: seat.level, loose: true };
      const id = `staff-${seat.role}`;
      const near = inBuilding && room.level === k && Math.abs(seat.x - me.pos.x) < 26;
      if (near && !active.has(id)) spawnStaff(id, room, seat);
      else if (!near && active.has(id)) despawn(id);
    }
  }

  function spawnStaff(id, room, seat) {
    const info = STAFF[seat.role];
    const a = new Avatar({ id, name: info.name, look: info.look, color: info.color, occlude: true });
    a.pos.set(seat.x, levelY(room.level), seat.z);
    a.sitChair = { seatY: seat.seatY, ry: seat.ry };
    a.root.rotation.y = seat.ry;
    scene.add(a.root);
    active.set(id, { avatar: a, room, staff: true, seat, nextMove: 99, nextTalk: R(1, 4), writing: 0, greeted: false });
  }

  // 매 프레임: 걷기·말하기
  function update(dt, me, myRoomId, camPos) {
    for (const t of active.values()) {
      const a = t.avatar;
      const xs = t.room.xs;
      // 교실이 아닌 곳(도서실 등)은 가까이(5m) 오면 말 걸기
      const here = t.room.loose ? Math.hypot(me.pos.x - t.avatar.pos.x, me.pos.z - t.avatar.pos.z) < 5 && Math.abs(me.pos.y - t.avatar.pos.y) < 1.5 : myRoomId === t.room.id;
      t.nextMove -= dt;
      t.nextTalk -= dt;
      if (t.writing > 0) t.writing -= dt;

      if (t.staff) {
        // 직원 NPC: 자리에 앉아 계심
      } else if (ROAM[t.sub]) {
        // 실험대·모둠 책상 사이를 돌아다니며 봐 주심 (가운데 통로를 거쳐서)
        if (!a.target && t.nextMove <= 0) {
          const { hub, spots } = ROAM[t.sub](xs);
          const atHub = Math.hypot(a.pos.x - hub.x, a.pos.z - hub.z) < 0.3;
          a.target = atHub ? spots[Math.floor(Math.random() * spots.length)] : hub;
          a.path = [];
          t.nextMove = R(3, 7);
        }
      } else if (t.sub !== '음악') {
        // 교탁 앞을 왔다 갔다, 가끔 칠판에 판서
        if (!a.target && t.nextMove <= 0) {
          if (Math.random() < 0.35) {
            t.writing = 3;
            a.play('hand');
          } else {
            a.target = { x: xs + 0.85, z: R(-6.6, -2.9) };
            a.path = [];
          }
          t.nextMove = R(3, 8);
        }
      }

      a.update(dt, world.heightAt);
      // 카메라 바로 앞이면 이름표·말풍선이 화면을 가리지 않게 숨김
      if (camPos) {
        const dx = camPos.x - a.pos.x;
        const dy = camPos.y - (a.pos.y + 2.1);
        const dz = camPos.z - a.pos.z;
        a.tagHolder.visible = Math.hypot(dx, dy, dz) > 3.6;
      }
      if (!a.target) {
        // 서 있을 땐 학생 쪽을 보고, 판서할 땐 칠판 쪽을 봄
        if (t.staff) a.faceAngle(t.seat.ry, dt);
        else if (t.sub === '음악') a.faceAngle(-Math.PI / 2, dt);
        else if (ROAM[t.sub]) a.faceAngle(Math.atan2(me.pos.x - a.pos.x, me.pos.z - a.pos.z), dt * 0.5);
        else a.faceAngle(t.writing > 0 ? -Math.PI / 2 : Math.PI / 2, dt);
      }

      // 내가 같은 교실에 있을 때만 말풍선
      if (here) {
        const info = t.staff ? STAFF[t.seat.role] : SUBJECTS[t.sub];
        if (!t.greeted) {
          t.greeted = true;
          a.say(info.greet);
          t.nextTalk = R(6, 9);
        } else if (t.nextTalk <= 0) {
          a.say(info.lines[Math.floor(Math.random() * info.lines.length)]);
          t.nextTalk = R(8, 14);
        }
      } else t.greeted = false;
    }
  }

  return { sync, update, subjectOf: (room) => subjectOf(room, period) };
}
