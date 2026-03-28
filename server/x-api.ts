export interface Tweet {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatarUrl: string | null;
  mediaUrl: string | null;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  createdAt: string;
  url: string;
}

const CATEGORY_QUERIES: Record<string, string> = {
  technology: "(#tech OR #AI OR #software OR from:verge OR from:wired OR from:techcrunch) -is:retweet lang:en has:links",
  music: "(#music OR #newmusic OR #hiphop OR from:billboard OR from:pitchfork) -is:retweet lang:en has:links",
  gaming: "(#gaming OR #videogames OR #esports OR from:IGN OR from:kotaku) -is:retweet lang:en has:links",
  sports: "(#sports OR #NBA OR #NFL OR #soccer OR from:espn OR from:bleacherreport) -is:retweet lang:en has:links",
  entertainment: "(#entertainment OR #movies OR #TV OR from:variety OR from:deadline) -is:retweet lang:en has:links",
  business: "(#business OR #finance OR #economy OR from:wsj OR from:bloomberg) -is:retweet lang:en has:links",
  science: "(#science OR #space OR #research OR from:sciencealert OR from:nasa) -is:retweet lang:en has:links",
  politics: "(#politics OR #news OR #government OR from:reuters OR from:apnews) -is:retweet lang:en has:links",
};

export function getCategoryXQuery(categoryName: string, fallbackQuery?: string, imagesOnly?: boolean): string {
  const key = categoryName.toLowerCase();
  const base = CATEGORY_QUERIES[key] || fallbackQuery || `(${categoryName}) -is:retweet lang:en`;
  if (imagesOnly) {
    const withImages = base.includes("has:images") ? base : `${base} has:images`;
    return `${withImages} min_faves:10`;
  }
  return base;
}

export async function fetchCategoryNewsFromX(
  category: string,
  query: string,
  limit: number = 10,
  options?: {
    imagesOnly?: boolean;
    allowedAccounts?: string[];
    blockedAccounts?: string[];
    minEngagement?: number;
  }
): Promise<Tweet[]> {
  const xQuery = getCategoryXQuery(category, query, options?.imagesOnly);
  let finalQuery = xQuery;

  if (options?.allowedAccounts && options.allowedAccounts.length > 0) {
    const handles = options.allowedAccounts.map((h) => `from:${h.replace(/^@/, "")}`).join(" OR ");
    finalQuery = `${finalQuery} (${handles})`;
  }

  if (options?.blockedAccounts && options.blockedAccounts.length > 0) {
    const blocked = options.blockedAccounts.map((h) => `-from:${h.replace(/^@/, "")}`).join(" ");
    finalQuery = `${finalQuery} ${blocked}`;
  }

  let tweets = await searchTweets(finalQuery, limit);

  if (options?.minEngagement && options.minEngagement > 0) {
    tweets = tweets.filter((t) => (t.likeCount + t.retweetCount) >= options.minEngagement!);
  }

  return tweets;
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

export async function fetchUserTweets(handle: string, limit: number = 10): Promise<Tweet[]> {
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
      `https://api.twitter.com/2/users/${userId}/tweets?max_results=${Math.min(limit, 100)}&tweet.fields=created_at,public_metrics,attachments&expansions=attachments.media_keys&media.fields=url,preview_image_url,type&exclude=retweets,replies`,
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
        public_metrics?: { like_count: number; retweet_count: number; reply_count: number };
        attachments?: { media_keys?: string[] };
      }>;
      includes?: {
        media?: Array<{
          media_key: string;
          type: string;
          url?: string;
          preview_image_url?: string;
        }>;
      };
      errors?: unknown[];
    };

    if (!tweetsData.data || tweetsData.data.length === 0) {
      setCachedTweets(cacheKey, []);
      return [];
    }

    const mediaMap = new Map<string, string>();
    for (const m of tweetsData.includes?.media ?? []) {
      if (m.type === "photo" && (m.url || m.preview_image_url)) {
        mediaMap.set(m.media_key, m.url ?? m.preview_image_url!);
      }
    }

    const tweets: Tweet[] = tweetsData.data.slice(0, limit).map((t) => {
      const firstKey = t.attachments?.media_keys?.[0];
      const mediaUrl = firstKey ? (mediaMap.get(firstKey) ?? null) : null;
      return {
        id: t.id,
        text: t.text,
        authorId: userId,
        authorName,
        authorHandle: `@${authorHandle}`,
        authorAvatarUrl: authorAvatarUrl ?? null,
        mediaUrl,
        likeCount: t.public_metrics?.like_count ?? 0,
        retweetCount: t.public_metrics?.retweet_count ?? 0,
        replyCount: t.public_metrics?.reply_count ?? 0,
        createdAt: t.created_at ?? new Date().toISOString(),
        url: `https://x.com/${authorHandle}/status/${t.id}`,
      };
    });

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
      `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=${Math.min(Math.max(limit, 10), 100)}&tweet.fields=created_at,public_metrics,author_id,attachments&expansions=author_id,attachments.media_keys&user.fields=name,username,profile_image_url&media.fields=url,preview_image_url,type`,
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
        public_metrics?: { like_count: number; retweet_count: number; reply_count: number };
        attachments?: { media_keys?: string[] };
      }>;
      includes?: {
        users?: Array<{
          id: string;
          name: string;
          username: string;
          profile_image_url?: string;
        }>;
        media?: Array<{
          media_key: string;
          type: string;
          url?: string;
          preview_image_url?: string;
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

    const mediaMap = new Map<string, string>();
    for (const m of data.includes?.media ?? []) {
      if (m.type === "photo" && (m.url || m.preview_image_url)) {
        mediaMap.set(m.media_key, m.url ?? m.preview_image_url!);
      }
    }

    const tweets: Tweet[] = data.data.slice(0, limit).map((t) => {
      const author = userMap.get(t.author_id);
      const firstKey = t.attachments?.media_keys?.[0];
      const mediaUrl = firstKey ? (mediaMap.get(firstKey) ?? null) : null;
      return {
        id: t.id,
        text: t.text,
        authorId: t.author_id,
        authorName: author?.name ?? "Unknown",
        authorHandle: author ? `@${author.username}` : "@unknown",
        authorAvatarUrl: author?.profile_image_url ?? null,
        mediaUrl,
        likeCount: t.public_metrics?.like_count ?? 0,
        retweetCount: t.public_metrics?.retweet_count ?? 0,
        replyCount: t.public_metrics?.reply_count ?? 0,
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
