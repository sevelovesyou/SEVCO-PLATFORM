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
  Share2,
  Server,
  MonitorCog,
  BookMarked,
} from "lucide-react";
import { usePermission } from "@/hooks/use-permission";

import planetBlack from "@assets/SEVCO_planet_icon_black_1774331331137.png";

export function CommandSidebar() {
  const [location] = useLocation();
  const { role } = usePermission();

  const isAdmin = role === "admin";
  const isExec = role === "executive";
  const isStaff = role === "staff";

  const navItems = [
    {
      title: "Overview",
      url: "/command",
      icon: LayoutDashboard,
      show: true,
    },
    {
      title: "Store",
      url: "/command/store",
      icon: ShoppingBag,
      show: isAdmin || isExec,
    },
    {
      title: "Users",
      url: "/command/users",
      icon: Users,
      show: isAdmin,
    },
    {
      title: "Changelog",
      url: "/command/changelog",
      icon: ScrollText,
      show: isAdmin || isExec || isStaff,
    },
    {
      title: "Services",
      url: "/command/services",
      icon: Briefcase,
      show: isAdmin || isExec,
    },
    {
      title: "Jobs",
      url: "/command/jobs",
      icon: ClipboardList,
      show: isAdmin || isExec,
    },
    {
      title: "Music",
      url: "/command/music",
      icon: Music,
      show: isAdmin || isExec,
    },
    {
      title: "Social Links",
      url: "/command/social-links",
      icon: Share2,
      show: isAdmin,
    },
    {
      title: "Resources",
      url: "/command/resources",
      icon: BookMarked,
      show: isAdmin,
    },
    {
      title: "Hosting",
      url: "/command/hosting",
      icon: Server,
      show: isAdmin,
    },
    {
      title: "Display",
      url: "/command/display",
      icon: MonitorCog,
      show: isAdmin,
    },
  ].filter((item) => item.show);

  return (
    <Sidebar className="top-12 h-[calc(100svh-3rem)]">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2">
          <SidebarTrigger data-testid="button-command-sidebar-toggle" className="-ml-0.5 shrink-0" />
          <Link href="/command" className="flex-1 min-w-0">
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
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  item.url === "/command"
                    ? location === "/command" || location === "/command/"
                    : location === item.url || location.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      data-active={isActive}
                    >
                      <Link href={item.url} data-testid={`link-command-nav-${item.title.toLowerCase()}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="text-[10px] text-muted-foreground text-center">
          Command Center
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
