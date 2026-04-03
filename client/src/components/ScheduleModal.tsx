import { useState, useMemo } from "react";

interface ScheduleModalProps {
  currentDate: string | null;   // "2026-03-28" or null
  currentTime: string | null;   // "15:00" or null
  isDraft?: boolean;
  onSave: (date: string | null, time: string | null) => void;
  onClose: () => void;
}

export function ScheduleModal({ currentDate, currentTime, isDraft = true, onSave, onClose }: ScheduleModalProps) {
  // Parse initial date for calendar
  const initialMonth = useMemo(() => {
    if (currentDate) {
      const d = new Date(currentDate + "T00:00:00");
      return { year: d.getFullYear(), month: d.getMonth() };
    }
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  }, [currentDate]);

  const [selectedDate, setSelectedDate] = useState<string | null>(currentDate);
  const [viewMonth, setViewMonth] = useState(initialMonth);

  // Parse initial time for scroll wheels — default to 12:00 PM if no time set
  const parsedInitial = useMemo(() => {
    if (currentTime) {
      const [hStr, mStr] = currentTime.split(":");
      const h24 = parseInt(hStr, 10);
      const minute = parseInt(mStr, 10);
      const isPm = h24 >= 12;
      const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
      return { hour: h12, minute, period: isPm ? "PM" as const : "AM" as const };
    }
    return { hour: 12, minute: 0, period: "PM" as const };
  }, [currentTime]);

  const [hour, setHour] = useState(parsedInitial.hour);
  const [minute, setMinute] = useState(parsedInitial.minute);
  const [period, setPeriod] = useState<"AM" | "PM">(parsedInitial.period);
  const [hasTime, setHasTime] = useState(currentTime !== null);

  // Calendar math
  const navigateMonth = (delta: number) => {
    setViewMonth((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const firstDay = new Date(viewMonth.year, viewMonth.month, 1);
  const startDow = firstDay.getDay();
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

  // Scroll wheel helpers
  const hours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const cycleValue = (values: number[], current: number, delta: number) => {
    const idx = values.indexOf(current);
    const next = (idx + delta + values.length) % values.length;
    return values[next];
  };

  const handleSave = () => {
    const timeStr = hasTime
      ? (() => {
          let h24 = hour;
          if (period === "AM" && hour === 12) h24 = 0;
          else if (period === "PM" && hour !== 12) h24 = hour + 12;
          return `${String(h24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
        })()
      : null;
    onSave(selectedDate, timeStr);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-lg w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-medium text-zinc-100 mb-4">Schedule Post</h3>

        <div className="flex gap-4">
          {/* Left: Calendar */}
          <div className="flex-1">
            <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Date</div>
            <div className="bg-zinc-800 rounded-lg p-3 min-h-[230px] flex flex-col">
              {!selectedDate ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="text-sm text-zinc-500 mb-3">No date set</div>
                  <button
                    onClick={() => {
                      const today = new Date();
                      const m = String(today.getMonth() + 1).padStart(2, "0");
                      const d = String(today.getDate()).padStart(2, "0");
                      setSelectedDate(`${today.getFullYear()}-${m}-${d}`);
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Set a date
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={() => navigateMonth(-1)}
                      className="text-zinc-500 hover:text-zinc-300 px-1.5 py-0.5 rounded hover:bg-zinc-700 transition-colors text-sm"
                    >
                      ‹
                    </button>
                    <span className="text-sm text-zinc-300 font-medium">{monthName}</span>
                    <button
                      onClick={() => navigateMonth(1)}
                      className="text-zinc-500 hover:text-zinc-300 px-1.5 py-0.5 rounded hover:bg-zinc-700 transition-colors text-sm"
                    >
                      ›
                    </button>
                  </div>

                  <div className="grid grid-cols-7 text-center text-xs text-zinc-600 mb-1">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                      <span key={d} className="py-1">{d}</span>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 text-center text-xs">
                    {cells.map((day, i) => {
                      if (day === null) return <span key={i} />;
                      const dateStr = formatDate(day);
                      const isSelected = selectedDate === dateStr;
                      return (
                        <div
                          key={i}
                          onClick={() => setSelectedDate(dateStr)}
                          className={`py-1.5 cursor-pointer rounded-md transition-colors ${
                            isSelected
                              ? "bg-blue-950 border border-blue-500 text-white font-medium"
                              : "text-zinc-400 hover:bg-zinc-700"
                          }`}
                        >
                          {day}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right: Time scroll wheels */}
          <div className="w-[160px]">
            <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Time</div>
            <div className="bg-zinc-800 rounded-lg p-3c min-h-[105px] flex flex-col items-center justify-center">
              {!hasTime ? (
                <div className="text-center py-6">
                  <div className="text-sm text-zinc-500 mb-3">No time set</div>
                  <button
                    onClick={() => setHasTime(true)}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Set a time
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 items-center">
                    {/* Hour wheel */}
                    <div className="flex flex-col items-center gap-1">
                      <button
                        onClick={() => setHour(cycleValue(hours, hour, 1))}
                        className="text-zinc-600 hover:text-zinc-400 text-sm transition-colors"
                      >
                        ▲
                      </button>
                      <div className="text-xl font-medium text-zinc-100 bg-blue-950 px-3 py-1 rounded-md min-w-[40px] text-center">
                        {hour}
                      </div>
                      <button
                        onClick={() => setHour(cycleValue(hours, hour, -1))}
                        className="text-zinc-600 hover:text-zinc-400 text-sm transition-colors"
                      >
                        ▼
                      </button>
                    </div>

                    <span className="text-xl text-zinc-400 font-medium">:</span>

                    {/* Minute wheel */}
                    <div className="flex flex-col items-center gap-1">
                      <button
                        onClick={() => setMinute(cycleValue(minutes, minute, 1))}
                        className="text-zinc-600 hover:text-zinc-400 text-sm transition-colors"
                      >
                        ▲
                      </button>
                      <div className="text-xl font-medium text-zinc-100 bg-blue-950 px-3 py-1 rounded-md min-w-[40px] text-center">
                        {String(minute).padStart(2, "0")}
                      </div>
                      <button
                        onClick={() => setMinute(cycleValue(minutes, minute, -1))}
                        className="text-zinc-600 hover:text-zinc-400 text-sm transition-colors"
                      >
                        ▼
                      </button>
                    </div>

                    {/* AM/PM wheel */}
                    <div className="flex flex-col items-center gap-1">
                      <button
                        onClick={() => setPeriod(period === "AM" ? "PM" : "AM")}
                        className="text-zinc-600 hover:text-zinc-400 text-sm transition-colors"
                      >
                        ▲
                      </button>
                      <div className="text-sm font-medium text-blue-400 bg-blue-950 px-2 py-1.5 rounded-md">
                        {period}
                      </div>
                      <button
                        onClick={() => setPeriod(period === "AM" ? "PM" : "AM")}
                        className="text-zinc-600 hover:text-zinc-400 text-sm transition-colors"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bottom actions */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800">
          <div className="flex gap-3">
            {isDraft && selectedDate && (
              <button
                onClick={() => setSelectedDate(null)}
                className="text-xs text-amber-500 hover:text-amber-400 transition-colors"
              >
                Set Date as Undecided
              </button>
            )}
            {isDraft && hasTime && (
              <button
                onClick={() => setHasTime(false)}
                className="text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
              >
                Clear time
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-sm text-zinc-500 hover:text-zinc-300 px-3 py-1.5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="text-sm bg-zinc-100 text-zinc-900 hover:bg-white px-4 py-1.5 rounded font-medium transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
