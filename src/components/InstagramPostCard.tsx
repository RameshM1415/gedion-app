import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Volume2,
  VolumeX,
  Music,
  MapPin,
  Film,
} from 'lucide-react';
import { Reel } from '../types';
import { AuthUser } from '../utils/authStorage';
import { useTheme } from '../context/ThemeContext';

export interface InstagramPostCardProps {
  reel: Reel;
  currentUser?: AuthUser | null;
  isActive?: boolean;
  isSoundOn?: boolean;
  onToggleSound?: () => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onToggleLike: (reelId: string) => void;
  onToggleBookmark: (reelId: string) => void;
  onOpenComments: (reelId: string) => void;
  onOpenShare: (reelId: string) => void;
  onOpenOptions: (reel: Reel) => void;
  onOpenReels?: (reelId: string) => void;
  onOpenProfile?: (username: string) => void;
  onShowToast?: (message: string) => void;
}

export const InstagramPostCard: React.FC<InstagramPostCardProps> = ({
  reel,
  currentUser,
  isActive = true,
  isSoundOn,
  onToggleSound,
  isMuted = false,
  onToggleMute,
  onToggleLike,
  onToggleBookmark,
  onOpenComments,
  onOpenShare,
  onOpenOptions,
  onOpenReels,
  onOpenProfile,
  onShowToast,
}) => {
  const { isDark } = useTheme();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Local optimistic state
  const [isLiked, setIsLiked] = useState(Boolean(reel.isLiked));
  const [likesCount, setLikesCount] = useState<number>(
    typeof reel.likesCount === 'number' ? reel.likesCount : 0
  );
  const [isBookmarked, setIsBookmarked] = useState(Boolean(reel.isBookmarked));
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const lastTapRef = useRef<number>(0);

  // Determine effective sound: ONLY active video can play sound
  const effectiveSound = Boolean(isActive && (isSoundOn !== undefined ? isSoundOn : !isMuted));

  // Sync video playback: Pause when inactive or scrolled away; single active audio only
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.muted = !effectiveSound;
      video.play().catch(() => {});
    } else {
      video.muted = true;
      video.pause();
    }
  }, [isActive, effectiveSound]);

  // Clean pause on unmount or card replacement
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        try {
          videoRef.current.pause();
        } catch {}
      }
    };
  }, []);

  // Keep in sync with parent props
  useEffect(() => {
    setIsLiked(Boolean(reel.isLiked));
    setLikesCount(typeof reel.likesCount === 'number' ? reel.likesCount : 0);
  }, [reel.isLiked, reel.likesCount]);

  useEffect(() => {
    setIsBookmarked(Boolean(reel.isBookmarked));
  }, [reel.isBookmarked]);

  // Working Like toggle with instant optimistic UI + Supabase sync
  const handleLike = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    const nextCount = nextLiked ? likesCount + 1 : Math.max(0, likesCount - 1);
    setLikesCount(nextCount);
    onToggleLike(reel.id);
  };

  // Single-tap timer to distinguish between single tap (open full reels) and double-tap (like heart)
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
      }
    };
  }, []);

  // Media Click handler: single tap opens full screen Reels viewer, double tap likes
  const handleMediaClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    const DOUBLE_TAP_THRESHOLD = 280;

    if (now - lastTapRef.current < DOUBLE_TAP_THRESHOLD) {
      // DOUBLE TAP -> Cancel single tap timer & trigger Heart like!
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      lastTapRef.current = 0;

      if (!isLiked) {
        setIsLiked(true);
        const nextCount = likesCount + 1;
        setLikesCount(nextCount);
        onToggleLike(reel.id);
      }
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 700);
    } else {
      // Single tap: set timer
      lastTapRef.current = now;
      if (isVideo && onOpenReels) {
        singleTapTimerRef.current = setTimeout(() => {
          onOpenReels(reel.id);
          singleTapTimerRef.current = null;
        }, DOUBLE_TAP_THRESHOLD);
      }
    }
  };

  const handleBookmark = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const next = !isBookmarked;
    setIsBookmarked(next);
    onToggleBookmark(reel.id);
    if (onShowToast) {
      onShowToast(next ? 'Saved to bookmarks' : 'Removed from bookmarks');
    }
  };

  const handleSpeakerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleSound) {
      onToggleSound();
    } else if (onToggleMute) {
      onToggleMute();
    }
  };

  const isVideo = reel.mediaType === 'video' || (!reel.mediaType && Boolean(reel.videoUrl));
  const mediaUrl = reel.videoUrl || reel.poster;

  return (
    <article
      className={`w-full flex flex-col border-b select-none transition-colors ${
        isDark ? 'bg-black border-[#262626] text-white' : 'bg-white border-[#efefef] text-black'
      }`}
    >
      {/* 1. POST HEADER: User Avatar, Username, location / audio, and 3-dots menu button */}
      <div className="flex items-center justify-between px-3.5 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Avatar with subtle signature Instagram gradient ring */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenProfile?.(reel.username);
            }}
            aria-label={`View ${reel.displayName || reel.username}'s profile`}
            className="relative p-[1.5px] rounded-full bg-gradient-to-tr from-[#fba73f] via-[#dc2743] to-[#bc1888] shrink-0 cursor-pointer active:scale-90 hover:opacity-90 transition-transform outline-none"
          >
            <div className={`p-[1px] rounded-full ${isDark ? 'bg-black' : 'bg-white'}`}>
              <img
                src={
                  reel.avatar ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${reel.username}&backgroundColor=06b6d4,a855f7`
                }
                alt={reel.displayName || reel.username}
                className="w-8 h-8 rounded-full object-cover"
                loading="lazy"
              />
            </div>
          </button>

          {/* User details */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenProfile?.(reel.username);
                }}
                className="text-xs font-bold tracking-tight truncate cursor-pointer hover:underline text-left active:opacity-75 transition-opacity outline-none"
              >
                {reel.username}
              </button>
              {reel.isVerified && (
                <span className="text-[#0095f6] text-[10px] font-black">●</span>
              )}
            </div>

            {/* Optional Location or Audio tagline */}
            {reel.location ? (
              <div className="flex items-center gap-1 text-[11px] text-zinc-500 truncate mt-0.5">
                <MapPin size={10} className="shrink-0" />
                <span className="truncate">{reel.location}</span>
              </div>
            ) : (reel.audioTitle || reel.audioArtist) ? (
              <div className="flex items-center gap-1 text-[11px] text-zinc-500 truncate mt-0.5">
                <Music size={10} className="shrink-0" />
                <span className="truncate max-w-[190px]">
                  {reel.audioTitle || 'Original Audio'} • {reel.audioArtist || reel.displayName}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* 3-dots (•••) option menu button */}
        <button
          type="button"
          onClick={() => onOpenOptions(reel)}
          aria-label="More options"
          className={`p-1.5 rounded-full transition-transform active:scale-90 hover:opacity-75 cursor-pointer ${
            isDark ? 'text-zinc-300' : 'text-zinc-700'
          }`}
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* 2. MEDIA SECTION: Full-width responsive photo/video with pure dark loading state */}
      <div
        onClick={handleMediaClick}
        className="relative w-full aspect-[4/5] bg-[#000000] flex items-center justify-center overflow-hidden cursor-pointer select-none group"
      >
        {/* Pure solid dark #000000 / #0a0a0a loading skeleton - Zero blue flash */}
        {!mediaLoaded && (
          <div className="absolute inset-0 bg-[#0a0a0a] flex items-center justify-center z-0 overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
            <div className="w-9 h-9 rounded-full border border-zinc-800 bg-zinc-900/60 flex items-center justify-center shadow-lg">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-zinc-600 border-t-transparent animate-spin" />
            </div>
          </div>
        )}

        {/* Top-Right Reels Pill Badge (Instagram style indicator on videos) */}
        {isVideo && onOpenReels && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenReels(reel.id);
            }}
            aria-label="Open full-screen reel"
            className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold shadow-lg hover:bg-black/85 active:scale-95 transition-all cursor-pointer"
          >
            <Film size={12} className="text-white" />
            <span>Reels</span>
          </button>
        )}

        {isVideo && reel.videoUrl ? (
          <video
            ref={videoRef}
            src={reel.videoUrl}
            poster={reel.poster}
            loop
            muted={!effectiveSound}
            playsInline
            onLoadedData={() => setMediaLoaded(true)}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              mediaLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ) : (
          <img
            src={mediaUrl}
            alt={reel.caption || 'Instagram Post'}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              mediaLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setMediaLoaded(true)}
            loading="lazy"
          />
        )}

        {/* Audio Mute/Unmute speaker toggle pill at bottom right */}
        {isVideo && (
          <button
            type="button"
            onClick={handleSpeakerClick}
            aria-label={effectiveSound ? 'Mute video' : 'Unmute video'}
            className="absolute bottom-3 right-3 p-1.5 rounded-full bg-black/65 text-white/90 backdrop-blur-md hover:bg-black/85 transition-colors z-10 cursor-pointer"
          >
            {effectiveSound ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
        )}

        {/* Refined Double-Tap Compact Red Heart Pop Animation (Solid Red #EF4444, white outline, 66px, 700ms) */}
        <AnimatePresence>
          {showHeartBurst && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.12, 1.0], opacity: [0, 1, 1] }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{
                duration: 0.68,
                times: [0, 0.4, 0.65],
                ease: 'easeOut',
              }}
              className="pointer-events-none absolute inset-0 flex items-center justify-center z-30 select-none"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-16 h-16 sm:w-[68px] sm:h-[68px] drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)] select-none pointer-events-none"
              >
                <path
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                  fill="#EF4444"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. ACTION BAR DIRECTLY BELOW MEDIA */}
      <div className="flex items-center justify-between px-3.5 pt-2.5 pb-1">
        {/* Left Side: Heart (Like), Speech Bubble (Comment), Paper Plane / Share */}
        <div className="flex items-center gap-4">
          {/* Like Button */}
          <button
            type="button"
            onClick={handleLike}
            aria-label={isLiked ? 'Unlike' : 'Like'}
            className="transition-transform active:scale-75 cursor-pointer"
          >
            <Heart
              size={24}
              strokeWidth={1.9}
              className={`transition-colors ${
                isLiked
                  ? 'fill-[#EF4444] text-[#EF4444] scale-105'
                  : isDark
                  ? 'text-white hover:text-zinc-300'
                  : 'text-black hover:text-zinc-600'
              }`}
            />
          </button>

          {/* Comment Button (Speech Bubble) */}
          <button
            type="button"
            onClick={() => onOpenComments(reel.id)}
            aria-label="Comments"
            className={`transition-transform active:scale-75 cursor-pointer ${
              isDark ? 'text-white hover:text-zinc-300' : 'text-black hover:text-zinc-600'
            }`}
          >
            <MessageCircle size={24} strokeWidth={1.9} />
          </button>

          {/* Share Button (Paper Plane) */}
          <button
            type="button"
            onClick={() => onOpenShare(reel.id)}
            aria-label="Share"
            className={`transition-transform active:scale-75 cursor-pointer ${
              isDark ? 'text-white hover:text-zinc-300' : 'text-black hover:text-zinc-600'
            }`}
          >
            <Send size={22} strokeWidth={1.9} className="-rotate-12 translate-y-[-1px]" />
          </button>
        </div>

        {/* Right Side: Bookmark / Save icon */}
        <button
          type="button"
          onClick={handleBookmark}
          aria-label={isBookmarked ? 'Unsave' : 'Save'}
          className="transition-transform active:scale-75 cursor-pointer"
        >
          <Bookmark
            size={23}
            strokeWidth={1.9}
            className={`${
              isBookmarked ? 'fill-current' : ''
            } ${isDark ? 'text-white' : 'text-black'}`}
          />
        </button>
      </div>

      {/* 4. REAL-TIME COUNTS & DETAILS SECTION */}
      <div className="px-3.5 pb-3 space-y-1 text-xs">
        {/* Prominent Real-time Like Count */}
        <div className="font-bold tracking-tight text-[13px] pt-0.5">
          {likesCount > 0 ? (
            <span>
              {likesCount.toLocaleString()} {likesCount === 1 ? 'like' : 'likes'}
            </span>
          ) : (
            <span className="font-normal text-zinc-500">Be the first to like this</span>
          )}
        </div>

        {/* Post Caption with Bold Username */}
        {reel.caption && (
          <p className="leading-snug pt-0.5">
            <span className="font-bold mr-1.5 cursor-pointer hover:underline">{reel.username}</span>
            <span className={isDark ? 'text-zinc-200' : 'text-zinc-800'}>
              {reel.caption}
            </span>
          </p>
        )}

        {/* View all comments link */}
        <button
          type="button"
          onClick={() => onOpenComments(reel.id)}
          className={`block text-[11.5px] pt-0.5 cursor-pointer hover:underline ${
            isDark ? 'text-zinc-400' : 'text-zinc-500'
          }`}
        >
          {reel.commentsCount && reel.commentsCount > 0
            ? `View all ${reel.commentsCount} comments`
            : 'Add a comment...'}
        </button>

        {/* Timestamp */}
        <p className="text-[10px] uppercase tracking-wider text-zinc-500 pt-0.5 font-medium">
          {reel.timestamp || '2 hours ago'}
        </p>
      </div>
    </article>
  );
};
