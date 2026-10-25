/* Inside the DB Speed app (iframe): show only the clock and controls. The app lists the exercises with demo videos. */
(function(){let inFrame=false;try{inFrame=window.self!==window.top}catch(e){inFrame=true}if(inFrame||/[?&]embed\b/.test(location.search))document.documentElement.classList.add('embed')})();
/* Gym circuit timer engine. Each page sets window.CIRCUIT (see the week pages) and loads
   voices.js + this file. Everyone works at the same time at different stations, so the
   screen calls structure (work, rest, rotate, round), never a specific exercise. */
(function () {
  const C = window.CIRCUIT;
  const $ = id => document.getElementById(id);

  /* ---------------- timeline ---------------- */
  // cue: 'start' | 'down' | 'change' | 'move' | 'switch' | 'lap' | 'tabata' | null
  function S(phase, secs, cue, now, next, where) { return { phase, secs, cue, now, next: next || '', where: where || '' }; }
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

  function buildSteps(c) {
    const p = c.params, G = c.groups.length, out = [];
    out.push(S('ready', c.getReady || 10, null, c.startText || 'Go to your starting spot', '', c.firstWhere || ''));
    const f = c.format;

    if (f === 'pods') {
      c.groups.forEach((g, gi) => {
        const n = g.items.length;
        for (let r = 1; r <= p.rounds; r++) for (let si = 0; si < n; si++) {
          const lastSt = si === n - 1, lastR = r === p.rounds;
          out.push(S('work', p.work, 'start', 'Station ' + (si + 1) + ' of ' + n, '', 'Pod ' + (gi + 1) + ' of ' + G + ' · Round ' + r + ' of ' + p.rounds));
          if (lastSt && lastR) { if (gi < G - 1) out.push(S('change', p.change, 'change', 'Move to your next pod', 'Pod ' + (gi + 2) + ' of ' + G + ' starts next', 'Pod ' + (gi + 2) + ' of ' + G + ' · Round 1 of ' + p.rounds)); }
          else out.push(S('rest', p.rest, 'down', 'Rotate to your next station', lastSt ? 'Round ' + (r + 1) + ' starts next' : '', 'Pod ' + (gi + 1) + ' of ' + G + ' · Round ' + (lastSt ? r + 1 : r) + ' of ' + p.rounds));
        }
      });
    } else if (f === 'stations') {
      const n = c.groups[0].items.length;
      for (let st = 1; st <= n; st++) for (let s = 1; s <= p.sets; s++) {
        out.push(S('work', p.work, 'start', 'Set ' + s + ' of ' + p.sets, '', 'Station ' + st + ' of ' + n));
        if (s < p.sets) out.push(S('rest', p.rest, 'down', 'Stay at this station', 'Set ' + (s + 1) + ' next', 'Station ' + st + ' of ' + n));
        else if (st < n) out.push(S('change', p.move, 'move', 'Move to your next station', 'Station ' + (st + 1) + ' of ' + n + ' starts next', 'Station ' + (st + 1) + ' of ' + n));
      }
    } else if (f === 'supersets') {
      c.groups.forEach((g, gi) => {
        for (let r = 1; r <= p.rounds; r++) {
          const where = 'Superset ' + (gi + 1) + ' of ' + G + ' · Round ' + r + ' of ' + p.rounds;
          out.push(S('work', p.work, 'start', 'Exercise 1 of 2', 'Switch to exercise 2 next', where));
          out.push(S('work', p.work, 'switch', 'Exercise 2 of 2', '', where));
          if (r < p.rounds) out.push(S('rest', p.rest, 'down', 'Rest', 'Round ' + (r + 1) + ' starts next', 'Superset ' + (gi + 1) + ' of ' + G + ' · Round ' + (r + 1) + ' of ' + p.rounds));
          else if (gi < G - 1) out.push(S('change', p.change, 'change', 'Move to your next superset', 'Superset ' + (gi + 2) + ' of ' + G + ' starts next', 'Superset ' + (gi + 2) + ' of ' + G + ' · Round 1 of ' + p.rounds));
        }
      });
    } else if (f === 'amrap') {
      c.groups.forEach((g, gi) => {
        out.push(S('work', p.mins * 60, 'start', 'AMRAP: as many rounds as you can', 'Count your rounds', 'Pod ' + (gi + 1) + ' of ' + G));
        if (gi < G - 1) out.push(S('change', p.change, 'change', 'Log your rounds, move to your next pod', 'Pod ' + (gi + 2) + ' of ' + G + ' starts next', 'Pod ' + (gi + 2) + ' of ' + G));
      });
    } else if (f === 'emom') {
      c.groups.forEach((g, gi) => {
        const k = g.items.length;
        for (let m = 1; m <= p.mins; m++) {
          out.push(S('work', 60, 'start', 'Exercise ' + ((m - 1) % k + 1) + ' of ' + k, 'Finish your reps, rest the rest of the minute', 'Pod ' + (gi + 1) + ' of ' + G + ' · Minute ' + m + ' of ' + p.mins));
        }
        if (gi < G - 1) out.push(S('change', p.change, 'change', 'Move to your next pod', 'Pod ' + (gi + 2) + ' of ' + G + ' starts next', 'Pod ' + (gi + 2) + ' of ' + G + ' · Minute 1 of ' + p.mins));
      });
    } else if (f === 'manual') {
      const unit = p.unit || 'Pair';
      c.groups.forEach((g, gi) => {
        for (let r = 1; r <= p.rounds; r++) {
          const where = unit + ' ' + (gi + 1) + ' of ' + G + ' · Round ' + r + ' of ' + p.rounds;
          const s = S('work', null, 'start', p.workText || 'Do your set', 'Tap Rest when your group is done', where);
          s.manual = true; out.push(s);
          if (r < p.rounds) out.push(S('rest', p.rest, 'down', 'Rest', 'Round ' + (r + 1) + ' starts next', unit + ' ' + (gi + 1) + ' of ' + G + ' · Round ' + (r + 1) + ' of ' + p.rounds));
          else if (gi < G - 1) out.push(S('change', p.rest, 'change', 'Rest, then move to your next ' + unit.toLowerCase(), unit + ' ' + (gi + 2) + ' of ' + G + ' starts next', unit + ' ' + (gi + 2) + ' of ' + G + ' · Round 1 of ' + p.rounds));
        }
      });
    } else if (f === 'laps') {
      const n = c.groups[0].items.length;
      for (let L = 1; L <= p.laps; L++) for (let st = 1; st <= n; st++) {
        out.push(S('work', p.work, 'start', 'Station ' + st + ' of ' + n, '', 'Lap ' + L + ' of ' + p.laps));
        if (st < n) out.push(S('rest', p.rest, 'down', 'Rotate to your next station', '', 'Lap ' + L + ' of ' + p.laps));
        else if (L < p.laps) out.push(S('change', p.lapBreak, 'lap', 'Lap done, take a break', 'Lap ' + (L + 1) + ' of ' + p.laps + ' starts next', 'Lap ' + (L + 1) + ' of ' + p.laps));
      }
    } else if (f === 'tabata') {
      c.groups.forEach((g, gi) => {
        for (let r = 1; r <= p.rounds; r++) {
          out.push(S('work', p.work, 'start', 'Exercise ' + ((r - 1) % g.items.length + 1) + ' of ' + g.items.length, '', 'Tabata ' + (gi + 1) + ' of ' + G + ' · Round ' + r + ' of ' + p.rounds));
          if (r < p.rounds) out.push(S('rest', p.rest, 'down', 'Rest', 'Exercise ' + (r % g.items.length + 1) + ' next', 'Tabata ' + (gi + 1) + ' of ' + G + ' · Round ' + (r + 1) + ' of ' + p.rounds));
          else if (gi < G - 1) out.push(S('change', p.between, 'tabata', 'Tabata done, move to your next one', 'Tabata ' + (gi + 2) + ' of ' + G + ' starts next', 'Tabata ' + (gi + 2) + ' of ' + G + ' · Round 1 of ' + p.rounds));
        }
      });
    } else if (f === 'race') {
      c.groups.forEach((g, gi) => {
        const k = g.items.length;
        for (let r = 1; r <= p.rounds; r++) {
          const where = 'Piece ' + (gi + 1) + ' of ' + G + ' · Round ' + r + ' of ' + p.rounds;
          for (let b = 0; b < k; b++) out.push(S('work', p.block, b === 0 ? 'start' : 'switch', 'Exercise ' + (b + 1) + ' of ' + k, b < k - 1 ? 'Switch at the cue, no rest' : 'Last one, push', where));
          if (r < p.rounds) out.push(S('rest', p.rest, 'down', 'Rest', 'Round ' + (r + 1) + ' starts next', 'Piece ' + (gi + 1) + ' of ' + G + ' · Round ' + (r + 1) + ' of ' + p.rounds));
          else if (gi < G - 1) out.push(S('change', p.rest, 'change', 'Rest, then move to your next piece', 'Piece ' + (gi + 2) + ' of ' + G + ' starts next', 'Piece ' + (gi + 2) + ' of ' + G + ' · Round 1 of ' + p.rounds));
        }
      });
    }
    return out;
  }

  /* ---------------- sound ---------------- */
  let ctx = null;
  function audioInit() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'transient'; } catch (e) {}
    if (!ctx) { const A = window.AudioContext || window.webkitAudioContext; if (A) ctx = new A(); }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    loadClips();
  }
  function tone(freq, dur, when = 0, vol = 0.9, type = 'square') {
    if (!ctx) return;
    const t = ctx.currentTime + when, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.setValueAtTime(vol, t + Math.max(0.02, dur - 0.03));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function bell(when = 0, base = 820, ring = 1.6, vol = 0.8) {
    if (!ctx) return;
    const t = ctx.currentTime + when;
    [[1, 1], [2.32, 0.6], [4.25, 0.35], [6.63, 0.2]].forEach(([m, a]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = base * m;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol * a, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + ring / m * 1.4);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + ring * 1.5);
    });
  }
  function whistle(dur, when = 0, vol = 0.7) {
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator(), lfo = ctx.createOscillator(), depth = ctx.createGain(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 2900; lfo.frequency.value = 32; depth.gain.value = 180;
    lfo.connect(depth).connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.setValueAtTime(vol, t + dur - 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination); o.start(t); lfo.start(t); o.stop(t + dur + 0.02); lfo.stop(t + dur + 0.02);
  }
  const THEMES = {
    classic: { name: 'Beeps', hint: 'Beeps: 3 short before each change, long = start, double = down.',
      tick: () => tone(880, 0.12), go: () => tone(1320, 0.7), rest: () => { tone(660, 0.18); tone(660, 0.18, 0.26); },
      change: () => { tone(520, 0.3); tone(780, 0.3, 0.35); }, sw: () => { tone(1100, 0.12); tone(1320, 0.3, 0.16); },
      done: () => { tone(880, 0.25); tone(1100, 0.25, 0.3); tone(1320, 0.6, 0.6); } },
    bell: { name: 'Bell', hint: 'Bell: one bell = start, two = down, three = move on.',
      tick: () => tone(1200, 0.06, 0, 0.5, 'triangle'), go: () => bell(), rest: () => { bell(0, 820, 0.9); bell(0.35, 820, 1.2); },
      change: () => { bell(0); bell(0.4); bell(0.8); }, sw: () => bell(0, 1040, 0.8),
      done: () => { for (let i = 0; i < 5; i++) bell(i * 0.3, 820, 1.4); } },
    whistle: { name: 'Whistle', hint: 'Whistle: long = start, two short = down.',
      tick: () => whistle(0.08), go: () => whistle(0.75), rest: () => { whistle(0.18); whistle(0.18, 0.28); },
      change: () => { whistle(0.18); whistle(0.18, 0.28); whistle(0.6, 0.56); }, sw: () => { whistle(0.12); whistle(0.4, 0.2); },
      done: () => { whistle(0.25); whistle(0.25, 0.35); whistle(0.9, 0.7); } }
  };
  const VOICE_NAMES = { martin: 'Martin', anime: 'Anime Girl' };
  const SOUND_ORDER = ['martin', 'anime', 'classic', 'bell', 'whistle'];
  let soundMode = 'martin';
  try { soundMode = localStorage.getItem('gymTimerSound') || 'martin'; } catch (e) {}
  if (!SOUND_ORDER.includes(soundMode)) soundMode = 'martin';
  const isVoice = () => !!VOICE_NAMES[soundMode];
  const beep = () => THEMES[soundMode] || THEMES.classic;

  const buffers = {};
  let clipsLoading = null;
  function loadClips() {
    if (!ctx || clipsLoading || !window.VOICES) return clipsLoading;
    const jobs = [];
    Object.keys(window.VOICES).forEach(v => Object.keys(window.VOICES[v]).forEach(k => {
      const bin = atob(window.VOICES[v][k].split(',')[1]);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      jobs.push(new Promise(res => ctx.decodeAudioData(bytes.buffer, b => { buffers[v + ':' + k] = b; res(); }, () => res())));
    }));
    clipsLoading = Promise.all(jobs);
    return clipsLoading;
  }
  function clip(k, when = 0) {
    const b = buffers[soundMode + ':' + k];
    if (!ctx || !b) return 0;
    const src = ctx.createBufferSource();
    src.buffer = b; src.connect(ctx.destination); src.start(ctx.currentTime + when);
    return b.duration;
  }
  function say(keys) {
    let t = 0, any = false;
    keys.forEach(k => { const d = clip(k, t); if (d) { any = true; t += d + 0.12; } });
    return any;
  }
  const CUE_WORDS = { start: ['start'], down: ['down'], change: ['down', 'changepods'], move: ['down', 'nextstation'],
    switch: ['switch'], lap: ['down', 'nextlap'], tabata: ['down', 'nexttabata'], ready: ['ready'], done: ['done'] };
  const CUE_BEEP = { start: 'go', down: 'rest', change: 'change', move: 'change', switch: 'sw', lap: 'change', tabata: 'change', ready: 'tick', done: 'done' };
  function cue(name) {
    if (!name) return;
    if (isVoice() && say(CUE_WORDS[name])) return;
    const fn = beep()[CUE_BEEP[name]]; if (fn) fn();
  }

  /* ---------------- wake lock ---------------- */
  let wake = null;
  async function keepAwake() { try { if ('wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) { wake = null; } }
  function letSleep() { try { if (wake) wake.release(); } catch (e) {} wake = null; }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && running) keepAwake(); });

  /* ---------------- state + render ---------------- */
  let steps = [], idx = 0, running = false, stepEnd = 0, stepStart = 0, pausedLeft = null, pausedElapsed = 0, lastShown = null, timer = null;
  const fmt = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const fmtUp = s => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  function remainFrom(i) { let t = 0, manual = 0; steps.slice(i).forEach(s => s.manual ? manual++ : (t += s.secs)); return { t, manual }; }

  function render(v) {
    const s = steps[idx], board = $('board');
    if (!s) {
      board.dataset.phase = 'done';
      $('phase').textContent = 'Done'; $('clock').textContent = '0:00';
      $('now').textContent = 'Circuit complete'; $('next').textContent = 'Great work.'; $('where').textContent = '';
      $('bar').style.width = '100%'; $('remain').textContent = '';
      return;
    }
    board.dataset.phase = s.phase === 'ready' ? 'idle' : s.phase;
    $('phase').textContent = s.manual ? 'Go' : ({ ready: 'Get ready', work: 'Work', rest: 'Rest', change: s.cue === 'move' ? 'Next station' : s.cue === 'lap' ? 'Lap break' : s.cue === 'tabata' ? 'Next Tabata' : 'Move on' })[s.phase];
    $('clock').textContent = s.manual ? fmtUp(v) : fmt(v);
    $('now').textContent = s.now; $('next').textContent = s.next; $('where').textContent = s.where;
    $('bar').style.width = s.manual ? '0%' : (100 * (1 - v / s.secs)).toFixed(1) + '%';
    const rem = remainFrom(idx + 1), left = rem.t + (s.manual ? 0 : v);
    $('remain').textContent = fmt(left) + (rem.manual || s.manual ? ' + sets' : '') + ' left';
    $('go').textContent = s.manual && running ? 'Rest ▶' : running ? 'Pause' : (idx === 0 && pausedLeft === null ? 'Start' : 'Resume');
  }

  function startStep(i, withCue = true) {
    idx = i; const s = steps[idx];
    if (!s) { finish(); return; }
    stepStart = performance.now();
    stepEnd = s.manual ? 0 : stepStart + s.secs * 1000;
    lastShown = null;
    if (withCue) cue(s.cue);
    render(s.manual ? 0 : s.secs);
  }
  function loop() {
    if (!running) return;
    const s = steps[idx];
    if (s && s.manual) { const el = (performance.now() - stepStart) / 1000; const w = Math.floor(el); if (w !== lastShown) { lastShown = w; render(el); } return; }
    const left = (stepEnd - performance.now()) / 1000, whole = Math.ceil(left);
    if (whole !== lastShown) {
      if (whole <= 3 && whole >= 1 && lastShown !== null) {
        const nx = steps[idx + 1], startsWork = nx && nx.cue === 'start';
        if (isVoice()) { if (whole === 3 && startsWork) cue('ready'); }
        else if (nx && nx.cue !== 'switch') beep().tick();
      }
      lastShown = whole; render(left);
    }
    if (left <= 0) startStep(idx + 1);
  }
  function finish() { running = false; clearInterval(timer); letSleep(); idx = steps.length; cue('done'); render(0); $('go').disabled = true; $('go').textContent = 'Start'; }
  function play() {
    audioInit(); keepAwake();
    if (idx >= steps.length) return;
    running = true;
    const s = steps[idx];
    if (pausedLeft !== null) {
      if (s.manual) stepStart = performance.now() - pausedElapsed * 1000;
      else stepEnd = performance.now() + pausedLeft * 1000;
      pausedLeft = null;
    } else startStep(idx);
    clearInterval(timer); timer = setInterval(loop, 100);
    render(s.manual ? (performance.now() - stepStart) / 1000 : (stepEnd - performance.now()) / 1000);
  }
  function pause() {
    running = false; clearInterval(timer); letSleep();
    const s = steps[idx];
    pausedElapsed = s.manual ? (performance.now() - stepStart) / 1000 : 0;
    pausedLeft = s.manual ? 0 : Math.max(0, (stepEnd - performance.now()) / 1000);
    render(s.manual ? pausedElapsed : pausedLeft);
  }
  function primary() {
    const s = steps[idx];
    if (running && s && s.manual) { startStep(idx + 1); return; }
    running ? pause() : play();
  }
  function jump(d) {
    audioInit();
    const target = Math.min(Math.max(idx + d, 0), steps.length - 1);
    if (running) startStep(target, true);
    else {
      idx = target; const s = steps[idx];
      pausedLeft = s.manual ? 0 : s.secs; pausedElapsed = 0; render(s.manual ? 0 : s.secs);
      (clipsLoading || Promise.resolve()).then(() => cue(s.cue));
    }
  }
  function reset() { running = false; clearInterval(timer); letSleep(); idx = 0; pausedLeft = null; $('go').disabled = false; render(steps[0].secs); }

  /* ---------------- plan below the timer ---------------- */
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  function renderPlan(c) {
    const total = steps.reduce((a, s) => a + (s.secs || 0), 0);
    const manual = steps.some(s => s.manual);
    $('plan-title').textContent = c.week + ' · Day 4 circuit';
    $('plan-desc').textContent = c.summary + '. ' + (manual ? 'Timed rests total about ' : 'About ') + Math.round(total / 60) + ' minutes' + (manual ? ', plus your sets.' : ', including a ' + (c.getReady || 10) + '-second countdown.') + (c.howTo ? ' ' + c.howTo : '');
    $('groups').innerHTML = c.groups.map(g =>
      '<div class="group"><h3>' + esc(g.label) + '</h3><ol>' +
      g.items.map(it => '<li><b>' + esc(it.code) + '</b><span>' + esc(it.name) + (it.rx || it.note ? '<small>' + esc([it.rx, it.note].filter(Boolean).join(' · ')) + '</small>' : '') + '</span></li>').join('') +
      '</ol>' + (g.meta ? '<div class="meta">' + esc(g.meta) + '</div>' : '') + '</div>').join('');
  }

  /* ---------------- boot ---------------- */
  steps = buildSteps(C);
  window.__steps = steps; // handy for checking a circuit from the console
  $('wk').firstChild.textContent = C.team + ' · ' + C.week + ' · Day 4';
  $('sum').textContent = C.date + ' · ' + C.summary;
  document.title = C.team + ' ' + C.week + ' · Day 4 Timer';
  renderPlan(C);
  render(steps[0].secs);
  $('go').addEventListener('click', primary);
  $('skip').addEventListener('click', () => jump(1));
  $('back').addEventListener('click', () => jump(-1));
  $('reset').addEventListener('click', reset);
  const showSound = () => {
    $('sound').textContent = VOICE_NAMES[soundMode] || THEMES[soundMode].name;
    $('hint').textContent = 'Volume up (on iPhone, silent mode off). ' + (isVoice() ? 'Voice: "Ready" 3 seconds before work, then "Start" and "Down".' : THEMES[soundMode].hint) + ' Tap the sound button to try another.';
  };
  $('sound').addEventListener('click', () => {
    soundMode = SOUND_ORDER[(SOUND_ORDER.indexOf(soundMode) + 1) % SOUND_ORDER.length];
    try { localStorage.setItem('gymTimerSound', soundMode); } catch (e) {}
    audioInit(); showSound();
    if (isVoice()) (clipsLoading || Promise.resolve()).then(() => cue('ready')); else beep().go();
  });
  showSound();
  document.addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); primary(); } });
})();
