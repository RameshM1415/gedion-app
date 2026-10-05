import React, { useRef, useEffect } from 'react';
import { Reel } from '../types';
import { AuthUser } from '../utils/authStorage';
import { InstagramPostCard } from './InstagramPostCard';
import { StoriesTray } from './StoriesTray';
import { StoryItem } from '../types';
import { useTheme } from '../context/ThemeContext';
import { Camera, Heart, Send } from 'lucide-react';

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
  onOpenActivity?: () => void;
  onOpenMessages?: () => void;
  onShowToast?: (message: string) => void;
  hasUserStory?: boolean;
  scrollToTopTrigger?: number;
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
  onOpenActivity,
  onOpenMessages,
  onShowToast,
  hasUserStory = false,
  scrollToTopTrigger,
}) => {
  const { isDark } = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Smooth scroll to top on Home double-tap or refresh trigger
  useEffect(() => {
    if (scrollToTopTrigger !== undefined && scrollToTopTrigger > 0) {
      if (containerRef.current) {
        containerRef.current.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
      }
    }
  }, [scrollToTopTrigger]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full overflow-y-auto no-scrollbar pb-24 transition-colors select-none ${
        isDark ? 'bg-black text-white' : 'bg-white text-black'
      }`}
    >
      {/* 1. TOP HEADER BAR: Classic GediOn script logo on left, Activity & Direct Messages on right */}
      <header
        className={`sticky top-0 z-30 flex items-center justify-between px-4 h-[48px] border-b backdrop-blur-md transition-colors ${
          isDark
            ? 'bg-black/90 border-[#262626] text-white'
            : 'bg-white/90 border-[#efefef] text-black'
        }`}
      >
        <span
          onClick={() => {
            if (containerRef.current) {
              containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          className={`font-sans font-black text-[23px] sm:text-[25px] tracking-[-0.04em] select-none cursor-pointer active:scale-95 transition-all ${
            isDark ? 'text-white' : 'text-zinc-950'
          }`}
        >
          GediOn
        </span>

        <div className="flex items-center gap-3">
          {/* Activity / Notifications (Heart) */}
          <button
            type="button"
            onClick={onOpenActivity}
            aria-label="Activity notifications"
            className="p-1 active:scale-90 transition-transform cursor-pointer"
          >
            <Heart size={24} strokeWidth={1.8} />
          </button>

          {/* Direct Messages (Send / Paper Plane) */}
          <button
            type="button"
            onClick={onOpenMessages}
            aria-label="Direct messages"
            className="p-1 active:scale-90 transition-transform cursor-pointer"
          >
            <Send size={22} strokeWidth={1.8} className="-rotate-12 translate-y-[-1px]" />
          </button>
        </div>
      </header>

      {/* 2. INSTAGRAM STORIES TRAY (Directly below top header) */}
      <div className="py-2 border-b border-zinc-200/50 dark:border-zinc-800/50">
        <StoriesTray
          stories={stories}
          onOpenYourStory={onOpenYourStory}
          onSelectStory={onSelectStory}
          userAvatar={currentUser?.avatar}
          hasUserStory={hasUserStory}
        />
      </div>

      {/* 3. POSTS FEED LIST: All user photos and videos in standard Instagram post cards */}
      {reels.length > 0 ? (
        <div className="flex flex-col">
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
            Be the first to share a post or reel with your community on GediOn.
          </p>
          <button
            type="button"
            onClick={onOpenCreate}
            className="mt-4 px-4 py-2 rounded-xl bg-[#0095f6] text-white text-xs font-bold hover:bg-[#1877f2] active:scale-95 transition-all shadow-md cursor-pointer"
          >
            Create Post
          </button>
        </div>
      )}
    </div>
  );
};
