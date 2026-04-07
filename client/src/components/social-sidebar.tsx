import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Rss,
  User,
  Settings,
  Check,
  Camera,
  FileText,
  MessageSquare,
  Users,
  Link as LinkIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveImageUrl } from "@/lib/resolve-image-url";
import { Skeleton } from "@/components/ui/skeleton";
import { SevcoLogo } from "@/components/sevco-logo";

type OnboardingProgress = {
  hasAvatar: boolean;
  hasBio: boolean;
  hasPost: boolean;
  hasFollow: boolean;
  hasSocialLink: boolean;
};

type ProfileData = {
  followerCount?: number;
  followingCount?: number;
};

export function SocialSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const { data: profile } = useQuery<ProfileData>({
    queryKey: [`/api/users/${user?.username}/profile`],
    queryFn: async () => {
      const res = await fetch(`/api/users/${user!.username}/profile`);
      return res.json();
    },
    enabled: !!user?.username,
  });

  const { data: onboarding, isLoading: onboardingLoading } = useQuery<OnboardingProgress>({
    queryKey: ["/api/me/onboarding"],
    enabled: !!user,
  });

  const navItems = [
    { title: "Feed", url: "/feed", icon: Rss },
    { title: "Profile", url: user?.username ? `/profile/${user.username}` : "/profile", icon: User },
    { title: "Account", url: "/account", icon: Settings },
  ];

  const onboardingTasks = [
    { key: "hasAvatar", label: "Add a profile photo", icon: Camera, done: onboarding?.hasAvatar ?? false },
    { key: "hasBio", label: "Write a bio", icon: FileText, done: onboarding?.hasBio ?? false },
    { key: "hasPost", label: "Make your first post", icon: MessageSquare, done: onboarding?.hasPost ?? false },
    { key: "hasFollow", label: "Follow someone", icon: Users, done: onboarding?.hasFollow ?? false },
    { key: "hasSocialLink", label: "Connect a social link", icon: LinkIcon, done: onboarding?.hasSocialLink ?? false },
  ];

  function isActive(url: string) {
    if (url === "/feed") return location === "/feed";
    return location === url || location.startsWith(url + "/");
  }

  const initials = user ? (user.displayName || user.username).slice(0, 2).toUpperCase() : "?";

  return (
    <Sidebar collapsible="icon" className="top-12 h-[calc(100svh-3rem)] social-sidebar">
      <SidebarHeader className="p-3 pt-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger data-testid="button-social-sidebar-toggle" className="-ml-0.5 shrink-0" />
          <Link href="/feed" className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden overflow-hidden">
            <div className="flex items-center gap-2 cursor-pointer" data-testid="link-social-home-logo">
              <SevcoLogo size={28} />
              <div className="min-w-0">
                <h1 className="text-sm font-bold leading-tight truncate">Social</h1>
              </div>
            </div>
          </Link>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {user && (
          <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarGroupContent>
              <Link href={`/profile/${user.username}`}>
                <div
                  className="flex items-center gap-3 px-2 py-3 rounded-lg hover:bg-muted/60 transition-colors cursor-pointer"
                  data-testid="link-social-sidebar-profile"
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    {user.avatarUrl && <AvatarImage src={resolveImageUrl(user.avatarUrl)} />}
                    <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate leading-none mb-0.5" data-testid="text-social-sidebar-name">
                      {user.displayName || user.username}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-muted-foreground" data-testid="text-social-sidebar-followers">
                        <span className="font-semibold text-foreground">{profile?.followerCount ?? 0}</span> followers
                      </span>
                      <span className="text-[11px] text-muted-foreground" data-testid="text-social-sidebar-following">
                        <span className="font-semibold text-foreground">{profile?.followingCount ?? 0}</span> following
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    data-active={isActive(item.url)}
                  >
                    <Link href={item.url} data-testid={`link-social-nav-${item.title.toLowerCase()}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user && (
          <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel>Onboarding</SidebarGroupLabel>
            <SidebarGroupContent>
              {onboardingLoading ? (
                <div className="px-2 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-5 w-full" />
                  ))}
                </div>
              ) : (
                <div className="px-2 space-y-1.5">
                  {onboardingTasks.map((task) => (
                    <div
                      key={task.key}
                      className={`flex items-center gap-2 py-1 text-xs transition-colors ${task.done ? "text-muted-foreground line-through" : "text-foreground"}`}
                      data-testid={`onboarding-task-${task.key}`}
                    >
                      <div className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 ${task.done ? "bg-green-500/20 text-green-600" : "bg-muted"}`}>
                        {task.done ? <Check className="h-2.5 w-2.5" /> : <task.icon className="h-2.5 w-2.5 text-muted-foreground" />}
                      </div>
                      <span>{task.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="text-[10px] text-muted-foreground text-center group-data-[collapsible=icon]:hidden">
          SEVCO Social
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
