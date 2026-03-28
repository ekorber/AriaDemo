import { useState } from "react";
import { SocialPost, SocialPlatform } from "../types";
import { PLATFORM_COLORS, PLATFORM_LABELS, ALL_PLATFORMS } from "../constants/platformColors";

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
    <div className="w-[170px] min-w-[170px] border-l border-zinc-800 p-4 bg-zinc-950 overflow-y-auto">
      <div className="text-[11px] uppercase tracking-widest text-zinc-500 mb-3">{dateLabel}</div>

      {/* Platform cards for this date */}
      {posts.length === 0 ? (
        <div className="text-xs text-zinc-600 mb-3">No posts yet</div>
      ) : (
        <div className="space-y-1.5 mb-3">
          {posts.map((post) => {
            const color = PLATFORM_COLORS[post.platform];
            const isSelected = post.id === selectedPostId;
            return (
              <button
                key={post.id}
                onClick={() => onSelectPost(post.id)}
                className={`w-full text-left rounded-md px-2.5 py-2 flex items-center gap-2 transition-colors ${
                  isSelected
                    ? "bg-blue-950 border border-blue-500"
                    : "bg-zinc-900 border border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: color.hex,
                    border: color.border ? "1px solid #888" : undefined,
                    boxSizing: "border-box",
                  }}
                />
                <div>
                  <div className="text-xs text-zinc-200 font-medium">{PLATFORM_LABELS[post.platform]}</div>
                  <div className={`text-[10px] ${post.approved ? "text-emerald-400" : post.hook ? "text-amber-400" : "text-zinc-600"}`}>
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
            <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-2">Select platform</div>
            <div className="space-y-1">
              {ALL_PLATFORMS.map((platform) => {
                const color = PLATFORM_COLORS[platform];
                return (
                  <button
                    key={platform}
                    onClick={() => {
                      onAssignPlatform(platform);
                      setShowAddMenu(false);
                    }}
                    className="w-full text-left rounded-md px-2.5 py-1.5 flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: color.hex,
                        border: color.border ? "1px solid #888" : undefined,
                        boxSizing: "border-box",
                      }}
                    />
                    <span className="text-xs text-zinc-400">{PLATFORM_LABELS[platform]}</span>
                  </button>
                );
              })}
              <button
                onClick={() => setShowAddMenu(false)}
                className="w-full text-[10px] text-zinc-600 hover:text-zinc-400 mt-1 transition-colors"
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
            <span className="text-zinc-500 text-sm leading-none">+</span>
            <span className="text-xs text-zinc-500">Add Post</span>
          </button>
        )}
      </div>
    </div>
  );
}
