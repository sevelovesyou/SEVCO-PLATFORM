import type { Citation } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle, AlertTriangle, ExternalLink, Link2 } from "lucide-react";

interface CitationBadgeProps {
  citation: Citation;
  index: number;
}

export function CitationBadge({ citation, index }: CitationBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <sup>
          <Badge
            variant={citation.isValid ? "secondary" : "destructive"}
            className="text-[10px] px-1 py-0 cursor-help ml-0.5"
            data-testid={`citation-badge-${index}`}
          >
            [{index + 1}]
          </Badge>
        </sup>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            {citation.isValid ? (
              <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
            ) : (
              <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
            )}
            <span className="text-xs font-medium">{citation.title}</span>
          </div>
          <p className="text-xs text-muted-foreground">{citation.text}</p>
          {citation.url && (
            <a
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary flex items-center gap-1 hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Source
            </a>
          )}
          <div className="flex items-center gap-1.5 pt-0.5">
            <Badge variant="outline" className="text-[9px]">
              {citation.format}
            </Badge>
            {!citation.isValid && citation.errorMessage && (
              <span className="text-[10px] text-destructive">{citation.errorMessage}</span>
            )}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

interface CitationListProps {
  citations: Citation[];
}

export function CitationList({ citations }: CitationListProps) {
  if (!citations || citations.length === 0) return null;

  const validCount = citations.filter((c) => c.isValid).length;
  const invalidCount = citations.length - validCount;

  return (
    <div className="mt-6 border-t pt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">References</h3>
        </div>
        <div className="flex items-center gap-2">
          {validCount > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
              {validCount} valid
            </Badge>
          )}
          {invalidCount > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {invalidCount} invalid
            </Badge>
          )}
        </div>
      </div>
      <ol className="space-y-2">
        {citations.map((citation, i) => (
          <li key={citation.id} className="flex items-start gap-2 text-sm" data-testid={`citation-item-${i}`}>
            <span className="text-muted-foreground font-mono text-xs mt-0.5 shrink-0 w-5 text-right">
              {i + 1}.
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {citation.isValid ? (
                  <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                ) : (
                  <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
                )}
                <span className="font-medium text-xs">{citation.title}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{citation.text}</p>
              {citation.url && (
                <a
                  href={citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5"
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                  {citation.url.length > 60 ? citation.url.substring(0, 60) + "..." : citation.url}
                </a>
              )}
              {!citation.isValid && citation.errorMessage && (
                <p className="text-xs text-destructive mt-0.5">{citation.errorMessage}</p>
              )}
            </div>
            <Badge variant="outline" className="text-[9px] shrink-0 mt-0.5">
              {citation.format}
            </Badge>
          </li>
        ))}
      </ol>
    </div>
  );
}
