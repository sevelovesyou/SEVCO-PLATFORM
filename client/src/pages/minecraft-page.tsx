import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import type { MinecraftServer } from "@shared/schema";
import { PageHead } from "@/components/page-head";
import {
  Copy,
  Check,
  ExternalLink,
  Users,
  Wifi,
  WifiOff,
  ArrowRight,
  Sword,
  Pickaxe,
  Gamepad2,
  MessageSquare,
} from "lucide-react";

const THEME_MAP: Record<string, { color: string; accent: string }> = {
  emerald: { color: "text-emerald-400", accent: "bg-emerald-500/10" },
  green: { color: "text-green-400", accent: "bg-green-500/10" },
  blue: { color: "text-blue-400", accent: "bg-blue-500/10" },
  violet: { color: "text-blue-500", accent: "bg-blue-600/10" },
  orange: { color: "text-red-500", accent: "bg-red-700/10" },
  red: { color: "text-red-400", accent: "bg-red-500/10" },
  cyan: { color: "text-cyan-400", accent: "bg-cyan-500/10" },
};

const GAMEMODE_ICON_MAP: Record<string, React.ElementType> = {
  survival: Pickaxe,
  creative: Sword,
  minigames: Gamepad2,
  skyblock: MessageSquare,
  factions: Sword,
  prison: MessageSquare,
  hub: Gamepad2,
  other: Gamepad2,
};

interface MinecraftStatus {
  online: boolean;
  players: { online: number; max: number };
  motd?: string;
}

function ServerStatus({ host }: { host: string }) {
  const { data, isLoading } = useQuery<MinecraftStatus>({
    queryKey: ["/api/minecraft/status", host],
    queryFn: async () => {
      const res = await fetch(`/api/minecraft/status?host=${encodeURIComponent(host)}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 60000,
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2" data-testid={`status-loading-${host}`}>
        <div className="w-2 h-2 rounded-full bg-white/20 motion-safe:animate-pulse" />
        <span className="text-xs text-white/40">Checking…</span>
      </div>
    );
  }

  if (!data || !data.online) {
    return (
      <div className="flex items-center gap-2" data-testid={`status-offline-${host}`}>
        <WifiOff className="h-3.5 w-3.5 text-red-400" />
        <span className="text-xs text-red-400 font-medium">Offline</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2" data-testid={`status-online-${host}`}>
      <Wifi className="h-3.5 w-3.5 text-emerald-400" />
      <span className="text-xs text-emerald-400 font-medium">Online</span>
      <span className="text-xs text-white/40">·</span>
      <Users className="h-3 w-3 text-white/40" />
      <span className="text-xs text-white/50">{data.players.online}/{data.players.max}</span>
    </div>
  );
}

function CopyIPButton({ host }: { host: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(host);
      setCopied(true);
      toast({ description: "Server IP copied to clipboard!" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ description: "Failed to copy. Please copy manually.", variant: "destructive" });
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg px-3 py-2 transition-all group cursor-pointer"
      data-testid={`button-copy-ip-${host}`}
    >
      <code className="text-xs text-white/80 font-mono flex-1">{host}</code>
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-white/40 group-hover:text-white/70 shrink-0 transition-colors" />
      )}
    </button>
  );
}

const gameModes = [
  "Survival",
  "Creative",
  "Mini Games",
  "Active Community",
  "Discord Events",
  "Weekly Challenges",
];

export default function MinecraftPage() {
  const { data: servers = [] } = useQuery<MinecraftServer[]>({
    queryKey: ["/api/minecraft/servers"],
    staleTime: 300000,
  });

  return (
    <div className="flex flex-col min-h-full">
      <PageHead
        slug="minecraft"
        title="SEVCO Minecraft — Join Our Servers"
        description="Join SEVCO's Minecraft servers — survival, creative, mini-games, and an active community. Copy server IPs, vote, and see live status."
        ogUrl="https://sevco.us/minecraft"
      />
      {/* Hero */}
      <section
        className="relative flex flex-col items-center justify-center text-center px-4 py-28 sm:py-36 overflow-hidden bg-[#070d09]"
        data-testid="section-hero"
      >
        {/* Animated gradient blobs */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-24 -left-32 w-[600px] h-[600px] rounded-full bg-emerald-700/25 blur-[120px] motion-safe:animate-[pulse_8s_ease-in-out_infinite]" />
          <div className="absolute -bottom-24 -right-32 w-[500px] h-[500px] rounded-full bg-green-700/20 blur-[120px] motion-safe:animate-[pulse_10s_ease-in-out_infinite_2s]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] rounded-full bg-lime-700/10 blur-[100px] motion-safe:animate-[pulse_12s_ease-in-out_infinite_4s]" />
        </div>

        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-6">
            <Gamepad2 className="h-3.5 w-3.5" />
            SEVCO Minecraft
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight tracking-tight">
            Mine, Build &amp; Conquer{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-green-400 to-lime-400 bg-clip-text text-transparent">
              With the SEVCO Community
            </span>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-white/60 max-w-2xl mx-auto">
            Join our hand-crafted Minecraft servers. Survival, Creative, and more — all under one roof with
            an active community and weekly events.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="#servers">
              <Button
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 h-11 text-sm rounded-lg"
                data-testid="button-hero-join"
              >
                Join a Server
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
            <a href="https://discord.gg/sevco" target="_blank" rel="noopener noreferrer">
              <Button
                variant="ghost"
                size="lg"
                className="text-white/70 hover:text-white hover:bg-white/10 border border-white/10 px-8 h-11 text-sm rounded-lg"
                data-testid="button-hero-discord"
              >
                Join Discord
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Game mode pills */}
      <section
        className="bg-[#0a1209] border-y border-white/5 px-4 py-5"
        data-testid="section-game-modes"
      >
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-2">
          {gameModes.map((mode) => (
            <div
              key={mode}
              className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-3 py-1.5"
              data-testid={`pill-${mode.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-xs font-medium text-emerald-300">{mode}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Server cards */}
      <section
        id="servers"
        className="bg-[#070d09] px-4 py-20"
        data-testid="section-servers"
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Our Servers</h2>
            <p className="mt-3 text-sm text-white/50 max-w-xl mx-auto">
              Each server has a unique flavour. Pick the one that suits your play style, or join them all.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {servers.map((server) => {
              const theme = THEME_MAP[server.colorTheme] ?? THEME_MAP.emerald;
              const IconComponent = GAMEMODE_ICON_MAP[server.gameMode ?? "other"] ?? Gamepad2;
              const voteLinks = (server.voteLinks as { name: string; url: string }[]) ?? [];
              return (
              <div
                key={server.id}
                className="relative rounded-2xl border border-white/8 bg-white/[0.025] p-6 hover:bg-white/[0.05] transition-colors flex flex-col gap-5"
                data-testid={`card-server-${server.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${theme.accent} shrink-0`}>
                      <IconComponent className={`h-5 w-5 ${theme.color}`} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white leading-none">{server.name}</h3>
                      <p className="text-xs text-white/50 mt-1 leading-relaxed">{server.description}</p>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-1.5">Status</p>
                  <ServerStatus host={server.host} />
                </div>

                {/* IP */}
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-1.5">Server IP</p>
                  <CopyIPButton host={server.host} />
                </div>

                {/* Vote links */}
                {voteLinks.length > 0 && (
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-2">Vote</p>
                  <div className="flex flex-wrap gap-2">
                    {voteLinks.map((link) => (
                      <a
                        key={link.name}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid={`link-vote-${server.name.toLowerCase().replace(/\s+/g, "-")}-${link.name.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px] border-white/10 text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20"
                        >
                          Vote on {link.name}
                          <ExternalLink className="ml-1.5 h-3 w-3" />
                        </Button>
                      </a>
                    ))}
                  </div>
                </div>
                )}
              </div>
            );
          })}
          </div>
        </div>
      </section>

      {/* Community section */}
      <section
        className="bg-[#0a1209] border-t border-white/5 px-4 py-20"
        data-testid="section-community"
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">A Thriving Community</h2>
          <p className="mt-5 text-sm sm:text-base text-white/55 leading-relaxed">
            SEVCO Minecraft is more than just a server — it's a community. We run regular events, build
            competitions, and seasonal challenges that bring players together. Join our Discord to stay up to
            date, coordinate with other players, and get help from staff.
          </p>
          <p className="mt-4 text-sm sm:text-base text-white/55 leading-relaxed">
            All servers are hosted on enterprise-grade hardware with DDoS protection and automatic backups
            so your builds are always safe and the experience is always smooth.
          </p>
        </div>
      </section>

      {/* Bottom CTA */}
      <section
        className="bg-gradient-to-br from-emerald-900/40 via-[#070d09] to-green-900/40 border-t border-white/5 px-4 py-24 text-center"
        data-testid="section-cta"
      >
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Ready to play?</h2>
          <p className="mt-4 text-sm sm:text-base text-white/55">
            Copy a server IP above and log in with Minecraft Java or Bedrock Edition. Join our Discord to
            connect with the community.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="#servers">
              <Button
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-10 h-12 text-sm rounded-xl"
                data-testid="button-cta-join"
              >
                View Servers
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
            <a href="https://discord.gg/sevco" target="_blank" rel="noopener noreferrer">
              <Button
                variant="outline"
                size="lg"
                className="border-white/15 text-white/70 hover:text-white hover:bg-white/10 text-sm h-12 px-10 rounded-xl"
                data-testid="button-cta-discord"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Join Discord
              </Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
