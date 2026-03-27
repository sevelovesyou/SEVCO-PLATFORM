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
  Images,
  FolderOpen,
  MessageSquare,
  UsersRound,
  DollarSign,
  Gamepad2,
  Bot,
  BarChart2,
  Newspaper,
} from "lucide-react";
import { usePermission } from "@/hooks/use-permission";

import planetBlack from "@assets/SEVCO_planet_icon_black_1774331331137.png";

type NavItem = {
  title: string;
  url: string;
  icon: React.ElementType;
};

export function CommandSidebar() {
  const [location] = useLocation();
  const { role } = usePermission();

  const isAdmin = role === "admin";
  const isExec = role === "executive";
  const isStaff = role === "staff";

  const overviewItems: NavItem[] = [
    { title: "Overview", url: "/command", icon: LayoutDashboard },
  ];

  const contentItems: NavItem[] = [
    ...(isAdmin || isExec ? [{ title: "Store", url: "/command/store", icon: ShoppingBag }] : []),
    ...(isAdmin || isExec ? [{ title: "Music", url: "/command/music", icon: Music }] : []),
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
  ];

  const systemItems: NavItem[] = [
    ...(isAdmin ? [{ title: "Users", url: "/command/users", icon: Users }] : []),
    ...(isAdmin ? [{ title: "Staff", url: "/command/staff", icon: UsersRound }] : []),
    ...(isAdmin ? [{ title: "Chat Log", url: "/command/chat-log", icon: MessageSquare }] : []),
    ...(isAdmin ? [{ title: "AI Agents", url: "/command/ai-agents", icon: Bot }] : []),
    ...(isAdmin ? [{ title: "Traffic", url: "/command/traffic", icon: BarChart2 }] : []),
    ...(isAdmin ? [{ title: "Settings", url: "/command/settings", icon: Settings2 }] : []),
  ];

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
    <Sidebar collapsible="icon" className="top-12 h-[calc(100svh-3rem)]">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2">
          <SidebarTrigger data-testid="button-command-sidebar-toggle" className="-ml-0.5 shrink-0" />
          <Link href="/command" className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-2 cursor-pointer" data-testid="link-command-home-logo">
              <div className="h-7 w-7 flex items-center justify-center shrink-0">
                <img src={planetBlack} alt="SEVCO Planet" className="h-full w-full object-contain dark:invert" />
              </div>
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

        {contentItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Content</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {renderItems(contentItems)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {operationsItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Operations</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {renderItems(operationsItems)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {systemItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>System</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {renderItems(systemItems)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="text-[10px] text-muted-foreground text-center group-data-[collapsible=icon]:hidden">
          Command Center
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
