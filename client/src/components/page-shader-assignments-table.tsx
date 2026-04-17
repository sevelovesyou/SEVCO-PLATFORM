import { useQuery, useMutation } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SHADER_PAGE_KEYS, type ShaderPreset } from "@shared/schema";

export function PageShaderAssignmentsTable() {
  const { toast } = useToast();
  const presetsQ = useQuery<ShaderPreset[]>({ queryKey: ["/api/shader-presets"] });
  const assignmentsQ = useQuery<Record<string, number | null>>({ queryKey: ["/api/shader-assignments"] });
  const presets = presetsQ.data ?? [];

  const assignM = useMutation({
    mutationFn: async (next: Record<string, number | null>) =>
      apiRequest("PUT", "/api/shader-assignments", next),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shader-assignments"] });
      toast({ title: "Assignments updated" });
    },
    onError: (e: any) => toast({ title: "Update failed", description: e?.message, variant: "destructive" }),
  });

  function handleAssign(pageKey: string, val: string) {
    const next = { ...(assignmentsQ.data ?? {}) } as Record<string, number | null>;
    next[pageKey] = val === "none" ? null : parseInt(val);
    assignM.mutate(next);
  }

  return (
    <div className="space-y-2" data-testid="page-shader-assignments-table">
      {SHADER_PAGE_KEYS.map((pk) => {
        const cur = assignmentsQ.data?.[pk] ?? null;
        return (
          <div key={pk} className="flex items-center gap-2">
            <span className="text-xs w-32 text-muted-foreground" data-testid={`text-page-${pk}`}>{pk}</span>
            <Select value={cur == null ? "none" : String(cur)} onValueChange={(v) => handleAssign(pk, v)}>
              <SelectTrigger className="flex-1" data-testid={`select-assign-${pk}`}>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {presets.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      })}
    </div>
  );
}
