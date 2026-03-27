export interface Tweet {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatarUrl: string | null;
  likeCount: number;
  retweetCount: number;
  createdAt: string;
  url: string;
}

const tweetCache = new Map<string, { tweets: Tweet[]; fetchedAt: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

function getCachedTweets(key: string): Tweet[] | null {
  const entry = tweetCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    tweetCache.delete(key);
    return null;
  }
  return entry.tweets;
}

function setCachedTweets(key: string, tweets: Tweet[]): void {
  tweetCache.set(key, { tweets, fetchedAt: Date.now() });
}

export function isXConfigured(): boolean {
  return !!process.env.X_BEARER_TOKEN;
}

export async function fetchUserTweets(handle: string, limit: number = 6): Promise<Tweet[]> {
  const bearerToken = process.env.X_BEARER_TOKEN;
  if (!bearerToken) {
    console.error("[x-api] X_BEARER_TOKEN is not set. Cannot fetch tweets.");
    return [];
  }

  const cleanHandle = handle.replace(/^@/, "");
  const cacheKey = `user:${cleanHandle}:${limit}`;
  const cached = getCachedTweets(cacheKey);
  if (cached) return cached;

  try {
    const userRes = await fetch(
      `https://api.twitter.com/2/users/by/username/${cleanHandle}?user.fields=profile_image_url,name`,
      { headers: { Authorization: `Bearer ${bearerToken}` } }
    );

    if (!userRes.ok) {
      console.error(`[x-api] Failed to fetch user ${cleanHandle}: ${userRes.status} ${userRes.statusText}`);
      return [];
    }

    const userData = await userRes.json() as {
      data?: { id: string; name: string; username: string; profile_image_url?: string };
      errors?: unknown[];
    };

    if (!userData.data) {
      console.error(`[x-api] No user data found for handle: ${cleanHandle}`, userData.errors);
      return [];
    }

    const { id: userId, name: authorName, username: authorHandle, profile_image_url: authorAvatarUrl } = userData.data;

    const tweetsRes = await fetch(
      `https://api.twitter.com/2/users/${userId}/tweets?max_results=${Math.min(limit, 100)}&tweet.fields=created_at,public_metrics&exclude=retweets,replies`,
      { headers: { Authorization: `Bearer ${bearerToken}` } }
    );

    if (!tweetsRes.ok) {
      console.error(`[x-api] Failed to fetch tweets for ${cleanHandle}: ${tweetsRes.status} ${tweetsRes.statusText}`);
      return [];
    }

    const tweetsData = await tweetsRes.json() as {
      data?: Array<{
        id: string;
        text: string;
        created_at?: string;
        public_metrics?: { like_count: number; retweet_count: number };
      }>;
      errors?: unknown[];
    };

    if (!tweetsData.data || tweetsData.data.length === 0) {
      setCachedTweets(cacheKey, []);
      return [];
    }

    const tweets: Tweet[] = tweetsData.data.slice(0, limit).map((t) => ({
      id: t.id,
      text: t.text,
      authorId: userId,
      authorName,
      authorHandle: `@${authorHandle}`,
      authorAvatarUrl: authorAvatarUrl ?? null,
      likeCount: t.public_metrics?.like_count ?? 0,
      retweetCount: t.public_metrics?.retweet_count ?? 0,
      createdAt: t.created_at ?? new Date().toISOString(),
      url: `https://x.com/${authorHandle}/status/${t.id}`,
    }));

    setCachedTweets(cacheKey, tweets);
    return tweets;
  } catch (err) {
    console.error(`[x-api] Error fetching tweets for @${cleanHandle}:`, err);
    return [];
  }
}

export async function searchTweets(query: string, limit: number = 6): Promise<Tweet[]> {
  const bearerToken = process.env.X_BEARER_TOKEN;
  if (!bearerToken) {
    console.error("[x-api] X_BEARER_TOKEN is not set. Cannot search tweets.");
    return [];
  }

  const cacheKey = `search:${query}:${limit}`;
  const cached = getCachedTweets(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=${Math.min(Math.max(limit, 10), 100)}&tweet.fields=created_at,public_metrics,author_id&expansions=author_id&user.fields=name,username,profile_image_url`,
      { headers: { Authorization: `Bearer ${bearerToken}` } }
    );

    if (!res.ok) {
      console.error(`[x-api] Failed to search tweets: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json() as {
      data?: Array<{
        id: string;
        text: string;
        author_id: string;
        created_at?: string;
        public_metrics?: { like_count: number; retweet_count: number };
      }>;
      includes?: {
        users?: Array<{
          id: string;
          name: string;
          username: string;
          profile_image_url?: string;
        }>;
      };
      errors?: unknown[];
    };

    if (!data.data || data.data.length === 0) {
      setCachedTweets(cacheKey, []);
      return [];
    }

    const userMap = new Map<string, { name: string; username: string; profile_image_url?: string }>();
    for (const u of data.includes?.users ?? []) {
      userMap.set(u.id, u);
    }

    const tweets: Tweet[] = data.data.slice(0, limit).map((t) => {
      const author = userMap.get(t.author_id);
      return {
        id: t.id,
        text: t.text,
        authorId: t.author_id,
        authorName: author?.name ?? "Unknown",
        authorHandle: author ? `@${author.username}` : "@unknown",
        authorAvatarUrl: author?.profile_image_url ?? null,
        likeCount: t.public_metrics?.like_count ?? 0,
        retweetCount: t.public_metrics?.retweet_count ?? 0,
        createdAt: t.created_at ?? new Date().toISOString(),
        url: author
          ? `https://x.com/${author.username}/status/${t.id}`
          : `https://x.com/i/web/status/${t.id}`,
      };
    });

    setCachedTweets(cacheKey, tweets);
    return tweets;
  } catch (err) {
    console.error(`[x-api] Error searching tweets for query "${query}":`, err);
    return [];
  }
}
