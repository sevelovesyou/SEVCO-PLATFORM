import { createContext, useContext, useState, useRef, useCallback } from "react";
import type { ChatChannel, AiAgent } from "@shared/schema";

type ChatUserInfo = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type FloatingConversation =
  | { type: "channel"; channel: ChatChannel }
  | { type: "dm"; otherUser: ChatUserInfo }
  | { type: "aiAgent"; agent: AiAgent };

export type FloatingWindow = {
  id: string;
  conversation: FloatingConversation;
  position: { x: number; y: number };
  size: { width: number; height: number };
  minimized: boolean;
};

type SavedGeometry = {
  position: { x: number; y: number };
  size: { width: number; height: number };
};

type FloatingChatContextType = {
  windows: FloatingWindow[];
  openWindow: (conversation: FloatingConversation) => void;
  closeWindow: (id: string) => void;
  updateWindow: (id: string, updates: Partial<FloatingWindow>) => void;
  minimizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
};

const FloatingChatContext = createContext<FloatingChatContextType | null>(null);

function getConversationKey(conv: FloatingConversation): string {
  if (conv.type === "channel") return `channel-${conv.channel.id}`;
  if (conv.type === "dm") return `dm-${conv.otherUser.id}`;
  return `ai-${conv.agent.id}`;
}

function getDefaultPosition(index: number): { x: number; y: number } {
  const base = 80 + index * 30;
  return { x: Math.min(base, window.innerWidth - 380), y: Math.min(base, window.innerHeight - 500) };
}

export function FloatingChatProvider({ children }: { children: React.ReactNode }) {
  const [windows, setWindows] = useState<FloatingWindow[]>([]);
  const geometryCache = useRef<Map<string, SavedGeometry>>(new Map());

  const openWindow = useCallback((conversation: FloatingConversation) => {
    const key = getConversationKey(conversation);
    setWindows((prev) => {
      const existing = prev.find((w) => w.id === key);
      if (existing) {
        return prev.map((w) => w.id === key ? { ...w, minimized: false } : w);
      }
      const saved = geometryCache.current.get(key);
      const newWindow: FloatingWindow = {
        id: key,
        conversation,
        position: saved?.position ?? getDefaultPosition(prev.length),
        size: saved?.size ?? { width: 360, height: 480 },
        minimized: false,
      };
      return [...prev, newWindow];
    });
  }, []);

  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => {
      const win = prev.find((w) => w.id === id);
      if (win) {
        geometryCache.current.set(id, { position: win.position, size: win.size });
      }
      return prev.filter((w) => w.id !== id);
    });
  }, []);

  const updateWindow = useCallback((id: string, updates: Partial<FloatingWindow>) => {
    setWindows((prev) => prev.map((w) => w.id === id ? { ...w, ...updates } : w));
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.map((w) => w.id === id ? { ...w, minimized: true } : w));
  }, []);

  const restoreWindow = useCallback((id: string) => {
    setWindows((prev) => prev.map((w) => w.id === id ? { ...w, minimized: false } : w));
  }, []);

  return (
    <FloatingChatContext.Provider value={{ windows, openWindow, closeWindow, updateWindow, minimizeWindow, restoreWindow }}>
      {children}
    </FloatingChatContext.Provider>
  );
}

export function useFloatingChat() {
  const ctx = useContext(FloatingChatContext);
  if (!ctx) throw new Error("useFloatingChat must be used inside FloatingChatProvider");
  return ctx;
}
