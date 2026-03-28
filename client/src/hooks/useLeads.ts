import { useState, useCallback, useEffect } from "react";
import { Lead, LeadStatus } from "../types";

const STORAGE_KEY = "aria-demo-leads";

const SEED_LEADS: Lead[] = [
  {
    id: "seed-1",
    name: "Jordan K.",
    project_type: "6-track EP",
    timeline: "Fall release",
    budget_signal: "high",
    decision_authority: "Artist + manager",
    intent_score: 88,
    conversation_summary:
      "Label-backed artist with a hard deadline for fall release. Discussed full production package including mixing and mastering.",
    hot_signals: ["label-backed", "hard deadline"],
    status: "closed",
    createdAt: new Date("2025-03-20"),
  },
  {
    id: "seed-2",
    name: "Marcus T.",
    project_type: "Single + music video",
    timeline: "8 weeks",
    budget_signal: "medium",
    decision_authority: "Artist",
    intent_score: 72,
    conversation_summary:
      "Returning artist looking to package a single with a music video. Mentioned a potential sync deal that could increase scope.",
    hot_signals: ["returning artist", "sync deal mentioned"],
    status: "handed_off",
    createdAt: new Date("2025-03-22"),
  },
  {
    id: "seed-3",
    name: null,
    project_type: "Mixing only",
    timeline: "Flexible",
    budget_signal: "low",
    decision_authority: "Unknown",
    intent_score: 51,
    conversation_summary:
      "First-time inquiry about mixing services. Budget appears limited but timeline is flexible.",
    hot_signals: ["first studio session"],
    status: "qualified",
    createdAt: new Date("2025-03-25"),
  },
];

function loadLeads(): Lead[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((l: Lead) => ({ ...l, createdAt: new Date(l.createdAt) }));
    }
  } catch {
    // fall through to seed data
  }
  return SEED_LEADS;
}

function saveLeads(leads: Lead[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
}

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>(loadLeads);

  useEffect(() => {
    saveLeads(leads);
  }, [leads]);

  const startChat = useCallback(() => {
    const lead: Lead = {
      id: crypto.randomUUID(),
      name: null,
      project_type: "",
      timeline: "",
      budget_signal: "low",
      decision_authority: "",
      intent_score: 0,
      conversation_summary: "Chat in progress…",
      hot_signals: [],
      status: "active",
      createdAt: new Date(),
    };
    setLeads((prev) => [...prev, lead]);
    return lead.id;
  }, []);

  const updateLead = useCallback((id: string, fields: Partial<Lead>) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...fields } : l))
    );
  }, []);

  const promoteToHandoff = useCallback(
    (activeChatId: string, lead: Omit<Lead, "id" | "status" | "createdAt">) => {
      setLeads((prev) =>
        prev.map((l) =>
          l.id === activeChatId
            ? { ...l, ...lead, status: "handed_off" as LeadStatus }
            : l
        )
      );
    },
    []
  );

  const moveLead = useCallback((id: string, status: LeadStatus) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status } : l))
    );
  }, []);

  return { leads, startChat, updateLead, promoteToHandoff, moveLead };
}
