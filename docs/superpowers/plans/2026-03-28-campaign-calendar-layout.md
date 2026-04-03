# Campaign Calendar Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 6-card post grid with a 3-panel layout: calendar (left), single post editor (center), platform sidebar (right), with date-based scheduling per post.

**Architecture:** Add `scheduledDate` to `SocialPost` type and MongoDB documents. Rewrite the campaign detail view as three new components (`CampaignCalendar`, `PostEditor`, `PlatformSidebar`) composed in a new `CampaignDetailView`. The campaign list view and backend CRUD endpoints remain unchanged aside from the new field.

**Tech Stack:** React, TypeScript, Tailwind CSS, MongoDB (via existing Django backend)

---

### Task 1: Add `scheduledDate` to data model

**Files:**
- Modify: `client/src/types/index.ts`
- Modify: `client/src/services/campaignService.ts`
- Modify: `content/seed.py`
- Modify: `content/views/generate.py`
- Modify: `content/views/campaigns.py`

- [ ] **Step 1: Add `scheduledDate` to `SocialPost` type**

In `client/src/types/index.ts`, add the field to the `SocialPost` interface:

```typescript
export interface SocialPost {
  id: string;
  platform: SocialPlatform;
  hook: string;
  caption: string;
  edited: boolean;
  approved: boolean;
  scheduledDate: string | null;  // ISO date "2026-03-29" or null for undecided
}
```

- [ ] **Step 2: Update `campaignService.ts` deserialization**

In `client/src/services/campaignService.ts`, add `scheduled_date` to the `RawCampaign` post shape and map it in `deserialize`:

In the `RawCampaign` interface's `social_posts` array item, add:
```typescript
scheduled_date: string | null;
```

In the `deserialize` function's post mapping, add:
```typescript
scheduledDate: p.scheduled_date,
```

- [ ] **Step 3: Update `useCampaigns.ts` post serialization**

In `client/src/hooks/useCampaigns.ts`, every place that serializes posts for `patchCampaignApi` (in `updatePost`, `approvePost`, `approveAll`) needs to include `scheduled_date`. Add to each post mapping:
```typescript
scheduled_date: p.scheduledDate,
```

There are 3 locations in the file where posts are serialized — `updatePost`, `approvePost`, and `approveAll`. Update all three.

- [ ] **Step 4: Update seed data**

In `content/seed.py`, add `"scheduled_date": None` to each post in the seed campaign's `social_posts` array (6 posts total).

- [ ] **Step 5: Update generate view**

In `content/views/generate.py`, in `_save_generated_posts`, add `"scheduled_date": None` to each new post dict in the `new_posts` list.

- [ ] **Step 6: Update campaigns PATCH**

In `content/views/campaigns.py`, in `campaign_duplicate`, the post copy loop already copies all fields via `{**p, ...}` so `scheduled_date` is included automatically. No change needed here, but verify the `allowed` set in `campaign_detail` PATCH includes `"social_posts"` (it already does).

- [ ] **Step 7: Commit**

```bash
git add client/src/types/index.ts client/src/services/campaignService.ts client/src/hooks/useCampaigns.ts content/seed.py content/views/generate.py
git commit -m "Add scheduledDate field to social post data model"
```

---

### Task 2: Create platform color constants

**Files:**
- Create: `client/src/constants/platforms.ts`

- [ ] **Step 1: Create the constants file**

Create `client/src/constants/platforms.ts`:

```typescript
import { SocialPlatform } from "../types";

export const PLATFORM_COLORS: Record<SocialPlatform, { hex: string; border: boolean }> = {
  instagram: { hex: "#fc4bd6", border: true },
  tiktok: { hex: "#690089", border: true },
  x: { hex: "#000000", border: true },
  facebook: { hex: "#1877F2", border: false },
  youtube_shorts: { hex: "#FF0000", border: false },
  threads: { hex: "#aaaaaa", border: false },
};

export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X",
  facebook: "Facebook",
  youtube_shorts: "YouTube Shorts",
  threads: "Threads",
};

export const PLATFORM_ABBREVS: Record<SocialPlatform, string> = {
  instagram: "IG",
  tiktok: "TT",
  x: "X",
  facebook: "FB",
  youtube_shorts: "YT",
  threads: "TH",
};

export const ALL_PLATFORMS: SocialPlatform[] = [
  "instagram", "tiktok", "x", "facebook", "youtube_shorts", "threads",
];
```

- [ ] **Step 2: Commit**

```bash
git add client/src/constants/platforms.ts
git commit -m "Add platform color and label constants"
```

---

### Task 3: Create `CampaignCalendar` component

**Files:**
- Create: `client/src/components/CampaignCalendar.tsx`

- [ ] **Step 1: Create the component**

Create `client/src/components/CampaignCalendar.tsx`:

```typescript
import { useMemo } from "react";
import { SocialPost } from "../types";
import { PLATFORM_COLORS, PLATFORM_ABBREVS, ALL_PLATFORMS } from "../constants/platformColors";

interface CampaignCalendarProps {
  posts: SocialPost[];
  selectedDate: string | null; // ISO date string or "undecided" or null
  onSelectDate: (date: string | null) => void; // null = "undecided"
}

export function CampaignCalendar({ posts, selectedDate, onSelectDate }: CampaignCalendarProps) {
  // Determine which month to show based on posts or current date
  const today = new Date();
  const viewMonth = useMemo(() => {
    const scheduledDates = posts
      .map((p) => p.scheduledDate)
      .filter(Boolean) as string[];
    if (scheduledDates.length > 0) {
      const earliest = scheduledDates.sort()[0];
      const d = new Date(earliest + "T00:00:00");
      return { year: d.getFullYear(), month: d.getMonth() };
    }
    return { year: today.getFullYear(), month: today.getMonth() };
  }, [posts, today.getFullYear(), today.getMonth()]);

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

      <div className="bg-zinc-900 rounded-lg p-3.5 flex-1">
        {/* Month header */}
        <div className="text-center text-sm text-zinc-300 font-medium mb-3">{monthName}</div>

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
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/CampaignCalendar.tsx
git commit -m "Add CampaignCalendar component with platform dots and undecided button"
```

---

### Task 4: Create `PostEditor` component

**Files:**
- Create: `client/src/components/PostEditor.tsx`

- [ ] **Step 1: Create the component**

Create `client/src/components/PostEditor.tsx`:

```typescript
import { useState, useEffect } from "react";
import { SocialPost, SocialPlatform } from "../types";
import { PLATFORM_COLORS, PLATFORM_LABELS } from "../constants/platformColors";

interface PostEditorProps {
  post: SocialPost;
  campaignId: string;
  onUpdatePost: (campaignId: string, postId: string, fields: { hook?: string; caption?: string }) => void;
  onApprovePost: (campaignId: string, postId: string) => void;
  onGenerate: (scope: "single" | "date" | "platform" | "all") => void;
  isGenerating: boolean;
}

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-zinc-800 text-zinc-400",
  ready: "bg-emerald-950 text-emerald-400",
  approved: "bg-emerald-950 text-emerald-400",
};

export function PostEditor({
  post,
  campaignId,
  onUpdatePost,
  onApprovePost,
  onGenerate,
  isGenerating,
}: PostEditorProps) {
  const [hook, setHook] = useState(post.hook);
  const [caption, setCaption] = useState(post.caption);
  const color = PLATFORM_COLORS[post.platform];
  const label = PLATFORM_LABELS[post.platform];

  useEffect(() => {
    setHook(post.hook);
    setCaption(post.caption);
  }, [post.id, post.hook, post.caption]);

  const handleHookBlur = () => {
    if (hook !== post.hook) {
      onUpdatePost(campaignId, post.id, { hook });
    }
  };

  const handleCaptionBlur = () => {
    if (caption !== post.caption) {
      onUpdatePost(campaignId, post.id, { caption });
    }
  };

  const dateLabel = post.scheduledDate
    ? new Date(post.scheduledDate + "T00:00:00").toLocaleDateString("default", { month: "short", day: "numeric" })
    : "Undecided";

  return (
    <div className="flex-1 p-5 overflow-y-auto">
      {/* Header */}
      <div className="mb-5">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500">{dateLabel}</div>
        <div className="flex items-center gap-2 mt-1">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: color.hex,
              border: color.border ? "1px solid #888" : undefined,
              boxSizing: "border-box",
            }}
          />
          <span className="text-sm font-medium text-zinc-100">{label}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${post.approved ? "bg-emerald-950 text-emerald-400" : post.hook ? "bg-zinc-800 text-zinc-400" : "bg-zinc-800 text-zinc-500"}`}>
            {post.approved ? "approved" : post.hook ? "ready" : "draft"}
          </span>
          {post.edited && (
            <span className="text-[10px] text-zinc-600 uppercase tracking-wider">edited</span>
          )}
        </div>
      </div>

      {/* Hook field */}
      <div className="mb-4">
        <label className="text-[11px] uppercase tracking-widest text-zinc-500 block mb-1.5">Hook</label>
        <textarea
          value={hook}
          onChange={(e) => setHook(e.target.value)}
          onBlur={handleHookBlur}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-200 font-medium resize-none focus:outline-none focus:border-zinc-600"
          rows={2}
          placeholder="Opening line..."
        />
      </div>

      {/* Caption field */}
      <div className="mb-5">
        <label className="text-[11px] uppercase tracking-widest text-zinc-500 block mb-1.5">Caption</label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={handleCaptionBlur}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-400 resize-none focus:outline-none focus:border-zinc-600 leading-relaxed"
          rows={8}
          placeholder="Post body..."
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => onGenerate("single")}
          disabled={isGenerating}
          className="text-xs bg-zinc-100 text-zinc-900 hover:bg-white px-4 py-1.5 rounded font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isGenerating ? "Generating..." : post.hook ? "Regenerate" : "Generate"}
        </button>
        <button
          onClick={() => onApprovePost(campaignId, post.id)}
          className={`text-xs px-3 py-1.5 rounded transition-colors border ${
            post.approved
              ? "border-emerald-800 text-emerald-400 bg-emerald-950/50"
              : "border-zinc-700 text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {post.approved ? "Approved" : "Approve"}
        </button>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => onGenerate("date")}
            disabled={isGenerating}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-40"
          >
            Gen. date
          </button>
          <button
            onClick={() => onGenerate("platform")}
            disabled={isGenerating}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-40"
          >
            Gen. all {PLATFORM_LABELS[post.platform]}
          </button>
          <button
            onClick={() => onGenerate("all")}
            disabled={isGenerating}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-40"
          >
            Gen. all
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/PostEditor.tsx
git commit -m "Add PostEditor component with inline editing and generation actions"
```

---

### Task 5: Create `PlatformSidebar` component

**Files:**
- Create: `client/src/components/PlatformSidebar.tsx`

- [ ] **Step 1: Create the component**

Create `client/src/components/PlatformSidebar.tsx`:

```typescript
import { SocialPost, SocialPlatform } from "../types";
import { PLATFORM_COLORS, PLATFORM_LABELS, ALL_PLATFORMS } from "../constants/platformColors";

interface PlatformSidebarProps {
  posts: SocialPost[];           // posts for the selected date
  allPosts: SocialPost[];        // all posts in the campaign
  selectedDate: string | null;   // null = undecided
  selectedPostId: string | null;
  onSelectPost: (postId: string) => void;
  onAssignPlatform: (platform: SocialPlatform) => void;
}

export function PlatformSidebar({
  posts,
  allPosts,
  selectedDate,
  selectedPostId,
  onSelectPost,
  onAssignPlatform,
}: PlatformSidebarProps) {
  const dateLabel = selectedDate
    ? new Date(selectedDate + "T00:00:00").toLocaleDateString("default", { month: "short", day: "numeric" })
    : "Undecided";

  // Platforms already assigned to any date
  const assignedPlatforms = new Set(allPosts.map((p) => p.platform));
  const unassignedPlatforms = ALL_PLATFORMS.filter((p) => !assignedPlatforms.has(p));

  return (
    <div className="w-[170px] min-w-[170px] border-l border-zinc-800 p-4 bg-zinc-950 overflow-y-auto">
      <div className="text-[11px] uppercase tracking-widest text-zinc-500 mb-3">{dateLabel}</div>

      {/* Platform cards for this date */}
      {posts.length === 0 ? (
        <div className="text-xs text-zinc-600 mb-3">No platforms assigned</div>
      ) : (
        <div className="space-y-1.5 mb-3">
          {posts.map((post) => {
            const color = PLATFORM_COLORS[post.platform];
            const isSelected = post.id === selectedPostId;
            return (
              <button
                key={post.id}
                onClick={() => onSelectPost(post.id)}
                className={`w-full text-left rounded-md px-2.5 py-2 flex items-center gap-2 transition-colors ${
                  isSelected
                    ? "bg-blue-950 border border-blue-500"
                    : "bg-zinc-900 border border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: color.hex,
                    border: color.border ? "1px solid #888" : undefined,
                    boxSizing: "border-box",
                  }}
                />
                <div>
                  <div className="text-xs text-zinc-200 font-medium">{PLATFORM_LABELS[post.platform]}</div>
                  <div className={`text-[10px] ${post.approved ? "text-emerald-400" : post.hook ? "text-amber-400" : "text-zinc-600"}`}>
                    {post.approved ? "approved" : post.hook ? "ready" : "draft"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Assign platform */}
      {unassignedPlatforms.length > 0 && (
        <>
          <div className="border-t border-zinc-800 my-3 pt-3">
            <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-2">Assign Platform</div>
            <div className="space-y-1">
              {unassignedPlatforms.map((platform) => {
                const color = PLATFORM_COLORS[platform];
                return (
                  <button
                    key={platform}
                    onClick={() => onAssignPlatform(platform)}
                    className="w-full text-left rounded-md px-2.5 py-1.5 flex items-center gap-2 border border-dashed border-zinc-700 hover:border-zinc-500 transition-colors"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0 opacity-50"
                      style={{
                        backgroundColor: color.hex,
                        border: color.border ? "1px solid #888" : undefined,
                        boxSizing: "border-box",
                      }}
                    />
                    <span className="text-xs text-zinc-500">{PLATFORM_LABELS[platform]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/PlatformSidebar.tsx
git commit -m "Add PlatformSidebar component with platform selection and assignment"
```

---

### Task 6: Create `CampaignDetailView` component

This is the main orchestrator that replaces the campaign detail section of ContentView.

**Files:**
- Create: `client/src/components/CampaignDetailView.tsx`

- [ ] **Step 1: Create the component**

Create `client/src/components/CampaignDetailView.tsx`:

```typescript
import { useState, useCallback, useMemo } from "react";
import { Campaign, SocialPlatform, SocialPost } from "../types";
import { CampaignCalendar } from "./CampaignCalendar";
import { PostEditor } from "./PostEditor";
import { PlatformSidebar } from "./PlatformSidebar";
import { PLATFORM_LABELS } from "../constants/platformColors";

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
}

export function CampaignDetailView({
  campaign,
  onBack,
  onUpdateBrief,
  onUpdatePost,
  onApprovePost,
  onApproveAll,
  onDelete,
  onDuplicate,
  onExport,
  onGenerate,
  onAssignPlatform,
}: CampaignDetailViewProps) {
  // "undecided" is stored as selectedDate === null
  // A specific date is stored as "2026-03-29"
  // Initial state: first date with posts, or null (undecided) if all undecided, or null if no posts
  const [selectedDate, setSelectedDate] = useState<string | null>(() => {
    const scheduled = campaign.socialPosts.filter((p) => p.scheduledDate);
    if (scheduled.length > 0) {
      const dates = [...new Set(scheduled.map((p) => p.scheduledDate!))].sort();
      return dates[0];
    }
    return null;
  });
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Posts for the selected date
  const datePosts = useMemo(() => {
    return campaign.socialPosts.filter((p) =>
      selectedDate === null ? !p.scheduledDate : p.scheduledDate === selectedDate
    );
  }, [campaign.socialPosts, selectedDate]);

  // Auto-select first post when date changes or posts change
  const selectedPost = useMemo(() => {
    if (selectedPostId) {
      const found = datePosts.find((p) => p.id === selectedPostId);
      if (found) return found;
    }
    return datePosts[0] || null;
  }, [datePosts, selectedPostId]);

  const handleSelectDate = useCallback((date: string | null) => {
    setSelectedDate(date);
    setSelectedPostId(null); // reset post selection, let it auto-select first
  }, []);

  const handleSelectPost = useCallback((postId: string) => {
    setSelectedPostId(postId);
  }, []);

  const handleAssignPlatform = useCallback((platform: SocialPlatform) => {
    onAssignPlatform(campaign.id, platform, selectedDate);
  }, [campaign.id, selectedDate, onAssignPlatform]);

  const handleGenerate = useCallback(async (scope: "single" | "date" | "platform" | "all") => {
    // For now, all generation scopes call the same backend endpoint
    // The scope can be used to filter which platforms/posts to regenerate
    await onGenerate(campaign.id);
  }, [campaign.id, onGenerate]);

  const approvedCount = campaign.socialPosts.filter((p) => p.approved).length;
  const totalCount = campaign.socialPosts.length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar: back, campaign info, actions */}
      <div className="px-5 py-3 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
            >
              <span>&larr;</span> Back
            </button>
            <h1 className="text-sm font-semibold text-zinc-100">{campaign.clientName}</h1>
            <span className="text-xs text-zinc-500">{campaign.projectType}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 uppercase tracking-wider">
              {campaign.tone}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {totalCount > 0 && (
              <>
                <button
                  onClick={() => onApproveAll(campaign.id)}
                  className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 transition-colors"
                >
                  Approve All ({approvedCount}/{totalCount})
                </button>
                <button
                  onClick={() => onExport(campaign)}
                  className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 transition-colors"
                >
                  Export
                </button>
                <button
                  onClick={async () => {
                    const newId = await onDuplicate(campaign.id);
                    // Parent handles navigation to the new campaign
                  }}
                  className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 transition-colors"
                >
                  Duplicate
                </button>
              </>
            )}
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-red-500/60 hover:text-red-400 px-2 py-1 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Editable brief */}
        <div className="mt-2">
          <textarea
            value={campaign.brief}
            onChange={(e) => onUpdateBrief(campaign.id, e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-400 resize-none focus:outline-none focus:border-zinc-600"
            rows={2}
            placeholder="Campaign brief..."
          />
        </div>
      </div>

      {/* Three-panel layout */}
      <div className="flex flex-1 min-h-0">
        <CampaignCalendar
          posts={campaign.socialPosts}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
        />

        {selectedPost ? (
          <PostEditor
            post={selectedPost}
            campaignId={campaign.id}
            onUpdatePost={onUpdatePost}
            onApprovePost={onApprovePost}
            onGenerate={handleGenerate}
            isGenerating={campaign.status === "generating"}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-zinc-600 text-sm">
              {campaign.socialPosts.length === 0
                ? "Assign a platform from the sidebar to get started."
                : "Select a platform to view its post."}
            </div>
          </div>
        )}

        <PlatformSidebar
          posts={datePosts}
          allPosts={campaign.socialPosts}
          selectedDate={selectedDate}
          selectedPostId={selectedPost?.id ?? null}
          onSelectPost={handleSelectPost}
          onAssignPlatform={handleAssignPlatform}
        />
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 className="text-sm font-medium text-zinc-100">Delete campaign?</h3>
            <p className="text-xs text-zinc-400">
              This will permanently delete the <span className="text-zinc-200">{campaign.clientName}</span> campaign and all its posts. This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-zinc-500 hover:text-zinc-300 px-3 py-1.5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { onDelete(campaign.id); setConfirmDelete(false); }}
                className="text-xs bg-red-600 hover:bg-red-500 text-white px-4 py-1.5 rounded font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/CampaignDetailView.tsx
git commit -m "Add CampaignDetailView orchestrating calendar, editor, and sidebar"
```

---

### Task 7: Add `assignPlatform` to `useCampaigns` hook

**Files:**
- Modify: `client/src/hooks/useCampaigns.ts`

- [ ] **Step 1: Add the `assignPlatform` callback**

In `client/src/hooks/useCampaigns.ts`, add a new callback after `markExported`:

```typescript
const assignPlatform = useCallback(
  async (campaignId: string, platform: SocialPlatform, scheduledDate: string | null) => {
    setCampaigns((prev) => {
      const next = new Map(prev);
      const c = next.get(campaignId);
      if (c) {
        // Check if platform already exists
        if (c.socialPosts.some((p) => p.platform === platform)) return prev;
        const newPost: SocialPost = {
          id: `post_${campaignId}_${platform}_${Date.now()}`,
          platform,
          hook: "",
          caption: "",
          edited: false,
          approved: false,
          scheduledDate,
        };
        const updatedPosts = [...c.socialPosts, newPost];
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
          })),
        });
      }
      return next;
    });
  },
  []
);
```

Also add `SocialPlatform` to the imports at the top of the file:

```typescript
import { Campaign, CampaignTone, Lead, SocialPost, SocialPlatform } from "../types";
```

- [ ] **Step 2: Add to the return object**

Add `assignPlatform` to the return statement:

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
};
```

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useCampaigns.ts
git commit -m "Add assignPlatform callback to useCampaigns hook"
```

---

### Task 8: Rewire `ContentView` to use `CampaignDetailView`

**Files:**
- Modify: `client/src/components/ContentView.tsx`
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Update ContentView props and detail view**

In `client/src/components/ContentView.tsx`:

1. Add `assignPlatform` to the `ContentViewProps` interface:
```typescript
assignPlatform: (campaignId: string, platform: SocialPlatform, date: string | null) => void;
```

2. Add it to the destructured props.

3. Replace the entire campaign detail view section (the `if (selected)` block, lines ~124-282) with:

```typescript
if (selected) {
  return (
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
    />
  );
}
```

4. Remove the `confirmRegenerate`, `confirmDelete` state variables (now handled inside `CampaignDetailView`).

5. Remove the `handleGenerate` callback (no longer needed at this level).

6. Remove the `ContentOutputPanel` import (no longer used in this file).

7. Add the `CampaignDetailView` import:
```typescript
import { CampaignDetailView } from "./CampaignDetailView";
```

8. Add `SocialPlatform` to the type imports:
```typescript
import { Campaign, CampaignTone, CampaignStatus, Lead, SocialPlatform } from "../types";
```

- [ ] **Step 2: Update App.tsx to pass `assignPlatform`**

In `client/src/App.tsx`, add `assignPlatform` to the ContentView props:

```typescript
assignPlatform={campaignHook.assignPlatform}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd client && npx tsc --noEmit`

Expected: Clean compile, no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/ContentView.tsx client/src/App.tsx
git commit -m "Replace campaign detail grid with three-panel calendar layout"
```

---

### Task 9: Update seed data with scheduled dates and verify

**Files:**
- Modify: `content/seed.py`

- [ ] **Step 1: Add scheduled dates to seed posts**

In `content/seed.py`, update the seed campaign's posts to spread across dates for a better demo experience. Update the first 3 posts to have `"scheduled_date": "2025-03-29"`, the next 2 to have `"scheduled_date": "2025-03-31"`, and the last one to have `"scheduled_date": None` (undecided).

Change each post's `"scheduled_date": None` (set in Task 1) to:
- Post 1 (instagram): `"scheduled_date": "2025-03-29"`
- Post 2 (tiktok): `"scheduled_date": "2025-03-29"`
- Post 3 (x): `"scheduled_date": "2025-03-29"`
- Post 4 (facebook): `"scheduled_date": "2025-03-31"`
- Post 5 (youtube_shorts): `"scheduled_date": "2025-03-31"`
- Post 6 (threads): `"scheduled_date": None`

- [ ] **Step 2: Drop the existing campaigns collection to re-seed**

To test the new seed data, drop the campaigns collection so it re-seeds on next server start:

```bash
mongosh ariademo --eval "db.campaigns.drop()"
```

- [ ] **Step 3: Verify the app loads correctly**

Start the dev server and verify:
- Campaign list shows Velo Fitness
- Clicking into it shows the three-panel layout
- Calendar shows dots on Mar 29 and Mar 31
- Undecided button shows badge "1"
- Clicking dates switches the sidebar platforms
- Post editor shows editable fields

- [ ] **Step 4: Commit**

```bash
git add content/seed.py
git commit -m "Update seed campaign with scheduled dates across multiple days"
```

---

### Task 10: Clean up unused components

**Files:**
- Possibly remove: `client/src/components/ContentOutputPanel.tsx`
- Possibly remove: `client/src/components/SocialPostCard.tsx`

- [ ] **Step 1: Check for remaining usage**

Search for imports of `ContentOutputPanel` and `SocialPostCard` across the codebase:

```bash
cd client && grep -r "ContentOutputPanel\|SocialPostCard" src/ --include="*.tsx" --include="*.ts"
```

If they are only imported by each other and no longer by ContentView, they can be removed.

- [ ] **Step 2: Remove unused files**

If no remaining consumers, delete:
```bash
rm client/src/components/ContentOutputPanel.tsx
rm client/src/components/SocialPostCard.tsx
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "Remove unused ContentOutputPanel and SocialPostCard components"
```
