import React, { useState } from 'react';
import { BadgeCheck, Music2, Sparkles } from 'lucide-react';
import { Reel } from '../types';

interface BottomInfoBarProps {
  reel: Reel;
}

export const BottomInfoBar: React.FC<BottomInfoBarProps> = ({ reel }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="absolute left-0 bottom-16 z-20 w-[calc(100%-80px)] p-4 flex flex-col gap-2 pointer-events-auto">
      {/* Badge (if any, e.g. Trending, Viral) */}
      {reel.badgeText && (
        <div className="flex items-center gap-1.5 w-fit rounded-full bg-white/10 px-2.5 py-0.5 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-white/90">
          <Sparkles size={11} className="text-cyan-400" />
          <span>{reel.badgeText}</span>
          <span className="text-white/40">•</span>
          <span className="text-white/75">{reel.viewsCount} views</span>
        </div>
      )}

      {/* Creator Handle & Verified Badge */}
      <div className="flex items-center gap-2">
        <span className="font-bold text-base text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-tight hover:underline cursor-pointer">
          @{reel.username}
        </span>
        {reel.isVerified && (
          <BadgeCheck size={17} className="fill-cyan-400 text-black drop-shadow-sm" />
        )}
      </div>

      {/* Caption & Hashtags with clean expand/collapse */}
      <div className="text-sm text-white/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
        <p className={`leading-snug transition-all ${isExpanded ? '' : 'line-clamp-2'}`}>
          {reel.caption}
        </p>

        {/* Hashtags */}
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

        {reel.caption.length > 70 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-0.5 text-xs font-semibold text-white/70 hover:text-white transition-colors"
          >
            {isExpanded ? 'Show less' : '...more'}
          </button>
        )}
      </div>

      {/* Scrolling Marquee Audio Track */}
      <div className="mt-1 flex items-center gap-2 max-w-[240px] overflow-hidden rounded-full bg-black/40 px-3 py-1 backdrop-blur-md border border-white/10">
        <Music2 size={13} className="text-cyan-400 shrink-0 animate-pulse" />
        <div className="relative overflow-hidden whitespace-nowrap text-xs font-medium text-white/90">
          <div className="inline-block animate-marquee">
            <span>{reel.audioTitle} • {reel.audioArtist}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
            <span>{reel.audioTitle} • {reel.audioArtist}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
          </div>
        </div>
      </div>
    </div>
  );
};
