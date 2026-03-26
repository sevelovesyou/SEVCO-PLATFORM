import { useRoute, Link } from "wouter";
import { PageHead } from "@/components/page-head";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FolderOpen,
  FileText,
  ArrowLeft,
  ArrowRight,
  Clock,
} from "lucide-react";
import type { Article, Category } from "@shared/schema";

export default function CategoryView() {
  const [, params] = useRoute("/category/:slug");
  const slug = params?.slug;

  const { data: category, isLoading: catLoading } = useQuery<Category & { articles: Article[] }>({
    queryKey: ["/api/categories", slug],
    enabled: !!slug,
  });

  if (catLoading) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4 overflow-visible">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-3 w-full" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 text-center py-12">
        <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h2 className="text-lg font-semibold mb-1">Category not found</h2>
        <Link href="/wiki">
          <Button variant="outline" data-testid="button-go-home">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Wiki
          </Button>
        </Link>
      </div>
    );
  }

  const publishedArticles = category.articles?.filter((a) => a.status === "published") || [];

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
      <PageHead
        title={`${category.name} — SEVCO Wiki`}
        description={category.description || `Browse all articles in the ${category.name} category on the SEVCO knowledge base.`}
        ogUrl={`https://sevco.us/category/${category.slug}`}
      />
      <div className="flex items-center gap-2 mb-2">
        <Link href="/wiki">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="h-3 w-3 mr-1" />
            Wiki
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <FolderOpen className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold" data-testid="text-category-name">{category.name}</h1>
      </div>
      {category.description && (
        <p className="text-sm text-muted-foreground">{category.description}</p>
      )}

      <div className="text-xs text-muted-foreground">
        {publishedArticles.length} article{publishedArticles.length !== 1 ? "s" : ""} in this category
      </div>

      <div className="flex flex-col gap-3">
        {publishedArticles.map((article) => (
          <Link key={article.id} href={`/wiki/${article.slug}`}>
            <Card
              className="p-4 hover-elevate active-elevate-2 cursor-pointer overflow-visible"
              data-testid={`card-category-article-${article.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <h3 className="text-sm font-semibold">{article.title}</h3>
                  </div>
                  {article.summary && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 ml-6">
                      {article.summary}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 ml-6 flex-wrap">
                    {article.tags?.slice(0, 4).map((tag) => (
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
        {publishedArticles.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <h3 className="text-sm font-medium mb-1">No articles yet</h3>
            <p className="text-xs text-muted-foreground">Be the first to add content to this category</p>
          </div>
        )}
      </div>
    </div>
  );
}
