import { useState, useRef, useEffect } from "react";
import { SocialPost, SocialPlatform } from "../types";

const platformConfig: Record<SocialPlatform, {
  label: string;
  badgeClass: string;
  icon: React.ReactNode;
  charLimit?: { max: number; severity: "red" | "amber" };
}> = {
  instagram: {
    label: "Instagram",
    badgeClass: "bg-pink-950 text-pink-400",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="17.5" cy="6.5" r="1.5" />
      </svg>
    ),
  },
  tiktok: {
    label: "TikTok",
    badgeClass: "bg-zinc-900 text-white border border-zinc-600",
    icon: <span className="text-sm leading-none">♪</span>,
  },
  x: {
    label: "X",
    badgeClass: "bg-zinc-950 text-zinc-300 border border-zinc-700",
    icon: <span className="font-mono text-xs font-bold leading-none">X</span>,
    charLimit: { max: 280, severity: "red" },
  },
  facebook: {
    label: "Facebook",
    badgeClass: "bg-blue-950 text-blue-400",
    icon: <span className="font-serif text-sm font-bold leading-none">f</span>,
  },
  youtube_shorts: {
    label: "YouTube Shorts",
    badgeClass: "bg-red-950 text-red-400",
    icon: <span className="text-xs leading-none">▶</span>,
  },
  threads: {
    label: "Threads",
    badgeClass: "bg-zinc-800 text-zinc-300",
    icon: <span className="text-xs font-medium leading-none">@</span>,
    charLimit: { max: 300, severity: "amber" },
  },
};

interface SocialPostCardProps {
  post: SocialPost;
  onUpdate?: (postId: string, fields: { hook?: string; caption?: string }) => void;
  onApprove?: (postId: string) => void;
  interactive?: boolean;
}

export function SocialPostCard({ post, onUpdate, onApprove, interactive = false }: SocialPostCardProps) {
  const config = platformConfig[post.platform];
  if (!config) return null;

  const [editing, setEditing] = useState(false);
  const [editHook, setEditHook] = useState(post.hook);
  const [editCaption, setEditCaption] = useState(post.caption);
  const [copied, setCopied] = useState(false);
  const hookRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditHook(post.hook);
    setEditCaption(post.caption);
  }, [post.hook, post.caption]);

  const fullText = `${post.hook}${post.caption ? " " + post.caption : ""}`;
  const charCount = fullText.length;

  const handleSave = () => {
    onUpdate?.(post.id, { hook: editHook, caption: editCaption });
    setEditing(false);
  };

  const handleCancel = () => {
    setEditHook(post.hook);
    setEditCaption(post.caption);
    setEditing(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const startEdit = () => {
    setEditing(true);
    setTimeout(() => hookRef.current?.focus(), 0);
  };

  return (
    <div className={`rounded-lg border bg-zinc-900/50 p-4 space-y-3 ${
      post.approved ? "border-emerald-800/50" : "border-zinc-800"
    }`}>
      {/* Header row: badge + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.badgeClass}`}>
            {config.icon}
            {config.label}
          </span>
          {post.edited && (
            <span className="text-[10px] text-zinc-600 uppercase tracking-wider">edited</span>
          )}
        </div>
        {interactive && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopy}
              className="text-xs text-zinc-500 hover:text-zinc-300 px-1.5 py-0.5 rounded transition-colors"
              title="Copy to clipboard"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
            {!editing && (
              <button
                onClick={startEdit}
                className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                  post.approved
                    ? "text-zinc-600 hover:text-zinc-400"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Edit
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {editing ? (
        <div className="space-y-2">
          <textarea
            ref={hookRef}
            value={editHook}
            onChange={(e) => setEditHook(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 font-semibold resize-none focus:outline-none focus:border-zinc-500"
            rows={2}
            placeholder="Hook..."
          />
          <textarea
            value={editCaption}
            onChange={(e) => setEditCaption(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-400 resize-none focus:outline-none focus:border-zinc-500"
            rows={6}
            placeholder="Caption..."
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={handleCancel}
              className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-3 py-1 rounded transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm font-semibold text-zinc-200 leading-snug">
            {post.hook}
          </p>
          {post.caption && (
            <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-line">
              {post.caption}
            </p>
          )}
        </>
      )}

      {/* Footer: char count + approve */}
      <div className="flex items-center justify-between">
        <div>
          {config.charLimit && (
            <span
              className={`text-xs tabular-nums ${
                config.charLimit.severity === "red" && charCount > config.charLimit.max
                  ? "text-red-400"
                  : config.charLimit.severity === "amber" && charCount > config.charLimit.max
                  ? "text-amber-400"
                  : "text-zinc-600"
              }`}
            >
              {charCount}/{config.charLimit.max}
            </span>
          )}
        </div>
        {interactive && onApprove && (
          <button
            onClick={() => onApprove(post.id)}
            className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-colors ${
              post.approved
                ? "text-emerald-400 bg-emerald-950/50"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {post.approved ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Approved
              </>
            ) : (
              "Approve"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
