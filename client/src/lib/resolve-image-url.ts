const SUPABASE_PUBLIC_PATTERN =
  /^https?:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\/([^/?#]+)\/(.+?)(\?.*)?$/;

export function resolveImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  const match = url.match(SUPABASE_PUBLIC_PATTERN);
  if (match) {
    const [, bucket, path] = match;
    return `/images/${encodeURIComponent(bucket)}/${path}`;
  }
  return url;
}
