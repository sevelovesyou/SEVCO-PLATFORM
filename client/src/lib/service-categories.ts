import {
  Code2, Sparkles, Megaphone, HeadphonesIcon, Server, Shield,
} from "lucide-react";

export interface ServiceCategoryMeta {
  slug: string;
  label: string;
  tagline: string;
  icon: React.ElementType;
  iconKey: string;
  accentText: string;
  accentBg: string;
  accentBorder: string;
}

export const SERVICE_CATEGORIES: ServiceCategoryMeta[] = [
  {
    slug: "creative",
    label: "Creative",
    tagline: "Brand identity, UI/UX, and creative direction",
    icon: Sparkles,
    iconKey: "Creative",
    accentText: "text-blue-600 dark:text-blue-400",
    accentBg: "bg-blue-600/8",
    accentBorder: "border-blue-600/20",
  },
  {
    slug: "technology",
    label: "Technology",
    tagline: "Platform development, APIs, and technical consulting",
    icon: Code2,
    iconKey: "Technology",
    accentText: "text-blue-600 dark:text-blue-400",
    accentBg: "bg-blue-500/8",
    accentBorder: "border-blue-500/20",
  },
  {
    slug: "marketing",
    label: "Marketing",
    tagline: "Content strategy, social media, and growth consulting",
    icon: Megaphone,
    iconKey: "Marketing",
    accentText: "text-red-700 dark:text-red-500",
    accentBg: "bg-red-700/8",
    accentBorder: "border-red-700/20",
  },
  {
    slug: "teams",
    label: "Teams",
    tagline: "Dedicated support and team augmentation",
    icon: HeadphonesIcon,
    iconKey: "Support",
    accentText: "text-pink-600 dark:text-pink-400",
    accentBg: "bg-pink-500/8",
    accentBorder: "border-pink-500/20",
  },
  {
    slug: "infrastructure",
    label: "Infrastructure",
    tagline: "Hosting, domains, and cloud infrastructure",
    icon: Server,
    iconKey: "Infrastructure",
    accentText: "text-teal-600 dark:text-teal-400",
    accentBg: "bg-teal-500/8",
    accentBorder: "border-teal-500/20",
  },
  {
    slug: "security",
    label: "Security",
    tagline: "Audits, compliance, and protection services",
    icon: Shield,
    iconKey: "Security",
    accentText: "text-violet-600 dark:text-violet-400",
    accentBg: "bg-violet-500/8",
    accentBorder: "border-violet-500/20",
  },
];

export const SERVICE_CATEGORY_MAP = Object.fromEntries(
  SERVICE_CATEGORIES.map((c) => [c.slug, c])
) as Record<string, ServiceCategoryMeta>;
