// 소리는 모두 브라우저에서 직접 합성합니다 (음원 파일 없음).
let ctx = null;

export function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// 첫 터치 때 오디오를 깨워둠 (모바일 브라우저 정책)
export function unlockAudio() {
  ac();
}

function bellNote(c, freq, start, vol, out) {
  // 종소리 느낌: 기본음 + 배음 몇 개, 천천히 사라짐
  [[1, 1], [2.0, 0.35], [3.01, 0.18], [4.2, 0.08]].forEach(([mul, amp]) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = freq * mul;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol * amp, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 2.6 / Math.sqrt(mul));
    o.connect(g).connect(out);
    o.start(start);
    o.stop(start + 2.8);
  });
}

// 학교 종소리 (딩-동-댕-동 / 딩-동-댕-동) 를 반복 재생. stop 함수를 반환.
// 진짜 학교 종소리 녹음 파일 (있으면 이걸로 재생)
let bellSample = null;
export function setBellSample(buf) {
  bellSample = buf;
}

export function playSchoolBell(loop = true) {
  const c = ac();
  if (!c) return () => {};
  if (bellSample) {
    const g = c.createGain();
    g.gain.value = 0.8;
    g.connect(c.destination);
    let stopped = false;
    let src = null;
    let timer = null;
    const once = () => {
      if (stopped) return;
      src = c.createBufferSource();
      src.buffer = bellSample;
      src.connect(g);
      src.start();
      if (loop) timer = setTimeout(once, (bellSample.duration + 3) * 1000);
    };
    once();
    return () => {
      stopped = true;
      clearTimeout(timer);
      g.gain.setTargetAtTime(0, c.currentTime, 0.2);
      setTimeout(() => {
        try {
          src?.stop();
        } catch {
          /* 이미 끝남 */
        }
        g.disconnect();
      }, 1200);
    };
  }
  const out = c.createGain();
  out.gain.value = 0.5;
  out.connect(c.destination);
  // E5 C5 D5 G4 / G4 D5 E5 C5
  const seq = [659.25, 523.25, 587.33, 392.0, 392.0, 587.33, 659.25, 523.25];
  let stopped = false;
  let timer = null;
  const round = () => {
    if (stopped) return;
    const t0 = c.currentTime + 0.05;
    seq.forEach((f, i) => bellNote(c, f, t0 + i * 0.75 + (i >= 4 ? 0.5 : 0), 0.35, out));
    if (loop) timer = setTimeout(round, 9000);
  };
  round();
  return () => {
    stopped = true;
    clearTimeout(timer);
    out.gain.setTargetAtTime(0, c.currentTime, 0.2);
    setTimeout(() => out.disconnect(), 1500);
  };
}

// 박수 소리 (짧은 잡음을 여러 번)
export function playClap(volume = 1) {
  const c = ac();
  if (!c || volume <= 0.02) return;
  const len = Math.floor(c.sampleRate * 0.12);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
  for (let k = 0; k < 8; k++) {
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1300 + Math.random() * 600;
    f.Q.value = 0.8;
    const g = c.createGain();
    g.gain.value = 0.6 * volume;
    src.connect(f).connect(g).connect(c.destination);
    src.start(c.currentTime + 0.05 + k * 0.26 + Math.random() * 0.03);
  }
}

// 말풍선 뜰 때 작은 '띵' 소리
export function playPop(volume = 0.5) {
  const c = ac();
  if (!c || volume <= 0.02) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.setValueAtTime(880, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(1320, c.currentTime + 0.08);
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.15 * volume, c.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.25);
  o.connect(g).connect(c.destination);
  o.start();
  o.stop(c.currentTime + 0.3);
}

// 피아노 한 음 (midi 번호). 배음 몇 개 + 망치 치는 소리 + 천천히 사라짐
export function playPianoNote(midi, volume = 0.6) {
  const c = ac();
  if (!c || volume <= 0.01) return;
  const t = c.currentTime;
  const f = 440 * 2 ** ((midi - 69) / 12);
  const out = c.createGain();
  out.gain.value = volume * 0.5;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(Math.min(9000, f * 9), t);
  lp.frequency.exponentialRampToValueAtTime(Math.max(400, f * 2), t + 1.2);
  lp.connect(out).connect(c.destination);
  const len = 2.2 - Math.min(1.2, (midi - 48) / 30);
  [[1, 1], [2, 0.45], [3, 0.2], [4, 0.1], [5.02, 0.05]].forEach(([mul, amp]) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = mul === 1 ? 'triangle' : 'sine';
    o.frequency.value = f * mul;
    o.detune.value = (Math.random() - 0.5) * 4;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(amp, t + 0.006);
    g.gain.exponentialRampToValueAtTime(amp * 0.35, t + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len / Math.sqrt(mul));
    o.connect(g).connect(lp);
    o.start(t);
    o.stop(t + len + 0.1);
  });
  // 망치 소리 (아주 짧은 잡음)
  const n = c.createBuffer(1, Math.floor(c.sampleRate * 0.03), c.sampleRate);
  const d = n.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const ns = c.createBufferSource();
  ns.buffer = n;
  const ng = c.createGain();
  ng.gain.value = 0.08;
  ns.connect(ng).connect(lp);
  ns.start(t);
}
