import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ShoppingBag, ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { usePermission } from "@/hooks/use-permission";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertProductSchema } from "@shared/schema";
import type { InsertProduct } from "@shared/schema";
import { Link } from "wouter";
import { z } from "zod";

const CAN_MANAGE_STORE = ["admin", "executive", "staff"];

const productFormSchema = insertProductSchema.extend({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  price: z.coerce.number().positive("Price must be greater than 0"),
  categoryName: z.string().min(1, "Category is required"),
  stockStatus: z.enum(["available", "sold_out"]),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center">
      <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <Lock className="h-7 w-7 text-destructive" />
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          You don't have permission to add products to the store.
        </p>
      </div>
      <Link href="/store">
        <Button variant="outline" size="sm" data-testid="button-back-to-store">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Store
        </Button>
      </Link>
    </div>
  );
}

export default function StoreProductForm() {
  const { role } = usePermission();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const canManage = role && CAN_MANAGE_STORE.includes(role);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      price: 0,
      categoryName: "",
      stockStatus: "available",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: InsertProduct) =>
      apiRequest("POST", "/api/store/products", data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/store/products"] });
      toast({ title: "Product created", description: "The product has been added to the store." });
      navigate("/store");
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to create product.",
        variant: "destructive",
      });
    },
  });

  if (!canManage) return <AccessDenied />;

  function onSubmit(values: ProductFormValues) {
    mutation.mutate(values as InsertProduct);
  }

  function handleNameChange(name: string) {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    form.setValue("slug", slug, { shouldValidate: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto px-6 py-10">
        <div className="mb-8">
          <Link href="/store">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground -ml-2"
              data-testid="button-back-to-store"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Store
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <ShoppingBag className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Add Product</h1>
            <p className="text-muted-foreground text-sm">Create a new store listing</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      data-testid="input-product-name"
                      placeholder="e.g. SEVCO Hoodie"
                      onChange={(e) => {
                        field.onChange(e);
                        handleNameChange(e.target.value);
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
                    <Input
                      {...field}
                      data-testid="input-product-slug"
                      placeholder="e.g. sevco-hoodie"
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
                      {...field}
                      value={field.value ?? ""}
                      data-testid="input-product-description"
                      placeholder="Describe the product..."
                      rows={4}
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
                    <FormLabel>Price ($)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        data-testid="input-product-price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
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
                    <FormLabel>Stock Status</FormLabel>
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
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      data-testid="input-product-category"
                      placeholder="e.g. Apparel, Music, Accessories"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={mutation.isPending}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              data-testid="button-submit-product"
            >
              {mutation.isPending ? "Creating..." : "Create Product"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
