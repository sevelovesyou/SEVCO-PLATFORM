import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Mail, Send, CheckCircle2, Clock, AlertCircle, XCircle, Filter } from "lucide-react";
import type { ContactSubmission } from "@shared/schema";

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

export default function CommandSupport() {
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
      {/* Filter bar */}
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

      {/* Table */}
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

      {/* Detail Sheet */}
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
                {/* Date info */}
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Submitted: {format(new Date(selected.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
                  {selected.repliedAt && (
                    <p>Replied: {format(new Date(selected.repliedAt), "MMM d, yyyy 'at' h:mm a")}</p>
                  )}
                </div>

                {/* Full message */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Message</h3>
                  <div className="rounded-lg bg-muted/40 border p-4 text-sm whitespace-pre-wrap leading-relaxed" data-testid="text-submission-message">
                    {selected.message}
                  </div>
                </div>

                {/* Status */}
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

                {/* Staff Note */}
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

                {/* Reply area */}
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
