import { useState } from "react";
import { SocialPost, SocialPlatform } from "../types";
import { PLATFORM_LABELS, ALL_PLATFORMS } from "../constants/platformColors";
import { PlatformIcon } from "./PlatformIcon";

interface PlatformSidebarProps {
  posts: SocialPost[];           // posts for the selected date
  selectedDate: string | null;   // null = undecided
  selectedPostId: string | null;
  onSelectPost: (postId: string) => void;
  onAssignPlatform: (platform: SocialPlatform) => void;
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

  return (
    <div className="w-[350px] min-w-[350px] border-l border-zinc-800 p-4 bg-zinc-950 overflow-y-auto">
      <div className="text-xs uppercase tracking-widest text-zinc-500 mb-3">{dateLabel}</div>

      {/* Platform cards for this date */}
      {posts.length === 0 ? (
        <div className="text-sm text-zinc-600 mb-3">No posts yet</div>
      ) : (
        <div className="space-y-1.5 mb-3">
          {posts.map((post) => {
            const isSelected = post.id === selectedPostId;
            const title = post.hook
              ? post.hook.length > 40 ? post.hook.slice(0, 40) + "…" : post.hook
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
                <div className="min-w-0">
                  <div className="text-sm text-zinc-200 leading-snug line-clamp-2">{title}</div>
                  <div className={`text-xs mt-0.5 ${post.approved ? "text-emerald-400" : post.hook ? "text-amber-400" : "text-zinc-600"}`}>
                    {post.approved ? "approved" : post.hook ? "ready" : "draft"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Add Post */}
      <div className="border-t border-zinc-800 pt-3 mt-3">
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
    </div>
  );
}
