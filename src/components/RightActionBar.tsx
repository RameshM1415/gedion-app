import React from 'react';
import {
  Heart,
  MessageCircle,
  Bookmark,
  Send,
  Plus,
  MoreVertical,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Reel } from '../types';
import { formatCount } from '../utils/formatters';

interface RightActionBarProps {
  reel: Reel;
  isPlaying: boolean;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onToggleLike: (e: React.MouseEvent) => void;
  onToggleBookmark: (e: React.MouseEvent) => void;
  onToggleFollow: (e: React.MouseEvent) => void;
  onOpenComments: () => void;
  onOpenShare: () => void;
  onOpenReport?: () => void;
  onOpenOptions?: () => void;
  onOpenLikesSheet?: () => void;
}

export const RightActionBar: React.FC<RightActionBarProps> = ({
  reel,
  isPlaying,
  isMuted = false,
  onToggleMute,
  onToggleLike,
  onToggleBookmark,
  onToggleFollow,
  onOpenComments,
  onOpenShare,
  onOpenReport,
  onOpenOptions,
  onOpenLikesSheet,
}) => {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className="absolute right-2.5 bottom-16 z-50 pointer-events-auto flex flex-col items-center gap-3 pb-1"
    >
      {/* 1. Like (Heart) Button */}
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
          className="group relative z-50 pointer-events-auto cursor-pointer flex h-9 w-9 items-center justify-center bg-transparent border-0 outline-none transition-transform"
        >
          <motion.div
            key={reel.isLiked ? 'liked' : 'unliked'}
            animate={reel.isLiked ? { scale: [1, 1.35, 0.95, 1.12, 1] } : { scale: [1, 0.88, 1] }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="pointer-events-none flex items-center justify-center"
          >
            <Heart
              size={26}
              fill={reel.isLiked ? '#EF4444' : 'none'}
              color={reel.isLiked ? '#EF4444' : '#ffffff'}
              strokeWidth={2}
              className={`pointer-events-none transition-colors duration-150 drop-shadow-[0_2px_4px_rgba(0,0,0,0.65)] ${
                reel.isLiked
                  ? 'fill-[#EF4444] text-[#EF4444]'
                  : 'fill-transparent text-white group-hover:text-white'
              }`}
            />
          </motion.div>
        </motion.button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenLikesSheet?.();
          }}
          title="View likes and plays"
          aria-label="View likes and plays"
          className={`mt-0.5 text-[11px] font-bold tracking-tight cursor-pointer pointer-events-auto transition-colors drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] hover:underline active:scale-95 ${
            reel.isLiked ? 'text-[#EF4444]' : 'text-white/95'
          }`}
        >
          {formatCount(reel.likesCount)}
        </button>
      </div>

      {/* 2. Comment Button */}
      <div className="flex flex-col items-center">
        <motion.button
          onClick={onOpenComments}
          whileTap={{ scale: 0.8 }}
          whileHover={{ scale: 1.1 }}
          aria-label="Open comments"
          className="flex h-9 w-9 items-center justify-center bg-transparent border-0 outline-none cursor-pointer transition-transform"
        >
          <MessageCircle size={25} className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.65)]" strokeWidth={2} />
        </motion.button>
        <span className="mt-0.5 text-[11px] font-semibold tracking-tight text-white/95 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          {formatCount(reel.commentsCount)}
        </span>
      </div>

      {/* 3. Share Button (Paper Plane Send Icon) */}
      <div className="flex flex-col items-center">
        <motion.button
          onClick={onOpenShare}
          whileTap={{ scale: 0.8 }}
          whileHover={{ scale: 1.1 }}
          aria-label="Share video"
          className="flex h-9 w-9 items-center justify-center bg-transparent border-0 outline-none cursor-pointer transition-transform"
        >
          <Send size={24} className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.65)] -rotate-12 translate-x-0.5" strokeWidth={2} />
        </motion.button>
        <span className="mt-0.5 text-[11px] font-semibold tracking-tight text-white/95 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          {formatCount(reel.sharesCount)}
        </span>
      </div>

      {/* 4. Bookmark (Save) Button */}
      <div className="flex flex-col items-center">
        <motion.button
          onClick={onToggleBookmark}
          whileTap={{ scale: 0.8 }}
          whileHover={{ scale: 1.1 }}
          aria-label="Bookmark video"
          className="flex h-9 w-9 items-center justify-center bg-transparent border-0 outline-none cursor-pointer transition-transform"
        >
          <motion.div
            animate={reel.isBookmarked ? { rotate: [0, -15, 15, 0], scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <Bookmark
              size={24}
              className={`transition-all duration-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.65)] ${
                reel.isBookmarked
                  ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]'
                  : 'text-white'
              }`}
              strokeWidth={reel.isBookmarked ? 2.5 : 2}
            />
          </motion.div>
        </motion.button>
        <span className="mt-0.5 text-[11px] font-semibold tracking-tight text-white/95 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          Save
        </span>
      </div>

      {/* 5. Sound / Mute Toggle Button */}
      {onToggleMute && (
        <div className="flex flex-col items-center">
          <motion.button
            onClick={onToggleMute}
            whileTap={{ scale: 0.8 }}
            whileHover={{ scale: 1.1 }}
            aria-label={isMuted ? 'Unmute video' : 'Mute video'}
            className="flex h-9 w-9 items-center justify-center bg-transparent border-0 outline-none cursor-pointer transition-transform"
          >
            {isMuted ? (
              <VolumeX size={23} className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.65)]" strokeWidth={2} />
            ) : (
              <Volume2 size={23} className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.65)]" strokeWidth={2} />
            )}
          </motion.button>
        </div>
      )}

      {/* 6. Subtle 3-Dots Reel Action Menu Button */}
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
            className="flex h-8 w-8 items-center justify-center bg-transparent border-0 outline-none text-white/90 hover:text-white cursor-pointer transition-transform"
          >
            <MoreVertical size={18} className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.65)]" />
          </motion.button>
        </div>
      )}
    </div>
  );
};
