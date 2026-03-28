import { useEffect, useState } from "react";
import { Lead, Message } from "../types";
import { fetchMessages } from "../services/api";

const BUDGET_COLORS: Record<string, string> = {
  high: "text-emerald-400",
  medium: "text-amber-400",
  low: "text-red-400",
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

interface LeadDetailSidebarProps {
  lead: Lead;
  onClose: () => void;
}

export function LeadDetailSidebar({ lead, onClose }: LeadDetailSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchMessages(lead.id)
      .then(setMessages)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [lead.id]);

  const level = scoreLevel(lead.intent_score);

  return (
    <div className="w-[420px] flex-shrink-0 border-l border-zinc-800 bg-zinc-950 flex flex-col overflow-hidden animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-100">
          {lead.name || "Unknown artist"}
        </h2>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-300 transition-colors text-lg leading-none"
        >
          &times;
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Lead details */}
        <div className="px-5 py-4 space-y-4 border-b border-zinc-800">
          {/* Status badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded capitalize">
              {lead.status.replace("_", " ")}
            </span>
            <span className="text-xs text-zinc-500">
              {lead.createdAt.toLocaleDateString()}
            </span>
          </div>

          {/* Intent score */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-zinc-500">Intent Score</span>
              <span className="text-sm font-medium text-zinc-200">{lead.intent_score}</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${SCORE_COLORS[level]}`}
                style={{ width: `${lead.intent_score}%` }}
              />
            </div>
          </div>

          {/* Detail grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-xs text-zinc-500 block mb-0.5">Project</span>
              <span className="text-sm text-zinc-200">{lead.project_type || "—"}</span>
            </div>
            <div>
              <span className="text-xs text-zinc-500 block mb-0.5">Timeline</span>
              <span className="text-sm text-zinc-200">{lead.timeline || "—"}</span>
            </div>
            <div>
              <span className="text-xs text-zinc-500 block mb-0.5">Budget</span>
              <span className={`text-sm capitalize ${BUDGET_COLORS[lead.budget_signal]}`}>
                {lead.budget_signal}
              </span>
            </div>
            <div>
              <span className="text-xs text-zinc-500 block mb-0.5">Decision</span>
              <span className="text-sm text-zinc-200">{lead.decision_authority || "—"}</span>
            </div>
          </div>

          {/* Summary */}
          <div>
            <span className="text-xs text-zinc-500 block mb-1">Summary</span>
            <p className="text-sm text-zinc-300 leading-relaxed">
              {lead.conversation_summary}
            </p>
          </div>

          {/* Hot signals */}
          {lead.hot_signals.length > 0 && (
            <div>
              <span className="text-xs text-zinc-500 block mb-1">Signals</span>
              <div className="flex flex-wrap gap-1.5">
                {lead.hot_signals.map((signal) => (
                  <span
                    key={signal}
                    className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded"
                  >
                    {signal}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chat history */}
        <div className="px-5 py-4">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider block mb-3">
            Chat History
          </span>

          {loading ? (
            <div className="text-xs text-zinc-500 py-4 text-center">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-xs text-zinc-500 py-4 text-center">No messages yet</div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`text-sm leading-relaxed rounded-lg px-3 py-2 ${
                    msg.role === "assistant"
                      ? "bg-zinc-900 text-zinc-300"
                      : "bg-zinc-800 text-zinc-200"
                  }`}
                >
                  <span className="text-xs text-zinc-500 block mb-1 capitalize">
                    {msg.role === "assistant" ? "Aria" : "Visitor"}
                  </span>
                  {msg.content}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
