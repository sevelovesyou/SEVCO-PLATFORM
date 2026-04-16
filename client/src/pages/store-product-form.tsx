import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ShoppingBag, ShieldOff, Plus, X, Layers } from "lucide-react";
import { PhotoUploadGrid } from "@/components/photo-upload-grid";
import type { StoreCategory } from "@shared/schema";
import type { ProductVariantGroup, ProductVariantOption } from "@shared/schema";
import { cn } from "@/lib/utils";

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
  imageUrls: z.array(z.string()).max(5).optional(),
});

type FormValues = z.infer<typeof formSchema>;

const CAN_MANAGE_STORE_PRODUCTS = ["admin", "executive"];

const VARIANT_NAME_SUGGESTIONS = ["Size", "Color", "Flavor", "Scent", "Style", "Material", "Fit"];

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function AccessDenied() {
  return (
    <div className="max-w-xl mx-auto p-4 md:p-6 flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center">
      <ShieldOff className="h-12 w-12 text-muted-foreground opacity-30" />
      <div>
        <h2 className="text-lg font-semibold mb-1">Access Restricted</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Only Admin and Executive can add products to the store.
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

interface VariantGroupEditorProps {
  group: ProductVariantGroup;
  onChange: (updated: ProductVariantGroup) => void;
  onRemove: () => void;
}

function detectColor(input: string): { isColor: boolean; value: string } {
  const trimmed = input.trim();
  if (!trimmed) return { isColor: false, value: trimmed };
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(trimmed)) {
    return { isColor: true, value: trimmed.toLowerCase() };
  }
  try {
    const s = new Option().style;
    s.color = trimmed;
    if (s.color !== "") {
      return { isColor: true, value: trimmed.toLowerCase() };
    }
  } catch {}
  return { isColor: false, value: trimmed };
}

function VariantGroupEditor({ group, onChange, onRemove }: VariantGroupEditorProps) {
  const [newOptionLabel, setNewOptionLabel] = useState("");

  function addOption() {
    const label = newOptionLabel.trim();
    if (!label) return;
    const detected = detectColor(label);
    const option: ProductVariantOption = { label, value: detected.isColor ? detected.value : label };
    let updated = { ...group, options: [...group.options, option] };
    if (detected.isColor && group.type === "text") {
      updated = { ...updated, type: "color" };
    }
    onChange(updated);
    setNewOptionLabel("");
  }

  function removeOption(index: number) {
    onChange({ ...group, options: group.options.filter((_, i) => i !== index) });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addOption();
    }
  }

  function handleNameChange(name: string) {
    let updated: ProductVariantGroup = { ...group, name };
    if (name.toLowerCase() === "color" && group.type === "text" && group.options.length === 0) {
      updated = { ...updated, type: "color" };
    }
    onChange(updated);
  }

  return (
    <div className="border border-border rounded-lg p-4 flex flex-col gap-3 bg-muted/20">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 flex flex-col gap-3">
          <div className="flex gap-3 flex-wrap">
            <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
              <Label className="text-xs text-muted-foreground">Group Name</Label>
              <Input
                list={`variant-names-${group.id}`}
                value={group.name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="e.g. Size, Color, Flavor"
                className="h-8 text-sm"
                data-testid={`input-variant-name-${group.id}`}
              />
              <datalist id={`variant-names-${group.id}`}>
                {VARIANT_NAME_SUGGESTIONS.map(s => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Display Type</Label>
              <div className="flex gap-2 items-center h-8">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name={`variant-type-${group.id}`}
                    value="text"
                    checked={group.type === "text"}
                    onChange={() => onChange({ ...group, type: "text" })}
                    data-testid={`radio-variant-type-text-${group.id}`}
                  />
                  Text chips
                </label>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name={`variant-type-${group.id}`}
                    value="color"
                    checked={group.type === "color"}
                    onChange={() => onChange({ ...group, type: "color" })}
                    data-testid={`radio-variant-type-color-${group.id}`}
                  />
                  Color swatches
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-1 justify-center">
              <Label className="text-xs text-muted-foreground">Required</Label>
              <label className="flex items-center gap-1.5 text-sm cursor-pointer h-8">
                <input
                  type="checkbox"
                  checked={group.required}
                  onChange={e => onChange({ ...group, required: e.target.checked })}
                  data-testid={`checkbox-variant-required-${group.id}`}
                />
                Required
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Options</Label>
            <div className="flex flex-wrap gap-1.5">
              {group.options.map((opt, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 bg-background border border-border rounded-md px-2 py-0.5 text-sm"
                  data-testid={`variant-option-chip-${group.id}-${i}`}
                >
                  {group.type === "color" && (
                    <span
                      className="h-3 w-3 rounded-full border border-border inline-block"
                      style={{ backgroundColor: opt.value }}
                    />
                  )}
                  {opt.label}
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    className="text-muted-foreground hover:text-destructive ml-0.5"
                    aria-label={`Remove option ${opt.label}`}
                    data-testid={`button-remove-option-${group.id}-${i}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <div className="flex gap-1">
                <Input
                  value={newOptionLabel}
                  onChange={e => setNewOptionLabel(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={group.type === "color" ? "Red or #FF0000" : "Add option…"}
                  className="h-7 w-36 text-sm"
                  data-testid={`input-variant-option-${group.id}`}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  onClick={addOption}
                  data-testid={`button-add-option-${group.id}`}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive shrink-0 h-7 px-2"
          onClick={onRemove}
          data-testid={`button-remove-variant-group-${group.id}`}
        >
          <X className="h-4 w-4" />
          <span className="ml-1 text-xs">Remove</span>
        </Button>
      </div>
    </div>
  );
}

export default function StoreProductForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { role } = usePermission();
  const [variantGroups, setVariantGroups] = useState<ProductVariantGroup[]>([]);

  const { data: storeCategories, isLoading: categoriesLoading } = useQuery<StoreCategory[]>({
    queryKey: ["/api/store/categories"],
  });

  if (!CAN_MANAGE_STORE_PRODUCTS.includes(role ?? "")) {
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
      imageUrls: [],
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const imageUrls = values.imageUrls || [];
      return apiRequest("POST", "/api/store/products", {
        name: values.name,
        slug: values.slug,
        description: values.description || null,
        price: values.price,
        categoryName: values.categoryName,
        stockStatus: values.stockStatus,
        imageUrls,
        imageUrl: imageUrls[0] || null,
        variants: variantGroups,
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

  function addVariantGroup() {
    setVariantGroups(prev => [
      ...prev,
      {
        id: generateId(),
        name: "",
        type: "text",
        required: false,
        options: [],
      },
    ]);
  }

  function updateVariantGroup(id: string, updated: ProductVariantGroup) {
    setVariantGroups(prev => prev.map(g => g.id === id ? updated : g));
  }

  function removeVariantGroup(id: string) {
    setVariantGroups(prev => prev.filter(g => g.id !== id));
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
        <div className="h-8 w-8 rounded-full bg-red-700/10 flex items-center justify-center">
          <ShoppingBag className="h-4 w-4 text-red-700 dark:text-red-500" />
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
                  {categoriesLoading ? (
                    <Select disabled>
                      <FormControl>
                        <SelectTrigger data-testid="select-product-category">
                          <SelectValue placeholder="Loading categories…" />
                        </SelectTrigger>
                      </FormControl>
                    </Select>
                  ) : storeCategories && storeCategories.length > 0 ? (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-product-category">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {storeCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <FormControl>
                      <Input
                        placeholder="e.g. Apparel, Music, Accessories"
                        data-testid="input-product-category"
                        {...field}
                      />
                    </FormControl>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="imageUrls"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Photos <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormControl>
                    <PhotoUploadGrid
                      value={field.value ?? []}
                      onChange={field.onChange}
                      max={5}
                      bucket="products"
                      slug={form.watch("slug") || "product"}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-3 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Variants <span className="text-muted-foreground font-normal">(optional)</span></span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addVariantGroup}
                  className="h-7 text-xs gap-1"
                  data-testid="button-add-variant-group"
                >
                  <Plus className="h-3 w-3" />
                  Add Variant Group
                </Button>
              </div>

              {variantGroups.length > 0 && (
                <div className="flex flex-col gap-3" data-testid="variant-groups-editor">
                  {variantGroups.map(group => (
                    <VariantGroupEditor
                      key={group.id}
                      group={group}
                      onChange={updated => updateVariantGroup(group.id, updated)}
                      onRemove={() => removeVariantGroup(group.id)}
                    />
                  ))}
                </div>
              )}
            </div>

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
