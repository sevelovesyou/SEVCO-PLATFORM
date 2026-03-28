import { useRef, useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AiMessageRenderer } from "@/components/ai-message-renderer";
import {
  X,
  Minus,
  Hash,
  MessageCircle,
  Bot,
  Send,
  Trash2,
  GripHorizontal,
} from "lucide-react";
import { useFloatingChat, type FloatingWindow } from "@/contexts/floating-chat-context";
import type { AiMessage } from "@shared/schema";

type ChatUserInfo = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

type ChatMessage = {
  id: number;
  channelId: number | null;
  fromUserId: string;
  toUserId: string | null;
  content: string;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  fromUser: ChatUserInfo;
};

function Avatar({ user, size = 5 }: { user: ChatUserInfo; size?: number }) {
  const initials = (user.displayName || user.username).slice(0, 2).toUpperCase();
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={initials}
        className={`w-${size} h-${size} rounded-full object-cover shrink-0`}
      />
    );
  }
  return (
    <div className={`w-${size} h-${size} rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold shrink-0`}>
      {initials}
    </div>
  );
}

function FloatingMessageComposer({ onSend, disabled }: { onSend: (content: string) => void; disabled?: boolean }) {
  const [value, setValue] = useState("");

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }

  return (
    <div className="flex gap-1.5 items-end p-2 border-t bg-background">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Message… (Enter to send)"
        className="resize-none min-h-[30px] max-h-[80px] text-xs py-1.5"
        rows={1}
        disabled={disabled}
      />
      <Button
        size="icon"
        className="shrink-0 h-7 w-7"
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        aria-label="Send message"
      >
        <Send className="h-3 w-3" />
      </Button>
    </div>
  );
}

function FloatingChannelContent({ channelId }: { channelId: number; channelName: string }) {
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/channels", channelId, "messages"],
    queryFn: () => fetch(`/api/chat/channels/${channelId}/messages`).then((r) => r.json()),
    refetchInterval: 5000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      apiRequest("POST", `/api/chat/channels/${channelId}/messages`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/channels", channelId, "messages"] });
    },
  });

  return (
    <>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
        {messages.map((msg) => {
          const isMine = msg.fromUserId === user?.id;
          const isDeleted = !!msg.deletedAt;
          return (
            <div key={msg.id} className={`flex gap-1.5 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
              {!isMine && <Avatar user={msg.fromUser} size={5} />}
              <div className={`max-w-[78%] flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                {!isMine && (
                  <span className="text-[9px] text-muted-foreground mb-0.5 px-1">
                    {msg.fromUser.displayName || msg.fromUser.username}
                  </span>
                )}
                <div className={`rounded-xl px-2.5 py-1.5 text-xs break-words ${
                  isDeleted ? "bg-muted/50 text-muted-foreground italic"
                    : isMine ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}>
                  {isDeleted ? "Deleted." : msg.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <FloatingMessageComposer onSend={(c) => sendMutation.mutate(c)} disabled={sendMutation.isPending} />
    </>
  );
}

function FloatingDmContent({ otherUserId, otherUser }: { otherUserId: string; otherUser: ChatUserInfo }) {
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/dm", otherUserId, "messages"],
    queryFn: () => fetch(`/api/chat/dm/${otherUserId}/messages`).then((r) => r.json()),
    refetchInterval: 5000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      apiRequest("POST", `/api/chat/dm/${otherUserId}`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/dm", otherUserId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/dm-threads"] });
    },
  });

  return (
    <>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
        {messages.map((msg) => {
          const isMine = msg.fromUserId === user?.id;
          return (
            <div key={msg.id} className={`flex gap-1.5 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
              {!isMine && <Avatar user={msg.fromUser} size={5} />}
              <div className={`max-w-[78%] rounded-xl px-2.5 py-1.5 text-xs break-words ${
                isMine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              }`}>
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <FloatingMessageComposer onSend={(c) => sendMutation.mutate(c)} disabled={sendMutation.isPending} />
    </>
  );
}

function FloatingAiContent({
  agentId,
  agentName,
  agentAvatarUrl,
  modelSlug,
}: {
  agentId: number;
  agentName: string;
  agentAvatarUrl?: string | null;
  modelSlug?: string | null;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const { data: messages = [] } = useQuery<AiMessage[]>({
    queryKey: ["/api/ai/chat", agentId],
    queryFn: () => fetch(`/api/ai/chat/${agentId}`).then((r) => r.json()),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, inlineError]);

  const sendMutation = useMutation({
    mutationFn: (message: string) =>
      apiRequest("POST", `/api/ai/chat/${agentId}`, { message }),
    onSuccess: () => {
      setInlineError(null);
      queryClient.invalidateQueries({ queryKey: ["/api/ai/chat", agentId] });
    },
    onError: (e: Error) => {
      setInlineError(e.message || "Something went wrong. Please try again.");
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/ai/chat/${agentId}/clear`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/ai/chat", agentId] }),
  });

  return (
    <>
      {modelSlug && (
        <div className="px-2 py-1 border-b bg-muted/30">
          <span className="text-[9px] text-muted-foreground font-mono">{modelSlug}</span>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div key={msg.id} className={`flex gap-1.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
              {!isUser && (
                agentAvatarUrl ? (
                  <img src={agentAvatarUrl} alt={agentName} className="w-5 h-5 rounded-full object-cover shrink-0 mt-0.5" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-2.5 w-2.5 text-primary" />
                  </div>
                )
              )}
              <div className={`max-w-[80%] flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                <div className={`rounded-xl px-2.5 py-1.5 text-xs break-words ${isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                  {isUser ? msg.content : <AiMessageRenderer content={msg.content} />}
                </div>
              </div>
            </div>
          );
        })}
        {sendMutation.isPending && (
          <div className="flex gap-1.5">
            {agentAvatarUrl ? (
              <img src={agentAvatarUrl} alt={agentName} className="w-5 h-5 rounded-full object-cover shrink-0 mt-0.5" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="h-2.5 w-2.5 text-primary" />
              </div>
            )}
            <div className="bg-muted rounded-xl px-2.5 py-1.5 text-xs text-muted-foreground italic">Thinking…</div>
          </div>
        )}
        {inlineError && !sendMutation.isPending && (
          <div className="flex gap-1.5">
            {agentAvatarUrl ? (
              <img src={agentAvatarUrl} alt={agentName} className="w-5 h-5 rounded-full object-cover shrink-0 mt-0.5" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="h-2.5 w-2.5 text-primary" />
              </div>
            )}
            <div className="bg-muted rounded-xl px-2.5 py-1.5 text-xs text-destructive/80 max-w-[80%]">
              {inlineError}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="flex items-center justify-end px-2 pb-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-muted-foreground hover:text-destructive"
          onClick={() => { if (confirm("Clear conversation?")) clearMutation.mutate(); }}
          aria-label="Clear conversation"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <FloatingMessageComposer onSend={(c) => sendMutation.mutate(c)} disabled={sendMutation.isPending} />
    </>
  );
}

function SingleFloatingWindow({ win }: { win: FloatingWindow }) {
  const { closeWindow, updateWindow, minimizeWindow, restoreWindow } = useFloatingChat();
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  const getTitle = () => {
    if (win.conversation.type === "channel") return `#${win.conversation.channel.name}`;
    if (win.conversation.type === "dm") return win.conversation.otherUser.displayName || win.conversation.otherUser.username;
    return win.conversation.agent.name;
  };

  const getIcon = () => {
    if (win.conversation.type === "channel") return <Hash className="h-3 w-3 shrink-0" />;
    if (win.conversation.type === "dm") return <MessageCircle className="h-3 w-3 shrink-0" />;
    return <Bot className="h-3 w-3 shrink-0" />;
  };

  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      origX: win.position.x,
      origY: win.position.y,
    };
  }, [win.position]);

  const handleMouseDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX, e.clientY);

    function onMove(e: MouseEvent) {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const newX = Math.max(0, Math.min(window.innerWidth - win.size.width, dragRef.current.origX + dx));
      const newY = Math.max(0, Math.min(window.innerHeight - 40, dragRef.current.origY + dy));
      updateWindow(win.id, { position: { x: newX, y: newY } });
    }

    function onUp() {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [win.id, win.position, win.size, updateWindow, handleDragStart]);

  const handleTouchDragStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDragStart(touch.clientX, touch.clientY);

    function onMove(e: TouchEvent) {
      if (!dragRef.current) return;
      const t = e.touches[0];
      const dx = t.clientX - dragRef.current.startX;
      const dy = t.clientY - dragRef.current.startY;
      const newX = Math.max(0, Math.min(window.innerWidth - win.size.width, dragRef.current.origX + dx));
      const newY = Math.max(0, Math.min(window.innerHeight - 40, dragRef.current.origY + dy));
      updateWindow(win.id, { position: { x: newX, y: newY } });
    }

    function onEnd() {
      dragRef.current = null;
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    }

    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
  }, [win.id, win.position, win.size, updateWindow, handleDragStart]);

  const handleResizeStart = useCallback((clientX: number, clientY: number) => {
    resizeRef.current = {
      startX: clientX,
      startY: clientY,
      origW: win.size.width,
      origH: win.size.height,
    };
  }, [win.size]);

  const handleMouseResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleResizeStart(e.clientX, e.clientY);

    function onMove(e: MouseEvent) {
      if (!resizeRef.current) return;
      const dx = e.clientX - resizeRef.current.startX;
      const dy = e.clientY - resizeRef.current.startY;
      updateWindow(win.id, {
        size: {
          width: Math.max(280, Math.min(700, resizeRef.current.origW + dx)),
          height: Math.max(300, Math.min(700, resizeRef.current.origH + dy)),
        },
      });
    }

    function onUp() {
      resizeRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [win.id, win.size, updateWindow, handleResizeStart]);

  const handleTouchResizeStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.touches[0];
    handleResizeStart(touch.clientX, touch.clientY);

    function onMove(e: TouchEvent) {
      if (!resizeRef.current) return;
      const t = e.touches[0];
      const dx = t.clientX - resizeRef.current.startX;
      const dy = t.clientY - resizeRef.current.startY;
      updateWindow(win.id, {
        size: {
          width: Math.max(280, Math.min(700, resizeRef.current.origW + dx)),
          height: Math.max(300, Math.min(700, resizeRef.current.origH + dy)),
        },
      });
    }

    function onEnd() {
      resizeRef.current = null;
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    }

    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
  }, [win.id, win.size, updateWindow, handleResizeStart]);

  return (
    <div
      ref={windowRef}
      className="fixed z-50 flex flex-col rounded-xl border border-border shadow-2xl bg-background overflow-hidden"
      style={{
        left: win.position.x,
        top: win.position.y,
        width: win.minimized ? 240 : win.size.width,
        height: win.minimized ? "auto" : win.size.height,
      }}
      data-testid={`floating-window-${win.id}`}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 bg-muted/60 border-b cursor-grab active:cursor-grabbing shrink-0 select-none touch-none"
        onMouseDown={handleMouseDragStart}
        onTouchStart={handleTouchDragStart}
      >
        <GripHorizontal className="h-3 w-3 text-muted-foreground/50 shrink-0" />
        {getIcon()}
        <span className="text-xs font-medium truncate flex-1">{getTitle()}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 shrink-0"
          onClick={() => win.minimized ? restoreWindow(win.id) : minimizeWindow(win.id)}
          data-testid={`floating-minimize-${win.id}`}
          aria-label={win.minimized ? "Restore" : "Minimize"}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 shrink-0 hover:text-destructive"
          onClick={() => closeWindow(win.id)}
          data-testid={`floating-close-${win.id}`}
          aria-label="Close"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {!win.minimized && (
        <>
          <div className="flex-1 flex flex-col min-h-0">
            {win.conversation.type === "channel" && (
              <FloatingChannelContent
                channelId={win.conversation.channel.id}
                channelName={win.conversation.channel.name}
              />
            )}
            {win.conversation.type === "dm" && (
              <FloatingDmContent
                otherUserId={win.conversation.otherUser.id}
                otherUser={win.conversation.otherUser}
              />
            )}
            {win.conversation.type === "aiAgent" && (
              <FloatingAiContent
                agentId={win.conversation.agent.id}
                agentName={win.conversation.agent.name}
                agentAvatarUrl={win.conversation.agent.avatarUrl}
                modelSlug={win.conversation.agent.modelSlug}
              />
            )}
          </div>
          <div
            className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize touch-none"
            onMouseDown={handleMouseResizeStart}
            onTouchStart={handleTouchResizeStart}
            title="Resize"
          >
            <svg viewBox="0 0 16 16" className="w-4 h-4 text-muted-foreground/30 fill-current">
              <path d="M11 11h2v2h-2zM7 11h2v2H7zM11 7h2v2h-2z" />
            </svg>
          </div>
        </>
      )}
    </div>
  );
}

export function FloatingChatWindows() {
  const { windows } = useFloatingChat();
  if (windows.length === 0) return null;
  return (
    <>
      {windows.map((win) => (
        <SingleFloatingWindow key={win.id} win={win} />
      ))}
    </>
  );
}
