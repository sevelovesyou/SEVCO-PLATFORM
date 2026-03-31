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
  Folder,
} from "lucide-react";
import { usePermission } from "@/hooks/use-permission";

import { SevcoLogo } from "@/components/sevco-logo";

type NavItem = {
  title: string;
  url: string;
  icon: React.ElementType;
};

type NavSubGroup = {
  label: string;
  items: NavItem[];
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

  const contentTopItems: NavItem[] = [
    ...(isAdmin || isExec ? [{ title: "Store", url: "/command/store", icon: ShoppingBag }] : []),
    ...(isAdmin || isExec ? [{ title: "Music", url: "/command/music", icon: Music }] : []),
    ...(isAdmin || isExec || isStaff ? [{ title: "Projects", url: "/command/projects", icon: Folder }] : []),
  ];

  const contentSubGroups: NavSubGroup[] = [
    {
      label: "Publishing",
      items: [
        ...(isAdmin ? [{ title: "News", url: "/command/news", icon: Newspaper }] : []),
        ...(isAdmin ? [{ title: "Gallery", url: "/command/gallery", icon: Images }] : []),
        ...(isAdmin ? [{ title: "Media", url: "/command/media", icon: FolderOpen }] : []),
      ].filter(Boolean),
    },
    {
      label: "Other",
      items: [
        ...(isAdmin ? [{ title: "Resources", url: "/command/resources", icon: BookMarked }] : []),
        ...(isAdmin ? [{ title: "Minecraft", url: "/command/minecraft", icon: Gamepad2 }] : []),
      ].filter(Boolean),
    },
  ].filter((g) => g.items.length > 0);

  const operationsTopItems: NavItem[] = [
    ...(isAdmin || isExec ? [{ title: "Jobs", url: "/command/jobs", icon: ClipboardList }] : []),
    ...(isAdmin || isExec ? [{ title: "Services", url: "/command/services", icon: Briefcase }] : []),
    ...(isAdmin || isExec || isStaff ? [{ title: "Changelog", url: "/command/changelog", icon: ScrollText }] : []),
  ];

  const operationsSubGroups: NavSubGroup[] = [
    {
      label: "Support & Finance",
      items: [
        ...(isAdmin || isExec || isStaff ? [{ title: "Support", url: "/command/support", icon: MessageSquare }] : []),
        ...(isAdmin || isExec ? [{ title: "Finance", url: "/command/finance", icon: DollarSign }] : []),
      ].filter(Boolean),
    },
  ].filter((g) => g.items.length > 0);

  const hasContentItems = contentTopItems.length > 0 || contentSubGroups.length > 0;
  const hasOperationsItems = operationsTopItems.length > 0 || operationsSubGroups.length > 0;

  const systemTopItems: NavItem[] = [
    ...(isAdmin ? [{ title: "Users", url: "/command/users", icon: Users }] : []),
    ...(isAdmin ? [{ title: "Staff", url: "/command/staff", icon: UsersRound }] : []),
    ...(isAdmin ? [{ title: "Traffic", url: "/command/traffic", icon: BarChart2 }] : []),
  ];

  const systemSubGroups: NavSubGroup[] = [
    {
      label: "Monitoring",
      items: [
        ...(isAdmin ? [{ title: "Chat Log", url: "/command/chat-log", icon: MessageSquare }] : []),
        ...(isAdmin ? [{ title: "Agents", url: "/command/ai-agents", icon: Bot }] : []),
      ].filter(Boolean),
    },
  ].filter((g) => g.items.length > 0);

  const hasSystemItems = systemTopItems.length > 0 || systemSubGroups.length > 0;

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

  function renderSubGroups(subGroups: NavSubGroup[]) {
    return subGroups.map((group) => (
      <li key={group.label} className="list-none">
        <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider group-data-[collapsible=icon]:hidden">
          {group.label}
        </div>
        <ul className="flex w-full min-w-0 flex-col gap-1">
          {renderItems(group.items)}
        </ul>
      </li>
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
            <SidebarGroupLabel>Content</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {renderItems(contentTopItems)}
                {renderSubGroups(contentSubGroups)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {hasOperationsItems && (
          <SidebarGroup>
            <SidebarGroupLabel>Operations</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {renderItems(operationsTopItems)}
                {renderSubGroups(operationsSubGroups)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {hasSystemItems && (
          <SidebarGroup>
            <SidebarGroupLabel>System</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {renderItems(systemTopItems)}
                {renderSubGroups(systemSubGroups)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border">
        {(isAdmin || isExec) && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Platform Settings"
                data-active={isActive("/command/settings")}
              >
                <Link href="/command/settings" data-testid="link-command-nav-platform-settings">
                  <Settings2 className="h-4 w-4" />
                  <span>Platform Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
        <div className="text-[10px] text-muted-foreground text-center pt-1 group-data-[collapsible=icon]:hidden">
          Command Center
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
