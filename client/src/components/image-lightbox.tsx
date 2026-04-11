import { useEffect } from "react";
import { X } from "lucide-react";

export function ImageLightbox({ src, onClose }: { src: string | null; onClose: () => void }) {
  useEffect(() => {
    if (!src) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [src, onClose]);

  if (!src) return null;
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 animate-in fade-in duration-150"
      onClick={onClose}
      data-testid="lightbox-overlay"
    >
      <img
        src={src}
        alt="Full size"
        className="max-w-[95vw] max-h-[95vh] object-contain rounded shadow-2xl scale-100 animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
        data-testid="lightbox-image"
      />
      <button
        className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-1.5 hover:bg-black/80 transition-colors"
        onClick={onClose}
        data-testid="button-lightbox-close"
        aria-label="Close image"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
