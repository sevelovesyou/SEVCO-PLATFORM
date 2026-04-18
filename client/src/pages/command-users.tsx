import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Shield, Pencil, Check, X, Trash2, SquarePen, UserPlus } from "lucide-react";
import { adminCreateUserSchema, type AdminCreateUser, type Role } from "@shared/schema";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const ROLES: Role[] = ["admin", "executive", "staff", "partner", "client", "user"];

const ROLE_COLORS: Record<string, string> = {
  admin:     "bg-primary/10 text-primary border-primary/20",
  executive: "bg-blue-600/10 text-blue-700 dark:text-blue-400 border-blue-600/20",
  staff:     "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  partner:   "bg-red-700/10 text-red-800 dark:text-red-500 border-red-700/20",
  client:    "bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 border-yellow-500/20",
  user:      "bg-muted text-muted-foreground border-border",
};

interface DashboardUser {
  id: string;
  username: string;
  displayName: string | null;
  email: string | null;
  role: Role;
  linkedArtistId: number | null;
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
    onError: (err: any) => {
      const msg = err instanceof Error ? err.message : "Failed to update username";
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
              aria-label="Edit"
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
            aria-label="Confirm"
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
            aria-label="Cancel"
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

function EditUserDialog({
  user,
  open,
  onClose,
}: {
  user: DashboardUser;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [username, setUsername] = useState(user.username);
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [email, setEmail] = useState(user.email ?? "");
  const [linkedArtistId, setLinkedArtistId] = useState<string>(
    user.linkedArtistId != null ? String(user.linkedArtistId) : "none",
  );

  const { data: artists } = useQuery<Array<{ id: number; name: string; slug: string; linkedUsername: string | null }>>({
    queryKey: ["/api/music/artists"],
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", `/api/users/${user.id}/profile`, {
        username,
        displayName,
        email,
        linkedArtistId: linkedArtistId === "none" ? null : Number(linkedArtistId),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "User profile updated" });
      onClose();
    },
    onError: (err: any) => {
      const msg = err instanceof Error ? err.message : "Failed to update user";
      toast({ title: msg, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent data-testid="dialog-edit-user">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-username">Username</Label>
            <Input
              id="edit-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              data-testid="input-edit-username"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-displayname">Display Name</Label>
            <Input
              id="edit-displayname"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              data-testid="input-edit-displayname"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="input-edit-email"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Linked artist profile</Label>
            <Select value={linkedArtistId} onValueChange={setLinkedArtistId}>
              <SelectTrigger data-testid="select-linked-artist">
                <SelectValue placeholder="Not linked" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not linked</SelectItem>
                {(artists ?? [])
                  .filter((a) => !a.linkedUsername || a.id === user.linkedArtistId)
                  .map((a) => (
                    <SelectItem key={a.id} value={String(a.id)} data-testid={`option-artist-${a.id}`}>
                      {a.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Linking shows this user's profile as the artist's public page.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} data-testid="button-save-edit-user">
            {mutation.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddUserDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();

  const form = useForm<AdminCreateUser>({
    resolver: zodResolver(adminCreateUserSchema),
    defaultValues: {
      username: "",
      displayName: "",
      email: "",
      password: "",
      role: "user",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: AdminCreateUser) =>
      apiRequest("POST", "/api/users", values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "User created successfully" });
      form.reset();
      onClose();
    },
    onError: (err: any) => {
      const msg = err instanceof Error ? err.message : "Failed to create user";
      toast({ title: msg, variant: "destructive" });
    },
  });

  function handleClose() {
    if (!mutation.isPending) {
      form.reset();
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent data-testid="dialog-add-user">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="flex flex-col gap-4 py-2">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. johndoe" data-testid="input-add-username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. John Doe" data-testid="input-add-displayname" {...field} />
                  </FormControl>
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
                    <Input type="email" placeholder="e.g. john@example.com" data-testid="input-add-email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Min. 6 characters" data-testid="input-add-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger data-testid="select-add-role">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r} className="capitalize">
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="mt-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={mutation.isPending}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                data-testid="button-submit-add-user"
              >
                {mutation.isPending ? "Creating…" : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

type DeleteStep = "first" | "second";

function DeleteUserDialog({
  user,
  open,
  onClose,
}: {
  user: DashboardUser;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState<DeleteStep>("first");
  const [confirmInput, setConfirmInput] = useState("");

  const mutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/users/${user.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "User deleted" });
      onClose();
    },
    onError: (err: any) => {
      const msg = err instanceof Error ? err.message : "Failed to delete user";
      toast({ title: msg, variant: "destructive" });
    },
  });

  function handleClose() {
    setStep("first");
    setConfirmInput("");
    onClose();
  }

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <AlertDialogContent data-testid={`dialog-delete-user-${user.id}`}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {user.username}?</AlertDialogTitle>
          <AlertDialogDescription>
            {step === "first"
              ? "This cannot be undone. All their data will be removed."
              : `Type "${user.username}" to confirm deletion.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {step === "second" && (
          <div className="py-2">
            <Input
              placeholder={user.username}
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              data-testid="input-confirm-delete-username"
              autoFocus
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose}>Cancel</AlertDialogCancel>
          {step === "first" ? (
            <AlertDialogAction
              onClick={() => setStep("second")}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Continue
            </AlertDialogAction>
          ) : (
            <Button
              variant="destructive"
              onClick={() => mutation.mutate()}
              disabled={confirmInput !== user.username || mutation.isPending}
              data-testid="button-confirm-delete-user"
            >
              {mutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function CommandUsers() {
  const { user } = useAuth();
  const { isAdmin } = usePermission();

  const [editUser, setEditUser] = useState<DashboardUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<DashboardUser | null>(null);
  const [addUserOpen, setAddUserOpen] = useState(false);

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
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            User Management
          </h2>
          <Button
            size="sm"
            onClick={() => setAddUserOpen(true)}
            data-testid="button-add-user"
            className="gap-1.5"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add User
          </Button>
        </div>
        <Card className="overflow-hidden overflow-visible">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Username</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Display Name</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Email</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Role</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Actions</th>
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
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              aria-label="Edit user"
                              onClick={() => setEditUser(u)}
                              data-testid={`button-edit-user-${u.id}`}
                            >
                              <SquarePen className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit profile</TooltipContent>
                        </Tooltip>
                        {u.id !== user?.id && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                aria-label="Delete user"
                                onClick={() => setDeleteUser(u)}
                                data-testid={`button-delete-user-${u.id}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete user</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {editUser && (
        <EditUserDialog
          user={editUser}
          open={true}
          onClose={() => setEditUser(null)}
        />
      )}

      {deleteUser && (
        <DeleteUserDialog
          user={deleteUser}
          open={true}
          onClose={() => setDeleteUser(null)}
        />
      )}

      <AddUserDialog
        open={addUserOpen}
        onClose={() => setAddUserOpen(false)}
      />
    </div>
  );
}
