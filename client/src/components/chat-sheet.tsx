import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { usePermission } from "@/hooks/use-permission";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Hash,
  MessageCircle,
  Send,
  Plus,
  Users,
  ChevronLeft,
  Lock,
  Bot,
  Trash2,
  Maximize2,
  ExternalLink,
} from "lucide-react";
import type { ChatChannel, User, AiAgent, AiMessage } from "@shared/schema";
import { AiMessageRenderer, useCodePreview, CodePreviewDrawer } from "@/components/ai-message-renderer";
import { AiMessageActionBar } from "@/components/ai-message-action-bar";
import { AgentComposer } from "@/components/agent-composer";
import { ThinkingIndicator } from "@/components/thinking-indicator";
import { useAgentStream } from "@/hooks/use-agent-stream";
import { useFloatingChat } from "@/contexts/floating-chat-context";

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
  toUser: ChatUserInfo | null;
  channel: { id: number; name: string } | null;
};

type DmThread = {
  otherUser: ChatUserInfo;
  lastMessage: ChatMessage;
  unreadCount: number;
};

function formatTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function Avatar({ user, size = 6 }: { user: ChatUserInfo; size?: number }) {
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
    <div className={`w-${size} h-${size} rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0`}>
      {initials}
    </div>
  );
}

function MessageBubble({ msg, currentUserId }: { msg: ChatMessage; currentUserId: string }) {
  const isMine = msg.fromUserId === currentUserId;
  const isDeleted = !!msg.deletedAt;

  return (
    <div className={`flex gap-2 group ${isMine ? "flex-row-reverse" : "flex-row"}`} data-testid={`chat-message-${msg.id}`}>
      {!isMine && <Avatar user={msg.fromUser} size={6} />}
      <div className={`flex flex-col max-w-[75%] ${isMine ? "items-end" : "items-start"}`}>
        {!isMine && (
          <span className="text-[10px] text-muted-foreground mb-0.5 px-1">
            {msg.fromUser.displayName || msg.fromUser.username}
          </span>
        )}
        <div
          className={`rounded-2xl px-3 py-2 text-sm break-words ${
            isDeleted
              ? "bg-muted/50 text-muted-foreground italic"
              : isMine
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground"
          }`}
        >
          {isDeleted ? "This message was deleted." : msg.content}
        </div>
        <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
          {formatTime(msg.createdAt)}
        </span>
      </div>
    </div>
  );
}

function MessageComposer({ onSend, disabled }: { onSend: (content: string) => void; disabled?: boolean }) {
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
    <div className="flex gap-2 items-end p-3 border-t bg-background">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message… (Enter to send)"
        className="resize-none min-h-[36px] max-h-[120px] text-sm py-2"
        rows={1}
        disabled={disabled}
        data-testid="input-chat-message"
      />
      <Button
        size="icon"
        className="shrink-0 h-9 w-9"
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        data-testid="button-send-message"
        aria-label="Send message"
      >
        <Send className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

function ChannelView({
  channel,
  onBack,
  onPopOut,
}: {
  channel: ChatChannel;
  onBack: () => void;
  onPopOut?: () => void;
}) {
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/channels", channel.id, "messages"],
    queryFn: () => fetch(`/api/chat/channels/${channel.id}/messages`).then((r) => r.json()),
    refetchInterval: 5000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      apiRequest("POST", `/api/chat/channels/${channel.id}/messages`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/channels", channel.id, "messages"] });
    },
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b bg-background shrink-0 pr-10">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onBack} data-testid="button-chat-back" aria-label="Back to channels">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{channel.name}</p>
          {channel.description && (
            <p className="text-[11px] text-muted-foreground truncate">{channel.description}</p>
          )}
        </div>
        {channel.isPrivate && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
        {onPopOut && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 ml-auto text-muted-foreground"
            onClick={onPopOut}
            data-testid={`button-popout-sheet-channel-${channel.id}`}
            aria-label="Pop out"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0" data-testid="channel-messages">
        {isLoading && (
          <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
            Loading messages…
          </div>
        )}
        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-20 text-muted-foreground text-sm gap-1">
            <Hash className="h-6 w-6 opacity-40" />
            <p>No messages yet. Say hello!</p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} currentUserId={user?.id ?? ""} />
        ))}
        <div ref={bottomRef} />
      </div>

      <MessageComposer onSend={(c) => sendMutation.mutate(c)} disabled={sendMutation.isPending} />
    </div>
  );
}

function DmView({
  otherUser,
  onBack,
  onPopOut,
}: {
  otherUser: ChatUserInfo;
  onBack: () => void;
  onPopOut?: () => void;
}) {
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/dm", otherUser.id, "messages"],
    queryFn: () => fetch(`/api/chat/dm/${otherUser.id}/messages`).then((r) => r.json()),
    refetchInterval: 5000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      apiRequest("POST", `/api/chat/dm/${otherUser.id}`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/dm", otherUser.id, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/dm-threads"] });
    },
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b bg-background shrink-0 pr-10">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onBack} data-testid="button-dm-back" aria-label="Back to conversations">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Avatar user={otherUser} size={6} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{otherUser.displayName || otherUser.username}</p>
          <p className="text-[11px] text-muted-foreground">@{otherUser.username}</p>
        </div>
        {onPopOut && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={onPopOut}
            data-testid={`button-popout-sheet-dm-${otherUser.id}`}
            aria-label="Pop out"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0" data-testid="dm-messages">
        {isLoading && (
          <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
            Loading messages…
          </div>
        )}
        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-20 text-muted-foreground text-sm gap-1">
            <MessageCircle className="h-6 w-6 opacity-40" />
            <p>No messages yet. Start a conversation!</p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} currentUserId={user?.id ?? ""} />
        ))}
        <div ref={bottomRef} />
      </div>

      <MessageComposer onSend={(c) => sendMutation.mutate(c)} disabled={sendMutation.isPending} />
    </div>
  );
}

function NewDmDialog({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (user: ChatUserInfo) => void;
}) {
  const [search, setSearch] = useState("");
  const { user: currentUser } = useAuth();

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/chat/users"],
    enabled: open,
  });

  const filtered = allUsers.filter(
    (u) =>
      u.id !== currentUser?.id &&
      (u.username.toLowerCase().includes(search.toLowerCase()) ||
        (u.displayName ?? "").toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Direct Message</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Search users…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2"
          data-testid="input-dm-search"
        />
        <div className="max-h-60 overflow-y-auto space-y-1">
          {filtered.map((u) => (
            <button
              key={u.id}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/70 transition-colors text-left"
              onClick={() => {
                onSelect({ id: u.id, username: u.username, displayName: u.displayName ?? null, avatarUrl: u.avatarUrl ?? null });
                onClose();
              }}
              data-testid={`dm-user-${u.id}`}
            >
              <Avatar user={{ id: u.id, username: u.username, displayName: u.displayName ?? null, avatarUrl: u.avatarUrl ?? null }} size={7} />
              <div>
                <p className="text-sm font-medium">{u.displayName || u.username}</p>
                <p className="text-xs text-muted-foreground">@{u.username}</p>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No users found</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateChannelDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/chat/channels", { name: name.trim(), description: description.trim() || null, isPrivate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/channels"] });
      setName("");
      setDescription("");
      setIsPrivate(false);
      onClose();
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Channel</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Channel Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. general"
              className="mt-1"
              data-testid="input-channel-name"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description (optional)</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel about?"
              className="mt-1"
              data-testid="input-channel-description"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              data-testid="input-channel-private"
            />
            <span className="text-sm">Private channel</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => createMutation.mutate()} disabled={!name.trim() || createMutation.isPending} data-testid="button-create-channel">
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AiAgentView({ agent, onBack, onPopOut }: { agent: AiAgent; onBack: () => void; onPopOut?: () => void }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const { streamingContent, isStreaming, send, regenerate } = useAgentStream(agent.id);
  const { preview, openPreview, closePreview } = useCodePreview();

  const { data: messages = [], isLoading } = useQuery<AiMessage[]>({
    queryKey: ["/api/ai/chat", agent.id],
    queryFn: () => fetch(`/api/ai/chat/${agent.id}`).then((r) => r.json()),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, inlineError, streamingContent]);

  const clearMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/ai/chat/${agent.id}/clear`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/ai/chat", agent.id] }),
  });

  async function handleSend(content: string) {
    setInlineError(null);
    try {
      await send(content);
    } catch (e: any) {
      setInlineError(e.message || "Something went wrong. Please try again.");
    }
  }

  async function handleRegenerate(msgId: number) {
    setInlineError(null);
    try {
      await regenerate(msgId);
    } catch (e: any) {
      setInlineError(e.message || "Regenerate failed.");
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b bg-background shrink-0 pr-10">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onBack} data-testid="button-ai-back" aria-label="Back to AI agents">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        {agent.avatarUrl ? (
          <img src={agent.avatarUrl} alt={agent.name} className="w-6 h-6 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Bot className="h-3 w-3 text-primary" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{agent.name}</p>
          <p className="text-[11px] text-muted-foreground">{agent.modelSlug}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => {
            if (confirm("Clear conversation history?")) clearMutation.mutate();
          }}
          data-testid="button-ai-clear"
          aria-label="Clear conversation"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
        {onPopOut && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={onPopOut}
            data-testid={`button-popout-sheet-ai-${agent.id}`}
            aria-label="Pop out"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0" data-testid="ai-messages">
        {isLoading && (
          <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">Loading…</div>
        )}
        {!isLoading && messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-20 text-muted-foreground text-sm gap-1">
            <Bot className="h-6 w-6 opacity-40" />
            <p>Start a conversation with {agent.name}</p>
            {agent.description && <p className="text-[11px] text-center px-4 text-muted-foreground/70">{agent.description}</p>}
          </div>
        )}
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div key={msg.id} className={`flex gap-2 group ${isUser ? "flex-row-reverse" : "flex-row"}`} data-testid={`ai-message-${msg.id}`}>
              {!isUser && (
                agent.avatarUrl ? (
                  <img src={agent.avatarUrl} alt={agent.name} className="w-6 h-6 rounded-full object-cover shrink-0 mt-1" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="h-3 w-3 text-primary" />
                  </div>
                )
              )}
              <div className={`flex flex-col max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
                <div className={`rounded-2xl px-3 py-2 text-sm break-words ${isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`} data-testid={isUser ? undefined : `ai-msg-content-${msg.id}`}>
                  {isUser ? msg.content : <AiMessageRenderer content={msg.content} onPreview={openPreview} />}
                </div>
                {!isUser && (
                  <AiMessageActionBar
                    messageId={msg.id}
                    agentId={agent.id}
                    content={msg.content}
                    onRegenerate={handleRegenerate}
                    compact
                  />
                )}
                <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          );
        })}
        {isStreaming && (
          <ThinkingIndicator
            agentName={agent.name}
            agentAvatarUrl={agent.avatarUrl}
            streamingContent={streamingContent}
            compact
          />
        )}
        {inlineError && !isStreaming && (
          <div className="flex gap-2 flex-row" data-testid="ai-inline-error">
            {agent.avatarUrl ? (
              <img src={agent.avatarUrl} alt={agent.name} className="w-6 h-6 rounded-full object-cover shrink-0 mt-1" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                <Bot className="h-3 w-3 text-primary" />
              </div>
            )}
            <div className="bg-muted rounded-2xl px-3 py-2 text-sm text-destructive/80 max-w-[80%]">
              {inlineError}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <AgentComposer
        agent={agent}
        onSend={handleSend}
        onClear={() => { if (confirm("Clear conversation history?")) clearMutation.mutate(); }}
        disabled={isStreaming}
      />
      <CodePreviewDrawer preview={preview} onClose={closePreview} />
    </div>
  );
}

type View =
  | { type: "list" }
  | { type: "channel"; channel: ChatChannel }
  | { type: "dm"; otherUser: ChatUserInfo }
  | { type: "aiAgent"; agent: AiAgent };

export function ChatSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { role } = usePermission();
  const [, setLocation] = useLocation();
  const { openWindow } = useFloatingChat();
  const canManageChannels = role === "admin" || role === "executive" || role === "staff";

  const [view, setView] = useState<View>({ type: "list" });
  const [newDmOpen, setNewDmOpen] = useState(false);
  const [createChannelOpen, setCreateChannelOpen] = useState(false);

  function handleExpandFullscreen() {
    if (view.type === "channel") {
      setLocation(`/chat?type=channel&id=${view.channel.id}`);
    } else if (view.type === "aiAgent") {
      setLocation(`/chat?type=ai&id=${view.agent.id}`);
    } else if (view.type === "dm") {
      setLocation(`/chat?type=dm&id=${view.otherUser.id}`);
    } else {
      setLocation("/chat");
    }
    onClose();
  }

  function handlePopOut() {
    if (view.type === "channel") {
      openWindow({ type: "channel", channel: view.channel });
    } else if (view.type === "dm") {
      openWindow({ type: "dm", otherUser: view.otherUser });
    } else if (view.type === "aiAgent") {
      openWindow({ type: "aiAgent", agent: view.agent });
    }
  }

  const { data: channels = [] } = useQuery<ChatChannel[]>({
    queryKey: ["/api/chat/channels"],
    enabled: open,
    refetchInterval: open ? 10000 : false,
  });

  const { data: dmThreads = [] } = useQuery<DmThread[]>({
    queryKey: ["/api/chat/dm-threads"],
    enabled: open,
    refetchInterval: open ? 5000 : false,
  });

  const canUseAi = role === "admin" || role === "executive";
  const { data: aiAgentsList = [] } = useQuery<AiAgent[]>({
    queryKey: ["/api/ai-agents"],
    enabled: open && canUseAi,
  });

  function handleClose() {
    setView({ type: "list" });
    onClose();
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
        <SheetContent side="right" className="w-[400px] p-0 flex flex-col">
          {view.type === "list" && (
            <>
              <SheetHeader className="p-3 border-b shrink-0">
                <div className="flex items-center gap-2 pr-8">
                  <SheetTitle className="flex items-center gap-2 text-base">
                    <MessageCircle className="h-4 w-4" />
                    Chat
                  </SheetTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground shrink-0"
                    onClick={handleExpandFullscreen}
                    data-testid="button-expand-chat-fullscreen"
                    aria-label="Open fullscreen chat"
                  >
                    <Maximize2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto">
                {/* Channels section */}
                <div className="px-3 pt-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Channels</p>
                    {canManageChannels && (
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setCreateChannelOpen(true)} data-testid="button-new-channel" aria-label="Create new channel">
                        <Plus className="h-3 w-3" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                  {channels.length === 0 && (
                    <p className="text-xs text-muted-foreground px-1 py-2">No channels yet</p>
                  )}
                  {channels.map((ch) => (
                    <button
                      key={ch.id}
                      className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted/70 transition-colors text-left group"
                      onClick={() => setView({ type: "channel", channel: ch })}
                      data-testid={`channel-item-${ch.id}`}
                    >
                      <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate flex-1">{ch.name}</span>
                      {ch.isPrivate && <Lock className="h-3 w-3 text-muted-foreground/60 shrink-0" />}
                    </button>
                  ))}
                </div>

                {/* DMs section */}
                <div className="px-3 pt-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Direct Messages</p>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setNewDmOpen(true)} data-testid="button-new-dm" aria-label="New direct message">
                      <Plus className="h-3 w-3" aria-hidden="true" />
                    </Button>
                  </div>
                  {dmThreads.length === 0 && (
                    <p className="text-xs text-muted-foreground px-1 py-2">No conversations yet</p>
                  )}
                  {dmThreads.map((thread) => (
                    <button
                      key={thread.otherUser.id}
                      className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted/70 transition-colors text-left group"
                      onClick={() => setView({ type: "dm", otherUser: thread.otherUser })}
                      data-testid={`dm-thread-${thread.otherUser.id}`}
                    >
                      <Avatar user={thread.otherUser} size={6} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{thread.otherUser.displayName || thread.otherUser.username}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {thread.lastMessage.deletedAt ? "Message deleted" : thread.lastMessage.content}
                        </p>
                      </div>
                      {thread.unreadCount > 0 && (
                        <Badge variant="default" className="shrink-0 h-4 min-w-4 text-[10px] px-1">
                          {thread.unreadCount}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>

                {/* AI Agents section (admin/executive only) */}
                {canUseAi && aiAgentsList.length > 0 && (
                  <div className="px-3 pt-4 pb-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">AI Agents</p>
                    {aiAgentsList.map((agent) => (
                      <button
                        key={agent.id}
                        className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted/70 transition-colors text-left group"
                        onClick={() => setView({ type: "aiAgent", agent })}
                        data-testid={`ai-agent-item-${agent.id}`}
                      >
                        {agent.avatarUrl ? (
                          <img src={agent.avatarUrl} alt={agent.name} className="w-6 h-6 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <Bot className="h-3 w-3 text-primary" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{agent.name}</p>
                          {agent.description && (
                            <p className="text-[11px] text-muted-foreground truncate">{agent.description}</p>
                          )}
                        </div>
                        {!agent.enabled && (
                          <Badge variant="secondary" className="shrink-0 text-[10px]">Off</Badge>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {view.type === "channel" && (
            <ChannelView
              channel={view.channel}
              onBack={() => setView({ type: "list" })}
              onPopOut={handlePopOut}
            />
          )}

          {view.type === "dm" && (
            <DmView
              otherUser={view.otherUser}
              onBack={() => setView({ type: "list" })}
              onPopOut={handlePopOut}
            />
          )}

          {view.type === "aiAgent" && (
            <AiAgentView
              agent={view.agent}
              onBack={() => setView({ type: "list" })}
              onPopOut={handlePopOut}
            />
          )}
        </SheetContent>
      </Sheet>

      <NewDmDialog
        open={newDmOpen}
        onClose={() => setNewDmOpen(false)}
        onSelect={(u) => setView({ type: "dm", otherUser: u })}
      />

      <CreateChannelDialog
        open={createChannelOpen}
        onClose={() => setCreateChannelOpen(false)}
      />
    </>
  );
}
