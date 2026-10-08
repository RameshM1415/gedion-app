import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Plus, Radio, RefreshCw } from 'lucide-react';
import { Reel } from '../types';
import { ReelItem } from './ReelItem';
import { supabase, mapSupabaseRowToReel, SupabaseReelRow, fetchSupabaseReels } from '../utils/supabaseClient';
import { AuthUser } from '../utils/authStorage';

interface ReelsFeedProps {
  reels: Reel[];
  isMuted: boolean;
  onToggleMute?: () => void;
  initialReelId?: string | null;
  onUpdateReel: (updated: Reel) => void;
  onOpenComments: (reelId: string) => void;
  onOpenShare: (reelId: string) => void;
  onOpenReport?: (reelId: string) => void;
  onOpenOptions?: (reel: Reel) => void;
  scrollToTopTrigger?: number;
  reelsRefreshTrigger?: number;
  onOpenCreateStory?: () => void;
  onReelsLoaded?: (loadedReels: Reel[]) => void;
  onNewRealtimeReel?: (newReel: Reel) => void;
  currentUser?: AuthUser | null;
  onRequireAuth?: (promptMessage: string) => void;
  onStoriesVisibilityChange?: (visible: boolean) => void;
  onOpenLikes?: (reelId: string) => void;
  onOpenProfile?: (username: string) => void;
}

export const ReelsFeed: React.FC<ReelsFeedProps> = ({
  reels,
  isMuted,
  onToggleMute,
  initialReelId,
  onUpdateReel,
  onOpenComments,
  onOpenShare,
  onOpenReport,
  onOpenOptions,
  scrollToTopTrigger,
  reelsRefreshTrigger,
  onOpenCreateStory,
  onReelsLoaded,
  onNewRealtimeReel,
  currentUser,
  onRequireAuth,
  onStoriesVisibilityChange,
  onOpenLikes,
  onOpenProfile,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Live posts state populated strictly from Supabase 'posts' table
  const [feedReels, setFeedReels] = useState<Reel[]>(reels);
  const [isFetchingCloud, setIsFetchingCloud] = useState(() => !reels || reels.length === 0);
  const [fetchGlitch, setFetchGlitch] = useState(false);
  const [isReelsRefreshing, setIsReelsRefreshing] = useState(false);

  // References to prevent triggering refresh or scroll-to-top on initial tab switch/mount
  const lastTriggerRef = useRef(reelsRefreshTrigger);
  const lastScrollToTopRef = useRef(scrollToTopTrigger);

  // Ensure spinner is hidden on mount
  useEffect(() => {
    setIsReelsRefreshing(false);
    setPullY(0);
  }, []);

  // Jump to initialReelId on mount or when requested from home feed
  useEffect(() => {
    if (initialReelId && feedReels.length > 0) {
      const targetIndex = feedReels.findIndex((r) => r.id === initialReelId);
      if (targetIndex >= 0) {
        setActiveIndex(targetIndex);
        const performScroll = () => {
          if (containerRef.current) {
            const h = containerRef.current.clientHeight || window.innerHeight;
            containerRef.current.scrollTop = targetIndex * h;
          }
        };
        performScroll();
        const raf = requestAnimationFrame(performScroll);
        const timer = setTimeout(performScroll, 60);
        return () => {
          cancelAnimationFrame(raf);
          clearTimeout(timer);
        };
      }
    }
  }, [initialReelId, feedReels]);

  // Listen for reel-deleted event to remove immediately from feed without page reload
  useEffect(() => {
    const handleReelDeleted = (e: Event) => {
      const customEvent = e as CustomEvent<{ reelId: string }>;
      const deletedId = customEvent.detail?.reelId;
      if (deletedId) {
        setFeedReels((prev) => prev.filter((r) => r.id !== deletedId));
      }
    };
    window.addEventListener('reel-deleted', handleReelDeleted);
    return () => {
      window.removeEventListener('reel-deleted', handleReelDeleted);
    };
  }, []);

  const setReels = useCallback((action: any) => {
    setFeedReels((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      if (!Array.isArray(next)) return prev;

      const normalized = next
        .filter((item) => Boolean(item && (item.videoUrl || item.video_url)))
        .map((item) => {
          if (item && item.videoUrl && item.displayName) return item as Reel;
          return mapSupabaseRowToReel(item as SupabaseReelRow);
        });

      const seen = new Set<string>();
      const deduped: Reel[] = [];
      for (const item of normalized) {
        if (item && item.id && !seen.has(item.id)) {
          seen.add(item.id);
          deduped.push(item);
        }
      }
      return deduped;
    });
  }, []);

  // Fetch real posts & reels directly from Supabase
  const fetchReels = useCallback(
    async (silent = false) => {
      if (!silent) setIsFetchingCloud(true);
      try {
        const cloudReels = await fetchSupabaseReels();
        setFetchGlitch(false);
        setFeedReels(cloudReels);
        onReelsLoaded?.(cloudReels);
      } catch (err: any) {
        console.warn('Network exception while fetching posts:', err);
        const isFatalNetwork =
          !navigator.onLine ||
          err instanceof TypeError ||
          (typeof err?.message === 'string' &&
            (err.message.includes('fetch') ||
              err.message.includes('Network') ||
              err.message.includes('Failed')));
        if (isFatalNetwork) {
          setFetchGlitch(true);
        }
      } finally {
        setIsFetchingCloud(false);
      }
    },
    [onReelsLoaded]
  );

  // Direct Supabase query on mount & realtime channel subscription on 'posts'
  useEffect(() => {
    fetchReels(false);

    const handleRealtimeInsert = (payload: any) => {
      if (payload.new && payload.new.video_url) {
        const mapped = mapSupabaseRowToReel(payload.new as SupabaseReelRow);
        setReels((prev: Reel[]) => [mapped, ...prev]);
        onNewRealtimeReel?.(mapped);
      }
    };

    const channel = supabase
      .channel('gedion-posts-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        handleRealtimeInsert
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchReels, setReels, onNewRealtimeReel]);

  // Keep in sync with parent reels prop (prevent unnecessary object identity churn)
  useEffect(() => {
    setFeedReels((prev) => {
      if (prev.length === reels.length && prev.every((r, idx) => r.id === reels[idx]?.id)) {
        return prev;
      }
      return reels;
    });
  }, [reels]);

  // Smooth scroll to top ONLY when scrollToTopTrigger increments after mount
  useEffect(() => {
    if (scrollToTopTrigger !== undefined && scrollToTopTrigger > (lastScrollToTopRef.current || 0)) {
      lastScrollToTopRef.current = scrollToTopTrigger;
      if (containerRef.current) {
        containerRef.current.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
        setActiveIndex(0);
      }
      onStoriesVisibilityChange?.(true);
    } else {
      lastScrollToTopRef.current = scrollToTopTrigger;
    }
  }, [scrollToTopTrigger, onStoriesVisibilityChange]);

  // Instagram-Style Reels Refresh & Content Shuffling Logic (Double-Tap & Pull-to-Refresh)
  const performReelsRefreshAndShuffle = useCallback(async () => {
    const previousTopId = feedReels[0]?.id;
    const previousPlayingId = feedReels[activeIndex]?.id;
    setIsReelsRefreshing(true);
    setPullY(48); // Reveal the top circular refresh ring

    // Instantly scroll/snap container to top index 0
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    setActiveIndex(0);
    onStoriesVisibilityChange?.(true);

    // Safety timeout: Spinner must NEVER stay stuck on screen (max 500ms)
    const safetyTimer = setTimeout(() => {
      setIsReelsRefreshing(false);
      setIsPullRefreshing(false);
      setPullY(0);
    }, 500);

    try {
      // Re-query fresh reels directly from Supabase with quick timeout fallback
      let cloudReels: Reel[] = [];
      try {
        const fetchPromise = fetchSupabaseReels();
        const timeoutPromise = new Promise<Reel[]>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 300)
        );
        cloudReels = await Promise.race([fetchPromise, timeoutPromise]);
        setFetchGlitch(false);
      } catch {
        // Fall back to existing cloud or local
      }

      let localCustom: Reel[] = [];
      try {
        const raw = localStorage.getItem('gedion_custom_reels');
        if (raw) localCustom = JSON.parse(raw);
      } catch {}

      // Combine cloud reels, custom creator reels, and existing pool
      const map = new Map<string, Reel>();
      for (const r of [...localCustom, ...cloudReels, ...feedReels]) {
        if (r && r.id && !map.has(r.id)) {
          map.set(r.id, r);
        }
      }
      const pool = Array.from(map.values());

      if (pool.length > 0) {
        // Fisher-Yates shuffle to randomize order every single time
        const shuffled = [...pool];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        // CRITICAL REQUIREMENT:
        // Do NOT keep the same video at index 0.
        // A brand new / different video MUST be placed at index 0.
        if (shuffled.length > 1) {
          const avoidIds = new Set<string>();
          if (previousTopId) avoidIds.add(previousTopId);
          if (previousPlayingId) avoidIds.add(previousPlayingId);

          if (avoidIds.has(shuffled[0].id)) {
            const swapIdx = shuffled.findIndex((r) => !avoidIds.has(r.id));
            if (swapIdx > 0) {
              [shuffled[0], shuffled[swapIdx]] = [shuffled[swapIdx], shuffled[0]];
            } else {
              const target = 1 + Math.floor(Math.random() * (shuffled.length - 1));
              [shuffled[0], shuffled[target]] = [shuffled[target], shuffled[0]];
            }
          }
        }

        setFeedReels(shuffled);
        onReelsLoaded?.(shuffled);
      }
    } catch (err: any) {
      console.warn('Network exception while refreshing reels:', err);
    } finally {
      clearTimeout(safetyTimer);
      // Smoothly hide spinner within max 420ms (well under 500ms) and immediately start playing newly placed top video
      setTimeout(() => {
        setIsReelsRefreshing(false);
        setIsPullRefreshing(false);
        setPullY(0);
        if (containerRef.current) {
          containerRef.current.scrollTop = 0;
        }
        setActiveIndex(0);
      }, 420);
    }
  }, [activeIndex, feedReels, onReelsLoaded, onStoriesVisibilityChange]);

  // Trigger double-tap refresh and shuffle ONLY when reelsRefreshTrigger increments after mount
  useEffect(() => {
    if (reelsRefreshTrigger !== undefined && reelsRefreshTrigger > (lastTriggerRef.current || 0)) {
      lastTriggerRef.current = reelsRefreshTrigger;
      performReelsRefreshAndShuffle();
    } else {
      lastTriggerRef.current = reelsRefreshTrigger;
    }
  }, [reelsRefreshTrigger, performReelsRefreshAndShuffle]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const itemHeight = container.clientHeight;
    if (itemHeight <= 0) return;

    const newIndex = Math.round(scrollTop / itemHeight);
    if (newIndex >= 0 && newIndex < feedReels.length && newIndex !== activeIndex) {
      setActiveIndex(newIndex);
    }

    // Auto-hide stories when scrolling down into feed reels; reveal when at very top
    if (scrollTop > 30) {
      onStoriesVisibilityChange?.(false);
    } else if (scrollTop <= 10) {
      onStoriesVisibilityChange?.(true);
    }
  }, [activeIndex, feedReels.length, onStoriesVisibilityChange]);

  const handleLocalUpdateReel = useCallback(
    (updated: Reel) => {
      setFeedReels((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      onUpdateReel(updated);
    },
    [onUpdateReel]
  );

  // Keyboard navigation for desktop users
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const container = containerRef.current;
      if (!container || feedReels.length === 0) return;

      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        const nextIndex = Math.min(feedReels.length - 1, activeIndex + 1);
        if (nextIndex > 0) {
          onStoriesVisibilityChange?.(false);
        }
        container.scrollTo({
          top: nextIndex * container.clientHeight,
          behavior: 'smooth',
        });
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        const prevIndex = Math.max(0, activeIndex - 1);
        if (prevIndex === 0) {
          onStoriesVisibilityChange?.(true);
        }
        container.scrollTo({
          top: prevIndex * container.clientHeight,
          behavior: 'smooth',
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, feedReels.length, onStoriesVisibilityChange]);

  // Pull-to-refresh state in Reels viewer
  const [pullY, setPullY] = useState(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const touchStartYRef = useRef<number | null>(null);
  const isMouseDownRef = useRef(false);
  const mouseStartYRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop <= 5 && activeIndex === 0) {
      touchStartYRef.current = e.touches[0].clientY;
    } else {
      touchStartYRef.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null || isPullRefreshing || isReelsRefreshing) return;
    const diff = e.touches[0].clientY - touchStartYRef.current;
    if (diff > 0 && containerRef.current && containerRef.current.scrollTop <= 5 && activeIndex === 0) {
      setPullY(Math.min(diff * 0.45, 65));
    } else {
      setPullY(0);
    }
  };

  const handleTouchEnd = () => {
    if (pullY > 35 && !isPullRefreshing && !isReelsRefreshing) {
      setIsPullRefreshing(true);
      performReelsRefreshAndShuffle();
    } else {
      setPullY(0);
    }
    touchStartYRef.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (containerRef.current && containerRef.current.scrollTop <= 5 && activeIndex === 0) {
      isMouseDownRef.current = true;
      mouseStartYRef.current = e.clientY;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDownRef.current || mouseStartYRef.current === null || isPullRefreshing || isReelsRefreshing) return;
    const diff = e.clientY - mouseStartYRef.current;
    if (diff > 0 && containerRef.current && containerRef.current.scrollTop <= 5 && activeIndex === 0) {
      setPullY(Math.min(diff * 0.45, 65));
    } else {
      setPullY(0);
    }
  };

  const handleMouseUp = () => {
    if (!isMouseDownRef.current) return;
    isMouseDownRef.current = false;
    mouseStartYRef.current = null;
    if (pullY > 35 && !isPullRefreshing && !isReelsRefreshing) {
      setIsPullRefreshing(true);
      performReelsRefreshAndShuffle();
    } else {
      setPullY(0);
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="relative h-full w-full overflow-hidden bg-[#000000] select-none"
    >
      {/* Pull-to-refresh & Double-Tap circular ring spinner (Sub-header level) */}
      {(pullY > 0 || isPullRefreshing || isReelsRefreshing) && (
        <div
          style={{
            height: `${pullY > 0 ? pullY : 50}px`,
            opacity: pullY > 5 || isPullRefreshing || isReelsRefreshing ? 1 : 0,
          }}
          className="absolute top-14 inset-x-0 z-40 flex items-center justify-center pointer-events-none transition-all duration-200"
        >
          <div className="flex items-center justify-center p-2 rounded-full bg-black/85 border border-zinc-800 shadow-xl backdrop-blur-md">
            <div
              className={`w-5 h-5 rounded-full border-2 border-zinc-700/60 border-t-[#0095f6] border-r-[#0095f6] ${
                isPullRefreshing || isReelsRefreshing ? 'animate-spin' : ''
              }`}
              style={{
                transform: isPullRefreshing || isReelsRefreshing ? undefined : `rotate(${pullY * 6}deg)`,
              }}
            />
          </div>
        </div>
      )}

      {/* Network glitch retry toast */}
      {fetchGlitch && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-950/90 border border-amber-500/50 text-[11px] font-bold text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.5)] backdrop-blur-md">
          <span>⚠️ Supabase sync glitch</span>
          <button
            onClick={() => fetchReels(false)}
            disabled={isFetchingCloud}
            className="px-2 py-0.5 rounded-full bg-amber-500 text-black font-extrabold hover:bg-amber-400 active:scale-95 transition-all"
          >
            {isFetchingCloud ? 'Retrying...' : 'Retry 🔄'}
          </button>
        </div>
      )}

      {/* 1. Clean Instagram Loading Spinner */}
      {isFetchingCloud && feedReels.length === 0 ? (
        <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center bg-black text-white">
          <div className="relative flex h-12 w-12 items-center justify-center mb-4">
            <div className="h-9 w-9 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          </div>
          <p className="text-xs font-semibold tracking-wide text-zinc-400">
            Loading Reels...
          </p>
        </div>
      ) : feedReels.length === 0 ? (
        /* 2. Authentic Instagram Reels Empty State */
        <div className="relative flex h-full w-full flex-col items-center justify-center p-6 text-center bg-black text-white">
          <div className="relative z-10 max-w-xs flex flex-col items-center">
            <div className="h-16 w-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white mb-4">
              <Radio size={28} className="text-white" />
            </div>

            <h3 className="text-base font-bold tracking-tight text-white">
              No Reels Yet
            </h3>

            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              When creators share reels, they will appear here. Be the first to share one!
            </p>

            {onOpenCreateStory && (
              <button
                type="button"
                onClick={onOpenCreateStory}
                className="mt-6 px-5 py-2.5 rounded-lg bg-[#0095f6] hover:bg-[#1877f2] text-white font-bold text-xs transition-all active:scale-95 flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>Create Reel</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* 3. Snap-scroll Real Posts Container */
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="h-full w-full overflow-y-scroll snap-y-mandatory no-scrollbar gpu-accelerated"
        >
          {feedReels.map((reel, index) => (
            <div key={reel.id} className="relative h-full w-full snap-start-always">
              <ReelItem
                reel={reel}
                isActive={!isReelsRefreshing && !isPullRefreshing && index === activeIndex}
                isMuted={isMuted}
                onToggleMute={onToggleMute}
                onUpdateReel={handleLocalUpdateReel}
                onOpenComments={() => onOpenComments(reel.id)}
                onOpenShare={() => onOpenShare(reel.id)}
                onOpenReport={() => onOpenReport?.(reel.id)}
                onOpenOptions={() => {
                  if (onOpenOptions) {
                    onOpenOptions(reel);
                  } else {
                    onOpenReport?.(reel.id);
                  }
                }}
                onOpenLikes={() => onOpenLikes?.(reel.id)}
                onOpenProfile={onOpenProfile}
                currentUser={currentUser}
                onRequireAuth={onRequireAuth}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
