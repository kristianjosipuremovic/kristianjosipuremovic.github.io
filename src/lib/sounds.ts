/*
 * Futurist / Brutalist sound design system.
 *
 * Six programmatic Web Audio sounds, no external samples. Off by default,
 * toggled via a nav button, preference stored in localStorage, respects
 * prefers-reduced-motion. All AudioContext instantiation is lazy and
 * gated on a real user gesture so the browser's autoplay policy is honoured.
 *
 * Sound catalogue:
 *   mechanism    — relay click on nav hover
 *   factory      — mechanical thunk on button / nav click
 *   stoneSlide   — concrete slab grind on page navigation
 *   neonWoosh    — sine sweep on card hover
 *   terminalPing — clean A5 ping on form-field focus
 *   drone        — 2-second dystopian intro on the user's first visit
 */

export type SoundName =
  | 'mechanism'
  | 'factory'
  | 'stoneSlide'
  | 'neonWoosh'
  | 'terminalPing'
  | 'drone';

const STORAGE_KEY = 'kru.sounds.enabled';
const FIRST_VISIT_KEY = 'kru.sounds.firstVisitConsumed';

let audioCtx: AudioContext | null = null;
let globalListenersBound = false;
let dronePending = false;

/* Rain ambient — continuous filtered noise, fades in/out with the master toggle. */
let rainSource: AudioBufferSourceNode | null = null;
let rainGain: GainNode | null = null;
let rainGestureWaiter: (() => void) | null = null;
const RAIN_TARGET_GAIN = 0.012; // very faint — sub-conscious, "is it raining outside?"

/* ─────────────────────────────────────────────
   STATE: enabled / disabled, reduced motion
   ───────────────────────────────────────────── */

export function isSoundsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setSoundsEnabled(on: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
  } catch {
    /* ignore quota / privacy errors */
  }
}

function reducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ─────────────────────────────────────────────
   AudioContext: created lazily inside a user gesture
   ───────────────────────────────────────────── */

interface AudioContextWindow extends Window {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const w = window as AudioContextWindow;
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) {
    try {
      audioCtx = new Ctor();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {
      /* will simply not play */
    });
  }
  return audioCtx;
}

/* ─────────────────────────────────────────────
   PRIMITIVES
   ───────────────────────────────────────────── */

function makeNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buf = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/* ─────────────────────────────────────────────
   SOUND 1 — MECHANISM CLICK
   Short bandpassed white-noise burst. Relay click.
   ───────────────────────────────────────────── */
function playMechanism(ctx: AudioContext): void {
  const t = ctx.currentTime;
  const dur = 0.02; // 20ms
  const noise = ctx.createBufferSource();
  noise.buffer = makeNoiseBuffer(ctx, dur);

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = 1400; // centre of 800-2000 Hz
  bandpass.Q.value = 1.2;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.08, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);

  noise.connect(bandpass);
  bandpass.connect(gain);
  gain.connect(ctx.destination);

  noise.start(t);
  noise.stop(t + dur);
}

/* ─────────────────────────────────────────────
   SOUND 2 — FACTORY CONFIRM
   Heavy press stamp. Low sine + harmonic, sharp attack, exp decay.
   ───────────────────────────────────────────── */
function playFactory(ctx: AudioContext): void {
  const t = ctx.currentTime;
  const dur = 0.08;

  const fundamental = ctx.createOscillator();
  fundamental.type = 'sine';
  fundamental.frequency.value = 70; // 60–80 Hz

  const harmonic = ctx.createOscillator();
  harmonic.type = 'sine';
  harmonic.frequency.value = 180;

  const gFund = ctx.createGain();
  gFund.gain.setValueAtTime(0.15, t);
  gFund.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  const gHarm = ctx.createGain();
  gHarm.gain.setValueAtTime(0.075, t); // half gain
  gHarm.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  fundamental.connect(gFund).connect(ctx.destination);
  harmonic.connect(gHarm).connect(ctx.destination);

  fundamental.start(t);
  fundamental.stop(t + dur);
  harmonic.start(t);
  harmonic.stop(t + dur);
}

/* ─────────────────────────────────────────────
   SOUND 3 — STONE SLIDE
   Lowpass-swept noise: 800 → 100 Hz over 200ms.
   ───────────────────────────────────────────── */
function playStoneSlide(ctx: AudioContext): void {
  const t = ctx.currentTime;
  const dur = 0.2;

  const noise = ctx.createBufferSource();
  noise.buffer = makeNoiseBuffer(ctx, dur);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 0.7;
  filter.frequency.setValueAtTime(800, t);
  filter.frequency.exponentialRampToValueAtTime(100, t + dur);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  noise.connect(filter).connect(gain).connect(ctx.destination);
  noise.start(t);
  noise.stop(t + dur);
}

/* ─────────────────────────────────────────────
   SOUND 4 — NEON WOOSH
   Sine sweep 200 → 800 Hz over 120ms, with a 7-cent detuned chorus partner.
   ───────────────────────────────────────────── */
function playNeonWoosh(ctx: AudioContext): void {
  const t = ctx.currentTime;
  const dur = 0.12;

  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(200, t);
  osc1.frequency.exponentialRampToValueAtTime(800, t + dur);

  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.detune.value = 7; // +7 cents
  osc2.frequency.setValueAtTime(200, t);
  osc2.frequency.exponentialRampToValueAtTime(800, t + dur);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.06, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(t);
  osc1.stop(t + dur);
  osc2.start(t);
  osc2.stop(t + dur);
}

/* ─────────────────────────────────────────────
   SOUND 5 — TERMINAL PING
   Clean A5 sine, 60ms with a 5ms attack.
   ───────────────────────────────────────────── */
function playTerminalPing(ctx: AudioContext): void {
  const t = ctx.currentTime;
  const dur = 0.06;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 880; // A5

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.05, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur);
}

/* ─────────────────────────────────────────────
   SOUND 6 — DYSTOPIAN DRONE INTRO
   Two slightly detuned 55 / 58 Hz sines, 2-second triangle envelope.
   ───────────────────────────────────────────── */
function playDrone(ctx: AudioContext): void {
  const t = ctx.currentTime;
  const dur = 2.0;
  const peak = 0.08;

  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.value = 55;

  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.value = 58;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(peak, t + dur / 2);
  gain.gain.linearRampToValueAtTime(0, t + dur);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(t);
  osc1.stop(t + dur);
  osc2.start(t);
  osc2.stop(t + dur);
}

/* ─────────────────────────────────────────────
   RAIN AMBIENT
   A 3-second stereo noise buffer, looped behind a band-shaped EQ
   (highpass + lowpass) to fake the hiss of rain on the neon sign.
   Fades in over 1.5 s when sounds are enabled, fades out over 0.6 s.
   ───────────────────────────────────────────── */

function makeRainBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const len = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    // Slightly correlated noise — softer than pure white, less hissy.
    let prev = 0;
    for (let i = 0; i < len; i++) {
      const r = Math.random() * 2 - 1;
      prev = prev * 0.55 + r * 0.45;
      data[i] = prev;
    }
  }
  return buf;
}

function startRainAmbient(): void {
  if (rainSource) return;
  if (typeof window === 'undefined') return;
  if (!isSoundsEnabled()) return;
  if (reducedMotion()) return;
  const ctx = getCtx();
  if (!ctx || ctx.state !== 'running') return;

  try {
    const buf = makeRainBuffer(ctx, 3);
    const source = ctx.createBufferSource();
    source.buffer = buf;
    source.loop = true;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1200;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 7000;
    lp.Q.value = 0.5;

    const g = ctx.createGain();
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(RAIN_TARGET_GAIN, now + 1.5);

    source.connect(hp).connect(lp).connect(g).connect(ctx.destination);
    source.start();

    rainSource = source;
    rainGain = g;
  } catch {
    /* swallow */
  }
}

function stopRainAmbient(): void {
  if (!rainSource || !rainGain) return;
  const ctx = getCtx();
  if (!ctx) {
    rainSource = null;
    rainGain = null;
    return;
  }
  const source = rainSource;
  const g = rainGain;
  rainSource = null;
  rainGain = null;
  try {
    const now = ctx.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(g.gain.value, now);
    g.gain.linearRampToValueAtTime(0, now + 0.6);
    setTimeout(() => {
      try { source.stop(); source.disconnect(); g.disconnect(); } catch { /* ignore */ }
    }, 700);
  } catch {
    /* ignore */
  }
}

/**
 * Reconcile the rain ambient with the current toggle / motion state.
 * If sounds should be on, attempts to (re)start the loop. If sounds
 * are off or reduced-motion is set, fades it out. Idempotent.
 */
export function syncRainAmbient(): void {
  if (typeof window === 'undefined') return;
  if (isSoundsEnabled() && !reducedMotion()) {
    startRainAmbient();
  } else {
    stopRainAmbient();
  }
}

/**
 * Attempts to start rain immediately, falling back to a one-shot
 * gesture waiter if the AudioContext is still suspended (autoplay policy).
 */
export function ensureRainSync(): void {
  if (typeof window === 'undefined') return;
  syncRainAmbient();
  if (
    isSoundsEnabled() &&
    !reducedMotion() &&
    !rainSource &&
    !rainGestureWaiter
  ) {
    const fire = () => {
      document.removeEventListener('pointerdown', fire);
      document.removeEventListener('keydown', fire);
      rainGestureWaiter = null;
      syncRainAmbient();
    };
    rainGestureWaiter = fire;
    document.addEventListener('pointerdown', fire);
    document.addEventListener('keydown', fire);
  }
}

/* ─────────────────────────────────────────────
   PUBLIC: playSound — fire-and-forget dispatcher
   ───────────────────────────────────────────── */
export function playSound(name: SoundName): void {
  if (typeof window === 'undefined') return;
  if (!isSoundsEnabled()) return;
  if (reducedMotion()) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    switch (name) {
      case 'mechanism':    playMechanism(ctx); return;
      case 'factory':      playFactory(ctx); return;
      case 'stoneSlide':   playStoneSlide(ctx); return;
      case 'neonWoosh':    playNeonWoosh(ctx); return;
      case 'terminalPing': playTerminalPing(ctx); return;
      case 'drone':        playDrone(ctx); return;
    }
  } catch {
    /* swallow — audio failures must never block UI */
  }
}

/* ─────────────────────────────────────────────
   DRONE: only on the user's first ever visit
   ───────────────────────────────────────────── */
export function maybePlayDroneIntro(): void {
  if (typeof window === 'undefined') return;
  let consumed = false;
  try {
    consumed = window.localStorage.getItem(FIRST_VISIT_KEY) === '1';
  } catch {
    consumed = false;
  }
  if (consumed) return;

  // If sounds are off, do nothing yet — the drone will get a chance the moment
  // the user enables sounds (see wireToggleButton). Either way it only ever
  // fires once because we set the flag exactly when the drone actually plays.
  if (!isSoundsEnabled()) {
    dronePending = true;
    return;
  }

  const ctx = getCtx();
  if (!ctx || ctx.state === 'suspended') {
    // Browser autoplay policy: defer until a real gesture lands.
    dronePending = true;
    const fire = () => {
      document.removeEventListener('pointerdown', fire);
      document.removeEventListener('keydown', fire);
      maybePlayDroneIntro();
    };
    document.addEventListener('pointerdown', fire, { once: true });
    document.addEventListener('keydown', fire, { once: true });
    return;
  }

  try {
    window.localStorage.setItem(FIRST_VISIT_KEY, '1');
  } catch {
    /* ignore */
  }
  dronePending = false;
  playSound('drone');
}

/* ─────────────────────────────────────────────
   TOGGLE BUTTON wiring
   ───────────────────────────────────────────── */
export function wireToggleButton(btn: HTMLElement): void {
  if (btn.dataset.soundsWired === '1') return;
  btn.dataset.soundsWired = '1';

  const reflect = () => {
    const on = isSoundsEnabled();
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? 'Sounds on — click to mute' : 'Sounds off — click to enable');
  };
  reflect();

  btn.addEventListener('click', () => {
    const next = !isSoundsEnabled();
    setSoundsEnabled(next);
    reflect();
    if (next) {
      // Bootstrap the AudioContext on this real user gesture.
      const ctx = getCtx();
      if (ctx) {
        // Acknowledge with the factory thunk so the user hears that it worked.
        try {
          playFactory(ctx);
        } catch {
          /* ignore */
        }
      }
      if (dronePending) maybePlayDroneIntro();
    }
    // Start or stop the rain ambient in lockstep with the master toggle.
    syncRainAmbient();
  });
}

/* ─────────────────────────────────────────────
   PAGE WIRING: bind per-element sounds.
   Idempotent — uses data-snd-wired to avoid double-binding when
   View Transitions reuse the document.
   ───────────────────────────────────────────── */

function bind(el: Element, ev: string, sound: SoundName): void {
  const node = el as HTMLElement;
  const key = `${ev}:${sound}`;
  const wired = node.dataset.sndWired ?? '';
  if (wired.includes(key)) return;
  node.dataset.sndWired = wired ? `${wired},${key}` : key;
  el.addEventListener(ev, () => playSound(sound));
}

export function wireSoundsForCurrentPage(): void {
  if (typeof document === 'undefined') return;

  // Nav links → mechanism on hover, factory on click
  document.querySelectorAll('.nav-link, .overlay-link').forEach((el) => {
    bind(el, 'mouseenter', 'mechanism');
    bind(el, 'click', 'factory');
  });

  // Buttons → factory thunk on click
  document.querySelectorAll('.btn-primary, .btn-secondary').forEach((el) => {
    bind(el, 'click', 'factory');
  });

  // Research & project cards (and other landing chrome cards) → neon woosh on hover, factory on click
  document
    .querySelectorAll('.res-card, .proj-card, .card-link, .cat-card, .cert-card, .now-card')
    .forEach((el) => {
      bind(el, 'mouseenter', 'neonWoosh');
      bind(el, 'click', 'factory');
    });

  // Form fields → terminal ping on focus
  document
    .querySelectorAll('#contact-form input[type="text"], #contact-form input[type="email"], #contact-form textarea')
    .forEach((el) => {
      bind(el, 'focus', 'terminalPing');
    });
}

/* ─────────────────────────────────────────────
   GLOBAL: bind page-navigation stone slide (idempotent)
   ───────────────────────────────────────────── */
export function setupGlobalSoundListeners(): void {
  if (typeof document === 'undefined') return;
  if (globalListenersBound) return;
  globalListenersBound = true;

  // Astro View Transitions: fire stone slide before the new page mounts.
  document.addEventListener('astro:before-preparation', () => playSound('stoneSlide'));
}
