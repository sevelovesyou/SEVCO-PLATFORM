import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function resolveSupabaseUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  // Bare project ref like "pjhrazajkywdkotutjpq" → build the full URL
  if (/^[a-z0-9]+$/i.test(trimmed)) {
    return `https://${trimmed}.supabase.co`;
  }
  return trimmed;
}

const supabaseUrl = resolveSupabaseUrl(process.env.SUPABASE_URL);
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

let supabase: SupabaseClient | null = null;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn("[supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — Supabase features disabled");
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });
    console.log("[supabase] Server client initialized for", supabaseUrl);
  } catch (err: any) {
    console.error("[supabase] Failed to initialize client:", err.message);
  }
}

export { supabase };

export function getSupabaseUrl(): string | null {
  return supabaseUrl;
}

export const BUCKETS = {
  avatars: { name: "avatars", public: true, maxSizeMb: 5, allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"] },
  banners: { name: "banners", public: true, maxSizeMb: 5, allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"] },
  tracks: { name: "tracks", public: false, maxSizeMb: 50, allowedMimeTypes: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/flac", "audio/aac", "audio/mp4"] },
  gallery: { name: "gallery", public: true, maxSizeMb: 100, allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"] },
  "brand-assets": { name: "brand-assets", public: true, maxSizeMb: 25, allowedMimeTypes: [] },
  "email-attachments": { name: "email-attachments", public: true, maxSizeMb: 25, allowedMimeTypes: [] },
} as const;

export type BucketName = keyof typeof BUCKETS;

export async function ensureBucketsExist() {
  if (!supabase) return;

  for (const [, bucket] of Object.entries(BUCKETS)) {
    try {
      const { data: existing } = await supabase.storage.getBucket(bucket.name);
      if (!existing) {
        const { error } = await supabase.storage.createBucket(bucket.name, {
          public: bucket.public,
          fileSizeLimit: bucket.maxSizeMb * 1024 * 1024,
          allowedMimeTypes: bucket.allowedMimeTypes.length > 0 ? bucket.allowedMimeTypes : undefined,
        });
        if (error) {
          console.error(`[supabase] Failed to create bucket "${bucket.name}":`, error.message);
        } else {
          console.log(`[supabase] Created bucket "${bucket.name}"`);
        }
      } else {
        const { error } = await supabase.storage.updateBucket(bucket.name, {
          public: bucket.public,
          fileSizeLimit: bucket.maxSizeMb * 1024 * 1024,
          allowedMimeTypes: bucket.allowedMimeTypes.length > 0 ? bucket.allowedMimeTypes : undefined,
        });
        if (error) {
          console.error(`[supabase] Failed to update bucket "${bucket.name}":`, error.message);
        } else {
          console.log(`[supabase] Updated bucket "${bucket.name}"`);
        }
      }
    } catch (err: any) {
      console.error(`[supabase] Error checking bucket "${bucket.name}":`, err.message);
    }
  }
}

export async function uploadBuffer(bucket: BucketName, filePath: string, buffer: Buffer, contentType: string): Promise<string | null> {
  if (!supabase) {
    console.warn("[supabase] Client not initialized — cannot upload to", bucket);
    return null;
  }
  try {
    const { error } = await supabase.storage.from(bucket).upload(filePath, buffer, {
      contentType,
      upsert: true,
    });
    if (error) {
      console.error(`[supabase] Upload to ${bucket}/${filePath} failed:`, error.message);
      return null;
    }
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return urlData.publicUrl;
  } catch (err: any) {
    console.error(`[supabase] Error uploading to ${bucket}/${filePath}:`, err.message);
    return null;
  }
}

export async function getSignedUrl(bucket: string, path: string, expiresInSeconds = 3600, download?: string | boolean): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds, download ? { download } : undefined);
    if (error) {
      console.error(`[supabase] Failed to create signed URL:`, error.message);
      return null;
    }
    return data.signedUrl;
  } catch (err: any) {
    console.error(`[supabase] Error creating signed URL:`, err.message);
    return null;
  }
}
