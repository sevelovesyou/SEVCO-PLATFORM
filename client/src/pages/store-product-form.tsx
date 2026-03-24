import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePermission } from "@/hooks/use-permission";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ShoppingBag, ShieldOff } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  slug: z.string()
    .min(1, "Slug is required")
    .max(200)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  description: z.string().max(2000).optional(),
  price: z.coerce.number().positive("Price must be greater than 0"),
  categoryName: z.string().min(1, "Category is required").max(100),
  stockStatus: z.enum(["available", "sold_out"]),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

const CAN_MANAGE_STORE = ["admin", "executive", "staff"];

function AccessDenied() {
  return (
    <div className="max-w-xl mx-auto p-4 md:p-6 flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center">
      <ShieldOff className="h-12 w-12 text-muted-foreground opacity-30" />
      <div>
        <h2 className="text-lg font-semibold mb-1">Access Restricted</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Only Admin, Executive, and Staff can add products to the store.
        </p>
        <Link href="/store">
          <Button variant="outline" size="sm" className="gap-1.5" data-testid="button-back-to-store">
            <ChevronLeft className="h-4 w-4" />
            Back to Store
          </Button>
        </Link>
      </div>
    </div>
  );
}

function toSlug(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export default function StoreProductForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { role } = usePermission();

  if (!CAN_MANAGE_STORE.includes(role ?? "")) {
    return <AccessDenied />;
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      price: 0,
      categoryName: "",
      stockStatus: "available",
      imageUrl: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      return apiRequest("POST", "/api/store/products", {
        name: values.name,
        slug: values.slug,
        description: values.description || null,
        price: values.price,
        categoryName: values.categoryName,
        stockStatus: values.stockStatus,
        imageUrl: values.imageUrl || null,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/store/products"] });
      toast({ title: "Product added to the store" });
      setLocation("/store");
    },
    onError: (err: any) => {
      toast({ title: "Failed to create product", description: err.message, variant: "destructive" });
    },
  });

  function handleNameBlur(e: React.FocusEvent<HTMLInputElement>) {
    if (!form.getValues("slug")) {
      form.setValue("slug", toSlug(e.target.value), { shouldValidate: true });
    }
  }

  return (
    <div className="max-w-xl mx-auto p-4 md:p-6 flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Link href="/store">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" data-testid="button-back-to-store">
            <ChevronLeft className="h-4 w-4" />
            Store
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center">
          <ShoppingBag className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Add Product</h1>
          <p className="text-sm text-muted-foreground">Create a new listing in the SEVCO Store.</p>
        </div>
      </div>

      <Card className="p-5 overflow-visible">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. SEVCO Hoodie"
                      data-testid="input-product-name"
                      {...field}
                      onBlur={(e) => { field.onBlur(); handleNameBlur(e); }}
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
                  <FormLabel>Slug *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. sevco-hoodie"
                      data-testid="input-product-slug"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the product…"
                      rows={4}
                      data-testid="input-product-description"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price ($) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        data-testid="input-product-price"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stockStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Status *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-stock-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="sold_out">Sold Out</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="categoryName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Apparel, Music, Accessories"
                      data-testid="input-product-category"
                      {...field}
                    />
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
                    <Input
                      placeholder="https://example.com/image.jpg"
                      data-testid="input-product-image-url"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  {field.value && (
                    <div className="mt-2 rounded-lg overflow-hidden border border-border bg-muted/30 h-32 flex items-center justify-center">
                      <img
                        src={field.value}
                        alt="Preview"
                        className="h-full w-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  )}
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Link href="/store">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button
                type="submit"
                disabled={mutation.isPending}
                data-testid="button-submit-product"
              >
                {mutation.isPending ? "Adding…" : "Add Product"}
              </Button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
}
