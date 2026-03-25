import { Button } from "@/components/ui/button";
import { ExternalLink, X } from "lucide-react";
import { SiSpotify } from "react-icons/si";
import { useSpotifyPlayer, getSpotifyEmbedUrl } from "@/hooks/use-spotify-player";

export function SpotifyPlayerBar() {
  const { activePlaylist, stop } = useSpotifyPlayer();

  if (!activePlaylist) return null;

  const embedUrl = getSpotifyEmbedUrl(activePlaylist.playlistUrl);
  if (!embedUrl) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-2xl"
      data-testid="spotify-player-bar"
    >
      <div className="max-w-5xl mx-auto px-4 py-3">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <SiSpotify className="h-4 w-4 text-[#1DB954] shrink-0" />
            <p className="text-sm font-semibold truncate">{activePlaylist.title}</p>
          </div>
          <a
            href={activePlaylist.playlistUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 shrink-0"
            data-testid="link-open-spotify"
          >
            <ExternalLink className="h-3 w-3" />
            Open in Spotify
          </a>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={stop}
            data-testid="button-close-player"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <iframe
          src={embedUrl}
          width="100%"
          height="152"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="rounded-xl"
          data-testid="iframe-spotify-player"
        />
      </div>
    </div>
  );
}
