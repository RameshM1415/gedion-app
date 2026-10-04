import React from 'react';
import { Heart, MessageCircle, Bookmark, Share2, Plus, Check, Disc3, MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import { Reel } from '../types';
import { formatCount } from '../utils/formatters';

interface RightActionBarProps {
  reel: Reel;
  isPlaying: boolean;
  onToggleLike: (e: React.MouseEvent) => void;
  onToggleBookmark: (e: React.MouseEvent) => void;
  onToggleFollow: (e: React.MouseEvent) => void;
  onOpenComments: () => void;
  onOpenShare: () => void;
  onOpenReport?: () => void;
  onOpenOptions?: () => void;
}

export const RightActionBar: React.FC<RightActionBarProps> = ({
  reel,
  isPlaying,
  onToggleLike,
  onToggleBookmark,
  onToggleFollow,
  onOpenComments,
  onOpenShare,
  onOpenReport,
  onOpenOptions,
}) => {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className="absolute right-3 bottom-20 z-50 pointer-events-auto flex flex-col items-center gap-4 pb-2"
    >
      {/* Creator Avatar with Follow Badge */}
      <div className="relative mb-2 flex flex-col items-center pointer-events-auto">
        <motion.div
          whileTap={{ scale: 0.9 }}
          className="relative h-12 w-12 rounded-full p-[2px] bg-gradient-to-tr from-[#fba73f] via-[#dc2743] to-[#bc1888]"
        >
          <img
            src={reel.avatar}
            alt={reel.displayName}
            className="h-full w-full rounded-full object-cover border-2 border-black"
          />
        </motion.div>

        {/* Plus / Follow Toggle button with Quick Pop Animation */}
        <motion.button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFollow(e);
          }}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.75 }}
          key={reel.isFollowing ? 'following' : 'not-following'}
          animate={{ scale: [0.6, 1.35, 0.9, 1] }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
          aria-label={reel.isFollowing ? 'Following creator' : 'Follow creator'}
          className={`absolute -bottom-2 z-50 pointer-events-auto cursor-pointer flex h-5 w-5 items-center justify-center rounded-full transition-all duration-300 shadow-md ${
            reel.isFollowing
              ? 'bg-[#0095f6] text-white border-2 border-black'
              : 'bg-[#0095f6] text-white'
          }`}
        >
          {reel.isFollowing ? (
            <span className="text-[11px] font-black leading-none text-white select-none">✓</span>
          ) : (
            <Plus size={13} strokeWidth={3.5} />
          )}
        </motion.button>
      </div>

      {/* Dil (Heart) Like Button */}
      <div className="relative z-50 pointer-events-auto flex flex-col items-center">
        <motion.button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleLike(e);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          whileTap={{ scale: 0.78 }}
          whileHover={{ scale: 1.1 }}
          aria-label={reel.isLiked ? 'Unlike video' : 'Like video'}
          aria-pressed={reel.isLiked}
          className={`group relative z-50 pointer-events-auto cursor-pointer flex h-12 w-12 items-center justify-center rounded-full backdrop-blur-md border transition-all duration-200 ${
            reel.isLiked
              ? 'bg-rose-500/20 border-rose-500/50'
              : 'bg-black/35 border-white/15 hover:bg-black/55'
          }`}
        >
          <motion.div
            key={reel.isLiked ? 'liked' : 'unliked'}
            animate={reel.isLiked ? { scale: [1, 1.45, 0.9, 1.15, 1] } : { scale: [1, 0.88, 1] }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
            className="pointer-events-none flex items-center justify-center"
          >
            <Heart
              size={26}
              fill={reel.isLiked ? '#ff3040' : 'none'}
              color={reel.isLiked ? '#ff3040' : '#ffffff'}
              strokeWidth={reel.isLiked ? 2.5 : 2}
              className={`pointer-events-none transition-all duration-200 ${
                reel.isLiked
                  ? 'fill-[#ff3040] text-[#ff3040]'
                  : 'fill-transparent text-white group-hover:text-white'
              }`}
            />
          </motion.div>
        </motion.button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleLike(e);
          }}
          className={`mt-1 text-xs font-bold tracking-tight cursor-pointer pointer-events-auto transition-colors drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] ${
            reel.isLiked ? 'text-[#ff3040]' : 'text-white/95'
          }`}
        >
          {formatCount(reel.likesCount)}
        </button>
      </div>

      {/* Comment Button */}
      <div className="flex flex-col items-center">
        <motion.button
          onClick={onOpenComments}
          whileTap={{ scale: 0.85 }}
          whileHover={{ scale: 1.1 }}
          aria-label="Open comments"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-black/35 backdrop-blur-md border border-white/10 transition-colors hover:bg-black/50"
        >
          <MessageCircle size={25} className="text-white/90" strokeWidth={2} />
        </motion.button>
        <span className="mt-1 text-xs font-semibold tracking-tight text-white/95 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          {formatCount(reel.commentsCount)}
        </span>
      </div>

      {/* Bookmark Button */}
      <div className="flex flex-col items-center">
        <motion.button
          onClick={onToggleBookmark}
          whileTap={{ scale: 0.8 }}
          whileHover={{ scale: 1.1 }}
          aria-label="Bookmark video"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-black/35 backdrop-blur-md border border-white/10 transition-colors hover:bg-black/50"
        >
          <motion.div
            animate={reel.isBookmarked ? { rotate: [0, -15, 15, 0], scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <Bookmark
              size={24}
              className={`transition-all duration-300 ${
                reel.isBookmarked
                  ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]'
                  : 'text-white/90'
              }`}
              strokeWidth={reel.isBookmarked ? 2.5 : 2}
            />
          </motion.div>
        </motion.button>
        <span className="mt-1 text-xs font-semibold tracking-tight text-white/95 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          Save
        </span>
      </div>

      {/* Share Button */}
      <div className="flex flex-col items-center">
        <motion.button
          onClick={onOpenShare}
          whileTap={{ scale: 0.85 }}
          whileHover={{ scale: 1.1 }}
          aria-label="Share video"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-black/35 backdrop-blur-md border border-white/10 transition-colors hover:bg-black/50"
        >
          <Share2 size={24} className="text-white/90 ml-0.5" strokeWidth={2} />
        </motion.button>
        <span className="mt-1 text-xs font-semibold tracking-tight text-white/95 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          {formatCount(reel.sharesCount)}
        </span>
      </div>

      {/* Subtle 3-Dots Reel Action Menu Button */}
      {(onOpenOptions || onOpenReport) && (
        <div className="flex flex-col items-center">
          <motion.button
            onClick={() => {
              if (onOpenOptions) {
                onOpenOptions();
              } else if (onOpenReport) {
                onOpenReport();
              }
            }}
            whileTap={{ scale: 0.8 }}
            whileHover={{ scale: 1.1 }}
            aria-label="Reel options"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white/70 hover:text-white hover:border-white/30 transition-colors"
          >
            <MoreVertical size={18} />
          </motion.button>
        </div>
      )}

      {/* Spinning Vinyl Disc & Equalizer Waves */}
      <div className="relative mt-2 flex flex-col items-center">
        {/* Equalizer animation waves */}
        {isPlaying && (
          <div className="absolute -top-4 flex items-end justify-center gap-[3px] h-4">
            <span className="w-[3px] rounded-full bg-white animate-bar-1" />
            <span className="w-[3px] rounded-full bg-white/80 animate-bar-2" />
            <span className="w-[3px] rounded-full bg-white/60 animate-bar-3" />
          </div>
        )}

        <motion.div
          animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
          transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
          className="relative flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-stone-900 via-stone-800 to-black p-1 shadow-[0_0_15px_rgba(0,0,0,0.8)] border border-white/20"
        >
          <div className="flex h-full w-full items-center justify-center rounded-full bg-stone-950 overflow-hidden relative">
            {/* Vinyl record grooves */}
            <div className="absolute inset-1 rounded-full border border-white/10" />
            <div className="absolute inset-2 rounded-full border border-white/10" />
            <img
              src={reel.poster}
              alt="Track Artwork"
              className="h-5 w-5 rounded-full object-cover"
            />
            {/* Center spindle hole */}
            <div className="absolute h-1.5 w-1.5 rounded-full bg-white shadow-sm" />
          </div>
        </motion.div>
      </div>
    </div>
  );
};
