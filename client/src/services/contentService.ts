import { Campaign, SocialPost } from "../types";

let postIdCounter = 0;
function nextPostId(): string {
  return `post_${++postIdCounter}_${Date.now()}`;
}

export async function generateCampaignContent(
  campaign: Campaign,
  skipPlatforms: string[],
  onComplete: (posts: SocialPost[]) => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    const response = await fetch("/api/content/generate/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId: campaign.id,
        clientName: campaign.clientName,
        projectType: campaign.projectType,
        tone: campaign.tone,
        brief: campaign.brief,
        skipPlatforms,
      }),
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

function parseContentResponse(raw: string): SocialPost[] | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.socialPosts || !Array.isArray(parsed.socialPosts)) return null;

    return parsed.socialPosts.map((p: { platform: string; hook: string; caption: string }) => ({
      id: nextPostId(),
      platform: p.platform,
      hook: p.hook || "",
      caption: p.caption || "",
      edited: false,
      approved: false,
    }));
  } catch {
    return null;
  }
}
