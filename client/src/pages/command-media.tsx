import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { resolveImageUrl } from "@/lib/resolve-image-url";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Upload, Copy, Trash2, FileImage, FileAudio, File, Check, Pencil, X, Plus,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type MediaFile = {
  name: string;
  size: number;
  updatedAt: string | null;
  publicUrl: string | null;
  mimeType: string | null;
};

const BUCKETS = [
  { value: "avatars", label: "Avatars" },
  { value: "banners", label: "Banners" },
  { value: "gallery", label: "Gallery" },
  { value: "brand-assets", label: "Brand Assets" },
  { value: "tracks", label: "Tracks" },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function FileIcon({ mimeType, publicUrl, name }: { mimeType: string | null; publicUrl: string | null; name: string }) {
  if (mimeType?.startsWith("image/") && publicUrl) {
    return (
      <img
        src={resolveImageUrl(publicUrl)}
        alt={name}
        className="w-full h-full object-cover rounded-t-lg"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    );
  }
  if (mimeType?.startsWith("audio/")) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/40 rounded-t-lg">
        <FileAudio className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }
  if (mimeType?.startsWith("image/")) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/40 rounded-t-lg">
        <FileImage className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }
  return (
    <div className="w-full h-full flex items-center justify-center bg-muted/40 rounded-t-lg">
      <File className="h-8 w-8 text-muted-foreground" />
    </div>
  );
}

export default function CommandMedia() {
  const { toast } = useToast();
  const [bucket, setBucket] = useState("gallery");
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { data: files = [], isLoading, error } = useQuery<MediaFile[]>({
    queryKey: ["/api/media", bucket],
    queryFn: async () => {
      const res = await fetch(`/api/media?bucket=${bucket}`, { credentials: "include" });
      if (!res.ok) {
        const { message } = await res.json().catch(() => ({ message: "Failed to load media" }));
        throw new Error(message);
      }
      return res.json();
    },
  });

  const deleteFile = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`/api/media?bucket=${bucket}&path=${encodeURIComponent(name)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const { message } = await res.json().catch(() => ({ message: "Delete failed" }));
        throw new Error(message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media", bucket] });
      toast({ title: "File deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  const renameFile = useMutation({
    mutationFn: async ({ fromPath, toPath }: { fromPath: string; toPath: string }) => {
      return apiRequest("PATCH", "/api/media/rename", { bucket, fromPath, toPath });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media", bucket] });
      setRenamingFile(null);
      toast({ title: "File renamed" });
    },
    onError: (err: any) => {
      toast({ title: "Rename failed", description: err.message, variant: "destructive" });
    },
  });

  function startRename(name: string) {
    setRenamingFile(name);
    setRenameValue(name);
  }

  function commitRename(oldName: string) {
    const newName = renameValue.trim();
    if (!newName || newName === oldName) {
      setRenamingFile(null);
      return;
    }
    renameFile.mutate({ fromPath: oldName, toPath: newName });
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    });
  }

  async function uploadFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    setUploadProgress(0);
    let completed = 0;
    for (const file of files) {
      const path = file.name;
      try {
        const res = await fetch(`/api/upload?bucket=${bucket}&path=${encodeURIComponent(path)}`, {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
          credentials: "include",
        });
        if (!res.ok) {
          const { message } = await res.json().catch(() => ({ message: "Upload failed" }));
          toast({ title: `Failed to upload ${file.name}`, description: message, variant: "destructive" });
        }
      } catch (err: any) {
        toast({ title: `Failed to upload ${file.name}`, description: err.message, variant: "destructive" });
      }
      completed++;
      setUploadProgress(Math.round((completed / files.length) * 100));
    }
    setTimeout(() => {
      setUploadProgress(null);
      queryClient.invalidateQueries({ queryKey: ["/api/media", bucket] });
      toast({ title: `${files.length} file${files.length > 1 ? "s" : ""} uploaded` });
    }, 500);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    uploadFiles(e.dataTransfer.files);
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <Select value={bucket} onValueChange={setBucket}>
            <SelectTrigger className="w-48" data-testid="select-media-bucket">
              <SelectValue placeholder="Select bucket" />
            </SelectTrigger>
            <SelectContent>
              {BUCKETS.map((b) => (
                <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => uploadFiles(e.target.files)}
            data-testid="input-media-upload"
          />
          <Button
            size="sm"
            className="gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadProgress !== null}
            data-testid="button-upload-media"
          >
            <Plus className="h-3.5 w-3.5" />
            Upload Files
          </Button>
        </div>
      </div>

      {uploadProgress !== null && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Uploading…</p>
          <Progress value={uploadProgress} className="h-1.5" />
        </div>
      )}

      <div
        ref={dropZoneRef}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-border"}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        data-testid="zone-media-drop"
      >
        <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          Drag &amp; drop files here, or{" "}
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => fileInputRef.current?.click()}
          >
            browse
          </button>
        </p>
        <p className="text-xs text-muted-foreground mt-1">Files upload directly to the <strong>{BUCKETS.find(b => b.value === bucket)?.label}</strong> bucket</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="border border-border rounded-lg overflow-hidden motion-safe:animate-pulse">
              <div className="h-28 bg-muted" />
              <div className="p-2 space-y-1.5">
                <div className="h-2.5 bg-muted rounded w-3/4" />
                <div className="h-2 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 text-muted-foreground" data-testid="text-media-error">
          <p className="text-sm">Failed to load media files.</p>
          <p className="text-xs mt-1">{(error as Error).message}</p>
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-12 border border-border rounded-xl bg-muted/10" data-testid="text-media-empty">
          <File className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium text-foreground">No files in this bucket</p>
          <p className="text-xs text-muted-foreground mt-1">Upload files above to populate this bucket.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" data-testid="badge-media-count">{files.length} file{files.length !== 1 ? "s" : ""}</Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {files.map((file) => (
              <div
                key={file.name}
                className="border border-border rounded-lg overflow-hidden group"
                data-testid={`card-media-${file.name}`}
              >
                <div className="h-28 bg-muted/20 relative">
                  <FileIcon mimeType={file.mimeType} publicUrl={file.publicUrl} name={file.name} />
                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {file.publicUrl && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="h-6 w-6 rounded bg-background/90 flex items-center justify-center hover:bg-background shadow-sm"
                            onClick={() => copyUrl(file.publicUrl!)}
                            data-testid={`button-copy-url-${file.name}`}
                          >
                            {copiedUrl === file.publicUrl ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Copy URL</TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="h-6 w-6 rounded bg-background/90 flex items-center justify-center hover:bg-background shadow-sm"
                          onClick={() => startRename(file.name)}
                          data-testid={`button-rename-${file.name}`}
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Rename</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="h-6 w-6 rounded bg-background/90 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground shadow-sm"
                          onClick={() => deleteFile.mutate(file.name)}
                          data-testid={`button-delete-media-${file.name}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                <div className="p-2 space-y-1">
                  {renamingFile === file.name ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename(file.name);
                          if (e.key === "Escape") setRenamingFile(null);
                        }}
                        className="h-6 text-xs px-1.5"
                        autoFocus
                        data-testid={`input-rename-${file.name}`}
                      />
                      <button
                        type="button"
                        onClick={() => commitRename(file.name)}
                        className="shrink-0"
                        data-testid={`button-confirm-rename-${file.name}`}
                      >
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRenamingFile(null)}
                        className="shrink-0"
                        data-testid={`button-cancel-rename-${file.name}`}
                      >
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs font-medium text-foreground truncate" title={file.name}>{file.name}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">{formatBytes(file.size)}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
