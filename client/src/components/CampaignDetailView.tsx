import { useState, useCallback, useMemo, useRef } from "react";
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
  const [showEditFields, setShowEditFields] = useState(false);
  const [calendarDrawer, setCalendarDrawer] = useState<'open' | 'closing' | null>(null);
  const [platformDrawer, setPlatformDrawer] = useState<'open' | 'closing' | null>(null);
  const calendarTimer = useRef<ReturnType<typeof setTimeout>>();
  const platformTimer = useRef<ReturnType<typeof setTimeout>>();

  const openCalendarDrawer = () => { clearTimeout(calendarTimer.current); setCalendarDrawer('open'); };
  const closeCalendarDrawer = () => { setCalendarDrawer('closing'); calendarTimer.current = setTimeout(() => setCalendarDrawer(null), 200); };
  const openPlatformDrawer = () => { clearTimeout(platformTimer.current); setPlatformDrawer('open'); };
  const closePlatformDrawer = () => { setPlatformDrawer('closing'); platformTimer.current = setTimeout(() => setPlatformDrawer(null), 200); };

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


  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar: back, campaign info, actions */}
      <div className="px-3 sm:px-5 py-3 border-b border-zinc-800 flex-shrink-0 relative z-20">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={onBack}
              className="text-sm text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors shrink-0"
            >
              <span>&larr;</span> Back
            </button>
            <h1 className="text-base font-semibold text-zinc-100 truncate">{campaign.clientName}</h1>
            <span className="text-sm text-zinc-500 hidden sm:inline">{campaign.projectType}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
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
          </div>
        </div>

        {/* Editable brief & tone (collapsible overlay) */}
        {showEditFields && (
          <>
          <div className="fixed inset-0 z-[-1]" onClick={() => setShowEditFields(false)} />
          <div className="absolute left-0 right-0 top-full bg-zinc-950 border-b border-zinc-800 px-3 sm:px-5 py-3 space-y-2 shadow-lg">
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
          </>
        )}
      </div>

      {/* Mobile-only sidebar toggle bar */}
      <div className="lg:hidden flex items-center gap-2 px-3 py-2 border-b border-zinc-800 shrink-0">
        <button
          onClick={openCalendarDrawer}
          className="flex-1 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-700 rounded-lg px-2 py-1.5 transition-colors"
        >
          Calendar
        </button>
        <button
          onClick={openPlatformDrawer}
          className="flex-1 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-700 rounded-lg px-2 py-1.5 transition-colors"
        >
          Posts
        </button>
      </div>

      {/* Three-panel layout */}
      <div className="flex flex-1 min-h-0">
        {/* Calendar: inline on desktop, drawer on mobile */}
        <div className="hidden lg:block">
          <CampaignCalendar
            posts={campaign.socialPosts}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
          />
        </div>
        {calendarDrawer && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={closeCalendarDrawer} />
            <div
              className="absolute left-0 top-0 bottom-0 w-full sm:w-[300px] sm:max-w-[85vw] bg-zinc-950 border-r border-zinc-800 shadow-2xl overflow-y-auto"
              style={{ animation: calendarDrawer === 'closing' ? 'slide-out-left 0.2s ease-in forwards' : 'slide-in-left 0.2s ease-out' }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                <span className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">Schedule</span>
                <button onClick={closeCalendarDrawer} className="text-zinc-500 hover:text-zinc-300 text-lg leading-none">&times;</button>
              </div>
              <CampaignCalendar
                posts={campaign.socialPosts}
                selectedDate={selectedDate}
                onSelectDate={handleSelectDate}
              />
            </div>
          </div>
        )}

        {/* Main content: PostEditor */}
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
            <div className="text-center text-zinc-600 text-base px-4">
              {campaign.socialPosts.length === 0
                ? "Assign a platform from the sidebar to get started."
                : "Select a platform to view its post."}
            </div>
          </div>
        )}

        {/* Platform sidebar: inline on desktop, drawer on mobile */}
        <div className="hidden lg:flex lg:flex-col lg:min-h-0">
          <PlatformSidebar
            posts={datePosts}
            selectedDate={selectedDate}
            selectedPostId={selectedPost?.id ?? null}
            onSelectPost={handleSelectPost}
            onAssignPlatform={handleAssignPlatform}
          />
        </div>
        {platformDrawer && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={closePlatformDrawer} />
            <div
              className={`absolute right-0 top-0 bottom-0 w-full sm:w-[350px] sm:max-w-[85vw] bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col overflow-hidden ${
                platformDrawer === 'closing' ? 'animate-slide-out' : 'animate-slide-in'
              }`}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
                <span className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">Posts</span>
                <button onClick={closePlatformDrawer} className="text-zinc-500 hover:text-zinc-300 text-lg leading-none">&times;</button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
              <PlatformSidebar
                posts={datePosts}
                selectedDate={selectedDate}
                selectedPostId={selectedPost?.id ?? null}
                onSelectPost={handleSelectPost}
                onAssignPlatform={handleAssignPlatform}
              />
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
