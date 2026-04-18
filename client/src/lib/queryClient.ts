import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = text || res.statusText;
    if (text) {
      try {
        const data = JSON.parse(text);
        if (data?.message) message = data.message;
        else if (data?.error) message = data.error;
      } catch {}
    }
    throw new Error(message);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

// Defensively parse a JSON response body. If the server (or an upstream
// proxy / SPA fallback) returns HTML instead of JSON, the native
// `res.json()` throws `SyntaxError: Invalid or unexpected token` with no
// context — we replace it with a clear Error that names the URL and a
// short snippet of the body so the cause is visible in deploy logs.
async function parseJsonOrThrow(res: Response, url: string): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (err) {
    const snippet = text.slice(0, 120).replace(/\s+/g, " ");
    const ctype = res.headers.get("content-type") || "unknown";
    const original = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Expected JSON from ${url} (status=${res.status}, content-type=${ctype}) but got: ${snippet} — ${original}`,
    );
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return (await parseJsonOrThrow(res, url)) as never;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
