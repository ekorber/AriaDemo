import { useState, useCallback, useMemo } from "react";
import { Campaign, CampaignTone, SocialPlatform } from "../types";
import { CampaignCalendar } from "./CampaignCalendar";
import { PostEditor } from "./PostEditor";
import { PlatformSidebar } from "./PlatformSidebar";

interface CampaignDetailViewProps {
  campaign: Campaign;
  onBack: () => void;
  onUpdateBrief: (campaignId: string, brief: string) => void;
  onUpdateTone: (campaignId: string, tone: CampaignTone) => void;
  onUpdatePost: (campaignId: string, postId: string, fields: { caption?: string; reviewReady?: boolean }) => void;
  onApprovePost: (campaignId: string, postId: string) => void;
  onDeletePost: (campaignId: string, postId: string) => void;
  onApproveAll: (campaignId: string) => void;
  onDelete: (campaignId: string) => void;
  onDuplicate: (campaignId: string) => Promise<string | null>;
  onGenerate: (campaignId: string, scope: string, selectedPostId?: string, selectedDate?: string | null) => Promise<void>;
  onGenerateImage: (campaignId: string, scope: string, selectedPostId?: string, selectedDate?: string | null) => Promise<void>;
  onAssignPlatform: (campaignId: string, platform: SocialPlatform, date: string | null, postId?: string) => void;
  onUpdateSchedule: (campaignId: string, postId: string, date: string | null, time: string | null) => void;
  isGenerating: (id: string) => boolean;
  isGeneratingImage: (id: string) => boolean;
}

export function CampaignDetailView({
  campaign,
  onBack,
  onUpdateBrief,
  onUpdateTone,
  onUpdatePost,
  onApprovePost,
  onDeletePost,
  onApproveAll,
  onDelete,
  onDuplicate,
  onGenerate,
  onGenerateImage,
  onAssignPlatform,
  onUpdateSchedule,
  isGenerating,
  isGeneratingImage,
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
  const [showEditFields, setShowEditFields] = useState(false);

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
    const newPostId = `post_${campaign.id}_${platform}_${Date.now()}`;
    onAssignPlatform(campaign.id, platform, selectedDate, newPostId);
    setSelectedPostId(newPostId);
  }, [campaign.id, selectedDate, onAssignPlatform]);

  const handleUpdateSchedule = useCallback((postId: string, date: string | null, time: string | null) => {
    onUpdateSchedule(campaign.id, postId, date, time);
    // If the date changed, navigate to the new date
    if (date !== selectedDate) {
      setSelectedDate(date);
    }
  }, [campaign.id, selectedDate, onUpdateSchedule]);

  const handleGenerate = useCallback(async (scope: "single" | "date" | "platform" | "all") => {
    await onGenerate(campaign.id, scope, selectedPost?.id, selectedDate);
  }, [campaign.id, selectedPost?.id, selectedDate, onGenerate]);

  const handleGenerateImage = useCallback(async (scope: "single" | "date" | "platform" | "all") => {
    await onGenerateImage(campaign.id, scope, selectedPost?.id, selectedDate);
  }, [campaign.id, selectedPost?.id, selectedDate, onGenerateImage]);

  const approvedCount = campaign.socialPosts.filter((p) => p.approved).length;
  const totalCount = campaign.socialPosts.length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar: back, campaign info, actions */}
      <div className="px-5 py-3 border-b border-zinc-800 flex-shrink-0 relative z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-sm text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
            >
              <span>&larr;</span> Back
            </button>
            <h1 className="text-base font-semibold text-zinc-100">{campaign.clientName}</h1>
            <span className="text-sm text-zinc-500">{campaign.projectType}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditFields(!showEditFields)}
              className={`px-2 py-1 transition-colors ${
                showEditFields
                  ? "text-blue-400 hover:text-blue-300"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                {showEditFields
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />}
              </svg>
            </button>
            {totalCount > 0 && (
              <>
                <button
                  onClick={() => onApproveAll(campaign.id)}
                  className="text-sm text-zinc-500 hover:text-zinc-300 px-2 py-1 transition-colors"
                >
                  Approve All ({approvedCount}/{totalCount})
                </button>
                <button
                  onClick={async () => {
                    await onDuplicate(campaign.id);
                    // Parent handles navigation to the new campaign
                  }}
                  className="text-sm text-zinc-500 hover:text-zinc-300 px-2 py-1 transition-colors"
                >
                  Duplicate
                </button>
              </>
            )}
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-sm text-red-500/60 hover:text-red-400 px-2 py-1 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Editable brief & tone (collapsible overlay) */}
        {showEditFields && (
          <div className="absolute left-0 right-0 top-full bg-zinc-950 border-b border-zinc-800 px-5 py-3 space-y-2 shadow-lg">
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Brief</label>
              <textarea
                value={campaign.brief}
                onChange={(e) => onUpdateBrief(campaign.id, e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-400 resize-none focus:outline-none focus:border-zinc-600"
                rows={2}
                placeholder="Describe the campaign angle — what's the news, what are we promoting, who's the audience?"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Tone</label>
              <input
                type="text"
                value={campaign.tone}
                onChange={(e) => onUpdateTone(campaign.id, e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-400 focus:outline-none focus:border-zinc-600"
                placeholder="e.g. hype, behind-the-scenes, educational, testimonial"
              />
            </div>
          </div>
        )}
      </div>

      {/* Three-panel layout */}
      <div className="flex flex-1 min-h-0">
        <CampaignCalendar
          posts={campaign.socialPosts}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          selectedPostId={selectedPost?.id ?? null}
          onSelectPost={handleSelectPost}
        />

        {selectedPost ? (
          <PostEditor
            post={selectedPost}
            campaignId={campaign.id}
            onUpdatePost={onUpdatePost}
            onApprovePost={onApprovePost}
            onDeletePost={(cId, pId) => { onDeletePost(cId, pId); setSelectedPostId(null); }}
            onGenerate={handleGenerate}
            onGenerateImage={handleGenerateImage}
            isGenerating={isGenerating(campaign.id)}
            isGeneratingImage={isGeneratingImage(campaign.id)}
            onUpdateSchedule={(_cId, pId, date, time) => handleUpdateSchedule(pId, date, time)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-zinc-600 text-base">
              {campaign.socialPosts.length === 0
                ? "Assign a platform from the sidebar to get started."
                : "Select a platform to view its post."}
            </div>
          </div>
        )}

        <PlatformSidebar
          posts={datePosts}
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
            <h3 className="text-base font-medium text-zinc-100">Delete campaign?</h3>
            <p className="text-sm text-zinc-400">
              This will permanently delete the <span className="text-zinc-200">{campaign.clientName}</span> campaign and all its posts. This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-sm text-zinc-500 hover:text-zinc-300 px-3 py-1.5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { onDelete(campaign.id); setConfirmDelete(false); }}
                className="text-sm bg-red-600 hover:bg-red-500 text-white px-4 py-1.5 rounded font-medium transition-colors"
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
