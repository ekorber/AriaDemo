# Scheduled Time Feature Design

## Overview

Add a `scheduledTime` field to social posts, a vertical timeline view in the calendar panel, a date/time picker modal, and a schedule row in the PostEditor.

## Data Model

- New field: `scheduledTime: string | null` on `SocialPost`
  - Format: 24h string like `"15:00"`, or `null` for "No time set"
  - Default: `null`
  - MongoDB field: `scheduled_time` (snake_case)
  - Frontend field: `scheduledTime` (camelCase)
  - Same serialization pattern as `scheduledDate`

No migration needed — MongoDB is schemaless.

### Files to change:
- `client/src/types/index.ts` — add `scheduledTime` to `SocialPost`
- `client/src/services/campaignService.ts` — map `scheduled_time` ↔ `scheduledTime`
- `client/src/hooks/useCampaigns.ts` — include `scheduled_time` in PATCH payloads
- `content/views/generate.py` — set `"scheduled_time": None` on new posts
- `content/seed.py` — add `scheduled_time` values to seed data

## Timeline View (Calendar Panel)

A vertical line timeline below the Undecided button in `CampaignCalendar`.

### Layout:
- "Timeline" section header (uppercase style matching "Schedule")
- "No time set" posts grouped at top with "No time" label, each as a card with platform dot + truncated hook text
- Dashed separator line
- Timed posts below in chronological order, each with time label (e.g. "9:00a"), connected by a vertical line
- Clicking a post card selects it in the PostEditor

### Behavior:
- Only visible when a specific date is selected (hidden when Undecided is active)
- Updates reactively when posts change
- Scrolls within the calendar panel

### Props added to `CampaignCalendar`:
- `selectedPostId: string | null`
- `onSelectPost: (postId: string) => void`

## Date/Time Picker Modal (`ScheduleModal`)

### Trigger:
A dedicated schedule row in `PostEditor` below the header — clickable bar with calendar icon, date/time text, and "Edit" link.

### Modal layout (side by side):
- Left: Mini calendar for date selection (same styling as `CampaignCalendar`)
- Right: iOS-style scroll wheels for hour, minute (5-min increments), AM/PM

### Bottom row:
- "Set as Undecided" link — clears date (sets `scheduledDate` to `null`, also clears time)
- "Clear time" link — removes time only (`scheduledTime` = `null`), keeps date
- "Cancel" button — discards changes
- "Save" button — applies date and time

### Behavior:
- Opens pre-populated with post's current date and time
- If no date: calendar defaults to current month, nothing selected
- If no time: wheels default to 12:00 PM
- All states reachable: date+time, date only, fully undecided

### New component:
`ScheduleModal` in `client/src/components/ScheduleModal.tsx`

Props:
- `currentDate: string | null`
- `currentTime: string | null`
- `onSave: (date: string | null, time: string | null) => void`
- `onClose: () => void`

## PostEditor Changes

### New schedule row (between header and Hook field):
- Clickable bar: calendar icon + contextual text + "Edit" link
  - `"Mar 28 · 3:00 PM"` — date and time set
  - `"Mar 28 · No time set"` — date, no time
  - `"Undecided · No time set"` — no date, no time

### New prop:
- `onUpdateSchedule: (postId: string, date: string | null, time: string | null) => void`

## Component Summary

| Component | Change |
|-----------|--------|
| `SocialPost` type | Add `scheduledTime` field |
| `campaignService.ts` | Map `scheduled_time` ↔ `scheduledTime` |
| `useCampaigns.ts` | Include `scheduled_time` in serialization, add `updateSchedule` handler |
| `CampaignCalendar.tsx` | Add timeline view, accept `selectedPostId` and `onSelectPost` props |
| `PostEditor.tsx` | Add schedule row, integrate `ScheduleModal` |
| `ScheduleModal.tsx` | New component — calendar + scroll wheels modal |
| `CampaignDetailView.tsx` | Wire new props between calendar, editor, and schedule handler |
| `generate.py` | Default `scheduled_time: None` on new posts |
| `seed.py` | Add sample `scheduled_time` values |
