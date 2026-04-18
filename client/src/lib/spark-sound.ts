import sparkSoundUrl from "@/assets/sounds/spark.mp3";

const STORAGE_KEY = "spark-sound-muted";
const DEFAULT_VOLUME = 0.4;

type AnyWindow = Window & { webkitAudioContext?: typeof AudioContext };

let ctx: AudioContext | null = null;
let bufferPromise: Promise<AudioBuffer | null> | null = null;
let unlocked = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || (window as AnyWindow).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    try { ctx = new Ctor(); } catch { ctx = null; }
  }
  return ctx;
}

function loadBuffer(): Promise<AudioBuffer | null> {
  if (bufferPromise) return bufferPromise;
  const c = getCtx();
  if (!c) return Promise.resolve(null);
  bufferPromise = fetch(sparkSoundUrl)
    .then((r) => r.arrayBuffer())
    .then((ab) => new Promise<AudioBuffer | null>((resolve) => {
      c.decodeAudioData(
        ab,
        (buf) => resolve(buf),
        () => resolve(null),
      );
    }))
    .catch(() => null);
  return bufferPromise;
}

export function isSparkSoundMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSparkSoundMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function playSparkSound(): void {
  if (isSparkSoundMuted()) return;
  const c = getCtx();
  if (!c) return;
  // Resume the AudioContext on first user interaction (mobile/Safari unlock).
  if (!unlocked || c.state === "suspended") {
    void c.resume().catch(() => undefined);
    unlocked = true;
  }
  void loadBuffer().then((buf) => {
    if (!buf) return;
    try {
      const src = c.createBufferSource();
      src.buffer = buf;
      const gain = c.createGain();
      gain.gain.value = DEFAULT_VOLUME;
      src.connect(gain).connect(c.destination);
      src.start(0);
    } catch {
      /* ignore */
    }
  });
}
