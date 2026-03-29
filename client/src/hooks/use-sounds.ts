import { useCallback, useEffect, useRef, useState } from "react";
import { Howl } from "howler";

const STORAGE_KEY = "sevco-sound-enabled";
const VOLUME = 0.25;

function createSynth(type: OscillatorType, freq: number, duration: number, rampTo?: number): () => void {
  return () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (rampTo) {
        osc.frequency.linearRampToValueAtTime(rampTo, ctx.currentTime + duration);
      }
      gain.gain.setValueAtTime(VOLUME, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
      setTimeout(() => ctx.close(), (duration + 0.1) * 1000);
    } catch {}
  };
}

const sounds = {
  click: createSynth("sine", 800, 0.08),
  success: createSynth("sine", 600, 0.2, 1200),
  error: createSynth("sine", 500, 0.25, 200),
  notification: createSynth("sine", 1000, 0.15, 1200),
  command: createSynth("square", 900, 0.1, 1100),
  toggle: createSynth("sine", 700, 0.06),
};

let prefersReducedMotion = false;
if (typeof window !== "undefined") {
  prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useSounds() {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "true";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(soundEnabled));
  }, [soundEnabled]);

  const play = useCallback(
    (key: keyof typeof sounds) => {
      if (!soundEnabled || prefersReducedMotion) return;
      sounds[key]();
    },
    [soundEnabled]
  );

  return {
    soundEnabled,
    setSoundEnabled,
    toggleSound: useCallback(() => setSoundEnabled((s) => !s), []),
    playClick: useCallback(() => play("click"), [play]),
    playSuccess: useCallback(() => play("success"), [play]),
    playError: useCallback(() => play("error"), [play]),
    playNotification: useCallback(() => play("notification"), [play]),
    playCommand: useCallback(() => play("command"), [play]),
    playToggle: useCallback(() => play("toggle"), [play]),
  };
}
