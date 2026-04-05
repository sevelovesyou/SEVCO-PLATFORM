import { useState } from "react";
import { PageHead } from "@/components/page-head";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "wouter";
import { Copy, ImageOff, ExternalLink, X } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import type { GalleryImage } from "@shared/schema";
import { resolveImageUrl } from "@/lib/resolve-image-url";

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

export default function GalleryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [lightboxImage, setLightboxImage] = useState<GalleryImage | null>(null);

  const queryKey = activeTab === "all"
    ? ["/api/gallery"]
    : ["/api/gallery", activeTab];

  const { data: images, isLoading } = useQuery<GalleryImage[]>({
    queryKey,
    queryFn: async () => {
      const url = activeTab === "all" ? "/api/gallery" : `/api/gallery?category=${activeTab}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch gallery");
      return res.json();
    },
  });

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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
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
        <div className="columns-2 sm:columns-3 md:columns-4 gap-4 space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="break-inside-avoid mb-4 space-y-2">
              <Skeleton className={`${SKELETON_HEIGHTS[i % SKELETON_HEIGHTS.length]} w-full rounded-xl`} />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-7 w-full" />
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
            user ? (
              <Link href="/">
                <Button variant="outline" size="sm" data-testid="link-gallery-empty-feed">Go Home</Button>
              </Link>
            ) : (
              <Link href="/wiki/contact">
                <Button variant="outline" size="sm" data-testid="link-gallery-empty-contact">Visit Discord</Button>
              </Link>
            )
          }
        />
      )}

      {/* Masonry image grid */}
      {!isLoading && images && images.length > 0 && (
        <div className="columns-2 sm:columns-3 md:columns-4 gap-4 space-y-4" data-testid="gallery-grid">
          {images.map((image) => (
            <div
              key={image.id}
              className="break-inside-avoid mb-4 group rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow"
              data-testid={`card-gallery-${image.id}`}
            >
              <button
                className="w-full relative"
                onClick={() => setLightboxImage(image)}
                data-testid={`button-expand-image-${image.id}`}
              >
                <img
                  src={resolveImageUrl(image.imageUrl)}
                  alt={image.altText || image.title}
                  className="w-full rounded-t-xl group-hover:opacity-90 transition-opacity"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    const fallback = (e.target as HTMLImageElement).nextElementSibling;
                    if (fallback) fallback.classList.remove("hidden");
                  }}
                />
                <div className="hidden absolute inset-0 flex items-center justify-center bg-muted rounded-t-xl" style={{ minHeight: "8rem" }}>
                  <ImageOff className="h-8 w-8 text-muted-foreground/40" />
                </div>
                {!image.isPublic && (
                  <div className="absolute top-1.5 right-1.5">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">Members only</Badge>
                  </div>
                )}
              </button>
              <div className="p-3 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold leading-tight line-clamp-2" data-testid={`text-gallery-title-${image.id}`}>
                    {image.title}
                  </p>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0.5 shrink-0 ${CATEGORY_COLORS[image.category] ?? CATEGORY_COLORS.other}`}
                    data-testid={`badge-gallery-category-${image.id}`}
                  >
                    {CATEGORY_LABELS[image.category] ?? image.category}
                  </Badge>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-7 text-xs gap-1"
                    onClick={() => copyLink(resolveImageUrl(image.imageUrl), image.title)}
                    data-testid={`button-copy-link-${image.id}`}
                  >
                    <Copy className="h-3 w-3" />
                    Copy Link
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 shrink-0"
                    asChild
                    data-testid={`button-open-image-${image.id}`}
                  >
                    <a href={resolveImageUrl(image.imageUrl)} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          ))}
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
