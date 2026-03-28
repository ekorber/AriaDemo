import { useState, useCallback } from "react";
import { Campaign, CampaignTone, Lead, SocialPost } from "../types";
import { generateCampaignContent } from "../services/contentService";

let campaignIdCounter = 0;
function nextCampaignId(): string {
  return `campaign_${++campaignIdCounter}_${Date.now()}`;
}

let postIdCounter = 1000;
function nextPostId(): string {
  return `seed_post_${++postIdCounter}`;
}

// Seed campaign — Velo Fitness product launch
const SEED_CAMPAIGN: Campaign = {
  id: "campaign_seed_1",
  leadId: "seed_lead_1",
  clientName: "Velo Fitness",
  projectType: "Product Launch — Connected Home Bike",
  brief: "Velo is launching their first connected home bike with live classes and an AI coach feature. Target audience is 30-45 year old professionals who want boutique fitness at home. The bike ships next month — this campaign builds pre-launch buzz and drives waitlist signups.",
  tone: "hype",
  status: "ready",
  createdAt: new Date("2025-03-25"),
  socialPosts: [
    {
      id: nextPostId(),
      platform: "instagram",
      hook: "Your gym membership just became optional.",
      caption: `We spent two years building the bike we wanted but couldn't find — one that actually adapts to you, not the other way around.\n\nVelo's connected home bike launches next month with live classes, on-demand rides, and an AI coach that learns your patterns and pushes you exactly when you need it.\n\nThis isn't another piece of equipment that becomes a clothes rack. This is the thing that replaces your 6am commute to the studio.\n\n[product hero shot: bike in a modern living room, morning light, screen showing a live class with instructor]\n\nJoin the waitlist — link in bio. First 500 riders get founding member pricing.\n\n#VeloFitness #ConnectedFitness #HomeBike #FitnessTech #AICoach #HomeWorkout #IndoorCycling #FitnessLaunch #BoutiqueFitness #SmartBike #WaitlistOpen #LaunchDay`,
      edited: false,
      approved: true,
    },
    {
      id: nextPostId(),
      platform: "tiktok",
      hook: "POV: you just finished a live cycling class and you never left your apartment",
      caption: `The screen fades out. Your legs are shaking. The AI coach just told you that was your best sprint in three weeks.\n\nAnd your commute home? Walking to the shower.\n\nVelo built a connected bike that doesn't just stream classes — it actually coaches you. Real-time power zones. Adaptive difficulty. It knows when you're sandbagging.\n\nWaitlist is open. This ships next month.\n\n#FitnessTok #HomeBike #VeloFitness #ConnectedFitness #AIFitness #WorkoutFromHome`,
      edited: false,
      approved: true,
    },
    {
      id: nextPostId(),
      platform: "x",
      hook: "Hot take: the reason most home bikes collect dust isn't motivation — it's that the software is boring. Velo fixed the software.",
      caption: "",
      edited: false,
      approved: true,
    },
    {
      id: nextPostId(),
      platform: "facebook",
      hook: "Be honest — how many times have you skipped the gym this month because getting there was the hardest part?",
      caption: `That's the problem Velo set out to solve. Not motivation. Not willpower. Just the friction.\n\nTheir new connected home bike brings boutique studio classes into your living room — live rides, on-demand library, and an AI coach that adjusts the workout to your fitness level in real time.\n\nNo commute. No class schedule to work around. No fighting for a bike in the back row.\n\nIt ships next month, and the first 500 people on the waitlist get founding member pricing.\n\nWould you switch from your gym to a setup like this? Or do you need the in-person energy to stay consistent? Genuinely curious — drop your take below.`,
      edited: false,
      approved: true,
    },
    {
      id: nextPostId(),
      platform: "youtube_shorts",
      hook: "AI coach vs. spinning instructor — who wins?",
      caption: `Watch what happens when we put Velo's AI cycling coach head-to-head against a traditional studio class. The Velo connected home bike uses real-time power zone tracking and adaptive resistance to personalize every ride. Whether you're training for a century ride or just getting back into fitness, Velo's AI coach meets you where you are. Launching next month with live classes and on-demand rides.\n\n#VeloFitness #ConnectedBike #AICoach #HomeCycling #FitnessTech`,
      edited: false,
      approved: true,
    },
    {
      id: nextPostId(),
      platform: "threads",
      hook: "genuinely did not expect to be this sore from a bike that lives in my spare bedroom",
      caption: `velo sent us an early unit and the AI coach does not care about your feelings. it just quietly makes the ride harder when it knows you can handle it 🚴`,
      edited: false,
      approved: true,
    },
  ],
};

export function useCampaigns(leads: Lead[]) {
  const [campaigns, setCampaigns] = useState<Map<string, Campaign>>(
    () => new Map([["campaign_seed_1", SEED_CAMPAIGN]])
  );

  const campaignList = Array.from(campaigns.values()).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  const createCampaign = useCallback(
    (leadId: string, brief: string, tone: CampaignTone): string => {
      const lead = leads.find((l) => l.id === leadId);
      const id = nextCampaignId();
      const campaign: Campaign = {
        id,
        leadId,
        clientName: lead?.name || "Unnamed Client",
        projectType: lead?.project_type || "",
        brief,
        tone,
        socialPosts: [],
        status: "draft",
        createdAt: new Date(),
      };
      setCampaigns((prev) => new Map(prev).set(id, campaign));
      return id;
    },
    [leads]
  );

  const updateCampaignBrief = useCallback((campaignId: string, brief: string) => {
    setCampaigns((prev) => {
      const next = new Map(prev);
      const c = next.get(campaignId);
      if (c) next.set(campaignId, { ...c, brief });
      return next;
    });
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

    // Skip platforms that already have approved posts
    const skipPlatforms = campaign.socialPosts
      .filter((p) => p.approved)
      .map((p) => p.platform);

    await generateCampaignContent(
      campaign,
      skipPlatforms,
      (posts: SocialPost[]) => {
        setCampaigns((prev) => {
          const next = new Map(prev);
          const c = next.get(campaignId);
          if (c) {
            const approvedPosts = c.socialPosts.filter((p) => p.approved);
            next.set(campaignId, {
              ...c,
              socialPosts: [...approvedPosts, ...posts],
              status: "ready",
            });
          }
          return next;
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
    (campaignId: string, postId: string, fields: Partial<Pick<SocialPost, "hook" | "caption">>) => {
      setCampaigns((prev) => {
        const next = new Map(prev);
        const c = next.get(campaignId);
        if (c) {
          next.set(campaignId, {
            ...c,
            socialPosts: c.socialPosts.map((p) =>
              p.id === postId ? { ...p, ...fields, edited: true } : p
            ),
          });
        }
        return next;
      });
    },
    []
  );

  const approvePost = useCallback((campaignId: string, postId: string) => {
    setCampaigns((prev) => {
      const next = new Map(prev);
      const c = next.get(campaignId);
      if (c) {
        next.set(campaignId, {
          ...c,
          socialPosts: c.socialPosts.map((p) =>
            p.id === postId ? { ...p, approved: !p.approved } : p
          ),
        });
      }
      return next;
    });
  }, []);

  const approveAll = useCallback((campaignId: string) => {
    setCampaigns((prev) => {
      const next = new Map(prev);
      const c = next.get(campaignId);
      if (c) {
        next.set(campaignId, {
          ...c,
          socialPosts: c.socialPosts.map((p) => ({ ...p, approved: true })),
        });
      }
      return next;
    });
  }, []);

  const deleteCampaign = useCallback((campaignId: string) => {
    setCampaigns((prev) => {
      const next = new Map(prev);
      next.delete(campaignId);
      return next;
    });
  }, []);

  const duplicateCampaign = useCallback((campaignId: string): string | null => {
    const original = campaigns.get(campaignId);
    if (!original) return null;
    const id = nextCampaignId();
    const copy: Campaign = {
      ...original,
      id,
      status: "draft",
      createdAt: new Date(),
      socialPosts: original.socialPosts.map((p) => ({
        ...p,
        id: `${p.id}_copy_${Date.now()}`,
        approved: false,
      })),
    };
    setCampaigns((prev) => new Map(prev).set(id, copy));
    return id;
  }, [campaigns]);

  const markExported = useCallback((campaignId: string) => {
    setCampaigns((prev) => {
      const next = new Map(prev);
      const c = next.get(campaignId);
      if (c) next.set(campaignId, { ...c, status: "exported" });
      return next;
    });
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
