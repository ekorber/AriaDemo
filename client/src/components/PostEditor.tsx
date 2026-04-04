import { useState, useEffect, useRef, useCallback } from "react";
import { SocialPost } from "../types";
import { PLATFORM_COLORS, PLATFORM_LABELS, IMAGE_PLATFORMS } from "../constants/platforms.ts";
import { ScheduleModal } from "./ScheduleModal";

interface PostEditorProps {
  post: SocialPost;
  campaignId: string;
  onUpdatePost: (campaignId: string, postId: string, fields: { caption?: string; reviewReady?: boolean }) => void;
  onApprovePost: (campaignId: string, postId: string) => void;
  onDeletePost: (campaignId: string, postId: string) => void;
  onUpdateSchedule: (campaignId: string, postId: string, date: string | null, time: string | null) => void;
  onGenerate: (scope: "single" | "date" | "platform" | "all") => void;
  onGenerateImage: (scope: "single" | "date" | "platform" | "all") => void;
  isGenerating: boolean;
  isGeneratingImage: boolean;
}

export function PostEditor({
  post,
  campaignId,
  onUpdatePost,
  onApprovePost,
  onDeletePost,
  onUpdateSchedule,
  onGenerate,
  onGenerateImage,
  isGenerating,
  isGeneratingImage,
}: PostEditorProps) {
  const [caption, setCaption] = useState(post.caption);
  const color = PLATFORM_COLORS[post.platform];
  const label = PLATFORM_LABELS[post.platform];
  const supportsImages = IMAGE_PLATFORMS.has(post.platform);

  useEffect(() => {
    setCaption(post.caption);
    setConfirmDelete(false);
  }, [post.id, post.caption]);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showGenDropdown, setShowGenDropdown] = useState(false);
  const [showGenImageDropdown, setShowGenImageDropdown] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingTimer = useRef<ReturnType<typeof setTimeout>>();
  const prevGenerating = useRef(isGenerating);

  const flashSaving = useCallback(() => {
    setSaving(true);
    clearTimeout(savingTimer.current);
    savingTimer.current = setTimeout(() => setSaving(false), 800);
  }, []);

  useEffect(() => {
    if (prevGenerating.current && !isGenerating) {
      flashSaving();
    }
    prevGenerating.current = isGenerating;
  }, [isGenerating, flashSaving]);

  const isDraft = !post.reviewReady && !post.approved;
  const hasSchedule = !!post.scheduledDate && !!post.scheduledTime;
  const generateDisabled = isGenerating || !isDraft;

  const handleCaptionBlur = () => {
    if (caption !== post.caption) {
      onUpdatePost(campaignId, post.id, { caption });
      flashSaving();
    }
  };

  const scheduleLabel = (() => {
    const datePart = post.scheduledDate
      ? new Date(post.scheduledDate + "T00:00:00").toLocaleDateString("default", { month: "short", day: "numeric" })
      : "Undecided";
    if (!post.scheduledTime) return `${datePart} · No time set`;
    const [hStr, mStr] = post.scheduledTime.split(":");
    const h24 = parseInt(hStr, 10);
    const min = mStr;
    const isPm = h24 >= 12;
    const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
    return `${datePart} · ${h12}:${min} ${isPm ? "PM" : "AM"}`;
  })();

  return (
    <div className="flex-1 p-5 overflow-y-auto relative">
      {/* Saving indicator */}
      {saving && (
        <div className="absolute top-3 right-4 flex items-center gap-1.5 text-xs text-zinc-500">
          <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="50 20" />
          </svg>
          Saving
        </div>
      )}
      {/* Header */}
      <div className="flex">
        <div className="mb-5">
          <div className="flex items-center gap-2 mt-1">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor: color.hex,
                border: color.border ? "1px solid #888" : undefined,
                boxSizing: "border-box",
              }}
            />
            <span className="text-base font-medium text-zinc-100">{label}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${post.approved ? "bg-emerald-950 text-emerald-400" : post.reviewReady ? "bg-amber-950 text-amber-400" : "bg-zinc-800 text-zinc-500"}`}>
              {post.approved ? "approved" : post.reviewReady ? "ready for review" : "draft"}
            </span>
          </div>
        </div>

        {/* Schedule row */}
        <div
          onClick={() => setShowScheduleModal(true)}
          className="ml-3 -mt-1 mb-4 flex items-center gap-3 px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg cursor-pointer hover:border-zinc-600 transition-colors"
        >
          <span className="text-sm text-zinc-500">📅</span>
          <span className="text-sm text-zinc-300">{scheduleLabel}</span>
          {!post.approved && <span className="ml-auto text-xs text-blue-400">Edit</span>}
        </div>
      </div>

      {isDraft && (!caption.trim() || !hasSchedule) && (
        <div className="flex items-center gap-4 mb-4 text-xs text-zinc-500">
          <span className="uppercase tracking-widest text-zinc-600">Needed for review</span>
          <span className="flex items-center gap-1.5">
            {caption.trim()
              ? <span className="text-emerald-500">✓</span>
              : <span className="text-zinc-600">○</span>}
            <span className={caption.trim() ? "text-zinc-500 line-through" : "text-zinc-400"}>Post content</span>
          </span>
          <span className="flex items-center gap-1.5">
            {post.scheduledDate
              ? <span className="text-emerald-500">✓</span>
              : <span className="text-zinc-600">○</span>}
            <span className={post.scheduledDate ? "text-zinc-500 line-through" : "text-zinc-400"}>Scheduled date</span>
          </span>
          <span className="flex items-center gap-1.5">
            {post.scheduledTime
              ? <span className="text-emerald-500">✓</span>
              : <span className="text-zinc-600">○</span>}
            <span className={post.scheduledTime ? "text-zinc-500 line-through" : "text-zinc-400"}>Scheduled time</span>
          </span>
        </div>
      )}

      {showScheduleModal && (
        <ScheduleModal
          currentDate={post.scheduledDate}
          currentTime={post.scheduledTime}
          isDraft={isDraft}
          onSave={(date, time) => {
            onUpdateSchedule(campaignId, post.id, date, time);
            setShowScheduleModal(false);
          }}
          onClose={() => setShowScheduleModal(false)}
        />
      )}

      {/* Split layout: image (left) + caption (right) */}
      <div className={`flex gap-5 ${supportsImages ? "" : "flex-col"}`}>
        {/* Image panel — only for platforms that support images */}
        {supportsImages && (
          <div className="flex-1 min-w-0">
            <label className="text-xs uppercase tracking-widest text-zinc-500 block mb-1.5">Image</label>
            <div className="relative mb-3">
              {isGeneratingImage && isDraft && (
                <div className="absolute inset-0 z-10 bg-zinc-950/60 rounded-lg flex items-center justify-center">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="50 20" />
                    </svg>
                    Generating image...
                  </div>
                </div>
              )}
              {post.imageUrl ? (
                <img
                  src={post.imageUrl}
                  alt="Post image"
                  className="w-full rounded-lg border border-zinc-800 object-cover"
                  style={{ maxHeight: "280px" }}
                />
              ) : (
                <div className="w-full rounded-lg border border-zinc-800 bg-zinc-900 flex items-center justify-center" style={{ height: "280px" }}>
                  <div className="text-center text-zinc-600">
                    <svg className="w-10 h-10 mx-auto mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                    </svg>
                    <span className="text-sm">No image yet</span>
                  </div>
                </div>
              )}
            </div>
            {/* Generate Image button */}
            <div className="relative">
              <div className="flex">
                <button
                  onClick={() => onGenerateImage("single")}
                  disabled={generateDisabled || isGeneratingImage}
                  className="text-sm bg-zinc-100 text-zinc-900 hover:bg-white px-4 py-1.5 rounded-l font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isGeneratingImage ? "Generating..." : post.imageUrl ? "Regenerate Image" : "Generate Image"}
                </button>
                <button
                  onClick={() => setShowGenImageDropdown((v) => !v)}
                  disabled={generateDisabled || isGeneratingImage}
                  className="text-sm bg-zinc-100 text-zinc-900 hover:bg-white px-1.5 py-1.5 rounded-r border-l border-zinc-300 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
              </div>
              {showGenImageDropdown && (
                <div className="absolute left-0 top-full mt-1 bg-zinc-100 rounded shadow-xl z-20 min-w-[200px] py-1">
                  {([
                    { scope: "date" as const, label: "All images on this date" },
                    { scope: "platform" as const, label: `All ${label} images` },
                    { scope: "all" as const, label: "Every image in campaign" },
                  ]).map((item) => (
                    <button
                      key={item.scope}
                      onClick={() => { setShowGenImageDropdown(false); onGenerateImage(item.scope); }}
                      className="w-full text-left text-sm px-3 py-1.5 text-zinc-900 font-medium hover:bg-white transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Caption panel */}
        <div className="flex-1 min-w-0">
          <label className="text-xs uppercase tracking-widest text-zinc-500 block mb-1.5">Caption</label>
          <div className="relative mb-1">
            {isGenerating && isDraft && (
              <div className="absolute inset-0 z-10 bg-zinc-950/60 rounded-lg flex items-center justify-center">
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="50 20" />
                  </svg>
                  Generating caption...
                </div>
              </div>
            )}
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                onBlur={handleCaptionBlur}
                disabled={isGenerating && isDraft}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-base text-zinc-200 resize-none focus:outline-none focus:border-zinc-600 leading-relaxed"
                style={supportsImages ? { height: "280px" } : undefined}
                rows={supportsImages ? undefined : 10}
                placeholder="Write your post..."
              />
          </div>
          {/* Generate Caption button */}
          <div className="relative">
            <div className="flex">
              <button
                onClick={() => onGenerate("single")}
                disabled={generateDisabled}
                className="text-sm bg-zinc-100 text-zinc-900 hover:bg-white px-4 py-1.5 rounded-l font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isGenerating ? "Generating..." : post.caption ? "Regenerate Caption" : "Generate Caption"}
              </button>
              <button
                onClick={() => setShowGenDropdown((v) => !v)}
                disabled={generateDisabled}
                className="text-sm bg-zinc-100 text-zinc-900 hover:bg-white px-1.5 py-1.5 rounded-r border-l border-zinc-300 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </button>
            </div>
            {showGenDropdown && (
              <div className="absolute left-0 top-full mt-1 bg-zinc-100 rounded shadow-xl z-20 min-w-[200px] py-1">
                {([
                  { scope: "date" as const, label: "All captions on this date" },
                  { scope: "platform" as const, label: `All ${label} captions` },
                  { scope: "all" as const, label: "Every caption in campaign" },
                ]).map((item) => (
                  <button
                    key={item.scope}
                    onClick={() => { setShowGenDropdown(false); onGenerate(item.scope); }}
                    className="w-full text-left text-sm px-3 py-1.5 text-zinc-900 font-medium hover:bg-white transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap mt-4">
        {post.approved ? (
          <button
            onClick={() => { onApprovePost(campaignId, post.id); flashSaving(); }}
            className="text-sm px-3 py-1.5 rounded transition-colors border border-zinc-700 text-zinc-400 hover:text-zinc-200"
          >
            Unapprove
          </button>
        ) : post.reviewReady ? (
          <>
            <button
              onClick={() => { onApprovePost(campaignId, post.id); flashSaving(); }}
              disabled={!hasSchedule}
              className="text-sm px-3 py-1.5 rounded transition-colors border border-zinc-700 text-zinc-400 hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Approve
            </button>
            <button
              onClick={() => { onUpdatePost(campaignId, post.id, { reviewReady: false }); flashSaving(); }}
              className="text-sm px-3 py-1.5 rounded transition-colors border border-zinc-700 text-zinc-500 hover:text-zinc-200"
            >
              Return to draft
            </button>
          </>
        ) : (
          <button
            onClick={() => { onUpdatePost(campaignId, post.id, { reviewReady: true }); flashSaving(); }}
            disabled={!caption.trim() || !hasSchedule}
            className="text-sm px-3 py-1.5 rounded transition-colors border border-zinc-700 text-zinc-400 hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Mark for review
          </button>
        )}
        {confirmDelete ? (
          <span className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500">Delete?</span>
            <button
              onClick={() => onDeletePost(campaignId, post.id)}
              className="text-sm px-2.5 py-1.5 rounded transition-colors border border-red-800 text-red-400 hover:bg-red-950/50"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-sm px-2.5 py-1.5 rounded transition-colors border border-zinc-700 text-zinc-400 hover:text-zinc-200"
            >
              No
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-sm px-3 py-1.5 rounded transition-colors border border-red-900 text-red-400 hover:text-red-300 hover:border-red-700"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
