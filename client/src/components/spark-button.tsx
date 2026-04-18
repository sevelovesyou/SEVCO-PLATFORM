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

const INVALIDATE_KEYS: Record<SparkEntityType, string[]> = {
  track: ["/api/music/tracks"],
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

  const mutation = useMutation({
    mutationFn: () => apiRequest("POST", ENDPOINTS[entityType](entityId)),
    onSuccess: () => {
      INVALIDATE_KEYS[entityType].forEach((key) =>
        queryClient.invalidateQueries({ queryKey: [key] })
      );
      queryClient.invalidateQueries({ queryKey: ["/api/sparks/daily-quota"] });
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

  const handleClick = () => {
    if (!user) return;
    if (sparkedByCurrentUser) {
      setTooltipOpen(true);
      setTimeout(() => setTooltipOpen(false), 2000);
      return;
    }
    mutation.mutate();
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
            ? "Already sparked!"
            : disabled
            ? "Daily spark limit reached (10/day)"
            : `Spark this ${entityType}`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
