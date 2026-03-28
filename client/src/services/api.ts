import { Lead, Message } from "../types";

const BASE = "/api";

interface LeadResponse {
  id: string;
  name: string | null;
  project_type: string;
  timeline: string;
  budget_signal: "low" | "medium" | "high";
  decision_authority: string;
  intent_score: number;
  conversation_summary: string;
  hot_signals: string[];
  status: Lead["status"];
  created_at: string;
}

function toLead(r: LeadResponse): Lead {
  return {
    id: r.id,
    name: r.name,
    project_type: r.project_type,
    timeline: r.timeline,
    budget_signal: r.budget_signal,
    decision_authority: r.decision_authority,
    intent_score: r.intent_score,
    conversation_summary: r.conversation_summary,
    hot_signals: r.hot_signals,
    status: r.status,
    createdAt: new Date(r.created_at),
  };
}

interface MessageResponse {
  id: string;
  lead_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

function toMessage(r: MessageResponse): Message {
  return {
    id: r.id,
    role: r.role,
    content: r.content,
    createdAt: new Date(r.created_at),
  };
}

export async function fetchLeads(): Promise<Lead[]> {
  const res = await fetch(`${BASE}/leads/`);
  const data: LeadResponse[] = await res.json();
  return data.map(toLead);
}

export async function createLead(fields?: Partial<Lead>): Promise<Lead> {
  const res = await fetch(`${BASE}/leads/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields ?? {}),
  });
  const data: LeadResponse = await res.json();
  return toLead(data);
}

export async function updateLead(
  id: string,
  fields: Partial<Lead>
): Promise<Lead> {
  const res = await fetch(`${BASE}/leads/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  const data: LeadResponse = await res.json();
  return toLead(data);
}

export async function deleteLead(id: string): Promise<void> {
  await fetch(`${BASE}/leads/${id}/`, { method: "DELETE" });
}

export async function fetchMessages(leadId: string): Promise<Message[]> {
  const res = await fetch(`${BASE}/leads/${leadId}/messages/`);
  const data: MessageResponse[] = await res.json();
  return data.map(toMessage);
}

export async function createMessage(
  leadId: string,
  role: "user" | "assistant",
  content: string
): Promise<void> {
  await fetch(`${BASE}/leads/${leadId}/messages/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, content }),
  });
}
