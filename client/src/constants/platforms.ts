import { SocialPlatform } from "../types";

export const PLATFORM_COLORS: Record<SocialPlatform, { hex: string; border: boolean }> = {
  instagram: { hex: "#fc4bd6", border: true },
  tiktok: { hex: "#690089", border: true },
  x: { hex: "#000000", border: true },
  facebook: { hex: "#1877F2", border: false },
  youtube_shorts: { hex: "#FF0000", border: false },
  threads: { hex: "#aaaaaa", border: false },
};

export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X",
  facebook: "Facebook",
  youtube_shorts: "YouTube Shorts",
  threads: "Threads",
};

export const PLATFORM_ABBREVS: Record<SocialPlatform, string> = {
  instagram: "IG",
  tiktok: "TT",
  x: "X",
  facebook: "FB",
  youtube_shorts: "YT",
  threads: "TH",
};

export const ALL_PLATFORMS: SocialPlatform[] = [
  "instagram", "tiktok", "x", "facebook", "youtube_shorts", "threads",
];
