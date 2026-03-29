import { useState, useEffect } from "react";
import { TrendingUp, Send, Sparkles, Loader2, MessageCircle, ExternalLink } from "lucide-react";
import { SiX } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useStreamingAsk, type NewsAiSettings } from "@/hooks/use-news-ai";
import { formatDistanceToNow } from "date-fns";

interface NewsSidebarProps {
  aiSettings: NewsAiSettings;
  categoryName?: string;
  categories?: Array<{ id: number; name: string; accentColor: string | null }>;
  onCategoryFilter?: (name: string) => void;
}

interface XFeedPost {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  sourceType?: string;
  authorHandle?: string;
  imageUrl?: string | null;
}

function TrendingOnXPanel({ categoryName, aiSettings }: { categoryName?: string; aiSettings: NewsAiSettings }) {
  const { data: posts, isLoading } = useQuery<XFeedPost[]>({
    queryKey: ["/api/news/x-feed", categoryName || "technology", 6],
    queryFn: () => fetch(`/api/news/x-feed?category=${encodeURIComponent(categoryName || "technology")}&limit=6`).then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const [commentaryMap, setCommentaryMap] = useState<Record<string, string>>({});
  const [commentaryLoading, setCommentaryLoading] = useState(false);

  useEffect(() => {
    if (!posts?.length || !aiSettings.aiAvailable || !aiSettings.trendingEnabled) return;
    if (commentaryLoading || Object.keys(commentaryMap).length > 0) return;

    const topics = posts.slice(0, 6).map((p) => p.title).filter(Boolean);
    if (!topics.length) return;

    setCommentaryLoading(true);
    fetch("/api/news/grok/trending-commentary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topics }),
    })
      .then((r) => r.json())
      .then((data: Array<{ topic: string; commentary: string }>) => {
        if (Array.isArray(data)) {
          const map: Record<string, string> = {};
          data.forEach((item) => { if (item.commentary) map[item.topic] = item.commentary; });
          setCommentaryMap(map);
        }
      })
      .catch(() => {})
      .finally(() => setCommentaryLoading(false));
  }, [posts, aiSettings.aiAvailable, aiSettings.trendingEnabled]);

  return (
    <div className="border rounded-xl p-4 bg-card" data-testid="trending-x-panel">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
          <SiX className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-sm font-bold">Trending on X</span>
        <span className="ml-auto flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] text-muted-foreground">Live</span>
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
        </div>
      ) : !posts?.length ? (
        <p className="text-xs text-muted-foreground text-center py-4">No trending posts available.</p>
      ) : (
        <div className="space-y-2">
          {posts.slice(0, 6).map((post, i) => {
            let timeAgo = "";
            try {
              const d = new Date(post.pubDate);
              if (!isNaN(d.getTime())) timeAgo = formatDistanceToNow(d, { addSuffix: true });
            } catch {}

            const commentary = commentaryMap[post.title];

            return (
              <a
                key={i}
                href={post.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-2.5 rounded-lg border hover:bg-muted/50 transition-colors group"
                data-testid={`trending-post-${i}`}
              >
                <p className="text-xs font-medium text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                  {post.title}
                </p>
                {commentary && (
                  <p className="text-[10px] text-primary/70 mt-1 line-clamp-2 italic flex items-start gap-1">
                    <Sparkles className="h-2.5 w-2.5 mt-0.5 shrink-0" />
                    {commentary}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                  {post.sourceType === "x" && <SiX className="h-2.5 w-2.5" />}
                  <span className="truncate">{post.source}</span>
                  {timeAgo && <span className="shrink-0">{timeAgo}</span>}
                  <ExternalLink className="h-2.5 w-2.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </a>
            );
          })}
        </div>
      )}

      {commentaryLoading && (
        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-primary/60">
          <Loader2 className="h-2.5 w-2.5 animate-spin" />
          <span>Grok analyzing trends...</span>
        </div>
      )}
    </div>
  );
}

function StreamingText({ text }: { text: string }) {
  return (
    <span className="inline">
      {text}
      <span className="inline-block w-1.5 h-3 bg-primary/60 animate-pulse ml-0.5 align-middle" />
    </span>
  );
}

function AskGrokPanel({ aiSettings }: { aiSettings: NewsAiSettings }) {
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const { ask, streamedAnswer, isStreaming, reset: resetAsk } = useStreamingAsk();

  const handleAsk = async () => {
    if (!question.trim() || isStreaming) return;
    const q = question.trim();
    setChatHistory((prev) => [...prev, { role: "user", content: q }]);
    setQuestion("");
    resetAsk();
    const answer = await ask("General news inquiry", "", q);
    if (answer) {
      setChatHistory((prev) => [...prev, { role: "assistant", content: answer }]);
    } else {
      setChatHistory((prev) => [...prev, { role: "assistant", content: "Sorry, I couldn't process that." }]);
    }
  };

  if (!aiSettings.aiAvailable || !aiSettings.chatEnabled) return null;

  return (
    <div className="border rounded-xl p-4 bg-card" data-testid="ask-grok-panel">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
          <MessageCircle className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-sm font-bold">Ask Grok</span>
        <Badge variant="secondary" className="text-[9px] ml-auto">AI</Badge>
      </div>

      {(chatHistory.length > 0 || isStreaming) && (
        <div className="space-y-2 mb-3 max-h-60 overflow-y-auto">
          {chatHistory.map((msg, i) => (
            <div key={i} className={`text-xs ${msg.role === "user" ? "text-right" : ""}`}>
              <div className={`inline-block rounded-lg px-2.5 py-1.5 max-w-[90%] ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted border"
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isStreaming && streamedAnswer && (
            <div className="text-xs">
              <div className="inline-block rounded-lg px-2.5 py-1.5 bg-muted border max-w-[90%]">
                <StreamingText text={streamedAnswer} />
              </div>
            </div>
          )}
          {isStreaming && !streamedAnswer && (
            <div className="text-xs">
              <div className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 bg-muted border">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Thinking...</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-1.5">
        <Input
          placeholder="Ask about current news..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          className="text-xs h-8"
          data-testid="input-ask-grok"
        />
        <Button
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={handleAsk}
          disabled={!question.trim() || isStreaming}
          data-testid="button-send-grok"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function CategoryQuickFilters({ categories, onFilter }: { categories?: Array<{ id: number; name: string; accentColor: string | null }>; onFilter: (name: string) => void }) {
  if (!categories?.length) return null;

  return (
    <div className="border rounded-xl p-4 bg-card" data-testid="category-quick-filters">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4 text-primary" />
        <span className="text-sm font-bold">Categories</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {categories.slice(0, 10).map((cat) => (
          <button
            key={cat.id}
            onClick={() => onFilter(cat.name)}
            className="px-2.5 py-1 rounded-full text-[11px] font-medium border hover:bg-muted/50 transition-colors"
            style={{ borderColor: cat.accentColor ? `${cat.accentColor}40` : undefined }}
            data-testid={`filter-cat-${cat.id}`}
          >
            <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: cat.accentColor || "#6b7280" }} />
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function NewsAiSidebar({ aiSettings, categoryName, categories, onCategoryFilter }: NewsSidebarProps) {
  return (
    <div className="space-y-4 lg:w-72 xl:w-80 shrink-0" data-testid="news-ai-sidebar">
      {aiSettings.trendingEnabled && <TrendingOnXPanel categoryName={categoryName} aiSettings={aiSettings} />}
      <AskGrokPanel aiSettings={aiSettings} />
      {categories && onCategoryFilter && (
        <CategoryQuickFilters categories={categories} onFilter={onCategoryFilter} />
      )}
    </div>
  );
}
