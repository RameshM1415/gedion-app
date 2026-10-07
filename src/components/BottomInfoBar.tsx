import React, { useState } from 'react';
import { BadgeCheck, Music2, Sparkles } from 'lucide-react';
import { Reel } from '../types';

interface BottomInfoBarProps {
  reel: Reel;
  onOpenComments?: () => void;
  onToggleFollow?: (e: React.MouseEvent) => void;
  onOpenProfile?: (username: string) => void;
}

export const BottomInfoBar: React.FC<BottomInfoBarProps> = ({
  reel,
  onOpenComments,
  onToggleFollow,
  onOpenProfile,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenProfile?.(reel.username);
  };

  return (
    <div className="absolute left-0 bottom-3 z-20 w-[calc(100%-72px)] px-3.5 pb-1.5 pt-1 flex flex-col gap-2 pointer-events-auto select-none">
      {/* Badge (if any, e.g. Trending, Viral) */}
      {reel.badgeText && (
        <div className="flex items-center gap-1.5 w-fit rounded-full bg-white/10 px-2.5 py-0.5 backdrop-blur-md border border-white/15 text-[10px] font-semibold text-white/90">
          <Sparkles size={11} className="text-cyan-400" />
          <span>{reel.badgeText}</span>
          <span className="text-white/40">•</span>
          <span className="text-white/75">{reel.viewsCount} views</span>
        </div>
      )}

      {/* 1. Creator Row: Clickable Avatar, Clickable Username, Verified Badge, and Follow Pill Button */}
      <div className="flex items-center gap-2">
        {/* Creator Avatar - Clickable */}
        <button
          type="button"
          onClick={handleProfileClick}
          aria-label={`View ${reel.displayName || reel.username}'s profile`}
          className="relative p-[1.5px] rounded-full bg-gradient-to-tr from-[#fba73f] via-[#dc2743] to-[#bc1888] shrink-0 cursor-pointer active:scale-90 hover:opacity-90 transition-transform outline-none"
        >
          <img
            src={
              reel.avatar ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${reel.username}&backgroundColor=06b6d4,a855f7`
            }
            alt={reel.displayName || reel.username}
            className="w-8 h-8 rounded-full object-cover border-[1.5px] border-black"
          />
        </button>

        {/* Username - Clickable */}
        <button
          type="button"
          onClick={handleProfileClick}
          aria-label={`View ${reel.username}'s profile`}
          className="font-bold text-sm text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-tight hover:underline cursor-pointer truncate max-w-[140px] text-left active:opacity-75 transition-opacity outline-none"
        >
          {reel.username}
        </button>

        {reel.isVerified && (
          <BadgeCheck size={16} className="fill-[#0095f6] text-black drop-shadow-sm shrink-0" />
        )}

        {/* Sleek Follow Pill Button */}
        {onToggleFollow && (
          <button
            type="button"
            onClick={onToggleFollow}
            className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all active:scale-95 cursor-pointer shadow-md shrink-0 ${
              reel.isFollowing
                ? 'bg-black/60 border border-white/40 text-white/90 hover:bg-black/80'
                : 'bg-white text-black hover:bg-white/90'
            }`}
          >
            {reel.isFollowing ? 'Following' : 'Follow'}
          </button>
        )}
      </div>

      {/* 2. Caption & Hashtags with clean expand/collapse */}
      <div className="text-xs text-white/95 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
        <p className={`leading-relaxed transition-all ${isExpanded ? '' : 'line-clamp-2'}`}>
          {reel.caption}
        </p>

        {/* Hashtags */}
        {reel.tags && reel.tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5 font-medium">
            {reel.tags.map((tag, idx) => (
              <span
                key={idx}
                className="text-cyan-300 hover:text-cyan-200 cursor-pointer transition-colors"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {reel.caption && reel.caption.length > 60 && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-0.5 text-[11px] font-semibold text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            {isExpanded ? 'Show less' : '...more'}
          </button>
        )}
      </div>

      {/* 3. Scrolling Marquee / Audio Track Info */}
      <div className="flex items-center gap-1.5 max-w-[220px] overflow-hidden rounded-full bg-black/40 px-2.5 py-1 backdrop-blur-md border border-white/10 text-[11px]">
        <Music2 size={12} className="text-cyan-400 shrink-0 animate-pulse" />
        <div className="relative overflow-hidden whitespace-nowrap font-medium text-white/90">
          <div className="inline-block animate-marquee">
            <span>{reel.audioTitle || 'Original Audio'} • {reel.audioArtist || reel.displayName}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
            <span>{reel.audioTitle || 'Original Audio'} • {reel.audioArtist || reel.displayName}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
          </div>
        </div>
      </div>
    </div>
  );
};
