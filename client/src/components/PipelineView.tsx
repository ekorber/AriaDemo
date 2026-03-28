import { useState, DragEvent } from "react";
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
  const [dragOver, setDragOver] = useState<LeadStatus | null>(null);

  const handleDragOver = (e: DragEvent, status: LeadStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(status);
  };

  const handleDragLeave = () => {
    setDragOver(null);
  };

  const handleDrop = (e: DragEvent, status: LeadStatus) => {
    e.preventDefault();
    setDragOver(null);
    const leadId = e.dataTransfer.getData("text/plain");
    if (leadId) {
      onMove(leadId, status);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-zinc-950">
      {COLUMNS.map((col, i) => {
        const columnLeads = leads.filter((l) => l.status === col.status);
        const isOver = dragOver === col.status;
        return (
          <div
            key={col.status}
            onDragOver={(e) => handleDragOver(e, col.status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.status)}
            className={`flex-1 flex flex-col overflow-hidden transition-colors ${
              i < COLUMNS.length - 1 ? "border-r border-zinc-800" : ""
            } ${isOver ? "bg-zinc-900/50" : ""}`}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
              <span className="text-sm font-medium text-zinc-300">
                {col.label}
              </span>
              <span className="bg-zinc-800 text-zinc-400 text-xs rounded-full px-2 py-0.5">
                {columnLeads.length}
              </span>
            </div>
            <div className={`flex-1 overflow-y-auto p-3 transition-colors ${isOver ? "bg-zinc-800/20" : ""}`}>
              {columnLeads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
