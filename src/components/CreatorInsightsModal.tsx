import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  TrendingUp,
  Clock,
  Users,
  UserPlus,
  Eye,
  Sparkles,
  BarChart3,
  Activity,
  Heart,
  Share2,
  Play,
} from 'lucide-react';
import { Reel } from '../types';

interface CreatorInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reels?: Reel[];
  onOpenReel?: (reelId: string) => void;
}

type Period = '7d' | '30d';

export const CreatorInsightsModal: React.FC<CreatorInsightsModalProps> = ({
  isOpen,
  onClose,
  reels = [],
  onOpenReel,
}) => {
  const [period, setPeriod] = useState<Period>('7d');

  if (!isOpen) return null;

  // Compute real metrics strictly from actual Supabase posts (starts at 0 for new users)
  const totalViews = reels.reduce(
    (sum, r) => sum + (parseInt(String(r.viewsCount).replace(/\D/g, ''), 10) || 0),
    0
  );
  const totalLikes = reels.reduce((sum, r) => sum + (Number(r.likesCount) || 0), 0);
  const totalComments = reels.reduce((sum, r) => sum + (Number(r.commentsCount) || 0), 0);
  const totalReels = reels.length;

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
                Real-Time Supabase Posts Telemetry
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
          {/* 1. OVERVIEW METRICS CARDS (Real counts starting at 0) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
                <BarChart3 size={13} className="text-cyan-400" />
                Live Overview Metrics
              </h3>
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
                <p className="text-[10px] text-white/40 mt-0.5">Active in Supabase posts</p>
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

          {/* 2. TOP PERFORMING REELS LIST */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
                <Sparkles size={13} className="text-cyan-400" />
                Published Reels Performance
              </h3>
            </div>

            {reels.length === 0 ? (
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
                {reels.slice(0, 10).map((reel, index) => (
                  <div
                    key={reel.id}
                    onClick={() => onOpenReel?.(reel.id)}
                    className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-cyan-500/30 transition-all cursor-pointer group"
                  >
                    <span className="text-xs font-black text-white/40 group-hover:text-cyan-400 pl-1">
                      0{index + 1}
                    </span>

                    <div className="relative h-14 w-11 rounded-xl overflow-hidden shrink-0 border border-white/15 bg-black flex items-center justify-center">
                      {reel.poster ? (
                        <img
                          src={reel.poster}
                          alt={reel.caption}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Play size={14} className="text-cyan-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">
                        {reel.caption || 'Untitled Reel'}
                      </h4>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-white/60">
                        <span className="flex items-center gap-1 font-semibold text-white">
                          <Eye size={11} className="text-cyan-400" />
                          {reel.viewsCount || '0'}
                        </span>
                        <span className="flex items-center gap-1 text-pink-400 font-semibold">
                          <Heart size={10} className="fill-pink-400" />
                          {reel.likesCount || 0} likes
                        </span>
                        <span className="flex items-center gap-1 text-purple-300">
                          <Share2 size={10} />
                          {reel.sharesCount || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
