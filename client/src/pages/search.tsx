import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search as SearchIcon,
  FileText,
  FolderOpen,
  Clock,
  ArrowRight,
  Filter,
} from "lucide-react";
import type { Article, Category } from "@shared/schema";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: articles, isLoading } = useQuery<Article[]>({
    queryKey: ["/api/articles/search", query, categoryFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/articles/search?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const filtered = articles;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <SearchIcon className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Search Articles</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search articles, tags..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-category-filter">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id.toString()}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]" data-testid="select-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        {filtered ? `${filtered.length} article${filtered.length !== 1 ? "s" : ""} found` : "Loading..."}
      </div>

      <div className="space-y-3">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-4 overflow-visible">
                <Skeleton className="h-5 w-2/3 mb-2" />
                <Skeleton className="h-3 w-full mb-1" />
                <Skeleton className="h-3 w-1/2" />
              </Card>
            ))
          : filtered?.map((article) => (
              <Link key={article.id} href={`/wiki/${article.slug}`}>
                <Card
                  className="p-4 hover-elevate active-elevate-2 cursor-pointer overflow-visible"
                  data-testid={`card-search-result-${article.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <h3 className="text-sm font-semibold">{article.title}</h3>
                        <Badge
                          variant={article.status === "published" ? "default" : "secondary"}
                          className="text-[10px]"
                        >
                          {article.status}
                        </Badge>
                      </div>
                      {article.summary && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 ml-6">
                          {article.summary}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 ml-6 flex-wrap">
                        {article.tags?.slice(0, 5).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-[9px]">
                            {tag}
                          </Badge>
                        ))}
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(article.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  </div>
                </Card>
              </Link>
            ))}
        {filtered && filtered.length === 0 && (
          <div className="text-center py-12">
            <SearchIcon className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <h3 className="text-sm font-medium mb-1">No articles found</h3>
            <p className="text-xs text-muted-foreground">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
