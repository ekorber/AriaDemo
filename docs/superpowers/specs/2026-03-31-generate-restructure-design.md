# Generate Restructure: Multi-Post, Multi-Date Content Generation

## Problem

The content generation backend (`generate.py` + `system_prompt.py`) was built for a 1-call-produces-6-posts model: one post per platform, no date/time awareness. The frontend now supports multiple posts per platform with scheduled dates and times, and exposes four generation scopes (`single`, `date`, `platform`, `all`). The backend needs to match.

## Design

### API Contract

`POST /api/content/generate/` — same endpoint, new request body:

```json
{
  "campaignId": "abc123",
  "clientName": "Acme Corp",
  "projectType": "SaaS Launch",
  "tone": "hype",
  "brief": "Launch campaign for new analytics dashboard...",
  "scope": "single",
  "targets": [
    { "postId": "post_abc_instagram_123", "platform": "instagram", "scheduledDate": "2026-04-05", "scheduledTime": "15:00" }
  ],
  "existingPosts": [
    { "postId": "post_abc_tiktok_456", "platform": "tiktok", "scheduledDate": "2026-04-05", "scheduledTime": "10:00", "hook": "POV: your dashboard...", "caption": "We just shipped...", "approved": true }
  ]
}
```

- **`scope`**: `"single" | "date" | "platform" | "all"` — informational only, actual work is driven by `targets`.
- **`targets`**: Posts to generate content for. Each has `postId`, `platform`, and optional `scheduledDate`/`scheduledTime`.
- **`existingPosts`**: All other posts in the campaign, included as read-only context for cohesion. Approved and non-approved alike.

The frontend computes `targets` and `existingPosts` from campaign state based on scope. The backend doesn't need scoping logic.

### System Prompt

The prompt keeps all existing platform-specific rules but removes the fixed 6-post structure. Key changes:

- Instructs Claude to generate only the requested posts (identified by postId).
- Existing posts are included as read-only context so content stays cohesive and doesn't repeat hooks.
- Date/time is present in the context (light touch) — Claude can use it naturally but isn't explicitly instructed to factor in timing.

Output structure changes from a flat array to keyed-by-postId:

```json
{
  "posts": {
    "post_abc_instagram_123": { "hook": "...", "caption": "..." }
  }
}
```

Keyed by postId eliminates ambiguity when generating multiple posts for the same platform on different dates.

### User Message Template

Built dynamically in `generate.py`:

```
Client: Acme Corp
Project: SaaS Launch
Tone: hype
Brief: Launch campaign for new analytics dashboard...

=== EXISTING POSTS (read-only context, do not regenerate) ===
[tiktok | 2026-04-05 10:00 | approved]
Hook: POV: your dashboard...
Caption: We just shipped...

=== GENERATE THESE POSTS ===
- post_abc_instagram_123: instagram | 2026-04-05 15:00
- post_abc_fb_456: facebook | 2026-04-06 09:00
```

When there are no existing posts (first post in a campaign), the existing posts section is omitted.

### Backend Changes (`generate.py`)

1. **Parse new body**: Extract `scope`, `targets`, `existingPosts` instead of `skipPlatforms`.
2. **Validate**: At least one target, brief not empty, all targets have a platform.
3. **Build user message**: Template existing posts as context, list targets to generate.
4. **Stream response**: Same streaming approach as before.
5. **Save results (`_save_generated_posts`)**: Changes from replace to **merge**. Matches generated content back to existing posts by `postId`, updates only `hook` and `caption`. Leaves `scheduledDate`, `scheduledTime`, `approved`, `edited`, etc. untouched. Posts not in the response are left alone.

### Frontend Changes

**`contentService.ts`**:
- `generateCampaignContent` accepts the new payload shape (scope, targets, existingPosts).
- Response parsing changes to match the keyed-by-postId JSON structure.

**`useCampaigns.ts`**:
- `generateContent` signature changes to `(campaignId: string, scope: string, selectedPostId?: string, selectedDate?: string)`.
- Computes `targets` and `existingPosts` from campaign state based on scope:
  - `single`: target = selected post; existing = everything else.
  - `date`: targets = all non-approved posts on selected date; existing = everything else.
  - `platform`: targets = all non-approved posts for the selected post's platform; existing = everything else.
  - `all`: targets = all non-approved posts; existing = all approved posts.
- Reads campaign from inside `setCampaigns` updater (already fixed) to avoid stale closures.

**`CampaignDetailView.tsx`**:
- `handleGenerate` passes scope + context (selected post ID, selected date) to `generateContent`.
- `handleAssignPlatform` passes `scope: "single"` with the newly created post's ID.

### Error Handling & Edge Cases

- **No targets**: If all posts for the scope are approved, frontend shows a message — no API call.
- **Partial generation failure**: If Claude's response is missing some postIds, update the ones that succeeded. Leave the rest unchanged. Log missing ones.
- **Empty existing posts**: First post — no context section in the prompt. Works naturally.
- **`handleAssignPlatform` timing**: New post is created in state by `assignPlatform`, then `generateContent` reads it via `setCampaigns` updater. New post becomes the sole target.

### Files to Modify

- `content/system_prompt.py` — restructure prompt for variable-length generation
- `content/views/generate.py` — new body parsing, dynamic prompt building, merge-based save
- `client/src/services/contentService.ts` — new payload shape, new response parsing
- `client/src/hooks/useCampaigns.ts` — scope-aware `generateContent`, target/existing computation
- `client/src/components/CampaignDetailView.tsx` — pass scope + context to generate calls
