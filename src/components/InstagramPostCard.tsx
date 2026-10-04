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
  Repeat,
  Music,
} from 'lucide-react';
import { Reel } from '../types';
import { AuthUser } from '../utils/authStorage';
import { useTheme } from '../context/ThemeContext';

export interface InstagramPostCardProps {
  reel: Reel;
  currentUser?: AuthUser | null;
  isMuted: boolean;
  onToggleMute: () => void;
  onToggleLike: (reelId: string) => void;
  onToggleBookmark: (reelId: string) => void;
  onOpenComments: (reelId: string) => void;
  onOpenShare: (reelId: string) => void;
  onOpenOptions: (reel: Reel) => void;
  onShowToast?: (message: string) => void;
}

export const InstagramPostCard: React.FC<InstagramPostCardProps> = ({
  reel,
  currentUser,
  isMuted,
  onToggleMute,
  onToggleLike,
  onToggleBookmark,
  onOpenComments,
  onOpenShare,
  onOpenOptions,
  onShowToast,
}) => {
  const { isDark } = useTheme();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Local optimistic state
  const [isLiked, setIsLiked] = useState(reel.isLiked);
  const [likesCount, setLikesCount] = useState(reel.likesCount || 0);
  const [isBookmarked, setIsBookmarked] = useState(reel.isBookmarked);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [isReposted, setIsReposted] = useState(false);
  const lastTapRef = useRef<number>(0);

  // Keep in sync with prop updates
  useEffect(() => {
    setIsLiked(reel.isLiked);
    setLikesCount(reel.likesCount || 0);
  }, [reel.isLiked, reel.likesCount]);

  useEffect(() => {
    setIsBookmarked(reel.isBookmarked);
  }, [reel.isBookmarked]);

  const handleLike = () => {
    const nextState = !isLiked;
    setIsLiked(nextState);
    setLikesCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));
    onToggleLike(reel.id);
  };

  const handleDoubleTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      // Double tap detected
      if (!isLiked) {
        setIsLiked(true);
        setLikesCount((prev) => prev + 1);
        onToggleLike(reel.id);
      }
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 900);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  const handleBookmark = () => {
    const next = !isBookmarked;
    setIsBookmarked(next);
    onToggleBookmark(reel.id);
    if (onShowToast) {
      onShowToast(next ? 'Saved to bookmarks' : 'Removed from bookmarks');
    }
  };

  const handleRepost = () => {
    setIsReposted((prev) => !prev);
    if (onShowToast) {
      onShowToast(!isReposted ? 'Reposted to your feed 🔄' : 'Repost removed');
    }
  };

  const isVideo = reel.mediaType === 'video' || (!reel.mediaType && Boolean(reel.videoUrl));

  // Determine media URL
  const mediaUrl = reel.videoUrl || reel.poster;

  return (
    <article
      className={`w-full flex flex-col border-b select-none transition-colors ${
        isDark ? 'bg-black border-[#262626] text-white' : 'bg-white border-[#efefef] text-black'
      }`}
    >
      {/* 1. AUTHOR ROW: Circular profile photo, @username, audio tag, and 3-dots (•••) option menu */}
      <div className="flex items-center justify-between px-3.5 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Avatar with subtle IG ring */}
          <div className="relative p-[1.5px] rounded-full bg-gradient-to-tr from-[#fba73f] via-[#dc2743] to-[#bc1888] shrink-0">
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
          </div>

          {/* User details & Audio tag */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-tight truncate cursor-pointer hover:underline">
                {reel.username}
              </span>
              {reel.isVerified && (
                <span className="text-[#0095f6] text-[10px] font-black">●</span>
              )}
            </div>
            {(reel.audioTitle || reel.audioArtist) && (
              <div className="flex items-center gap-1 text-[11px] text-zinc-500 truncate mt-0.5">
                <Music size={10} className="shrink-0" />
                <span className="truncate max-w-[190px]">
                  {reel.audioTitle || 'Original Audio'} • {reel.audioArtist || reel.displayName}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 3-dots (•••) option menu button */}
        <button
          type="button"
          onClick={() => onOpenOptions(reel)}
          aria-label="More options"
          className={`p-1.5 rounded-full transition-transform active:scale-90 hover:opacity-75 ${
            isDark ? 'text-zinc-300' : 'text-zinc-700'
          }`}
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* 2. MEDIA CONTAINER: Responsive aspect ratio (1:1 / 4:5 / 9:16) with audio toggle tap */}
      <div
        onClick={handleDoubleTap}
        className="relative w-full aspect-[4/5] bg-zinc-950 flex items-center justify-center overflow-hidden cursor-pointer"
      >
        {isVideo && reel.videoUrl ? (
          <video
            ref={videoRef}
            src={reel.videoUrl}
            poster={reel.poster}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={mediaUrl}
            alt={reel.caption || 'Instagram Post'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}

        {/* Audio Mute/Unmute toggle pill at bottom right */}
        {isVideo && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
            aria-label={isMuted ? 'Unmute video' : 'Mute video'}
            className="absolute bottom-3 right-3 p-1.5 rounded-full bg-black/65 text-white/90 backdrop-blur-md hover:bg-black/85 transition-colors z-10"
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        )}

        {/* Heart Burst Animation on Double Tap */}
        <AnimatePresence>
          {showHeartBurst && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.25, 1], opacity: [0, 1, 0.95] }}
              exit={{ scale: 1.4, opacity: 0 }}
              transition={{ duration: 0.65, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-0 flex items-center justify-center z-20"
            >
              <Heart size={88} className="fill-rose-500 text-rose-500 drop-shadow-xl" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. ACTION BAR DIRECTLY BELOW MEDIA */}
      <div className="flex items-center justify-between px-3.5 pt-2.5 pb-1">
        {/* Left: Heart, Comment bubble, Share paper plane, Repost icon */}
        <div className="flex items-center gap-4">
          {/* Like */}
          <button
            type="button"
            onClick={handleLike}
            aria-label={isLiked ? 'Unlike' : 'Like'}
            className="transition-transform active:scale-75 cursor-pointer"
          >
            <Heart
              size={24}
              strokeWidth={1.8}
              className={`transition-colors ${
                isLiked ? 'fill-rose-500 text-rose-500 scale-105' : isDark ? 'text-white' : 'text-black'
              }`}
            />
          </button>

          {/* Comment */}
          <button
            type="button"
            onClick={() => onOpenComments(reel.id)}
            aria-label="Comments"
            className={`transition-transform active:scale-75 cursor-pointer ${
              isDark ? 'text-white' : 'text-black'
            }`}
          >
            <MessageCircle size={24} strokeWidth={1.8} />
          </button>

          {/* Share */}
          <button
            type="button"
            onClick={() => onOpenShare(reel.id)}
            aria-label="Share"
            className={`transition-transform active:scale-75 cursor-pointer ${
              isDark ? 'text-white' : 'text-black'
            }`}
          >
            <Send size={22} strokeWidth={1.8} className="-rotate-12 translate-y-[-1px]" />
          </button>

          {/* Repost */}
          <button
            type="button"
            onClick={handleRepost}
            aria-label="Repost"
            className={`transition-transform active:scale-75 cursor-pointer ${
              isReposted ? 'text-emerald-500' : isDark ? 'text-white' : 'text-black'
            }`}
          >
            <Repeat size={21} strokeWidth={1.8} />
          </button>
        </div>

        {/* Right: Bookmark / Save icon */}
        <button
          type="button"
          onClick={handleBookmark}
          aria-label={isBookmarked ? 'Unsave' : 'Save'}
          className="transition-transform active:scale-75 cursor-pointer"
        >
          <Bookmark
            size={23}
            strokeWidth={1.8}
            className={`${
              isBookmarked ? 'fill-current' : ''
            } ${isDark ? 'text-white' : 'text-black'}`}
          />
        </button>
      </div>

      {/* 4. ENGAGEMENT SECTION: "Liked by X and others", bold username with caption, and comments trigger */}
      <div className="px-3.5 pb-3 space-y-1 text-xs">
        {/* Likes Count */}
        <div className="font-normal tracking-tight text-[13px]">
          {likesCount > 0 ? (
            <span>
              Liked by <span className="font-bold cursor-pointer">{reel.displayName || 'ankur_codes'}</span> and{' '}
              <span className="font-bold cursor-pointer">
                {likesCount > 1
                  ? `${(likesCount - 1).toLocaleString()} others`
                  : 'others'}
              </span>
            </span>
          ) : (
            <span className="text-zinc-500 font-normal">Be the first to like this</span>
          )}
        </div>

        {/* Caption */}
        {reel.caption && (
          <p className="leading-snug">
            <span className="font-bold mr-1.5 cursor-pointer">{reel.username}</span>
            <span className={isDark ? 'text-zinc-200' : 'text-zinc-800'}>
              {reel.caption}
            </span>
          </p>
        )}

        {/* View all comments trigger */}
        <button
          type="button"
          onClick={() => onOpenComments(reel.id)}
          className={`block text-[11.5px] mt-0.5 cursor-pointer hover:underline ${
            isDark ? 'text-zinc-400' : 'text-zinc-500'
          }`}
        >
          {reel.commentsCount && reel.commentsCount > 0
            ? `View all ${reel.commentsCount} comments`
            : 'Add a comment...'}
        </button>

        {/* Relative Timestamp */}
        <p className="text-[10px] uppercase tracking-wider text-zinc-500 pt-0.5 font-medium">
          2 hours ago
        </p>
      </div>
    </article>
  );
};
