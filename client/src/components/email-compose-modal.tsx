import { useState, useRef, useEffect, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import { X, ChevronDown, Send, FileText, Paperclip, File as FileIcon } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { RichEmailEditor } from "./rich-email-editor";
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

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ATTACHMENT_KEYWORDS = ["attached", "attachment", "see attached", "find attached", "enclosed", "herewith"];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
}

function TagInput({
  value,
  onChange,
  placeholder,
  "data-testid": testId,
  autoFocus,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  "data-testid"?: string;
  autoFocus?: boolean;
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
        autoFocus={autoFocus}
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
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showAttachmentReminder, setShowAttachmentReminder] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const initialBodyRef = useRef(initialBody);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const sendMutation = useMutation({
    mutationFn: async (data: { to: string[]; cc: string[]; bcc: string[]; subject: string; bodyHtml: string; bodyText: string; attachments?: { filename: string; contentType: string; url: string; size: number }[] }) =>
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
    mutationFn: (data: { to: string[]; cc: string[]; bcc: string[]; subject: string; bodyHtml: string; bodyText: string }) =>
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

  function addFiles(files: FileList | File[]) {
    const newFiles: File[] = [];
    const rejected: string[] = [];
    Array.from(files).forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        rejected.push(file.name);
      } else {
        newFiles.push(file);
      }
    });
    if (rejected.length > 0) {
      toast({
        title: "Files too large",
        description: `${rejected.join(", ")} exceed the 10MB limit`,
        variant: "destructive",
      });
    }
    if (newFiles.length > 0) {
      setAttachments((prev) => [...prev, ...newFiles]);
    }
  }

  const previewUrls = useMemo(() => {
    return attachments.map((file) =>
      file.type.startsWith("image/") ? URL.createObjectURL(file) : null
    );
  }, [attachments]);

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => { if (url) URL.revokeObjectURL(url); });
    };
  }, [previewUrls]);

  function removeAttachment(index: number) {
    const url = previewUrls[index];
    if (url) URL.revokeObjectURL(url);
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = "";
    }
  }

  async function uploadAttachments(): Promise<{ filename: string; contentType: string; url: string; size: number }[]> {
    const uploaded: { filename: string; contentType: string; url: string; size: number }[] = [];
    for (const file of attachments) {
      try {
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `email-attachments/${timestamp}-${safeName}`;
        const response = await fetch(`/api/upload?bucket=gallery&path=${encodeURIComponent(path)}`, {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!response.ok) throw new Error("Upload failed");
        const data = await response.json();
        uploaded.push({ filename: file.name, contentType: file.type || "application/octet-stream", url: data.url, size: file.size });
      } catch {
        if (file.size <= 2 * 1024 * 1024) {
          const base64 = await fileToBase64(file);
          uploaded.push({ filename: file.name, contentType: file.type || "application/octet-stream", url: base64, size: file.size });
        } else {
          toast({ title: `Failed to upload ${file.name}`, description: "File is too large for fallback (>2MB)", variant: "destructive" });
        }
      }
    }
    return uploaded;
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function checkAttachmentReminder(): boolean {
    const plainText = stripHtml(body).toLowerCase();
    return ATTACHMENT_KEYWORDS.some((keyword) => plainText.includes(keyword));
  }

  async function executeSend() {
    if (to.length === 0) {
      toast({ title: "Please add at least one recipient", variant: "destructive" });
      return;
    }
    if (isSending) return;
    setIsSending(true);
    try {
      const plainText = stripHtml(body);
      let uploadedAttachments: { filename: string; contentType: string; url: string; size: number }[] | undefined;
      if (attachments.length > 0) {
        uploadedAttachments = await uploadAttachments();
        if (uploadedAttachments.length !== attachments.length) {
          toast({ title: "Some attachments failed to upload. Please retry or remove them.", variant: "destructive" });
          setIsSending(false);
          return;
        }
      }
      sendMutation.mutate({ to, cc, bcc, subject, bodyHtml: body, bodyText: plainText, attachments: uploadedAttachments }, {
        onSettled: () => setIsSending(false),
      });
    } catch {
      setIsSending(false);
    }
  }

  function handleSend() {
    if (to.length === 0) {
      toast({ title: "Please add at least one recipient", variant: "destructive" });
      return;
    }
    if (checkAttachmentReminder() && attachments.length === 0) {
      setShowAttachmentReminder(true);
      return;
    }
    executeSend();
  }

  function handleSaveDraft() {
    const plainText = stripHtml(body);
    draftMutation.mutate({ to, cc, bcc, subject, bodyHtml: body, bodyText: plainText });
  }

  function handleClose() {
    if (isSending) return;
    if (body.trim() && body !== "<p></p>" && !sendMutation.isPending) {
      if (!confirm("Discard this message?")) return;
    }
    onClose();
  }

  const modeTitle = mode === "reply" ? "Reply" : mode === "reply-all" ? "Reply All" : mode === "forward" ? "Forward" : "New Message";

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="max-w-full sm:max-w-2xl mx-2 sm:mx-auto max-h-[90vh] flex flex-col" data-testid="modal-compose-email">
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
                autoFocus={true}
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
              <RichEmailEditor
                initialContent={initialBodyRef.current}
                onChange={(html) => setBody(html)}
              />
            </div>

            <div className="space-y-2">
              <div
                ref={dropzoneRef}
                className="border-2 border-dashed border-border/60 rounded-lg p-3 text-center cursor-pointer hover:border-primary/40 transition-colors"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                data-testid="email-attachment-dropzone"
              >
                <Paperclip className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Drag files here or <span className="text-primary underline">browse</span>
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                data-testid="input-file-attachment"
              />

              {attachments.length > 0 && (
                <div className="space-y-1" data-testid="attachment-list">
                  {attachments.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm py-1" data-testid={`attachment-item-${i}`}>
                      {previewUrls[i] ? (
                        <img
                          src={previewUrls[i]!}
                          alt={file.name}
                          className="h-10 w-10 object-cover rounded shrink-0"
                          data-testid={`attachment-preview-${i}`}
                        />
                      ) : (
                        <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <span className="truncate flex-1">{file.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{formatFileSize(file.size)}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(i)}
                        className="hover:text-destructive transition-colors"
                        data-testid={`button-remove-attachment-${i}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
                disabled={isSending || sendMutation.isPending || to.length === 0}
                data-testid="button-send-email"
              >
                <Send className="h-4 w-4 mr-1.5" />
                {isSending || sendMutation.isPending ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showAttachmentReminder} onOpenChange={setShowAttachmentReminder}>
        <AlertDialogContent data-testid="alert-attachment-reminder">
          <AlertDialogHeader>
            <AlertDialogTitle>Missing attachment?</AlertDialogTitle>
            <AlertDialogDescription>
              You mentioned an attachment but didn't attach any files. Send anyway?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowAttachmentReminder(false);
                dropzoneRef.current?.scrollIntoView({ behavior: "smooth" });
                fileInputRef.current?.click();
              }}
              data-testid="button-attach-files"
            >
              Attach files
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowAttachmentReminder(false);
                executeSend();
              }}
              data-testid="button-send-anyway"
            >
              Send anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
