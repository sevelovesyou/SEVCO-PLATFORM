import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Reply,
  CornerUpLeft,
  Forward,
  Star,
  Trash2,
  FolderOpen,
  Download,
  File,
  Mail,
  Archive,
  FolderInput,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Email } from "@shared/schema";
import DOMPurify from "dompurify";
import { formatDistanceToNow, format } from "date-fns";
import { EmailComposeModal } from "./email-compose-modal";

interface EmailReadViewProps {
  email: Email;
  fromAddress: string;
  onDeleted?: () => void;
}

function formatEmailDate(date: string | Date): string {
  const d = new Date(date);
  try {
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 1000 * 60 * 60 * 24) {
      return formatDistanceToNow(d, { addSuffix: true });
    }
    return format(d, "MMM d, yyyy 'at' h:mm a");
  } catch {
    return String(date);
  }
}

function safeHtml(html: string): string {
  if (typeof window === "undefined") return html;
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "b", "strong", "i", "em", "u", "a", "ul", "ol", "li",
      "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre", "code",
      "table", "thead", "tbody", "tr", "th", "td", "div", "span", "img",
      "hr", "sub", "sup",
    ],
    ALLOWED_ATTR: ["href", "src", "alt", "title", "class", "style", "target", "rel"],
    ALLOW_DATA_ATTR: false,
    ADD_DATA_URI_TAGS: ["img"],
  });
}

function InitialsAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const sz = size === "sm" ? "h-6 w-6 text-[10px]" : "h-9 w-9 text-sm";
  return (
    <div className={`${sz} rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center shrink-0`}>
      {initials || "?"}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MOVE_FOLDERS = [
  { id: "inbox", label: "Inbox" },
  { id: "sent", label: "Sent" },
  { id: "starred", label: "Starred" },
  { id: "drafts", label: "Drafts" },
  { id: "archive", label: "Archive" },
  { id: "spam", label: "Spam" },
  { id: "trash", label: "Trash" },
];

export function EmailReadView({ email, fromAddress, onDeleted }: EmailReadViewProps) {
  const { toast } = useToast();
  const [composeMode, setComposeMode] = useState<"reply" | "reply-all" | "forward" | null>(null);
  const [showAllHeaders, setShowAllHeaders] = useState(false);

  const starMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/email/messages/${email.id}/star`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email/folders"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/email/messages/${email.id}`),
    onSuccess: () => {
      toast({ title: email.folder === "trash" ? "Email permanently deleted" : "Moved to trash" });
      queryClient.invalidateQueries({ queryKey: ["/api/email/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email/folders"] });
      onDeleted?.();
    },
  });

  const markUnreadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/email/messages/${email.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: false }),
      });
      if (!res.ok) throw new Error("Failed to mark as unread");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Marked as unread" });
      queryClient.invalidateQueries({ queryKey: ["/api/email/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email/folders"] });
      onDeleted?.();
    },
  });

  const moveMutation = useMutation({
    mutationFn: async (folder: string) => {
      const res = await fetch(`/api/email/messages/${email.id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder }),
      });
      if (!res.ok) throw new Error("Failed to move email");
      return res.json();
    },
    onSuccess: (_data, folder) => {
      toast({ title: `Moved to ${folder}` });
      queryClient.invalidateQueries({ queryKey: ["/api/email/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email/folders"] });
      onDeleted?.();
    },
  });

  const attachments = (email.attachments as Array<{ filename: string; contentType: string; url: string; size: number; content?: string }>) ?? [];
  const sanitizedHtml = email.bodyHtml ? safeHtml(email.bodyHtml) : "";

  const senderName = email.fromAddress.match(/^(.+?)\s*</) ? email.fromAddress.match(/^(.+?)\s*</)?.[1] ?? email.fromAddress : email.fromAddress;
  const senderEmail = email.fromAddress.match(/<(.+?)>/) ? email.fromAddress.match(/<(.+?)>/)?.[1] ?? email.fromAddress : email.fromAddress;

  function getReplyInitial(): { to: string[]; subject: string; body: string } {
    const quotedBody = `\n\n---\nOn ${formatEmailDate(email.createdAt)}, ${email.fromAddress} wrote:\n${email.bodyText || ""}`;
    return {
      to: [email.fromAddress],
      subject: email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`,
      body: quotedBody,
    };
  }

  function getReplyAllInitial(): { to: string[]; subject: string; body: string } {
    const base = getReplyInitial();
    const allRecipients = [...email.toAddresses, ...(email.ccAddresses ?? [])].filter((addr) => addr !== fromAddress);
    return { ...base, to: [email.fromAddress, ...allRecipients] };
  }

  function getForwardInitial(): { to: string[]; subject: string; body: string } {
    const quotedBody = `\n\n--- Forwarded Message ---\nFrom: ${email.fromAddress}\nTo: ${email.toAddresses.join(", ")}\nDate: ${formatEmailDate(email.createdAt)}\nSubject: ${email.subject}\n\n${email.bodyText || ""}`;
    return {
      to: [],
      subject: email.subject.startsWith("Fwd:") ? email.subject : `Fwd: ${email.subject}`,
      body: quotedBody,
    };
  }

  const composeProps = composeMode === "reply" ? getReplyInitial()
    : composeMode === "reply-all" ? getReplyAllInitial()
    : composeMode === "forward" ? getForwardInitial()
    : { to: [], subject: "", body: "" };

  return (
    <div className="flex flex-col h-full" data-testid="email-read-view">
      <div className="border-b px-4 py-3 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-foreground truncate" data-testid="text-email-subject">
            {email.subject || "(no subject)"}
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            {!email.isRead && <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0" data-testid="indicator-unread" />}
            {email.isStarred && <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 shrink-0" />}
            <span className="text-xs text-muted-foreground" data-testid="text-email-date">
              {formatEmailDate(email.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => markUnreadMutation.mutate()}
            disabled={markUnreadMutation.isPending}
            data-testid="button-mark-unread"
            title="Mark as unread"
          >
            <Mail className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => moveMutation.mutate("archive")}
            disabled={moveMutation.isPending}
            data-testid="button-archive-email"
            title="Archive"
          >
            <Archive className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 ${email.isStarred ? "text-yellow-400" : ""}`}
            onClick={() => starMutation.mutate()}
            disabled={starMutation.isPending}
            data-testid="button-star-email"
            title={email.isStarred ? "Unstar" : "Star"}
          >
            <Star className={`h-4 w-4 ${email.isStarred ? "fill-yellow-400" : ""}`} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                data-testid="button-move-to-folder"
                title="Move to folder"
              >
                <FolderInput className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {MOVE_FOLDERS.filter((f) => f.id !== email.folder).map((f) => (
                <DropdownMenuItem
                  key={f.id}
                  onClick={() => moveMutation.mutate(f.id)}
                  data-testid={`menu-move-to-${f.id}`}
                >
                  {f.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            data-testid="button-delete-email"
            title="Move to trash"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="px-4 py-3 border-b">
        <div className="flex items-start gap-3">
          <InitialsAvatar name={senderName} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground" data-testid="text-email-from-name">{senderName}</span>
            </div>
            <div className="text-xs text-muted-foreground" data-testid="text-email-from-address">{senderEmail}</div>
            <button
              className="text-xs text-muted-foreground/70 mt-0.5 hover:text-foreground transition-colors underline-offset-2 hover:underline"
              onClick={() => setShowAllHeaders((s) => !s)}
              data-testid="button-toggle-headers"
            >
              {showAllHeaders ? "Hide details" : "Show details"}
            </button>
            {showAllHeaders && (
              <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium">To: </span>
                  <span data-testid="text-email-to">{email.toAddresses.join(", ")}</span>
                </div>
                {email.ccAddresses && email.ccAddresses.length > 0 && (
                  <div>
                    <span className="font-medium">CC: </span>
                    <span data-testid="text-email-cc">{email.ccAddresses.join(", ")}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {sanitizedHtml ? (
          <div
            className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            data-testid="email-body-html"
          />
        ) : email.bodyText ? (
          <pre className="text-sm whitespace-pre-wrap font-sans text-foreground leading-relaxed" data-testid="email-body-text">
            {email.bodyText}
          </pre>
        ) : (
          <p className="text-sm text-muted-foreground italic" data-testid="email-body-empty">(empty message)</p>
        )}

        {attachments.length > 0 && (
          <div className="mt-6 pt-4 border-t" data-testid="email-attachments">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Attachments ({attachments.length})
            </p>
            <div className="space-y-1.5">
              {attachments.map((att, idx) => {
                const hasValidUrl = att.url && att.url.startsWith("http");
                const downloadUrl = hasValidUrl
                  ? att.url
                  : `/api/email/messages/${email.id}/attachments/${idx}`;
                const hasDownload = !!(hasValidUrl || att.content);
                return (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-md border bg-muted/30" data-testid={`attachment-${idx}`}>
                  <File className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{att.filename}</p>
                    <p className="text-[11px] text-muted-foreground">{formatBytes(att.size)}</p>
                  </div>
                  {hasDownload && (
                    <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="h-6 w-6" data-testid={`button-download-attachment-${idx}`}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  )}
                </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="border-t px-4 py-3 flex items-center gap-2" data-testid="email-action-bar">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setComposeMode("reply")}
          data-testid="button-reply"
        >
          <Reply className="h-3.5 w-3.5 mr-1.5" />
          Reply
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setComposeMode("reply-all")}
          data-testid="button-reply-all"
        >
          <CornerUpLeft className="h-3.5 w-3.5 mr-1.5" />
          Reply All
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setComposeMode("forward")}
          data-testid="button-forward"
        >
          <Forward className="h-3.5 w-3.5 mr-1.5" />
          Forward
        </Button>
      </div>

      {composeMode && (
        <EmailComposeModal
          open={!!composeMode}
          onClose={() => setComposeMode(null)}
          fromAddress={fromAddress}
          initialTo={composeProps.to}
          initialSubject={composeProps.subject}
          initialBody={composeProps.body}
          mode={composeMode}
        />
      )}
    </div>
  );
}
