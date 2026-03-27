import { Lead, LeadStatus } from "../types";

const MOVE_OPTIONS: Partial<Record<LeadStatus, { status: LeadStatus; label: string }[]>> = {
  active: [{ status: "qualified", label: "Qualified" }],
  qualified: [{ status: "handed_off", label: "Handed Off" }],
  unqualified: [
    { status: "active", label: "Current Chats" },
    { status: "qualified", label: "Qualified" },
  ],
  handed_off: [{ status: "closed", label: "Closed" }],
};

const BUDGET_COLORS: Record<string, string> = {
  high: "bg-emerald-400",
  medium: "bg-amber-400",
  low: "bg-red-400",
};

const SCORE_COLORS: Record<string, string> = {
  high: "bg-emerald-500",
  medium: "bg-amber-500",
  low: "bg-red-500",
};

function scoreLevel(score: number) {
  if (score >= 65) return "high";
  if (score >= 35) return "medium";
  return "low";
}

interface LeadCardProps {
  lead: Lead;
  onMove: (id: string, status: LeadStatus) => void;
}

export function LeadCard({ lead, onMove }: LeadCardProps) {
  const options = MOVE_OPTIONS[lead.status] ?? [];
  const level = scoreLevel(lead.intent_score);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 mb-2 hover:border-zinc-700 transition-colors">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-zinc-100">
          {lead.name || "Unknown artist"}
        </span>
        <span className="text-xs text-zinc-500">{lead.project_type}</span>
      </div>

      <div className="text-xs text-zinc-400 mb-2">{lead.timeline}</div>

      {/* Budget signal */}
      <div className="flex items-center gap-1.5 mb-2">
        <span className={`w-2 h-2 rounded-full ${BUDGET_COLORS[lead.budget_signal]}`} />
        <span className="text-xs text-zinc-400 capitalize">{lead.budget_signal} budget</span>
      </div>

      {/* Intent score bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs text-zinc-500">Intent</span>
          <span className="text-xs text-zinc-500">{lead.intent_score}</span>
        </div>
        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${SCORE_COLORS[level]}`}
            style={{ width: `${lead.intent_score}%` }}
          />
        </div>
      </div>

      {/* Summary */}
      <p className="text-xs text-zinc-500 mb-2 line-clamp-2">
        {lead.conversation_summary}
      </p>

      {/* Hot signals */}
      {lead.hot_signals.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {lead.hot_signals.map((signal) => (
            <span
              key={signal}
              className="text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded"
            >
              {signal}
            </span>
          ))}
        </div>
      )}

      {/* Move actions */}
      {options.length > 0 && (
        <div className="flex gap-1">
          {options.map((opt) => (
            <button
              key={opt.status}
              onClick={() => onMove(lead.id, opt.status)}
              className="flex-1 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-750 rounded-lg py-1.5 transition-colors"
            >
              Move to → {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
