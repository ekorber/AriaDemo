# Campaign Calendar Layout Redesign

## Overview

Replace the current grid of 6 social media post cards with a three-panel layout: a calendar (left), a single post editor (center), and a platform sidebar (right). Campaigns now support multiple release dates, and posts are assigned to dates per-platform.

## Layout

Three panels, full height below the campaign header:

- **Left (280px):** Calendar panel with mini month calendar and an "Undecided" button below
- **Center (flex):** Single post editor with inline-editable hook and caption
- **Right (170px):** Platform sidebar showing platforms for the selected date

## Calendar Panel (Left)

A navigable month calendar grid (left/right arrows to change months). Dates that have posts assigned show colored dots — one dot per platform, using the platform's designated color. Clicking a date selects it, highlighting it with a blue border/background. The selected date determines what appears in the center and right panels.

Below the calendar grid is a color legend mapping dot colors to platform abbreviations (IG, TT, X, FB, YT, TH).

Below the legend is a single "Undecided" button. This functions like a date slot but has no calendar position. It holds posts that haven't been assigned to a release date yet. A badge shows the count of posts parked there. Clicking it selects it just like clicking a date.

### Adding dates

Clicking an empty date on the calendar creates a date slot for that day (the date becomes selectable and platforms can be assigned to it). There is no separate "Add Date" flow — just click the day.

## Post Editor (Center)

Displays one platform post at a time. Shows:

- Date label and platform name with colored dot
- Post status badge (draft, ready, approved, exported)
- **Hook** — inline-editable text field
- **Caption** — inline-editable textarea

### Generation actions

Below the editor fields:

| Button | Scope |
|--------|-------|
| Regenerate | This single post only |
| Gen. date | All platforms assigned to the selected date |
| Gen. all [platform] | This platform across all dates in the campaign |
| Gen. all | All ungenerated posts in the campaign |

An **Approve** button toggles approval for the current post.

## Platform Sidebar (Right)

Shows the platforms assigned to the currently selected date. Each platform is a clickable card showing the platform name (with colored dot) and its status. Clicking a platform loads its post in the center editor. The selected platform is highlighted with a blue border.

Below the assigned platforms:

- **"+ Assign Platform" button** — opens a selector to assign an unassigned platform to this date
- **Unassigned list** — shows platform dots and abbreviations for platforms not yet assigned to any date

## Data Model Changes

### Campaign document (MongoDB)

The `social_posts` array gains a `scheduled_date` field:

```
social_posts: [{
  id: string,
  platform: "instagram" | "tiktok" | "x" | "facebook" | "youtube_shorts" | "threads",
  hook: string,
  caption: string,
  edited: boolean,
  approved: boolean,
  scheduled_date: string | null   // ISO date "2026-03-29" or null for undecided
}]
```

No separate "date slots" collection — dates are derived from the `scheduled_date` values across posts. An empty date (no posts assigned yet) doesn't need storage; the UI creates it on click and it only persists once a platform is assigned.

### TypeScript types

`SocialPost` gains `scheduledDate: string | null`.

## Platform Colors

| Platform | Hex | Border |
|----------|-----|--------|
| Instagram | `#fc4bd6` | 1px solid #888 |
| TikTok | `#690089` | 1px solid #888 |
| X | `#000000` | 1px solid #888 |
| Facebook | `#1877F2` | none |
| YouTube Shorts | `#FF0000` | none |
| Threads | `#aaaaaa` | none |

Dark-colored platforms (Instagram, TikTok, X) get a gray border for visibility on the dark UI background.

## Component Structure

- **CampaignDetailView** — top-level layout, replaces current detail view in ContentView
  - **CampaignCalendar** — month grid, date selection, undecided button, legend
  - **PostEditor** — single post display with editable fields and action buttons
  - **PlatformSidebar** — platform list for selected date, assign/unassign controls

ContentView's list view (campaign cards) remains unchanged.

## Interactions

1. **Select date** — click a calendar day or the Undecided button. Right sidebar updates to show that date's platforms. Center shows the first platform's post (or empty state if no platforms assigned).
2. **Select platform** — click a platform in the right sidebar. Center panel loads that post.
3. **Assign platform** — click "+ Assign Platform" on the sidebar. A dropdown/popover shows unassigned platforms. Selecting one creates a draft post for that platform on the selected date and persists via PATCH.
4. **Move platform** — future consideration; not in initial scope.
5. **Generate** — any generate action calls the existing streaming endpoint. Backend saves results. Frontend refetches the campaign to update state.
6. **Edit post** — typing in hook/caption fields triggers a debounced PATCH to persist changes.

## What's Not Changing

- Campaign list view (card grid of all campaigns)
- Campaign creation form
- Backend CRUD endpoints (only adding `scheduled_date` to the post schema)
- Content generation system prompt and streaming endpoint
- Delete confirmation modal
