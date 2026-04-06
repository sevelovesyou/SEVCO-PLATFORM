import { useRef, useCallback } from "react";
import { resolveImageUrl } from "@/lib/resolve-image-url";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { Button } from "@/components/ui/button";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Minus, X, Music, GripHorizontal,
} from "lucide-react";

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function FloatingMusicPlayer() {
  const {
    currentTrack, queue, isPlaying, isOpen, minimized, position, size,
    currentTime, duration, volume,
    pause, resume, nextTrack, prevTrack, seek, setVolume,
    setPosition, setSize, minimize, restore, close,
  } = useMusicPlayer();

  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

  const handleMouseDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: position.x, origY: position.y };

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
  }, [position, size, setPosition]);

  const handleMouseResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: size.width, origH: size.height };

    function onMove(e: MouseEvent) {
      if (!resizeRef.current) return;
      const dx = e.clientX - resizeRef.current.startX;
      const dy = e.clientY - resizeRef.current.startY;
      setSize({
        width: Math.max(320, Math.min(600, resizeRef.current.origW + dx)),
        height: Math.max(280, Math.min(400, resizeRef.current.origH + dy)),
      });
    }

    function onUp() {
      resizeRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [size, setSize]);

  if (!isOpen || !currentTrack) {
    return null;
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (minimized) {
    return (
      <div
        className="fixed z-50 bottom-4 right-4 flex items-center gap-2.5 px-3 py-2 rounded-full border border-border bg-background shadow-2xl cursor-pointer select-none"
        onClick={restore}
        data-testid="music-player-pill"
      >
        {currentTrack.coverImageUrl ? (
          <img
            src={resolveImageUrl(currentTrack.coverImageUrl)}
            alt={currentTrack.title}
            className="w-7 h-7 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Music className="h-3.5 w-3.5 text-primary" />
          </div>
        )}
        <div className="flex flex-col min-w-0 max-w-[140px]">
          <span className="text-xs font-semibold truncate">{currentTrack.title}</span>
          <span className="text-[10px] text-muted-foreground truncate">{currentTrack.artistName}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={(e) => { e.stopPropagation(); isPlaying ? pause() : resume(); }}
          data-testid="music-pill-play-pause"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </Button>
      </div>
    );
  }

  return (
    <div
      className="fixed z-50 flex flex-col rounded-xl border border-border shadow-2xl bg-background overflow-hidden"
      style={{ left: position.x, top: position.y, width: size.width, height: size.height }}
      data-testid="floating-music-player"
    >
      <div
        className="flex items-center gap-2 px-3 py-2 bg-muted/60 border-b cursor-grab active:cursor-grabbing shrink-0 select-none"
        onMouseDown={handleMouseDragStart}
      >
        <GripHorizontal className="h-3 w-3 text-muted-foreground/50 shrink-0" />
        <Music className="h-3 w-3 shrink-0 text-primary" />
        <span className="text-xs font-medium truncate flex-1">Now Playing</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 shrink-0"
          onClick={minimize}
          data-testid="music-player-minimize"
          aria-label="Minimize"
        >
          <Minus className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 shrink-0 hover:text-destructive"
          onClick={close}
          data-testid="music-player-close"
          aria-label="Close"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="w-full aspect-square overflow-hidden shrink-0 bg-black">
          {currentTrack.coverImageUrl ? (
            <img
              src={resolveImageUrl(currentTrack.coverImageUrl)}
              alt={currentTrack.title}
              className="w-full h-full object-contain"
              data-testid="music-player-cover"
            />
          ) : (
            <div className="w-full h-full bg-primary/10 flex items-center justify-center">
              <Music className="h-12 w-12 text-primary/50" />
            </div>
          )}
        </div>

        <div className="flex flex-col flex-1 min-h-0 p-3 gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" data-testid="music-player-title">{currentTrack.title}</p>
            <p className="text-xs text-muted-foreground truncate" data-testid="music-player-artist">{currentTrack.artistName}</p>
            {currentTrack.albumName && (
              <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">{currentTrack.albumName}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground w-8 shrink-0">{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.5}
                value={currentTime}
                onChange={(e) => seek(parseFloat(e.target.value))}
                className="flex-1 h-1 accent-primary cursor-pointer"
                data-testid="music-player-scrubber"
                aria-label="Seek"
              />
              <span className="text-[10px] text-muted-foreground w-8 text-right shrink-0">{formatTime(duration)}</span>
            </div>

            <div className="flex items-center justify-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={prevTrack}
                data-testid="music-player-prev"
                aria-label="Previous"
              >
                <SkipBack className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={isPlaying ? pause : resume}
                data-testid="music-player-play-pause"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={nextTrack}
                disabled={queue.length === 0}
                data-testid="music-player-next"
                aria-label="Next"
              >
                <SkipForward className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 shrink-0"
                onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
                aria-label={volume === 0 ? "Unmute" : "Mute"}
              >
                {volume === 0 ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
              </Button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="flex-1 h-1 accent-primary cursor-pointer"
                data-testid="music-player-volume"
                aria-label="Volume"
              />
            </div>
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        onMouseDown={handleMouseResizeStart}
        data-testid="music-player-resize-handle"
        aria-label="Resize"
        style={{
          backgroundImage: "radial-gradient(circle, hsl(var(--muted-foreground)/0.3) 1px, transparent 1px)",
          backgroundSize: "3px 3px",
          backgroundPosition: "bottom right",
        }}
      />
    </div>
  );
}
