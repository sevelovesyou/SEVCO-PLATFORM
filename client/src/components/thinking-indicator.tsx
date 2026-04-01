import { Bot } from "lucide-react";

interface ThinkingIndicatorProps {
  agentName: string;
  agentAvatarUrl?: string | null;
  streamingContent?: string;
  compact?: boolean;
}

export function ThinkingIndicator({ agentName, agentAvatarUrl, streamingContent, compact }: ThinkingIndicatorProps) {
  const avatarSize = compact ? "w-5 h-5" : "w-8 h-8";
  const iconSize = compact ? "h-2.5 w-2.5" : "h-4 w-4";
  const gap = compact ? "gap-1.5" : "gap-3";
  const textSize = compact ? "text-xs" : "text-sm";
  const bubblePad = compact ? "px-2.5 py-1.5" : "px-4 py-2.5";
  const bubbleRound = compact ? "rounded-xl" : "rounded-2xl";

  return (
    <div className={`flex ${gap}`} data-testid="thinking-indicator">
      {agentAvatarUrl ? (
        <img src={agentAvatarUrl} alt={agentName} className={`${avatarSize} rounded-full object-cover shrink-0 mt-0.5`} />
      ) : (
        <div className={`${avatarSize} rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5`}>
          <Bot className={`${iconSize} text-primary`} />
        </div>
      )}
      <div className={`bg-muted ${bubbleRound} ${bubblePad} ${textSize} text-muted-foreground max-w-[80%]`}>
        {streamingContent ? (
          <span className="text-foreground whitespace-pre-wrap">{streamingContent}<span className="animate-pulse">▊</span></span>
        ) : (
          <span className="flex items-center gap-1.5">
            <span className="flex gap-0.5">
              <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
            <span className="italic">Thinking…</span>
          </span>
        )}
      </div>
    </div>
  );
}
