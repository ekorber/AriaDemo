import { useState } from "react";
import { Campaign, CampaignTone, Lead, SocialPlatform } from "../types";
import { CampaignDetailView } from "./CampaignDetailView";

interface ContentViewProps {
  leads: Lead[];
  campaigns: Campaign[];
  getCampaign: (id: string) => Campaign | null;
  createCampaign: (leadId: string, brief: string, tone: CampaignTone) => Promise<string>;
  updateCampaignBrief: (id: string, brief: string) => void;
  generateContent: (id: string, scope: string, selectedPostId?: string, selectedDate?: string | null) => Promise<void>;
  updatePost: (campaignId: string, postId: string, fields: { hook?: string; caption?: string; reviewReady?: boolean }) => void;
  approvePost: (campaignId: string, postId: string) => void;
  deletePost: (campaignId: string, postId: string) => void;
  approveAll: (campaignId: string) => void;
  deleteCampaign: (campaignId: string) => void;
  duplicateCampaign: (campaignId: string) => Promise<string | null>;
  assignPlatform: (campaignId: string, platform: SocialPlatform, date: string | null, postId?: string) => void;
  updateSchedule: (campaignId: string, postId: string, date: string | null, time: string | null) => void;
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
  deletePost,
  approveAll,
  deleteCampaign,
  duplicateCampaign,
  assignPlatform,
  updateSchedule,
  initialCampaignId,
  initialLeadId,
  onConsumeInitial,
}: ContentViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(initialCampaignId ?? null);
  const [showNewForm, setShowNewForm] = useState(!!initialLeadId);

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

  // ─── Campaign Detail View ─────────────────────────────────
  if (selected) {
    return (
      <CampaignDetailView
        campaign={selected}
        onBack={() => { setSelectedId(null); }}
        onUpdateBrief={updateCampaignBrief}
        onUpdatePost={updatePost}
        onApprovePost={approvePost}
        onDeletePost={deletePost}
        onApproveAll={approveAll}
        onDelete={(id) => { deleteCampaign(id); setSelectedId(null); }}
        onDuplicate={async (id) => {
          const newId = await duplicateCampaign(id);
          if (newId) setSelectedId(newId);
          return newId;
        }}
        onGenerate={generateContent}
        onAssignPlatform={assignPlatform}
        onUpdateSchedule={updateSchedule}
      />
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
