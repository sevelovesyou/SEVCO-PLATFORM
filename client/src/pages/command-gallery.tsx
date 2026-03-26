import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePermission } from "@/hooks/use-permission";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FileUploadWithFallback } from "@/components/file-upload";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Images, ImageOff, Shield, ExternalLink } from "lucide-react";
import type { GalleryImage } from "@shared/schema";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const CATEGORY_OPTIONS = [
  { value: "profile", label: "Profile Pic" },
  { value: "banner", label: "Banner" },
  { value: "wallpaper", label: "Wallpaper" },
  { value: "logo", label: "Logo" },
  { value: "other", label: "Other" },
];

const CATEGORY_COLORS: Record<string, string> = {
  profile: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  banner: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  wallpaper: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  logo: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
  other: "bg-muted text-muted-foreground border-border",
};

const galleryFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  imageUrl: z.string().min(1, "Image URL is required"),
  category: z.enum(["profile", "banner", "wallpaper", "logo", "other"]),
  altText: z.string().optional(),
  displayOrder: z.string().default("0"),
  isPublic: z.boolean().default(true),
});

type GalleryFormValues = z.infer<typeof galleryFormSchema>;

function GalleryForm({
  defaultValues,
  onSubmit,
  isPending,
  onCancel,
}: {
  defaultValues?: Partial<GalleryFormValues>;
  onSubmit: (values: GalleryFormValues) => void;
  isPending: boolean;
  onCancel: () => void;
}) {
  const form = useForm<GalleryFormValues>({
    resolver: zodResolver(galleryFormSchema),
    defaultValues: {
      title: "",
      imageUrl: "",
      category: "other",
      altText: "",
      displayOrder: "0",
      isPublic: true,
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g. SEVCO Profile Avatar" data-testid="input-gallery-title" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image</FormLabel>
              <FormControl>
                <FileUploadWithFallback
                  bucket="gallery"
                  path={`gallery/${Date.now()}.{ext}`}
                  accept="image/*"
                  maxSizeMb={10}
                  currentUrl={field.value || null}
                  onUpload={(url) => field.onChange(url)}
                  onUrlChange={(url) => field.onChange(url)}
                  urlValue={field.value}
                  label="Upload Image"
                  urlPlaceholder="https://..."
                  urlTestId="input-gallery-image-url"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-gallery-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="altText"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Alt Text (optional)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Description for accessibility" data-testid="input-gallery-alt-text" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="displayOrder"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display Order</FormLabel>
                <FormControl>
                  <Input {...field} type="number" data-testid="input-gallery-display-order" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isPublic"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Public</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-2 pt-2">
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-gallery-public"
                    />
                    <Label className="text-sm text-muted-foreground">
                      {field.value ? "Visible to all" : "Members only"}
                    </Label>
                  </div>
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} data-testid="button-gallery-form-cancel">
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} data-testid="button-gallery-form-submit">
            {isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

export default function CommandGallery() {
  const { isAdmin, isExecutive, isStaff } = usePermission();
  const { toast } = useToast();
  const canManageGallery = isAdmin || isExecutive || isStaff;

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editImage, setEditImage] = useState<GalleryImage | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: images, isLoading } = useQuery<GalleryImage[]>({
    queryKey: ["/api/gallery"],
    queryFn: async () => {
      const res = await fetch("/api/gallery", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch gallery");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/gallery", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
      setShowAddDialog(false);
      toast({ title: "Image added", description: "Gallery image has been added." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) => apiRequest("PATCH", `/api/gallery/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
      setEditImage(null);
      toast({ title: "Image updated", description: "Gallery image has been updated." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/gallery/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
      setDeleteId(null);
      toast({ title: "Image deleted", description: "Gallery image has been removed." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const togglePublic = (image: GalleryImage) => {
    updateMutation.mutate({ id: image.id, data: { isPublic: !image.isPublic } });
  };

  function handleCreate(values: GalleryFormValues) {
    createMutation.mutate({
      ...values,
      displayOrder: parseInt(values.displayOrder) || 0,
    });
  }

  function handleEdit(values: GalleryFormValues) {
    if (!editImage) return;
    updateMutation.mutate({
      id: editImage.id,
      data: { ...values, displayOrder: parseInt(values.displayOrder) || 0 },
    });
  }

  if (!canManageGallery) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">Staff access required</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Images className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">
              {images ? `${images.length} image${images.length !== 1 ? "s" : ""}` : "Loading..."}
            </p>
          </div>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowAddDialog(true)} data-testid="button-add-gallery-image">
          <Plus className="h-4 w-4" />
          Add Image
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
      )}

      {!isLoading && images && images.length === 0 && (
        <Card className="p-8 text-center">
          <ImageOff className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">No gallery images</p>
          <p className="text-xs text-muted-foreground mb-4">Add images by pasting hosted URLs.</p>
          <Button size="sm" onClick={() => setShowAddDialog(true)} data-testid="button-gallery-empty-add">
            <Plus className="h-4 w-4 mr-1.5" />
            Add First Image
          </Button>
        </Card>
      )}

      {!isLoading && images && images.length > 0 && (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Image</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Title</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Category</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Order</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Public</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {images.map((image, idx) => (
                <tr
                  key={image.id}
                  className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/10"}`}
                  data-testid={`row-gallery-${image.id}`}
                >
                  <td className="px-4 py-2.5">
                    <div className="h-10 w-16 rounded overflow-hidden bg-muted shrink-0">
                      <img
                        src={image.imageUrl}
                        alt={image.altText || image.title}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-sm leading-tight" data-testid={`text-gallery-title-${image.id}`}>{image.title}</p>
                      <a href={image.imageUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    {image.altText && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[200px]">{image.altText}</p>
                    )}
                  </td>
                  <td className="px-4 py-2.5 hidden sm:table-cell">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${CATEGORY_COLORS[image.category] ?? CATEGORY_COLORS.other}`}
                      data-testid={`badge-gallery-cat-${image.id}`}
                    >
                      {image.category}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell">
                    <span className="text-xs text-muted-foreground">{image.displayOrder}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <Switch
                      checked={image.isPublic}
                      onCheckedChange={() => togglePublic(image)}
                      data-testid={`switch-gallery-public-${image.id}`}
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1 justify-end">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setEditImage(image)}
                            data-testid={`button-edit-gallery-${image.id}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(image.id)}
                            data-testid={`button-delete-gallery-${image.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Gallery Image</DialogTitle>
          </DialogHeader>
          <GalleryForm
            onSubmit={handleCreate}
            isPending={createMutation.isPending}
            onCancel={() => setShowAddDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editImage} onOpenChange={(o) => !o && setEditImage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Gallery Image</DialogTitle>
          </DialogHeader>
          {editImage && (
            <GalleryForm
              defaultValues={{
                title: editImage.title,
                imageUrl: editImage.imageUrl,
                category: editImage.category as any,
                altText: editImage.altText ?? "",
                displayOrder: String(editImage.displayOrder),
                isPublic: editImage.isPublic,
              }}
              onSubmit={handleEdit}
              isPending={updateMutation.isPending}
              onCancel={() => setEditImage(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this gallery image? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-gallery-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId !== null && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
              data-testid="button-gallery-delete-confirm"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
