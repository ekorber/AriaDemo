import { useState, useCallback, useEffect } from "react";
import { Campaign, CampaignTone, Lead, SocialPost, SocialPlatform } from "../types";
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

  const updatePost = useCallback(
    async (campaignId: string, postId: string, fields: Partial<Pick<SocialPost, "hook" | "caption" | "reviewReady">>) => {
      setCampaigns((prev) => {
        const next = new Map(prev);
        const c = next.get(campaignId);
        if (c) {
          const updatedPosts = c.socialPosts.map((p) =>
            p.id === postId ? { ...p, ...fields } : p
          );
          next.set(campaignId, { ...c, socialPosts: updatedPosts });
          // Persist in background
          patchCampaignApi(campaignId, {
            social_posts: updatedPosts.map((p) => ({
              id: p.id,
              platform: p.platform,
              hook: p.hook,
              caption: p.caption,
              review_ready: p.reviewReady,
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

  const deletePost = useCallback(async (campaignId: string, postId: string) => {
    setCampaigns((prev) => {
      const next = new Map(prev);
      const c = next.get(campaignId);
      if (c) {
        const updatedPosts = c.socialPosts.filter((p) => p.id !== postId);
        next.set(campaignId, { ...c, socialPosts: updatedPosts });
        patchCampaignApi(campaignId, {
          social_posts: updatedPosts.map((p) => ({
            id: p.id,
            platform: p.platform,
            hook: p.hook,
            caption: p.caption,

            approved: p.approved,
            scheduled_date: p.scheduledDate,
            scheduled_time: p.scheduledTime,
          })),
        });
      }
      return next;
    });
  }, []);

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

            approved: p.approved,
            scheduled_date: p.scheduledDate,
            scheduled_time: p.scheduledTime,
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

            approved: p.approved,
            scheduled_date: p.scheduledDate,
            scheduled_time: p.scheduledTime,
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

  const assignPlatform = useCallback(
    async (campaignId: string, platform: SocialPlatform, scheduledDate: string | null, postId?: string) => {
      setCampaigns((prev) => {
        const next = new Map(prev);
        const c = next.get(campaignId);
        if (c) {
          const newPost: SocialPost = {
            id: postId || `post_${campaignId}_${platform}_${Date.now()}`,
            platform,
            hook: "",
            caption: "",
            reviewReady: false,
            approved: false,
            scheduledDate,
            scheduledTime: null,
          };
          const updatedPosts = [...c.socialPosts, newPost];
          next.set(campaignId, { ...c, socialPosts: updatedPosts });
          patchCampaignApi(campaignId, {
            social_posts: updatedPosts.map((p) => ({
              id: p.id,
              platform: p.platform,
              hook: p.hook,
              caption: p.caption,
              review_ready: p.reviewReady,
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
              review_ready: p.reviewReady,
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

  return {
    campaigns: campaignList,
    getCampaign: (id: string) => campaigns.get(id) ?? null,
    createCampaign,
    updateCampaignBrief,
    generateContent,
    updatePost,
    approvePost,
    approveAll,
    deletePost,
    deleteCampaign,
    duplicateCampaign,
    markExported,
    assignPlatform,
    updateSchedule,
  };
}
