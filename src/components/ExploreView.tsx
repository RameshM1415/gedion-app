import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Play,
  Volume2,
  VolumeX,
  Heart,
  MessageCircle,
  Share2,
  ArrowLeft,
  Flame,
  Sparkles,
  Music2,
  Check,
} from 'lucide-react';
import { Reel } from '../types';
import { fetchSupabaseReels, updateReelLikesInSupabase } from '../utils/supabaseClient';

interface ExploreViewProps {
  onClose: () => void;
  reels: Reel[];
  onOpenReel?: (reelId: string) => void;
}

const CATEGORY_PILLS = [
  '🔥 Trending',
  '🎬 Bollywood',
  '⚡ Viral',
  '🎧 Remixes',
  '😂 Comedy',
  '💃 Dance',
];

export const ExploreView: React.FC<ExploreViewProps> = ({
  onClose,
  reels,
  onOpenReel,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('🔥 Trending');
  const [cloudReels, setCloudReels] = useState<Reel[]>(reels);
  const [isLoading, setIsLoading] = useState(false);

  // Full-screen vertical swipe mode state
  const [activeSwipeReelIndex, setActiveSwipeReelIndex] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const swipeContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    fetchSupabaseReels()
      .then((fetched) => {
        if (isMounted) {
          setCloudReels(fetched);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [reels]);

  const allReels = cloudReels.length > 0 ? cloudReels : reels;

  // Filter reels based on search query and category chip
  const filteredReels = allReels.filter((reel) => {
    // 1. Search Query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        reel.username.toLowerCase().includes(q) ||
        reel.displayName.toLowerCase().includes(q) ||
        reel.caption.toLowerCase().includes(q) ||
        reel.audioTitle.toLowerCase().includes(q) ||
        reel.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchQuery) return false;
    }

    // 2. Category Chip filter
    if (selectedCategory === '🔥 Trending') return true;
    if (selectedCategory === '🎬 Bollywood') {
      return (
        reel.tags.some((t) => /bollywood|desi|hindi|haveli/i.test(t)) ||
        /bollywood|desi|kesariya|pathaan|nasha/i.test(reel.caption + reel.audioTitle)
      );
    }
    if (selectedCategory === '⚡ Viral') {
      return (
        reel.tags.some((t) => /viral|trending|epic/i.test(t)) ||
        reel.viewsCount.includes('M')
      );
    }
    if (selectedCategory === '🎧 Remixes') {
      return (
        reel.tags.some((t) => /remix|electronic|lofi|bass/i.test(t)) ||
        /remix|dub|mix|lo-fi|bootleg|beats/i.test(reel.caption + reel.audioTitle)
      );
    }
    if (selectedCategory === '😂 Comedy') {
      return (
        reel.tags.some((t) => /comedy|humor|standup|relatable/i.test(t)) ||
        /comedy|laugh|funny|mom|generation/i.test(reel.caption)
      );
    }
    if (selectedCategory === '💃 Dance') {
      return (
        reel.tags.some((t) => /dance|choreography|kathak|fusion/i.test(t)) ||
        /dance|choreography|hook step|kathak/i.test(reel.caption)
      );
    }

    return true;
  });

  // Handle tile click -> open full-screen vertical swipe mode
  const handleTileClick = (index: number) => {
    setActiveSwipeReelIndex(index);
    setIsPlaying(true);
    if (onOpenReel && filteredReels[index]) {
      onOpenReel(filteredReels[index].id);
    }
  };

  // Video playback sync for active reel in full-screen swipe mode
  useEffect(() => {
    if (activeSwipeReelIndex !== null && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }, [activeSwipeReelIndex]);

  const activeReel =
    activeSwipeReelIndex !== null ? filteredReels[activeSwipeReelIndex] : null;

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[#050508] text-white select-none">
      {/* 1. HEADER REFINEMENT: 'Search' with glowing cyan Search icon & clean '✕' close */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0 bg-[#050508]/90 backdrop-blur-md z-10 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div
            style={{
              boxShadow: '0 0 14px rgba(6, 182, 212, 0.6), 0 0 24px rgba(6, 182, 212, 0.25)',
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-950/40 border border-cyan-400/80 text-cyan-300"
          >
            <Search
              size={17}
              className="text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.85)]"
              strokeWidth={2.5}
            />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
            Search
          </h1>
        </div>

        <button
          onClick={onClose}
          aria-label="Close search"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:scale-90 text-white/80 hover:text-white transition-all"
        >
          <X size={17} />
        </button>
      </div>

      {/* 2. MODERN SEARCH BAR & CATEGORY FILTER PILLS */}
      <div className="px-4 pt-3 pb-2 shrink-0 bg-[#050508]">
        {/* Search Input */}
        <div className="relative flex items-center rounded-2xl bg-white/[0.07] border border-white/15 px-3.5 py-2.5 backdrop-blur-md focus-within:border-cyan-400 focus-within:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all">
          <Search size={16} className="text-white/40 shrink-0 mr-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search creators, sounds, hashtags..."
            className="w-full bg-transparent text-xs md:text-sm text-white placeholder-white/40 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 rounded-full text-white/50 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Horizontal Scrollable Category Filter Strip */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto no-scrollbar py-1 -mx-4 px-4">
          {CATEGORY_PILLS.map((pill) => {
            const isActive = selectedCategory === pill;
            return (
              <button
                key={pill}
                onClick={() => setSelectedCategory(pill)}
                style={
                  isActive
                    ? {
                        boxShadow: '0 0 12px rgba(6, 182, 212, 0.5)',
                      }
                    : undefined
                }
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 active:scale-95 ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/25 via-blue-500/25 to-purple-600/30 border border-cyan-400 text-cyan-200'
                    : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white'
                }`}
              >
                {pill}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. HIGH-DENSITY 3-COLUMN VIDEO EXPLORE GRID */}
      <div className="flex-1 overflow-y-auto px-3 pt-2 pb-24 no-scrollbar">
        {isLoading && filteredReels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="relative flex h-14 w-14 items-center justify-center mb-3">
              <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 border-r-fuchsia-500 animate-spin shadow-[0_0_20px_rgba(6,182,212,0.5)]" />
              <Sparkles size={18} className="text-cyan-400 animate-pulse" />
            </div>
            <p className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-300">
              SCANNING LIVE REELS...
            </p>
          </div>
        ) : filteredReels.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {filteredReels.map((reel, index) => (
              <motion.div
                key={reel.id}
                onClick={() => handleTileClick(index)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                className="group relative aspect-[9/15] rounded-[12px] overflow-hidden cursor-pointer bg-zinc-900 border border-white/10 shadow-md transition-shadow hover:shadow-[0_0_12px_rgba(6,182,212,0.3)]"
              >
                {/* Video or Poster Thumbnail */}
                {reel.poster ? (
                  <img
                    src={reel.poster}
                    alt={reel.caption}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <video
                    src={reel.videoUrl}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                )}

                {/* Subtle top badge if viral or trending */}
                {reel.badgeText && (
                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs border border-white/15 text-[9px] font-bold text-cyan-300 tracking-wider">
                    {reel.badgeText}
                  </div>
                )}

                {/* Bottom Overlay: Play/Views Count + Creator Handle */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-1.5 md:p-2 pointer-events-none">
                  <div className="flex items-center gap-1 text-[10px] md:text-[11px] font-bold text-white drop-shadow-md">
                    {reel.mediaType === 'image' ? (
                      <Heart size={10} className="fill-white text-white shrink-0" />
                    ) : (
                      <Play size={10} className="fill-white text-white shrink-0" />
                    )}
                    <span>{reel.viewsCount || '0'}</span>
                  </div>
                  <p className="text-[10px] text-white/80 font-medium truncate mt-0.5 drop-shadow-xs">
                    @{reel.username}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* Sleek Cyberpunk Empty State */
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-cyan-500/20 to-fuchsia-500/20 border border-cyan-400/50 text-cyan-300 mb-4 shadow-[0_0_25px_rgba(6,182,212,0.3)]">
              <Search size={26} />
            </div>
            <p className="text-xs md:text-sm font-black uppercase tracking-wider font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-fuchsia-400 max-w-xs leading-relaxed">
              {allReels.length === 0
                ? 'NO REELS BROADCASTING YET. TAP + TO BE THE FIRST CYBER CREATOR.'
                : 'No results found'}
            </p>
            {allReels.length > 0 && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('🔥 Trending');
                }}
                className="mt-4 px-4 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-400/50 text-xs font-medium text-cyan-300 hover:bg-cyan-500/30 transition-all"
              >
                Reset Search
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. FULL-SCREEN VERTICAL SWIPE MODE MODAL */}
      <AnimatePresence>
        {activeSwipeReelIndex !== null && activeReel && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex flex-col bg-black text-white"
          >
            {/* Top Navigation Bar in Full-Screen View */}
            <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-4 pt-5 pb-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
              <button
                onClick={() => setActiveSwipeReelIndex(null)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white hover:bg-black/70 active:scale-95 transition-all text-xs font-semibold"
              >
                <ArrowLeft size={16} />
                <span>Search</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMuted((prev) => !prev)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white active:scale-95 transition-all"
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <button
                  onClick={() => setActiveSwipeReelIndex(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white active:scale-95 transition-all"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* Video Canvas with Tap to Play/Pause & Swipe Up/Down Navigation */}
            <div
              ref={swipeContainerRef}
              onClick={() => {
                if (videoRef.current) {
                  if (isPlaying) {
                    videoRef.current.pause();
                    setIsPlaying(false);
                  } else {
                    videoRef.current.play();
                    setIsPlaying(true);
                  }
                }
              }}
              className="relative flex-1 h-full w-full bg-black flex items-center justify-center overflow-hidden cursor-pointer"
            >
              {activeReel.mediaType === 'image' || (!activeReel.videoUrl && activeReel.poster) ? (
                <img
                  src={activeReel.poster || activeReel.videoUrl}
                  alt={activeReel.caption}
                  className="h-full w-full object-cover"
                />
              ) : (
                <video
                  ref={videoRef}
                  src={activeReel.videoUrl}
                  poster={activeReel.poster}
                  muted={isMuted}
                  loop
                  playsInline
                  autoPlay
                  className="h-full w-full object-cover"
                />
              )}

              {/* Play / Pause Indicator on Tap */}
              {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60 border border-white/20 text-white">
                    <Play size={28} className="fill-white ml-1" />
                  </div>
                </div>
              )}

              {/* Right Action Floating Column */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-3 bottom-24 flex flex-col items-center gap-4 z-50 pointer-events-auto"
              >
                {/* Like Button */}
                <div className="flex flex-col items-center z-50 pointer-events-auto">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextLiked = !activeReel.isLiked;
                      const nextCount = nextLiked
                        ? activeReel.likesCount + 1
                        : Math.max(0, activeReel.likesCount - 1);
                      setCloudReels((prev) =>
                        prev.map((r) =>
                          r.id === activeReel.id
                            ? { ...r, isLiked: nextLiked, likesCount: nextCount }
                            : r
                        )
                      );
                      updateReelLikesInSupabase(activeReel.id, nextCount, nextLiked).catch(() => {});
                    }}
                    className={`flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-md border active:scale-80 transition-all cursor-pointer pointer-events-auto ${
                      activeReel.isLiked
                        ? 'bg-[#ff0055]/20 border-[#ff0055]/60 text-[#ff0055] shadow-[0_0_20px_rgba(255,0,85,0.55)]'
                        : 'bg-black/50 border-white/20 text-white'
                    }`}
                  >
                    <Heart
                      size={22}
                      fill={activeReel.isLiked ? '#ff0055' : 'none'}
                      color={activeReel.isLiked ? '#ff0055' : '#ffffff'}
                      className={
                        activeReel.isLiked
                          ? 'fill-[#ff0055] text-[#ff0055] drop-shadow-[0_0_12px_#ff0055]'
                          : 'text-white fill-transparent'
                      }
                    />
                  </button>
                  <span className="text-[11px] font-bold text-white mt-1 drop-shadow-md">
                    {activeReel.likesCount > 1000
                      ? `${(activeReel.likesCount / 1000).toFixed(1)}k`
                      : activeReel.likesCount}
                  </span>
                </div>

                {/* Comment Button */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => {}}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white active:scale-80 transition-all"
                  >
                    <MessageCircle size={22} />
                  </button>
                  <span className="text-[11px] font-bold text-white mt-1 drop-shadow-md">
                    {activeReel.commentsCount}
                  </span>
                </div>

                {/* Share Button */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => {}}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white active:scale-80 transition-all"
                  >
                    <Share2 size={20} />
                  </button>
                  <span className="text-[11px] font-bold text-white mt-1 drop-shadow-md">
                    {activeReel.sharesCount > 1000
                      ? `${(activeReel.sharesCount / 1000).toFixed(1)}k`
                      : activeReel.sharesCount}
                  </span>
                </div>
              </div>

              {/* Bottom Info Overlay */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-0 inset-x-0 p-4 pb-8 bg-gradient-to-t from-black via-black/60 to-transparent flex flex-col justify-end pointer-events-auto pr-16"
              >
                {/* Creator Header */}
                <div className="flex items-center gap-2 mb-2">
                  <img
                    src={activeReel.avatar}
                    alt={activeReel.displayName}
                    className="h-9 w-9 rounded-full object-cover border border-cyan-400"
                  />
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-white">@{activeReel.username}</span>
                      {activeReel.isVerified && (
                        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-cyan-400 text-black text-[9px] font-bold">
                          ✓
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-white/60">{activeReel.displayName}</span>
                  </div>
                </div>

                {/* Caption */}
                <p className="text-xs text-white/95 line-clamp-2 leading-relaxed">
                  {activeReel.caption}
                </p>

                {/* Audio Track */}
                <div className="flex items-center gap-2 mt-2 text-[11px] text-cyan-300 font-medium">
                  <Music2 size={13} className="animate-spin text-cyan-300" />
                  <span className="truncate">{activeReel.audioTitle}</span>
                  <span className="text-white/40">•</span>
                  <span className="text-white/70">{activeReel.audioArtist}</span>
                </div>
              </div>

              {/* Previous / Next Reel Steppers */}
              {activeSwipeReelIndex > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSwipeReelIndex((prev) => (prev !== null ? prev - 1 : null));
                  }}
                  className="absolute top-20 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-xs font-semibold text-white/80 hover:text-white transition-all active:scale-95"
                >
                  ▲ Previous Reel
                </button>
              )}

              {activeSwipeReelIndex < filteredReels.length - 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSwipeReelIndex((prev) => (prev !== null ? prev + 1 : null));
                  }}
                  className="absolute bottom-28 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-xs font-semibold text-white/80 hover:text-white transition-all active:scale-95"
                >
                  ▼ Next Reel
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
