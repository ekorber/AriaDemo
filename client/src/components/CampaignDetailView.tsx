import { useState, useCallback, useMemo } from "react";
import { Campaign, SocialPlatform } from "../types";
import { CampaignCalendar } from "./CampaignCalendar";
import { PostEditor } from "./PostEditor";
import { PlatformSidebar } from "./PlatformSidebar";

interface CampaignDetailViewProps {
  campaign: Campaign;
  onBack: () => void;
  onUpdateBrief: (campaignId: string, brief: string) => void;
  onUpdatePost: (campaignId: string, postId: string, fields: { hook?: string; caption?: string }) => void;
  onApprovePost: (campaignId: string, postId: string) => void;
  onApproveAll: (campaignId: string) => void;
  onDelete: (campaignId: string) => void;
  onDuplicate: (campaignId: string) => Promise<string | null>;
  onExport: (campaign: Campaign) => void;
  onGenerate: (campaignId: string) => Promise<void>;
  onAssignPlatform: (campaignId: string, platform: SocialPlatform, date: string | null) => void;
}

export function CampaignDetailView({
  campaign,
  onBack,
  onUpdateBrief,
  onUpdatePost,
  onApprovePost,
  onApproveAll,
  onDelete,
  onDuplicate,
  onExport,
  onGenerate,
  onAssignPlatform,
}: CampaignDetailViewProps) {
  // "undecided" is stored as selectedDate === null
  // A specific date is stored as "2026-03-29"
  // Initial state: first date with posts, or null (undecided) if all undecided, or null if no posts
  const [selectedDate, setSelectedDate] = useState<string | null>(() => {
    const scheduled = campaign.socialPosts.filter((p) => p.scheduledDate);
    if (scheduled.length > 0) {
      const dates = [...new Set(scheduled.map((p) => p.scheduledDate!))].sort();
      return dates[0];
    }
    return null;
  });
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Posts for the selected date
  const datePosts = useMemo(() => {
    return campaign.socialPosts.filter((p) =>
      selectedDate === null ? !p.scheduledDate : p.scheduledDate === selectedDate
    );
  }, [campaign.socialPosts, selectedDate]);

  // Auto-select first post when date changes or posts change
  const selectedPost = useMemo(() => {
    if (selectedPostId) {
      const found = datePosts.find((p) => p.id === selectedPostId);
      if (found) return found;
    }
    return datePosts[0] || null;
  }, [datePosts, selectedPostId]);

  const handleSelectDate = useCallback((date: string | null) => {
    setSelectedDate(date);
    setSelectedPostId(null); // reset post selection, let it auto-select first
  }, []);

  const handleSelectPost = useCallback((postId: string) => {
    setSelectedPostId(postId);
  }, []);

  const handleAssignPlatform = useCallback((platform: SocialPlatform) => {
    onAssignPlatform(campaign.id, platform, selectedDate);
  }, [campaign.id, selectedDate, onAssignPlatform]);

  const handleGenerate = useCallback(async (_scope: "single" | "date" | "platform" | "all") => {
    // For now, all generation scopes call the same backend endpoint
    // The scope can be used to filter which platforms/posts to regenerate
    await onGenerate(campaign.id);
  }, [campaign.id, onGenerate]);

  const approvedCount = campaign.socialPosts.filter((p) => p.approved).length;
  const totalCount = campaign.socialPosts.length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar: back, campaign info, actions */}
      <div className="px-5 py-3 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
            >
              <span>&larr;</span> Back
            </button>
            <h1 className="text-sm font-semibold text-zinc-100">{campaign.clientName}</h1>
            <span className="text-xs text-zinc-500">{campaign.projectType}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 uppercase tracking-wider">
              {campaign.tone}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {totalCount > 0 && (
              <>
                <button
                  onClick={() => onApproveAll(campaign.id)}
                  className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 transition-colors"
                >
                  Approve All ({approvedCount}/{totalCount})
                </button>
                <button
                  onClick={() => onExport(campaign)}
                  className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 transition-colors"
                >
                  Export
                </button>
                <button
                  onClick={async () => {
                    await onDuplicate(campaign.id);
                    // Parent handles navigation to the new campaign
                  }}
                  className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 transition-colors"
                >
                  Duplicate
                </button>
              </>
            )}
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-red-500/60 hover:text-red-400 px-2 py-1 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Editable brief */}
        <div className="mt-2">
          <textarea
            value={campaign.brief}
            onChange={(e) => onUpdateBrief(campaign.id, e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-400 resize-none focus:outline-none focus:border-zinc-600"
            rows={2}
            placeholder="Campaign brief..."
          />
        </div>
      </div>

      {/* Three-panel layout */}
      <div className="flex flex-1 min-h-0">
        <CampaignCalendar
          posts={campaign.socialPosts}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
        />

        {selectedPost ? (
          <PostEditor
            post={selectedPost}
            campaignId={campaign.id}
            onUpdatePost={onUpdatePost}
            onApprovePost={onApprovePost}
            onGenerate={handleGenerate}
            isGenerating={campaign.status === "generating"}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-zinc-600 text-sm">
              {campaign.socialPosts.length === 0
                ? "Assign a platform from the sidebar to get started."
                : "Select a platform to view its post."}
            </div>
          </div>
        )}

        <PlatformSidebar
          posts={datePosts}
          allPosts={campaign.socialPosts}
          selectedDate={selectedDate}
          selectedPostId={selectedPost?.id ?? null}
          onSelectPost={handleSelectPost}
          onAssignPlatform={handleAssignPlatform}
        />
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 className="text-sm font-medium text-zinc-100">Delete campaign?</h3>
            <p className="text-xs text-zinc-400">
              This will permanently delete the <span className="text-zinc-200">{campaign.clientName}</span> campaign and all its posts. This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-zinc-500 hover:text-zinc-300 px-3 py-1.5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { onDelete(campaign.id); setConfirmDelete(false); }}
                className="text-xs bg-red-600 hover:bg-red-500 text-white px-4 py-1.5 rounded font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
