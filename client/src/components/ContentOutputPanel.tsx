import { SocialPost, SocialPlatform } from "../types";
import { SocialPostCard } from "./SocialPostCard";

const PLATFORM_ORDER: SocialPlatform[] = [
  "instagram",
  "tiktok",
  "x",
  "facebook",
  "youtube_shorts",
  "threads",
];

interface ContentOutputPanelProps {
  posts: SocialPost[];
  onUpdatePost?: (postId: string, fields: { hook?: string; caption?: string }) => void;
  onApprovePost?: (postId: string) => void;
  interactive?: boolean;
}

export function ContentOutputPanel({ posts, onUpdatePost, onApprovePost, interactive = false }: ContentOutputPanelProps) {
  const sortedPosts = PLATFORM_ORDER.map((platform) =>
    posts.find((p) => p.platform === platform)
  ).filter(Boolean) as SocialPost[];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {sortedPosts.map((post) => (
        <SocialPostCard
          key={post.id}
          post={post}
          onUpdate={onUpdatePost}
          onApprove={onApprovePost}
          interactive={interactive}
        />
      ))}
    </div>
  );
}
