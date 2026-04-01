import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send } from "lucide-react";
import type { AiAgent } from "@shared/schema";

interface AgentComposerProps {
  agent: AiAgent;
  onSend: (content: string) => void;
  onClear: () => void;
  disabled?: boolean;
  compact?: boolean;
}

export function AgentComposer({ agent, onSend, onClear, disabled, compact }: AgentComposerProps) {
  const [value, setValue] = useState("");

  const modelName = agent.modelSlug.split("/").pop() || agent.modelSlug;

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;

    if (trimmed === "/clear") {
      onClear();
      setValue("");
      return;
    }

    onSend(trimmed);
    setValue("");
  }

  const padding = compact ? "p-2" : "p-4";
  const textSize = compact ? "text-xs" : "text-sm";
  const minH = compact ? "min-h-[30px]" : "min-h-[40px]";
  const maxH = compact ? "max-h-[80px]" : "max-h-[120px]";
  const btnSize = compact ? "h-7 w-7" : "h-10 w-10";
  const iconSize = compact ? "h-3 w-3" : "h-4 w-4";

  return (
    <div className={`border-t bg-background shrink-0 ${padding}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono" data-testid="badge-model-name">
          {modelName}
        </Badge>
      </div>
      <div className="flex gap-1.5 items-end">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${agent.name}… (Enter to send, /clear to reset)`}
          className={`resize-none ${minH} ${maxH} ${textSize} py-2`}
          rows={1}
          disabled={disabled}
          data-testid="input-ai-message"
        />
        <Button
          size="icon"
          className={`shrink-0 ${btnSize}`}
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          data-testid="button-ai-send"
          aria-label="Send message"
        >
          <Send className={iconSize} />
        </Button>
      </div>
    </div>
  );
}
