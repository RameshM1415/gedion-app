import React from 'react';
import { Reel } from '../types';
import { AuthUser } from '../utils/authStorage';
import { InstagramPostCard } from './InstagramPostCard';
import { StoriesTray } from './StoriesTray';
import { StoryItem } from '../types';
import { useTheme } from '../context/ThemeContext';
import { Camera } from 'lucide-react';

export interface InstagramFeedProps {
  reels: Reel[];
  stories: StoryItem[];
  currentUser?: AuthUser | null;
  isMuted: boolean;
  onToggleMute: () => void;
  onToggleLike: (reelId: string) => void;
  onToggleBookmark: (reelId: string) => void;
  onOpenComments: (reelId: string) => void;
  onOpenShare: (reelId: string) => void;
  onOpenOptions: (reel: Reel) => void;
  onOpenYourStory: () => void;
  onSelectStory: (index: number) => void;
  onOpenCreate?: () => void;
  onShowToast?: (message: string) => void;
}

export const InstagramFeed: React.FC<InstagramFeedProps> = ({
  reels,
  stories,
  currentUser,
  isMuted,
  onToggleMute,
  onToggleLike,
  onToggleBookmark,
  onOpenComments,
  onOpenShare,
  onOpenOptions,
  onOpenYourStory,
  onSelectStory,
  onOpenCreate,
  onShowToast,
}) => {
  const { isDark } = useTheme();

  return (
    <div
      className={`w-full h-full overflow-y-auto no-scrollbar pb-24 transition-colors ${
        isDark ? 'bg-black text-white' : 'bg-white text-black'
      }`}
    >
      {/* 1. INSTAGRAM STORIES BAR */}
      <StoriesTray
        stories={stories}
        onOpenYourStory={onOpenYourStory}
        onSelectStory={onSelectStory}
        userAvatar={currentUser?.avatar}
      />

      {/* 2. POSTS FEED LIST */}
      {reels.length > 0 ? (
        <div className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-900">
          {reels.map((reel) => (
            <InstagramPostCard
              key={reel.id}
              reel={reel}
              currentUser={currentUser}
              isMuted={isMuted}
              onToggleMute={onToggleMute}
              onToggleLike={onToggleLike}
              onToggleBookmark={onToggleBookmark}
              onOpenComments={onOpenComments}
              onOpenShare={onOpenShare}
              onOpenOptions={onOpenOptions}
              onShowToast={onShowToast}
            />
          ))}
        </div>
      ) : (
        /* Empty Feed Zero-State */
        <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
              isDark ? 'bg-zinc-900 text-zinc-400' : 'bg-zinc-100 text-zinc-600'
            }`}
          >
            <Camera size={32} />
          </div>
          <h3 className="text-sm font-bold tracking-tight">No Posts Yet</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-xs">
            Be the first to share a post or reel with your followers on GediOn.
          </p>
          <button
            type="button"
            onClick={onOpenCreate}
            className="mt-4 px-4 py-2 rounded-lg bg-[#0095f6] text-white text-xs font-bold hover:bg-[#1877f2] transition-colors"
          >
            Create Post
          </button>
        </div>
      )}
    </div>
  );
};
