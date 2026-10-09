import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  TrendingUp,
  Clock,
  Users,
  Eye,
  Sparkles,
  BarChart3,
  Activity,
  Heart,
  Share2,
  Play,
  Loader2,
} from 'lucide-react';
import { Reel } from '../types';
import { supabase, fetchUserPostsFromSupabase } from '../utils/supabaseClient';
import { getStoredAuth, DEFAULT_AUTH_USER, AuthUser } from '../utils/authStorage';

interface CreatorInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reels?: Reel[];
  currentUser?: AuthUser | null;
  onOpenReel?: (reelId: string) => void;
}

type Period = '7d' | '30d';

export const CreatorInsightsModal: React.FC<CreatorInsightsModalProps> = ({
  isOpen,
  onClose,
  reels = [],
  currentUser,
  onOpenReel,
}) => {
  const [period, setPeriod] = useState<Period>('7d');
  const [userReels, setUserReels] = useState<Reel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [likesTableCount, setLikesTableCount] = useState<number | null>(null);
  const [commentsTableCount, setCommentsTableCount] = useState<number | null>(null);

  // Active authenticated user resolution
  const activeUser = useMemo(() => {
    return currentUser || getStoredAuth() || DEFAULT_AUTH_USER;
  }, [currentUser]);

  // Clean filtering helper strictly for the logged-in user
  const filterReelsForUser = useCallback(
    (inputReels: Reel[]): Reel[] => {
      if (!Array.isArray(inputReels)) return [];
      const targetUserId = String(activeUser?.id || '');
      const cleanUser = String(activeUser?.username || '').toLowerCase().replace(/^@/, '');
      const isRamesh = cleanUser === 'rameshrao034' || targetUserId.includes('rameshrao034');

      return inputReels.filter((r) => {
        if (!r || r.id.startsWith('mock_')) return false;
        // 1. By creatorId
        if (targetUserId && r.creatorId && String(r.creatorId) === targetUserId) {
          return true;
        }
        // 2. By username
        const rUsername = String(r.username || '').toLowerCase().replace(/^@/, '');
        if (cleanUser && rUsername === cleanUser) {
          return true;
        }
        // 3. Fallback for primary creator profile
        if (isRamesh && (rUsername === 'rameshrao034' || rUsername === 'ramesh rao')) {
          return true;
        }
        return false;
      });
    },
    [activeUser]
  );

  // Load and refresh authentic reels and Supabase telemetry
  const loadUserTelemetry = useCallback(async () => {
    if (!activeUser) return;
    setIsLoading(true);

    try {
      // 1. Query Supabase posts and reels directly for this creator
      const cloudReels = await fetchUserPostsFromSupabase(
        activeUser.id,
        activeUser.username,
        activeUser.displayName
      );

      // 2. Merge with locally provided user reels
      const filteredProps = filterReelsForUser(reels);
      const combined = [...cloudReels, ...filteredProps];

      // Deduplicate by ID
      const seen = new Set<string>();
      const deduped: Reel[] = [];
      for (const r of combined) {
        const key = String(r.id || r.videoUrl);
        if (key && !seen.has(key)) {
          seen.add(key);
          deduped.push(r);
        }
      }

      setUserReels(deduped);

      // 3. Query Supabase 'likes' table for exact record count
      const reelIds = deduped.map((r) => r.id).filter(Boolean);
      if (reelIds.length > 0) {
        try {
          const { count: exactLikes, error: likesErr } = await supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .in('reel_id', reelIds);

          if (!likesErr && typeof exactLikes === 'number') {
            setLikesTableCount(exactLikes);
          } else {
            // Check if column is post_id instead
            const { count: postLikes, error: postLikesErr } = await supabase
              .from('likes')
              .select('*', { count: 'exact', head: true })
              .in('post_id', reelIds);

            if (!postLikesErr && typeof postLikes === 'number') {
              setLikesTableCount(postLikes);
            } else {
              setLikesTableCount(null); // Will fallback to sum of likes_count
            }
          }
        } catch {
          setLikesTableCount(null);
        }

        // 4. Query Supabase 'comments' table for exact record count
        try {
          const { count: exactComments, error: commErr } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .in('reel_id', reelIds);

          if (!commErr && typeof exactComments === 'number') {
            setCommentsTableCount(exactComments);
          } else {
            setCommentsTableCount(null);
          }
        } catch {
          setCommentsTableCount(null);
        }
      } else {
        setLikesTableCount(0);
        setCommentsTableCount(0);
      }
    } catch (err) {
      console.warn('Error loading creator telemetry:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeUser, reels, filterReelsForUser]);

  // Sync on modal open
  useEffect(() => {
    if (isOpen) {
      loadUserTelemetry();
    }
  }, [isOpen, loadUserTelemetry]);

  // Listen to live upload/delete events
  useEffect(() => {
    if (!isOpen) return;

    const handleReelPublished = () => {
      loadUserTelemetry();
    };
    const handleReelDeleted = () => {
      loadUserTelemetry();
    };

    window.addEventListener('reel-published', handleReelPublished);
    window.addEventListener('reel-deleted', handleReelDeleted);

    // Supabase Realtime channel for live updates to posts, reels, and comments
    const channel = supabase
      .channel('creator_insights_telemetry')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        () => loadUserTelemetry()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reels' },
        () => loadUserTelemetry()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments' },
        () => loadUserTelemetry()
      )
      .subscribe();

    return () => {
      window.removeEventListener('reel-published', handleReelPublished);
      window.removeEventListener('reel-deleted', handleReelDeleted);
      supabase.removeChannel(channel);
    };
  }, [isOpen, loadUserTelemetry]);

  if (!isOpen) return null;

  // Filter reels based on period (7d vs 30d) if timestamp is present
  const activePeriodReels = userReels.filter((r) => {
    const rawDate = r.timestamp || (r as any).created_at || (r as any).createdAt;
    if (!rawDate) return true; // Include if untimestamped
    const ts = new Date(rawDate).getTime();
    if (isNaN(ts)) return true;
    const daysDiff = (Date.now() - ts) / (1000 * 60 * 60 * 24);
    return daysDiff <= (period === '7d' ? 7 : 30);
  });

  // Target reels for metrics (if period filtered has items, use them; otherwise all user reels)
  const displayReels = activePeriodReels.length > 0 ? activePeriodReels : userReels;

  // 1. Total Views: Sum of views_count across all reels owned by user
  const totalViews = displayReels.reduce((sum, r) => {
    const rawVal = r.viewsCount || (r as any).views_count || '0';
    const num = parseInt(String(rawVal).replace(/\D/g, ''), 10) || 0;
    return sum + num;
  }, 0);

  // 2. Total Likes: Exact count of records from 'likes' table or sum of likes_count
  const totalLikes =
    typeof likesTableCount === 'number'
      ? likesTableCount
      : displayReels.reduce((sum, r) => sum + (Number(r.likesCount) || 0), 0);

  // 3. Published Reels: Real count of records from user's posts / reels table
  const totalReels = displayReels.length;

  // 4. Comments: Exact count of records from 'comments' table or sum of commentsCount
  const totalComments =
    typeof commentsTableCount === 'number'
      ? commentsTableCount
      : displayReels.reduce((sum, r) => sum + (Number(r.commentsCount) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-xl">
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative z-10 flex flex-col w-full max-w-lg max-h-[92vh] h-[82vh] rounded-t-[32px] bg-[#07070d]/95 backdrop-blur-2xl border-t border-cyan-500/30 shadow-[0_-15px_60px_rgba(6,182,212,0.25),0_0_40px_rgba(0,0,0,0.9)] overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1.5 w-12 rounded-full bg-white/20" />
        </div>

        {/* Sticky Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-5 py-3 bg-[#07070d]/90 backdrop-blur-xl border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-fuchsia-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.6)]">
              <Activity size={18} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-wide">
                Creator Insights
              </h2>
              <p className="text-[10px] text-white/50 font-medium">
                Account Performance & Reach
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center p-0.5 rounded-full bg-white/[0.08] border border-white/10 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setPeriod('7d')}
                className={`px-2.5 py-1 rounded-full transition-all ${
                  period === '7d'
                    ? 'bg-cyan-400 text-black font-extrabold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                7D
              </button>
              <button
                type="button"
                onClick={() => setPeriod('30d')}
                className={`px-2.5 py-1 rounded-full transition-all ${
                  period === '30d'
                    ? 'bg-fuchsia-500 text-white font-extrabold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                30D
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors border border-white/10"
              aria-label="Close Creator Insights"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Analytics Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 no-scrollbar">
          {/* 1. OVERVIEW METRICS CARDS (Clean User-Friendly Performance Overview) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
                <BarChart3 size={13} className="text-cyan-400" />
                Performance Overview
              </h3>
              {isLoading && (
                <div className="flex items-center gap-1.5 text-[10px] text-cyan-400/80 font-mono">
                  <Loader2 size={11} className="animate-spin" />
                  Updating...
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-white/[0.04] to-transparent border border-cyan-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-medium text-white/60">Total Views</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    <Eye size={14} />
                  </div>
                </div>
                <span className="text-xl font-extrabold text-white tracking-tight">
                  {totalViews.toLocaleString('en-IN')}
                </span>
                <p className="text-[10px] text-white/40 mt-0.5">Live post impressions</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-pink-950/40 via-white/[0.04] to-transparent border border-pink-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-medium text-white/60">Total Likes</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-pink-500/20 text-pink-300 border border-pink-500/30">
                    <Heart size={14} />
                  </div>
                </div>
                <span className="text-xl font-extrabold text-white tracking-tight">
                  {totalLikes.toLocaleString('en-IN')}
                </span>
                <p className="text-[10px] text-white/40 mt-0.5">Verified audience likes</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-950/40 via-white/[0.04] to-transparent border border-purple-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-medium text-white/60">Published Reels</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    <Clock size={14} />
                  </div>
                </div>
                <span className="text-xl font-extrabold text-white tracking-tight">
                  {totalReels.toLocaleString('en-IN')}
                </span>
                <p className="text-[10px] text-white/40 mt-0.5">Active public videos</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-white/[0.04] to-transparent border border-emerald-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-medium text-white/60">Comments</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <Users size={14} />
                  </div>
                </div>
                <span className="text-xl font-extrabold text-white tracking-tight">
                  {totalComments.toLocaleString('en-IN')}
                </span>
                <p className="text-[10px] text-white/40 mt-0.5">Community interactions</p>
              </div>
            </div>
          </div>

          {/* 2. PUBLISHED REELS PERFORMANCE LIST */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
                <Sparkles size={13} className="text-cyan-400" />
                Published Reels Performance
              </h3>
            </div>

            {userReels.length === 0 ? (
              <div className="p-8 rounded-2xl bg-white/[0.02] border border-cyan-500/20 text-center flex flex-col items-center gap-2">
                <TrendingUp size={24} className="text-cyan-400" />
                <p className="text-xs font-bold uppercase tracking-wider font-mono text-cyan-300">
                  No published reels yet
                </p>
                <p className="text-[11px] text-white/45 max-w-xs">
                  Publish your first reel to view live impressions and audience analytics.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {userReels.map((reel, index) => {
                  const displayViews = reel.viewsCount || (reel as any).views_count || '0';
                  const displayLikes = reel.likesCount || 0;
                  const displayShares = reel.sharesCount || 0;

                  return (
                    <div
                      key={reel.id}
                      onClick={() => onOpenReel?.(reel.id)}
                      className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-cyan-500/30 transition-all cursor-pointer group"
                    >
                      <span className="text-xs font-black text-white/40 group-hover:text-cyan-400 pl-1 w-6">
                        {String(index + 1).padStart(2, '0')}
                      </span>

                      {/* Video Thumbnail Poster Frame */}
                      <div className="relative h-14 w-11 rounded-xl overflow-hidden shrink-0 border border-white/15 bg-black flex items-center justify-center">
                        {reel.poster ? (
                          <img
                            src={reel.poster}
                            alt={reel.caption || 'Reel'}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              // Fallback if image fails
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : reel.videoUrl ? (
                          <video
                            src={`${reel.videoUrl}#t=0.1`}
                            className="h-full w-full object-cover"
                            muted
                            playsInline
                            preload="metadata"
                          />
                        ) : (
                          <Play size={14} className="text-cyan-400" />
                        )}
                      </div>

                      {/* Caption & Performance Metrics */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">
                          {reel.caption || 'Untitled Reel'}
                        </h4>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-white/60">
                          <span className="flex items-center gap-1 font-semibold text-white">
                            <Eye size={11} className="text-cyan-400" />
                            {displayViews}
                          </span>
                          <span className="flex items-center gap-1 text-pink-400 font-semibold">
                            <Heart size={10} className="fill-pink-400" />
                            {displayLikes} likes
                          </span>
                          <span className="flex items-center gap-1 text-purple-300 font-semibold">
                            <Share2 size={10} />
                            {displayShares}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

