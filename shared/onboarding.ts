export interface OnboardingTaskDef {
  key: string;
  label: string;
  bonusSparks: number;
}

export const ONBOARDING_TASKS: OnboardingTaskDef[] = [
  { key: "hasAvatar", label: "Add a profile photo", bonusSparks: 25 },
  { key: "hasBio", label: "Write a bio", bonusSparks: 25 },
  { key: "hasPost", label: "Make your first post", bonusSparks: 25 },
  { key: "hasFollow", label: "Follow someone", bonusSparks: 25 },
  { key: "hasSocialLink", label: "Connect a social link", bonusSparks: 25 },
  { key: "hasSparkedPost", label: "Spark a Post", bonusSparks: 25 },
  { key: "hasSparkedArticle", label: "Spark an Article", bonusSparks: 25 },
  { key: "hasSparkedTrack", label: "Spark a Song", bonusSparks: 25 },
];

export const ONBOARDING_TASK_LABELS: Record<string, string> = Object.fromEntries(
  ONBOARDING_TASKS.map((t) => [t.key, t.label]),
);

export const ONBOARDING_TASK_KEYS = ONBOARDING_TASKS.map((t) => t.key);

export type OnboardingTaskKey = (typeof ONBOARDING_TASKS)[number]["key"];
