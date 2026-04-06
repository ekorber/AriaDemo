import { useState, useEffect, useRef } from "react";
import { IntentPhase, Lead } from "../types";
import { HandoffCard } from "./HandoffCard";

interface IntentPanelProps {
  intentScore: number;
  phase: IntentPhase;
  handoffLead: Lead | null;
  handoffPerson?: string;
  open?: boolean;
  onClose?: () => void;
}

const phaseLabels: Record<IntentPhase, string> = {
  open: "Gathering context...",
  qualify: "Qualifying...",
  build: "Building rapport...",
  handoff: "Handoff triggered",
  disqualified: "Not a fit",
};

function getScoreColor(score: number): string {
  if (score <= 40) return "#71717a"; // zinc-500
  if (score <= 70) return "#fbbf24"; // amber-400
  return "#34d399"; // emerald-400
}

export function IntentPanel({ intentScore, phase, handoffLead, handoffPerson, open, onClose }: IntentPanelProps) {
  const [drawerState, setDrawerState] = useState<'open' | 'closing' | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (open) {
      clearTimeout(timer.current);
      setDrawerState('open');
    } else if (drawerState === 'open') {
      setDrawerState('closing');
      timer.current = setTimeout(() => setDrawerState(null), 200);
    }
  }, [open]);

  const handleClose = () => {
    setDrawerState('closing');
    timer.current = setTimeout(() => { setDrawerState(null); onClose?.(); }, 200);
  };

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = (intentScore / 100) * circumference;
  const strokeDashoffset = circumference - progress;
  const color = getScoreColor(intentScore);

  const content = (
    <div className="flex flex-col items-center px-4 py-6 space-y-6 h-full">
      {/* Score Gauge */}
      <div className="relative shrink-0">
        <svg width="128" height="128" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={radius} fill="none" stroke="#27272a" strokeWidth="8" />
          <circle
            cx="64" cy="64" r={radius} fill="none" stroke={color} strokeWidth="8"
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 64 64)" className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-semibold transition-colors duration-700" style={{ color }}>
            {intentScore}
          </span>
        </div>
      </div>

      <p className="text-xs text-zinc-500 tracking-wide uppercase">
        {phaseLabels[phase]}
      </p>

      <div className="w-full flex-1">
        {phase === "handoff" && handoffLead ? (
          <HandoffCard lead={handoffLead} handoffPerson={handoffPerson} />
        ) : (
          <div className="flex items-center justify-center py-8">
            <p className="text-xs text-zinc-600 italic">Aria is listening...</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: inline sidebar */}
      <div className="hidden md:block w-[280px] shrink-0">
        {content}
      </div>

      {/* Mobile: full-width slide-out drawer */}
      {drawerState && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
          <div
            className="absolute right-0 top-0 bottom-0 w-full bg-zinc-950 shadow-2xl overflow-y-auto"
            style={{
              animation: drawerState === 'closing'
                ? 'slide-out-right 0.2s ease-in forwards'
                : 'slide-in-right 0.2s ease-out',
            }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <span className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">Intent Score</span>
              <button onClick={handleClose} className="text-zinc-500 hover:text-zinc-300 text-lg leading-none">&times;</button>
            </div>
            {content}
          </div>
        </div>
      )}
    </>
  );
}
