import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { usePermission } from "@/hooks/use-permission";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, Plus, Pencil, Trash2, ChevronUp, ChevronDown, User } from "lucide-react";
import { Link } from "wouter";
import type { Role } from "@shared/schema";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type StaffUserWithNode = {
  id: string;
  username: string;
  displayName: string | null;
  email: string | null;
  role: Role;
  avatarUrl: string | null;
  orgNode: OrgNode | null;
};

type OrgNode = {
  id: number;
  userId: string | null;
  title: string;
  department: string;
  parentId: number | null;
  sortOrder: number;
  createdAt: string;
};

const ROLE_COLORS: Record<string, string> = {
  admin:     "bg-primary/10 text-primary border-primary/20",
  executive: "bg-blue-600/10 text-blue-700 dark:text-blue-400 border-blue-600/20",
  staff:     "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  partner:   "bg-red-700/10 text-red-800 dark:text-red-500 border-red-700/20",
};

const DEPT_COLORS: Record<string, string> = {
  Engineering:  "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  Creative:     "bg-blue-600/10 text-blue-700 dark:text-blue-400 border-blue-600/20",
  Operations:   "bg-red-700/10 text-red-800 dark:text-red-500 border-red-700/20",
  Design:       "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20",
  Marketing:    "bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 border-yellow-500/20",
  Finance:      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  Records:      "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  Leadership:   "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",
};

function getDeptColor(dept: string) {
  return DEPT_COLORS[dept] ?? "bg-muted text-muted-foreground border-border";
}

function getInitials(name: string | null, username: string) {
  if (name) return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
  return username.slice(0, 2).toUpperCase();
}

type OrgNodeFormData = {
  userId: string;
  title: string;
  department: string;
  parentId: string;
};

function OrgNodeDialog({
  open,
  onClose,
  staffUsers,
  orgNodes,
  editingNode,
  prefillUserId,
}: {
  open: boolean;
  onClose: () => void;
  staffUsers: StaffUserWithNode[];
  orgNodes: OrgNode[];
  editingNode: OrgNode | null;
  prefillUserId?: string;
}) {
  const { toast } = useToast();
  const isEdit = !!editingNode;

  const defaultUserId = prefillUserId ?? editingNode?.userId ?? "";
  const [form, setForm] = useState<OrgNodeFormData>({
    userId: defaultUserId,
    title: editingNode?.title ?? "",
    department: editingNode?.department ?? "",
    parentId: editingNode?.parentId?.toString() ?? "",
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest("POST", "/api/staff/org", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff/org"] });
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({ title: "Org node created" });
      onClose();
    },
    onError: () => toast({ title: "Failed to create node", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest("PATCH", `/api/staff/org/${editingNode!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff/org"] });
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({ title: "Org node updated" });
      onClose();
    },
    onError: () => toast({ title: "Failed to update node", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/staff/org/${editingNode!.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff/org"] });
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({ title: "Org node removed" });
      onClose();
    },
    onError: () => toast({ title: "Failed to remove node", variant: "destructive" }),
  });

  function handleSubmit() {
    const payload: Record<string, unknown> = {
      title: form.title,
      department: form.department,
      parentId: form.parentId ? parseInt(form.parentId) : null,
    };
    if (form.userId) payload.userId = form.userId;
    else payload.userId = null;

    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const availableParents = orgNodes.filter((n) => !editingNode || n.id !== editingNode.id);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Org Node" : "Add to Org Chart"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>User (optional)</Label>
            <Select value={form.userId} onValueChange={(v) => setForm((f) => ({ ...f, userId: v === "__none__" ? "" : v }))}>
              <SelectTrigger data-testid="select-org-user">
                <SelectValue placeholder="Select a staff member..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— No user (placeholder) —</SelectItem>
                {staffUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.displayName ?? u.username} ({u.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Job Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Creative Director"
              data-testid="input-org-title"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Department *</Label>
            <Input
              value={form.department}
              onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
              placeholder="e.g. Engineering"
              data-testid="input-org-department"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Reports to (parent node)</Label>
            <Select value={form.parentId} onValueChange={(v) => setForm((f) => ({ ...f, parentId: v === "__none__" ? "" : v }))}>
              <SelectTrigger data-testid="select-org-parent">
                <SelectValue placeholder="— Root (no parent) —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Root (no parent) —</SelectItem>
                {availableParents.map((n) => (
                  <SelectItem key={n.id} value={n.id.toString()}>
                    {n.title} ({n.department})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2 flex-wrap">
          {isEdit && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteMutation.mutate()}
              disabled={isPending}
              data-testid="button-org-delete"
            >
              <Trash2 className="h-4 w-4 mr-1" /> Remove from Chart
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={isPending || !form.title.trim() || !form.department.trim()}
              data-testid="button-org-save"
            >
              {isEdit ? "Save Changes" : "Add to Chart"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OrgNodeCard({
  node,
  staffUsers,
  onEdit,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  node: OrgNode;
  staffUsers: StaffUserWithNode[];
  onEdit: (node: OrgNode) => void;
  onMoveUp: (node: OrgNode) => void;
  onMoveDown: (node: OrgNode) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const user = node.userId ? staffUsers.find((u) => u.id === node.userId) : null;
  const displayName = user ? (user.displayName ?? user.username) : "Unfilled Role";

  return (
    <div className="flex flex-col items-center" data-testid={`card-org-node-${node.id}`}>
      <Card className="w-44 p-3 flex flex-col items-center gap-2 border shadow-sm hover:shadow-md transition-shadow cursor-pointer group relative"
        onClick={() => onEdit(node)}>
        <Avatar className="h-12 w-12">
          {user?.avatarUrl && <AvatarImage src={user.avatarUrl} />}
          <AvatarFallback className="text-sm">
            {user ? getInitials(user.displayName, user.username) : <User className="h-5 w-5 text-muted-foreground" />}
          </AvatarFallback>
        </Avatar>
        <div className="text-center min-w-0 w-full">
          <div className="text-xs font-semibold truncate">{displayName}</div>
          <div className="text-[10px] text-muted-foreground truncate">{node.title}</div>
          <Badge className={`mt-1 text-[9px] px-1.5 py-0 border ${getDeptColor(node.department)}`}>
            {node.department}
          </Badge>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
                aria-label="Edit"
              className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); onEdit(node); }}
              data-testid={`button-org-edit-${node.id}`}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit</TooltipContent>
        </Tooltip>
      </Card>
      <div className="flex gap-1 mt-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onMoveUp(node)} disabled={isFirst} data-testid={`button-org-up-${node.id}`} aria-label="Move up">
              <ChevronUp className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Move up</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onMoveDown(node)} disabled={isLast} data-testid={`button-org-down-${node.id}`} aria-label="Move down">
              <ChevronDown className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Move down</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

function buildTree(nodes: OrgNode[]): Map<number | null, OrgNode[]> {
  const map = new Map<number | null, OrgNode[]>();
  for (const node of nodes) {
    const key = node.parentId ?? null;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(node);
  }
  return map;
}

function OrgTree({
  parentId,
  treeMap,
  staffUsers,
  onEdit,
  onMoveUp,
  onMoveDown,
  depth,
}: {
  parentId: number | null;
  treeMap: Map<number | null, OrgNode[]>;
  staffUsers: StaffUserWithNode[];
  onEdit: (node: OrgNode) => void;
  onMoveUp: (node: OrgNode) => void;
  onMoveDown: (node: OrgNode) => void;
  depth: number;
}) {
  const children = treeMap.get(parentId) ?? [];
  if (children.length === 0) return null;

  return (
    <div className={`flex flex-col items-center gap-0 ${depth > 0 ? "pt-0" : ""}`}>
      {depth > 0 && (
        <div className="w-px h-6 bg-border" />
      )}
      <div className="relative flex gap-6 justify-center">
        {children.length > 1 && (
          <div className="absolute top-0 left-[calc(50%-1px/2)] right-0 h-px bg-border"
            style={{ left: "calc(50% - " + ((children.length - 1) * 0.5 * 188) + "px)", right: "calc(50% - " + ((children.length - 1) * 0.5 * 188) + "px)" }}
          />
        )}
        {children.map((node, idx) => (
          <div key={node.id} className="flex flex-col items-center">
            <OrgNodeCard
              node={node}
              staffUsers={staffUsers}
              onEdit={onEdit}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              isFirst={idx === 0}
              isLast={idx === children.length - 1}
            />
            <OrgTree
              parentId={node.id}
              treeMap={treeMap}
              staffUsers={staffUsers}
              onEdit={onEdit}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              depth={depth + 1}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function DirectoryTab() {
  const { role } = usePermission();
  const isAdmin = role === "admin";

  const { data: staffUsers, isLoading } = useQuery<StaffUserWithNode[]>({
    queryKey: ["/api/staff"],
  });

  const [addOrgOpen, setAddOrgOpen] = useState(false);
  const [addOrgUserId, setAddOrgUserId] = useState<string>("");
  const { data: orgNodes = [] } = useQuery<OrgNode[]>({
    queryKey: ["/api/staff/org"],
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  const users = staffUsers ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{users.length} staff member{users.length !== 1 ? "s" : ""}</p>
        {isAdmin && (
          <Button asChild size="sm" variant="outline" data-testid="button-invite-staff">
            <Link href="/command/users">
              <UserPlus className="h-4 w-4 mr-1" /> Invite
            </Link>
          </Button>
        )}
      </div>

      <div className="rounded-lg border overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 border-b">
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-8"></th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Name</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Role</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Email</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Title</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Department</th>
              {isAdmin && <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Org Chart</th>}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors" data-testid={`row-staff-${user.id}`}>
                <td className="px-4 py-3">
                  <Avatar className="h-8 w-8">
                    {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                    <AvatarFallback className="text-xs">
                      {getInitials(user.displayName, user.username)}
                    </AvatarFallback>
                  </Avatar>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{user.displayName ?? user.username}</div>
                  <div className="text-xs text-muted-foreground">@{user.username}</div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <Badge className={`text-xs capitalize border ${ROLE_COLORS[user.role] ?? "bg-muted text-muted-foreground"}`}>
                    {user.role}
                  </Badge>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
                  {user.email ?? "—"}
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs">
                  {user.orgNode?.title ?? <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  {user.orgNode?.department ? (
                    <Badge className={`text-xs border ${getDeptColor(user.orgNode.department)}`}>
                      {user.orgNode.department}
                    </Badge>
                  ) : <span className="text-muted-foreground text-xs">—</span>}
                </td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    {user.orgNode ? (
                      <Badge className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 border">
                        In chart
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        data-testid={`button-add-org-${user.id}`}
                        onClick={() => {
                          setAddOrgUserId(user.id);
                          setAddOrgOpen(true);
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add to Chart
                      </Button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {addOrgOpen && (
        <OrgNodeDialog
          open={addOrgOpen}
          onClose={() => { setAddOrgOpen(false); setAddOrgUserId(""); }}
          staffUsers={users}
          orgNodes={orgNodes}
          editingNode={null}
          prefillUserId={addOrgUserId}
        />
      )}
    </div>
  );
}

function OrgChartTab() {
  const { role } = usePermission();
  const isAdmin = role === "admin";

  const { data: orgNodes = [], isLoading: nodesLoading } = useQuery<OrgNode[]>({
    queryKey: ["/api/staff/org"],
  });
  const { data: staffUsers = [] } = useQuery<StaffUserWithNode[]>({
    queryKey: ["/api/staff"],
  });

  const [addOpen, setAddOpen] = useState(false);
  const [editNode, setEditNode] = useState<OrgNode | null>(null);

  const sortMutation = useMutation({
    mutationFn: ({ id, sortOrder }: { id: number; sortOrder: number }) =>
      apiRequest("PATCH", `/api/staff/org/${id}`, { sortOrder }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/staff/org"] }),
  });

  function handleMoveUp(node: OrgNode) {
    const siblings = orgNodes
      .filter((n) => (n.parentId ?? null) === (node.parentId ?? null))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = siblings.findIndex((n) => n.id === node.id);
    if (idx <= 0) return;
    const prev = siblings[idx - 1];
    sortMutation.mutate({ id: node.id, sortOrder: prev.sortOrder });
    sortMutation.mutate({ id: prev.id, sortOrder: node.sortOrder });
  }

  function handleMoveDown(node: OrgNode) {
    const siblings = orgNodes
      .filter((n) => (n.parentId ?? null) === (node.parentId ?? null))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = siblings.findIndex((n) => n.id === node.id);
    if (idx >= siblings.length - 1) return;
    const next = siblings[idx + 1];
    sortMutation.mutate({ id: node.id, sortOrder: next.sortOrder });
    sortMutation.mutate({ id: next.id, sortOrder: node.sortOrder });
  }

  const treeMap = buildTree(orgNodes);

  if (nodesLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const hasNodes = orgNodes.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {orgNodes.length} node{orgNodes.length !== 1 ? "s" : ""} in chart
        </p>
        {isAdmin && (
          <Button size="sm" onClick={() => setAddOpen(true)} data-testid="button-add-org-node">
            <Plus className="h-4 w-4 mr-1" /> Add Node
          </Button>
        )}
      </div>

      {!hasNodes ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border rounded-lg bg-muted/20">
          <div className="text-muted-foreground text-sm mb-3">No org chart nodes yet.</div>
          {isAdmin && (
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add First Node
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto pb-6">
          <div className="min-w-max pt-4">
            <OrgTree
              parentId={null}
              treeMap={treeMap}
              staffUsers={staffUsers}
              onEdit={(node) => setEditNode(node)}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              depth={0}
            />
          </div>
        </div>
      )}

      {addOpen && (
        <OrgNodeDialog
          open={addOpen}
          onClose={() => setAddOpen(false)}
          staffUsers={staffUsers}
          orgNodes={orgNodes}
          editingNode={null}
        />
      )}

      {editNode && (
        <OrgNodeDialog
          open={true}
          onClose={() => setEditNode(null)}
          staffUsers={staffUsers}
          orgNodes={orgNodes}
          editingNode={editNode}
        />
      )}
    </div>
  );
}

export default function CommandStaff() {
  const [tab, setTab] = useState<"directory" | "org-chart">("directory");

  return (
    <div className="space-y-6">
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        <button
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === "directory" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setTab("directory")}
          data-testid="tab-directory"
        >
          Directory
        </button>
        <button
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === "org-chart" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setTab("org-chart")}
          data-testid="tab-org-chart"
        >
          Org Chart
        </button>
      </div>

      {tab === "directory" ? <DirectoryTab /> : <OrgChartTab />}
    </div>
  );
}
