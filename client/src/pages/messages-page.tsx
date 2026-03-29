import { PageHead } from "@/components/page-head";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Inbox,
  Send,
  Star,
  FileText,
  Trash2,
  Pencil,
  Search,
  ChevronLeft,
  Hash,
  MessageCircle,
  RefreshCw,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { EmailComposeModal } from "@/components/email-compose-modal";
import { EmailReadView } from "@/components/email-read-view";
import type { Email, ChatChannel, ChatMessage } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { isClientPlus } from "@/lib/permissions";
import { useToast } from "@/hooks/use-toast";

type ChatMessageWithUser = ChatMessage & {
  fromUser: { id: string; username: string; displayName: string | null; avatarUrl: string | null };
  toUser: { id: string; username: string; displayName: string | null; avatarUrl: string | null } | null;
  channel: { id: number; name: string } | null;
};

type Folder = "inbox" | "sent" | "drafts" | "trash" | "starred";

const FOLDER_ITEMS: { id: Folder; label: string; icon: React.ElementType }[] = [
  { id: "inbox",   label: "Inbox",   icon: Inbox },
  { id: "sent",    label: "Sent",    icon: Send },
  { id: "starred", label: "Starred", icon: Star },
  { id: "drafts",  label: "Drafts",  icon: FileText },
  { id: "trash",   label: "Trash",   icon: Trash2 },
];

function InitialsAvatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center shrink-0 text-xs">
      {initials || "?"}
    </div>
  );
}

function EmailListItem({
  email,
  isSelected,
  onClick,
}: {
  email: Email;
  isSelected: boolean;
  onClick: () => void;
}) {
  const senderName = email.fromAddress.match(/^(.+?)\s*</)?.[1]?.trim() ?? email.fromAddress.split("@")[0];
  const preview = email.bodyText?.replace(/\s+/g, " ").trim().slice(0, 100) || "";
  const date = new Date(email.createdAt);

  let timeStr = "";
  try {
    timeStr = formatDistanceToNow(date, { addSuffix: true });
  } catch {
    timeStr = String(email.createdAt);
  }

  return (
    <div
      className={`flex items-start gap-3 px-3 py-2.5 border-b border-border/40 cursor-pointer transition-colors hover:bg-muted/50 ${
        isSelected ? "bg-muted" : email.isRead ? "" : "bg-blue-50/30 dark:bg-blue-950/20"
      }`}
      onClick={onClick}
      data-testid={`email-list-item-${email.id}`}
    >
      <InitialsAvatar name={senderName} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-sm truncate ${!email.isRead ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}
            data-testid={`email-sender-${email.id}`}
          >
            {senderName}
          </span>
          <span className="text-[11px] text-muted-foreground shrink-0" data-testid={`email-date-${email.id}`}>
            {timeStr}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {!email.isRead && <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" data-testid={`unread-dot-${email.id}`} />}
          {email.isStarred && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 shrink-0" />}
          <span
            className={`text-xs truncate ${!email.isRead ? "font-medium text-foreground" : "text-muted-foreground"}`}
            data-testid={`email-subject-${email.id}`}
          >
            {email.subject || "(no subject)"}
          </span>
        </div>
        {preview && (
          <p className="text-[11px] text-muted-foreground truncate mt-0.5" data-testid={`email-preview-${email.id}`}>
            {preview}
          </p>
        )}
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeFolder, setActiveFolder] = useState<Folder>("inbox");
  const [selectedEmailId, setSelectedEmailId] = useState<number | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"sidebar" | "list" | "read">("sidebar");
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);

  if (!user || !isClientPlus(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Email is available for Client and above</h2>
          <p className="text-muted-foreground">Upgrade your account to access the SEVCO email client.</p>
        </div>
        <Link href="/">
          <Button variant="outline">Back to Home</Button>
        </Link>
      </div>
    );
  }

  const { data: folderCounts, isFetching: countsFetching, refetch: refetchCounts } = useQuery<Record<string, number>>({
    queryKey: ["/api/email/folders"],
    refetchInterval: 30000,
  });

  const { data: addressData } = useQuery<{ address: string }>({
    queryKey: ["/api/email/address"],
  });

  const { data: emails = [], isLoading: emailsLoading, isFetching: emailsFetching, refetch: refetchEmails } = useQuery<Email[]>({
    queryKey: ["/api/email/messages", activeFolder, search],
    queryFn: async () => {
      const params = new URLSearchParams({ folder: search ? "all" : activeFolder, limit: "50" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/email/messages?${params}`);
      if (!res.ok) throw new Error("Failed to fetch emails");
      return res.json();
    },
  });

  const { data: channels = [] } = useQuery<ChatChannel[]>({
    queryKey: ["/api/chat/channels"],
  });

  const { data: channelMessages = [], isLoading: channelMessagesLoading } = useQuery<ChatMessageWithUser[]>({
    queryKey: ["/api/chat/channels", selectedChannel?.id, "messages"],
    queryFn: async () => {
      const res = await fetch(`/api/chat/channels/${selectedChannel!.id}/messages?limit=50`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!selectedChannel,
  });

  const selectedEmail = emails.find((e) => e.id === selectedEmailId) ?? null;
  const fromAddress = addressData?.address ?? `${user.username}@sevco.us`;
  const unreadCount = folderCounts?.unreadInbox ?? 0;

  const markReadMutation = useMutation({
    mutationFn: async (emailId: number) => {
      const res = await fetch(`/api/email/messages/${emailId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
      if (!res.ok) throw new Error("Failed to mark as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email/folders"] });
    },
  });

  function handleSelectEmail(email: Email) {
    setSelectedEmailId(email.id);
    setSelectedChannel(null);
    setMobileView("read");
    if (!email.isRead) {
      markReadMutation.mutate(email.id);
    }
  }

  function handleFolderClick(folder: Folder) {
    handleFolderChange(folder);
    setMobileView("list");
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
  }

  function handleFolderChange(folder: Folder) {
    setActiveFolder(folder);
    setSelectedEmailId(null);
    setSelectedChannel(null);
    setSearch("");
    setSearchInput("");
  }

  function handleSelectChannel(ch: ChatChannel) {
    setSelectedChannel(ch);
    setSelectedEmailId(null);
    setMobileView("read");
    setChatInput("");
  }

  async function handleSendChatMessage() {
    if (!selectedChannel || !chatInput.trim() || sendingChat) return;
    setSendingChat(true);
    try {
      const res = await fetch(`/api/chat/channels/${selectedChannel.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: chatInput.trim() }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      setChatInput("");
      queryClient.invalidateQueries({ queryKey: ["/api/chat/channels", selectedChannel.id, "messages"] });
    } catch {
      toast({ title: "Failed to send message", variant: "destructive" });
    } finally {
      setSendingChat(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] overflow-hidden" data-testid="messages-page">
      <PageHead slug="messages" title="Messages — SEVCO" description="Your SEVCO inbox — email, direct messages, and platform notifications." noIndex={true} />
      <div
        className={`shrink-0 border-r flex flex-col bg-muted/20 overflow-y-auto
          w-full md:w-48 ${mobileView === "sidebar" ? "flex" : "hidden"} md:flex`}
      >
        <div className="p-2 border-b flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Messages</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => { refetchEmails(); refetchCounts(); }}
              data-testid="button-refresh-inbox"
              title="Refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${emailsFetching || countsFetching ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setComposeOpen(true)}
              data-testid="button-compose-email"
              title="Compose"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="p-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pb-1">
            Email
          </p>
          {FOLDER_ITEMS.map(({ id, label, icon: Icon }) => {
            const count = id === "inbox" ? folderCounts?.inbox : id === "drafts" ? folderCounts?.drafts : 0;
            const unread = id === "inbox" ? unreadCount : 0;
            return (
              <button
                key={id}
                className={`flex items-center justify-between w-full px-2 py-1.5 rounded-md text-sm transition-colors
                  ${activeFolder === id && !search ? "bg-primary text-primary-foreground font-medium" : "text-foreground hover:bg-muted"}`}
                onClick={() => handleFolderClick(id)}
                data-testid={`folder-${id}`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{label}</span>
                </div>
                <div className="flex items-center gap-1">
                  {unread > 0 && (
                    <Badge className="h-4 min-w-4 px-1 text-[10px] bg-blue-500 hover:bg-blue-500 rounded-full" data-testid={`badge-unread-${id}`}>
                      {unread > 99 ? "99+" : unread}
                    </Badge>
                  )}
                  {!unread && count && count > 0 ? (
                    <span className="text-[11px] text-muted-foreground">{count}</span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        {channels.length > 0 && (
          <div className="p-2 border-t mt-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pb-1">
              Chat
            </p>
            {channels.slice(0, 5).map((ch) => (
              <div
                key={ch.id}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors cursor-pointer ${
                  selectedChannel?.id === ch.id ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                }`}
                onClick={() => handleSelectChannel(ch)}
                data-testid={`chat-channel-${ch.id}`}
              >
                <Hash className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <span className="truncate">{ch.name}</span>
              </div>
            ))}
            <div
              className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-foreground hover:bg-muted transition-colors cursor-pointer"
              onClick={() => {
                const el = document.querySelector<HTMLButtonElement>("[data-testid='button-open-chat']");
                el?.click();
              }}
              data-testid="open-chat-dms"
            >
              <MessageCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span>Direct Messages</span>
            </div>
          </div>
        )}
      </div>

      <div
        className={`flex flex-col border-r bg-background overflow-hidden
          ${mobileView === "list" ? "flex" : "hidden"} md:flex
          w-full md:w-72 md:shrink-0`}
      >
        <div className="md:hidden p-2 border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileView("sidebar")}
            data-testid="button-back-to-sidebar"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </div>
        <div className="p-2 border-b">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search emails..."
              className="pl-7 h-8 text-sm"
              data-testid="input-email-search"
            />
          </form>
        </div>

        <div className="px-3 py-1.5 border-b flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground capitalize">
            {search ? `Search: "${search}"` : activeFolder}
          </span>
          {search && (
            <button
              className="text-[11px] text-muted-foreground hover:text-foreground"
              onClick={() => { setSearch(""); setSearchInput(""); }}
              data-testid="button-clear-search"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {emailsLoading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-2.5 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : emails.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={search ? "No results found" : `No emails in ${activeFolder}`}
              description={search ? "Try different search terms." : "When you receive messages, they'll appear here."}
              className="h-full py-0"
            />
          ) : (
            emails.map((email) => (
              <EmailListItem
                key={email.id}
                email={email}
                isSelected={selectedEmailId === email.id}
                onClick={() => handleSelectEmail(email)}
              />
            ))
          )}
        </div>
      </div>

      <div
        className={`flex-1 flex flex-col overflow-hidden bg-background
          ${mobileView === "read" ? "flex" : "hidden"} md:flex`}
      >
        {mobileView === "read" && (
          <div className="md:hidden p-2 border-b">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setMobileView("list"); setSelectedEmailId(null); setSelectedChannel(null); }}
              data-testid="button-back-to-list"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
        )}

        {selectedChannel ? (
          <div className="flex flex-col h-full" data-testid="channel-thread-view">
            <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden mr-1 -ml-2 h-7"
                onClick={() => { setSelectedChannel(null); setMobileView("list"); }}
                data-testid="button-back-to-channels"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-sm">{selectedChannel.name}</span>
              {selectedChannel.description && (
                <span className="text-xs text-muted-foreground truncate">— {selectedChannel.description}</span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {channelMessagesLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : channelMessages.length === 0 ? (
                <EmptyState
                  icon={Hash}
                  title={`No messages in #${selectedChannel.name} yet`}
                  description="Start a conversation by sending the first message."
                  className="h-full py-0"
                />
              ) : (
                [...channelMessages].reverse().map((msg) => {
                  const senderName = msg.fromUser?.displayName ?? msg.fromUser?.username ?? "Unknown";
                  let timeStr = "";
                  try { timeStr = formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true }); } catch {}
                  return (
                    <div key={msg.id} className="flex items-start gap-3" data-testid={`channel-msg-${msg.id}`}>
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center shrink-0 text-xs">
                        {senderName[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-semibold">{senderName}</span>
                          <span className="text-[11px] text-muted-foreground">{timeStr}</span>
                        </div>
                        <p className="text-sm text-foreground/90 mt-0.5 break-words">{msg.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="border-t p-3 flex gap-2 shrink-0">
              <Input
                placeholder={`Message #${selectedChannel.name}…`}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendChatMessage()}
                data-testid="input-chat-message"
              />
              <Button
                onClick={handleSendChatMessage}
                disabled={!chatInput.trim() || sendingChat}
                size="icon"
                data-testid="button-send-chat"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : selectedEmail ? (
          <EmailReadView
            email={selectedEmail}
            fromAddress={fromAddress}
            onDeleted={() => {
              setSelectedEmailId(null);
              setMobileView("list");
              refetchEmails();
              refetchCounts();
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground gap-3" data-testid="email-empty-state">
            <Inbox className="h-12 w-12 opacity-20" />
            <div>
              <p className="text-sm font-medium">Select an email to read</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">{fromAddress}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setComposeOpen(true)}
              data-testid="button-compose-empty"
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Compose
            </Button>
          </div>
        )}
      </div>

      {composeOpen && (
        <EmailComposeModal
          open={composeOpen}
          onClose={() => setComposeOpen(false)}
          fromAddress={fromAddress}
        />
      )}
    </div>
  );
}
