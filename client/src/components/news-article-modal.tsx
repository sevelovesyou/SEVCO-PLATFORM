import { useState } from "react";
import { X, ExternalLink, Sparkles, Loader2, Send, ImagePlus, Lightbulb, MessageCircle } from "lucide-react";
import { SiX } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useStreamingSummarize, useStreamingAsk, useGrokImage, type NewsAiSettings } from "@/hooks/use-news-ai";
import type { NewsArticle } from "@/components/news-article-card";
import { formatDistanceToNow } from "date-fns";
import { useQuery } from "@tanstack/react-query";

interface ArticleModalProps {
  article: NewsArticle;
  onClose: () => void;
  aiSettings: NewsAiSettings;
}

function StreamingText({ text }: { text: string }) {
  return (
    <span className="inline">
      {text}
      <span className="inline-block w-1.5 h-4 bg-primary/60 motion-safe:animate-pulse ml-0.5 align-middle" />
    </span>
  );
}

interface RelatedXPost {
  title: string;
  link: string;
  source: string;
  sourceType?: string;
  authorHandle?: string;
}

function RelatedXPosts({ query }: { query: string }) {
  const { data: results, isLoading } = useQuery<RelatedXPost[]>({
    queryKey: ["/api/news/x-feed", query, 5],
    queryFn: () => fetch(`/api/news/x-feed?category=${encodeURIComponent(query)}&limit=5`).then((r) => r.json()),
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
    </div>
  );

  if (!results?.length) return <p className="text-xs text-muted-foreground">No related posts found.</p>;

  return (
    <div className="space-y-2" data-testid="related-x-posts">
      {results.slice(0, 5).map((post, i) => (
        <a
          key={i}
          href={post.link}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-2.5 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
          data-testid={`related-post-${i}`}
        >
          <p className="text-xs text-foreground line-clamp-2 leading-relaxed">{post.title}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <SiX className="h-2.5 w-2.5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">{post.source}</span>
            {post.authorHandle && <span className="text-[10px] text-muted-foreground font-mono">{post.authorHandle}</span>}
          </div>
        </a>
      ))}
    </div>
  );
}

export function ArticleDetailModal({ article, onClose, aiSettings }: ArticleModalProps) {
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);

  const { summarize, streamedText, result: summaryResult, isStreaming: isSummarizing, error: summaryError } = useStreamingSummarize();
  const { ask, streamedAnswer, isStreaming: isAsking, reset: resetAsk } = useStreamingAsk();
  const imageMutation = useGrokImage();

  const isAiAvailable = aiSettings.aiAvailable;
  const hasSummary = summaryResult;
  const hasSummaryStarted = isSummarizing || !!streamedText || !!summaryResult;

  const handleSummarize = () => {
    if (hasSummaryStarted) return;
    summarize(article.link, article.title);
  };

  const handleAsk = async () => {
    if (!chatQuestion.trim() || isAsking) return;
    const q = chatQuestion.trim();
    setChatHistory((prev) => [...prev, { role: "user", content: q }]);
    setChatQuestion("");
    resetAsk();
    const answer = await ask(article.title, article.link, q);
    if (answer) {
      setChatHistory((prev) => [...prev, { role: "assistant", content: answer }]);
    } else {
      setChatHistory((prev) => [...prev, { role: "assistant", content: "Sorry, I couldn't process that question." }]);
    }
  };

  const handleGenerateImage = () => {
    if (imageMutation.isPending) return;
    imageMutation.mutate({ prompt: article.title, cacheKey: article.link });
  };

  let relativeTime = "";
  try {
    const d = new Date(article.pubDate);
    if (!isNaN(d.getTime())) relativeTime = formatDistanceToNow(d, { addSuffix: true });
  } catch {}

  const searchTerms = article.title.split(" ").slice(0, 4).join(" ");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-testid="article-detail-modal">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b z-10 flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Article Details</span>
            {isAiAvailable && <Badge variant="secondary" className="text-[10px]">Grok AI</Badge>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8" data-testid="button-close-modal">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {(imageMutation.data?.url || article.imageUrl) && (
            <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
              <img
                src={imageMutation.data?.url || article.imageUrl || ""}
                alt={article.title}
                className="w-full h-full object-cover"
              />
              {imageMutation.data && (
                <Badge className="absolute bottom-2 right-2 bg-primary/80 text-[10px]">
                  <Sparkles className="h-2.5 w-2.5 mr-1" />AI Generated
                </Badge>
              )}
            </div>
          )}

          <div>
            {article.source && <Badge variant="outline" className="mb-2 text-xs">{article.source}</Badge>}
            <h2 className="text-xl font-serif font-bold text-foreground leading-tight" data-testid="text-modal-title">
              {article.title}
            </h2>
            {relativeTime && <p className="text-xs text-muted-foreground mt-1">{relativeTime}</p>}
            {article.description && (
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{article.description}</p>
            )}
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-2"
              data-testid="link-original-article"
            >
              Read original article <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          {isAiAvailable && aiSettings.summariesEnabled && (
            <div className="border rounded-xl p-4 bg-muted/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">AI Deep Summary</span>
                </div>
                {!hasSummaryStarted && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSummarize}
                    className="gap-1.5 text-xs"
                    data-testid="button-ai-summarize"
                  >
                    <Sparkles className="h-3 w-3" />
                    Summarize with Grok
                  </Button>
                )}
              </div>

              {isSummarizing && !summaryResult && (
                <div className="space-y-2">
                  {streamedText ? (
                    <p className="text-sm text-foreground leading-relaxed"><StreamingText text={streamedText} /></p>
                  ) : (
                    <>
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-4/5" />
                      <Skeleton className="h-4 w-3/5" />
                    </>
                  )}
                </div>
              )}

              {summaryError && (
                <p className="text-xs text-destructive">Failed to generate summary. Please try again.</p>
              )}

              {hasSummary && (
                <div className="space-y-3">
                  <p className="text-sm text-foreground leading-relaxed">{hasSummary.summary}</p>
                  {hasSummary.keyInsights.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1.5">Key Insights</p>
                      <ul className="space-y-1">
                        {hasSummary.keyInsights.map((insight, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="text-primary mt-0.5">-</span>
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-[10px] text-primary/60">
                    <Sparkles className="h-2.5 w-2.5" />
                    <span>Powered by Grok AI</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {isAiAvailable && aiSettings.imagesEnabled && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateImage}
                disabled={imageMutation.isPending}
                className="gap-1.5 text-xs"
                data-testid="button-generate-illustration"
              >
                {imageMutation.isPending ? <Loader2 className="h-3 w-3 motion-safe:animate-spin" /> : <ImagePlus className="h-3 w-3" />}
                {imageMutation.isPending ? "Generating..." : "Generate Custom Illustration"}
              </Button>
              {imageMutation.isError && <span className="text-xs text-destructive">Generation failed</span>}
            </div>
          )}

          <div className="border rounded-xl p-4 bg-muted/20">
            <div className="flex items-center gap-2 mb-3">
              <SiX className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-semibold">Related Posts on X</span>
            </div>
            <RelatedXPosts query={searchTerms} />
          </div>

          {isAiAvailable && aiSettings.chatEnabled && (
            <div className="border rounded-xl p-4 bg-muted/20" data-testid="article-chat-section">
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Ask Grok About This Story</span>
              </div>

              {(chatHistory.length > 0 || isAsking) && (
                <div className="space-y-3 mb-3 max-h-48 overflow-y-auto">
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`text-sm ${msg.role === "user" ? "text-right" : ""}`}>
                      <div className={`inline-block rounded-lg px-3 py-2 max-w-[85%] ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted border"
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isAsking && streamedAnswer && (
                    <div className="text-sm">
                      <div className="inline-block rounded-lg px-3 py-2 bg-muted border max-w-[85%]">
                        <StreamingText text={streamedAnswer} />
                      </div>
                    </div>
                  )}
                  {isAsking && !streamedAnswer && (
                    <div className="text-sm">
                      <div className="inline-block rounded-lg px-3 py-2 bg-muted border">
                        <Loader2 className="h-3 w-3 motion-safe:animate-spin inline" /> Thinking...
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  placeholder="Ask a question about this article..."
                  value={chatQuestion}
                  onChange={(e) => setChatQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                  className="text-sm"
                  data-testid="input-article-chat"
                />
                <Button
                  size="icon"
                  onClick={handleAsk}
                  disabled={!chatQuestion.trim() || isAsking}
                  data-testid="button-send-article-chat"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
