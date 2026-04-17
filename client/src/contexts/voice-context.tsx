import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

type Peer = {
  clientId: string;
  userId: string | null;
  username: string | null;
  pc: RTCPeerConnection;
  stream: MediaStream;
  audioEl: HTMLAudioElement;
  micMuted: boolean;
  speaking: boolean;
};

export type RosterEntry = {
  clientId: string;
  userId: string | null;
  username: string | null;
  micMuted: boolean;
  speaking: boolean;
  isSelf?: boolean;
};

export type LiveAnnouncement = {
  authorId: string;
  authorName: string | null;
  title: string;
  startedAt: number;
};

type VoicePrefs = {
  pttKey: string;
  inputDeviceId: string | null;
  outputDeviceId: string | null;
  inputVolume: number;
  outputVolume: number;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  muteAnnouncements: boolean;
  autoJoinVoice: boolean;
  enabled: boolean;
};

const DEFAULT_PREFS: VoicePrefs = {
  pttKey: "AltLeft", inputDeviceId: null, outputDeviceId: null,
  inputVolume: 1, outputVolume: 1, noiseSuppression: true, echoCancellation: true,
  muteAnnouncements: false, autoJoinVoice: false, enabled: true,
};

type VoiceContextType = {
  connected: boolean;
  currentRoom: string | null;
  roster: RosterEntry[];
  pttActive: boolean;
  micMuted: boolean;
  outputVolume: number;
  prefs: VoicePrefs;
  liveAnnouncement: LiveAnnouncement | null;
  joinRoom: (roomKey: string) => Promise<void>;
  leaveRoom: () => void;
  toggleMute: () => void;
  setOutputVolume: (v: number) => void;
  updatePrefs: (patch: Partial<VoicePrefs>) => void;
  // Admin live broadcast
  startLiveAnnouncement: (title: string) => Promise<void>;
  stopLiveAnnouncement: () => void;
  isBroadcastingLive: boolean;
  // Visitor key for anonymous announcement dismissal
  visitorKey: string;
};

const VoiceContext = createContext<VoiceContextType | null>(null);

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

function getVisitorKey(): string {
  try {
    const k = localStorage.getItem("sevco-visitor-key");
    if (k) return k;
    const v = "v_" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
    localStorage.setItem("sevco-visitor-key", v);
    return v;
  } catch { return "v_anon"; }
}

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const peersRef = useRef<Map<string, Peer>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const localAudioCtxRef = useRef<AudioContext | null>(null);
  const localAnalyserRef = useRef<AnalyserNode | null>(null);
  const speakingRafRef = useRef<number | null>(null);
  const myClientIdRef = useRef<string | null>(null);
  const announcementMediaSourceRef = useRef<MediaSource | null>(null);
  const announcementAudioRef = useRef<HTMLAudioElement | null>(null);
  const announcementRecorderRef = useRef<MediaRecorder | null>(null);

  const [connected, setConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [pttActive, setPttActive] = useState(false);
  const [micMuted, setMicMuted] = useState(true);
  const [outputVolume, setOutputVolumeState] = useState(1);
  const [prefs, setPrefs] = useState<VoicePrefs>(DEFAULT_PREFS);
  const [liveAnnouncement, setLiveAnnouncement] = useState<LiveAnnouncement | null>(null);
  const [isBroadcastingLive, setIsBroadcastingLive] = useState(false);
  const visitorKeyRef = useRef<string>(typeof window !== "undefined" ? getVisitorKey() : "v_ssr");

  // Load prefs once we have a user
  useEffect(() => {
    if (!user) { setPrefs(DEFAULT_PREFS); return; }
    fetch("/api/voice/preferences").then(r => r.ok ? r.json() : null).then((p) => {
      if (p) {
        const next: VoicePrefs = {
          pttKey: p.pttKey || "AltLeft",
          inputDeviceId: p.inputDeviceId, outputDeviceId: p.outputDeviceId,
          inputVolume: Number(p.inputVolume ?? 1),
          outputVolume: Number(p.outputVolume ?? 1),
          noiseSuppression: !!p.noiseSuppression,
          echoCancellation: !!p.echoCancellation,
          muteAnnouncements: !!p.muteAnnouncements,
          autoJoinVoice: !!p.autoJoinVoice,
          enabled: p.enabled !== false,
        };
        setPrefs(next);
        try { localStorage.setItem("voice-prefs-cache", JSON.stringify(next)); } catch {}
      }
    }).catch(() => {});
  }, [user]);

  // Apply output volume on all peer audio elements
  useEffect(() => {
    setOutputVolumeState(prefs.outputVolume);
    for (const p of peersRef.current.values()) p.audioEl.volume = prefs.outputVolume;
  }, [prefs.outputVolume]);

  // ===== WebSocket connection (always, even for anonymous — for announcements) =====
  useEffect(() => {
    if (typeof window === "undefined") return;
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${window.location.host}/ws/voice`;
    let cancelled = false;
    let reconnectTimer: any = null;

    function connect() {
      if (cancelled) return;
      const ws = new WebSocket(url);
      wsRef.current = ws;
      ws.onopen = () => {
        setConnected(true);
        if (user?.id) ws.send(JSON.stringify({ type: "auth", userId: user.id }));
      };
      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        if (!cancelled) reconnectTimer = setTimeout(connect, 2000);
      };
      ws.onerror = () => {};
      ws.onmessage = (ev) => handleMessage(ev.data);
    }
    connect();
    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) { try { wsRef.current.close(); } catch {} }
    };
  }, [user?.id]);

  function send(msg: any) {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }

  function rebuildRoster() {
    const me: RosterEntry = {
      clientId: myClientIdRef.current || "me",
      userId: user?.id || null,
      username: user?.username || "You",
      micMuted, speaking: pttActive && !micMuted, isSelf: true,
    };
    const others: RosterEntry[] = Array.from(peersRef.current.values()).map((p) => ({
      clientId: p.clientId, userId: p.userId, username: p.username,
      micMuted: p.micMuted, speaking: p.speaking,
    }));
    setRoster([me, ...others]);
  }

  useEffect(() => { rebuildRoster(); }, [user, micMuted, pttActive]);

  // ===== WebRTC peer creation =====
  function createPeer(clientId: string, userId: string | null, username: string | null, polite: boolean) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const stream = new MediaStream();
    const audioEl = document.createElement("audio");
    audioEl.autoplay = true;
    audioEl.volume = outputVolume;
    audioEl.srcObject = stream;
    document.body.appendChild(audioEl);

    const peer: Peer = { clientId, userId, username, pc, stream, audioEl, micMuted: false, speaking: false };
    peersRef.current.set(clientId, peer);

    pc.ontrack = (ev) => {
      ev.streams[0]?.getTracks().forEach((t) => stream.addTrack(t));
    };
    pc.onicecandidate = (ev) => {
      if (ev.candidate) send({ type: "rtc.ice", to: clientId, candidate: ev.candidate });
    };

    if (localStreamRef.current) {
      for (const t of localStreamRef.current.getTracks()) pc.addTrack(t, localStreamRef.current);
    }

    if (!polite) {
      // Initiator
      (async () => {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        send({ type: "rtc.offer", to: clientId, sdp: pc.localDescription });
      })().catch(console.error);
    }

    rebuildRoster();
    return peer;
  }

  function destroyPeer(clientId: string) {
    const p = peersRef.current.get(clientId);
    if (!p) return;
    try { p.pc.close(); } catch {}
    try { p.audioEl.remove(); } catch {}
    peersRef.current.delete(clientId);
    rebuildRoster();
  }

  // ===== Message handler =====
  async function handleMessage(raw: string) {
    let msg: any;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === "welcome") {
      myClientIdRef.current = msg.clientId;
      return;
    }

    if (msg.type === "voice.peers" && Array.isArray(msg.peers)) {
      for (const p of msg.peers) createPeer(p.clientId, p.userId, p.username, false);
      return;
    }

    if (msg.type === "voice.joined") {
      // New peer joined — they will initiate, we wait
      createPeer(msg.clientId, msg.userId, msg.username, true);
      return;
    }

    if (msg.type === "voice.left") {
      destroyPeer(msg.clientId);
      return;
    }

    if (msg.type === "voice.state") {
      const p = peersRef.current.get(msg.clientId);
      if (p) { p.micMuted = !!msg.micMuted; p.speaking = !!msg.speaking; rebuildRoster(); }
      return;
    }

    if (msg.type === "voice.kicked") {
      toast({ title: "Removed from voice", description: `${msg.by || "An admin"} removed you from the voice room.`, variant: "destructive" });
      leaveRoom();
      return;
    }

    if (msg.type === "voice.forceMute") {
      setMicMuted(true);
      if (localStreamRef.current) for (const t of localStreamRef.current.getAudioTracks()) t.enabled = false;
      toast({ title: "You were muted", description: `${msg.by || "An admin"} muted your microphone.` });
      return;
    }

    if (msg.type === "rtc.offer") {
      let p = peersRef.current.get(msg.from);
      if (!p) p = createPeer(msg.from, null, null, true);
      await p.pc.setRemoteDescription(msg.sdp);
      const answer = await p.pc.createAnswer();
      await p.pc.setLocalDescription(answer);
      send({ type: "rtc.answer", to: msg.from, sdp: p.pc.localDescription });
      return;
    }

    if (msg.type === "rtc.answer") {
      const p = peersRef.current.get(msg.from);
      if (p) await p.pc.setRemoteDescription(msg.sdp);
      return;
    }

    if (msg.type === "rtc.ice") {
      const p = peersRef.current.get(msg.from);
      if (p && msg.candidate) {
        try { await p.pc.addIceCandidate(msg.candidate); } catch (e) { console.warn(e); }
      }
      return;
    }

    if (msg.type === "announce.live") {
      if (msg.state === "start") {
        setLiveAnnouncement({ authorId: msg.authorId, authorName: msg.authorName, title: msg.title || "Live announcement", startedAt: Date.now() });
        if (!prefs.muteAnnouncements) startAnnouncementPlayback();
      } else {
        setLiveAnnouncement(null);
        stopAnnouncementPlayback();
      }
      return;
    }

    if (msg.type === "announce.chunk") {
      if (prefs.muteAnnouncements) return;
      // Append base64 audio chunk into MediaSource buffer
      try {
        const bin = atob(msg.data);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        appendAnnouncementBuffer(bytes, msg.mime);
      } catch {}
      return;
    }

    if (msg.type === "announcement.new") {
      // Bell/banner refresh handled by query invalidation hook
      window.dispatchEvent(new CustomEvent("sevco:announcement", { detail: msg.announcement }));
      return;
    }

    if (msg.type === "announcement.deleted") {
      window.dispatchEvent(new CustomEvent("sevco:announcement-deleted", { detail: { id: msg.id } }));
      return;
    }
  }

  // ===== Live announcement playback (listener side) =====
  const pendingChunksRef = useRef<Uint8Array[]>([]);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);

  function startAnnouncementPlayback() {
    stopAnnouncementPlayback();
    const audio = document.createElement("audio");
    audio.autoplay = true;
    audio.volume = outputVolume;
    audio.style.display = "none";
    document.body.appendChild(audio);
    announcementAudioRef.current = audio;
    // We'll set src lazily when first chunk arrives (need MIME)
  }

  function appendAnnouncementBuffer(bytes: Uint8Array, mime: string) {
    if (!announcementAudioRef.current) startAnnouncementPlayback();
    const audio = announcementAudioRef.current!;
    if (!announcementMediaSourceRef.current) {
      const ms = new MediaSource();
      announcementMediaSourceRef.current = ms;
      audio.src = URL.createObjectURL(ms);
      ms.addEventListener("sourceopen", () => {
        try {
          const sb = ms.addSourceBuffer(mime || "audio/webm; codecs=opus");
          sourceBufferRef.current = sb;
          sb.addEventListener("updateend", () => flushPending());
          flushPending();
        } catch (e) { console.warn("[announce] addSourceBuffer failed", e); }
      });
    }
    pendingChunksRef.current.push(bytes);
    flushPending();
  }

  function flushPending() {
    const sb = sourceBufferRef.current;
    if (!sb || sb.updating) return;
    const next = pendingChunksRef.current.shift();
    if (!next) return;
    try { sb.appendBuffer(next); } catch (e) { console.warn(e); }
  }

  function stopAnnouncementPlayback() {
    pendingChunksRef.current = [];
    sourceBufferRef.current = null;
    announcementMediaSourceRef.current = null;
    if (announcementAudioRef.current) {
      try { announcementAudioRef.current.pause(); } catch {}
      try { announcementAudioRef.current.remove(); } catch {}
      announcementAudioRef.current = null;
    }
  }

  // ===== Microphone capture =====
  async function ensureMic() {
    if (localStreamRef.current) return localStreamRef.current;
    const constraints: MediaStreamConstraints = {
      audio: {
        deviceId: prefs.inputDeviceId ? { exact: prefs.inputDeviceId } : undefined,
        noiseSuppression: prefs.noiseSuppression,
        echoCancellation: prefs.echoCancellation,
        autoGainControl: true,
      },
      video: false,
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    // Start muted by default
    for (const t of stream.getAudioTracks()) t.enabled = false;
    localStreamRef.current = stream;
    setupSpeakingDetection(stream);
    return stream;
  }

  function setupSpeakingDetection(stream: MediaStream) {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      localAudioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      localAnalyserRef.current = analyser;
      const buf = new Uint8Array(analyser.fftSize);
      const tick = () => {
        if (!localAnalyserRef.current) return;
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
        const rms = Math.sqrt(sum / buf.length);
        const speaking = rms > 0.03;
        setPttActive(speaking);
        speakingRafRef.current = requestAnimationFrame(tick);
      };
      speakingRafRef.current = requestAnimationFrame(tick);
    } catch (e) { console.warn("[voice] speaking detection failed", e); }
  }

  function stopMic() {
    if (speakingRafRef.current) cancelAnimationFrame(speakingRafRef.current);
    speakingRafRef.current = null;
    localAnalyserRef.current = null;
    if (localAudioCtxRef.current) { try { localAudioCtxRef.current.close(); } catch {} }
    localAudioCtxRef.current = null;
    if (localStreamRef.current) {
      for (const t of localStreamRef.current.getTracks()) t.stop();
      localStreamRef.current = null;
    }
  }

  // ===== PTT key handling =====
  useEffect(() => {
    if (!currentRoom) return;
    const isInputFocused = () => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
    };
    const onDown = (e: KeyboardEvent) => {
      if (e.code !== prefs.pttKey) return;
      if (isInputFocused()) return;
      if (micMuted) return;
      if (!localStreamRef.current) return;
      for (const t of localStreamRef.current.getAudioTracks()) t.enabled = true;
      send({ type: "voice.state", roomKey: currentRoom, micMuted: false, speaking: true });
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code !== prefs.pttKey) return;
      if (!localStreamRef.current) return;
      for (const t of localStreamRef.current.getAudioTracks()) t.enabled = false;
      send({ type: "voice.state", roomKey: currentRoom, micMuted: false, speaking: false });
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp); };
  }, [currentRoom, prefs.pttKey, micMuted]);

  // ===== Public API =====
  const joinRoom = useCallback(async (roomKey: string) => {
    if (!user) { toast({ title: "Sign in required", description: "Sign in to join voice.", variant: "destructive" }); return; }
    if (currentRoom === roomKey) return;
    if (currentRoom) leaveRoom();
    try {
      await ensureMic();
    } catch (e: any) {
      toast({ title: "Microphone blocked", description: e?.message || "Allow microphone access to join voice.", variant: "destructive" });
      return;
    }
    setCurrentRoom(roomKey);
    setMicMuted(false);
    send({ type: "voice.join", roomKey });
    toast({ title: "Voice connected", description: `Hold ${formatKey(prefs.pttKey)} to talk.` });
  }, [user, currentRoom, prefs.pttKey]);

  const leaveRoom = useCallback(() => {
    if (currentRoom) send({ type: "voice.leave", roomKey: currentRoom });
    for (const id of Array.from(peersRef.current.keys())) destroyPeer(id);
    stopMic();
    setCurrentRoom(null);
    setMicMuted(true);
    setPttActive(false);
  }, [currentRoom]);

  const toggleMute = useCallback(() => {
    setMicMuted((m) => {
      const newMuted = !m;
      if (localStreamRef.current) for (const t of localStreamRef.current.getAudioTracks()) t.enabled = !newMuted ? false : false;
      // Force tracks off when muted; PTT will turn them on while held
      if (currentRoom) send({ type: "voice.state", roomKey: currentRoom, micMuted: newMuted, speaking: false });
      return newMuted;
    });
  }, [currentRoom]);

  const setOutputVolume = useCallback((v: number) => {
    setOutputVolumeState(v);
    for (const p of peersRef.current.values()) p.audioEl.volume = v;
    if (announcementAudioRef.current) announcementAudioRef.current.volume = v;
    updatePrefs({ outputVolume: v });
  }, []);

  const updatePrefs = useCallback((patch: Partial<VoicePrefs>) => {
    setPrefs((cur) => {
      const next = { ...cur, ...patch };
      if (user) {
        fetch("/api/voice/preferences", {
          method: "PATCH", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }).catch(() => {});
      }
      return next;
    });
  }, [user]);

  // ===== Live announcement broadcasting (admin only) =====
  const startLiveAnnouncement = useCallback(async (title: string) => {
    if (!user || (user.role !== "admin" && user.role !== "executive")) {
      toast({ title: "Not authorized", variant: "destructive" }); return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm; codecs=opus") ? "audio/webm; codecs=opus" : "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      announcementRecorderRef.current = rec;
      send({ type: "announce.start", title });
      rec.ondataavailable = async (ev) => {
        if (!ev.data.size) return;
        const buf = await ev.data.arrayBuffer();
        const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
        send({ type: "announce.chunk", mime, data: b64 });
      };
      rec.onstop = () => {
        for (const t of stream.getTracks()) t.stop();
        send({ type: "announce.stop" });
        setIsBroadcastingLive(false);
      };
      rec.start(1000);
      setIsBroadcastingLive(true);
    } catch (e: any) {
      toast({ title: "Microphone blocked", description: e?.message, variant: "destructive" });
    }
  }, [user]);

  const stopLiveAnnouncement = useCallback(() => {
    const rec = announcementRecorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    announcementRecorderRef.current = null;
  }, []);

  return (
    <VoiceContext.Provider value={{
      connected, currentRoom, roster, pttActive, micMuted, outputVolume, prefs,
      liveAnnouncement, joinRoom, leaveRoom, toggleMute, setOutputVolume, updatePrefs,
      startLiveAnnouncement, stopLiveAnnouncement, isBroadcastingLive,
      visitorKey: visitorKeyRef.current,
    }}>
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error("useVoice must be used inside VoiceProvider");
  return ctx;
}

export function formatKey(code: string): string {
  if (code === "Space") return "Space";
  if (code === "AltLeft") return "Left Alt";
  if (code === "AltRight") return "Right Alt";
  if (code === "ControlLeft") return "Left Ctrl";
  if (code === "ControlRight") return "Right Ctrl";
  if (code === "ShiftLeft") return "Left Shift";
  if (code === "ShiftRight") return "Right Shift";
  if (code.startsWith("Key")) return code.slice(3);
  return code;
}
