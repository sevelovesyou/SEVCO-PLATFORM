import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { User, Loader2, ExternalLink, Music, ArrowRight } from "lucide-react";
import { SiX } from "react-icons/si";
import { Link } from "wouter";
import { useSounds } from "@/hooks/use-sounds";
import type { Artist } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface SparkTransaction {
  id: number;
  type: "purchase" | "free_allocation" | "admin_credit" | "admin_debit" | "usage" | "refund";
  description: string;
  amount: number;
  createdAt: string;
}

const TRANSACTION_ICONS: Record<string, string> = {
  purchase: "🛒",
  free_allocation: "🎁",
  admin_credit: "⚙️",
  admin_debit: "⚙️",
  usage: "⚡️",
  refund: "🔄",
};

function SparksSection() {
  const { data: balanceData, isLoading: balanceLoading } = useQuery<{ balance: number }>({
    queryKey: ["/api/sparks/balance"],
    staleTime: 2 * 60 * 1000,
  });

  const { data: transactions, isLoading: txLoading } = useQuery<SparkTransaction[]>({
    queryKey: ["/api/sparks/transactions"],
    queryFn: () => apiRequest("GET", "/api/sparks/transactions?limit=5").then((r) => r.json()),
  });

  return (
    <Card data-testid="card-sparks">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          ⚡️
          Sparks
        </CardTitle>
        <CardDescription>Your creative currency balance and recent activity.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Balance display */}
        <div className="flex items-center justify-between gap-4">
          <div>
            {balanceLoading ? (
              <Skeleton className="h-12 w-24" />
            ) : (
              <p className="text-5xl font-black text-yellow-400 dark:text-yellow-400 leading-none" data-testid="text-sparks-balance">
                ⚡️ {(balanceData?.balance ?? 0).toLocaleString()}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Your Sparks balance</p>
          </div>
          <Link href="/pricing">
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0" data-testid="link-get-more-sparks">
              Get More Sparks
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <Separator />

        {/* Recent transactions */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Recent Transactions
          </p>
          {txLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3.5 w-48" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          ) : !transactions || transactions.length === 0 ? (
            <div className="text-center py-4" data-testid="text-no-transactions">
              <p className="text-sm text-muted-foreground">No transactions yet.</p>
              <Link href="/pricing">
                <span className="text-sm text-yellow-500 hover:text-yellow-400 transition-colors cursor-pointer inline-flex items-center gap-1 mt-1" data-testid="link-buy-first-pack">
                  Buy your first pack <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 py-1.5" data-testid={`row-transaction-${tx.id}`}>
                  <span className="text-lg w-8 text-center shrink-0" aria-label={tx.type}>
                    {TRANSACTION_ICONS[tx.type] ?? "⚡️"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" data-testid={`text-tx-desc-${tx.id}`}>{tx.description}</p>
                    <p className="text-xs text-muted-foreground" data-testid={`text-tx-date-${tx.id}`}>
                      {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-bold shrink-0 ${tx.amount >= 0 ? "text-green-500 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}
                    data-testid={`text-tx-amount-${tx.id}`}
                  >
                    {tx.amount >= 0 ? "+" : ""}{tx.amount.toLocaleString()}
                  </span>
                </div>
              ))}
              <div className="pt-2 border-t border-border/60">
                <Link href="/account?section=transactions">
                  <span
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer inline-flex items-center gap-1"
                    data-testid="link-view-all-transactions"
                  >
                    View all transactions <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function useLocalPrefs() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("sevco-notif-prefs") || "{}"); } catch { return {}; }
  });
  function setPref(key: string, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    localStorage.setItem("sevco-notif-prefs", JSON.stringify(next));
  }
  return [prefs, setPref] as const;
}

const profileSchema = z.object({
  displayName: z.string().max(80, "Max 80 characters").optional().or(z.literal("")),
  bio: z.string().max(500, "Max 500 characters").optional().or(z.literal("")),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function AccountPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { soundEnabled, toggleSound } = useSounds();
  const [localPrefs, setLocalPref] = useLocalPrefs();
  const [selectedArtistId, setSelectedArtistId] = useState<number | null>(user?.linkedArtistId ?? null);

  const { data: artists } = useQuery<Artist[]>({ queryKey: ["/api/music/artists"] });

  useEffect(() => {
    setSelectedArtistId(user?.linkedArtistId ?? null);
  }, [user?.linkedArtistId]);

  const linkArtistMutation = useMutation({
    mutationFn: async (linkedArtistId: number | null) => {
      const res = await apiRequest("PATCH", "/api/user", { linkedArtistId });
      return res.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      toast({ title: "Artist profile saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save artist profile", description: err.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("linked") === "1") {
      toast({ title: "X account connected successfully" });
      window.history.replaceState({}, "", "/account");
    } else if (params.get("error") === "already_linked") {
      toast({
        title: "That X account is already connected to another SEVCO account",
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/account");
    }
  }, []);

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/twitter/disconnect");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "X account disconnected" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to disconnect X account", description: err.message, variant: "destructive" });
    },
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.displayName || "",
      bio: user?.bio || "",
      email: user?.email || "",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        displayName: user.displayName || "",
        bio: user.bio || "",
        email: user.email || "",
      });
    }
  }, [user, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const res = await apiRequest("PATCH", "/api/user", data);
      return res.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      toast({ title: "Profile updated", description: "Your changes have been saved." });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update profile", description: err.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateMutation.mutate(data);
  };

  const initials = user?.username?.slice(0, 2).toUpperCase() || "?";

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Account</h1>
        </div>
        {user?.username && (
          <Link href={`/profile/${user.username}`}>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" data-testid="link-view-profile">
              <ExternalLink className="h-3.5 w-3.5" />
              View Profile
            </Button>
          </Link>
        )}
      </div>

      <SparksSection />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-xl font-semibold bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle data-testid="text-account-username">{user?.username}</CardTitle>
              <CardDescription>
                {user?.displayName
                  ? user.displayName
                  : "No display name set"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Your full name or preferred name"
                        data-testid="input-display-name"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This is shown alongside your username across the wiki.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        data-testid="input-account-email"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Used for notifications. Not displayed publicly.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell the team a bit about yourself..."
                        className="resize-none"
                        rows={4}
                        data-testid="input-bio"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Max 500 characters.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-save-profile"
                >
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Username</span>
            <span className="font-medium" data-testid="text-username-detail">{user?.username}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Account ID</span>
            <span className="font-mono text-xs text-muted-foreground" data-testid="text-account-id">{user?.id}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connected Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <SiX className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">X / Twitter</div>
              {user?.xId ? (
                <div className="mt-0.5 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40" data-testid="status-x-connected">
                      Connected
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono" data-testid="text-x-id">{user.xId}</span>
                  </div>
                  {!user?.hasPassword && (
                    <p className="text-xs text-muted-foreground">Signed in via X — your X account is your login.</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5" data-testid="status-x-not-connected">Not connected</p>
              )}
            </div>
            {user?.xId ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending || !user?.hasPassword}
                title={!user?.hasPassword ? "Cannot disconnect — this is your only login method" : undefined}
                data-testid="button-disconnect-x"
              >
                {disconnectMutation.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 motion-safe:animate-spin" />}
                Disconnect
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { window.location.href = "/api/auth/twitter/link"; }}
                data-testid="button-connect-x"
              >
                Connect X
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {(user?.role === "admin" || user?.role === "executive" || user?.role === "staff") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Music className="h-4 w-4 text-primary" />
              Artist Profile
            </CardTitle>
            <CardDescription>
              Link your account to an artist in the music catalog. When linked, track upload and music submission forms will auto-populate your artist name.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Linked Artist</p>
              <Select
                value={selectedArtistId != null ? String(selectedArtistId) : "none"}
                onValueChange={(v) => setSelectedArtistId(v === "none" ? null : Number(v))}
              >
                <SelectTrigger data-testid="select-linked-artist">
                  <SelectValue placeholder="— Not linked —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Not linked —</SelectItem>
                  {(artists ?? []).map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {user?.linkedArtistId && artists && (
                <p className="text-xs text-muted-foreground">
                  Currently linked: <span className="font-medium text-foreground">{artists.find((a) => a.id === user.linkedArtistId)?.name ?? "Unknown artist"}</span>
                </p>
              )}
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={linkArtistMutation.isPending}
                onClick={() => linkArtistMutation.mutate(selectedArtistId)}
                data-testid="button-save-linked-artist"
              >
                {linkArtistMutation.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 motion-safe:animate-spin" />}
                Save Artist Link
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notification Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Sound Notifications</p>
              <p className="text-xs text-muted-foreground">Play a chime when new notifications arrive</p>
            </div>
            <Switch
              checked={soundEnabled}
              onCheckedChange={toggleSound}
              data-testid="toggle-notification-sound"
            />
          </div>
          <Separator />
          {[
            { key: "notif_email", label: "Email notifications", desc: "When you receive new emails" },
            { key: "notif_chat", label: "Chat notifications", desc: "When you receive direct messages" },
            { key: "notif_task", label: "Task notifications", desc: "When tasks are assigned to you" },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch
                checked={localPrefs[key] !== false}
                onCheckedChange={(v) => setLocalPref(key, v)}
                data-testid={`toggle-${key}`}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
