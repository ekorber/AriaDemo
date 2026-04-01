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
