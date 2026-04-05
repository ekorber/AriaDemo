import { SocialPlatform } from "../types";

export const PLATFORM_COLORS: Record<SocialPlatform, { hex: string; border: boolean }> = {
  instagram: { hex: "#fc4bd6", border: true },
  x: { hex: "#000000", border: true },
  facebook: { hex: "#1877F2", border: false },
  threads: { hex: "#aaaaaa", border: false },
  linkedin: { hex: "#0A66C2", border: true },
};

export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  x: "X",
  facebook: "Facebook",
  threads: "Threads",
  linkedin: "LinkedIn",
};

export const PLATFORM_ABBREVS: Record<SocialPlatform, string> = {
  instagram: "IG",
  x: "X",
  facebook: "FB",
  threads: "TH",
  linkedin: "LI",
};

export const ALL_PLATFORMS: SocialPlatform[] = [
  "instagram", "x", "facebook", "threads", "linkedin",
];

export const IMAGE_PLATFORMS: Set<SocialPlatform> = new Set([
  "instagram", "x", "facebook", "threads", "linkedin",
]);
