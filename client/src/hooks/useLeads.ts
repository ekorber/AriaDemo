import { useState, useCallback, useEffect } from "react";
import { Lead, LeadStatus } from "../types";
import * as api from "../services/api";

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    api.fetchLeads().then(setLeads).catch(console.error);
  }, []);

  const startChat = useCallback(async (): Promise<string> => {
    const lead = await api.createLead();
    setLeads((prev) => [lead, ...prev]);
    return lead.id;
  }, []);

  const updateLead = useCallback(
    async (id: string, fields: Partial<Lead>) => {
      const updated = await api.updateLead(id, fields);
      setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
    },
    []
  );

  const promoteToHandoff = useCallback(
    async (
      activeChatId: string,
      lead: Omit<Lead, "id" | "status" | "createdAt">
    ) => {
      const updated = await api.updateLead(activeChatId, {
        ...lead,
        status: "handed_off" as LeadStatus,
      });
      setLeads((prev) =>
        prev.map((l) => (l.id === activeChatId ? updated : l))
      );
    },
    []
  );

  const moveLead = useCallback(async (id: string, status: LeadStatus) => {
    const updated = await api.updateLead(id, { status });
    setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
  }, []);

  return { leads, startChat, updateLead, promoteToHandoff, moveLead };
}
