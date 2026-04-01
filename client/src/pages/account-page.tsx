import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
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
import { useToast } from "@/hooks/use-toast";
import { User, Loader2, ExternalLink } from "lucide-react";
import { SiX } from "react-icons/si";
import { Link } from "wouter";
import { useSounds } from "@/hooks/use-sounds";

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
