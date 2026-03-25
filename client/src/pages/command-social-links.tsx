import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePermission } from "@/hooks/use-permission";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { Shield, Plus, Trash2, GripVertical, ExternalLink } from "lucide-react";
import type { PlatformSocialLink } from "@shared/schema";

const ICON_SUGGESTIONS = [
  "SiFacebook", "SiInstagram", "SiYoutube", "SiTiktok", "SiX", "SiThreads",
  "SiLinkedin", "SiBluesky", "SiSnapchat", "SiPinterest", "SiVimeo",
  "SiGithub", "SiDiscord", "SiSoundcloud", "SiSpotify", "SiApplemusic",
  "SiPatreon", "SiTwitch",
];

const addLinkSchema = z.object({
  platform: z.string().min(1, "Platform name is required"),
  url: z.string().url("Must be a valid URL"),
  iconName: z.string().min(1, "Icon name is required"),
  displayOrder: z.number().int().default(0),
  showInFooter: z.boolean().default(true),
  showOnContact: z.boolean().default(false),
});

type AddLinkData = z.infer<typeof addLinkSchema>;

function AddLinkDialog({ open, onClose, nextOrder }: { open: boolean; onClose: () => void; nextOrder: number }) {
  const { toast } = useToast();
  const form = useForm<AddLinkData>({
    resolver: zodResolver(addLinkSchema),
    defaultValues: {
      platform: "",
      url: "",
      iconName: "",
      displayOrder: nextOrder,
      showInFooter: true,
      showOnContact: false,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: AddLinkData) => {
      const res = await apiRequest("POST", "/api/social-links", data);
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-links"] });
      toast({ title: "Social link added" });
      form.reset();
      onClose();
    },
    onError: (err: any) => {
      toast({ title: err.message || "Failed to add link", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Social Link</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="flex flex-col gap-3">
            <FormField control={form.control} name="platform" render={({ field }) => (
              <FormItem>
                <FormLabel>Platform Name</FormLabel>
                <FormControl><Input {...field} placeholder="Instagram" data-testid="input-social-platform" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="url" render={({ field }) => (
              <FormItem>
                <FormLabel>URL</FormLabel>
                <FormControl><Input {...field} placeholder="https://..." data-testid="input-social-url" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="iconName" render={({ field }) => (
              <FormItem>
                <FormLabel>Icon Name</FormLabel>
                <FormControl>
                  <div className="flex flex-col gap-1">
                    <Input {...field} placeholder="SiInstagram" data-testid="input-social-icon" list="icon-list" />
                    <datalist id="icon-list">
                      {ICON_SUGGESTIONS.map((i) => <option key={i} value={i} />)}
                    </datalist>
                    <p className="text-[10px] text-muted-foreground">Use react-icons/si name, e.g. SiInstagram</p>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex gap-4">
              <FormField control={form.control} name="showInFooter" render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-show-footer" />
                  </FormControl>
                  <Label className="text-xs">Show in Footer</Label>
                </FormItem>
              )} />
              <FormField control={form.control} name="showOnContact" render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-show-contact" />
                  </FormControl>
                  <Label className="text-xs">Show on Contact</Label>
                </FormItem>
              )} />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-social">
                {mutation.isPending ? "Adding..." : "Add Link"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function SocialLinkRow({ link }: { link: PlatformSocialLink }) {
  const { toast } = useToast();

  const toggleFooter = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/social-links/${link.id}`, { showInFooter: !link.showInFooter }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/social-links"] }),
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const toggleContact = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/social-links/${link.id}`, { showOnContact: !link.showOnContact }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/social-links"] }),
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/social-links/${link.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-links"] });
      toast({ title: "Link removed" });
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors" data-testid={`row-social-${link.id}`}>
      <td className="p-3">
        <div className="flex items-center gap-2">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground opacity-40" />
          <div>
            <p className="text-sm font-medium">{link.platform}</p>
            <p className="text-[10px] text-muted-foreground font-mono">{link.iconName}</p>
          </div>
        </div>
      </td>
      <td className="p-3 hidden md:table-cell">
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 max-w-[200px] truncate"
          data-testid={`link-social-url-${link.id}`}
        >
          <ExternalLink className="h-3 w-3 shrink-0" />
          {link.url}
        </a>
      </td>
      <td className="p-3 text-center">
        <Switch
          checked={link.showInFooter}
          onCheckedChange={() => toggleFooter.mutate()}
          disabled={toggleFooter.isPending}
          data-testid={`switch-footer-${link.id}`}
          className="scale-75"
        />
      </td>
      <td className="p-3 text-center">
        <Switch
          checked={link.showOnContact}
          onCheckedChange={() => toggleContact.mutate()}
          disabled={toggleContact.isPending}
          data-testid={`switch-contact-${link.id}`}
          className="scale-75"
        />
      </td>
      <td className="p-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => {
            if (window.confirm(`Remove "${link.platform}"?`)) deleteMutation.mutate();
          }}
          disabled={deleteMutation.isPending}
          data-testid={`button-delete-social-${link.id}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  );
}

export default function CommandSocialLinks() {
  const { isAdmin } = usePermission();
  const [showAdd, setShowAdd] = useState(false);

  const { data: socialLinks, isLoading } = useQuery<PlatformSocialLink[]>({
    queryKey: ["/api/social-links"],
  });

  if (!isAdmin) {
    return (
      <Card className="p-6 text-center overflow-visible">
        <Shield className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
        <p className="text-sm text-muted-foreground">Admin access required.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Social Links
        </h2>
        {socialLinks && (
          <span className="text-xs text-muted-foreground">{socialLinks.length} link{socialLinks.length !== 1 ? "s" : ""}</span>
        )}
        <Button
          size="sm"
          className="ml-auto h-7 text-xs gap-1"
          onClick={() => setShowAdd(true)}
          data-testid="button-add-social"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Link
        </Button>
      </div>

      <Card className="overflow-hidden overflow-visible" data-testid="table-social-links">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Platform</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">URL</th>
                <th className="text-center p-3 text-xs font-medium text-muted-foreground">Footer</th>
                <th className="text-center p-3 text-xs font-medium text-muted-foreground">Contact</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="p-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="p-3 hidden md:table-cell"><Skeleton className="h-4 w-40" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-8 mx-auto" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-8 mx-auto" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-6" /></td>
                  </tr>
                ))
              ) : socialLinks && socialLinks.length > 0 ? (
                socialLinks.map((link) => <SocialLinkRow key={link.id} link={link} />)
              ) : (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">
                    No social links configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AddLinkDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        nextOrder={socialLinks?.length ?? 0}
      />
    </div>
  );
}
