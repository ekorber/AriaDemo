import { Lead, LeadStatus } from "../types";
import { LeadCard } from "./LeadCard";

const COLUMNS: { status: LeadStatus; label: string }[] = [
  { status: "active", label: "Current Chats" },
  { status: "qualified", label: "Current Chats - Qualified" },
  { status: "unqualified", label: "Unqualified" },
  { status: "handed_off", label: "Handed Off" },
  { status: "closed", label: "Closed" },
];

interface PipelineViewProps {
  leads: Lead[];
  onMove: (id: string, status: LeadStatus) => void;
}

export function PipelineView({ leads, onMove }: PipelineViewProps) {
  return (
    <div className="flex-1 flex overflow-hidden bg-zinc-950">
      {COLUMNS.map((col, i) => {
        const columnLeads = leads.filter((l) => l.status === col.status);
        return (
          <div
            key={col.status}
            className={`flex-1 flex flex-col overflow-hidden ${
              i < COLUMNS.length - 1 ? "border-r border-zinc-800" : ""
            }`}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
              <span className="text-sm font-medium text-zinc-300">
                {col.label}
              </span>
              <span className="bg-zinc-800 text-zinc-400 text-xs rounded-full px-2 py-0.5">
                {columnLeads.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {columnLeads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} onMove={onMove} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
