export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export type LeadStatus = "active" | "qualified" | "handed_off" | "closed";

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

export type IntentPhase = "open" | "qualify" | "build" | "handoff";

export interface ScoreUpdate {
  score: number;
  phase: IntentPhase;
  name?: string | null;
  project_type?: string;
  timeline?: string;
  budget_signal?: "low" | "medium" | "high";
}
