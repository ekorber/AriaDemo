import { Campaign, SocialPost } from "../types";

interface RawCampaign {
  id: string;
  lead_id: string;
  client_name: string;
  project_type: string;
  brief: string;
  tone: string;
  social_posts: Array<{
    id: string;
    platform: string;
    hook: string;
    caption: string;
    edited: boolean;
    approved: boolean;
    scheduled_date: string | null;
  }>;
  status: string;
  created_at: string;
}

function deserialize(raw: RawCampaign): Campaign {
  return {
    id: raw.id,
    leadId: raw.lead_id,
    clientName: raw.client_name,
    projectType: raw.project_type,
    brief: raw.brief,
    tone: raw.tone,
    socialPosts: (raw.social_posts || []).map((p) => ({
      id: p.id,
      platform: p.platform as SocialPost["platform"],
      hook: p.hook,
      caption: p.caption,
      edited: p.edited,
      approved: p.approved,
      scheduledDate: p.scheduled_date,
    })),
    status: raw.status as Campaign["status"],
    createdAt: new Date(raw.created_at),
  };
}

export async function fetchCampaigns(): Promise<Campaign[]> {
  const res = await fetch("/api/content/campaigns/");
  if (!res.ok) throw new Error("Failed to fetch campaigns");
  const data: RawCampaign[] = await res.json();
  return data.map(deserialize);
}

export async function createCampaignApi(fields: {
  lead_id: string;
  client_name: string;
  project_type: string;
  brief: string;
  tone: string;
}): Promise<Campaign> {
  const res = await fetch("/api/content/campaigns/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error("Failed to create campaign");
  return deserialize(await res.json());
}

export async function patchCampaignApi(
  id: string,
  fields: Record<string, unknown>
): Promise<Campaign> {
  const res = await fetch(`/api/content/campaigns/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error("Failed to update campaign");
  return deserialize(await res.json());
}

export async function deleteCampaignApi(id: string): Promise<void> {
  const res = await fetch(`/api/content/campaigns/${id}/`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete campaign");
}

export async function duplicateCampaignApi(id: string): Promise<Campaign> {
  const res = await fetch(`/api/content/campaigns/${id}/duplicate/`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to duplicate campaign");
  return deserialize(await res.json());
}
