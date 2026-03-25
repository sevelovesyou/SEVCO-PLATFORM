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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { ShoppingBag, Shield, Trash2, ToggleLeft, ToggleRight, Plus } from "lucide-react";
import type { Product } from "@shared/schema";

const STOCK_STATUS_COLORS: Record<string, string> = {
  available:   "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  unavailable: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  preorder:    "bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 border-yellow-500/20",
};

const STORE_CATEGORIES = ["Apparel", "Games", "Grocery", "Health", "Music", "Books", "Other"];

const productFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  description: z.string().optional(),
  price: z.string().min(1, "Price is required").refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, "Must be a valid price"),
  categoryName: z.string().min(1, "Category is required"),
  stockStatus: z.enum(["available", "unavailable", "preorder"]),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type ProductFormData = z.infer<typeof productFormSchema>;

function slugify(str: string): string {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function StockBadge({ status }: { status: string }) {
  const className = STOCK_STATUS_COLORS[status] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded border capitalize ${className}`}>
      {status}
    </span>
  );
}

function AddProductDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      price: "",
      categoryName: "Apparel",
      stockStatus: "available",
      imageUrl: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const payload = {
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        price: parseFloat(data.price),
        categoryName: data.categoryName,
        stockStatus: data.stockStatus,
        imageUrl: data.imageUrl || null,
      };
      const res = await apiRequest("POST", "/api/store/products", payload);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create product");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/store/products"] });
      toast({ title: "Product created" });
      form.reset();
      onClose();
    },
    onError: (err: any) => {
      toast({ title: err.message || "Failed to create product", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Product</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Product name"
                      data-testid="input-product-name"
                      onChange={(e) => {
                        field.onChange(e);
                        if (!form.getValues("slug") || form.getValues("slug") === slugify(form.getValues("name"))) {
                          form.setValue("slug", slugify(e.target.value));
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="product-slug" data-testid="input-product-slug" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price ($)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" min="0" placeholder="0.00" data-testid="input-product-price" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="categoryName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-product-category">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STORE_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="stockStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stock Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger data-testid="select-product-stock">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="unavailable">Unavailable</SelectItem>
                      <SelectItem value="preorder">Pre-order</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Product description..." rows={2} data-testid="textarea-product-description" />
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
                  <FormLabel>Image URL <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://..." data-testid="input-product-image" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-product">
                {mutation.isPending ? "Creating..." : "Create Product"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ProductRow({ product }: { product: Product }) {
  const { toast } = useToast();

  const toggleMutation = useMutation({
    mutationFn: () => {
      const newStatus = product.stockStatus === "available" ? "unavailable" : "available";
      return apiRequest("PATCH", `/api/store/products/${product.id}`, { stockStatus: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/store/products"] });
      toast({ title: "Stock status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update stock status", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/store/products/${product.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/store/products"] });
      toast({ title: "Product deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete product", variant: "destructive" });
    },
  });

  const isAvailable = product.stockStatus === "available";

  return (
    <tr
      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
      data-testid={`row-product-${product.id}`}
    >
      <td className="p-3 font-medium text-sm">{product.name}</td>
      <td className="p-3 text-xs text-muted-foreground hidden md:table-cell capitalize">{product.categoryName}</td>
      <td className="p-3 text-xs font-medium" data-testid={`text-price-${product.id}`}>
        ${product.price.toFixed(2)}
      </td>
      <td className="p-3">
        <StockBadge status={product.stockStatus} />
      </td>
      <td className="p-3">
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => toggleMutation.mutate()}
            disabled={toggleMutation.isPending || deleteMutation.isPending}
            title={isAvailable ? "Mark unavailable" : "Mark available"}
            data-testid={`button-toggle-stock-${product.id}`}
          >
            {isAvailable ? (
              <ToggleRight className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <ToggleLeft className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => {
              if (window.confirm(`Delete "${product.name}"? This cannot be undone.`)) {
                deleteMutation.mutate();
              }
            }}
            disabled={deleteMutation.isPending || toggleMutation.isPending}
            data-testid={`button-delete-product-${product.id}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

export default function CommandStore() {
  const { isAdmin, isExecutive } = usePermission();
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/store/products"],
  });

  if (!isAdmin && !isExecutive) {
    return (
      <Card className="p-6 text-center overflow-visible">
        <Shield className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
        <p className="text-sm text-muted-foreground">Admin or Executive access required.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Product Catalog
        </h2>
        {products && (
          <span className="text-xs text-muted-foreground">
            {products.length} product{products.length !== 1 ? "s" : ""}
          </span>
        )}
        <Button
          size="sm"
          className="ml-auto h-7 text-xs gap-1"
          onClick={() => setShowAddDialog(true)}
          data-testid="button-add-product"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Product
        </Button>
      </div>

      <Card className="overflow-hidden overflow-visible" data-testid="table-products">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Name</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Category</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Price</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Stock</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="p-3"><Skeleton className="h-4 w-32" /></td>
                    <td className="p-3 hidden md:table-cell"><Skeleton className="h-4 w-20" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-14" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-16" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-16" /></td>
                  </tr>
                ))
              ) : products && products.length > 0 ? (
                products.map((product) => (
                  <ProductRow key={product.id} product={product} />
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AddProductDialog open={showAddDialog} onClose={() => setShowAddDialog(false)} />
    </div>
  );
}
