import { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import type { MusicTrack } from "@shared/schema";

type MusicPlayerContextType = {
  currentTrack: MusicTrack | null;
  queue: MusicTrack[];
  isPlaying: boolean;
  isOpen: boolean;
  minimized: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  currentTime: number;
  duration: number;
  volume: number;
  playTrack: (track: MusicTrack, newQueue?: MusicTrack[]) => void;
  addToQueue: (track: MusicTrack) => void;
  pause: () => void;
  resume: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  setPosition: (pos: { x: number; y: number }) => void;
  setSize: (size: { width: number; height: number }) => void;
  minimize: () => void;
  restore: () => void;
  close: () => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
};

const MusicPlayerContext = createContext<MusicPlayerContextType | null>(null);

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [queue, setQueue] = useState<MusicTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [position, setPositionState] = useState({ x: Math.max(20, window.innerWidth - 420), y: Math.max(20, window.innerHeight - 300) });
  const [size, setSizeState] = useState({ width: 380, height: 240 });
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<MusicTrack[]>([]);
  const streamIncrementedRef = useRef<Set<number>>(new Set());

  function syncQueue(newQueue: MusicTrack[]) {
    queueRef.current = newQueue;
    setQueue(newQueue);
  }

  async function loadTrack(track: MusicTrack, remainingQueue: MusicTrack[], audioEl?: HTMLAudioElement) {
    const audio = audioEl ?? audioRef.current;
    if (!audio) return;

    const isPrivatePath = track.fileUrl && !track.fileUrl.startsWith("http://") && !track.fileUrl.startsWith("https://") && !track.fileUrl.startsWith("/images/");
    let src = track.fileUrl;
    if (isPrivatePath) {
      try {
        const res = await fetch(`/api/music/tracks/${track.id}/signed-url`);
        if (res.ok) {
          const data = await res.json();
          if (data.signedUrl) src = data.signedUrl;
        }
      } catch {
        // fall back to raw fileUrl
      }
    }

    audio.src = src;
    audio.load();
    audio.play().catch(() => {});
    setCurrentTrack(track);
    syncQueue(remainingQueue);
    setCurrentTime(0);
    setDuration(0);
    setIsOpen(true);
    setMinimized(false);

    if (!streamIncrementedRef.current.has(track.id)) {
      streamIncrementedRef.current.add(track.id);
      apiRequest("POST", `/api/music/tracks/${track.id}/stream`).catch(() => {});
    }
  }

  useEffect(() => {
    const audio = new Audio();
    audio.volume = volume;
    audioRef.current = audio;

    audio.addEventListener("timeupdate", () => setCurrentTime(audio.currentTime));
    audio.addEventListener("durationchange", () => setDuration(isFinite(audio.duration) ? audio.duration : 0));
    audio.addEventListener("ended", () => {
      const q = queueRef.current;
      if (q.length > 0) {
        const [next, ...rest] = q;
        loadTrack(next, rest, audio);
      } else {
        setIsPlaying(false);
      }
    });
    audio.addEventListener("play", () => setIsPlaying(true));
    audio.addEventListener("pause", () => setIsPlaying(false));

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  const playTrack = useCallback((track: MusicTrack, newQueue?: MusicTrack[]) => {
    streamIncrementedRef.current.delete(track.id);
    loadTrack(track, newQueue ?? []);
  }, []);

  const addToQueue = useCallback((track: MusicTrack) => {
    const updated = [...queueRef.current, track];
    syncQueue(updated);
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    audioRef.current?.play().catch(() => {});
  }, []);

  const nextTrack = useCallback(() => {
    const q = queueRef.current;
    if (q.length === 0) return;
    const [next, ...rest] = q;
    loadTrack(next, rest);
  }, []);

  const prevTrack = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  }, []);

  const setPosition = useCallback((pos: { x: number; y: number }) => {
    setPositionState(pos);
  }, []);

  const setSize = useCallback((sz: { width: number; height: number }) => {
    setSizeState(sz);
  }, []);

  const minimize = useCallback(() => setMinimized(true), []);
  const restore = useCallback(() => setMinimized(false), []);
  const close = useCallback(() => {
    audioRef.current?.pause();
    setIsOpen(false);
    setCurrentTrack(null);
    setIsPlaying(false);
    syncQueue([]);
  }, []);

  return (
    <MusicPlayerContext.Provider value={{
      currentTrack, queue, isPlaying, isOpen, minimized, position, size,
      currentTime, duration, volume,
      playTrack, addToQueue, pause, resume, nextTrack, prevTrack,
      seek, setVolume, setPosition, setSize, minimize, restore, close,
      audioRef,
    }}>
      {children}
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const ctx = useContext(MusicPlayerContext);
  if (!ctx) throw new Error("useMusicPlayer must be used inside MusicPlayerProvider");
  return ctx;
}
