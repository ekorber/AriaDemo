import { useState, useCallback, useEffect } from "react";
import { Campaign, CampaignTone, Lead, SocialPost } from "../types";
import { generateCampaignContent } from "../services/contentService";
import {
  fetchCampaigns,
  createCampaignApi,
  patchCampaignApi,
  deleteCampaignApi,
  duplicateCampaignApi,
} from "../services/campaignService";

export function useCampaigns(leads: Lead[]) {
  const [campaigns, setCampaigns] = useState<Map<string, Campaign>>(new Map());

  // Load campaigns from backend on mount
  useEffect(() => {
    fetchCampaigns().then((list) => {
      const map = new Map<string, Campaign>();
      for (const c of list) map.set(c.id, c);
      setCampaigns(map);
    });
  }, []);

  const campaignList = Array.from(campaigns.values()).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  const createCampaign = useCallback(
    async (leadId: string, brief: string, tone: CampaignTone): Promise<string> => {
      const lead = leads.find((l) => l.id === leadId);
      const campaign = await createCampaignApi({
        lead_id: leadId,
        client_name: lead?.name || "Unnamed Client",
        project_type: lead?.project_type || "",
        brief,
        tone,
      });
      setCampaigns((prev) => new Map(prev).set(campaign.id, campaign));
      return campaign.id;
    },
    [leads]
  );

  const updateCampaignBrief = useCallback(async (campaignId: string, brief: string) => {
    // Optimistic update for responsiveness while typing
    setCampaigns((prev) => {
      const next = new Map(prev);
      const c = next.get(campaignId);
      if (c) next.set(campaignId, { ...c, brief });
      return next;
    });
    await patchCampaignApi(campaignId, { brief });
  }, []);

  const generateContent = useCallback(async (campaignId: string) => {
    setCampaigns((prev) => {
      const next = new Map(prev);
      const c = next.get(campaignId);
      if (c) next.set(campaignId, { ...c, status: "generating" });
      return next;
    });

    const campaign = campaigns.get(campaignId);
    if (!campaign) return;

    const skipPlatforms = campaign.socialPosts
      .filter((p) => p.approved)
      .map((p) => p.platform);

    await generateCampaignContent(
      campaign,
      skipPlatforms,
      (_posts: SocialPost[]) => {
        // Backend saves the posts — refetch to get the persisted state
        fetchCampaigns().then((list) => {
          const map = new Map<string, Campaign>();
          for (const c of list) map.set(c.id, c);
          setCampaigns(map);
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
  }, [campaigns]);

  const updatePost = useCallback(
    async (campaignId: string, postId: string, fields: Partial<Pick<SocialPost, "hook" | "caption">>) => {
      setCampaigns((prev) => {
        const next = new Map(prev);
        const c = next.get(campaignId);
        if (c) {
          const updatedPosts = c.socialPosts.map((p) =>
            p.id === postId ? { ...p, ...fields, edited: true } : p
          );
          next.set(campaignId, { ...c, socialPosts: updatedPosts });
          // Persist in background
          patchCampaignApi(campaignId, {
            social_posts: updatedPosts.map((p) => ({
              id: p.id,
              platform: p.platform,
              hook: p.hook,
              caption: p.caption,
              edited: p.edited,
              approved: p.approved,
            })),
          });
        }
        return next;
      });
    },
    []
  );

  const approvePost = useCallback(async (campaignId: string, postId: string) => {
    setCampaigns((prev) => {
      const next = new Map(prev);
      const c = next.get(campaignId);
      if (c) {
        const updatedPosts = c.socialPosts.map((p) =>
          p.id === postId ? { ...p, approved: !p.approved } : p
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
          })),
        });
      }
      return next;
    });
  }, []);

  const approveAll = useCallback(async (campaignId: string) => {
    setCampaigns((prev) => {
      const next = new Map(prev);
      const c = next.get(campaignId);
      if (c) {
        const updatedPosts = c.socialPosts.map((p) => ({ ...p, approved: true }));
        next.set(campaignId, { ...c, socialPosts: updatedPosts });
        patchCampaignApi(campaignId, {
          social_posts: updatedPosts.map((p) => ({
            id: p.id,
            platform: p.platform,
            hook: p.hook,
            caption: p.caption,
            edited: p.edited,
            approved: p.approved,
          })),
        });
      }
      return next;
    });
  }, []);

  const deleteCampaign = useCallback(async (campaignId: string) => {
    setCampaigns((prev) => {
      const next = new Map(prev);
      next.delete(campaignId);
      return next;
    });
    await deleteCampaignApi(campaignId);
  }, []);

  const duplicateCampaign = useCallback(async (campaignId: string): Promise<string | null> => {
    const copy = await duplicateCampaignApi(campaignId);
    setCampaigns((prev) => new Map(prev).set(copy.id, copy));
    return copy.id;
  }, []);

  const markExported = useCallback(async (campaignId: string) => {
    setCampaigns((prev) => {
      const next = new Map(prev);
      const c = next.get(campaignId);
      if (c) next.set(campaignId, { ...c, status: "exported" });
      return next;
    });
    await patchCampaignApi(campaignId, { status: "exported" });
  }, []);

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
  };
}
