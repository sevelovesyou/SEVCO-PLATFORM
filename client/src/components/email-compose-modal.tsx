import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { X, ChevronDown, Send, FileText } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Email } from "@shared/schema";

interface EmailComposeModalProps {
  open: boolean;
  onClose: () => void;
  fromAddress: string;
  initialTo?: string[];
  initialSubject?: string;
  initialBody?: string;
  mode?: "compose" | "reply" | "reply-all" | "forward";
  replyTo?: Email | null;
}

function TagInput({
  value,
  onChange,
  placeholder,
  "data-testid": testId,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  "data-testid"?: string;
}) {
  const [inputVal, setInputVal] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase();
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
    }
    setInputVal("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addTag(inputVal);
    } else if (e.key === "Backspace" && !inputVal && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function removeTag(t: string) {
    onChange(value.filter((v) => v !== t));
  }

  return (
    <div
      className="flex flex-wrap gap-1 items-center min-h-9 px-3 py-1.5 border rounded-md bg-background cursor-text focus-within:ring-2 focus-within:ring-ring"
      onClick={() => inputRef.current?.focus()}
      data-testid={testId}
    >
      {value.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1 text-xs py-0">
          {tag}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
            className="ml-1 hover:text-destructive"
            data-testid={`tag-remove-${tag}`}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </Badge>
      ))}
      <input
        ref={inputRef}
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (inputVal.trim()) addTag(inputVal); }}
        placeholder={value.length === 0 ? placeholder : ""}
        className="flex-1 min-w-24 text-sm bg-transparent outline-none border-none"
        data-testid={testId ? `${testId}-input` : undefined}
      />
    </div>
  );
}

export function EmailComposeModal({
  open,
  onClose,
  fromAddress,
  initialTo = [],
  initialSubject = "",
  initialBody = "",
  mode = "compose",
}: EmailComposeModalProps) {
  const { toast } = useToast();
  const [to, setTo] = useState<string[]>(initialTo);
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);

  const sendMutation = useMutation({
    mutationFn: (data: { to: string[]; cc: string[]; bcc: string[]; subject: string; text: string }) =>
      apiRequest("POST", "/api/email/send", data),
    onSuccess: () => {
      toast({ title: "Email sent successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/email/folders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email/messages"] });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Failed to send email", description: err.message, variant: "destructive" });
    },
  });

  const draftMutation = useMutation({
    mutationFn: (data: { to: string[]; cc: string[]; bcc: string[]; subject: string; text: string }) =>
      apiRequest("POST", "/api/email/drafts", data),
    onSuccess: () => {
      toast({ title: "Draft saved" });
      queryClient.invalidateQueries({ queryKey: ["/api/email/folders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email/messages"] });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Failed to save draft", description: err.message, variant: "destructive" });
    },
  });

  function handleSend() {
    if (to.length === 0) {
      toast({ title: "Please add at least one recipient", variant: "destructive" });
      return;
    }
    sendMutation.mutate({ to, cc, bcc, subject, text: body });
  }

  function handleSaveDraft() {
    draftMutation.mutate({ to, cc, bcc, subject, text: body });
  }

  function handleClose() {
    if (body.trim() && !sendMutation.isPending) {
      if (!confirm("Discard this message?")) return;
    }
    onClose();
  }

  const modeTitle = mode === "reply" ? "Reply" : mode === "reply-all" ? "Reply All" : mode === "forward" ? "Forward" : "New Message";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] flex flex-col" data-testid="modal-compose-email">
        <DialogHeader>
          <DialogTitle>{modeTitle}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">From</Label>
            <div className="text-sm px-3 py-2 rounded-md border bg-muted/40 text-muted-foreground" data-testid="text-from-address">
              {fromAddress}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">To</Label>
            <TagInput
              value={to}
              onChange={setTo}
              placeholder="recipient@example.com — press Enter or comma to add"
              data-testid="input-email-to"
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-muted-foreground"
              onClick={() => setShowCc((s) => !s)}
              data-testid="button-toggle-cc"
            >
              CC
              <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${showCc ? "rotate-180" : ""}`} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-muted-foreground"
              onClick={() => setShowBcc((s) => !s)}
              data-testid="button-toggle-bcc"
            >
              BCC
              <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${showBcc ? "rotate-180" : ""}`} />
            </Button>
          </div>

          {showCc && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">CC</Label>
              <TagInput value={cc} onChange={setCc} placeholder="cc@example.com" data-testid="input-email-cc" />
            </div>
          )}

          {showBcc && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">BCC</Label>
              <TagInput value={bcc} onChange={setBcc} placeholder="bcc@example.com" data-testid="input-email-bcc" />
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              data-testid="input-email-subject"
            />
          </div>

          <div className="space-y-1 flex-1">
            <Label className="text-xs text-muted-foreground">Message</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              className="min-h-[200px] resize-none"
              data-testid="input-email-body"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t mt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSaveDraft}
            disabled={draftMutation.isPending}
            data-testid="button-save-draft"
          >
            <FileText className="h-4 w-4 mr-1.5" />
            Save Draft
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClose}
              data-testid="button-discard-compose"
            >
              Discard
            </Button>
            <Button
              type="button"
              onClick={handleSend}
              disabled={sendMutation.isPending || to.length === 0}
              data-testid="button-send-email"
            >
              <Send className="h-4 w-4 mr-1.5" />
              {sendMutation.isPending ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
