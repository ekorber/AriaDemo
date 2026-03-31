# Generate Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure content generation to support granular scopes (single, date, platform, all) with multi-post, multi-date awareness.

**Architecture:** Single flexible endpoint accepts a scope, target posts to generate, and existing posts as read-only context. The system prompt is restructured for variable-length generation. The frontend computes targets based on scope and passes them to the backend.

**Tech Stack:** Django (Python), React/TypeScript, Anthropic Claude API

**Spec:** `docs/superpowers/specs/2026-03-31-generate-restructure-design.md`

---

### Task 1: Restructure the system prompt

**Files:**
- Modify: `content/system_prompt.py`

- [ ] **Step 1: Replace the system prompt**

Replace the entire contents of `content/system_prompt.py` with:

```python
CONTENT_SYSTEM_PROMPT = """You are a social media strategist working for a marketing AI platform. Given a client brief and a list of target posts, you generate platform-native social media content that feels authentic to each platform's culture and algorithm.

You adapt your voice to the client's industry, audience, and goals. You are not tied to any specific vertical — you write equally well for SaaS launches, consumer products, professional services, creative studios, e-commerce brands, and everything in between.

You will receive:
1. A client brief with campaign details
2. Existing posts (read-only context) — use these to maintain cohesion and avoid repeating hooks or ideas
3. Target posts to generate — produce content ONLY for these

Return ONLY valid JSON with this exact structure, keyed by postId:

{
  "posts": {
    "<postId>": { "hook": "...", "caption": "..." },
    "<postId>": { "hook": "...", "caption": "..." }
  }
}

Generate content for EVERY postId listed in the target posts. Do not generate content for existing posts. Follow these platform-specific rules:

**Instagram:**
- hook: Bold opening line — curiosity or strong statement
- caption: 150-200 words, conversational tone, line breaks every 2-3 sentences, 8-12 relevant hashtags at the end
- Include a visual direction note in brackets e.g. [product flat lay with lifestyle background] or [behind-the-scenes team photo]

**TikTok:**
- hook: First 1-2 seconds script — this is what stops the scroll, treat it like a cold open ("POV: your client just saw their first campaign results")
- caption: 80-120 words, casual and direct, sounds spoken not written, 4-6 trending-style hashtags
- Format as short-form video copy — write as if narrating a voiceover

**X (formerly Twitter):**
- hook: Opening line that stands alone as a complete thought
- caption: Under 280 characters total including hook, punchy, no hashtags or maximum 1, treat as a hot take or insight not an ad

**Facebook:**
- hook: Question or relatable statement that invites engagement
- caption: 100-150 words, warmer and more conversational than Instagram, written for sharing, ends with a clear question or call to action to drive comments
- No hashtags

**YouTube Shorts:**
- hook: Title/opening card text — 6 words max, front-loads the value ("We scaled revenue 3x in 90 days")
- caption: 80-100 word video description optimized for search, include the client/brand name and key search terms naturally, 3-5 hashtags at the end

**Threads:**
- hook: Opening line, more raw and unfiltered than Instagram
- caption: 150-300 characters, conversational, reads like a real person's thought not a brand post, single emoji max, no hashtags — Threads de-prioritizes them

**Tone guidance:**
The tone field is free-text written by the campaign manager. It may be a single word (e.g. "hype"), a short phrase (e.g. "playful but professional"), or a detailed description of the desired voice and feel. Interpret whatever they write as creative direction for the emotional register, energy level, and personality of the content. If the tone is vague or unclear, default to a confident, brand-appropriate voice and lean on context clues from the brief and industry.

Match the tone to every post. The tone should feel consistent across all generated posts while respecting each platform's native voice.

When generating multiple posts for the same platform (e.g. two Instagram posts on different dates), vary the angle, hook style, and structure so each post feels fresh. Do not recycle the same opening pattern or call-to-action."""
```

- [ ] **Step 2: Verify the file is valid Python**

Run: `docker exec ariademo_backend_1 python -c "from content.system_prompt import CONTENT_SYSTEM_PROMPT; print(len(CONTENT_SYSTEM_PROMPT))"`

Expected: A number (the character count), no import errors.

- [ ] **Step 3: Commit**

```bash
git add content/system_prompt.py
git commit -m "Restructure system prompt for variable-length multi-post generation"
```

---

### Task 2: Restructure `generate.py` — request parsing and prompt building

**Files:**
- Modify: `content/views/generate.py`

- [ ] **Step 1: Replace the view function and helpers**

Replace the entire contents of `content/views/generate.py` with:

```python
import json
import os
import re
import time

import anthropic
from bson import ObjectId
from django.http import StreamingHttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from chat.db import get_db
from content.system_prompt import CONTENT_SYSTEM_PROMPT


@csrf_exempt
@require_POST
def content_generate(request):
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    campaign_id = body.get("campaignId", "")
    client_name = body.get("clientName", "")
    project_type = body.get("projectType", "")
    tone = body.get("tone", "hype")
    brief = body.get("brief", "")
    targets = body.get("targets", [])
    existing_posts = body.get("existingPosts", [])

    if not brief:
        return JsonResponse({"error": "Brief is required"}, status=400)

    if not targets:
        return JsonResponse({"error": "No target posts to generate"}, status=400)

    for t in targets:
        if not t.get("platform"):
            return JsonResponse({"error": "Each target must have a platform"}, status=400)

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return JsonResponse({"error": "API key not configured"}, status=500)

    db = get_db()

    # Mark campaign as generating
    if campaign_id:
        try:
            oid = ObjectId(campaign_id)
            db.campaigns.update_one({"_id": oid}, {"$set": {"status": "generating"}})
        except Exception:
            pass

    user_message = _build_user_message(
        client_name, project_type, tone, brief, targets, existing_posts
    )

    collected = []

    def event_stream():
        client = anthropic.Anthropic(api_key=api_key)

        with client.messages.stream(
            model="claude-sonnet-4-20250514",
            max_tokens=4000,
            system=CONTENT_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        ) as stream:
            for text in stream.text_stream:
                collected.append(text)
                yield text

        # After streaming completes, save posts to the campaign
        if campaign_id:
            _save_generated_posts(campaign_id, "".join(collected))

    response = StreamingHttpResponse(
        event_stream(),
        content_type="text/plain",
    )
    response["Cache-Control"] = "no-cache"
    return response


def _build_user_message(client_name, project_type, tone, brief, targets, existing_posts):
    lines = [
        f"Client: {client_name}",
        f"Project: {project_type}",
        f"Tone: {tone}",
        f"Brief: {brief}",
    ]

    if existing_posts:
        lines.append("")
        lines.append("=== EXISTING POSTS (read-only context, do not regenerate) ===")
        for ep in existing_posts:
            parts = [ep.get("platform", "unknown")]
            date = ep.get("scheduledDate")
            time_val = ep.get("scheduledTime")
            if date:
                parts.append(f"{date} {time_val}" if time_val else date)
            else:
                parts.append("unscheduled")
            if ep.get("approved"):
                parts.append("approved")
            label = " | ".join(parts)
            lines.append(f"[{label}]")
            hook = ep.get("hook", "")
            caption = ep.get("caption", "")
            if hook:
                lines.append(f"Hook: {hook}")
            if caption:
                lines.append(f"Caption: {caption}")
            lines.append("")

    lines.append("=== GENERATE THESE POSTS ===")
    for t in targets:
        post_id = t.get("postId", "unknown")
        platform = t.get("platform", "unknown")
        date = t.get("scheduledDate")
        time_val = t.get("scheduledTime")
        if date:
            schedule = f"{date} {time_val}" if time_val else date
        else:
            schedule = "unscheduled"
        lines.append(f"- {post_id}: {platform} | {schedule}")

    return "\n".join(lines)


def _save_generated_posts(campaign_id, raw_text):
    """Parse generated content and merge into existing campaign posts by postId."""
    db = get_db()
    try:
        oid = ObjectId(campaign_id)
    except Exception:
        return

    json_match = re.search(r"\{[\s\S]*\}", raw_text)
    if not json_match:
        db.campaigns.update_one({"_id": oid}, {"$set": {"status": "ready"}})
        return

    try:
        parsed = json.loads(json_match.group(0))
    except json.JSONDecodeError:
        db.campaigns.update_one({"_id": oid}, {"$set": {"status": "ready"}})
        return

    posts_dict = parsed.get("posts")
    if not posts_dict or not isinstance(posts_dict, dict):
        db.campaigns.update_one({"_id": oid}, {"$set": {"status": "ready"}})
        return

    campaign = db.campaigns.find_one({"_id": oid})
    if not campaign:
        return

    # Merge: update hook/caption for matching postIds, leave everything else untouched
    existing = campaign.get("social_posts", [])
    updated = []
    for post in existing:
        pid = post.get("id", "")
        if pid in posts_dict:
            generated = posts_dict[pid]
            post["hook"] = generated.get("hook", post.get("hook", ""))
            post["caption"] = generated.get("caption", post.get("caption", ""))
        updated.append(post)

    db.campaigns.update_one(
        {"_id": oid},
        {"$set": {"social_posts": updated, "status": "ready"}},
    )
```

- [ ] **Step 2: Verify the module imports cleanly**

Run: `docker exec ariademo_backend_1 python -c "from content.views.generate import content_generate; print('OK')"`

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add content/views/generate.py
git commit -m "Restructure generate view for scoped multi-post generation"
```

---

### Task 3: Update `contentService.ts` — new payload and response parsing

**Files:**
- Modify: `client/src/services/contentService.ts`

- [ ] **Step 1: Replace the content service**

Replace the entire contents of `client/src/services/contentService.ts` with:

```typescript
import { Campaign, SocialPost } from "../types";

interface GenerateTarget {
  postId: string;
  platform: string;
  scheduledDate: string | null;
  scheduledTime: string | null;
}

interface ExistingPost {
  postId: string;
  platform: string;
  scheduledDate: string | null;
  scheduledTime: string | null;
  hook: string;
  caption: string;
  approved: boolean;
}

interface GeneratePayload {
  campaignId: string;
  clientName: string;
  projectType: string;
  tone: string;
  brief: string;
  scope: string;
  targets: GenerateTarget[];
  existingPosts: ExistingPost[];
}

export async function generateCampaignContent(
  payload: GeneratePayload,
  onComplete: (generatedPosts: Record<string, { hook: string; caption: string }>) => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    const response = await fetch("/api/content/generate/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      onError("Failed to generate content. Please try again.");
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      onError("Streaming is not supported.");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
    }

    const posts = parseContentResponse(buffer);
    if (posts) {
      onComplete(posts);
    } else {
      onError("Could not parse the generated content. Please try again.");
    }
  } catch {
    onError("Connection error. Please check your network and try again.");
  }
}

function parseContentResponse(raw: string): Record<string, { hook: string; caption: string }> | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);

    // Handle new keyed-by-postId format: { posts: { postId: { hook, caption } } }
    if (parsed.posts && typeof parsed.posts === "object" && !Array.isArray(parsed.posts)) {
      return parsed.posts;
    }

    return null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `docker exec ariademo_frontend_1 npx tsc --noEmit 2>&1 | head -20`

Expected: Errors in `useCampaigns.ts` (because it still uses the old signature). That's expected — we fix it in the next task.

- [ ] **Step 3: Commit**

```bash
git add client/src/services/contentService.ts
git commit -m "Update contentService for scoped generation with keyed-by-postId response"
```

---

### Task 4: Update `useCampaigns.ts` — scope-aware `generateContent`

**Files:**
- Modify: `client/src/hooks/useCampaigns.ts`

- [ ] **Step 1: Replace the `generateContent` callback**

In `client/src/hooks/useCampaigns.ts`, replace the `generateContent` callback (the `const generateContent = useCallback(...)` block, approximately lines 55-99) with:

```typescript
  const generateContent = useCallback(
    async (campaignId: string, scope: string, selectedPostId?: string, selectedDate?: string | null) => {
      // Read latest campaign from state to avoid stale closures
      let campaign: Campaign | undefined;
      setCampaigns((prev) => {
        const next = new Map(prev);
        const c = next.get(campaignId);
        if (c) {
          campaign = c;
          next.set(campaignId, { ...c, status: "generating" });
        }
        return next;
      });

      if (!campaign) return;

      // Compute targets and existing posts based on scope
      const allPosts = campaign.socialPosts;
      let targetPosts: SocialPost[];

      switch (scope) {
        case "single": {
          const post = allPosts.find((p) => p.id === selectedPostId);
          targetPosts = post && !post.approved ? [post] : [];
          break;
        }
        case "date":
          targetPosts = allPosts.filter(
            (p) => !p.approved && (selectedDate === null ? !p.scheduledDate : p.scheduledDate === selectedDate)
          );
          break;
        case "platform": {
          const post = allPosts.find((p) => p.id === selectedPostId);
          const platform = post?.platform;
          targetPosts = platform ? allPosts.filter((p) => !p.approved && p.platform === platform) : [];
          break;
        }
        case "all":
          targetPosts = allPosts.filter((p) => !p.approved);
          break;
        default:
          targetPosts = [];
      }

      if (targetPosts.length === 0) {
        // Nothing to generate — revert status
        setCampaigns((prev) => {
          const next = new Map(prev);
          const c = next.get(campaignId);
          if (c) next.set(campaignId, { ...c, status: campaign!.status });
          return next;
        });
        return;
      }

      const targetIds = new Set(targetPosts.map((p) => p.id));
      const existingPosts = allPosts
        .filter((p) => !targetIds.has(p.id))
        .map((p) => ({
          postId: p.id,
          platform: p.platform,
          scheduledDate: p.scheduledDate,
          scheduledTime: p.scheduledTime,
          hook: p.hook,
          caption: p.caption,
          approved: p.approved,
        }));

      const targets = targetPosts.map((p) => ({
        postId: p.id,
        platform: p.platform,
        scheduledDate: p.scheduledDate,
        scheduledTime: p.scheduledTime,
      }));

      await generateCampaignContent(
        {
          campaignId: campaign.id,
          clientName: campaign.clientName,
          projectType: campaign.projectType,
          tone: campaign.tone,
          brief: campaign.brief,
          scope,
          targets,
          existingPosts,
        },
        (_generatedPosts) => {
          // Backend saves the posts — refetch to get the persisted state
          fetchCampaigns()
            .then((list) => {
              const map = new Map<string, Campaign>();
              for (const c of list) map.set(c.id, c);
              setCampaigns(map);
            })
            .catch((err) => {
              console.error("Failed to refetch campaigns after generation:", err);
              setCampaigns((prev) => {
                const next = new Map(prev);
                const c = next.get(campaignId);
                if (c) next.set(campaignId, { ...c, status: "ready" });
                return next;
              });
            });
        },
        (error: string) => {
          console.error("Content generation failed:", error);
          setCampaigns((prev) => {
            const next = new Map(prev);
            const c = next.get(campaignId);
            if (c) next.set(campaignId, { ...c, status: "draft" });
            return next;
          });
        }
      );
    },
    []
  );
```

Also update the import at the top of the file — `generateCampaignContent` no longer takes a `Campaign` and `skipPlatforms`, it takes a payload object. The import itself doesn't change, just make sure it's still:

```typescript
import { generateCampaignContent } from "../services/contentService";
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `docker exec ariademo_frontend_1 npx tsc --noEmit 2>&1 | head -20`

Expected: Errors in `CampaignDetailView.tsx` (because `onGenerate` signature changed). That's expected — we fix it in the next task.

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useCampaigns.ts
git commit -m "Make generateContent scope-aware with target/existing post computation"
```

---

### Task 5: Update `CampaignDetailView.tsx` — pass scope and context

**Files:**
- Modify: `client/src/components/CampaignDetailView.tsx`
- Modify: `client/src/components/ContentView.tsx`

- [ ] **Step 1: Update the `onGenerate` prop type and handlers in `CampaignDetailView.tsx`**

In `client/src/components/CampaignDetailView.tsx`, change the `onGenerate` prop type in the interface from:

```typescript
  onGenerate: (campaignId: string) => Promise<void>;
```

to:

```typescript
  onGenerate: (campaignId: string, scope: string, selectedPostId?: string, selectedDate?: string | null) => Promise<void>;
```

Then replace the `handleAssignPlatform` callback with:

```typescript
  const handleAssignPlatform = useCallback((platform: SocialPlatform) => {
    // Create the post first, then generate content for just that post
    const newPostId = `post_${campaign.id}_${platform}_${Date.now()}`;
    onAssignPlatform(campaign.id, platform, selectedDate);
    onGenerate(campaign.id, "single", newPostId, selectedDate);
  }, [campaign.id, selectedDate, onAssignPlatform, onGenerate]);
```

Then replace the `handleGenerate` callback with:

```typescript
  const handleGenerate = useCallback(async (scope: "single" | "date" | "platform" | "all") => {
    await onGenerate(campaign.id, scope, selectedPost?.id, selectedDate);
  }, [campaign.id, selectedPost?.id, selectedDate, onGenerate]);
```

- [ ] **Step 2: Update the `onGenerate` prop type in `ContentView.tsx`**

In `client/src/components/ContentView.tsx`, change the `generateContent` prop type in the `ContentViewProps` interface from:

```typescript
  generateContent: (id: string) => Promise<void>;
```

to:

```typescript
  generateContent: (id: string, scope: string, selectedPostId?: string, selectedDate?: string | null) => Promise<void>;
```

- [ ] **Step 3: Sync the postId in `handleAssignPlatform` with `assignPlatform`**

The `handleAssignPlatform` creates a `newPostId` locally, but `assignPlatform` in `useCampaigns.ts` generates its own postId. These must match. Update `assignPlatform` in `client/src/hooks/useCampaigns.ts` to accept an optional `postId` parameter:

Change the `assignPlatform` callback signature from:

```typescript
  const assignPlatform = useCallback(
    async (campaignId: string, platform: SocialPlatform, scheduledDate: string | null) => {
```

to:

```typescript
  const assignPlatform = useCallback(
    async (campaignId: string, platform: SocialPlatform, scheduledDate: string | null, postId?: string) => {
```

And change the post ID generation inside from:

```typescript
            id: `post_${campaignId}_${platform}_${Date.now()}`,
```

to:

```typescript
            id: postId || `post_${campaignId}_${platform}_${Date.now()}`,
```

Then update the `onAssignPlatform` prop type in `CampaignDetailView.tsx` from:

```typescript
  onAssignPlatform: (campaignId: string, platform: SocialPlatform, date: string | null) => void;
```

to:

```typescript
  onAssignPlatform: (campaignId: string, platform: SocialPlatform, date: string | null, postId?: string) => void;
```

And update `handleAssignPlatform` to pass the postId:

```typescript
  const handleAssignPlatform = useCallback((platform: SocialPlatform) => {
    const newPostId = `post_${campaign.id}_${platform}_${Date.now()}`;
    onAssignPlatform(campaign.id, platform, selectedDate, newPostId);
    onGenerate(campaign.id, "single", newPostId, selectedDate);
  }, [campaign.id, selectedDate, onAssignPlatform, onGenerate]);
```

Also update the `ContentView.tsx` `assignPlatform` prop type to match:

```typescript
  assignPlatform: (campaignId: string, platform: SocialPlatform, date: string | null, postId?: string) => void;
```

- [ ] **Step 4: Verify TypeScript compiles cleanly**

Run: `docker exec ariademo_frontend_1 npx tsc --noEmit 2>&1 | head -20`

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/CampaignDetailView.tsx client/src/components/ContentView.tsx client/src/hooks/useCampaigns.ts
git commit -m "Wire scoped generation through CampaignDetailView and ContentView"
```

---

### Task 6: End-to-end verification

- [ ] **Step 1: Restart the backend to pick up Python changes**

Run: `docker restart ariademo_backend_1`

Wait a few seconds for it to come back up.

- [ ] **Step 2: Test single-post generation**

In the browser:
1. Open the app at `http://localhost:5173`
2. Go to the Content tab
3. Open an existing campaign (or create one with a brief)
4. Assign a platform from the sidebar — it should auto-generate content for just that one post
5. Verify: the new post gets a hook and caption, existing posts are untouched

- [ ] **Step 3: Test "all" scope generation**

1. Create a campaign with a brief
2. Assign 2-3 platforms
3. Click "Regen All" in the PostEditor
4. Verify: all non-approved posts get new content

- [ ] **Step 4: Test approved post protection**

1. Approve one post
2. Click "Regen All"
3. Verify: the approved post's content is unchanged, other posts are regenerated

- [ ] **Step 5: Commit any fixes if needed**

```bash
git add -u
git commit -m "Fix issues found during end-to-end verification"
```
