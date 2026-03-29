import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState, useCallback } from "react";

export interface NewsAiSettings {
  summariesEnabled: boolean;
  imagesEnabled: boolean;
  chatEnabled: boolean;
  briefingEnabled: boolean;
  searchEnabled: boolean;
  trendingEnabled: boolean;
  aiAvailable: boolean;
}

export function useNewsAiSettings() {
  return useQuery<NewsAiSettings>({
    queryKey: ["/api/news/ai-settings"],
    staleTime: 5 * 60 * 1000,
  });
}

function parseSSELines(buffer: string): { events: Array<{ data: string }>; remaining: string } {
  const events: Array<{ data: string }> = [];
  let remaining = buffer;

  while (true) {
    const doubleNewline = remaining.indexOf("\n\n");
    if (doubleNewline === -1) break;

    const frame = remaining.slice(0, doubleNewline);
    remaining = remaining.slice(doubleNewline + 2);

    const lines = frame.split("\n");
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        events.push({ data: line.slice(6) });
      }
    }
  }

  return { events, remaining };
}

export function useGrokSummarize() {
  return useMutation({
    mutationFn: async ({ url, title }: { url: string; title: string }) => {
      const res = await apiRequest("POST", "/api/news/grok/summarize", { url, title });
      return res.json() as Promise<{ summary: string; keyInsights: string[]; category: string }>;
    },
  });
}

export function useStreamingSummarize() {
  const [streamedText, setStreamedText] = useState("");
  const [result, setResult] = useState<{ summary: string; keyInsights: string[]; category: string } | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summarize = useCallback(async (url: string, title: string) => {
    setStreamedText("");
    setResult(null);
    setError(null);
    setIsStreaming(true);

    try {
      const res = await fetch("/api/news/grok/summarize/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, title }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to generate summary" }));
        setError(body.message || "Failed to generate summary");
        setIsStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) { setIsStreaming(false); return; }

      const decoder = new TextDecoder();
      let sseBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const { events, remaining } = parseSSELines(sseBuffer);
        sseBuffer = remaining;

        for (const event of events) {
          try {
            const data = JSON.parse(event.data);
            if (data.error) { setError(data.error); setIsStreaming(false); return; }
            if (data.type === "chunk") {
              setStreamedText((prev) => prev + data.content);
            } else if (data.type === "complete") {
              setResult({ summary: data.summary, keyInsights: data.keyInsights, category: data.category });
            }
          } catch {
            console.warn("SSE parse error for summarize event");
          }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Streaming failed");
    }
    setIsStreaming(false);
  }, []);

  return { summarize, streamedText, result, isStreaming, error };
}

export function useStreamingAsk() {
  const [streamedAnswer, setStreamedAnswer] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = useCallback(async (title: string, url: string, question: string): Promise<string> => {
    setStreamedAnswer("");
    setError(null);
    setIsStreaming(true);
    let fullContent = "";

    try {
      const res = await fetch("/api/news/grok/ask/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, url, question }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to get answer" }));
        setError(body.message || "Failed to get answer");
        setIsStreaming(false);
        return "";
      }

      const reader = res.body?.getReader();
      if (!reader) { setIsStreaming(false); return ""; }

      const decoder = new TextDecoder();
      let sseBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const { events, remaining } = parseSSELines(sseBuffer);
        sseBuffer = remaining;

        for (const event of events) {
          try {
            const data = JSON.parse(event.data);
            if (data.error) { setError(data.error); setIsStreaming(false); return ""; }
            if (data.type === "chunk") {
              fullContent += data.content;
              setStreamedAnswer((prev) => prev + data.content);
            } else if (data.type === "done") {
              fullContent = data.fullContent || fullContent;
            }
          } catch {
            console.warn("SSE parse error for ask event");
          }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Streaming failed");
    }
    setIsStreaming(false);
    return fullContent;
  }, []);

  const reset = useCallback(() => {
    setStreamedAnswer("");
    setError(null);
  }, []);

  return { ask, streamedAnswer, isStreaming, error, reset };
}

export function useGrokImage() {
  return useMutation({
    mutationFn: async ({ prompt, cacheKey }: { prompt: string; cacheKey?: string }) => {
      const res = await apiRequest("POST", "/api/news/grok/image", { prompt, cacheKey });
      return res.json() as Promise<{ url: string }>;
    },
  });
}

export function useGrokAsk() {
  return useMutation({
    mutationFn: async ({ title, url, question }: { title: string; url: string; question: string }) => {
      const res = await apiRequest("POST", "/api/news/grok/ask", { title, url, question });
      return res.json() as Promise<{ answer: string }>;
    },
  });
}

export interface GrokSearchArticle {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  imageUrl: string | null;
}

export interface GrokLiveResult {
  title: string;
  url: string;
  snippet: string;
}

export interface GrokSearchResponse {
  interpretation: string;
  articles: GrokSearchArticle[];
  liveResults: GrokLiveResult[];
}

export function useGrokSearch() {
  return useMutation({
    mutationFn: async ({ query }: { query: string }) => {
      const res = await apiRequest("POST", "/api/news/grok/search", { query });
      return res.json() as Promise<GrokSearchResponse>;
    },
  });
}

export function useGrokBriefing() {
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/news/grok/briefing", {});
      return res.json() as Promise<{
        greeting: string;
        sections: Array<{ category: string; summary: string; highlights: string[] }>;
        closingThought: string;
      }>;
    },
  });
}
