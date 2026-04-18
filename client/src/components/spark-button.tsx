import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { SparkIcon } from "@/components/spark-icon";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { playSparkSound } from "@/lib/spark-sound";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type SparkEntityType = "track" | "product" | "project" | "service" | "article";

const ENDPOINTS: Record<SparkEntityType, (id: number | string) => string> = {
  track: (id) => `/api/music/tracks/${id}/spark`,
  product: (id) => `/api/store/products/${id}/spark`,
  project: (id) => `/api/projects/${id}/spark`,
  service: (id) => `/api/services/${id}/spark`,
  article: (id) => `/api/articles/${id}/spark`,
};

// Entity types that support unsparking (toggle off)
const SUPPORTS_UNSPARK: Record<SparkEntityType, boolean> = {
  track: true,
  product: false,
  project: false,
  service: false,
  article: false,
};

const INVALIDATE_KEYS: Record<SparkEntityType, string[]> = {
  track: ["/api/music/tracks", "/api/profile"],
  product: ["/api/store/products"],
  project: ["/api/projects"],
  service: ["/api/services"],
  article: ["/api/articles", "/api/search"],
};

interface SparkButtonProps {
  entityType: SparkEntityType;
  entityId: number | string;
  sparkCount: number;
  sparkedByCurrentUser: boolean;
  isOwner?: boolean;
  /** @deprecated No-op. Owner state now always shows the button (disabled). */
  showCountWhenOwner?: boolean;
  size?: "sm" | "md";
  className?: string;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const PARTICLE_COUNT = 6;

export function SparkButton({
  entityType,
  entityId,
  sparkCount,
  sparkedByCurrentUser,
  isOwner = false,
  showCountWhenOwner = false,
  size = "sm",
  className = "",
}: SparkButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [burstId, setBurstId] = useState(0);
  const [displayCount, setDisplayCount] = useState(sparkCount);
  const reducedMotionRef = useRef(prefersReducedMotion());

  useEffect(() => {
    setDisplayCount(sparkCount);
  }, [sparkCount]);

  const { data: dailyQuota } = useQuery<{ given: number; limit: number; remaining: number }>({
    queryKey: ["/api/sparks/daily-quota"],
    enabled: !!user,
  });
  const dailyLimitReached = (dailyQuota?.remaining ?? 1) === 0;

  const canUnspark = SUPPORTS_UNSPARK[entityType];

  const mutation = useMutation({
    mutationFn: (action: "spark" | "unspark") =>
      apiRequest(action === "spark" ? "POST" : "DELETE", ENDPOINTS[entityType](entityId)),
    onSuccess: () => {
      playSparkSound();
      setDisplayCount((c) => c + 1);
      if (!reducedMotionRef.current) {
        setBurstId((b) => b + 1);
      }
      INVALIDATE_KEYS[entityType].forEach((key) =>
        queryClient.invalidateQueries({ queryKey: [key] })
      );
      if (entityType === "article") {
        queryClient.invalidateQueries({ queryKey: ["/api/articles", entityId] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/sparks/daily-quota"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sparks/balance"] });
    },
    onError: (err: any) => {
      const msg = err?.message ?? "";
      if (err?.status === 429 || msg.includes("429")) {
        toast({ title: "Daily limit reached", description: "You can give 10 sparks per day." });
      } else if (err?.status === 403 || msg.includes("403")) {
        toast({ title: "Cannot spark your own content", variant: "destructive" });
      } else if (err?.status === 409 || msg.includes("409")) {
        // already sparked – silent
      } else {
        toast({ title: "Could not spark", description: msg, variant: "destructive" });
      }
    },
  });

  if (isOwner) {
    if (!showCountWhenOwner) return null;
    const sizing =
      size === "md" ? "h-9 px-2.5 text-sm gap-1.5" : "h-7 px-1.5 text-xs gap-1";
    const iconEmojiSize = size === "md" ? "md" : "sm";
    return (
      <span
        className={`flex items-center text-muted-foreground ${sizing} ${className}`}
        data-testid={`text-${entityType}-spark-count-${entityId}`}
      >
        <SparkIcon size={iconEmojiSize} decorative />
        <span className="tabular-nums">{displayCount}</span>
      </span>
    );
  }
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();
    if (isOwner) return;
    if (!user) return;
    if (sparkedByCurrentUser) {
      if (canUnspark) {
        mutation.mutate("unspark");
      } else {
        setTooltipOpen(true);
        setTimeout(() => setTooltipOpen(false), 2000);
      }
      return;
    }
    mutation.mutate("spark");
  };

  const disabled = dailyLimitReached && !sparkedByCurrentUser;
  const sizing =
    size === "md" ? "h-9 px-2.5 text-sm gap-1.5" : "h-7 px-1.5 text-xs gap-1";
  const iconEmojiSize = size === "md" ? "md" : "sm";
  const iconBoxSize = size === "md" ? "h-4 w-4" : "h-3 w-3";
  const burstActive = burstId > 0 && !reducedMotionRef.current;

  return (
    <TooltipProvider>
      <Tooltip open={tooltipOpen || undefined}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`flex items-center transition-colors rounded ${sizing} ${
              isOwner
                ? "text-muted-foreground opacity-60 cursor-not-allowed"
                : sparkedByCurrentUser
                ? "text-amber-500"
                : disabled
                ? "text-muted-foreground opacity-40 cursor-not-allowed"
                : "text-muted-foreground hover:text-amber-500"
            } ${!user && !isOwner ? "opacity-50 cursor-default" : ""} ${className}`}
            onClick={handleClick}
            disabled={isOwner || disabled || mutation.isPending}
            data-testid={`button-${entityType}-spark-${entityId}`}
          >
            <span className={`relative inline-flex items-center justify-center ${iconBoxSize}`}>
              <motion.span
                key={burstId}
                initial={{ scale: 1 }}
                animate={burstActive ? { scale: [1, 1.45, 1] } : { scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="inline-flex"
              >
                <SparkIcon size={iconEmojiSize} decorative />
              </motion.span>
              <AnimatePresence>
                {burstActive && (
                  <motion.span
                    key={`burst-${burstId}`}
                    className="pointer-events-none absolute inset-0 flex items-center justify-center"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    onAnimationComplete={() => setBurstId(0)}
                    aria-hidden="true"
                  >
                    <motion.span
                      className="absolute rounded-full border-2 border-sky-400"
                      initial={{ width: 6, height: 6, opacity: 0.9 }}
                      animate={{ width: 28, height: 28, opacity: 0 }}
                      transition={{ duration: 0.55, ease: "easeOut" }}
                    />
                    {Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
                      const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
                      const dist = size === "md" ? 16 : 12;
                      const x = Math.cos(angle) * dist;
                      const y = Math.sin(angle) * dist;
                      return (
                        <motion.span
                          key={i}
                          className="absolute h-1 w-1 rounded-full bg-sky-400"
                          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                          animate={{ x, y, opacity: 0, scale: 0.4 }}
                          transition={{ duration: 0.55, ease: "easeOut" }}
                        />
                      );
                    })}
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
            <span
              className="relative inline-flex overflow-hidden"
              data-testid={`text-${entityType}-spark-count-${entityId}`}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={displayCount}
                  initial={reducedMotionRef.current ? { y: 0, opacity: 1 } : { y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={reducedMotionRef.current ? { y: 0, opacity: 0 } : { y: -8, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="inline-block tabular-nums"
                >
                  {displayCount}
                </motion.span>
              </AnimatePresence>
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {isOwner
            ? "You can't spark your own content"
            : !user
            ? "Log in to spark"
            : sparkedByCurrentUser
            ? canUnspark ? "Click to unspark" : "Already sparked!"
            : disabled
            ? "Daily spark limit reached (10/day)"
            : `Spark this ${entityType}`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
