import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Plus, Radio, RefreshCw } from 'lucide-react';
import { Reel } from '../types';
import { ReelItem } from './ReelItem';
import { supabase, mapSupabaseRowToReel, SupabaseReelRow } from '../utils/supabaseClient';
import { AuthUser } from '../utils/authStorage';

interface ReelsFeedProps {
  reels: Reel[];
  isMuted: boolean;
  onUpdateReel: (updated: Reel) => void;
  onOpenComments: (reelId: string) => void;
  onOpenShare: (reelId: string) => void;
  onOpenReport?: (reelId: string) => void;
  scrollToTopTrigger?: number;
  onOpenCreateStory?: () => void;
  onReelsLoaded?: (loadedReels: Reel[]) => void;
  onNewRealtimeReel?: (newReel: Reel) => void;
  currentUser?: AuthUser | null;
  onRequireAuth?: (promptMessage: string) => void;
  onStoriesVisibilityChange?: (visible: boolean) => void;
}

export const ReelsFeed: React.FC<ReelsFeedProps> = ({
  reels,
  isMuted,
  onUpdateReel,
  onOpenComments,
  onOpenShare,
  onOpenReport,
  scrollToTopTrigger,
  onOpenCreateStory,
  onReelsLoaded,
  onNewRealtimeReel,
  currentUser,
  onRequireAuth,
  onStoriesVisibilityChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Live posts state populated strictly from Supabase 'posts' table
  const [feedReels, setFeedReels] = useState<Reel[]>(reels);
  const [isFetchingCloud, setIsFetchingCloud] = useState(true);
  const [fetchGlitch, setFetchGlitch] = useState(false);

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

  // Fetch ONLY real posts directly from Supabase 'posts' table
  const fetchReels = useCallback(
    async (silent = false) => {
      if (!silent) setIsFetchingCloud(true);
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Supabase posts fetch note:', error.message);
          setFetchGlitch(false);
        } else if (Array.isArray(data)) {
          setFetchGlitch(false);
          const mapped = data
            .filter((item: any) => Boolean(item && item.video_url))
            .map((item: any) => {
              if (item && item.videoUrl && item.displayName) return item as Reel;
              return mapSupabaseRowToReel(item as SupabaseReelRow);
            });
          setFeedReels(mapped);
          onReelsLoaded?.(mapped);
        } else {
          setFetchGlitch(false);
          setFeedReels([]);
          onReelsLoaded?.([]);
        }
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

  // Keep in sync with parent reels prop
  useEffect(() => {
    setFeedReels(reels);
  }, [reels]);

  // Smooth scroll to top & refetch on refresh trigger
  useEffect(() => {
    if (scrollToTopTrigger !== undefined && scrollToTopTrigger > 0) {
      if (containerRef.current) {
        containerRef.current.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
        setActiveIndex(0);
      }
      onStoriesVisibilityChange?.(true);
      fetchReels(true);
    }
  }, [scrollToTopTrigger, fetchReels, onStoriesVisibilityChange]);

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

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#07070c] select-none">
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

      {/* 1. Cyberpunk Loading Spinner while querying Supabase 'posts' */}
      {isFetchingCloud && feedReels.length === 0 ? (
        <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center bg-[#07070c] text-white">
          <div className="relative flex h-16 w-16 items-center justify-center mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 border-r-fuchsia-500 animate-spin shadow-[0_0_25px_rgba(6,182,212,0.6)]" />
            <RefreshCw size={22} className="text-cyan-400 animate-pulse" />
          </div>
          <p className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-300">
            SCANNING SUPABASE POSTS LEDGER...
          </p>
        </div>
      ) : feedReels.length === 0 ? (
        /* 2. Sleek Cyberpunk Empty State when no posts exist in 'posts' table */
        <div className="relative flex h-full w-full flex-col items-center justify-center p-6 text-center bg-[#07070c] text-white overflow-hidden">
          <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-3xl" />

          <div className="relative z-10 max-w-xs flex flex-col items-center">
            <div className="h-20 w-20 rounded-3xl bg-gradient-to-tr from-cyan-500/20 via-purple-500/20 to-fuchsia-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 mb-5 shadow-[0_0_35px_rgba(6,182,212,0.35)]">
              <Radio size={36} className="animate-pulse text-cyan-400" />
            </div>

            <h3 className="text-sm md:text-base font-black tracking-wider uppercase font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-fuchsia-400 leading-relaxed drop-shadow-[0_0_12px_rgba(6,182,212,0.5)]">
              NO REELS BROADCASTING YET. TAP + TO BE THE FIRST CYBER CREATOR.
            </h3>

            <p className="text-xs text-white/50 mt-2.5 leading-relaxed">
              The live Supabase <span className="text-cyan-300 font-mono">posts</span> feed is ready. Upload your first 720p MP4/WebM reel to broadcast globally.
            </p>

            {onOpenCreateStory && (
              <button
                type="button"
                onClick={onOpenCreateStory}
                className="mt-6 px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-fuchsia-500 hover:from-cyan-300 hover:to-fuchsia-400 text-black font-black text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(6,182,212,0.8)] active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus size={16} strokeWidth={3} />
                <span>Broadcast First Reel</span>
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
                isActive={index === activeIndex}
                isMuted={isMuted}
                onUpdateReel={handleLocalUpdateReel}
                onOpenComments={() => onOpenComments(reel.id)}
                onOpenShare={() => onOpenShare(reel.id)}
                onOpenReport={() => onOpenReport?.(reel.id)}
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
