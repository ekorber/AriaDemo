import { useState, useCallback } from "react";
import { Campaign, CampaignTone, CampaignStatus, Lead, SocialPlatform } from "../types";
import { ContentOutputPanel } from "./ContentOutputPanel";

const STATUS_BADGE: Record<CampaignStatus, string> = {
  draft: "bg-zinc-800 text-zinc-400",
  generating: "bg-amber-950 text-amber-400 animate-pulse",
  ready: "bg-emerald-950 text-emerald-400",
  exported: "bg-blue-950 text-blue-400",
};

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: "INSTAGRAM",
  tiktok: "TIKTOK",
  x: "X",
  facebook: "FACEBOOK",
  youtube_shorts: "YOUTUBE SHORTS",
  threads: "THREADS",
};

interface ContentViewProps {
  leads: Lead[];
  campaigns: Campaign[];
  getCampaign: (id: string) => Campaign | null;
  createCampaign: (leadId: string, brief: string, tone: CampaignTone) => Promise<string>;
  updateCampaignBrief: (id: string, brief: string) => void;
  generateContent: (id: string) => Promise<void>;
  updatePost: (campaignId: string, postId: string, fields: { hook?: string; caption?: string }) => void;
  approvePost: (campaignId: string, postId: string) => void;
  approveAll: (campaignId: string) => void;
  deleteCampaign: (campaignId: string) => void;
  duplicateCampaign: (campaignId: string) => Promise<string | null>;
  markExported: (campaignId: string) => void;
  initialCampaignId?: string | null;
  initialLeadId?: string | null;
  onConsumeInitial?: () => void;
}

export function ContentView({
  leads,
  campaigns,
  getCampaign,
  createCampaign,
  updateCampaignBrief,
  generateContent,
  updatePost,
  approvePost,
  approveAll,
  deleteCampaign,
  duplicateCampaign,
  markExported,
  initialCampaignId,
  initialLeadId,
  onConsumeInitial,
}: ContentViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(initialCampaignId ?? null);
  const [showNewForm, setShowNewForm] = useState(!!initialLeadId);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  // New campaign form state
  const [newLeadId, setNewLeadId] = useState(initialLeadId ?? "");
  const [newBrief, setNewBrief] = useState("");
  const [newTone, setNewTone] = useState<CampaignTone>("");

  // Consume initial props after first render
  if ((initialCampaignId || initialLeadId) && onConsumeInitial) {
    onConsumeInitial();
  }

  const handedOffLeads = leads.filter(
    (l) => l.status === "handed_off" || l.status === "closed"
  );

  const selected = selectedId ? getCampaign(selectedId) : null;

  const handleCreate = async () => {
    if (!newLeadId || !newBrief.trim() || !newTone.trim()) return;
    const id = await createCampaign(newLeadId, newBrief.trim(), newTone.trim());
    setSelectedId(id);
    setShowNewForm(false);
    setNewLeadId("");
    setNewBrief("");
    setNewTone("");
  };

  const handleGenerate = useCallback(async () => {
    if (!selected) return;
    if (selected.socialPosts.length > 0 && !confirmRegenerate) {
      setConfirmRegenerate(true);
      return;
    }
    setConfirmRegenerate(false);
    await generateContent(selected.id);
  }, [selected, confirmRegenerate, generateContent]);

  const handleExport = useCallback(() => {
    if (!selected) return;
    const PLATFORM_ORDER: SocialPlatform[] = ["instagram", "tiktok", "x", "facebook", "youtube_shorts", "threads"];
    const lines = PLATFORM_ORDER.map((platform) => {
      const post = selected.socialPosts.find((p) => p.platform === platform);
      if (!post) return "";
      return `=== ${PLATFORM_LABELS[platform]} ===\n${post.hook}\n${post.caption ? post.caption + "\n" : ""}`;
    }).filter(Boolean);

    const text = lines.join("\n");

    // Download as .txt
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selected.clientName.replace(/\s+/g, "_")}_campaign.txt`;
    a.click();
    URL.revokeObjectURL(url);

    // Also copy to clipboard
    navigator.clipboard.writeText(text);

    markExported(selected.id);
  }, [selected, markExported]);

  // ─── Campaign Detail View ─────────────────────────────────
  if (selected) {
    const approvedCount = selected.socialPosts.filter((p) => p.approved).length;
    const totalCount = selected.socialPosts.length;

    return (
      <div className="flex-1 overflow-y-auto p-6">
        {/* Back + header */}
        <div className="mb-6">
          <button
            onClick={() => { setSelectedId(null); setConfirmRegenerate(false); }}
            className="text-xs text-zinc-500 hover:text-zinc-300 mb-3 flex items-center gap-1 transition-colors"
          >
            <span>&larr;</span> Back to campaigns
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-lg font-semibold text-zinc-100">{selected.clientName}</h1>
            <span className="text-xs text-zinc-500">{selected.projectType}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${STATUS_BADGE[selected.status]}`}>
              {selected.status}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 uppercase tracking-wider">
              {selected.tone}
            </span>
          </div>
        </div>

        {/* Editable brief */}
        <div className="mb-6">
          <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1.5">Brief</label>
          <textarea
            value={selected.brief}
            onChange={(e) => updateCampaignBrief(selected.id, e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-300 resize-none focus:outline-none focus:border-zinc-600"
            rows={3}
          />
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          {confirmRegenerate ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-400">Regenerate will replace unapproved posts. Approved posts will be kept.</span>
              <button
                onClick={handleGenerate}
                className="text-xs bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmRegenerate(false)}
                className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1.5"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={selected.status === "generating" || !selected.brief.trim()}
              className="text-xs bg-zinc-100 text-zinc-900 hover:bg-white px-4 py-1.5 rounded font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {selected.status === "generating"
                ? "Generating..."
                : selected.socialPosts.length > 0
                ? "Regenerate"
                : "Generate"}
            </button>
          )}

          {totalCount > 0 && (
            <>
              <button
                onClick={() => approveAll(selected.id)}
                className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1.5 transition-colors"
              >
                Approve All ({approvedCount}/{totalCount})
              </button>
              <button
                onClick={handleExport}
                className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1.5 transition-colors"
              >
                Export
              </button>
              <button
                onClick={async () => {
                  const newId = await duplicateCampaign(selected.id);
                  if (newId) setSelectedId(newId);
                }}
                className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1.5 transition-colors"
              >
                Duplicate
              </button>
            </>
          )}

          <button
            onClick={() => { deleteCampaign(selected.id); setSelectedId(null); }}
            className="text-xs text-red-500/60 hover:text-red-400 px-2 py-1.5 ml-auto transition-colors"
          >
            Delete
          </button>
        </div>

        {/* Posts grid or skeleton */}
        {selected.status === "generating" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 space-y-3 animate-pulse">
                <div className="h-5 w-24 bg-zinc-800 rounded-full" />
                <div className="h-4 w-3/4 bg-zinc-800 rounded" />
                <div className="space-y-2">
                  <div className="h-3 w-full bg-zinc-800/60 rounded" />
                  <div className="h-3 w-5/6 bg-zinc-800/60 rounded" />
                  <div className="h-3 w-2/3 bg-zinc-800/60 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : totalCount > 0 ? (
          <ContentOutputPanel
            posts={selected.socialPosts}
            onUpdatePost={(postId, fields) => updatePost(selected.id, postId, fields)}
            onApprovePost={(postId) => approvePost(selected.id, postId)}
            interactive
          />
        ) : (
          <div className="text-center py-16 text-zinc-600 text-sm">
            Write a brief above, then click Generate to create content for all 6 platforms.
          </div>
        )}
      </div>
    );
  }

  // ─── Campaign List View ───────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Campaigns</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="text-xs bg-zinc-100 text-zinc-900 hover:bg-white px-4 py-1.5 rounded font-medium transition-colors"
        >
          New Campaign
        </button>
      </div>

      {/* New campaign form */}
      {showNewForm && (
        <div className="border border-zinc-700 rounded-lg bg-zinc-900 p-5 mb-6 space-y-4">
          <h2 className="text-sm font-medium text-zinc-200">Create Campaign</h2>

          <div>
            <label className="text-xs text-zinc-500 block mb-1">Client</label>
            <select
              value={newLeadId}
              onChange={(e) => setNewLeadId(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-500"
            >
              <option value="">Select a handed-off lead...</option>
              {handedOffLeads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.name || "Unnamed"} — {lead.project_type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-zinc-500 block mb-1">Brief</label>
            <textarea
              value={newBrief}
              onChange={(e) => setNewBrief(e.target.value)}
              placeholder="Describe the campaign angle — what's the news, what are we promoting, who's the audience?"
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-300 resize-none focus:outline-none focus:border-zinc-500"
              rows={3}
            />
          </div>

          <div>
            <label className="text-xs text-zinc-500 block mb-1">Tone</label>
            <input
              type="text"
              value={newTone}
              onChange={(e) => setNewTone(e.target.value)}
              placeholder="e.g. hype, behind-the-scenes, educational, testimonial"
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button
              onClick={() => { setShowNewForm(false); setNewLeadId(""); setNewBrief(""); }}
              className="text-xs text-zinc-500 hover:text-zinc-300 px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!newLeadId || !newBrief.trim() || !newTone.trim()}
              className="text-xs bg-zinc-100 text-zinc-900 hover:bg-white px-4 py-1.5 rounded font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Create Draft
            </button>
          </div>
        </div>
      )}

      {/* Campaign cards */}
      {campaigns.length === 0 && !showNewForm ? (
        <div className="text-center py-16 text-zinc-600 text-sm">
          No campaigns yet. Close a deal in the Pipeline, then generate content here.
        </div>
      ) : (
        <div className="space-y-2">
          {campaigns.map((c) => {
            const approved = c.socialPosts.filter((p) => p.approved).length;
            const total = c.socialPosts.length;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className="w-full text-left border border-zinc-800 rounded-lg bg-zinc-900/50 hover:bg-zinc-900 p-4 transition-colors"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-200">{c.clientName}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${STATUS_BADGE[c.status]}`}>
                      {c.status}
                    </span>
                  </div>
                  {total > 0 && (
                    <span className="text-xs text-zinc-500">{approved}/{total} approved</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <span>{c.projectType}</span>
                  <span className="text-zinc-700">|</span>
                  <span className="capitalize">{c.tone}</span>
                  <span className="text-zinc-700">|</span>
                  <span>{c.createdAt.toLocaleDateString()}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
