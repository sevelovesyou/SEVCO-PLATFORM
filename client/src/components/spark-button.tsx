import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Zap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type SparkEntityType = "track" | "product" | "project" | "service";

const ENDPOINTS: Record<SparkEntityType, (id: number) => string> = {
  track: (id) => `/api/music/tracks/${id}/spark`,
  product: (id) => `/api/store/products/${id}/spark`,
  project: (id) => `/api/projects/${id}/spark`,
  service: (id) => `/api/services/${id}/spark`,
};

// Entity types that support unsparking (toggle off)
const SUPPORTS_UNSPARK: Record<SparkEntityType, boolean> = {
  track: true,
  product: false,
  project: false,
  service: false,
};

const INVALIDATE_KEYS: Record<SparkEntityType, string[]> = {
  track: ["/api/music/tracks", "/api/profile"],
  product: ["/api/store/products"],
  project: ["/api/projects"],
  service: ["/api/services"],
};

interface SparkButtonProps {
  entityType: SparkEntityType;
  entityId: number;
  sparkCount: number;
  sparkedByCurrentUser: boolean;
  isOwner?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function SparkButton({
  entityType,
  entityId,
  sparkCount,
  sparkedByCurrentUser,
  isOwner = false,
  size = "sm",
  className = "",
}: SparkButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tooltipOpen, setTooltipOpen] = useState(false);

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
      INVALIDATE_KEYS[entityType].forEach((key) =>
        queryClient.invalidateQueries({ queryKey: [key] })
      );
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

  if (isOwner) return null;

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();
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
  const iconSize = size === "md" ? "h-4 w-4" : "h-3 w-3";

  return (
    <TooltipProvider>
      <Tooltip open={tooltipOpen || undefined}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`flex items-center transition-colors rounded ${sizing} ${
              sparkedByCurrentUser
                ? "text-amber-500"
                : disabled
                ? "text-muted-foreground opacity-40 cursor-not-allowed"
                : "text-muted-foreground hover:text-amber-500"
            } ${!user ? "opacity-50 cursor-default" : ""} ${className}`}
            onClick={handleClick}
            disabled={disabled || mutation.isPending}
            data-testid={`button-${entityType}-spark-${entityId}`}
          >
            <Zap className={`${iconSize} ${sparkedByCurrentUser ? "fill-amber-500" : ""}`} />
            <span data-testid={`text-${entityType}-spark-count-${entityId}`}>{sparkCount}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {!user
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
