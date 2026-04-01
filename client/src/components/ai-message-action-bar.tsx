import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Copy, RefreshCw, ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface AiMessageActionBarProps {
  messageId: number;
  agentId: number;
  content: string;
  onRegenerate: (messageId: number) => void;
  compact?: boolean;
}

export function AiMessageActionBar({ messageId, agentId, content, onRegenerate, compact }: AiMessageActionBarProps) {
  const [copied, setCopied] = useState(false);
  const [vote, setVote] = useState<"up" | "down" | null>(null);

  async function handleCopy() {
    const plain = content.replace(/!\[.*?\]\(.*?\)/g, "").replace(/[#*`>_~\[\]]/g, "").trim();
    await navigator.clipboard.writeText(plain);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleVote(v: "up" | "down") {
    const newVote = vote === v ? null : v;
    setVote(newVote);
    if (!newVote) return;
    try {
      await apiRequest("POST", `/api/ai/chat/${agentId}/messages/${messageId}/feedback`, {
        vote: newVote,
      });
    } catch {}
  }

  const sz = compact ? "h-5 w-5" : "h-6 w-6";
  const iconSz = compact ? "h-2.5 w-2.5" : "h-3 w-3";

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" data-testid={`action-bar-${messageId}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className={`${sz} text-muted-foreground`} onClick={handleCopy} data-testid={`button-copy-${messageId}`}>
              {copied ? <Check className={iconSz} /> : <Copy className={iconSz} />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p className="text-xs">Copy text</p></TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className={`${sz} text-muted-foreground`} onClick={() => onRegenerate(messageId)} data-testid={`button-regenerate-${messageId}`}>
              <RefreshCw className={iconSz} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p className="text-xs">Regenerate</p></TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`${sz} ${vote === "up" ? "text-green-500" : "text-muted-foreground"}`}
              onClick={() => handleVote("up")}
              data-testid={`button-thumbsup-${messageId}`}
            >
              <ThumbsUp className={iconSz} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p className="text-xs">Good response</p></TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`${sz} ${vote === "down" ? "text-red-500" : "text-muted-foreground"}`}
              onClick={() => handleVote("down")}
              data-testid={`button-thumbsdown-${messageId}`}
            >
              <ThumbsDown className={iconSz} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p className="text-xs">Bad response</p></TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
