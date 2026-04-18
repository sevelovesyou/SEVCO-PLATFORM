import { useState, useEffect } from "react";
import { PageHead } from "@/components/page-head";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "wouter";
import { articleUrl } from "@/lib/wiki-urls";
import { Copy, ImageOff, ExternalLink, X, Zap, Download } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import type { GalleryImage } from "@shared/schema";
import { resolveImageUrl } from "@/lib/resolve-image-url";
import { playSparkSound } from "@/lib/spark-sound";

const CATEGORY_LABELS: Record<string, string> = {
  profile: "Profile Pics",
  banner: "Banners",
  wallpaper: "Wallpapers",
  logo: "Logos",
  other: "Other",
};

const CATEGORY_COLORS: Record<string, string> = {
  profile: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  banner: "bg-blue-600/10 text-blue-700 dark:text-blue-400 border-blue-600/20",
  wallpaper: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  logo: "bg-red-700/10 text-red-800 dark:text-red-500 border-red-700/20",
  other: "bg-muted text-muted-foreground border-border",
};

const TABS = [
  { value: "all", label: "All" },
  { value: "profile", label: "Profile Pics" },
  { value: "banner", label: "Banners" },
  { value: "wallpaper", label: "Wallpapers" },
  { value: "logo", label: "Logos" },
  { value: "other", label: "Other" },
];

const SKELETON_HEIGHTS = ["h-40", "h-64", "h-48", "h-56", "h-32", "h-72", "h-44", "h-60"];

type GalleryImageWithSpark = GalleryImage & {
  sparkCount?: number;
  isSparkedByMe?: boolean;
  uploaderName?: string | null;
};

function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "image";
}

function extFromUrl(url: string): string {
  try {
    const path = new URL(url, window.location.origin).pathname;
    const m = path.match(/\.([a-zA-Z0-9]{2,5})$/);
    return m ? m[1].toLowerCase() : "jpg";
  } catch {
    return "jpg";
  }
}

export default function GalleryPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [lightboxImage, setLightboxImage] = useState<GalleryImageWithSpark | null>(null);
  const [sparkTooltips, setSparkTooltips] = useState<Record<number, boolean>>({});
  const [revealedCardId, setRevealedCardId] = useState<number | null>(null);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(hover: none)");
    const update = () => setIsTouch(mql.matches);
    update();
    mql.addEventListener?.("change", update);
    return () => mql.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    if (!isTouch || revealedCardId === null) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest(`[data-gallery-card-id="${revealedCardId}"]`)) return;
      setRevealedCardId(null);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [isTouch, revealedCardId]);

  const queryKey = activeTab === "all"
    ? ["/api/gallery"]
    : ["/api/gallery", activeTab];

  const { data: images, isLoading } = useQuery<GalleryImageWithSpark[]>({
    queryKey,
    queryFn: async () => {
      const url = activeTab === "all" ? "/api/gallery" : `/api/gallery?category=${activeTab}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch gallery");
      return res.json();
    },
  });

  const { data: dailyQuota } = useQuery<{ given: number; limit: number; remaining: number }>({
    queryKey: ["/api/sparks/daily-quota"],
    enabled: !!user,
  });
  const dailyLimitReached = (dailyQuota?.remaining ?? 1) === 0;

  const sparkMutation = useMutation({
    mutationFn: (imageId: number) => apiRequest("POST", `/api/gallery/${imageId}/spark`),
    onSuccess: () => {
      playSparkSound();
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
    },
    onError: (err: any) => {
      if (err?.status === 429 || err?.message?.includes("429")) {
        toast({ title: "Daily limit reached", description: "You can give 10 sparks per day." });
      } else if (err?.status === 403 || err?.message?.includes("403")) {
        toast({ title: "Cannot spark your own content", variant: "destructive" });
      }
    },
  });

  function handleSpark(image: GalleryImageWithSpark) {
    if (!user) return;
    if (image.isSparkedByMe) {
      setSparkTooltips((prev) => ({ ...prev, [image.id]: true }));
      setTimeout(() => setSparkTooltips((prev) => ({ ...prev, [image.id]: false })), 2000);
      return;
    }
    sparkMutation.mutate(image.id);
  }

  async function copyLink(imageUrl: string, title: string) {
    try {
      const fullUrl = new URL(imageUrl, window.location.origin).toString();
      await navigator.clipboard.writeText(fullUrl);
      toast({
        title: "Link copied!",
        description: `"${title}" URL copied to clipboard.`,
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy the link. Please try manually.",
        variant: "destructive",
      });
    }
  }

  async function downloadImage(imageUrl: string, title: string) {
    const resolved = resolveImageUrl(imageUrl);
    const filename = `${slugifyTitle(title)}.${extFromUrl(resolved)}`;
    try {
      const res = await fetch(resolved, { credentials: "omit" });
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      window.open(resolved, "_blank", "noopener,noreferrer");
      toast({
        title: "Opening in a new tab",
        description: "Right-click → Save image to download.",
      });
    }
  }

  return (
    <div className="w-full px-4 md:px-6 py-6">
      <PageHead
        slug="gallery"
        title="Brand Gallery — SEVCO"
        description="Browse SEVCO's brand assets — official images, logos, and visual resources."
        ogUrl="https://sevco.us/gallery"
      />
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" data-testid="heading-gallery">Gallery</h1>
        <p className="text-muted-foreground text-sm">
          Quick-copy images for profile pics, banners, and more
        </p>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1.5 mb-6" data-testid="gallery-tabs">
        {TABS.map((tab) => (
          <Button
            key={tab.value}
            variant={activeTab === tab.value ? "secondary" : "ghost"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setActiveTab(tab.value)}
            data-testid={`tab-gallery-${tab.value}`}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Loading — masonry-style skeleton */}
      {isLoading && (
        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-4 md:gap-5 space-y-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="break-inside-avoid mb-4">
              <Skeleton className={`${SKELETON_HEIGHTS[i % SKELETON_HEIGHTS.length]} w-full rounded-xl`} />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && images && images.length === 0 && (
        <EmptyState
          icon={ImageOff}
          title="No images yet"
          description={activeTab !== "all"
            ? "No images in this category. Try another filter."
            : "The gallery is empty. Check back soon!"}
          action={
            <Link href={articleUrl({ slug: "contact" })}>
              <Button variant="outline" size="sm" data-testid="link-gallery-empty-contact">Visit Discord</Button>
            </Link>
          }
        />
      )}

      {/* Masonry image grid */}
      {!isLoading && images && images.length > 0 && (
        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-4 md:gap-5 space-y-4" data-testid="gallery-grid">
          {images.map((image) => {
            const isOwner = user?.id === image.uploadedBy;
            const isRevealed = isTouch && revealedCardId === image.id;
            return (
              <div
                key={image.id}
                data-gallery-card-id={image.id}
                className="break-inside-avoid mb-4 block group relative rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow"
                data-testid={`card-gallery-${image.id}`}
              >
                <button
                  className="w-full block relative"
                  onClick={() => {
                    if (isTouch && revealedCardId !== image.id) {
                      setRevealedCardId(image.id);
                      return;
                    }
                    setLightboxImage(image);
                  }}
                  data-testid={`button-expand-image-${image.id}`}
                >
                  <img
                    src={resolveImageUrl(image.imageUrl)}
                    alt={image.altText || image.title}
                    className="w-full block rounded-xl"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      const fallback = (e.target as HTMLImageElement).nextElementSibling;
                      if (fallback) fallback.classList.remove("hidden");
                    }}
                  />
                  <div className="hidden absolute inset-0 flex items-center justify-center bg-muted rounded-xl" style={{ minHeight: "8rem" }}>
                    <ImageOff className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                </button>

                {!image.isPublic && (
                  <div className="absolute top-2 right-2 z-10 pointer-events-none">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">Members only</Badge>
                  </div>
                )}

                {/* Always-visible spark count overlay */}
                <div
                  className="absolute bottom-2 left-2 z-10 flex items-center gap-1 bg-black/60 text-amber-400 rounded-md px-2 py-0.5 text-xs font-semibold backdrop-blur-sm pointer-events-none"
                  data-testid={`badge-gallery-spark-overlay-${image.id}`}
                >
                  <Zap className="h-3 w-3 fill-amber-400" />
                  <span>{image.sparkCount ?? 0}</span>
                </div>

                {/* Hover/focus reveal overlay with metadata + actions */}
                <div
                  className={`absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-16 transition-opacity duration-200 motion-reduce:transition-none ${
                    isRevealed
                      ? "opacity-100 pointer-events-auto"
                      : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold leading-tight line-clamp-2 text-white" data-testid={`text-gallery-title-${image.id}`}>
                        {image.title}
                      </p>
                      {image.uploaderName && (
                        <p className="text-[10px] text-white/80 mt-0.5" data-testid={`text-gallery-uploader-${image.id}`}>
                          by @{image.uploaderName}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0.5 shrink-0 ${CATEGORY_COLORS[image.category] ?? CATEGORY_COLORS.other}`}
                      data-testid={`badge-gallery-category-${image.id}`}
                    >
                      {CATEGORY_LABELS[image.category] ?? image.category}
                    </Badge>
                  </div>
                  <div className="flex gap-1.5 items-center">
                    {isOwner ? (
                      <div
                        className="flex items-center gap-1 text-xs text-amber-400 h-7 px-2 rounded bg-black/40"
                        data-testid={`chip-gallery-spark-owner-${image.id}`}
                      >
                        <Zap className="h-3 w-3 fill-amber-400" />
                        <span>{image.sparkCount ?? 0}</span>
                      </div>
                    ) : (
                      <TooltipProvider>
                        <Tooltip open={sparkTooltips[image.id] ?? false}>
                          <TooltipTrigger asChild>
                            <button
                              className={`flex items-center gap-1 text-xs transition-colors h-7 px-2 rounded bg-black/40 ${
                                image.isSparkedByMe
                                  ? "text-amber-400"
                                  : dailyLimitReached && !image.isSparkedByMe
                                  ? "text-white/50 cursor-not-allowed"
                                  : "text-white hover:text-amber-400"
                              } ${!user ? "opacity-50 cursor-default" : ""}`}
                              onClick={(e) => { e.stopPropagation(); handleSpark(image); }}
                              disabled={dailyLimitReached && !image.isSparkedByMe}
                              data-testid={`button-gallery-spark-${image.id}`}
                            >
                              <Zap className={`h-3 w-3 ${image.isSparkedByMe ? "fill-amber-400" : ""}`} />
                              <span>{image.sparkCount ?? 0}</span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            {image.isSparkedByMe ? "Already sparked!" : dailyLimitReached ? "Daily spark limit reached (10/day)" : "Spark this image"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 w-7 p-0 shrink-0"
                      onClick={(e) => { e.stopPropagation(); downloadImage(image.imageUrl, image.title); }}
                      data-testid={`button-download-image-${image.id}`}
                      title="Download"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 w-7 p-0 shrink-0"
                      onClick={(e) => { e.stopPropagation(); copyLink(resolveImageUrl(image.imageUrl), image.title); }}
                      data-testid={`button-copy-link-${image.id}`}
                      title="Copy Link"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 w-7 p-0 shrink-0"
                      asChild
                      data-testid={`button-open-image-${image.id}`}
                    >
                      <a
                        href={resolveImageUrl(image.imageUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Open Full Size"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox dialog */}
      <Dialog open={lightboxImage !== null} onOpenChange={(open) => { if (!open) setLightboxImage(null); }}>
        <DialogContent className="max-w-[95vw] w-auto p-0 overflow-hidden bg-background border rounded-2xl" data-testid="lightbox-dialog">
          <DialogTitle className="sr-only">
            {lightboxImage?.title ?? "Image preview"}
          </DialogTitle>
          {lightboxImage && (
            <div className="flex flex-col items-center">
              <div className="relative w-full flex items-center justify-center bg-muted/30 p-4">
                <img
                  src={resolveImageUrl(lightboxImage.imageUrl)}
                  alt={lightboxImage.altText || lightboxImage.title}
                  className="max-w-[90vw] max-h-[75vh] object-contain rounded-xl"
                  data-testid="lightbox-image"
                />
              </div>
              <div className="w-full px-5 py-4 flex flex-col gap-3 border-t">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold leading-snug" data-testid="lightbox-title">
                    {lightboxImage.title}
                  </p>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0.5 shrink-0 ${CATEGORY_COLORS[lightboxImage.category] ?? CATEGORY_COLORS.other}`}
                    data-testid="lightbox-category-badge"
                  >
                    {CATEGORY_LABELS[lightboxImage.category] ?? lightboxImage.category}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1.5"
                    onClick={() => downloadImage(lightboxImage.imageUrl, lightboxImage.title)}
                    data-testid="lightbox-button-download"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1.5"
                    onClick={() => copyLink(resolveImageUrl(lightboxImage.imageUrl), lightboxImage.title)}
                    data-testid="lightbox-button-copy"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy Link
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1.5"
                    asChild
                    data-testid="lightbox-button-open"
                  >
                    <a href={resolveImageUrl(lightboxImage.imageUrl)} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open Full Size
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9 w-9 p-0 shrink-0"
                    onClick={() => setLightboxImage(null)}
                    data-testid="lightbox-button-close"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
