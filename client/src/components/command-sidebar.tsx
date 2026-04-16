import { Link, useLocation } from "wouter";
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
  LayoutDashboard,
  ShoppingBag,
  Users,
  ScrollText,
  Briefcase,
  ClipboardList,
  Music,
  Settings2,
  BookMarked,
  BookOpen,
  Images,
  FolderOpen,
  MessageSquare,
  UsersRound,
  DollarSign,
  Gamepad2,
  Bot,
  BarChart2,
  Newspaper,
  Folder,
  Globe,
  Zap,
} from "lucide-react";
import { usePermission } from "@/hooks/use-permission";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SevcoLogo } from "@/components/sevco-logo";

type NavItem = {
  title: string;
  url: string;
  icon: React.ElementType;
};

export function CommandSidebar() {
  const [location] = useLocation();
  const { role } = usePermission();
  const { user } = useAuth();

  const isAdmin = role === "admin";
  const isExec = role === "executive";
  const isStaff = role === "staff";

  const overviewItems: NavItem[] = [
    { title: "Overview", url: "/command", icon: LayoutDashboard },
  ];

  const contentItems: NavItem[] = [
    ...(isAdmin || isExec ? [{ title: "Store", url: "/command/store", icon: ShoppingBag }] : []),
    ...(isAdmin || isExec ? [{ title: "Music", url: "/command/music", icon: Music }] : []),
    ...(isAdmin || isExec || isStaff ? [{ title: "Wiki", url: "/command/wiki", icon: BookOpen }] : []),
    ...(isAdmin || isExec || isStaff ? [{ title: "Projects", url: "/command/projects", icon: Folder }] : []),
    ...(isAdmin ? [{ title: "News", url: "/command/news", icon: Newspaper }] : []),
    ...(isAdmin ? [{ title: "Gallery", url: "/command/gallery", icon: Images }] : []),
    ...(isAdmin ? [{ title: "Media", url: "/command/media", icon: FolderOpen }] : []),
    ...(isAdmin ? [{ title: "Resources", url: "/command/resources", icon: BookMarked }] : []),
    ...(isAdmin ? [{ title: "Minecraft", url: "/command/minecraft", icon: Gamepad2 }] : []),
  ];

  const operationsItems: NavItem[] = [
    ...(isAdmin || isExec ? [{ title: "Jobs", url: "/command/jobs", icon: ClipboardList }] : []),
    ...(isAdmin || isExec ? [{ title: "Services", url: "/command/services", icon: Briefcase }] : []),
    ...(isAdmin || isExec || isStaff ? [{ title: "Changelog", url: "/command/changelog", icon: ScrollText }] : []),
    ...(isAdmin || isExec || isStaff ? [{ title: "Support", url: "/command/support", icon: MessageSquare }] : []),
    ...(isAdmin || isExec ? [{ title: "Finance", url: "/command/finance", icon: DollarSign }] : []),
    ...(isAdmin ? [{ title: "Sparks", url: "/command/sparks", icon: Zap }] : []),
  ];

  const systemItems: NavItem[] = [
    ...(isAdmin ? [{ title: "Users", url: "/command/users", icon: Users }] : []),
    ...(isAdmin ? [{ title: "Staff", url: "/command/staff", icon: UsersRound }] : []),
    ...(isAdmin ? [{ title: "Traffic", url: "/command/traffic", icon: BarChart2 }] : []),
    ...(isAdmin || isExec ? [{ title: "Domains", url: "/command/domains", icon: Globe }] : []),
    ...(isAdmin ? [{ title: "Chat Log", url: "/command/chat-log", icon: MessageSquare }] : []),
    ...(isAdmin ? [{ title: "Agents", url: "/command/ai-agents", icon: Bot }] : []),
  ];

  const hasContentItems = contentItems.length > 0;
  const hasOperationsItems = operationsItems.length > 0;
  const hasSystemItems = systemItems.length > 0;

  function isActive(url: string) {
    if (url === "/command") {
      return location === "/command" || location === "/command/";
    }
    return location === url || location.startsWith(url + "/");
  }

  function renderItems(items: NavItem[]) {
    return items.map((item) => (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton
          asChild
          tooltip={item.title}
          data-active={isActive(item.url)}
          className="h-8 text-sm"
        >
          <Link href={item.url} data-testid={`link-command-nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
            <item.icon className="h-4 w-4" />
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));
  }

  return (
    <Sidebar collapsible="icon" className="top-12 h-[calc(100svh-3rem)] cmd-sidebar">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2">
          <SidebarTrigger data-testid="button-command-sidebar-toggle" className="-ml-0.5 shrink-0" />
          <Link href="/command" className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-2 cursor-pointer" data-testid="link-command-home-logo">
              <SevcoLogo size={28} />
              <div className="min-w-0">
                <h1 className="text-sm font-bold leading-tight truncate">
                  SEVCO CMD
                </h1>
              </div>
            </div>
          </Link>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderItems(overviewItems)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {hasContentItems && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center justify-between px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 group-data-[collapsible=icon]:hidden">
              <span>Content</span>
              <span className="font-light opacity-50">—</span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {renderItems(contentItems)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {hasOperationsItems && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center justify-between px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 group-data-[collapsible=icon]:hidden">
              <span>Operations</span>
              <span className="font-light opacity-50">—</span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {renderItems(operationsItems)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {hasSystemItems && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center justify-between px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 group-data-[collapsible=icon]:hidden">
              <span>System</span>
              <span className="font-light opacity-50">—</span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {renderItems(systemItems)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-sidebar-border gap-2">
        {user && (
          <div className="flex items-center gap-2 px-1 py-1 rounded-md group-data-[collapsible=icon]:hidden">
            <Avatar className="h-7 w-7 flex-shrink-0">
              <AvatarFallback className="text-[10px] bg-sidebar-accent text-sidebar-accent-foreground">
                {(user.displayName || user.username).slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate text-sidebar-foreground leading-none mb-0.5">
                {user.displayName || user.username}
              </p>
              <p className="text-[10px] text-muted-foreground/60 capitalize leading-none">{role}</p>
            </div>
          </div>
        )}
        {(isAdmin || isExec) && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Shader Studio"
                data-active={isActive("/command/shaders")}
                className="h-8"
              >
                <Link href="/command/shaders" data-testid="link-command-nav-shader-studio">
                  <Settings2 className="h-4 w-4" />
                  <span>Shader Studio</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Platform Settings"
                data-active={isActive("/command/settings")}
                className="h-8"
              >
                <Link href="/command/settings" data-testid="link-command-nav-platform-settings">
                  <Settings2 className="h-4 w-4" />
                  <span>Platform Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
