export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export type LeadStatus = "active" | "qualified" | "unqualified" | "handed_off" | "closed";

export interface Lead {
  id: string;
  name: string | null;
  project_type: string;
  timeline: string;
  budget_signal: "low" | "medium" | "high";
  decision_authority: string;
  intent_score: number;
  conversation_summary: string;
  hot_signals: string[];
  status: LeadStatus;
  createdAt: Date;
}

export type IntentPhase = "open" | "qualify" | "build" | "handoff" | "disqualified";

export type SocialPlatform = "instagram" | "tiktok" | "x" | "facebook" | "youtube_shorts" | "threads" | "linkedin";

export type CampaignTone = string;

export interface SocialPost {
  id: string;
  platform: SocialPlatform;
  hook: string;
  caption: string;
  reviewReady: boolean;
  approved: boolean;
  scheduledDate: string | null;
  scheduledTime: string | null;  // "15:00" format or null
}

export interface Campaign {
  id: string;
  leadId: string;
  clientName: string;
  projectType: string;
  brief: string;
  tone: CampaignTone;
  socialPosts: SocialPost[];
  createdAt: Date;
}

export interface ContentOutput {
  campaignId?: string;
  socialPosts: SocialPost[];
}

export interface ScoreUpdate {
  score: number;
  phase: IntentPhase;
  name?: string | null;
  project_type?: string;
  timeline?: string;
  budget_signal?: "low" | "medium" | "high";
}
