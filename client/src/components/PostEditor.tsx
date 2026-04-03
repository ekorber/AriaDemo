import { useState, useEffect } from "react";
import { SocialPost } from "../types";
import { PLATFORM_COLORS, PLATFORM_LABELS } from "../constants/platformColors";
import { ScheduleModal } from "./ScheduleModal";

interface PostEditorProps {
  post: SocialPost;
  campaignId: string;
  onUpdatePost: (campaignId: string, postId: string, fields: { hook?: string; caption?: string; reviewReady?: boolean }) => void;
  onApprovePost: (campaignId: string, postId: string) => void;
  onDeletePost: (campaignId: string, postId: string) => void;
  onUpdateSchedule: (campaignId: string, postId: string, date: string | null, time: string | null) => void;
  onGenerate: (scope: "single" | "date" | "platform" | "all") => void;
  isGenerating: boolean;
}

export function PostEditor({
  post,
  campaignId,
  onUpdatePost,
  onApprovePost,
  onDeletePost,
  onUpdateSchedule,
  onGenerate,
  isGenerating,
}: PostEditorProps) {
  const [hook, setHook] = useState(post.hook);
  const [caption, setCaption] = useState(post.caption);
  const color = PLATFORM_COLORS[post.platform];
  const label = PLATFORM_LABELS[post.platform];

  useEffect(() => {
    setHook(post.hook);
    setCaption(post.caption);
    setConfirmDelete(false);
  }, [post.id, post.hook, post.caption]);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showGenDropdown, setShowGenDropdown] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleHookBlur = () => {
    if (hook !== post.hook) {
      onUpdatePost(campaignId, post.id, { hook });
    }
  };

  const handleCaptionBlur = () => {
    if (caption !== post.caption) {
      onUpdatePost(campaignId, post.id, { caption });
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
    <div className="flex-1 p-5 overflow-y-auto">
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
          <span className="ml-auto text-xs text-blue-400">Edit</span>
        </div>
      </div>

      {showScheduleModal && (
        <ScheduleModal
          currentDate={post.scheduledDate}
          currentTime={post.scheduledTime}
          onSave={(date, time) => {
            onUpdateSchedule(campaignId, post.id, date, time);
            setShowScheduleModal(false);
          }}
          onClose={() => setShowScheduleModal(false)}
        />
      )}

      {/* Hook field */}
      <div className="mb-4">
        <label className="text-xs uppercase tracking-widest text-zinc-500 block mb-1.5">Hook</label>
        <textarea
          value={hook}
          onChange={(e) => setHook(e.target.value)}
          onBlur={handleHookBlur}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-base text-zinc-200 font-medium resize-none focus:outline-none focus:border-zinc-600"
          rows={2}
          placeholder="Opening line..."
        />
      </div>

      {/* Caption field */}
      <div className="mb-5">
        <label className="text-xs uppercase tracking-widest text-zinc-500 block mb-1.5">Caption</label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={handleCaptionBlur}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-base text-zinc-400 resize-none focus:outline-none focus:border-zinc-600 leading-relaxed"
          rows={8}
          placeholder="Post body..."
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <div className="flex">
            <button
              onClick={() => onGenerate("single")}
              disabled={isGenerating}
              className="text-sm bg-zinc-100 text-zinc-900 hover:bg-white px-4 py-1.5 rounded-l font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isGenerating ? "Generating..." : post.hook ? "Regenerate" : "Generate"}
            </button>
            <button
              onClick={() => setShowGenDropdown((v) => !v)}
              disabled={isGenerating}
              className="text-sm bg-zinc-100 text-zinc-900 hover:bg-white px-1.5 py-1.5 rounded-r border-l border-zinc-300 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
          </div>
          {showGenDropdown && (
            <div className="absolute left-0 top-full mt-1 bg-zinc-100 rounded shadow-xl z-20 min-w-[160px] py-1">
              {([
                { scope: "date" as const, label: "All posts on this date" },
                { scope: "platform" as const, label: `All ${label} posts` },
                { scope: "all" as const, label: "Every post in campaign" },
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
        {post.approved ? (
          <button
            onClick={() => onApprovePost(campaignId, post.id)}
            className="text-sm px-3 py-1.5 rounded transition-colors border border-zinc-700 text-zinc-400 hover:text-zinc-200"
          >
            Unapprove
          </button>
        ) : post.reviewReady ? (
          <>
            <button
              onClick={() => onApprovePost(campaignId, post.id)}
              className="text-sm px-3 py-1.5 rounded transition-colors border border-zinc-700 text-zinc-400 hover:text-zinc-200"
            >
              Approve
            </button>
            <button
              onClick={() => onUpdatePost(campaignId, post.id, { reviewReady: false })}
              className="text-sm px-3 py-1.5 rounded transition-colors border border-zinc-700 text-zinc-500 hover:text-zinc-200"
            >
              Return to draft
            </button>
          </>
        ) : (
          <button
            onClick={() => onUpdatePost(campaignId, post.id, { reviewReady: true })}
            disabled={!hook.trim()}
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
