import { Lead } from "../types";

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
  selected?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
  prospectNoun?: string;
}

export function LeadCard({ lead, selected, onClick, onDelete, prospectNoun = "contact" }: LeadCardProps) {
  const level = scoreLevel(lead.intent_score);

  return (
    <div
      data-lead-card
      draggable
      onClick={onClick}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", lead.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={`bg-zinc-900 border rounded-xl p-3 mb-2 transition-colors cursor-pointer hover:border-zinc-600 hover:bg-zinc-800/50 active:cursor-grabbing ${
        selected ? "border-zinc-500 bg-zinc-800/40" : "border-zinc-800"
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-zinc-100">
          {lead.name || `Unknown ${prospectNoun}`}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">{lead.project_type}</span>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-zinc-600 hover:text-red-400 transition-colors text-sm leading-none"
              title="Delete lead"
            >
              &times;
            </button>
          )}
        </div>
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
        <div className="flex flex-wrap gap-1">
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

    </div>
  );
}
