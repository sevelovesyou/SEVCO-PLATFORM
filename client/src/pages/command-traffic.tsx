import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  BarChart2,
  Plus,
  Trash2,
  Pencil,
  ExternalLink,
  Save,
  Globe,
  Eye,
  X,
  Info,
} from "lucide-react";

type WatchedSite = {
  id: string;
  name: string;
  url: string;
  embedUrl?: string;
};

type TrafficSettings = {
  embedUrl: string;
  watchedSites: WatchedSite[];
};

const PROVIDER_GUIDES = [
  {
    name: "Plausible Analytics",
    steps: [
      "Go to plausible.io and open your site dashboard.",
      'Click "Shared links" under the site settings.',
      'Click "New link" and choose your visibility (public or password-protected).',
      "Copy the shared link URL and paste it below.",
    ],
    docsUrl: "https://plausible.io/docs/shared-links",
  },
  {
    name: "Simple Analytics",
    steps: [
      "Log in to simpleanalytics.com and open your site.",
      'Click "Share" in the top bar.',
      "Enable public access or generate a private link.",
      "Copy the embed or share URL and paste it below.",
    ],
    docsUrl: "https://docs.simpleanalytics.com/shared-dashboards",
  },
  {
    name: "Cloudflare Web Analytics",
    steps: [
      "Open Cloudflare Dashboard → Web Analytics.",
      "Select your site and go to the overview.",
      "Use the direct analytics URL from your browser's address bar.",
      "Note: Cloudflare analytics are not embeddable — use the URL as a quick link instead.",
    ],
    docsUrl: "https://developers.cloudflare.com/analytics/web-analytics/",
  },
  {
    name: "Google Analytics 4",
    steps: [
      "In GA4, go to Reports and build a custom report or use an existing one.",
      "Click Share → Share link (not a shareable embed).",
      "Note: GA4 does not support embeddable iframes natively.",
      "You can link to your GA4 property URL instead.",
    ],
    docsUrl: "https://support.google.com/analytics/answer/9212670",
  },
];

function SetupGuide() {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg border">
        <Info className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium">No analytics embed configured</p>
          <p className="text-sm text-muted-foreground mt-1">
            Paste a shareable embed URL from your analytics provider above to display live traffic data here. Most providers offer a "shared link" or "public dashboard" feature.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Supported analytics providers</p>
        {PROVIDER_GUIDES.map((provider, idx) => (
          <div key={provider.name} className="border rounded-lg overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
              onClick={() => setExpanded(expanded === idx ? null : idx)}
              data-testid={`button-traffic-provider-${idx}`}
            >
              <span className="text-sm font-medium">{provider.name}</span>
              <span className="text-muted-foreground text-xs">{expanded === idx ? "▲" : "▼"}</span>
            </button>
            {expanded === idx && (
              <div className="px-3 pb-3 border-t bg-muted/20">
                <ol className="mt-2 space-y-1 list-decimal list-inside">
                  {provider.steps.map((step, i) => (
                    <li key={i} className="text-sm text-muted-foreground">{step}</li>
                  ))}
                </ol>
                <a
                  href={provider.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
                  data-testid={`link-traffic-provider-docs-${idx}`}
                >
                  <ExternalLink className="h-3 w-3" />
                  View documentation
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const EMPTY_SITE: Omit<WatchedSite, "id"> = {
  name: "",
  url: "",
  embedUrl: "",
};

export default function CommandTraffic() {
  const { toast } = useToast();

  const { data, isLoading } = useQuery<TrafficSettings>({
    queryKey: ["/api/traffic-settings"],
  });

  const mutation = useMutation({
    mutationFn: async (payload: TrafficSettings) => {
      return apiRequest("POST", "/api/traffic-settings", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/traffic-settings"] });
      toast({ title: "Traffic settings saved" });
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const [embedUrl, setEmbedUrl] = useState("");
  const [watchedSites, setWatchedSites] = useState<WatchedSite[]>([]);
  const [viewingEmbed, setViewingEmbed] = useState<{ name: string; embedUrl: string } | null>(null);

  const [siteDialogOpen, setSiteDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<WatchedSite | null>(null);
  const [siteForm, setSiteForm] = useState<Omit<WatchedSite, "id">>(EMPTY_SITE);

  useEffect(() => {
    if (data) {
      setEmbedUrl(data.embedUrl || "");
      setWatchedSites(data.watchedSites || []);
    }
  }, [data]);

  function handleSaveMain() {
    mutation.mutate({ embedUrl, watchedSites });
  }

  function openAddSite() {
    setEditingSite(null);
    setSiteForm(EMPTY_SITE);
    setSiteDialogOpen(true);
  }

  function openEditSite(site: WatchedSite) {
    setEditingSite(site);
    setSiteForm({ name: site.name, url: site.url, embedUrl: site.embedUrl || "" });
    setSiteDialogOpen(true);
  }

  function handleSiteDialogSave() {
    if (!siteForm.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (!siteForm.url.trim()) {
      toast({ title: "URL is required", variant: "destructive" });
      return;
    }
    let updated: WatchedSite[];
    if (editingSite) {
      updated = watchedSites.map((s) =>
        s.id === editingSite.id ? { ...editingSite, ...siteForm } : s
      );
    } else {
      updated = [
        ...watchedSites,
        { ...siteForm, id: crypto.randomUUID() },
      ];
    }
    setWatchedSites(updated);
    setSiteDialogOpen(false);
    mutation.mutate({ embedUrl, watchedSites: updated });
  }

  function handleRemoveSite(id: string) {
    const updated = watchedSites.filter((s) => s.id !== id);
    setWatchedSites(updated);
    mutation.mutate({ embedUrl, watchedSites: updated });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Platform Analytics */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Platform Analytics</CardTitle>
          </div>
          <CardDescription>
            Embed a shareable analytics dashboard for sevco.us. Paste the embed URL from your analytics provider (Plausible, Simple Analytics, GA4, etc.).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="input-platform-embed-url">Embed URL</Label>
              <Input
                id="input-platform-embed-url"
                data-testid="input-platform-embed-url"
                placeholder="https://plausible.io/share/sevco.us?auth=..."
                value={embedUrl}
                onChange={(e) => setEmbedUrl(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex items-end gap-2">
              {embedUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewingEmbed({ name: "sevco.us", embedUrl })}
                  data-testid="button-view-platform-embed"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleSaveMain}
                disabled={mutation.isPending}
                data-testid="button-save-platform-embed"
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
          </div>

          <Separator />

          {embedUrl ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Live Preview</p>
                <Badge variant="secondary" data-testid="status-embed-configured">Configured</Badge>
              </div>
              <div className="relative w-full rounded-lg overflow-hidden border bg-muted/20" style={{ height: "600px" }}>
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  title="Platform Analytics"
                  data-testid="iframe-platform-analytics"
                  loading="lazy"
                />
              </div>
            </div>
          ) : (
            <SetupGuide />
          )}
        </CardContent>
      </Card>

      {/* Watched Sites */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Watched Sites</CardTitle>
            </div>
            <Button size="sm" onClick={openAddSite} data-testid="button-add-watched-site">
              <Plus className="h-4 w-4 mr-1" />
              Add Site
            </Button>
          </div>
          <CardDescription>
            Track additional owned or monitored websites. Each entry can optionally include an analytics embed URL.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {watchedSites.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Globe className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No watched sites added yet.</p>
              <p className="text-xs mt-1">Add sites to track and quickly access their analytics.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {watchedSites.map((site) => (
                <div
                  key={site.id}
                  className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20"
                  data-testid={`card-watched-site-${site.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate" data-testid={`text-site-name-${site.id}`}>{site.name}</p>
                      {site.embedUrl && (
                        <Badge variant="outline" className="text-xs shrink-0">Analytics</Badge>
                      )}
                    </div>
                    <a
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-primary hover:underline inline-flex items-center gap-1 mt-0.5"
                      data-testid={`link-site-url-${site.id}`}
                    >
                      <ExternalLink className="h-3 w-3" />
                      {site.url}
                    </a>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {site.embedUrl && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setViewingEmbed({ name: site.name, embedUrl: site.embedUrl! })}
                        data-testid={`button-view-site-embed-${site.id}`}
                        title="View analytics embed"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditSite(site)}
                      data-testid={`button-edit-site-${site.id}`}
                      title="Edit site"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveSite(site.id)}
                      data-testid={`button-remove-site-${site.id}`}
                      title="Remove site"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Site Dialog */}
      <Dialog open={siteDialogOpen} onOpenChange={setSiteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSite ? "Edit Site" : "Add Watched Site"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="input-site-name">Site Name *</Label>
              <Input
                id="input-site-name"
                data-testid="input-site-name"
                placeholder="e.g. SEVCO Records"
                value={siteForm.name}
                onChange={(e) => setSiteForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="input-site-url">Site URL *</Label>
              <Input
                id="input-site-url"
                data-testid="input-site-url"
                placeholder="https://records.sevco.us"
                value={siteForm.url}
                onChange={(e) => setSiteForm((f) => ({ ...f, url: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="input-site-embed-url">Analytics Embed URL (optional)</Label>
              <Input
                id="input-site-embed-url"
                data-testid="input-site-embed-url"
                placeholder="https://plausible.io/share/records.sevco.us?auth=..."
                value={siteForm.embedUrl || ""}
                onChange={(e) => setSiteForm((f) => ({ ...f, embedUrl: e.target.value }))}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Paste a shareable embed URL from your analytics provider to view traffic inside the dashboard.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSiteDialogOpen(false)} data-testid="button-site-dialog-cancel">
              Cancel
            </Button>
            <Button onClick={handleSiteDialogSave} disabled={mutation.isPending} data-testid="button-site-dialog-save">
              {editingSite ? "Save Changes" : "Add Site"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Analytics Embed Viewer Dialog */}
      <Dialog open={!!viewingEmbed} onOpenChange={(open) => { if (!open) setViewingEmbed(null); }}>
        <DialogContent className="max-w-5xl w-full p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{viewingEmbed?.name} — Analytics</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewingEmbed(null)}
              data-testid="button-close-embed-viewer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {viewingEmbed && (
            <div className="w-full" style={{ height: "700px" }}>
              <iframe
                src={viewingEmbed.embedUrl}
                className="w-full h-full"
                title={`${viewingEmbed.name} Analytics`}
                data-testid="iframe-embed-viewer"
                loading="lazy"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
