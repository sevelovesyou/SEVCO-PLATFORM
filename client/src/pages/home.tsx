import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  FileText,
  Clock,
  ArrowRight,
  Sparkles,
  Shield,
  FolderOpen,
  TrendingUp,
} from "lucide-react";
import type { Article, Category } from "@shared/schema";

export default function Home() {
  const { data: articles, isLoading: artLoading } = useQuery<Article[]>({
    queryKey: ["/api/articles", "recent"],
  });

  const { data: categories, isLoading: catLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: stats } = useQuery<{
    totalArticles: number;
    totalRevisions: number;
    pendingReviews: number;
    totalCitations: number;
  }>({
    queryKey: ["/api/stats"],
  });

  const publishedArticles = articles?.filter((a) => a.status === "published") || [];
  const featuredArticle = publishedArticles[0];

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">SEVE Wiki</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          The encyclopedic resource for everything about SEVE and SEVCO Records
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Articles", value: stats?.totalArticles ?? 0, icon: FileText },
          { label: "Revisions", value: stats?.totalRevisions ?? 0, icon: Clock },
          { label: "Pending Reviews", value: stats?.pendingReviews ?? 0, icon: Shield },
          { label: "Citations", value: stats?.totalCitations ?? 0, icon: TrendingUp },
        ].map((stat) => (
          <Card key={stat.label} className="p-3 overflow-visible">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-xl font-bold" data-testid={`stat-${stat.label.toLowerCase().replace(" ", "-")}`}>
              {stat.value}
            </p>
          </Card>
        ))}
      </div>

      {featuredArticle && (
        <Link href={`/wiki/${featuredArticle.slug}`}>
          <Card className="p-4 hover-elevate active-elevate-2 cursor-pointer overflow-visible">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-primary">Featured Article</span>
            </div>
            <h2 className="text-lg font-bold mb-1" data-testid="text-featured-title">
              {featuredArticle.title}
            </h2>
            {featuredArticle.summary && (
              <p className="text-sm text-muted-foreground line-clamp-2">{featuredArticle.summary}</p>
            )}
            <div className="flex items-center gap-2 mt-3">
              {featuredArticle.tags?.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
              <ArrowRight className="h-3 w-3 ml-auto text-muted-foreground" />
            </div>
          </Card>
        </Link>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Recent Articles
            </h2>
            <Link href="/search">
              <Button variant="ghost" size="sm" data-testid="button-view-all">
                View all
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            {artLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="p-3 overflow-visible">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-full" />
                  </Card>
                ))
              : publishedArticles.slice(0, 5).map((article) => (
                  <Link key={article.id} href={`/wiki/${article.slug}`}>
                    <Card
                      className="p-3 hover-elevate active-elevate-2 cursor-pointer overflow-visible"
                      data-testid={`card-article-${article.id}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium truncate">{article.title}</h3>
                          {article.summary && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {article.summary}
                            </p>
                          )}
                        </div>
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      </div>
                    </Card>
                  </Link>
                ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            Categories
          </h2>
          <div className="space-y-2">
            {catLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="p-3 overflow-visible">
                    <Skeleton className="h-5 w-1/2 mb-1" />
                    <Skeleton className="h-3 w-3/4" />
                  </Card>
                ))
              : categories?.map((cat) => (
                  <Link key={cat.id} href={`/category/${cat.slug}`}>
                    <Card
                      className="p-3 hover-elevate active-elevate-2 cursor-pointer overflow-visible"
                      data-testid={`card-category-${cat.slug}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-medium">{cat.name}</h3>
                          {cat.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>
                          )}
                        </div>
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      </div>
                    </Card>
                  </Link>
                ))}
          </div>
        </div>
      </div>
    </div>
  );
}
