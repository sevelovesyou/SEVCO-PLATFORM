import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Mail,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Filter,
  Plus,
  Inbox,
  Trash2,
  Reply,
  ChevronLeft,
  MailOpen,
} from "lucide-react";
import type { ContactSubmission } from "@shared/schema";
import { AdminAnnouncementComposer } from "@/components/admin-announcement-composer";

type SystemMailbox = {
  id: number;
  name: string;
  address: string;
  description: string | null;
  isActive: boolean | null;
  createdAt: string | null;
  unreadCount?: number;
};

type SystemMailboxEmail = {
  id: number;
  mailboxId: number;
  resendEmailId: string | null;
  direction: string;
  fromAddress: string;
  toAddresses: string[];
  subject: string;
  bodyHtml: string | null;
  bodyText: string | null;
  isRead: boolean | null;
  threadId: string | null;
  createdAt: string;
};

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const SUBJECT_OPTIONS = [
  { value: "all", label: "All Subjects" },
  { value: "Support", label: "Support" },
  { value: "Business Inquiry", label: "Business Inquiry" },
  { value: "Press", label: "Press" },
  { value: "Other", label: "Other" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    open: { label: "Open", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", icon: <AlertCircle className="h-3 w-3" /> },
    in_progress: { label: "In Progress", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", icon: <Clock className="h-3 w-3" /> },
    resolved: { label: "Resolved", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", icon: <CheckCircle2 className="h-3 w-3" /> },
    closed: { label: "Closed", className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", icon: <XCircle className="h-3 w-3" /> },
  };
  const cfg = configs[status] || configs.open;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function SubjectBadge({ subject }: { subject: string }) {
  const colors: Record<string, string> = {
    Support: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    "Business Inquiry": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-500",
    Press: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
    Other: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[subject] || colors.Other}`}>
      {subject}
    </span>
  );
}

function SubmissionsTab() {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState("");

  const queryKey = [
    "/api/contact-submissions",
    subjectFilter !== "all" ? subjectFilter : "",
    statusFilter !== "all" ? statusFilter : "",
  ];

  const { data: submissions = [], isLoading } = useQuery<ContactSubmission[]>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (subjectFilter !== "all") params.set("subject", subjectFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const qs = params.toString();
      const res = await fetch(`/api/contact-submissions${qs ? `?${qs}` : ""}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const selected = selectedId !== null ? submissions.find((s) => s.id === selectedId) ?? null : null;

  const updateMutation = useMutation({
    mutationFn: (data: { status?: string; staffNote?: string }) =>
      apiRequest("PATCH", `/api/contact-submissions/${selectedId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-submissions"] });
      toast({ title: "Submission updated" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const replyMutation = useMutation({
    mutationFn: (body: string) =>
      apiRequest("POST", `/api/contact-submissions/${selectedId}/reply`, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-submissions"] });
      toast({ title: "Reply sent", description: "The message was sent to the submitter." });
      setReplyOpen(false);
      setReplyBody("");
    },
    onError: (err: Error) => toast({ title: "Failed to send", description: err.message, variant: "destructive" }),
  });

  function handleStatusChange(status: string) {
    if (!selectedId) return;
    updateMutation.mutate({ status });
  }

  function handleNoteBlur(note: string) {
    if (!selectedId) return;
    updateMutation.mutate({ staffNote: note });
  }

  function handleSendReply() {
    if (!replyBody.trim()) return;
    replyMutation.mutate(replyBody.trim());
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center" data-testid="support-filters">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>Filter by:</span>
        </div>
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="w-48" data-testid="select-filter-subject">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUBJECT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="select-filter-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">
          {submissions.length} submission{submissions.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Subject</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Message</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading...</td>
                </tr>
              ) : submissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Mail className="h-8 w-8 text-muted-foreground/50" />
                      <span>No submissions found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                submissions.map((sub) => (
                  <tr
                    key={sub.id}
                    className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => { setSelectedId(sub.id); setReplyOpen(false); setReplyBody(""); }}
                    data-testid={`row-submission-${sub.id}`}
                  >
                    <td className="px-4 py-3 font-medium">{sub.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{sub.email}</td>
                    <td className="px-4 py-3">
                      <SubjectBadge subject={sub.subject} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell max-w-xs truncate">
                      {sub.message.slice(0, 80)}{sub.message.length > 80 ? "…" : ""}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell whitespace-nowrap">
                      {format(new Date(sub.createdAt), "MMM d, yyyy")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet open={selected !== null} onOpenChange={(open) => { if (!open) { setSelectedId(null); setReplyOpen(false); setReplyBody(""); } }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto" data-testid="sheet-submission-detail">
          {selected && (
            <>
              <SheetHeader className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <SubjectBadge subject={selected.subject} />
                  <StatusBadge status={selected.status} />
                </div>
                <SheetTitle className="text-left">{selected.name}</SheetTitle>
                <SheetDescription className="text-left flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {selected.email}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-5">
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Submitted: {format(new Date(selected.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
                  {selected.repliedAt && (
                    <p>Replied: {format(new Date(selected.repliedAt), "MMM d, yyyy 'at' h:mm a")}</p>
                  )}
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Message</h3>
                  <div className="rounded-lg bg-muted/40 border p-4 text-sm whitespace-pre-wrap leading-relaxed" data-testid="text-submission-message">
                    {selected.message}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Status</h3>
                  <Select
                    value={selected.status}
                    onValueChange={handleStatusChange}
                    disabled={updateMutation.isPending}
                  >
                    <SelectTrigger data-testid="select-submission-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Staff Note</h3>
                  <Textarea
                    key={selected.id}
                    defaultValue={selected.staffNote ?? ""}
                    placeholder="Internal note (not sent to sender)..."
                    className="resize-none min-h-[80px]"
                    data-testid="textarea-staff-note"
                    onBlur={(e) => handleNoteBlur(e.target.value)}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reply</h3>
                    {!replyOpen && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReplyOpen(true)}
                        data-testid="button-open-reply"
                        className="gap-1.5"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Compose Reply
                      </Button>
                    )}
                  </div>
                  {replyOpen && (
                    <div className="space-y-3" data-testid="compose-reply-area">
                      <div className="rounded-md bg-muted/40 border px-3 py-2 text-xs text-muted-foreground">
                        To: {selected.name} &lt;{selected.email}&gt;
                      </div>
                      <Textarea
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        placeholder="Write your reply..."
                        className="resize-none min-h-[120px]"
                        data-testid="textarea-reply-body"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="gap-1.5"
                          disabled={!replyBody.trim() || replyMutation.isPending}
                          onClick={handleSendReply}
                          data-testid="button-send-reply"
                        >
                          <Send className="h-3.5 w-3.5" />
                          {replyMutation.isPending ? "Sending..." : "Send Reply"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setReplyOpen(false); setReplyBody(""); }}
                          data-testid="button-cancel-reply"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function CompanyInboxesTab() {
  const { toast } = useToast();
  const [selectedMailboxId, setSelectedMailboxId] = useState<number | null>(null);
  const [selectedEmailId, setSelectedEmailId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const { data: mailboxes = [], isLoading: mailboxesLoading } = useQuery<SystemMailbox[]>({
    queryKey: ["/api/admin/mailboxes"],
  });

  const { data: emails = [], isLoading: emailsLoading } = useQuery<SystemMailboxEmail[]>({
    queryKey: ["/api/admin/mailboxes", selectedMailboxId, "emails"],
    queryFn: async () => {
      if (!selectedMailboxId) return [];
      const res = await fetch(`/api/admin/mailboxes/${selectedMailboxId}/emails`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: selectedMailboxId !== null,
  });

  const { data: selectedEmail } = useQuery<SystemMailboxEmail>({
    queryKey: ["/api/admin/mailboxes", selectedMailboxId, "emails", selectedEmailId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/mailboxes/${selectedMailboxId}/emails/${selectedEmailId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/mailboxes", selectedMailboxId, "emails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/mailboxes"] });
      return data;
    },
    enabled: selectedMailboxId !== null && selectedEmailId !== null,
  });

  const createMailboxMutation = useMutation({
    mutationFn: (data: { name: string; address: string; description?: string }) =>
      apiRequest("POST", "/api/admin/mailboxes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/mailboxes"] });
      toast({ title: "Mailbox created" });
      setAddOpen(false);
      setNewName("");
      setNewAddress("");
      setNewDescription("");
    },
    onError: (err: Error) => toast({ title: "Failed to create mailbox", description: err.message, variant: "destructive" }),
  });

  const deleteMailboxMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/mailboxes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/mailboxes"] });
      toast({ title: "Mailbox deleted" });
      setDeleteConfirmId(null);
      if (selectedMailboxId === deleteConfirmId) {
        setSelectedMailboxId(null);
        setSelectedEmailId(null);
      }
    },
    onError: (err: Error) => toast({ title: "Failed to delete", description: err.message, variant: "destructive" }),
  });

  const replyMutation = useMutation({
    mutationFn: (data: { subject: string; body: string }) =>
      apiRequest("POST", `/api/admin/mailboxes/${selectedMailboxId}/emails/${selectedEmailId}/reply`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/mailboxes", selectedMailboxId, "emails"] });
      toast({ title: "Reply sent" });
      setReplyOpen(false);
      setReplySubject("");
      setReplyBody("");
    },
    onError: (err: Error) => toast({ title: "Failed to send", description: err.message, variant: "destructive" }),
  });

  const selectedMailbox = mailboxes.find((m) => m.id === selectedMailboxId) ?? null;

  function handleOpenEmail(emailId: number) {
    setSelectedEmailId(emailId);
    setReplyOpen(false);
    setReplySubject("");
    setReplyBody("");
    queryClient.invalidateQueries({ queryKey: ["/api/admin/mailboxes", selectedMailboxId, "emails"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/mailboxes"] });
  }

  function handleAddMailbox() {
    if (!newName.trim() || !newAddress.trim()) return;
    if (!/^[a-z0-9._+-]+@sevco\.us$/i.test(newAddress.trim())) {
      toast({ title: "Invalid address", description: "Mailbox address must be a @sevco.us address", variant: "destructive" });
      return;
    }
    createMailboxMutation.mutate({
      name: newName.trim(),
      address: newAddress.trim(),
      description: newDescription.trim() || undefined,
    });
  }

  function handleSendReply() {
    if (!replyBody.trim()) return;
    replyMutation.mutate({ subject: replySubject.trim(), body: replyBody.trim() });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Manage company email inboxes for addresses like help@sevco.us, support@sevco.us, etc.
        </p>
        <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)} data-testid="button-add-inbox">
          <Plus className="h-4 w-4" />
          Add Inbox
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 min-h-[500px]">
        {/* Left panel — mailbox list */}
        <div className="border rounded-lg overflow-hidden flex flex-col">
          <div className="bg-muted/40 px-4 py-2.5 border-b">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Inboxes</span>
          </div>
          {mailboxesLoading ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
          ) : mailboxes.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm p-6">
              <Inbox className="h-8 w-8 text-muted-foreground/40" />
              <span>No inboxes yet</span>
            </div>
          ) : (
            <ul className="flex-1 overflow-y-auto divide-y">
              {mailboxes.map((mb) => {
                const unread = mb.unreadCount ?? 0;
                return (
                  <li
                    key={mb.id}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors group ${selectedMailboxId === mb.id ? "bg-muted/50" : ""}`}
                    onClick={() => { setSelectedMailboxId(mb.id); setSelectedEmailId(null); }}
                    data-testid={`mailbox-item-${mb.id}`}
                  >
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{mb.name}</span>
                        {unread > 0 && (
                          <Badge className="h-4 text-xs px-1.5 shrink-0">{unread}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{mb.address}</p>
                    </div>
                    <button
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-all shrink-0"
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(mb.id); }}
                      data-testid={`button-delete-mailbox-${mb.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Right panel — email list or email detail */}
        <div className="border rounded-lg overflow-hidden flex flex-col">
          {!selectedMailboxId ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm p-6">
              <Inbox className="h-10 w-10 text-muted-foreground/30" />
              <span>Select an inbox to view emails</span>
            </div>
          ) : selectedEmailId && selectedEmail ? (
            <>
              <div className="bg-muted/40 px-4 py-2.5 border-b flex items-center gap-2">
                <button
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => { setSelectedEmailId(null); setReplyOpen(false); }}
                  data-testid="button-back-to-emails"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {selectedEmail.subject || "(No subject)"}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{selectedEmail.subject || "(No subject)"}</p>
                  <p className="text-xs text-muted-foreground">From: {selectedEmail.fromAddress}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(selectedEmail.createdAt), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
                <div className="border rounded-lg overflow-hidden text-sm">
                  {selectedEmail.bodyHtml ? (
                    <iframe
                      srcDoc={`<!DOCTYPE html><html><head><meta name="color-scheme" content="dark"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src https: data:;"><style>html,body{background:#0f0f0f;color:#d4d4d4;font-family:sans-serif;font-size:14px;margin:16px;word-break:break-word;}a{color:#6b9eff;}img{max-width:100%;height:auto;}hr{border-color:#333;}blockquote{border-left:3px solid #444;margin-left:0;padding-left:1em;color:#9ca3af;}</style></head><body>${selectedEmail.bodyHtml}</body></html>`}
                      sandbox="allow-same-origin"
                      className="w-full min-h-[200px] border-0"
                      title="Email content"
                      onLoad={(e) => {
                        const iframe = e.currentTarget;
                        if (iframe.contentDocument?.body) {
                          iframe.style.height = iframe.contentDocument.body.scrollHeight + 32 + "px";
                        }
                      }}
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans p-4">{selectedEmail.bodyText || "(No content)"}</pre>
                  )}
                </div>

                {selectedEmail.direction === "inbound" && (
                  <div>
                    {!replyOpen ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => {
                          setReplyOpen(true);
                          setReplySubject(`Re: ${selectedEmail.subject}`);
                        }}
                        data-testid="button-reply"
                      >
                        <Reply className="h-3.5 w-3.5" />
                        Reply
                      </Button>
                    ) : (
                      <div className="space-y-3 border rounded-lg p-4" data-testid="reply-compose-area">
                        <div className="text-xs text-muted-foreground">
                          Sending from: <strong>{selectedMailbox?.address}</strong>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Subject</Label>
                          <Input
                            value={replySubject}
                            onChange={(e) => setReplySubject(e.target.value)}
                            placeholder="Re: ..."
                            data-testid="input-reply-subject"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Message</Label>
                          <Textarea
                            value={replyBody}
                            onChange={(e) => setReplyBody(e.target.value)}
                            placeholder="Write your reply..."
                            className="resize-none min-h-[120px]"
                            data-testid="textarea-mailbox-reply-body"
                            autoFocus
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="gap-1.5"
                            disabled={!replyBody.trim() || replyMutation.isPending}
                            onClick={handleSendReply}
                            data-testid="button-send-mailbox-reply"
                          >
                            <Send className="h-3.5 w-3.5" />
                            {replyMutation.isPending ? "Sending..." : `Send from ${selectedMailbox?.address}`}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setReplyOpen(false); setReplyBody(""); setReplySubject(""); }}
                            data-testid="button-cancel-mailbox-reply"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="bg-muted/40 px-4 py-2.5 border-b">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {selectedMailbox?.name} — {selectedMailbox?.address}
                </span>
              </div>
              {emailsLoading ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
              ) : emails.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm p-6">
                  <MailOpen className="h-8 w-8 text-muted-foreground/30" />
                  <span>No emails yet</span>
                </div>
              ) : (
                <ul className="flex-1 overflow-y-auto divide-y">
                  {emails.map((email) => (
                    <li
                      key={email.id}
                      className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => handleOpenEmail(email.id)}
                      data-testid={`mailbox-email-row-${email.id}`}
                    >
                      <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${!email.isRead && email.direction === "inbound" ? "bg-primary" : "bg-transparent"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm truncate ${!email.isRead && email.direction === "inbound" ? "font-semibold" : ""}`}>
                            {email.direction === "outbound" ? `→ ${email.toAddresses[0] ?? ""}` : email.fromAddress}
                          </span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                            {format(new Date(email.createdAt), "MMM d")}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {email.subject || "(No subject)"}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add inbox dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent data-testid="dialog-add-inbox">
          <DialogHeader>
            <DialogTitle>Add Company Inbox</DialogTitle>
            <DialogDescription>
              Create a new system mailbox for a company email address.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Display Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Help Desk"
                data-testid="input-mailbox-name"
              />
            </div>
            <div className="space-y-1">
              <Label>Email Address</Label>
              <Input
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="help@sevco.us"
                data-testid="input-mailbox-address"
              />
            </div>
            <div className="space-y-1">
              <Label>Description (optional)</Label>
              <Input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="General help and support inquiries"
                data-testid="input-mailbox-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} data-testid="button-cancel-add-inbox">Cancel</Button>
            <Button
              onClick={handleAddMailbox}
              disabled={!newName.trim() || !newAddress.trim() || createMailboxMutation.isPending}
              data-testid="button-confirm-add-inbox"
            >
              {createMailboxMutation.isPending ? "Creating..." : "Create Inbox"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <DialogContent data-testid="dialog-delete-mailbox">
          <DialogHeader>
            <DialogTitle>Delete Mailbox</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this mailbox? All emails in this inbox will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} data-testid="button-cancel-delete-mailbox">Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => { if (deleteConfirmId) deleteMailboxMutation.mutate(deleteConfirmId); }}
              disabled={deleteMailboxMutation.isPending}
              data-testid="button-confirm-delete-mailbox"
            >
              {deleteMailboxMutation.isPending ? "Deleting..." : "Delete Mailbox"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CommandSupport() {
  const [activeTab, setActiveTab] = useState<"submissions" | "inboxes">("submissions");

  return (
    <div className="space-y-6">
      <AdminAnnouncementComposer />
      <div className="flex gap-1 border-b">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "submissions" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          onClick={() => setActiveTab("submissions")}
          data-testid="tab-submissions"
        >
          Submissions
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "inboxes" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          onClick={() => setActiveTab("inboxes")}
          data-testid="tab-company-inboxes"
        >
          Company Inboxes
        </button>
      </div>

      {activeTab === "submissions" ? <SubmissionsTab /> : <CompanyInboxesTab />}
    </div>
  );
}
