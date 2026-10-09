import React, { useState } from 'react';
import { Bookmark, Heart, Play } from 'lucide-react';
import { Reel } from '../types';

export interface ProfileSavedTabProps {
  savedPosts: Reel[];
  onOpenReel: (reel: Reel) => void;
  onUnsavePost?: (reel: Reel) => void;
  isDark?: boolean;
}

interface SavedGridItemProps {
  post: Reel;
  onOpen: () => void;
  onUnsave?: (post: Reel) => void;
  isDark?: boolean;
}

const SavedGridItem: React.FC<SavedGridItemProps> = ({
  post,
  onOpen,
  onUnsave,
  isDark,
}) => {
  const [hasImgError, setHasImgError] = useState(false);

  // Check for post.thumbnail_url or post.poster
  const thumbnailUrl =
    (post as any).thumbnail_url ||
    post.poster ||
    (post as any).thumbnailUrl ||
    '';

  // Check for post.video_url or post.videoUrl
  const videoUrl =
    (post as any).video_url ||
    post.videoUrl ||
    '';

  const isVideo =
    post.mediaType === 'video' ||
    (!post.mediaType && Boolean(videoUrl));

  const likesOrViews = post.likesCount || post.viewsCount || '0';

  return (
    <div
      onClick={onOpen}
      className={`group relative aspect-[9/15] overflow-hidden cursor-pointer transition-all active:scale-95 ${
        isDark ? 'bg-zinc-900' : 'bg-zinc-100'
      }`}
    >
      {/* 1. Thumbnail Image or Video Container Fallback */}
      {thumbnailUrl && !hasImgError ? (
        <img
          src={thumbnailUrl}
          alt="Saved thumbnail"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setHasImgError(true)}
        />
      ) : videoUrl ? (
        <video
          src={videoUrl.includes('#t=') ? videoUrl : `${videoUrl}#t=0.1`}
          className="w-full h-full object-cover pointer-events-none transition-transform duration-300 group-hover:scale-105"
          preload="metadata"
          muted
          playsInline
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-600">
          <Bookmark size={22} className="text-zinc-600" />
        </div>
      )}

      {/* 2. Solid Active Bookmark badge top-right (quick unsave trigger) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onUnsave?.(post);
        }}
        className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 backdrop-blur-md z-10 transition-transform active:scale-75 hover:bg-black/80"
        title="Unsave post"
        aria-label="Unsave post"
      >
        <Bookmark
          size={11}
          className="fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]"
        />
      </button>

      {/* Video Indicator top-left */}
      {isVideo && (
        <div className="absolute top-1.5 left-1.5 p-1 rounded-full bg-black/60 backdrop-blur-md pointer-events-none">
          <Play size={10} className="fill-white text-white translate-x-[0.5px]" />
        </div>
      )}

      {/* Bottom Likes/Views badge */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1.5 pointer-events-none">
        <span className="text-[10px] font-bold text-white flex items-center gap-1 drop-shadow-md">
          <Heart size={10} className="fill-white text-white" />
          {likesOrViews}
        </span>
      </div>
    </div>
  );
};

export const ProfileSavedTab: React.FC<ProfileSavedTabProps> = ({
  savedPosts,
  onOpenReel,
  onUnsavePost,
  isDark = false,
}) => {
  return (
    <div className="mt-3 min-h-[220px]">
      {savedPosts.length > 0 ? (
        <div className="grid grid-cols-3 gap-1">
          {savedPosts.map((post) => (
            <SavedGridItem
              key={post.id}
              post={post}
              onOpen={() => onOpenReel(post)}
              onUnsave={onUnsavePost}
              isDark={isDark}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-full mb-3 border ${
              isDark
                ? 'border-zinc-800 bg-zinc-950 text-zinc-400'
                : 'border-zinc-200 bg-zinc-50 text-zinc-600'
            }`}
          >
            <Bookmark size={26} />
          </div>
          <h3 className="text-sm font-bold tracking-tight">Save</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">
            Save photos and videos that you want to see again. No one is
            notified, and only you can see what you&apos;ve saved.
          </p>
        </div>
      )}
    </div>
  );
};
