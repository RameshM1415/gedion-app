import React from 'react';
import { Heart } from 'lucide-react';
import { FeedTab } from '../types';

interface TopHeaderProps {
  activeTab?: FeedTab;
  onTabChange?: (tab: FeedTab) => void;
  onOpenActivity?: () => void;
  hasUnreadActivity?: boolean;
  onOpenCreate?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab = 'forYou',
  onTabChange,
  onOpenActivity,
  hasUnreadActivity = false,
}) => {
  return (
    <header className="w-full h-[48px] px-4 flex items-center justify-between pointer-events-none select-none">
      {/* Left: Sleek modern brand mark and title "GediOn" */}
      <div
        onClick={() => onTabChange?.('forYou')}
        className="flex items-center gap-1.5 w-28 shrink-0 pointer-events-auto cursor-pointer select-none active:scale-95 transition-all"
      >
        <img
          src="https://i.postimg.cc/1XtyC1ff/file-000000007ca8820bb8633872f223383f.png"
          alt="GediOn logo"
          className="h-7 w-7 object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
        />
        <span
          className="font-sans font-black text-[22px] sm:text-[24px] tracking-[-0.04em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]"
        >
          GediOn
        </span>
      </div>

      {/* Center: Balanced Following / For You Tabs */}
      <div className="flex items-center justify-center gap-5 pointer-events-auto">
        <button
          type="button"
          onClick={() => onTabChange?.('following')}
          aria-label="Following Feed"
          className={`relative py-1 text-[15px] font-bold tracking-tight transition-all active:scale-95 cursor-pointer ${
            activeTab === 'following'
              ? 'text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] scale-105'
              : 'text-white/65 hover:text-white/85 font-medium'
          }`}
        >
          Following
          {activeTab === 'following' && (
            <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full bg-white shadow-sm" />
          )}
        </button>

        <span className="text-white/35 text-xs font-light select-none">|</span>

        <button
          type="button"
          onClick={() => onTabChange?.('forYou')}
          aria-label="For You Feed"
          className={`relative py-1 text-[15px] font-bold tracking-tight transition-all active:scale-95 cursor-pointer ${
            activeTab === 'forYou'
              ? 'text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] scale-105'
              : 'text-white/65 hover:text-white/85 font-medium'
          }`}
        >
          For You
          {activeTab === 'forYou' && (
            <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full bg-white shadow-sm" />
          )}
        </button>
      </div>

      {/* Right: Clean, balanced right side (clean heart icon, no bulky YouTube or extra clutter) */}
      <div className="flex items-center justify-end w-24 shrink-0 pointer-events-auto">
        {onOpenActivity ? (
          <button
            type="button"
            onClick={onOpenActivity}
            aria-label="Activity and Notifications"
            className="relative p-1.5 -mr-1 rounded-full text-white/90 hover:text-white transition-transform active:scale-90"
          >
            <Heart size={22} strokeWidth={2.2} className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]" />
            {hasUnreadActivity && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-black" />
            )}
          </button>
        ) : (
          <div className="w-6 h-6" />
        )}
      </div>
    </header>
  );
};
