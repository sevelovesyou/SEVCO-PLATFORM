import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Palette, Music, Bot, Sparkles, Eye, Trophy } from "lucide-react";

const SPARK_USES = [
  { icon: Palette, label: "AI Art Generation", description: "Generate images, album art, and visual concepts on demand." },
  { icon: Music, label: "Music Tools", description: "Access premium beat-making and mastering features." },
  { icon: Bot, label: "Advanced AI Chat", description: "Extended sessions with Grok, Claude, and GPT-4o." },
  { icon: Eye, label: "Visibility Boosts", description: "Pin posts, feature your profile, and amplify your reach." },
  { icon: Sparkles, label: "Creative Features", description: "Unlock advanced platform capabilities as they launch." },
];

export default function SparksPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: balanceData, isLoading: balanceLoading } = useQuery<{ balance: number }>({
    queryKey: ["/api/sparks/balance"],
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/pricing");
    }
  }, [authLoading, user, setLocation]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="motion-safe:animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6" data-testid="sparks-page">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚡️</span>
          <h1 className="text-xl font-bold">Sparks</h1>
        </div>
        <Link href="/sparks/leaderboard">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" data-testid="link-sparks-leaderboard">
            <Trophy className="h-3.5 w-3.5 text-yellow-500" />
            Leaderboard
          </Button>
        </Link>
      </div>

      <Card data-testid="card-sparks-balance">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            ⚡️
            Your Balance
          </CardTitle>
          <CardDescription>
            Sparks are the SEVCO platform currency. Use them to access AI tools, creative features, and visibility boosts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              {balanceLoading ? (
                <Skeleton className="h-12 w-28" />
              ) : (
                <p
                  className="text-5xl font-black text-yellow-400 leading-none"
                  data-testid="text-sparks-balance"
                >
                  ⚡️ {(balanceData?.balance ?? 0).toLocaleString()}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">Your Sparks balance</p>
            </div>
            <Link href="/pricing">
              <Button
                className="bg-yellow-400 text-yellow-900 hover:bg-yellow-300 font-bold gap-2 shrink-0"
                data-testid="button-buy-more-sparks"
              >
                ⚡️
                Buy More Sparks
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          What can you do with Sparks?
        </h2>
        <div className="flex flex-col gap-3">
          {SPARK_USES.map(({ icon: Icon, label, description }) => (
            <div
              key={label}
              className="flex items-start gap-4 rounded-xl border border-border bg-card p-4"
              data-testid={`card-spark-use-${label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div className="shrink-0 h-9 w-9 rounded-lg bg-yellow-400/10 flex items-center justify-center">
                <Icon className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm font-semibold">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-border rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/30">
        <div>
          <p className="text-sm font-semibold">Ready to top up?</p>
          <p className="text-xs text-muted-foreground mt-0.5">Sparks never expire. Buy exactly what you need.</p>
        </div>
        <Link href="/pricing">
          <Button variant="outline" className="gap-1.5 shrink-0" data-testid="link-view-pricing">
            View pricing
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
