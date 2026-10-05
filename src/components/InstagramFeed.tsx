import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Reel } from '../types';
import { AuthUser } from '../utils/authStorage';
import { InstagramPostCard } from './InstagramPostCard';
import { StoriesTray } from './StoriesTray';
import { StoryItem } from '../types';
import { useTheme } from '../context/ThemeContext';
import { Camera, Heart, Send } from 'lucide-react';
import { fetchSupabaseReels } from '../utils/supabaseClient';

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
  isMuted: parentIsMuted,
  onToggleMute: parentToggleMute,
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

  // 1. Single Active Audio & Video Playback State
  // At any given moment, ONLY the single post currently visible in the viewport plays video/audio
  const [activePostId, setActivePostId] = useState<string | null>(reels[0]?.id || null);
  const [unmutedPostId, setUnmutedPostId] = useState<string | null>(null);
  const postRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // 2. Pull-To-Refresh State with animated circular ring spinner
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartYRef = useRef<number | null>(null);
  const isDraggingPullRef = useRef(false);

  // Viewport scroll spy: dynamically identify which post is currently active
  const checkActivePost = useCallback(() => {
    const container = containerRef.current;
    if (!container || reels.length === 0) return;

    const containerRect = container.getBoundingClientRect();
    const viewportCenterY = containerRect.top + containerRect.height / 2;

    let closestId: string | null = null;
    let minDistance = Infinity;

    postRefs.current.forEach((el, id) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const elCenterY = rect.top + rect.height / 2;
      const distance = Math.abs(viewportCenterY - elCenterY);

      if (distance < minDistance) {
        minDistance = distance;
        closestId = id;
      }
    });

    if (closestId && closestId !== activePostId) {
      setActivePostId(closestId);
      // Immediately mute when scrolling away if unmuted post is no longer active
      setUnmutedPostId((prev) => (prev === closestId ? prev : null));
    }
  }, [reels, activePostId]);

  // Attach throttled scroll listener for active post detection
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          checkActivePost();
          ticking = false;
        });
        ticking = true;
      }
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    // Initial check
    checkActivePost();

    return () => {
      container.removeEventListener('scroll', onScroll);
    };
  }, [checkActivePost]);

  // Smooth scroll to top on Home double-tap or refresh trigger
  useEffect(() => {
    if (scrollToTopTrigger !== undefined && scrollToTopTrigger > 0) {
      if (containerRef.current) {
        containerRef.current.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
        if (reels[0]) {
          setActivePostId(reels[0].id);
        }
      }
    }
  }, [scrollToTopTrigger, reels]);

  // Touch handlers for Pull-to-Refresh
  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop <= 2) {
      touchStartYRef.current = e.touches[0].clientY;
      isDraggingPullRef.current = true;
    } else {
      touchStartYRef.current = null;
      isDraggingPullRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingPullRef.current || touchStartYRef.current === null || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartYRef.current;

    if (diff > 0 && containerRef.current && containerRef.current.scrollTop <= 2) {
      // Elastic rubber-band resistance
      const pull = Math.min(diff * 0.45, 75);
      setPullY(pull);
    } else {
      setPullY(0);
    }
  };

  const handleTouchEnd = async () => {
    if (pullY > 45 && !isRefreshing) {
      setIsRefreshing(true);
      setPullY(50); // Anchor spinner at bottom of sub-header

      try {
        const fresh = await fetchSupabaseReels();
        if (fresh && fresh.length > 0) {
          onShowToast?.('Feed refreshed');
        }
      } catch (err) {
        console.warn('Pull-to-refresh note:', err);
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullY(0);
        }, 550);
      }
    } else {
      setPullY(0);
    }
    touchStartYRef.current = null;
    isDraggingPullRef.current = false;
  };

  // Toggle speaker for specific post: ensures only 1 video has audio at any time
  const handleTogglePostSound = (reelId: string) => {
    setUnmutedPostId((prev) => (prev === reelId ? null : reelId));
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`w-full h-full overflow-y-auto no-scrollbar pb-24 transition-colors select-none ${
        isDark ? 'bg-black text-white' : 'bg-white text-black'
      }`}
    >
      {/* 1. TOP HEADER BAR: Sleek modern GediOn brand title, Activity, & Direct Messages */}
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

      {/* 2. PULL-TO-REFRESH CIRCULAR RING SPINNER (Positioned at sub-header level) */}
      <div
        style={{
          height: `${pullY}px`,
          opacity: pullY > 5 || isRefreshing ? 1 : 0,
        }}
        className="w-full flex items-center justify-center overflow-hidden transition-all duration-200 pointer-events-none"
      >
        <div className="flex items-center justify-center p-2 rounded-full bg-zinc-950/90 border border-zinc-800 shadow-xl">
          <div
            className={`w-5 h-5 rounded-full border-2 border-zinc-700/60 border-t-[#0095f6] border-r-[#0095f6] ${
              isRefreshing ? 'animate-spin' : ''
            }`}
            style={{
              transform: isRefreshing ? undefined : `rotate(${pullY * 6}deg)`,
            }}
          />
        </div>
      </div>

      {/* 3. INSTAGRAM STORIES TRAY (Directly below top header) */}
      <div className="py-2.5 border-b border-zinc-200/50 dark:border-zinc-800/50">
        <StoriesTray
          stories={stories}
          onOpenYourStory={onOpenYourStory}
          onSelectStory={onSelectStory}
          userAvatar={currentUser?.avatar}
          hasUserStory={hasUserStory}
        />
      </div>

      {/* 4. POSTS FEED LIST: Single active audio/video playback with pure dark loading state */}
      {reels.length > 0 ? (
        <div className="flex flex-col">
          {reels.map((reel) => {
            const isThisPostActive = reel.id === activePostId;
            const isThisPostSoundOn = unmutedPostId === reel.id;

            return (
              <div
                key={reel.id}
                ref={(el) => {
                  if (el) {
                    postRefs.current.set(reel.id, el);
                  } else {
                    postRefs.current.delete(reel.id);
                  }
                }}
              >
                <InstagramPostCard
                  reel={reel}
                  currentUser={currentUser}
                  isActive={isThisPostActive}
                  isSoundOn={isThisPostSoundOn}
                  onToggleSound={() => handleTogglePostSound(reel.id)}
                  isMuted={!isThisPostSoundOn}
                  onToggleMute={() => handleTogglePostSound(reel.id)}
                  onToggleLike={onToggleLike}
                  onToggleBookmark={onToggleBookmark}
                  onOpenComments={onOpenComments}
                  onOpenShare={onOpenShare}
                  onOpenOptions={onOpenOptions}
                  onShowToast={onShowToast}
                />
              </div>
            );
          })}
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
