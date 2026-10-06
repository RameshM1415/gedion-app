import React from 'react';
import { ArrowLeft, Camera } from 'lucide-react';

interface ReelsHeaderProps {
  activeSubTab?: 'forYou' | 'friends';
  onSubTabChange?: (tab: 'forYou' | 'friends') => void;
  onBackToHome: () => void;
  onOpenCreateReel?: () => void;
}

export const ReelsHeader: React.FC<ReelsHeaderProps> = ({
  activeSubTab = 'forYou',
  onSubTabChange,
  onBackToHome,
  onOpenCreateReel,
}) => {
  return (
    <header className="w-full h-[52px] px-3 flex items-center justify-between pointer-events-none select-none">
      {/* Left: Back Arrow (←) to smoothly return to Home Feed */}
      <div className="flex items-center gap-3 pointer-events-auto">
        <button
          type="button"
          onClick={onBackToHome}
          aria-label="Back to Home Feed"
          title="Back to Home Feed"
          className="p-1.5 rounded-full text-white/95 hover:text-white hover:bg-white/10 active:scale-90 transition-transform cursor-pointer"
        >
          <ArrowLeft size={24} strokeWidth={2.4} className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]" />
        </button>

        {/* Clean Modern Typography Tabs: Reels | Friends */}
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => onSubTabChange?.('forYou')}
            aria-label="Reels feed"
            className={`text-[19px] font-black tracking-tight transition-all active:scale-95 cursor-pointer drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] ${
              activeSubTab === 'forYou'
                ? 'text-white'
                : 'text-white/60 hover:text-white/85 font-bold'
            }`}
          >
            Reels
          </button>

          <span className="text-white/30 text-xs font-light select-none">|</span>

          <button
            type="button"
            onClick={() => onSubTabChange?.('friends')}
            aria-label="Friends reels"
            className={`text-[17px] tracking-tight transition-all active:scale-95 cursor-pointer drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] ${
              activeSubTab === 'friends'
                ? 'text-white font-extrabold'
                : 'text-white/60 hover:text-white/85 font-medium'
            }`}
          >
            Friends
          </button>
        </div>
      </div>

      {/* Right: Camera Action Button to Create/Upload a Reel */}
      <div className="flex items-center justify-end pointer-events-auto">
        {onOpenCreateReel && (
          <button
            type="button"
            onClick={onOpenCreateReel}
            aria-label="Record or Create Reel"
            title="Create Reel"
            className="p-1.5 rounded-full text-white/95 hover:text-white hover:bg-white/10 active:scale-90 transition-transform cursor-pointer"
          >
            <Camera size={23} strokeWidth={2.2} className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]" />
          </button>
        )}
      </div>
    </header>
  );
};
