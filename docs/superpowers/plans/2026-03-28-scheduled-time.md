# Scheduled Time Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `scheduledTime` field to social posts, a vertical timeline in the calendar panel, and a date/time picker modal with calendar + scroll wheels.

**Architecture:** Extend the existing `SocialPost` type with `scheduledTime: string | null`. Add a `ScheduleModal` component with a mini calendar and iOS-style scroll wheels. Add a timeline section to `CampaignCalendar`. Wire everything through the existing optimistic-update pattern in `useCampaigns`.

**Tech Stack:** React, TypeScript, Tailwind CSS, MongoDB (schemaless), Django backend

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `client/src/types/index.ts` | Modify | Add `scheduledTime` to `SocialPost` |
| `client/src/services/campaignService.ts` | Modify | Map `scheduled_time` ↔ `scheduledTime` |
| `client/src/hooks/useCampaigns.ts` | Modify | Serialize `scheduled_time`, add `updateSchedule` |
| `content/views/generate.py` | Modify | Default `scheduled_time: None` on new posts |
| `content/seed.py` | Modify | Add sample `scheduled_time` values |
| `client/src/components/ScheduleModal.tsx` | Create | Date/time picker modal |
| `client/src/components/PostEditor.tsx` | Modify | Add schedule row, integrate modal |
| `client/src/components/CampaignCalendar.tsx` | Modify | Add timeline view |
| `client/src/components/CampaignDetailView.tsx` | Modify | Wire new props |

---

### Task 1: Add `scheduledTime` to the data model

**Files:**
- Modify: `client/src/types/index.ts:31-39`
- Modify: `client/src/services/campaignService.ts:10-18,31-39`
- Modify: `client/src/hooks/useCampaigns.ts:93-228`
- Modify: `content/views/generate.py:122-132`
- Modify: `content/seed.py:22-133`

- [ ] **Step 1: Add `scheduledTime` to the TypeScript type**

In `client/src/types/index.ts`, add `scheduledTime` to `SocialPost`:

```typescript
export interface SocialPost {
  id: string;
  platform: SocialPlatform;
  hook: string;
  caption: string;
  edited: boolean;
  approved: boolean;
  scheduledDate: string | null;
  scheduledTime: string | null;  // "15:00" format or null
}
```

- [ ] **Step 2: Update the RawCampaign interface and deserialize function**

In `client/src/services/campaignService.ts`, add `scheduled_time` to the `RawCampaign` interface's `social_posts` array type (line 17):

```typescript
social_posts: Array<{
  id: string;
  platform: string;
  hook: string;
  caption: string;
  edited: boolean;
  approved: boolean;
  scheduled_date: string | null;
  scheduled_time: string | null;
}>;
```

And in the `deserialize` function, add the mapping (after line 38):

```typescript
scheduledDate: p.scheduled_date,
scheduledTime: p.scheduled_time ?? null,
```

- [ ] **Step 3: Update all serialization in useCampaigns.ts**

Every place that serializes `social_posts` for `patchCampaignApi` needs `scheduled_time`. There are 5 locations. In each, add `scheduled_time: p.scheduledTime,` after the `scheduled_date` line.

In `updatePost` (line 112), `approvePost` (line 139), `approveAll` (line 162), and `assignPlatform` (line 220), add:
```typescript
scheduled_date: p.scheduledDate,
scheduled_time: p.scheduledTime,
```

In `assignPlatform`, the `newPost` object (line 201) needs the field:
```typescript
const newPost: SocialPost = {
  id: `post_${campaignId}_${platform}_${Date.now()}`,
  platform,
  hook: "",
  caption: "",
  edited: false,
  approved: false,
  scheduledDate,
  scheduledTime: null,
};
```

- [ ] **Step 4: Update backend generate.py**

In `content/views/generate.py`, add `scheduled_time` to the new post dict (after line 131):

```python
new_posts.append({
    "id": f"post_{campaign_id}_{i}_{int(__import__('time').time() * 1000)}",
    "platform": p.get("platform", ""),
    "hook": p.get("hook", ""),
    "caption": p.get("caption", ""),
    "edited": False,
    "approved": False,
    "scheduled_date": None,
    "scheduled_time": None,
})
```

- [ ] **Step 5: Update seed data**

In `content/seed.py`, add `scheduled_time` to each seed post. Give some variety:

- seed_post_1 (instagram, Mar 29): `"scheduled_time": "09:00"`
- seed_post_2 (tiktok, Mar 29): `"scheduled_time": "12:00"`
- seed_post_3 (x, Mar 29): `"scheduled_time": "15:00"`
- seed_post_4 (facebook, Mar 31): `"scheduled_time": None`
- seed_post_5 (youtube_shorts, Mar 31): `"scheduled_time": "10:00"`
- seed_post_6 (threads, undecided): `"scheduled_time": None`

- [ ] **Step 6: Verify the app compiles**

Run: `cd client && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 7: Commit**

```bash
git add client/src/types/index.ts client/src/services/campaignService.ts client/src/hooks/useCampaigns.ts content/views/generate.py content/seed.py
git commit -m "Add scheduledTime field to SocialPost data model"
```

---

### Task 2: Add `updateSchedule` handler to useCampaigns

**Files:**
- Modify: `client/src/hooks/useCampaigns.ts`

- [ ] **Step 1: Add the updateSchedule callback**

After the `assignPlatform` callback (line 228), add:

```typescript
const updateSchedule = useCallback(
  async (campaignId: string, postId: string, date: string | null, time: string | null) => {
    setCampaigns((prev) => {
      const next = new Map(prev);
      const c = next.get(campaignId);
      if (c) {
        const updatedPosts = c.socialPosts.map((p) =>
          p.id === postId ? { ...p, scheduledDate: date, scheduledTime: time } : p
        );
        next.set(campaignId, { ...c, socialPosts: updatedPosts });
        patchCampaignApi(campaignId, {
          social_posts: updatedPosts.map((p) => ({
            id: p.id,
            platform: p.platform,
            hook: p.hook,
            caption: p.caption,
            edited: p.edited,
            approved: p.approved,
            scheduled_date: p.scheduledDate,
            scheduled_time: p.scheduledTime,
          })),
        });
      }
      return next;
    });
  },
  []
);
```

- [ ] **Step 2: Add updateSchedule to the return object**

In the return statement (line 230), add `updateSchedule`:

```typescript
return {
  campaigns: campaignList,
  getCampaign: (id: string) => campaigns.get(id) ?? null,
  createCampaign,
  updateCampaignBrief,
  generateContent,
  updatePost,
  approvePost,
  approveAll,
  deleteCampaign,
  duplicateCampaign,
  markExported,
  assignPlatform,
  updateSchedule,
};
```

- [ ] **Step 3: Verify compilation**

Run: `cd client && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add client/src/hooks/useCampaigns.ts
git commit -m "Add updateSchedule handler to useCampaigns"
```

---

### Task 3: Create ScheduleModal component

**Files:**
- Create: `client/src/components/ScheduleModal.tsx`

- [ ] **Step 1: Create the ScheduleModal component**

Create `client/src/components/ScheduleModal.tsx` with the following structure:

```tsx
import { useState, useMemo } from "react";

interface ScheduleModalProps {
  currentDate: string | null;   // "2026-03-28" or null
  currentTime: string | null;   // "15:00" or null
  onSave: (date: string | null, time: string | null) => void;
  onClose: () => void;
}

export function ScheduleModal({ currentDate, currentTime, onSave, onClose }: ScheduleModalProps) {
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
    if (!selectedDate) {
      onSave(null, null);
      return;
    }
    if (!hasTime) {
      onSave(selectedDate, null);
      return;
    }
    // Convert 12h to 24h
    let h24 = hour;
    if (period === "AM" && hour === 12) h24 = 0;
    else if (period === "PM" && hour !== 12) h24 = hour + 12;
    const timeStr = `${String(h24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
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
            <div className="bg-zinc-800 rounded-lg p-3">
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
            </div>
          </div>

          {/* Right: Time scroll wheels */}
          <div className="w-[160px]">
            <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Time</div>
            <div className="bg-zinc-800 rounded-lg p-3 flex flex-col items-center">
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
                        onClick={() => setHour(cycleValue(hours, hour, -1))}
                        className="text-zinc-600 hover:text-zinc-400 text-sm transition-colors"
                      >
                        ▲
                      </button>
                      <div className="text-xl font-medium text-zinc-100 bg-blue-950 px-3 py-1 rounded-md min-w-[40px] text-center">
                        {hour}
                      </div>
                      <button
                        onClick={() => setHour(cycleValue(hours, hour, 1))}
                        className="text-zinc-600 hover:text-zinc-400 text-sm transition-colors"
                      >
                        ▼
                      </button>
                    </div>

                    <span className="text-xl text-zinc-400 font-medium">:</span>

                    {/* Minute wheel */}
                    <div className="flex flex-col items-center gap-1">
                      <button
                        onClick={() => setMinute(cycleValue(minutes, minute, -1))}
                        className="text-zinc-600 hover:text-zinc-400 text-sm transition-colors"
                      >
                        ▲
                      </button>
                      <div className="text-xl font-medium text-zinc-100 bg-blue-950 px-3 py-1 rounded-md min-w-[40px] text-center">
                        {String(minute).padStart(2, "0")}
                      </div>
                      <button
                        onClick={() => setMinute(cycleValue(minutes, minute, 1))}
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
            {selectedDate && (
              <button
                onClick={() => { setSelectedDate(null); setHasTime(false); }}
                className="text-xs text-amber-500 hover:text-amber-400 transition-colors"
              >
                Set as Undecided
              </button>
            )}
            {hasTime && selectedDate && (
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
```

- [ ] **Step 2: Verify compilation**

Run: `cd client && npx tsc --noEmit`
Expected: No type errors (component is not yet imported anywhere)

- [ ] **Step 3: Commit**

```bash
git add client/src/components/ScheduleModal.tsx
git commit -m "Add ScheduleModal component with calendar and scroll wheels"
```

---

### Task 4: Add schedule row and modal to PostEditor

**Files:**
- Modify: `client/src/components/PostEditor.tsx`

- [ ] **Step 1: Add the schedule row and modal integration**

Add import at the top of `PostEditor.tsx`:

```typescript
import { ScheduleModal } from "./ScheduleModal";
```

Add a new prop to `PostEditorProps`:

```typescript
interface PostEditorProps {
  post: SocialPost;
  campaignId: string;
  onUpdatePost: (campaignId: string, postId: string, fields: { hook?: string; caption?: string }) => void;
  onApprovePost: (campaignId: string, postId: string) => void;
  onUpdateSchedule: (campaignId: string, postId: string, date: string | null, time: string | null) => void;
  onGenerate: (scope: "single" | "date" | "platform" | "all") => void;
  isGenerating: boolean;
}
```

Add `onUpdateSchedule` to the destructured props.

Add state for the modal inside the component:

```typescript
const [showScheduleModal, setShowScheduleModal] = useState(false);
```

Add a helper to format the schedule display:

```typescript
const scheduleLabel = (() => {
  const datePart = post.scheduledDate
    ? new Date(post.scheduledDate + "T00:00:00").toLocaleDateString("default", { month: "short", day: "numeric" })
    : "Undecided";
  if (!post.scheduledTime) return `${datePart} · No time set`;
  const [hStr, mStr] = post.scheduledTime.split(":");
  const h24 = parseInt(hStr, 10);
  const min = mStr;
  const isPm = h24 >= 12;
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  return `${datePart} · ${h12}:${min} ${isPm ? "PM" : "AM"}`;
})();
```

Add the schedule row JSX between the header `</div>` (closing the `mb-5` div) and the Hook field `<div className="mb-4">`:

```tsx
{/* Schedule row */}
<div
  onClick={() => setShowScheduleModal(true)}
  className="mb-4 flex items-center gap-3 px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg cursor-pointer hover:border-zinc-600 transition-colors"
>
  <span className="text-sm text-zinc-500">📅</span>
  <span className="text-sm text-zinc-300">{scheduleLabel}</span>
  <span className="ml-auto text-xs text-blue-400">Edit</span>
</div>

{showScheduleModal && (
  <ScheduleModal
    currentDate={post.scheduledDate}
    currentTime={post.scheduledTime}
    onSave={(date, time) => {
      onUpdateSchedule(campaignId, post.id, date, time);
      setShowScheduleModal(false);
    }}
    onClose={() => setShowScheduleModal(false)}
  />
)}
```

- [ ] **Step 2: Verify compilation**

Run: `cd client && npx tsc --noEmit`
Expected: Type error about missing `onUpdateSchedule` prop in `CampaignDetailView.tsx` — this is expected and will be fixed in Task 6.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/PostEditor.tsx
git commit -m "Add schedule row and ScheduleModal integration to PostEditor"
```

---

### Task 5: Add timeline view to CampaignCalendar

**Files:**
- Modify: `client/src/components/CampaignCalendar.tsx`

- [ ] **Step 1: Add new props and timeline rendering**

Add imports at the top:

```typescript
import { PlatformIcon } from "./PlatformIcon";
import { PLATFORM_LABELS } from "../constants/platformColors";
```

Update the props interface:

```typescript
interface CampaignCalendarProps {
  posts: SocialPost[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  selectedPostId: string | null;
  onSelectPost: (postId: string) => void;
}
```

Update the destructured props:

```typescript
export function CampaignCalendar({ posts, selectedDate, onSelectDate, selectedPostId, onSelectPost }: CampaignCalendarProps) {
```

Add the timeline section at the bottom of the component's return, after the Undecided button's closing `</button>` and before the final closing `</div>`:

```tsx
{/* Timeline — only when a specific date is selected */}
{selectedDate && (() => {
  const datePosts = posts.filter((p) => p.scheduledDate === selectedDate);
  if (datePosts.length === 0) return null;

  const untimedPosts = datePosts.filter((p) => !p.scheduledTime);
  const timedPosts = datePosts
    .filter((p) => p.scheduledTime)
    .sort((a, b) => a.scheduledTime!.localeCompare(b.scheduledTime!));

  const formatTime = (t: string) => {
    const [hStr, mStr] = t.split(":");
    const h24 = parseInt(hStr, 10);
    const isPm = h24 >= 12;
    const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
    return `${h12}:${mStr}${isPm ? "p" : "a"}`;
  };

  return (
    <div className="mt-3 pt-3 border-t border-zinc-800">
      <div className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Timeline</div>

      {/* Untimed posts */}
      {untimedPosts.length > 0 && (
        <div className="flex gap-2.5 mb-3">
          <div className="flex flex-col items-center w-[40px] flex-shrink-0">
            <span className="text-[10px] text-zinc-600 whitespace-nowrap">No time</span>
            {timedPosts.length > 0 && (
              <div className="flex-1 w-[2px] bg-zinc-800 mt-1"></div>
            )}
          </div>
          <div className="flex-1 flex flex-col gap-1.5">
            {untimedPosts.map((post) => (
              <button
                key={post.id}
                onClick={() => onSelectPost(post.id)}
                className={`w-full text-left rounded-md px-2 py-1.5 flex items-center gap-2 transition-colors ${
                  post.id === selectedPostId
                    ? "bg-blue-950 border border-blue-500"
                    : "bg-zinc-900 border border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <PlatformIcon platform={post.platform} size={10} />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-zinc-200 leading-snug truncate">
                    {post.hook || PLATFORM_LABELS[post.platform]}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Separator */}
      {untimedPosts.length > 0 && timedPosts.length > 0 && (
        <div className="border-t border-dashed border-zinc-800 mb-3"></div>
      )}

      {/* Timed posts */}
      {timedPosts.map((post, i) => (
        <div key={post.id} className="flex gap-2.5 mb-2">
          <div className="flex flex-col items-center w-[40px] flex-shrink-0">
            <span className="text-[10px] text-blue-400 whitespace-nowrap">
              {formatTime(post.scheduledTime!)}
            </span>
            {i < timedPosts.length - 1 && (
              <div className="flex-1 w-[2px] bg-zinc-800 mt-1"></div>
            )}
          </div>
          <div className="flex-1">
            <button
              onClick={() => onSelectPost(post.id)}
              className={`w-full text-left rounded-md px-2 py-1.5 flex items-center gap-2 transition-colors ${
                post.id === selectedPostId
                  ? "bg-blue-950 border border-blue-500"
                  : "bg-zinc-900 border border-zinc-800 hover:border-zinc-700"
              }`}
            >
              <PlatformIcon platform={post.platform} size={10} />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-zinc-200 leading-snug truncate">
                  {post.hook || PLATFORM_LABELS[post.platform]}
                </div>
              </div>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
})()}
```

- [ ] **Step 2: Verify compilation**

Run: `cd client && npx tsc --noEmit`
Expected: Type error about missing `selectedPostId`/`onSelectPost` props in `CampaignDetailView.tsx` — will be fixed in Task 6.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/CampaignCalendar.tsx
git commit -m "Add vertical timeline view to CampaignCalendar"
```

---

### Task 6: Wire everything through CampaignDetailView

**Files:**
- Modify: `client/src/components/CampaignDetailView.tsx`

- [ ] **Step 1: Add the new prop and pass it through**

Add `onUpdateSchedule` to the `CampaignDetailViewProps` interface:

```typescript
interface CampaignDetailViewProps {
  campaign: Campaign;
  onBack: () => void;
  onUpdateBrief: (campaignId: string, brief: string) => void;
  onUpdatePost: (campaignId: string, postId: string, fields: { hook?: string; caption?: string }) => void;
  onApprovePost: (campaignId: string, postId: string) => void;
  onApproveAll: (campaignId: string) => void;
  onDelete: (campaignId: string) => void;
  onDuplicate: (campaignId: string) => Promise<string | null>;
  onExport: (campaign: Campaign) => void;
  onGenerate: (campaignId: string) => Promise<void>;
  onAssignPlatform: (campaignId: string, platform: SocialPlatform, date: string | null) => void;
  onUpdateSchedule: (campaignId: string, postId: string, date: string | null, time: string | null) => void;
}
```

Add `onUpdateSchedule` to the destructured props.

- [ ] **Step 2: Add a handleUpdateSchedule callback**

After the existing `handleGenerate` callback:

```typescript
const handleUpdateSchedule = useCallback((postId: string, date: string | null, time: string | null) => {
  onUpdateSchedule(campaign.id, postId, date, time);
  // If the date changed, navigate to the new date
  if (date !== selectedDate) {
    setSelectedDate(date);
  }
}, [campaign.id, selectedDate, onUpdateSchedule]);
```

- [ ] **Step 3: Pass new props to CampaignCalendar**

Update the `<CampaignCalendar>` JSX:

```tsx
<CampaignCalendar
  posts={campaign.socialPosts}
  selectedDate={selectedDate}
  onSelectDate={handleSelectDate}
  selectedPostId={selectedPost?.id ?? null}
  onSelectPost={handleSelectPost}
/>
```

- [ ] **Step 4: Pass onUpdateSchedule to PostEditor**

Update the `<PostEditor>` JSX:

```tsx
<PostEditor
  post={selectedPost}
  campaignId={campaign.id}
  onUpdatePost={onUpdatePost}
  onApprovePost={onApprovePost}
  onUpdateSchedule={(cId, pId, date, time) => handleUpdateSchedule(pId, date, time)}
  onGenerate={handleGenerate}
  isGenerating={campaign.status === "generating"}
/>
```

- [ ] **Step 5: Verify compilation**

Run: `cd client && npx tsc --noEmit`
Expected: Type error about missing `onUpdateSchedule` prop in `ContentView.tsx` — will be fixed in Task 7.

- [ ] **Step 6: Test manually**

1. Start the dev server: `cd client && npm run dev`
2. Open a campaign with posts
3. Verify the timeline appears below the Undecided button when a date is selected
4. Verify clicking a timeline post selects it in the editor
5. Verify the schedule row appears in the PostEditor
6. Click "Edit" on the schedule row — modal should open
7. Change the date and time, click Save — post should update
8. Click "Set as Undecided" — post should move to undecided
9. Click "Clear time" — time should reset to "No time set"

- [ ] **Step 7: Commit**

```bash
git add client/src/components/CampaignDetailView.tsx
git commit -m "Wire scheduledTime through CampaignDetailView to calendar and editor"
```

---

### Task 7: Wire updateSchedule from ContentView to CampaignDetailView

**Files:**
- Modify: `client/src/components/ContentView.tsx:104-120`

- [ ] **Step 1: Add onUpdateSchedule prop to the CampaignDetailView JSX**

In `client/src/components/ContentView.tsx`, the `<CampaignDetailView>` is rendered at line 104. Add `onUpdateSchedule={updateSchedule}` after the `onAssignPlatform` prop (line 119):

```tsx
<CampaignDetailView
  campaign={selected}
  onBack={() => { setSelectedId(null); }}
  onUpdateBrief={updateCampaignBrief}
  onUpdatePost={updatePost}
  onApprovePost={approvePost}
  onApproveAll={approveAll}
  onDelete={(id) => { deleteCampaign(id); setSelectedId(null); }}
  onDuplicate={async (id) => {
    const newId = await duplicateCampaign(id);
    if (newId) setSelectedId(newId);
    return newId;
  }}
  onExport={handleExport}
  onGenerate={generateContent}
  onAssignPlatform={assignPlatform}
  onUpdateSchedule={updateSchedule}
/>
```

The `updateSchedule` function comes from the `useCampaigns` hook which is already called in `ContentView.tsx`. Destructure it from the hook's return value if not already present.

- [ ] **Step 2: Verify full compilation**

Run: `cd client && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add client/src/components/ContentView.tsx
git commit -m "Pass updateSchedule to CampaignDetailView from ContentView"
```

---

### Task 8: Reset seed data and verify end-to-end

**Files:**
- No new changes — verification only

- [ ] **Step 1: Reset the database to pick up new seed data**

Drop the campaigns collection and restart the server so seed data repopulates with `scheduled_time` values:

```bash
# In a Python/Django shell or mongo shell:
# db.campaigns.drop()
# Then restart the Django server
```

- [ ] **Step 2: Full end-to-end verification**

1. Open the app, navigate to the Velo Fitness campaign
2. Select March 29 — should see 3 posts in the timeline (Instagram at 9:00a, TikTok at 12:00p, X at 3:00p)
3. Select March 31 — should see 2 posts (YouTube Shorts at 10:00a, Facebook with "No time" at top)
4. Click Undecided — timeline should not appear, Threads post visible in sidebar
5. Click a timeline post — should select it in the editor
6. Verify schedule row shows correct date/time in editor
7. Open schedule modal, change time, save — timeline should reorder
8. Open schedule modal, click "Set as Undecided" — post moves to undecided
9. Open schedule modal, click "Clear time" — shows "No time set"

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "Fix any issues found during end-to-end testing"
```
