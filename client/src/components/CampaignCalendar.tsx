import { useMemo, useState } from "react";
import { SocialPost } from "../types";
import { PLATFORM_COLORS, PLATFORM_ABBREVS, ALL_PLATFORMS } from "../constants/platformColors";

interface CampaignCalendarProps {
  posts: SocialPost[];
  selectedDate: string | null; // ISO date string or "undecided" or null
  onSelectDate: (date: string | null) => void; // null = "undecided"
}

export function CampaignCalendar({ posts, selectedDate, onSelectDate }: CampaignCalendarProps) {
  // Determine initial month from posts or current date
  const initialMonth = useMemo(() => {
    const scheduledDates = posts
      .map((p) => p.scheduledDate)
      .filter(Boolean) as string[];
    if (scheduledDates.length > 0) {
      const earliest = scheduledDates.sort()[0];
      const d = new Date(earliest + "T00:00:00");
      return { year: d.getFullYear(), month: d.getMonth() };
    }
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  }, [posts]);

  const [viewMonth, setViewMonth] = useState(initialMonth);

  const navigateMonth = (delta: number) => {
    setViewMonth((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  // Build a map of date -> platforms
  const dateMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const post of posts) {
      if (post.scheduledDate) {
        if (!map.has(post.scheduledDate)) map.set(post.scheduledDate, new Set());
        map.get(post.scheduledDate)!.add(post.platform);
      }
    }
    return map;
  }, [posts]);

  const undecidedCount = posts.filter((p) => !p.scheduledDate).length;

  // Calendar grid math
  const firstDay = new Date(viewMonth.year, viewMonth.month, 1);
  const startDow = firstDay.getDay(); // 0=Sun
  const daysInMonth = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate();
  const monthName = firstDay.toLocaleString("default", { month: "long", year: "numeric" });

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const formatDate = (day: number) => {
    const m = String(viewMonth.month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${viewMonth.year}-${m}-${d}`;
  };

  return (
    <div className="w-[280px] min-w-[280px] border-r border-zinc-800 p-4 bg-zinc-950 flex flex-col">
      <div className="text-[11px] uppercase tracking-widest text-zinc-500 mb-3">Schedule</div>

      <div className="bg-zinc-900 rounded-lg p-3.5">
        {/* Month header with navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => navigateMonth(-1)}
            className="text-zinc-500 hover:text-zinc-300 px-1.5 py-0.5 rounded hover:bg-zinc-800 transition-colors text-sm"
          >
            ‹
          </button>
          <span className="text-sm text-zinc-300 font-medium">{monthName}</span>
          <button
            onClick={() => navigateMonth(1)}
            className="text-zinc-500 hover:text-zinc-300 px-1.5 py-0.5 rounded hover:bg-zinc-800 transition-colors text-sm"
          >
            ›
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 text-center text-[11px] text-zinc-600 mb-1">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
            <span key={d} className="py-1">{d}</span>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 text-center text-[11px]">
          {cells.map((day, i) => {
            if (day === null) return <span key={i} />;
            const dateStr = formatDate(day);
            const platforms = dateMap.get(dateStr);
            const isSelected = selectedDate === dateStr;

            return (
              <div
                key={i}
                onClick={() => onSelectDate(dateStr)}
                className={`py-1.5 cursor-pointer rounded-md transition-colors ${
                  isSelected
                    ? "bg-blue-950 border border-blue-500"
                    : platforms
                    ? "hover:bg-zinc-800"
                    : "hover:bg-zinc-800/50"
                }`}
              >
                <div className={isSelected ? "text-white font-medium" : platforms ? "text-zinc-300" : "text-zinc-600"}>
                  {day}
                </div>
                {platforms && (
                  <div className="flex gap-0.5 justify-center mt-0.5">
                    {ALL_PLATFORMS.filter((p) => platforms.has(p)).map((p) => (
                      <span
                        key={p}
                        className="w-[5px] h-[5px] rounded-full"
                        style={{
                          backgroundColor: PLATFORM_COLORS[p].hex,
                          border: PLATFORM_COLORS[p].border ? "1px solid #888" : undefined,
                          boxSizing: "border-box",
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-zinc-800 flex flex-wrap gap-2">
          {ALL_PLATFORMS.map((p) => (
            <span key={p} className="flex items-center gap-1 text-[9px] text-zinc-500">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor: PLATFORM_COLORS[p].hex,
                  border: PLATFORM_COLORS[p].border ? "1px solid #888" : undefined,
                  boxSizing: "border-box",
                }}
              />
              {PLATFORM_ABBREVS[p]}
            </span>
          ))}
        </div>
      </div>

      {/* Undecided button */}
      <button
        onClick={() => onSelectDate(null)}
        className={`w-full mt-3 px-3 py-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
          selectedDate === null
            ? "bg-amber-950 border border-amber-600 text-amber-300"
            : "bg-zinc-900 border border-zinc-700 text-amber-500 hover:border-zinc-600"
        }`}
      >
        Undecided
        {undecidedCount > 0 && (
          <span className="ml-auto text-[10px] bg-amber-950 text-amber-400 px-1.5 py-0.5 rounded">
            {undecidedCount}
          </span>
        )}
      </button>
    </div>
  );
}
