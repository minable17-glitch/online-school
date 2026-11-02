# 온라인 학교 🏫

친구들과 함께 아바타로 걸어 다니는 2000년대 감성 3D 온라인 학교.
(새싹책방과는 완전히 분리된 별도 프로젝트입니다.)

- 주소: https://minable17-glitch.github.io/online-school/
- `?room=우리반` 같은 방 이름끼리 함께 보임 · `&class=2-3` 그 교실에서 시작 · `&teacher=1` 선생님 이름표
- 점검용: `?debug=1&time=24` (게임 속 하루 중 24분째로 시각 바꾸기)
- 층 이동: 계단을 누르거나 계단 근처 ⬆⬇ 버튼 · 교실 벽을 누르면 가까운 문으로 들어감
- 한 방(인스턴스) 최대 50명, 꽉 차면 2번 방·3번 방으로 자동 배정 (`&instance=2` 로 직접 고르기)

## 들어 있는 것
3층 본관(층마다 교실, 양쪽 계단, 중앙현관·교무실·도서실, 음악실·미술실, 옥상), 흙 운동장(축구 · 청팀/백팀 점수),
매점, 체육관(농구 슛), 급식실(급식 받기), NPC 선생님(수학·국어·음악·미술, 자습 교실도 있음),
게임 속 짧은 시간표(1시간에 하루: 수업 6분 · 쉬는 시간 2분 · 점심 8분), 아바타 꾸미기, 장소별 주변 소리.

## 파일
`src/main.js`(입력·카메라·동기화) · `world.js`(건물·운동장) · `pathfind.js`(층별 길찾기·계단) · `avatar.js` ·
`teachers.js`(NPC 선생님) · `soccer.js` · `schedule.js`(시간표·급식) · `net.js`(실시간 연결) · `audio.js`·`ambience.js`(소리 합성)

## 친구들과 함께 보이게 하기 (선택)
온라인 학교 전용 Supabase 무료 프로젝트를 만들고, 이 저장소의
Settings → Secrets and variables → Actions → **Variables** 에
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 를 넣은 뒤 Actions 에서 배포를 다시 실행하면 됩니다.
DB 테이블은 쓰지 않고 실시간 방송(Realtime)만 씁니다. 값이 없으면 혼자 모드로 동작합니다.

## 개발
```
npm install
npm run dev
```
