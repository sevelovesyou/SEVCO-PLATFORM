import { useState, useRef, useEffect, type ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { usePermission } from "@/hooks/use-permission";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CheckSquare,
  Plus,
  Pin,
  PinOff,
  Trash2,
  ChevronDown,
  ChevronRight,
  Calendar,
  Flag,
  Users,
  Folder,
  Loader2,
  ClipboardList,
  CircleCheck,
} from "lucide-react";
import type { UserTask, StaffTask, Project } from "@shared/schema";

type StaffUserInfo = { id: string; username: string; displayName: string | null; role: string; avatarUrl: string | null };

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  low:    { label: "Low",    color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  normal: { label: "Normal", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  high:   { label: "High",   color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
  urgent: { label: "Urgent", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
};

function PriorityBadge({ priority }: { priority: string }) {
  const config = PRIORITY_LABELS[priority] ?? PRIORITY_LABELS.normal;
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${config.color}`}>
      {config.label}
    </span>
  );
}

function isToday(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const today = new Date().toISOString().slice(0, 10);
  return dateStr === today;
}

function isUpcoming(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return dateStr > new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-");
  return `${m}/${d}/${y}`;
}

// ─── My Tasks Panel ──────────────────────────────────────────────────────────

interface TaskItemProps {
  task: UserTask;
  onToggle: (id: number, completed: boolean) => void;
  onPin: (id: number, pinned: boolean) => void;
  onDelete: (id: number) => void;
}

function TaskItem({ task, onToggle, onPin, onDelete }: TaskItemProps) {
  return (
    <div
      className={`flex items-start gap-2.5 px-3 py-2 rounded-lg border group transition-colors ${
        task.completed
          ? "bg-muted/30 border-border/40 opacity-60"
          : "bg-card border-border hover:border-border/80"
      }`}
      data-testid={`task-item-${task.id}`}
    >
      <Checkbox
        checked={task.completed}
        onCheckedChange={(checked) => onToggle(task.id, !!checked)}
        className="mt-0.5 shrink-0"
        data-testid={`checkbox-task-${task.id}`}
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-snug ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {task.priority !== "normal" && <PriorityBadge priority={task.priority} />}
          {task.dueDate && (
            <span className={`text-[11px] flex items-center gap-1 ${isToday(task.dueDate) ? "text-orange-600 dark:text-orange-400 font-medium" : "text-muted-foreground"}`}>
              <Calendar className="h-3 w-3" />
              {isToday(task.dueDate) ? "Today" : formatDate(task.dueDate)}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => onPin(task.id, !task.pinned)}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          data-testid={`button-pin-task-${task.id}`}
          title={task.pinned ? "Unpin" : "Pin"}
        >
          {task.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-red-500 transition-colors"
          data-testid={`button-delete-task-${task.id}`}
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function TaskGroup({
  label,
  tasks,
  defaultOpen = true,
  onToggle,
  onPin,
  onDelete,
  labelClassName,
}: {
  label: string;
  tasks: UserTask[];
  defaultOpen?: boolean;
  onToggle: (id: number, completed: boolean) => void;
  onPin: (id: number, pinned: boolean) => void;
  onDelete: (id: number) => void;
  labelClassName?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (tasks.length === 0) return null;
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1.5 w-full text-left py-1 mb-1" data-testid={`collapsible-${label.toLowerCase().replace(/\s+/g, "-")}`}>
        {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        <span className={`text-xs font-semibold uppercase tracking-wide ${labelClassName ?? "text-muted-foreground"}`}>{label}</span>
        <span className="text-xs text-muted-foreground ml-1">({tasks.length})</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col gap-1.5">
          {tasks.map((t) => (
            <TaskItem key={t.id} task={t} onToggle={onToggle} onPin={onPin} onDelete={onDelete} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function MyTasksPanel() {
  const { toast } = useToast();
  const [quickTitle, setQuickTitle] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState("normal");
  const [newDue, setNewDue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: tasks = [], isLoading } = useQuery<UserTask[]>({
    queryKey: ["/api/tasks"],
  });

  const createMutation = useMutation({
    mutationFn: (data: { title: string; description?: string; priority?: string; dueDate?: string; pinned?: boolean }) =>
      apiRequest("POST", "/api/tasks", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/tasks"] }); },
    onError: () => toast({ title: "Failed to create task", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<UserTask> }) =>
      apiRequest("PATCH", `/api/tasks/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/tasks"] }); },
    onError: () => toast({ title: "Failed to update task", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/tasks/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/tasks"] }); },
    onError: () => toast({ title: "Failed to delete task", variant: "destructive" }),
  });

  const handleQuickAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && quickTitle.trim()) {
      createMutation.mutate({ title: quickTitle.trim() });
      setQuickTitle("");
    }
  };

  const handleAddSubmit = () => {
    if (!newTitle.trim()) return;
    createMutation.mutate({
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      priority: newPriority,
      dueDate: newDue || undefined,
    });
    setAddOpen(false);
    setNewTitle(""); setNewDesc(""); setNewPriority("normal"); setNewDue("");
  };

  const pinned = tasks.filter((t) => t.pinned && !t.completed);
  const todayDue = tasks.filter((t) => !t.pinned && !t.completed && isToday(t.dueDate));
  const overdue = tasks.filter((t) => !t.pinned && !t.completed && !!t.dueDate && !isToday(t.dueDate) && !isUpcoming(t.dueDate));
  const upcoming = tasks.filter((t) => !t.pinned && !t.completed && isUpcoming(t.dueDate) && !isToday(t.dueDate));
  const other = tasks.filter((t) => !t.pinned && !t.completed && !t.dueDate);
  const completed = tasks.filter((t) => t.completed);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold flex items-center gap-1.5">
          <ClipboardList className="h-4 w-4" />
          My Tasks
        </h2>
        <span className="text-xs text-muted-foreground ml-auto">{tasks.filter((t) => !t.completed).length} active</span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          onClick={() => setAddOpen(true)}
          data-testid="button-add-task"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>

      <div className="flex gap-2 mb-3">
        <Input
          ref={inputRef}
          placeholder="Quick add — press Enter"
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          onKeyDown={handleQuickAdd}
          className="h-8 text-sm"
          data-testid="input-quick-add-task"
        />
        {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin shrink-0 mt-2 text-muted-foreground" />}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-center py-10 text-muted-foreground">
          <CircleCheck className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-sm">No tasks yet</p>
          <p className="text-xs mt-0.5">Type above or click Add to get started</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 overflow-y-auto flex-1 pr-1">
          <TaskGroup label="Pinned" tasks={pinned} onToggle={(id, c) => updateMutation.mutate({ id, data: { completed: c } })} onPin={(id, p) => updateMutation.mutate({ id, data: { pinned: p } })} onDelete={(id) => deleteMutation.mutate(id)} />
          <TaskGroup label="Overdue" tasks={overdue} onToggle={(id, c) => updateMutation.mutate({ id, data: { completed: c } })} onPin={(id, p) => updateMutation.mutate({ id, data: { pinned: p } })} onDelete={(id) => deleteMutation.mutate(id)} labelClassName="text-red-600 dark:text-red-400" />
          <TaskGroup label="Due Today" tasks={todayDue} onToggle={(id, c) => updateMutation.mutate({ id, data: { completed: c } })} onPin={(id, p) => updateMutation.mutate({ id, data: { pinned: p } })} onDelete={(id) => deleteMutation.mutate(id)} />
          <TaskGroup label="Upcoming" tasks={upcoming} onToggle={(id, c) => updateMutation.mutate({ id, data: { completed: c } })} onPin={(id, p) => updateMutation.mutate({ id, data: { pinned: p } })} onDelete={(id) => deleteMutation.mutate(id)} />
          <TaskGroup label="Tasks" tasks={other} defaultOpen={true} onToggle={(id, c) => updateMutation.mutate({ id, data: { completed: c } })} onPin={(id, p) => updateMutation.mutate({ id, data: { pinned: p } })} onDelete={(id) => deleteMutation.mutate(id)} />
          <TaskGroup label="Completed" tasks={completed} defaultOpen={false} onToggle={(id, c) => updateMutation.mutate({ id, data: { completed: c } })} onPin={(id, p) => updateMutation.mutate({ id, data: { pinned: p } })} onDelete={(id) => deleteMutation.mutate(id)} />
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-add-task">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Input
              placeholder="Task title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddSubmit()}
              data-testid="input-task-title"
              autoFocus
            />
            <Textarea
              placeholder="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              rows={2}
              data-testid="input-task-description"
            />
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
                <Select value={newPriority} onValueChange={setNewPriority}>
                  <SelectTrigger className="h-8 text-xs" data-testid="select-task-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Due Date</label>
                <Input
                  type="date"
                  value={newDue}
                  onChange={(e) => setNewDue(e.target.value)}
                  className="h-8 text-xs"
                  data-testid="input-task-due-date"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} data-testid="button-cancel-task">Cancel</Button>
            <Button onClick={handleAddSubmit} disabled={!newTitle.trim() || createMutation.isPending} data-testid="button-submit-task">
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Add Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Staff Tasks Panel ────────────────────────────────────────────────────────

interface StaffTaskCardProps {
  task: StaffTask;
  projects: Project[];
  staffUsers: StaffUserInfo[];
  currentUserId: string;
  onToggle: (id: number, completed: boolean) => void;
  onDelete: (id: number) => void;
}

function StaffTaskCard({ task, projects, staffUsers, currentUserId, onToggle, onDelete }: StaffTaskCardProps) {
  const project = projects.find((p) => p.id === task.projectId);
  const assignee = staffUsers.find((u) => u.id === task.assigneeId);
  const assigneeName = assignee ? (assignee.displayName || assignee.username) : null;
  const assigneeInitial = assigneeName ? assigneeName[0].toUpperCase() : null;

  return (
    <div
      className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border group transition-colors ${
        task.completed
          ? "bg-muted/30 border-border/40 opacity-60"
          : "bg-card border-border hover:border-border/80"
      }`}
      data-testid={`staff-task-card-${task.id}`}
    >
      <Checkbox
        checked={task.completed}
        onCheckedChange={(checked) => onToggle(task.id, !!checked)}
        className="mt-0.5 shrink-0"
        data-testid={`checkbox-staff-task-${task.id}`}
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-snug ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {task.priority !== "normal" && <PriorityBadge priority={task.priority} />}
          {project && (
            <span className="text-[11px] flex items-center gap-1 text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full" data-testid={`badge-project-${task.id}`}>
              <Folder className="h-3 w-3" />
              {project.name}
            </span>
          )}
          {assignee && (
            <span className="text-[11px] flex items-center gap-1 text-muted-foreground" data-testid={`badge-assignee-${task.id}`}>
              {assignee.avatarUrl ? (
                <img src={assignee.avatarUrl} alt={assigneeName ?? ""} className="h-4 w-4 rounded-full object-cover shrink-0" />
              ) : (
                <span className="h-4 w-4 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground shrink-0">
                  {assigneeInitial}
                </span>
              )}
              {assigneeName}
              {assignee.id === currentUserId && " (me)"}
            </span>
          )}
          {task.dueDate && (
            <span className={`text-[11px] flex items-center gap-1 ${isToday(task.dueDate) ? "text-orange-600 dark:text-orange-400 font-medium" : "text-muted-foreground"}`}>
              <Calendar className="h-3 w-3" />
              {isToday(task.dueDate) ? "Today" : formatDate(task.dueDate)}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => onDelete(task.id)}
        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
        data-testid={`button-delete-staff-task-${task.id}`}
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function StaffTasksPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [filterProject, setFilterProject] = useState<string>("all");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState("normal");
  const [newDue, setNewDue] = useState("");
  const [newAssignee, setNewAssignee] = useState("none");
  const [newProject, setNewProject] = useState("none");

  const { data: tasks = [], isLoading } = useQuery<StaffTask[]>({
    queryKey: ["/api/tasks/staff"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: staffMembers = [] } = useQuery<StaffUserInfo[]>({
    queryKey: ["/api/staff"],
  });

  const staffUsers = staffMembers;

  const createMutation = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/tasks/staff", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/tasks/staff"] }); },
    onError: () => toast({ title: "Failed to create staff task", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) =>
      apiRequest("PATCH", `/api/tasks/staff/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/tasks/staff"] }); },
    onError: () => toast({ title: "Failed to update task", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/tasks/staff/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/tasks/staff"] }); },
    onError: () => toast({ title: "Failed to delete task", variant: "destructive" }),
  });

  const handleAddSubmit = () => {
    if (!newTitle.trim()) return;
    createMutation.mutate({
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      priority: newPriority,
      dueDate: newDue || undefined,
      assigneeId: newAssignee !== "none" ? newAssignee : undefined,
      projectId: newProject !== "none" ? parseInt(newProject) : undefined,
    });
    setAddOpen(false);
    setNewTitle(""); setNewDesc(""); setNewPriority("normal"); setNewDue(""); setNewAssignee("none"); setNewProject("none");
  };

  const filteredTasks = filterProject === "all"
    ? tasks
    : filterProject === "unassigned-project"
    ? tasks.filter((t) => !t.projectId)
    : tasks.filter((t) => t.projectId === parseInt(filterProject));

  const mine = filteredTasks.filter((t) => !t.completed && t.assigneeId === user?.id);
  const unassigned = filteredTasks.filter((t) => !t.completed && !t.assigneeId);
  const others = filteredTasks.filter((t) => !t.completed && t.assigneeId && t.assigneeId !== user?.id);
  const completedTasks = filteredTasks.filter((t) => t.completed);

  const [viewMode, setViewMode] = useState<"assignee" | "project">("assignee");
  const [mineOpen, setMineOpen] = useState(true);
  const [unassignedOpen, setUnassignedOpen] = useState(true);
  const [othersOpen, setOthersOpen] = useState(true);
  const [completedOpen, setCompletedOpen] = useState(false);

  const renderGroup = (
    label: string,
    items: StaffTask[],
    open: boolean,
    setOpen: (v: boolean) => void,
  ) => {
    if (items.length === 0) return null;
    return (
      <Collapsible open={open} onOpenChange={setOpen} key={label}>
        <CollapsibleTrigger className="flex items-center gap-1.5 w-full text-left py-1 mb-1" data-testid={`collapsible-staff-${label.toLowerCase().replace(/\s+/g, "-")}`}>
          {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
          <span className="text-xs text-muted-foreground ml-1">({items.length})</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex flex-col gap-1.5">
            {items.map((t) => (
              <StaffTaskCard
                key={t.id}
                task={t}
                projects={projects}
                staffUsers={staffUsers}
                currentUserId={user?.id ?? ""}
                onToggle={(id, c) => updateMutation.mutate({ id, data: { completed: c } })}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const activeTasks = filteredTasks.filter((t) => !t.completed);

  const renderByProject = () => {
    const projectGroups = new Map<string, StaffTask[]>();
    const noProjectKey = "__no_project__";
    for (const t of activeTasks) {
      const key = t.projectId ? String(t.projectId) : noProjectKey;
      if (!projectGroups.has(key)) projectGroups.set(key, []);
      projectGroups.get(key)!.push(t);
    }

    const entries: ReactNode[] = [];
    for (const [key, items] of projectGroups.entries()) {
      const proj = key === noProjectKey ? null : projects.find((p) => String(p.id) === key);
      const label = proj ? proj.name : "No Project";
      entries.push(
        <div key={key} className="mb-3">
          <div className="flex items-center gap-1.5 py-1 mb-1">
            <Folder className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
            <span className="text-xs text-muted-foreground ml-1">({items.length})</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {items.map((t) => (
              <StaffTaskCard
                key={t.id}
                task={t}
                projects={projects}
                staffUsers={staffUsers}
                currentUserId={user?.id ?? ""}
                onToggle={(id, c) => updateMutation.mutate({ id, data: { completed: c } })}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))}
          </div>
        </div>
      );
    }
    if (completedTasks.length > 0) {
      entries.push(
        <div key="completed">
          {renderGroup("Completed", completedTasks, completedOpen, setCompletedOpen)}
        </div>
      );
    }
    return entries;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold flex items-center gap-1.5">
          <Users className="h-4 w-4" />
          Staff Tasks
        </h2>
        <span className="text-xs text-muted-foreground ml-auto">{tasks.filter((t) => !t.completed).length} active</span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          onClick={() => setAddOpen(true)}
          data-testid="button-add-staff-task"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>

      <div className="flex gap-2 mb-3">
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="h-8 text-xs flex-1" data-testid="select-filter-project">
            <SelectValue placeholder="Filter by project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            <SelectItem value="unassigned-project">No Project</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex rounded-md border border-border overflow-hidden shrink-0" data-testid="toggle-view-mode">
          <button
            onClick={() => setViewMode("assignee")}
            className={`px-2.5 py-1.5 text-xs transition-colors ${viewMode === "assignee" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`}
            data-testid="button-view-assignee"
            title="Group by assignee"
          >
            <Users className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewMode("project")}
            className={`px-2.5 py-1.5 text-xs transition-colors ${viewMode === "project" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`}
            data-testid="button-view-project"
            title="Group by project"
          >
            <Folder className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      ) : filteredTasks.filter((t) => !t.completed).length === 0 && completedTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-center py-10 text-muted-foreground">
          <CircleCheck className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-sm">No staff tasks yet</p>
          <p className="text-xs mt-0.5">Click Add to create a shared task</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 overflow-y-auto flex-1 pr-1">
          {viewMode === "assignee" ? (
            <>
              {renderGroup("Assigned to Me", mine, mineOpen, setMineOpen)}
              {renderGroup("Unassigned", unassigned, unassignedOpen, setUnassignedOpen)}
              {renderGroup("Assigned to Others", others, othersOpen, setOthersOpen)}
              {renderGroup("Completed", completedTasks, completedOpen, setCompletedOpen)}
            </>
          ) : (
            renderByProject()
          )}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-add-staff-task">
          <DialogHeader>
            <DialogTitle>Add Staff Task</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Input
              placeholder="Task title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddSubmit()}
              data-testid="input-staff-task-title"
              autoFocus
            />
            <Textarea
              placeholder="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              rows={2}
              data-testid="input-staff-task-description"
            />
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
                <Select value={newPriority} onValueChange={setNewPriority}>
                  <SelectTrigger className="h-8 text-xs" data-testid="select-staff-task-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Due Date</label>
                <Input
                  type="date"
                  value={newDue}
                  onChange={(e) => setNewDue(e.target.value)}
                  className="h-8 text-xs"
                  data-testid="input-staff-task-due-date"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Assignee</label>
                <Select value={newAssignee} onValueChange={setNewAssignee}>
                  <SelectTrigger className="h-8 text-xs" data-testid="select-staff-task-assignee">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {staffUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.displayName || u.username}
                        {u.id === user?.id ? " (me)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Project</label>
                <Select value={newProject} onValueChange={setNewProject}>
                  <SelectTrigger className="h-8 text-xs" data-testid="select-staff-task-project">
                    <SelectValue placeholder="No project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Project</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} data-testid="button-cancel-staff-task">Cancel</Button>
            <Button onClick={handleAddSubmit} disabled={!newTitle.trim() || createMutation.isPending} data-testid="button-submit-staff-task">
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Add Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Page Layout ──────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { user } = useAuth();
  const { role } = usePermission();
  const isStaffPlus = ["admin", "executive", "staff"].includes(role ?? "");

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        <p>Please sign in to access Tasks.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl" data-testid="page-tasks">
      <div className="mb-5 flex items-center gap-2">
        <CheckSquare className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold">Tasks</h1>
      </div>

      <div className={`grid gap-6 ${isStaffPlus ? "md:grid-cols-2" : "grid-cols-1 max-w-xl"}`}>
        <div className="bg-background rounded-xl border border-border p-4 min-h-[500px] flex flex-col" data-testid="panel-my-tasks">
          <MyTasksPanel />
        </div>

        {isStaffPlus && (
          <div className="bg-background rounded-xl border border-border p-4 min-h-[500px] flex flex-col" data-testid="panel-staff-tasks">
            <StaffTasksPanel />
          </div>
        )}
      </div>
    </div>
  );
}
