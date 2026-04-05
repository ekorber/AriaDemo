import { useState, useMemo } from "react";
import { SocialPost, SocialPlatform } from "../types";
import { PLATFORM_LABELS, ALL_PLATFORMS } from "../constants/platforms.ts";
import { PlatformIcon } from "./PlatformIcon";

interface PlatformSidebarProps {
  posts: SocialPost[];           // posts for the selected date
  selectedDate: string | null;   // null = undecided
  selectedPostId: string | null;
  onSelectPost: (postId: string) => void;
  onAssignPlatform: (platform: SocialPlatform) => void;
}

function formatTime(t: string) {
  const [hStr, mStr] = t.split(":");
  const h24 = parseInt(hStr, 10);
  const isPm = h24 >= 12;
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  return `${h12}:${mStr}${isPm ? "pm" : "am"}`;
}

export function PlatformSidebar({
  posts,
  selectedDate,
  selectedPostId,
  onSelectPost,
  onAssignPlatform,
}: PlatformSidebarProps) {
  const dateLabel = selectedDate
    ? new Date(selectedDate + "T00:00:00").toLocaleDateString("default", { month: "short", day: "numeric" })
    : "Undecided";

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Sort posts: untimed first, then timed by scheduled time
  const sortedPosts = useMemo(() => {
    const untimed = posts.filter((p) => !p.scheduledTime);
    const timed = posts
      .filter((p) => p.scheduledTime)
      .sort((a, b) => a.scheduledTime!.localeCompare(b.scheduledTime!));
    return [...untimed, ...timed];
  }, [posts]);

  return (
    <div className="w-full lg:w-[350px] lg:min-w-[350px] border-l border-zinc-800 p-4 bg-zinc-950 overflow-y-auto shrink-0 h-full">
      <div className="text-xs uppercase tracking-widest text-zinc-500 mb-3">{dateLabel}</div>

      {/* Post list ordered by time */}
      {sortedPosts.length === 0 ? (
        <div className="text-sm text-zinc-600 mb-3">No posts yet</div>
      ) : (
        <div className="space-y-1.5 mb-3">
          {sortedPosts.map((post) => {
            const isSelected = post.id === selectedPostId;
            const firstLine = post.caption ? post.caption.split('\n')[0] : "";
            const title = firstLine
              ? firstLine.length > 40 ? firstLine.slice(0, 40) + "…" : firstLine
              : PLATFORM_LABELS[post.platform];
            return (
              <button
                key={post.id}
                onClick={() => onSelectPost(post.id)}
                className={`w-full text-left rounded-md px-2.5 py-2 flex items-start gap-2 transition-colors ${
                  isSelected
                    ? "bg-blue-950 border border-blue-500"
                    : "bg-zinc-900 border border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <span className="flex-shrink-0 mt-0.5">
                  <PlatformIcon platform={post.platform} size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-zinc-200 leading-snug line-clamp-2">{title}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs ${post.approved ? "text-emerald-400" : post.reviewReady ? "text-amber-400" : "text-zinc-600"}`}>
                      {post.approved ? "approved" : post.reviewReady ? "ready for review" : "draft"}
                    </span>
                    <span className="text-zinc-700">·</span>
                    <span className={`text-xs ${post.scheduledTime ? "text-blue-400" : "text-zinc-600 italic"}`}>
                      {post.scheduledTime ? formatTime(post.scheduledTime) : "no time set"}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Add Post */}
      <div className="border-t border-zinc-800 pt-3 mt-3">
        {/* Desktop: inline expand */}
        <div className="hidden lg:block">
          {showAddMenu ? (
            <>
              <div className="text-xs uppercase tracking-wider text-zinc-600 mb-2">Select platform</div>
              <div className="space-y-1">
                {ALL_PLATFORMS.map((platform) => (
                    <button
                      key={platform}
                      onClick={() => {
                        onAssignPlatform(platform);
                        setShowAddMenu(false);
                      }}
                      className="w-full text-left rounded-md px-2.5 py-1.5 flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors"
                    >
                      <PlatformIcon platform={platform} size={14} />
                      <span className="text-sm text-zinc-400">{PLATFORM_LABELS[platform]}</span>
                    </button>
                ))}
                <button
                  onClick={() => setShowAddMenu(false)}
                  className="w-full text-xs text-zinc-600 hover:text-zinc-400 mt-1 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => setShowAddMenu(true)}
              className="w-full text-left rounded-md px-2.5 py-2 flex items-center gap-2 border border-dashed border-zinc-700 hover:border-zinc-500 transition-colors"
            >
              <span className="text-zinc-500 text-base leading-none">+</span>
              <span className="text-sm text-zinc-500">Add Post</span>
            </button>
          )}
        </div>

        {/* Mobile: button opens modal */}
        <div className="lg:hidden">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full text-left rounded-md px-2.5 py-2 flex items-center gap-2 border border-dashed border-zinc-700 hover:border-zinc-500 transition-colors"
          >
            <span className="text-zinc-500 text-base leading-none">+</span>
            <span className="text-sm text-zinc-500">Add Post</span>
          </button>
        </div>

        {/* Mobile platform picker modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 lg:hidden" onClick={() => setShowAddModal(false)}>
            <div className="bg-zinc-900 border border-zinc-700 rounded-t-xl sm:rounded-xl w-full sm:max-w-sm p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-medium text-zinc-100">Select platform</h3>
                <button onClick={() => setShowAddModal(false)} className="text-zinc-500 hover:text-zinc-300 text-lg leading-none">&times;</button>
              </div>
              <div className="space-y-1.5">
                {ALL_PLATFORMS.map((platform) => (
                  <button
                    key={platform}
                    onClick={() => {
                      onAssignPlatform(platform);
                      setShowAddModal(false);
                    }}
                    className="w-full text-left rounded-lg px-3 py-2.5 flex items-center gap-3 bg-zinc-800 border border-zinc-700 hover:border-zinc-500 active:bg-zinc-700 transition-colors"
                  >
                    <PlatformIcon platform={platform} size={18} />
                    <span className="text-sm text-zinc-200">{PLATFORM_LABELS[platform]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
