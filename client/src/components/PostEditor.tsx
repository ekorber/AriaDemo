import { useState, useEffect } from "react";
import { SocialPost } from "../types";
import { PLATFORM_COLORS, PLATFORM_LABELS } from "../constants/platformColors";

interface PostEditorProps {
  post: SocialPost;
  campaignId: string;
  onUpdatePost: (campaignId: string, postId: string, fields: { hook?: string; caption?: string }) => void;
  onApprovePost: (campaignId: string, postId: string) => void;
  onGenerate: (scope: "single" | "date" | "platform" | "all") => void;
  isGenerating: boolean;
}

export function PostEditor({
  post,
  campaignId,
  onUpdatePost,
  onApprovePost,
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
  }, [post.id, post.hook, post.caption]);

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

  const dateLabel = post.scheduledDate
    ? new Date(post.scheduledDate + "T00:00:00").toLocaleDateString("default", { month: "short", day: "numeric" })
    : "Undecided";

  return (
    <div className="flex-1 p-5 overflow-y-auto">
      {/* Header */}
      <div className="mb-5">
        <div className="text-xs uppercase tracking-widest text-zinc-500">{dateLabel}</div>
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
          <span className={`text-xs px-2 py-0.5 rounded-full ${post.approved ? "bg-emerald-950 text-emerald-400" : post.hook ? "bg-zinc-800 text-zinc-400" : "bg-zinc-800 text-zinc-500"}`}>
            {post.approved ? "approved" : post.hook ? "ready" : "draft"}
          </span>
          {post.edited && (
            <span className="text-xs text-zinc-600 uppercase tracking-wider">edited</span>
          )}
        </div>
      </div>

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
        <button
          onClick={() => onGenerate("single")}
          disabled={isGenerating}
          className="text-sm bg-zinc-100 text-zinc-900 hover:bg-white px-4 py-1.5 rounded font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isGenerating ? "Generating..." : post.hook ? "Regenerate" : "Generate"}
        </button>
        <button
          onClick={() => onApprovePost(campaignId, post.id)}
          className={`text-sm px-3 py-1.5 rounded transition-colors border ${
            post.approved
              ? "border-emerald-800 text-emerald-400 bg-emerald-950/50"
              : "border-zinc-700 text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {post.approved ? "Approved" : "Approve"}
        </button>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => onGenerate("date")}
            disabled={isGenerating}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-40"
          >
            Gen. date
          </button>
          <button
            onClick={() => onGenerate("platform")}
            disabled={isGenerating}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-40"
          >
            Gen. all {PLATFORM_LABELS[post.platform]}
          </button>
          <button
            onClick={() => onGenerate("all")}
            disabled={isGenerating}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-40"
          >
            Gen. all
          </button>
        </div>
      </div>
    </div>
  );
}
