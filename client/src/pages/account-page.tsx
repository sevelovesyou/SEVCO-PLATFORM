import { useEffect } from "react";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { User, Loader2, ExternalLink } from "lucide-react";
import { Link } from "wouter";

const profileSchema = z.object({
  displayName: z.string().max(80, "Max 80 characters").optional().or(z.literal("")),
  bio: z.string().max(500, "Max 500 characters").optional().or(z.literal("")),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function AccountPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: (user as any)?.displayName || "",
      bio: (user as any)?.bio || "",
      email: (user as any)?.email || "",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        displayName: (user as any).displayName || "",
        bio: (user as any).bio || "",
        email: (user as any).email || "",
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
                {(user as any)?.displayName
                  ? (user as any).displayName
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
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
    </div>
  );
}
