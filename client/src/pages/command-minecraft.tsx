import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Server, ExternalLink } from "lucide-react";
import type { MinecraftServer } from "@shared/schema";
import { CommandPageLayout } from "./command-page";

const COLOR_THEMES = ["emerald", "green", "blue", "violet", "orange", "red", "cyan"];

const GAME_MODES = ["survival", "creative", "minigames", "skyblock", "factions", "prison", "hub", "other"];

type ServerFormData = {
  name: string;
  host: string;
  description: string;
  gameMode: string;
  colorTheme: string;
  voteLinks: { name: string; url: string }[];
  isActive: boolean;
  displayOrder: number;
};

const defaultForm = (): ServerFormData => ({
  name: "",
  host: "",
  description: "",
  gameMode: "survival",
  colorTheme: "emerald",
  voteLinks: [],
  isActive: true,
  displayOrder: 0,
});

export default function CommandMinecraft() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MinecraftServer | null>(null);
  const [form, setForm] = useState<ServerFormData>(defaultForm());
  const [voteLinkInput, setVoteLinkInput] = useState({ name: "", url: "" });

  const { data: servers = [], isLoading } = useQuery<MinecraftServer[]>({
    queryKey: ["/api/minecraft/servers/all"],
  });

  const createMutation = useMutation({
    mutationFn: (data: ServerFormData) => apiRequest("POST", "/api/minecraft/servers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/minecraft/servers/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/minecraft/servers"] });
      toast({ title: "Server added" });
      setDialogOpen(false);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ServerFormData> }) =>
      apiRequest("PATCH", `/api/minecraft/servers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/minecraft/servers/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/minecraft/servers"] });
      toast({ title: "Server updated" });
      setDialogOpen(false);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/minecraft/servers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/minecraft/servers/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/minecraft/servers"] });
      toast({ title: "Server deleted" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  function openCreate() {
    setEditing(null);
    setForm(defaultForm());
    setVoteLinkInput({ name: "", url: "" });
    setDialogOpen(true);
  }

  function openEdit(server: MinecraftServer) {
    setEditing(server);
    setForm({
      name: server.name,
      host: server.host,
      description: server.description ?? "",
      gameMode: server.gameMode ?? "survival",
      colorTheme: server.colorTheme,
      voteLinks: (server.voteLinks as { name: string; url: string }[]) ?? [],
      isActive: server.isActive,
      displayOrder: server.displayOrder,
    });
    setVoteLinkInput({ name: "", url: "" });
    setDialogOpen(true);
  }

  function addVoteLink() {
    if (!voteLinkInput.name || !voteLinkInput.url) return;
    setForm((f) => ({ ...f, voteLinks: [...f.voteLinks, { ...voteLinkInput }] }));
    setVoteLinkInput({ name: "", url: "" });
  }

  function removeVoteLink(idx: number) {
    setForm((f) => ({ ...f, voteLinks: f.voteLinks.filter((_, i) => i !== idx) }));
  }

  function handleSubmit() {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <CommandPageLayout title="Minecraft Servers" subtitle="Manage your public Minecraft server listings">
      <div className="flex justify-end mb-4">
        <Button onClick={openCreate} size="sm" data-testid="button-add-server">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Server
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : servers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Server className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No servers yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Theme</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servers.map((server) => (
                <TableRow key={server.id} data-testid={`row-server-${server.id}`}>
                  <TableCell className="font-medium">{server.name}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{server.host}</code>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {server.gameMode ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="capitalize text-sm">{server.colorTheme}</span>
                  </TableCell>
                  <TableCell>{server.displayOrder}</TableCell>
                  <TableCell>
                    <Badge variant={server.isActive ? "default" : "outline"} className="text-xs">
                      {server.isActive ? "Active" : "Hidden"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(server)}
                        data-testid={`button-edit-server-${server.id}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => deleteMutation.mutate(server.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-server-${server.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Server" : "Add Server"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mc-name">Server Name</Label>
                <Input
                  id="mc-name"
                  data-testid="input-server-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="SEVCO SMP"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mc-host">Host / IP</Label>
                <Input
                  id="mc-host"
                  data-testid="input-server-host"
                  value={form.host}
                  onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}
                  placeholder="smp.sevco.us"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mc-desc">Description</Label>
              <Textarea
                id="mc-desc"
                data-testid="input-server-description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe the server experience…"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Game Mode</Label>
                <select
                  data-testid="select-server-gamemode"
                  className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background"
                  value={form.gameMode}
                  onChange={(e) => setForm((f) => ({ ...f, gameMode: e.target.value }))}
                >
                  {GAME_MODES.map((m) => (
                    <option key={m} value={m} className="capitalize">
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Color Theme</Label>
                <select
                  data-testid="select-server-theme"
                  className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background"
                  value={form.colorTheme}
                  onChange={(e) => setForm((f) => ({ ...f, colorTheme: e.target.value }))}
                >
                  {COLOR_THEMES.map((t) => (
                    <option key={t} value={t} className="capitalize">
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mc-order">Display Order</Label>
                <Input
                  id="mc-order"
                  type="number"
                  data-testid="input-server-order"
                  value={form.displayOrder}
                  onChange={(e) => setForm((f) => ({ ...f, displayOrder: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="flex items-end pb-1">
                <div className="flex items-center gap-2">
                  <Switch
                    id="mc-active"
                    data-testid="switch-server-active"
                    checked={form.isActive}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                  />
                  <Label htmlFor="mc-active">Visible on site</Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Vote Links</Label>
              {form.voteLinks.map((link, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm bg-muted/50 rounded-md px-3 py-1.5">
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate">{link.name} — {link.url}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={() => removeVoteLink(idx)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  placeholder="Site name"
                  data-testid="input-votelink-name"
                  value={voteLinkInput.name}
                  onChange={(e) => setVoteLinkInput((v) => ({ ...v, name: e.target.value }))}
                  className="text-sm h-8"
                />
                <Input
                  placeholder="https://…"
                  data-testid="input-votelink-url"
                  value={voteLinkInput.url}
                  onChange={(e) => setVoteLinkInput((v) => ({ ...v, url: e.target.value }))}
                  className="text-sm h-8"
                />
                <Button variant="outline" size="sm" className="h-8 px-3 shrink-0" onClick={addVoteLink}>
                  Add
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending || !form.name || !form.host} data-testid="button-save-server">
              {isPending ? "Saving…" : editing ? "Save Changes" : "Add Server"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CommandPageLayout>
  );
}
