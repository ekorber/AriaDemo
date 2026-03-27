import { IntentPhase, Lead } from "../types";
import { HandoffCard } from "./HandoffCard";

interface IntentPanelProps {
  intentScore: number;
  phase: IntentPhase;
  handoffLead: Lead | null;
}

const phaseLabels: Record<IntentPhase, string> = {
  open: "Gathering context...",
  qualify: "Qualifying...",
  build: "Building rapport...",
  handoff: "Handoff triggered",
};

function getScoreColor(score: number): string {
  if (score <= 40) return "#71717a"; // zinc-500
  if (score <= 70) return "#fbbf24"; // amber-400
  return "#34d399"; // emerald-400
}

export function IntentPanel({ intentScore, phase, handoffLead }: IntentPanelProps) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = (intentScore / 100) * circumference;
  const strokeDashoffset = circumference - progress;
  const color = getScoreColor(intentScore);

  return (
    <div className="w-[280px] flex flex-col items-center px-4 py-6 space-y-6">
      {/* Score Gauge */}
      <div className="relative">
        <svg width="128" height="128" viewBox="0 0 128 128">
          {/* Background circle */}
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="#27272a"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 64 64)"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-2xl font-semibold transition-colors duration-700"
            style={{ color }}
          >
            {intentScore}
          </span>
        </div>
      </div>

      {/* Phase Label */}
      <p className="text-xs text-zinc-500 tracking-wide uppercase">
        {phaseLabels[phase]}
      </p>

      {/* Bottom Section */}
      <div className="w-full flex-1">
        {phase === "handoff" && handoffLead ? (
          <HandoffCard lead={handoffLead} />
        ) : (
          <div className="flex items-center justify-center py-8">
            <p className="text-xs text-zinc-600 italic">Aria is listening...</p>
          </div>
        )}
      </div>
    </div>
  );
}
