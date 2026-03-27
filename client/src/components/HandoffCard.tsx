import { useState, useEffect } from "react";
import { Lead } from "../types";

interface HandoffCardProps {
  lead: Lead;
}

const budgetColors: Record<string, string> = {
  low: "bg-red-500/20 text-red-400 border-red-500/30",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  high: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

export function HandoffCard({ lead }: HandoffCardProps) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!revealed) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-3">
        <div className="w-6 h-6 border-2 border-zinc-500 border-t-emerald-400 rounded-full animate-spin" />
        <p className="text-sm text-zinc-400 animate-pulse">
          Connecting you with Marcus...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 space-y-3 animate-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-100">Lead Summary</h3>
        <span
          className={`text-xs px-2 py-0.5 rounded-full border ${budgetColors[lead.budget_signal]}`}
        >
          {lead.budget_signal} budget
        </span>
      </div>

      {lead.name && (
        <p className="text-xs text-zinc-400">
          <span className="text-zinc-500">Name:</span> {lead.name}
        </p>
      )}

      <p className="text-xs text-zinc-400">
        <span className="text-zinc-500">Project:</span> {lead.project_type}
      </p>

      <p className="text-xs text-zinc-400">
        <span className="text-zinc-500">Timeline:</span> {lead.timeline}
      </p>

      <p className="text-xs text-zinc-400">
        <span className="text-zinc-500">Decision:</span> {lead.decision_authority}
      </p>

      <p className="text-xs text-zinc-300 leading-relaxed">
        {lead.conversation_summary}
      </p>

      {lead.hot_signals.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {lead.hot_signals.map((signal, i) => (
            <span
              key={i}
              className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md"
            >
              {signal}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
