import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { usePermission } from "@/hooks/use-permission";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, Pencil, Check, X } from "lucide-react";
import type { Role } from "@shared/schema";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const ROLES: Role[] = ["admin", "executive", "staff", "partner", "client", "user"];

const ROLE_COLORS: Record<string, string> = {
  admin:     "bg-primary/10 text-primary border-primary/20",
  executive: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  staff:     "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  partner:   "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
  client:    "bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 border-yellow-500/20",
  user:      "bg-muted text-muted-foreground border-border",
};

interface DashboardUser {
  id: string;
  username: string;
  displayName: string | null;
  email: string | null;
  role: Role;
}

interface DashboardData {
  stats: { totalArticles: number; totalRevisions: number; pendingReviews: number; totalCitations: number; totalUsers?: number };
  usersByRole?: Record<string, number>;
  users?: DashboardUser[];
}

function UserRoleSelect({
  userId,
  currentRole,
  currentUserId,
}: {
  userId: string;
  currentRole: Role;
  currentUserId: string;
}) {
  const { toast } = useToast();
  const isSelf = userId === currentUserId;

  const mutation = useMutation({
    mutationFn: (newRole: Role) =>
      apiRequest("PATCH", `/api/users/${userId}/role`, { role: newRole }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Role updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update role", variant: "destructive" });
    },
  });

  if (isSelf) {
    return (
      <Badge className={`text-xs capitalize border ${ROLE_COLORS[currentRole]}`}>
        {currentRole} (you)
      </Badge>
    );
  }

  return (
    <Select
      value={currentRole}
      onValueChange={(val) => mutation.mutate(val as Role)}
      disabled={mutation.isPending}
    >
      <SelectTrigger
        className="h-7 w-32 text-xs"
        data-testid={`select-role-${userId}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((r) => (
          <SelectItem key={r} value={r} className="text-xs capitalize">
            {r}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ChangeUsernameInline({
  userId,
  currentUsername,
}: {
  userId: string;
  currentUsername: string;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentUsername);

  const mutation = useMutation({
    mutationFn: (newUsername: string) =>
      apiRequest("PATCH", `/api/users/${userId}/username`, { username: newUsername }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Username updated" });
      setEditing(false);
    },
    onError: async (err: any) => {
      const msg = await err.response?.json().then((d: any) => d.message).catch(() => "Failed to update username");
      toast({ title: msg, variant: "destructive" });
    },
  });

  if (!editing) {
    return (
      <div className="flex items-center gap-1 group">
        <span className="font-medium text-xs">{currentUsername}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => { setValue(currentUsername); setEditing(true); }}
              data-testid={`button-edit-username-${userId}`}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit username</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-6 text-xs w-28 px-1.5"
        autoFocus
        data-testid={`input-username-${userId}`}
        onKeyDown={(e) => {
          if (e.key === "Enter") mutation.mutate(value);
          if (e.key === "Escape") setEditing(false);
        }}
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-green-600"
            onClick={() => mutation.mutate(value)}
            disabled={mutation.isPending}
            data-testid={`button-confirm-username-${userId}`}
          >
            <Check className="h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Save</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => setEditing(false)}
            data-testid={`button-cancel-username-${userId}`}
          >
            <X className="h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Cancel</TooltipContent>
      </Tooltip>
    </div>
  );
}

export default function CommandUsers() {
  const { user } = useAuth();
  const { isAdmin } = usePermission();

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });

  if (!isAdmin) {
    return (
      <Card className="p-6 text-center overflow-visible">
        <Shield className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
        <p className="text-sm text-muted-foreground">Admin access required.</p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-3 overflow-visible">
            <Skeleton className="h-4 w-3/4 mb-1" />
            <Skeleton className="h-3 w-1/2" />
          </Card>
        ))}
      </div>
    );
  }

  const users = data?.users ?? [];
  const usersByRole = data?.usersByRole;

  return (
    <div className="flex flex-col gap-6">
      {usersByRole && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Users by Role
          </h2>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((r) => (
              <div
                key={r}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${ROLE_COLORS[r]}`}
                data-testid={`role-count-${r}`}
              >
                <span className="capitalize">{r}</span>
                <span className="font-bold">{usersByRole[r] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          User Management
        </h2>
        <Card className="overflow-hidden overflow-visible">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Username</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Display Name</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Email</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors" data-testid={`row-user-${u.id}`}>
                    <td className="p-3">
                      {u.id === user?.id ? (
                        <span className="font-medium text-xs">{u.username}</span>
                      ) : (
                        <ChangeUsernameInline userId={u.id} currentUsername={u.username} />
                      )}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground hidden md:table-cell">{u.displayName || "—"}</td>
                    <td className="p-3 text-xs text-muted-foreground hidden md:table-cell">{u.email || "—"}</td>
                    <td className="p-3">
                      <UserRoleSelect userId={u.id} currentRole={u.role} currentUserId={user?.id ?? ""} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
