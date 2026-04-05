import { useState, useRef, useEffect } from "react";
import { resolveImageUrl } from "@/lib/resolve-image-url";
import { useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { usePermission } from "@/hooks/use-permission";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useFloatingChat } from "@/contexts/floating-chat-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AiMessageRenderer, useCodePreview, CodePreviewPanel } from "@/components/ai-message-renderer";
import { AiMessageActionBar } from "@/components/ai-message-action-bar";
import { AgentComposer } from "@/components/agent-composer";
import { ThinkingIndicator } from "@/components/thinking-indicator";
import { useAgentStream } from "@/hooks/use-agent-stream";
import {
  Hash,
  MessageCircle,
  Bot,
  Send,
  Trash2,
  Lock,
  Plus,
  ExternalLink,
  Users,
} from "lucide-react";
import type { ChatChannel, AiAgent, AiMessage } from "@shared/schema";

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

type DmThread = {
  otherUser: ChatUserInfo;
  lastMessage: ChatMessage;
  unreadCount: number;
};

type ActiveConversation =
  | { type: "channel"; channel: ChatChannel }
  | { type: "dm"; otherUser: ChatUserInfo }
  | { type: "aiAgent"; agent: AiAgent };

function formatTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function Avatar({ user, size = 8 }: { user: ChatUserInfo; size?: number }) {
  const initials = (user.displayName || user.username).slice(0, 2).toUpperCase();
  if (user.avatarUrl) {
    return (
      <img
        src={resolveImageUrl(user.avatarUrl)}
        alt={initials}
        className={`w-${size} h-${size} rounded-full object-cover shrink-0`}
      />
    );
  }
  return (
    <div className={`w-${size} h-${size} rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0`}>
      {initials}
    </div>
  );
}

function MessageComposer({ onSend, disabled, placeholder }: { onSend: (content: string) => void; disabled?: boolean; placeholder?: string }) {
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
    <div className="flex gap-2 items-end p-4 border-t bg-background shrink-0">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || "Type a message… (Enter to send)"}
        className="resize-none min-h-[40px] max-h-[120px] text-sm py-2"
        rows={1}
        disabled={disabled}
        data-testid="input-fullscreen-chat-message"
      />
      <Button
        size="icon"
        className="shrink-0 h-10 w-10"
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        data-testid="button-fullscreen-send-message"
        aria-label="Send message"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ChannelContent({ channel, onPopOut }: { channel: ChatChannel; onPopOut: () => void }) {
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
      <div className="flex items-center gap-3 px-6 py-4 border-b shrink-0 bg-background">
        <Hash className="h-5 w-5 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold truncate">{channel.name}</h2>
          {channel.description && (
            <p className="text-sm text-muted-foreground truncate">{channel.description}</p>
          )}
        </div>
        {channel.isPrivate && <Lock className="h-4 w-4 text-muted-foreground" />}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={onPopOut}
          data-testid={`button-popout-channel-${channel.id}`}
          title="Pop out into floating window"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0" data-testid="fullscreen-channel-messages">
        {isLoading && (
          <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">Loading messages…</div>
        )}
        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
            <Hash className="h-8 w-8 opacity-30" />
            <p className="text-sm">No messages yet. Say hello!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMine = msg.fromUserId === user?.id;
          const isDeleted = !!msg.deletedAt;
          return (
            <div key={msg.id} className={`flex gap-3 group ${isMine ? "flex-row-reverse" : "flex-row"}`} data-testid={`fullscreen-chat-msg-${msg.id}`}>
              {!isMine && <Avatar user={msg.fromUser} size={8} />}
              <div className={`flex flex-col max-w-[70%] ${isMine ? "items-end" : "items-start"}`}>
                {!isMine && (
                  <span className="text-xs text-muted-foreground mb-1 px-1">
                    {msg.fromUser.displayName || msg.fromUser.username}
                  </span>
                )}
                <div className={`rounded-2xl px-4 py-2.5 text-sm break-words ${
                  isDeleted ? "bg-muted/50 text-muted-foreground italic"
                    : isMine ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}>
                  {isDeleted ? "This message was deleted." : msg.content}
                </div>
                <span className="text-[11px] text-muted-foreground mt-1 px-1">{formatTime(msg.createdAt)}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <MessageComposer
        onSend={(c) => sendMutation.mutate(c)}
        disabled={sendMutation.isPending}
        placeholder={`Message #${channel.name}…`}
      />
    </div>
  );
}

function DmContent({ otherUser, onPopOut }: { otherUser: ChatUserInfo; onPopOut: () => void }) {
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
      <div className="flex items-center gap-3 px-6 py-4 border-b shrink-0 bg-background">
        <Avatar user={otherUser} size={8} />
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold truncate">{otherUser.displayName || otherUser.username}</h2>
          <p className="text-sm text-muted-foreground">@{otherUser.username}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={onPopOut}
          data-testid={`button-popout-dm-${otherUser.id}`}
          title="Pop out into floating window"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0" data-testid="fullscreen-dm-messages">
        {isLoading && (
          <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">Loading messages…</div>
        )}
        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
            <MessageCircle className="h-8 w-8 opacity-30" />
            <p className="text-sm">No messages yet. Start the conversation!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMine = msg.fromUserId === user?.id;
          return (
            <div key={msg.id} className={`flex gap-3 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
              {!isMine && <Avatar user={msg.fromUser} size={8} />}
              <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm break-words ${
                isMine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              }`}>
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <MessageComposer
        onSend={(c) => sendMutation.mutate(c)}
        disabled={sendMutation.isPending}
        placeholder={`Message ${otherUser.displayName || otherUser.username}…`}
      />
    </div>
  );
}

function AiContent({ agent, onPopOut }: { agent: AiAgent; onPopOut: () => void }) {
  const { toast } = useToast();
  const bottomRef = useRef<HTMLDivElement>(null);
  const { streamingContent, isStreaming, send, regenerate } = useAgentStream(agent.id);
  const { preview, openPreview, closePreview } = useCodePreview();

  const { data: messages = [], isLoading } = useQuery<AiMessage[]>({
    queryKey: ["/api/ai/chat", agent.id],
    queryFn: () => fetch(`/api/ai/chat/${agent.id}`).then((r) => r.json()),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamingContent]);

  const clearMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/ai/chat/${agent.id}/clear`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/ai/chat", agent.id] }),
  });

  async function handleSend(content: string) {
    try {
      await send(content);
    } catch (e: any) {
      toast({ title: "AI Error", description: e.message, variant: "destructive" });
    }
  }

  async function handleRegenerate(msgId: number) {
    try {
      await regenerate(msgId);
    } catch (e: any) {
      toast({ title: "Regenerate failed", description: e.message, variant: "destructive" });
    }
  }

  return (
    <div className="flex h-full">
      <div className={`flex flex-col ${preview ? "w-1/2" : "w-full"} h-full transition-all`}>
        <div className="flex items-center gap-3 px-6 py-4 border-b shrink-0 bg-background">
          {agent.avatarUrl ? (
            <img src={resolveImageUrl(agent.avatarUrl)} alt={agent.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold truncate">{agent.name}</h2>
            <p className="text-sm text-muted-foreground">{agent.modelSlug}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => { if (confirm("Clear conversation history?")) clearMutation.mutate(); }}
            data-testid={`button-fullscreen-ai-clear-${agent.id}`}
            title="Clear conversation"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onPopOut}
            data-testid={`button-popout-ai-${agent.id}`}
            title="Pop out into floating window"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0" data-testid="fullscreen-ai-messages">
          {isLoading && (
            <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">Loading…</div>
          )}
          {!isLoading && messages.length === 0 && !isStreaming && (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
              <Bot className="h-8 w-8 opacity-30" />
              <p className="text-sm">Start a conversation with {agent.name}</p>
              {agent.description && <p className="text-xs text-center text-muted-foreground/70 max-w-xs">{agent.description}</p>}
            </div>
          )}
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div key={msg.id} className={`flex gap-3 group ${isUser ? "flex-row-reverse" : "flex-row"}`} data-testid={`fullscreen-ai-msg-${msg.id}`}>
                {!isUser && (
                  agent.avatarUrl ? (
                    <img src={resolveImageUrl(agent.avatarUrl)} alt={agent.name} className="w-8 h-8 rounded-full object-cover shrink-0 mt-1" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )
                )}
                <div className={`flex flex-col max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>
                  <div className={`rounded-2xl px-4 py-2.5 text-sm break-words ${isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                    {isUser ? msg.content : <AiMessageRenderer content={msg.content} onPreview={openPreview} />}
                  </div>
                  {!isUser && (
                    <AiMessageActionBar
                      messageId={msg.id}
                      agentId={agent.id}
                      content={msg.content}
                      onRegenerate={handleRegenerate}
                    />
                  )}
                  <span className="text-[11px] text-muted-foreground mt-1 px-1">
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
            />
          )}
          <div ref={bottomRef} />
        </div>

        <AgentComposer
          agent={agent}
          onSend={handleSend}
          onClear={() => { if (confirm("Clear conversation history?")) clearMutation.mutate(); }}
          disabled={isStreaming}
        />
      </div>
      {preview && (
        <div className="w-1/2 h-full" style={{ minWidth: 300 }}>
          <CodePreviewPanel preview={preview} onClose={closePreview} />
        </div>
      )}
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

  const { data: allUsers = [] } = useQuery<ChatUserInfo[]>({
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
            >
              <Avatar user={{ id: u.id, username: u.username, displayName: u.displayName ?? null, avatarUrl: u.avatarUrl ?? null }} size={8} />
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

export default function FullscreenChatPage() {
  const { user } = useAuth();
  const { role } = usePermission();
  const { openWindow } = useFloatingChat();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialType = params.get("type");
  const initialId = params.get("id");

  const [active, setActive] = useState<ActiveConversation | null>(null);
  const [newDmOpen, setNewDmOpen] = useState(false);

  const canManageChannels = role === "admin" || role === "executive" || role === "staff";
  const canUseAi = role === "admin" || role === "executive";

  const { data: channels = [] } = useQuery<ChatChannel[]>({
    queryKey: ["/api/chat/channels"],
    refetchInterval: 15000,
  });

  const { data: dmThreads = [] } = useQuery<DmThread[]>({
    queryKey: ["/api/chat/dm-threads"],
    refetchInterval: 5000,
  });

  const { data: aiAgents = [] } = useQuery<AiAgent[]>({
    queryKey: ["/api/ai-agents"],
    enabled: canUseAi,
  });

  useEffect(() => {
    if (!initialType || !initialId) return;
    if (initialType === "channel") {
      const ch = channels.find((c) => String(c.id) === initialId);
      if (ch) setActive({ type: "channel", channel: ch });
    } else if (initialType === "ai") {
      const agent = aiAgents.find((a) => String(a.id) === initialId);
      if (agent) setActive({ type: "aiAgent", agent });
    } else if (initialType === "dm") {
      const thread = dmThreads.find((t) => t.otherUser.id === initialId);
      if (thread) setActive({ type: "dm", otherUser: thread.otherUser });
    }
  }, [initialType, initialId, channels, aiAgents, dmThreads]);

  function handlePopOut() {
    if (!active) return;
    openWindow(active);
  }

  if (!user) return null;

  return (
    <div className="flex h-[calc(100vh-3rem)] overflow-hidden" data-testid="fullscreen-chat-page">
      <div className="w-64 shrink-0 border-r flex flex-col bg-muted/20 overflow-y-auto">
        <div className="p-3 border-b">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Chat
          </h2>
        </div>

        <div className="p-2 flex-1 overflow-y-auto">
          <div className="mb-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pb-1">
              Channels
            </p>
            {channels.length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-1">No channels yet</p>
            )}
            {channels.map((ch) => (
              <button
                key={ch.id}
                className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-colors text-left text-sm ${
                  active?.type === "channel" && active.channel.id === ch.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted/70"
                }`}
                onClick={() => setActive({ type: "channel", channel: ch })}
                data-testid={`fullscreen-channel-${ch.id}`}
              >
                <Hash className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <span className="truncate flex-1">{ch.name}</span>
                {ch.isPrivate && <Lock className="h-3 w-3 shrink-0 opacity-60" />}
              </button>
            ))}
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between px-2 pb-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Direct Messages
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4"
                onClick={() => setNewDmOpen(true)}
                data-testid="button-fullscreen-new-dm"
                aria-label="New DM"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            {dmThreads.length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-1">No conversations yet</p>
            )}
            {dmThreads.map((thread) => (
              <button
                key={thread.otherUser.id}
                className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-colors text-left text-sm ${
                  active?.type === "dm" && active.otherUser.id === thread.otherUser.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted/70"
                }`}
                onClick={() => setActive({ type: "dm", otherUser: thread.otherUser })}
                data-testid={`fullscreen-dm-${thread.otherUser.id}`}
              >
                {thread.otherUser.avatarUrl ? (
                  <img src={resolveImageUrl(thread.otherUser.avatarUrl)} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-[8px] font-bold text-primary">
                    {(thread.otherUser.displayName || thread.otherUser.username).slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="truncate flex-1">{thread.otherUser.displayName || thread.otherUser.username}</span>
                {thread.unreadCount > 0 && (
                  <Badge variant="default" className="shrink-0 h-4 min-w-4 text-[9px] px-1">
                    {thread.unreadCount}
                  </Badge>
                )}
              </button>
            ))}
          </div>

          {canUseAi && aiAgents.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pb-1">
                AI Agents
              </p>
              {aiAgents.map((agent) => (
                <button
                  key={agent.id}
                  className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-colors text-left text-sm ${
                    active?.type === "aiAgent" && active.agent.id === agent.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted/70"
                  }`}
                  onClick={() => setActive({ type: "aiAgent", agent })}
                  data-testid={`fullscreen-ai-agent-${agent.id}`}
                >
                  {agent.avatarUrl ? (
                    <img src={resolveImageUrl(agent.avatarUrl)} alt={agent.name} className="w-5 h-5 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <Bot className="h-3 w-3 text-primary" />
                    </div>
                  )}
                  <span className="truncate flex-1">{agent.name}</span>
                  {!agent.enabled && <Badge variant="secondary" className="shrink-0 text-[9px]">Off</Badge>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {!active && (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3" data-testid="fullscreen-chat-empty">
            <MessageCircle className="h-12 w-12 opacity-20" />
            <p className="text-sm">Select a conversation to start chatting</p>
          </div>
        )}
        {active?.type === "channel" && (
          <ChannelContent channel={active.channel} onPopOut={handlePopOut} />
        )}
        {active?.type === "dm" && (
          <DmContent otherUser={active.otherUser} onPopOut={handlePopOut} />
        )}
        {active?.type === "aiAgent" && (
          <AiContent agent={active.agent} onPopOut={handlePopOut} />
        )}
      </div>

      <NewDmDialog
        open={newDmOpen}
        onClose={() => setNewDmOpen(false)}
        onSelect={(u) => setActive({ type: "dm", otherUser: u })}
      />
    </div>
  );
}
