import { storage } from "./storage";
import { db } from "./db";
import { articles } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seedDatabase() {
  const [existing] = await db.select({ count: sql<number>`count(*)::int` }).from(articles);
  if (existing.count > 0) return;

  console.log("Seeding database with SEVE wiki content...");

  const catArtist = await storage.createCategory({ name: "Artists", slug: "artist", description: "Profiles of artists and collaborators", icon: "user" });
  const catMusic = await storage.createCategory({ name: "Music", slug: "music", description: "Songs, singles, and musical releases", icon: "music" });
  const catAlbums = await storage.createCategory({ name: "Albums", slug: "albums", description: "Album releases and collections", icon: "disc" });
  const catMerch = await storage.createCategory({ name: "Merchandise", slug: "merchandise", description: "Official SEVCO merchandise and apparel", icon: "shopping-bag" });
  const catGeneral = await storage.createCategory({ name: "General", slug: "general", description: "General information about SEVCO Records", icon: "globe" });

  const artSeve = await storage.createArticle({
    title: "SEVE",
    slug: "seve",
    content: `## Overview

SEVE is an independent recording artist and the creative force behind SEVCO Records. Known for a distinctive blend of alternative R&B, electronic, and experimental sounds, SEVE has built a dedicated following through authentic artistry and a strong digital presence at sevelovesyou.com.

## Musical Style

SEVE's music is characterized by atmospheric production, emotive vocals, and introspective lyricism. Drawing from genres including R&B, electronic, lo-fi, and alternative pop, the sound creates an immersive sonic experience that has been described as both intimate and expansive.

## Career

SEVE has released multiple singles across major streaming platforms including Spotify, Apple Music, and SoundCloud. Notable releases include "Hanna Montana," "Son of a Gun," "The Crown," "Swoon," and "Selfless." Each release showcases artistic growth and sonic experimentation.

## SEVCO Records

SEVCO Records is the independent label founded by SEVE, operating as both a creative vehicle and brand. The label handles music distribution, merchandise production, and brand partnerships. SEVCO has expanded beyond music into fashion with a range of apparel and accessories.

## Online Presence

SEVE maintains an active presence across streaming platforms and social media. The official website sevelovesyou.com serves as the central hub for music, merchandise, and fan engagement.`,
    summary: "SEVE is an independent recording artist and founder of SEVCO Records, known for atmospheric R&B and electronic music.",
    categoryId: catArtist.id,
    status: "published",
    infoboxType: "artist",
    infoboxData: {
      "Real Name": "SEVE",
      "Also Known As": "sevelovesyou",
      "Genre": "Alternative R&B, Electronic, Lo-fi",
      "Label": "SEVCO Records",
      "Website": "https://sevelovesyou.com",
      "Spotify": "https://open.spotify.com/artist/seve",
      "Active Since": "2020",
    },
    tags: ["seve", "artist", "sevco", "rnb", "electronic", "independent"],
  });

  const artHannaMontana = await storage.createArticle({
    title: "Hanna Montana (Song)",
    slug: "hanna-montana",
    content: `## Overview

"Hanna Montana" is a single by SEVE, released through SEVCO Records. The track represents one of SEVE's most prominent releases, showcasing the artist's signature blend of melodic hooks and atmospheric production.

## Production

The song features layered synths, crisp percussion, and SEVE's distinctive vocal delivery. The production draws from contemporary R&B and electronic influences while maintaining an intimate, personal quality.

## Release

"Hanna Montana" is available on all major streaming platforms including Spotify, Apple Music, and SoundCloud. The track has been well-received by listeners and has contributed to building SEVE's growing fanbase.

## Reception

The song has garnered positive attention for its catchy melodies and polished production quality. It exemplifies the artistic direction of SEVCO Records and SEVE's commitment to creating memorable, emotionally resonant music.`,
    summary: "\"Hanna Montana\" is a single by SEVE featuring atmospheric R&B production and melodic vocals.",
    categoryId: catMusic.id,
    status: "published",
    infoboxType: "song",
    infoboxData: {
      "Artist": "SEVE",
      "Label": "SEVCO Records",
      "Genre": "Alternative R&B",
      "Format": "Digital Single",
      "Spotify": "https://open.spotify.com/track/68YiCcW3bfw7B2IySNxKwi",
      "Apple Music": "https://music.apple.com/us/album/hanna-montana/1857303286",
    },
    tags: ["hanna-montana", "single", "seve", "rnb", "sevco-records"],
  });

  const artSonOfAGun = await storage.createArticle({
    title: "Son of a Gun",
    slug: "son-of-a-gun",
    content: `## Overview

"Son of a Gun" is a single by SEVE, released as part of the SEVCO Records catalog. The track showcases a more aggressive and energetic side of SEVE's artistry.

## Musical Style

The song incorporates harder-hitting beats with SEVE's characteristic vocal style. It blends elements of hip-hop production with electronic textures, creating a dynamic listening experience.

## Streaming

Available on Spotify, Apple Music, and SoundCloud, "Son of a Gun" is part of SEVE's expanding discography of singles that explore different sonic territories.`,
    summary: "\"Son of a Gun\" is an energetic single by SEVE blending hip-hop and electronic production.",
    categoryId: catMusic.id,
    status: "published",
    infoboxType: "song",
    infoboxData: {
      "Artist": "SEVE",
      "Label": "SEVCO Records",
      "Genre": "Alternative Hip-Hop / Electronic",
      "Format": "Digital Single",
      "Spotify": "https://open.spotify.com/track/2ptXqtMqUexqYM619OIuj6",
      "Apple Music": "https://music.apple.com/us/album/son-of-a-gun/1646800349",
    },
    tags: ["son-of-a-gun", "single", "seve", "hip-hop", "electronic"],
  });

  const artTheCrown = await storage.createArticle({
    title: "The Crown",
    slug: "the-crown",
    content: `## Overview

"The Crown" is a single by SEVE that represents a bold artistic statement. The track carries themes of ambition, perseverance, and self-belief.

## Production

Featuring polished production with layered instrumentation, "The Crown" balances vulnerability with confidence. The sonic landscape combines smooth R&B elements with modern electronic production.

## Significance

"The Crown" stands as one of SEVE's most thematically ambitious releases, exploring ideas of legacy and artistic purpose within the independent music landscape.`,
    summary: "\"The Crown\" is a thematically ambitious single by SEVE exploring ambition and artistic legacy.",
    categoryId: catMusic.id,
    status: "published",
    infoboxType: "song",
    infoboxData: {
      "Artist": "SEVE",
      "Label": "SEVCO Records",
      "Genre": "R&B / Electronic",
      "Format": "Digital Single",
      "Spotify": "https://open.spotify.com/track/6JWnFf44K70A38z8yMUGQK",
      "Apple Music": "https://music.apple.com/us/album/the-crown/1701345448",
    },
    tags: ["the-crown", "single", "seve", "rnb", "sevco-records"],
  });

  const artVault = await storage.createArticle({
    title: "Vault (Album)",
    slug: "vault-album",
    content: `## Overview

"Vault" is a collection by SEVE released through SEVCO Records. The project compiles tracks that showcase the breadth and depth of SEVE's musical vision. A vinyl edition was also produced, making it one of SEVE's most significant physical releases.

## Track Listing

The Vault project encompasses a curated selection of SEVE's work, presented as a cohesive listening experience. The collection spans multiple sonic palettes while maintaining the signature SEVCO aesthetic.

## Physical Release

A vinyl edition of Vault was produced and made available through the official website, representing SEVE's commitment to quality and tangible music experiences. The vinyl release was handled through Elastic Stage.

## Legacy

The Vault project serves as both an archival effort and a statement of artistic intent, showing the range and evolution of SEVE's craft from early recordings through present day.`,
    summary: "\"Vault\" is a curated collection by SEVE available on vinyl and digital, showcasing the artist's full range.",
    categoryId: catAlbums.id,
    status: "published",
    infoboxType: "album",
    infoboxData: {
      "Artist": "SEVE",
      "Label": "SEVCO Records",
      "Format": "Vinyl / Digital",
      "Type": "Collection",
      "Vinyl": "https://elasticstage.com/soundcloud/releases/seve-vault-album",
      "SoundCloud": "https://soundcloud.com/sevelovesu/sets/vault",
    },
    tags: ["vault", "album", "collection", "vinyl", "seve", "sevco-records"],
  });

  const artSevcoRecords = await storage.createArticle({
    title: "SEVCO Records",
    slug: "sevco-records",
    content: `## Overview

SEVCO Records is an independent record label and creative brand founded by SEVE. The label operates as the primary vehicle for SEVE's musical releases and brand extensions, including merchandise and fashion.

## Mission

SEVCO Records is built on the principle of artistic independence and creative freedom. The label handles all aspects of music production, distribution, and brand management without major label involvement.

## Merchandise

SEVCO has expanded into fashion and merchandise, offering a range of products including hoodies, t-shirts, sweatshirts, snapback caps, and sweatpants. The merchandise line features bold branding and is available through the official sevelovesyou.com storefront.

## Products

Notable merchandise items include:
- SEVCO Planet Mock-Neck Sweatshirt ($43)
- SEVCO Records Basic Hoodie ($27)
- SEVCO Records Promo Shirts in Red and Blue ($11 each)
- SEVCO Planet Snapback ($28)
- SEVCO Planet Surf Cap ($25)
- SEVCO Planet Fade Sweats ($44)
- SEVCO Basic Long Sleeve (various prices)

## Distribution

Music is distributed across all major streaming platforms including Spotify, Apple Music, and SoundCloud. Physical releases like the Vault vinyl are handled through partners like Elastic Stage.`,
    summary: "SEVCO Records is the independent label and creative brand behind SEVE's music, merchandise, and artistic vision.",
    categoryId: catGeneral.id,
    status: "published",
    infoboxType: "general",
    infoboxData: {
      "Founded By": "SEVE",
      "Type": "Independent Record Label",
      "Website": "https://sevelovesyou.com",
      "Products": "Music, Merchandise, Fashion",
      "Distribution": "Spotify, Apple Music, SoundCloud",
    },
    tags: ["sevco", "record-label", "independent", "merchandise", "fashion"],
  });

  const artMerch = await storage.createArticle({
    title: "SEVCO Merchandise",
    slug: "sevco-merchandise",
    content: `## Overview

SEVCO Records offers an extensive line of merchandise and apparel through the official sevelovesyou.com online store. The merchandise features the SEVCO and SEVCO Planet branding across a variety of clothing items and accessories.

## Product Lines

### Outerwear
- SEVCO Planet Mock-Neck Sweatshirt - A premium mock-neck design priced at $43
- SEVCO Records Basic Hoodie - Available in multiple colors at $27
- SEVCO Basic Long Sleeve - Extended sleeve options at various price points

### T-Shirts
- SEVCO Records Promo Shirt (Red) - Classic promotional design at $11
- SEVCO Records Promo Shirt (Blue) - Blue colorway variant at $11

### Bottoms
- SEVCO Planet Fade Sweats - Gradient fade design at $44

### Accessories
- SEVCO Planet Snapback - Structured snapback cap at $28
- SEVCO Planet Surf Cap - Relaxed fit surf-style cap at $25

## Branding

The merchandise line features the distinctive SEVCO and SEVCO Planet logos. The "Planet" sub-brand focuses on streetwear-inspired designs with bold graphic elements.

## Availability

All merchandise is available exclusively through the official website at sevelovesyou.com, with shipping available to various locations.`,
    summary: "Official SEVCO merchandise line including hoodies, shirts, hats, and sweats available at sevelovesyou.com.",
    categoryId: catMerch.id,
    status: "published",
    infoboxType: "merchandise",
    infoboxData: {
      "Brand": "SEVCO Records / SEVCO Planet",
      "Shop": "https://sevelovesyou.com",
      "Categories": "Outerwear, T-Shirts, Bottoms, Accessories",
      "Price Range": "$11 - $44",
    },
    tags: ["merchandise", "fashion", "streetwear", "sevco-planet", "apparel"],
  });

  for (const art of [artSeve, artHannaMontana, artSonOfAGun, artTheCrown, artVault, artSevcoRecords, artMerch]) {
    await storage.createRevision({
      articleId: art.id,
      content: art.content,
      infoboxData: art.infoboxData,
      summary: art.summary,
      editSummary: "Initial article creation",
      status: "approved",
      authorName: "Wiki Admin",
    });
  }

  await storage.createCitation({
    articleId: artSeve.id,
    url: "https://sevelovesyou.com",
    title: "Official SEVE Website",
    format: "APA",
    text: "SEVE. (2024). Official Website. sevelovesyou.com. Retrieved from https://sevelovesyou.com",
    isValid: true,
  });

  await storage.createCitation({
    articleId: artSeve.id,
    url: "https://open.spotify.com/artist/seve",
    title: "SEVE on Spotify",
    format: "APA",
    text: "SEVE. (2024). Artist Profile. Spotify. Retrieved from https://open.spotify.com/artist/seve",
    isValid: true,
  });

  await storage.createCitation({
    articleId: artHannaMontana.id,
    url: "https://open.spotify.com/track/68YiCcW3bfw7B2IySNxKwi",
    title: "Hanna Montana on Spotify",
    format: "APA",
    text: "SEVE. (2024). Hanna Montana [Song]. SEVCO Records. Spotify.",
    isValid: true,
  });

  await storage.createCitation({
    articleId: artVault.id,
    url: "https://elasticstage.com/soundcloud/releases/seve-vault-album",
    title: "Vault Vinyl Release",
    format: "APA",
    text: "SEVE. (2024). Vault [Vinyl]. SEVCO Records. Elastic Stage.",
    isValid: true,
  });

  await storage.createCitation({
    articleId: artSevcoRecords.id,
    url: "https://sevelovesyou.com",
    title: "SEVCO Records Official",
    format: "APA",
    text: "SEVCO Records. (2024). Official Brand Page. sevelovesyou.com.",
    isValid: true,
  });

  await storage.createRevision({
    articleId: artSeve.id,
    content: artSeve.content + "\n\n## Upcoming Projects\n\nSEVE has hinted at new material in development.",
    infoboxData: artSeve.infoboxData,
    summary: artSeve.summary,
    editSummary: "Added section about upcoming projects",
    status: "pending",
    authorName: "Contributor",
  });

  await storage.createRevision({
    articleId: artSevcoRecords.id,
    content: artSevcoRecords.content + "\n\n## Partnerships\n\nSEVCO Records has explored collaborations with independent distributors.",
    infoboxData: artSevcoRecords.infoboxData,
    summary: artSevcoRecords.summary,
    editSummary: "Added information about label partnerships",
    status: "pending",
    authorName: "MusicFan42",
  });

  for (const art of [artSeve, artHannaMontana, artSonOfAGun, artTheCrown, artVault, artSevcoRecords, artMerch]) {
    try {
      await generateCrosslinksForSeed(art.id);
    } catch (e) {
      console.log(`Crosslink generation skipped for ${art.title}`);
    }
  }

  console.log("Database seeded successfully with 7 articles, citations, and crosslinks.");
}

async function generateCrosslinksForSeed(articleId: number) {
  const allArticles = await storage.getArticles();
  const sourceArticle = allArticles.find((a) => a.id === articleId);
  if (!sourceArticle) return;

  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "was", "are", "were", "be", "been",
    "have", "has", "had", "do", "does", "did", "will", "would", "it", "its",
    "this", "that", "these", "those", "he", "she", "they", "we", "not", "as",
  ]);

  function getKeywords(text: string): string[] {
    const words = text.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));
    const freq: Record<string, number> = {};
    words.forEach((w) => { freq[w] = (freq[w] || 0) + 1; });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([word]) => word);
  }

  const sourceText = `${sourceArticle.title} ${sourceArticle.content} ${sourceArticle.summary || ""} ${(sourceArticle.tags || []).join(" ")}`;
  const sourceKeywords = getKeywords(sourceText);

  for (const target of allArticles) {
    if (target.id === articleId) continue;
    const targetText = `${target.title} ${target.content} ${target.summary || ""} ${(target.tags || []).join(" ")}`;
    const targetKeywords = getKeywords(targetText);
    const shared = sourceKeywords.filter((k) => targetKeywords.includes(k));
    if (shared.length >= 2) {
      const score = Math.min(shared.length / 10, 1);
      await storage.createCrosslink({
        sourceArticleId: articleId,
        targetArticleId: target.id,
        relevanceScore: score,
        sharedKeywords: shared.slice(0, 6),
      });
    }
  }
}
