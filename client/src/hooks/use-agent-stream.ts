import { useState, useCallback, useRef } from "react";
import { queryClient } from "@/lib/queryClient";

async function consumeSSE(
  res: Response,
  onToken: (accumulated: string) => void,
) {
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No readable stream");

  const decoder = new TextDecoder();
  let accumulated = "";
  let lineBuf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    lineBuf += decoder.decode(value, { stream: true });
    const parts = lineBuf.split("\n");
    lineBuf = parts.pop() || "";

    for (const line of parts) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      if (data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data);
        if (parsed.token) {
          accumulated += parsed.token;
          onToken(accumulated);
        }
        if (parsed.error) {
          throw new Error(parsed.error);
        }
      } catch (e: any) {
        if (e.message && !e.message.includes("JSON")) {
          throw e;
        }
      }
    }
  }

  if (lineBuf.trim().startsWith("data: ")) {
    const data = lineBuf.trim().slice(6);
    if (data !== "[DONE]") {
      try {
        const parsed = JSON.parse(data);
        if (parsed.token) {
          accumulated += parsed.token;
          onToken(accumulated);
        }
      } catch {}
    }
  }
}

export function useAgentStream(agentId: number) {
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function streamFromUrl(url: string, body: Record<string, unknown>) {
    if (isStreaming) return;
    setIsStreaming(true);
    setStreamingContent("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Stream failed" }));
        throw new Error(err.message || `HTTP ${res.status}`);
      }

      await consumeSSE(res, setStreamingContent);
    } catch (e: any) {
      if (e.name === "AbortError") return;
      throw e;
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
      abortRef.current = null;
      queryClient.invalidateQueries({ queryKey: ["/api/ai/chat", agentId] });
    }
  }

  const send = useCallback(async (message: string) => {
    await streamFromUrl(`/api/ai/chat/${agentId}/stream`, { message });
  }, [agentId, isStreaming]);

  const regenerate = useCallback(async (messageId: number) => {
    queryClient.setQueryData<any[]>(["/api/ai/chat", agentId], (old) =>
      old ? old.filter((m: any) => m.id !== messageId) : []
    );
    await streamFromUrl(`/api/ai/chat/${agentId}/messages/${messageId}/regenerate`, {});
  }, [agentId, isStreaming]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { streamingContent, isStreaming, send, regenerate, abort };
}
