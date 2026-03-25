import { createContext, useContext, useState } from "react";
import type { Playlist } from "@shared/schema";

interface SpotifyPlayerContextType {
  activePlaylist: Playlist | null;
  play: (playlist: Playlist) => void;
  stop: () => void;
  toggle: (playlist: Playlist) => void;
}

const SpotifyPlayerContext = createContext<SpotifyPlayerContextType>({
  activePlaylist: null,
  play: () => {},
  stop: () => {},
  toggle: () => {},
});

export function SpotifyPlayerProvider({ children }: { children: React.ReactNode }) {
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);

  const play = (playlist: Playlist) => setActivePlaylist(playlist);
  const stop = () => setActivePlaylist(null);
  const toggle = (playlist: Playlist) => {
    setActivePlaylist((prev) => (prev?.id === playlist.id ? null : playlist));
  };

  return (
    <SpotifyPlayerContext.Provider value={{ activePlaylist, play, stop, toggle }}>
      {children}
    </SpotifyPlayerContext.Provider>
  );
}

export function useSpotifyPlayer() {
  return useContext(SpotifyPlayerContext);
}

export function getSpotifyEmbedUrl(url: string): string | null {
  const match = url.match(/open\.spotify\.com\/(playlist|album|track|artist)\/([a-zA-Z0-9]+)/);
  if (!match) return null;
  return `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0`;
}

export function isSpotifyUrl(url: string): boolean {
  return /open\.spotify\.com/.test(url);
}
