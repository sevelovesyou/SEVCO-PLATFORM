import { useRef, useState } from "react";
import { resolveImageUrl } from "@/lib/resolve-image-url";
import { Camera, X } from "lucide-react";

interface PhotoUploadGridProps {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  bucket?: string;
  slug?: string;
}

export function PhotoUploadGrid({
  value,
  onChange,
  max = 5,
  bucket = "products",
  slug = "product",
}: PhotoUploadGridProps) {
  const [uploading, setUploading] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const slots = Array.from({ length: max }, (_, i) => value[i] ?? null);

  async function handleFile(file: File, index: number) {
    setErrors((prev) => ({ ...prev, [index]: "" }));
    if (file.size > 50 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, [index]: "File must be under 50 MB" }));
      return;
    }
    setUploading(index);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `products/${slug}-${index}-${Date.now()}.${ext}`;
      const params = new URLSearchParams({ bucket, path });
      const res = await fetch(`/api/upload?${params}`, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
        credentials: "include",
      });
      if (!res.ok) {
        const { message } = await res.json().catch(() => ({ message: "Upload failed" }));
        setErrors((prev) => ({ ...prev, [index]: message }));
        return;
      }
      const { url } = await res.json();
      const next = [...value];
      next[index] = url;
      onChange(next.filter(Boolean));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setErrors((prev) => ({ ...prev, [index]: message }));
    } finally {
      setUploading(null);
    }
  }

  function removePhoto(index: number) {
    const next = [...value];
    next.splice(index, 1);
    onChange(next);
  }

  const filledCount = value.filter(Boolean).length;
  const visibleSlots = Math.min(max, filledCount + 1);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-5 gap-2">
        {slots.slice(0, visibleSlots).map((url, i) => (
          <div key={i} className="relative">
            {url ? (
              <div className="relative aspect-square rounded-md overflow-hidden border border-border bg-muted/30">
                <img
                  src={resolveImageUrl(url)}
                  alt={`Photo ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-background/80 flex items-center justify-center hover:bg-background shadow-sm"
                  onClick={() => removePhoto(i)}
                  data-testid={`button-remove-photo-${i}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="aspect-square w-full rounded-md border-2 border-dashed border-border/60 hover:border-border flex flex-col items-center justify-center gap-1 bg-muted/10 hover:bg-muted/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => inputRefs.current[i]?.click()}
                disabled={uploading !== null}
                data-testid={`button-upload-photo-${i}`}
              >
                {uploading === i ? (
                  <span className="text-[10px] text-muted-foreground">...</span>
                ) : (
                  <>
                    <Camera className="h-4 w-4 text-muted-foreground/60" />
                    <span className="text-[9px] text-muted-foreground/50">Add</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={(el) => { inputRefs.current[i] = el; }}
              type="file"
              accept="image/*"
              className="hidden"
              data-testid={`input-photo-${i}`}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file, i);
                e.target.value = "";
              }}
            />
            {errors[i] && (
              <p className="text-[9px] text-destructive mt-0.5 leading-tight">{errors[i]}</p>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Up to {max} photos. First photo is the primary image.</p>
    </div>
  );
}
