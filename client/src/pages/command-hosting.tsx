import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Server,
  Cpu,
  MemoryStick,
  HardDrive,
  Globe,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  MapPin,
  Network,
  Clock,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface VirtualMachine {
  id: number;
  hostname: string;
  state: string;
  ip_address?: string;
  ipv4?: Array<{ address: string; reverse_dns?: string }>;
  cpus?: number;
  memory?: number;
  disk?: number;
  bandwidth?: { used: number; total: number };
  datacenter?: { city?: string; country?: string; name?: string };
  template?: { name?: string };
  actions_lock?: string;
  firewall?: string;
  uptime?: number;
  created_at?: string;
}

interface VpsListResponse {
  data?: VirtualMachine[];
}

function StatusBadge({ state }: { state: string }) {
  const isRunning = state === "running";
  return (
    <Badge
      className={`text-xs font-semibold ${
        isRunning
          ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
          : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"
      }`}
      data-testid="badge-vps-state"
    >
      {isRunning ? (
        <CheckCircle2 className="h-3 w-3 mr-1 inline" />
      ) : (
        <AlertCircle className="h-3 w-3 mr-1 inline" />
      )}
      {state}
    </Badge>
  );
}

function MetricRow({
  icon: Icon,
  label,
  value,
  subValue,
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
  subValue?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0">
      <div className="h-7 w-7 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground" data-testid={`vps-metric-${label.toLowerCase().replace(/\s+/g, "-")}`}>{value}</p>
      </div>
      {subValue && (
        <p className="text-xs text-muted-foreground shrink-0">{subValue}</p>
      )}
    </div>
  );
}

function VpsCard({ vm }: { vm: VirtualMachine }) {
  const { toast } = useToast();
  const primaryIp = vm.ipv4?.[0]?.address ?? vm.ip_address ?? "N/A";
  const location = vm.datacenter
    ? [vm.datacenter.city, vm.datacenter.country].filter(Boolean).join(", ")
    : "Unknown";
  const memoryGb = vm.memory ? (vm.memory / 1024).toFixed(1) : null;
  const diskGb = vm.disk ? (vm.disk / 1024).toFixed(0) : null;

  function formatUptime(secs?: number) {
    if (!secs) return null;
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const parts = [];
    if (d) parts.push(`${d}d`);
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    return parts.join(" ") || "< 1m";
  }

  return (
    <Card className="overflow-visible" data-testid={`card-vps-${vm.id}`}>
      <div className="p-4 border-b border-border/60">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Server className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold" data-testid="vps-hostname">{vm.hostname}</p>
              <p className="text-xs text-muted-foreground">ID: {vm.id}</p>
            </div>
          </div>
          <StatusBadge state={vm.state} />
        </div>
      </div>

      <div className="p-4 space-y-0">
        {primaryIp !== "N/A" && (
          <MetricRow icon={Network} label="IP Address" value={primaryIp} />
        )}
        {location !== "Unknown" && (
          <MetricRow icon={MapPin} label="Datacenter" value={location} />
        )}
        {vm.cpus && (
          <MetricRow icon={Cpu} label="vCPUs" value={`${vm.cpus} core${vm.cpus !== 1 ? "s" : ""}`} />
        )}
        {memoryGb && (
          <MetricRow icon={MemoryStick} label="RAM" value={`${memoryGb} GB`} />
        )}
        {diskGb && (
          <MetricRow icon={HardDrive} label="Disk" value={`${diskGb} GB`} />
        )}
        {vm.bandwidth && (
          <MetricRow
            icon={Globe}
            label="Bandwidth"
            value={`${((vm.bandwidth.used ?? 0) / 1024).toFixed(1)} GB used`}
            subValue={`of ${((vm.bandwidth.total ?? 0) / 1024).toFixed(0)} GB`}
          />
        )}
        {vm.template?.name && (
          <MetricRow icon={Server} label="OS" value={vm.template.name} />
        )}
        {vm.uptime !== undefined && (
          <MetricRow icon={Clock} label="Uptime" value={formatUptime(vm.uptime) ?? "N/A"} />
        )}
      </div>

      <div className="p-3 border-t border-border/60 flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5"
          asChild
        >
          <a href="https://hpanel.hostinger.com/vps" target="_blank" rel="noopener noreferrer" data-testid="link-vps-hpanel">
            <ExternalLink className="h-3 w-3" />
            Manage in hPanel
          </a>
        </Button>
      </div>
    </Card>
  );
}

function EmptyVps() {
  return (
    <Card className="p-10 text-center overflow-visible">
      <Server className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
      <p className="text-sm font-medium mb-1">No VPS found</p>
      <p className="text-xs text-muted-foreground max-w-xs mx-auto">
        No virtual machines are linked to this Hostinger API key. Purchase a VPS from Hostinger to get started.
      </p>
      <Button variant="outline" size="sm" className="mt-4 gap-1.5 text-xs" asChild>
        <a href="https://www.hostinger.com/vps-hosting" target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-3 w-3" />
          Browse VPS Plans
        </a>
      </Button>
    </Card>
  );
}

export default function CommandHosting() {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<VpsListResponse>({
    queryKey: ["/api/hostinger/vps"],
    retry: 1,
  });

  const vms: VirtualMachine[] = Array.isArray(data)
    ? data
    : (data?.data ?? []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            VPS Instances
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Live status from Hostinger API
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => refetch()}
          disabled={isFetching}
          data-testid="button-vps-refresh"
        >
          <RefreshCw className={`h-3 w-3 ${isFetching ? "motion-safe:animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          {[0, 1].map((i) => (
            <Card key={i} className="p-4 overflow-visible">
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div>
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0">
                  <Skeleton className="h-7 w-7 rounded-md" />
                  <div className="flex-1">
                    <Skeleton className="h-3 w-16 mb-1" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              ))}
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="p-6 overflow-visible text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive opacity-60" />
          <p className="text-sm font-medium mb-1">Failed to load VPS data</p>
          <p className="text-xs text-muted-foreground mb-3" data-testid="text-vps-error">
            {(error as Error)?.message || "Unable to connect to Hostinger API."}
          </p>
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => refetch()}>
            <RefreshCw className="h-3 w-3" />
            Try again
          </Button>
        </Card>
      ) : vms.length === 0 ? (
        <EmptyVps />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {vms.map((vm) => (
            <VpsCard key={vm.id} vm={vm} />
          ))}
        </div>
      )}

      <div className="border-t border-border/60 pt-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Domain portfolio and DNS settings are managed through Hostinger hPanel.
          </p>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" asChild>
            <a href="https://hpanel.hostinger.com" target="_blank" rel="noopener noreferrer" data-testid="link-hpanel">
              <ExternalLink className="h-3 w-3" />
              Open hPanel
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
