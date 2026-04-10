import { createPortal } from "react-dom";
import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  GripHorizontal, Compass, Minus, X, ChevronLeft, ChevronRight,
  RefreshCw, Loader2, Globe, ExternalLink
} from "lucide-react";
import { useLens } from "@/contexts/lens-context";

function proxyUrl(url: string): string {
  return `/api/lens/proxy?url=${encodeURIComponent(url)}`;
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "https://sevco.us";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[\w-]+(\.[\w-]+)+/.test(trimmed)) return `https://${trimmed}`;
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}

export function FloatingBrowser() {
  const { isOpen, currentUrl, closeLens, setCurrentUrl } = useLens();

  const initX = Math.max(40, (window.innerWidth - 860) / 2);
  const initY = Math.max(48, (window.innerHeight - 560) / 2);

  const [position, setPosition] = useState({ x: initX, y: initY });
  const [size, setSize] = useState({ width: 860, height: 560 });
  const [minimized, setMinimized] = useState(false);
  const [addressInput, setAddressInput] = useState(currentUrl);
  const [loadedUrl, setLoadedUrl] = useState(currentUrl);
  const [history, setHistory] = useState<string[]>([currentUrl]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [slowLoad, setSlowLoad] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const windowRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const normalized = normalizeUrl(currentUrl);
    setAddressInput(normalized);
    setLoadedUrl(normalized);
    setHistory([normalized]);
    setHistoryIndex(0);
    setIsLoading(true);
    setSlowLoad(false);
    setLoadError(false);
  }, [isOpen, currentUrl]);

  useEffect(() => {
    if (!isLoading) return;
    const t = setTimeout(() => {
      setSlowLoad(true);
    }, 5000);
    return () => clearTimeout(t);
  }, [isLoading, loadedUrl]);

  const navigate = useCallback((url: string) => {
    const normalized = normalizeUrl(url);
    setLoadedUrl(normalized);
    setAddressInput(normalized);
    setCurrentUrl(normalized);
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(normalized);
      return newHistory;
    });
    setHistoryIndex((prev) => prev + 1);
    setIsLoading(true);
    setSlowLoad(false);
    setLoadError(false);
  }, [historyIndex, setCurrentUrl]);

  const goBack = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setLoadedUrl(history[newIndex]);
    setAddressInput(history[newIndex]);
    setCurrentUrl(history[newIndex]);
    setIsLoading(true);
    setSlowLoad(false);
    setLoadError(false);
  }, [historyIndex, history, setCurrentUrl]);

  const goForward = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    setLoadedUrl(history[newIndex]);
    setAddressInput(history[newIndex]);
    setCurrentUrl(history[newIndex]);
    setIsLoading(true);
    setSlowLoad(false);
    setLoadError(false);
  }, [historyIndex, history, setCurrentUrl]);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setIsLoading(true);
    setSlowLoad(false);
    setLoadError(false);
  }, []);

  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      origX: position.x,
      origY: position.y,
    };
  }, [position]);

  const handleMouseDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX, e.clientY);

    function onMove(e: MouseEvent) {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const newX = Math.max(0, Math.min(window.innerWidth - size.width, dragRef.current.origX + dx));
      const newY = Math.max(0, Math.min(window.innerHeight - 40, dragRef.current.origY + dy));
      setPosition({ x: newX, y: newY });
    }

    function onUp() {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [position, size, handleDragStart]);

  const handleTouchDragStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDragStart(touch.clientX, touch.clientY);

    function onMove(e: TouchEvent) {
      if (!dragRef.current) return;
      const t = e.touches[0];
      const dx = t.clientX - dragRef.current.startX;
      const dy = t.clientY - dragRef.current.startY;
      const newX = Math.max(0, Math.min(window.innerWidth - size.width, dragRef.current.origX + dx));
      const newY = Math.max(0, Math.min(window.innerHeight - 40, dragRef.current.origY + dy));
      setPosition({ x: newX, y: newY });
    }

    function onEnd() {
      dragRef.current = null;
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    }

    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
  }, [position, size, handleDragStart]);

  const handleResizeStart = useCallback((clientX: number, clientY: number) => {
    resizeRef.current = {
      startX: clientX,
      startY: clientY,
      origW: size.width,
      origH: size.height,
    };
  }, [size]);

  const handleMouseResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleResizeStart(e.clientX, e.clientY);

    function onMove(e: MouseEvent) {
      if (!resizeRef.current) return;
      const dx = e.clientX - resizeRef.current.startX;
      const dy = e.clientY - resizeRef.current.startY;
      setSize({
        width: Math.max(360, Math.min(window.innerWidth - 40, resizeRef.current.origW + dx)),
        height: Math.max(280, Math.min(window.innerHeight - 60, resizeRef.current.origH + dy)),
      });
    }

    function onUp() {
      resizeRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [size, handleResizeStart]);

  const handleTouchResizeStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.touches[0];
    handleResizeStart(touch.clientX, touch.clientY);

    function onMove(e: TouchEvent) {
      if (!resizeRef.current) return;
      const t = e.touches[0];
      const dx = t.clientX - resizeRef.current.startX;
      const dy = t.clientY - resizeRef.current.startY;
      setSize({
        width: Math.max(360, Math.min(window.innerWidth - 40, resizeRef.current.origW + dx)),
        height: Math.max(280, Math.min(window.innerHeight - 60, resizeRef.current.origH + dy)),
      });
    }

    function onEnd() {
      resizeRef.current = null;
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    }

    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
  }, [size, handleResizeStart]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={windowRef}
      className="fixed z-[200] flex flex-col rounded-xl border border-border shadow-2xl bg-background overflow-hidden"
      style={{
        left: position.x,
        top: position.y,
        width: minimized ? 280 : size.width,
        height: minimized ? "auto" : size.height,
      }}
      data-testid="floating-browser"
    >
      {/* Title bar */}
      <div
        className="flex items-center gap-2 px-3 py-2 bg-muted/60 border-b cursor-grab active:cursor-grabbing shrink-0 select-none touch-none"
        onMouseDown={handleMouseDragStart}
        onTouchStart={handleTouchDragStart}
      >
        <GripHorizontal className="h-3 w-3 text-muted-foreground/50 shrink-0" />
        <Compass className="h-3 w-3 shrink-0" />
        <span className="text-xs font-medium flex-1">Lens</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 shrink-0"
          onClick={() => setMinimized((m) => !m)}
          data-testid="lens-minimize"
          aria-label={minimized ? "Restore" : "Minimize"}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 shrink-0 hover:text-destructive"
          onClick={closeLens}
          data-testid="lens-close"
          aria-label="Close"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {!minimized && (
        <>
          {/* Nav bar */}
          <div className="flex items-center gap-1.5 px-2 py-1.5 border-b bg-muted/30 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={goBack}
              disabled={historyIndex <= 0}
              data-testid="lens-back"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={goForward}
              disabled={historyIndex >= history.length - 1}
              data-testid="lens-forward"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={refresh}
              data-testid="lens-refresh"
            >
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </Button>

            <form
              onSubmit={(e) => { e.preventDefault(); navigate(addressInput); }}
              className="flex-1 flex items-center gap-1.5 bg-background border border-border/60 rounded-md px-2 h-7"
            >
              <Globe className="h-3 w-3 text-muted-foreground/60 shrink-0" />
              <input
                type="text"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                onFocus={(e) => e.target.select()}
                className="flex-1 bg-transparent text-xs outline-none text-foreground placeholder:text-muted-foreground/50 min-w-0"
                placeholder="Enter a URL or search..."
                data-testid="lens-address-bar"
              />
            </form>

            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => window.open(loadedUrl, "_blank", "noopener,noreferrer")}
              title="Open in new tab"
              data-testid="lens-open-external"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Iframe area */}
          <div className="flex-1 relative overflow-hidden bg-white dark:bg-white">
            {isLoading && (
              <div className="absolute top-0 left-0 right-0 h-0.5 z-10 bg-primary/20">
                <div className="h-full bg-primary animate-[progress_2s_ease-in-out_infinite]" style={{ width: "60%" }} />
              </div>
            )}

            <iframe
              key={`${loadedUrl}-${refreshKey}`}
              src={proxyUrl(loadedUrl)}
              className="w-full h-full border-none"
              sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-downloads"
              referrerPolicy="strict-origin-when-cross-origin"
              title="Lens Browser"
              onLoad={() => { setIsLoading(false); setSlowLoad(false); setLoadError(false); }}
              onError={() => { setIsLoading(false); setLoadError(true); }}
              data-testid="lens-iframe"
            />

            {(loadError || slowLoad) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm z-20 gap-3">
                <div className="text-center max-w-xs">
                  <div className="text-3xl mb-2">🔒</div>
                  <p className="text-sm font-medium">
                    {loadError ? "This page couldn't be loaded" : "This page is taking a while"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {loadError
                      ? "The site may not allow embedding, or the URL is invalid."
                      : "The site may be blocking Lens, or the server is slow."}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => window.open(loadedUrl, "_blank", "noopener,noreferrer")}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Open in browser
                  </Button>
                  {slowLoad && (
                    <Button size="sm" variant="ghost" onClick={() => setSlowLoad(false)}>
                      Keep waiting
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Resize grip */}
          <div
            className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize touch-none"
            onMouseDown={handleMouseResizeStart}
            onTouchStart={handleTouchResizeStart}
            title="Resize"
          >
            <svg viewBox="0 0 16 16" className="w-4 h-4 text-muted-foreground/30 fill-current">
              <path d="M11 11h2v2h-2zM7 11h2v2H7zM11 7h2v2h-2z" />
            </svg>
          </div>
        </>
      )}
    </div>,
    document.body
  );
}
