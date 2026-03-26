import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, X, FileAudio, ImageIcon, ChevronDown, ChevronUp } from "lucide-react";

interface FileUploadProps {
  bucket: string;
  path: string;
  accept: string;
  maxSizeMb: number;
  currentUrl?: string | null;
  onUpload: (url: string, storagePath: string) => void;
  label?: string;
  isPrivate?: boolean;
}

function isImageAccept(accept: string) {
  return accept.includes("image");
}

export function FileUpload({
  bucket,
  path,
  accept,
  maxSizeMb,
  currentUrl,
  onUpload,
  label = "Upload File",
  isPrivate = false,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const isImage = isImageAccept(accept);
  const displayUrl = localPreview || currentUrl;

  async function handleFile(file: File) {
    setError(null);

    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`File must be under ${maxSizeMb} MB`);
      return;
    }

    setProgress(0);

    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const storagePath = path.replace("{ext}", ext);

      setProgress(30);

      const params = new URLSearchParams({ bucket, path: storagePath });
      if (isPrivate) params.set("private", "true");

      const res = await fetch(`/api/upload?${params}`, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
        credentials: "include",
      });

      if (!res.ok) {
        const { message } = await res.json().catch(() => ({ message: "Upload failed" }));
        setError(message);
        setProgress(null);
        return;
      }

      setProgress(80);

      const { url, path: returnedPath } = await res.json();
      const resultUrl = isPrivate ? returnedPath : url;

      if (isImage && !isPrivate) {
        setLocalPreview(resultUrl);
      } else if (!isImage) {
        setLocalPreview(file.name);
      }

      setProgress(100);
      setTimeout(() => setProgress(null), 800);

      onUpload(resultUrl, storagePath);
    } catch (err: any) {
      setError(err?.message ?? "Upload failed");
      setProgress(null);
    }
  }

  return (
    <div className="space-y-2">
      {displayUrl && isImage && !isPrivate && (
        <div className="relative w-full h-24 rounded-lg overflow-hidden border bg-muted/30">
          <img src={displayUrl} alt="Preview" className="w-full h-full object-cover" />
          <button
            type="button"
            className="absolute top-1 right-1 h-5 w-5 rounded-full bg-background/80 flex items-center justify-center hover:bg-background"
            onClick={() => {
              setLocalPreview(null);
              onUpload("", "");
            }}
            data-testid="button-clear-upload"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {displayUrl && !isImage && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground border rounded-lg px-3 py-2 bg-muted/20">
          <FileAudio className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{displayUrl}</span>
          <button
            type="button"
            className="ml-auto shrink-0"
            onClick={() => {
              setLocalPreview(null);
              onUpload("", "");
            }}
            data-testid="button-clear-audio-upload"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        data-testid="input-file-upload"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        disabled={progress !== null}
        onClick={() => inputRef.current?.click()}
        data-testid="button-choose-file"
      >
        {isImage ? <ImageIcon className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
        {progress !== null ? "Uploading..." : label}
      </Button>

      {progress !== null && (
        <Progress value={progress} className="h-1.5" />
      )}

      {error && (
        <p className="text-xs text-destructive" data-testid="text-upload-error">{error}</p>
      )}

      <p className="text-xs text-muted-foreground">Max {maxSizeMb} MB</p>
    </div>
  );
}

interface FileUploadWithFallbackProps extends FileUploadProps {
  urlValue: string;
  onUrlChange: (url: string) => void;
  urlPlaceholder?: string;
  urlTestId?: string;
}

export function FileUploadWithFallback({
  urlValue,
  onUrlChange,
  urlPlaceholder = "https://example.com/image.jpg",
  urlTestId,
  ...uploadProps
}: FileUploadWithFallbackProps) {
  const [showUrl, setShowUrl] = useState(false);

  return (
    <div className="space-y-2">
      <FileUpload
        {...uploadProps}
        onUpload={(url, _path) => {
          onUrlChange(url);
        }}
      />
      <button
        type="button"
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setShowUrl((v) => !v)}
        data-testid="button-toggle-url-input"
      >
        {showUrl ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        Or paste a URL
      </button>
      {showUrl && (
        <input
          type="text"
          value={urlValue}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder={urlPlaceholder}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          data-testid={urlTestId}
        />
      )}
    </div>
  );
}
