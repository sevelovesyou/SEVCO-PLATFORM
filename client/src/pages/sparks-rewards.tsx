import { useEffect, useMemo, useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Camera, FileText, MessageSquare, Users, Link as LinkIcon, Lock, Check, CalendarCheck2, Clock, Flame, Trophy, type LucideIcon } from "lucide-react";
import { SparkIcon } from "@/components/spark-icon";
import { PageHead } from "@/components/page-head";
import { ONBOARDING_TASKS } from "@shared/onboarding";

type RewardsSummary = {
  hasAvatar: boolean;
  hasBio: boolean;
  hasPost: boolean;
  hasFollow: boolean;
  hasSocialLink: boolean;
  hasSparkedPost: boolean;
  hasSparkedArticle: boolean;
  hasSparkedTrack: boolean;
  daily: {
    amount: number;
    claimable: boolean;
    nextAvailableAt: string | null;
    lastClaimedAt: string | null;
    streak: { current: number; longest: number };
  };
  totalEarnedFromRewards: number;
};

type ClaimResponse = {
  success?: boolean;
  amount?: number;
  balance?: number;
  totalEarnedFromRewards?: number;
  streak?: { current: number; longest: number };
  nextAvailableAt?: string | null;
  alreadyClaimed?: boolean;
};

const TASK_ICONS: Record<string, LucideIcon | "spark"> = {
  hasAvatar: Camera,
  hasBio: FileText,
  hasPost: MessageSquare,
  hasFollow: Users,
  hasSocialLink: LinkIcon,
  hasSparkedPost: "spark",
  hasSparkedArticle: "spark",
  hasSparkedTrack: "spark",
};

function useCountdown(targetIso: string | null | undefined): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!targetIso) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [targetIso]);
  if (!targetIso) return "";
  const ms = new Date(targetIso).getTime() - now;
  if (ms <= 0) return "Ready now";
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function SparksRewardsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/pricing");
    }
  }, [authLoading, user, setLocation]);

  const { data: summary, isLoading } = useQuery<RewardsSummary>({
    queryKey: ["/api/me/rewards/summary"],
    enabled: !!user,
  });

  const claimMutation = useMutation<ClaimResponse, Error>({
    mutationFn: async () => {
      const res = await fetch("/api/me/rewards/daily/claim", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as ClaimResponse & { message?: string };
      if (res.status === 409 && data.alreadyClaimed) {
        // Treat duplicate-claim as a non-error informational state.
        return data;
      }
      if (!res.ok) {
        throw new Error(data.message || res.statusText || "Claim failed");
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sparks/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/me/onboarding"] });
      queryClient.invalidateQueries({ queryKey: ["/api/me/rewards/summary"] });
      if (data.alreadyClaimed) {
        toast({
          title: "Already claimed today",
          description: "Come back tomorrow for another Daily Spark.",
        });
      } else {
        const streakDays = data.streak?.current ?? 0;
        const description =
          streakDays > 1
            ? `🔥 ${streakDays}-day streak — keep it going tomorrow!`
            : streakDays === 1
              ? "🔥 1-day streak — come back tomorrow to keep it going!"
              : "Come back tomorrow for another Daily Spark.";
        toast({
          title: `+${data.amount ?? 15} Sparks claimed!`,
          description,
        });
      }
    },
    onError: (err) => {
      toast({
        title: "Couldn't claim reward",
        description: err.message || "Try again in a moment.",
        variant: "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/me/rewards/summary"] });
    },
  });

  const countdown = useCountdown(summary?.daily.nextAvailableAt ?? null);

  const tasks = useMemo(
    () =>
      ONBOARDING_TASKS.map((t) => ({
        ...t,
        done: !!summary?.[t.key as keyof RewardsSummary],
        icon: TASK_ICONS[t.key] ?? FileText,
      })),
    [summary],
  );

  const claimedCount = tasks.filter((t) => t.done).length;
  const totalTasks = tasks.length;
  const progressPct = totalTasks > 0 ? Math.round((claimedCount / totalTasks) * 100) : 0;

  const currentStreak = summary?.daily.streak?.current ?? 0;
  const longestStreak = summary?.daily.streak?.longest ?? 0;

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="motion-safe:animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6" data-testid="sparks-rewards-page">
      <PageHead
        title="Rewards — SEVCO Sparks"
        description="Claim your daily 15-Spark reward and complete onboarding goals to grow your Sparks balance on SEVCO."
        slug="sparks-rewards"
      />
      <div className="flex items-center justify-between">
        <Link href="/sparks">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2" data-testid="link-back-to-sparks">
            <ArrowLeft className="h-4 w-4" />
            Sparks
          </Button>
        </Link>
      </div>

      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-yellow-400/15 via-amber-500/10 to-orange-500/15 p-6 md:p-8"
        data-testid="rewards-hero"
      >
        <div
          className="pointer-events-none absolute -top-12 -right-12 h-48 w-48 rounded-full bg-yellow-400/20 blur-3xl motion-safe:animate-pulse"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-amber-500/20 blur-3xl motion-safe:animate-pulse"
          aria-hidden
        />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 text-[11px] font-bold uppercase tracking-wider">
            <SparkIcon size="xs" decorative /> Rewards
          </div>
          <h1 className="mt-3 text-3xl md:text-4xl font-black tracking-tight">
            Earn more Sparks every day
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
            Complete onboarding goals once for a one-time bonus, and claim your Daily Spark every 24 hours to keep your balance growing.
          </p>

          <div className="mt-5 flex flex-wrap items-end gap-x-8 gap-y-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Sparks earned from Rewards
              </p>
              {isLoading ? (
                <Skeleton className="h-12 w-32 mt-1" />
              ) : (
                <p
                  className="text-5xl font-black text-yellow-500 dark:text-yellow-400 leading-none mt-1 flex items-center gap-1"
                  data-testid="text-rewards-total"
                >
                  <SparkIcon size="xl" decorative />
                  {(summary?.totalEarnedFromRewards ?? 0).toLocaleString()}
                </p>
              )}
            </div>
            <div className="min-w-[160px]">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Onboarding goals
              </p>
              <p className="text-sm font-semibold mt-1" data-testid="text-rewards-progress">
                {claimedCount} of {totalTasks} claimed
              </p>
              <div className="mt-1.5 h-2 w-full max-w-[200px] rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 motion-safe:transition-all motion-safe:duration-700"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Spark */}
      <Card
        className="relative overflow-hidden border-yellow-500/40 bg-gradient-to-br from-card to-yellow-500/5"
        data-testid="card-daily-reward"
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarCheck2 className="h-5 w-5 text-yellow-500" />
                Daily Spark
              </CardTitle>
              <CardDescription>
                A free 15-Spark reward, claimable once every UTC day. Don't miss a day!
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {!isLoading && currentStreak > 0 && (
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 text-xs font-bold"
                  data-testid="badge-daily-streak"
                  title={
                    longestStreak > currentStreak
                      ? `Longest streak: ${longestStreak} days`
                      : undefined
                  }
                >
                  <Flame className="h-3.5 w-3.5 motion-safe:animate-pulse" />
                  {currentStreak}-day streak
                </span>
              )}
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 text-xs font-bold">
                +{summary?.daily.amount ?? 15} <SparkIcon size="sm" decorative />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {isLoading ? (
            <Skeleton className="h-10 w-48" />
          ) : summary?.daily.claimable ? (
            <>
              <div className="text-sm space-y-1">
                <p>
                  Your <span className="font-semibold">Daily Spark</span> is ready to claim.
                </p>
                {currentStreak > 0 && (
                  <p
                    className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1"
                    data-testid="text-streak-extend-hint"
                  >
                    <Flame className="h-3 w-3" />
                    Claim today to extend your {currentStreak}-day streak.
                  </p>
                )}
              </div>
              <Button
                onClick={() => claimMutation.mutate()}
                disabled={claimMutation.isPending}
                className="bg-yellow-400 text-yellow-900 hover:bg-yellow-300 font-bold gap-2 shrink-0 motion-safe:hover:scale-[1.02] motion-safe:transition-transform"
                data-testid="button-claim-daily"
              >
                <SparkIcon size="md" decorative />
                {claimMutation.isPending ? "Claiming…" : `Claim +${summary.daily.amount} Sparks`}
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-daily-cooldown">
                <Clock className="h-4 w-4" />
                <span>
                  Come back tomorrow.{" "}
                  {countdown && (
                    <span className="font-semibold text-foreground">Next in {countdown}</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {longestStreak > currentStreak && longestStreak > 0 && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-[11px] font-semibold"
                    data-testid="text-longest-streak"
                    title="Your longest claim streak"
                  >
                    <Trophy className="h-3 w-3" /> Best: {longestStreak} days
                  </span>
                )}
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 text-xs font-bold"
                  data-testid="badge-daily-claimed"
                >
                  <Check className="h-3.5 w-3.5" /> Claimed today
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Onboarding rewards grid */}
      <div>
        <div className="flex items-end justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Onboarding Rewards
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              One-time bonuses for getting set up. Each is worth 25 Sparks.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tasks.map((task) => {
              const Icon = task.icon;
              return (
                <div
                  key={task.key}
                  className={`relative overflow-hidden rounded-xl border p-4 motion-safe:transition-all ${
                    task.done
                      ? "border-green-500/30 bg-green-500/5"
                      : "border-border bg-card hover:border-yellow-500/40 hover:bg-yellow-500/5 motion-safe:hover-elevate"
                  }`}
                  data-testid={`card-reward-${task.key}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                        task.done
                          ? "bg-green-500/20 text-green-600 dark:text-green-400"
                          : "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400"
                      }`}
                    >
                      {task.done ? (
                        <Check className="h-5 w-5" />
                      ) : Icon === "spark" ? (
                        <SparkIcon size="lg" decorative />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <span
                      className={`shrink-0 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        task.done
                          ? "bg-muted text-muted-foreground"
                          : "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400"
                      }`}
                    >
                      +{task.bonusSparks} <SparkIcon size="xs" decorative />
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold" data-testid={`text-reward-label-${task.key}`}>
                    {task.label}
                  </p>
                  <div className="mt-2">
                    {task.done ? (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400"
                        data-testid={`status-reward-${task.key}`}
                      >
                        <Check className="h-3 w-3" /> Claimed
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                        data-testid={`status-reward-${task.key}`}
                      >
                        <Lock className="h-3 w-3" /> Locked
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
