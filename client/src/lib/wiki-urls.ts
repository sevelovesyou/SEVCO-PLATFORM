export function articleUrl(article: { slug: string; category?: { slug: string } | null }): string {
  if (article.category?.slug) {
    return `/wiki/${article.category.slug}/${article.slug}`;
  }
  return `/wiki/${article.slug}`;
}
