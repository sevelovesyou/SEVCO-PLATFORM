import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Hash,
  MessageCircle,
  Trash2,
  Search,
  Filter,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ChatChannel, User } from "@shared/schema";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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

function formatDateTime(ts: string) {
  return new Date(ts).toLocaleString([], { dateStyle: "short", timeStyle: "short" });
}

function Avatar({ user }: { user: ChatUserInfo }) {
  const initials = (user.displayName || user.username).slice(0, 2).toUpperCase();
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={initials}
        className="w-7 h-7 rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
      {initials}
    </div>
  );
}

export default function CommandChatLog() {
  const { toast } = useToast();
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: channels = [] } = useQuery<ChatChannel[]>({
    queryKey: ["/api/chat/channels"],
  });

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/chat/users"],
  });

  const params = new URLSearchParams();
  if (channelFilter !== "all" && channelFilter !== "dms") params.set("channelId", channelFilter);
  if (userFilter) params.set("userId", userFilter);
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);

  const { data: messages = [], isLoading, refetch } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/log", channelFilter, userFilter, dateFrom, dateTo],
    queryFn: () => fetch(`/api/chat/log?${params.toString()}`).then((r) => r.json()),
  });

  const dmFiltered = channelFilter === "dms"
    ? messages.filter((m) => !m.channelId)
    : channelFilter === "all"
    ? messages
    : messages.filter((m) => m.channelId === parseInt(channelFilter));

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/chat/messages/${id}`),
    onSuccess: () => {
      toast({ title: "Message deleted" });
      setDeleteId(null);
      refetch();
    },
    onError: () => {
      toast({ title: "Failed to delete message", variant: "destructive" });
    },
  });

  function handleClear() {
    setChannelFilter("all");
    setUserFilter("");
    setDateFrom("");
    setDateTo("");
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="min-w-[160px]">
          <label className="text-xs text-muted-foreground mb-1 block">Channel</label>
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="h-8 text-xs" data-testid="select-chat-log-channel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Messages</SelectItem>
              <SelectItem value="dms">DMs Only</SelectItem>
              {channels.map((ch) => (
                <SelectItem key={ch.id} value={String(ch.id)}>
                  #{ch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[160px]">
          <label className="text-xs text-muted-foreground mb-1 block">User</label>
          <Select value={userFilter || "all"} onValueChange={(v) => setUserFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="h-8 text-xs" data-testid="select-chat-log-user">
              <SelectValue placeholder="All users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {allUsers.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.displayName || u.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">From</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-8 text-xs w-36"
            data-testid="input-chat-log-date-from"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">To</label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-8 text-xs w-36"
            data-testid="input-chat-log-date-to"
          />
        </div>

        <Button variant="outline" size="sm" className="h-8" onClick={handleClear} data-testid="button-chat-log-clear">
          Clear
        </Button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span data-testid="text-chat-log-count">{dmFiltered.length} message{dmFiltered.length !== 1 ? "s" : ""}</span>
        <span className="text-muted-foreground/40">·</span>
        <span>{dmFiltered.filter((m) => !!m.deletedAt).length} deleted</span>
      </div>

      {/* Messages table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
          Loading messages…
        </div>
      ) : dmFiltered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
          <MessageCircle className="h-8 w-8 opacity-30" />
          <p className="text-sm">No messages found</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {dmFiltered.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-lg border p-3 flex gap-3 items-start ${
                msg.deletedAt ? "opacity-60 bg-muted/40" : "bg-card"
              }`}
              data-testid={`log-message-${msg.id}`}
            >
              <Avatar user={msg.fromUser} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-sm font-semibold">
                    {msg.fromUser.displayName || msg.fromUser.username}
                  </span>
                  {msg.channelId ? (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                      <Hash className="h-2.5 w-2.5" />
                      {msg.channel?.name ?? `ch:${msg.channelId}`}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 text-blue-500 border-blue-500/30">
                      <MessageCircle className="h-2.5 w-2.5" />
                      DM → {msg.toUser?.displayName || msg.toUser?.username || "?"}
                    </Badge>
                  )}
                  {msg.deletedAt && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-destructive">
                      Deleted
                    </Badge>
                  )}
                  <span className="text-[11px] text-muted-foreground ml-auto">
                    {formatDateTime(msg.createdAt)}
                  </span>
                </div>
                <p className={`text-sm break-words ${msg.deletedAt ? "italic text-muted-foreground" : ""}`}>
                  {msg.deletedAt ? "This message was deleted." : msg.content}
                </p>
              </div>
              {!msg.deletedAt && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                        aria-label="Delete"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteId(msg.id)}
                      data-testid={`button-delete-message-${msg.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete message</TooltipContent>
                </Tooltip>
              )}
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete the message. It will remain in the log but won't be visible to users.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId !== null && deleteMutation.mutate(deleteId)}
              data-testid="button-confirm-delete-message"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
