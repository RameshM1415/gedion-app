import React from 'react';
import { Bell } from 'lucide-react';
import { FeedTab } from '../types';
import { GediOnLogoIcon } from './GediOnLogoIcon';
import { AuthUser } from '../utils/authStorage';

interface TopHeaderProps {
  currentFeedTab?: FeedTab;
  onSelectFeedTab?: (tab: FeedTab) => void;
  onOpenActivity?: () => void;
  onOpenNotifications?: () => void;
  onOpenAuth?: () => void;
  currentUser?: AuthUser | null;
  hasUnreadNotifications?: boolean;
  isRefreshing?: boolean;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentFeedTab = 'forYou',
  onSelectFeedTab,
  onOpenActivity,
  onOpenNotifications,
  hasUnreadNotifications = false,
  isRefreshing = false,
}) => {
  const handleBellClick = () => {
    if (onOpenNotifications) {
      onOpenNotifications();
    } else if (onOpenActivity) {
      onOpenActivity();
    }
  };

  return (
    <header className="relative z-40 w-full h-12 bg-gradient-to-b from-black/95 via-black/80 to-transparent px-3.5 select-none shrink-0 flex items-center">
      <div className="flex items-center justify-between w-full">
        {/* Left: GediOn App Logo & Branding */}
        <div className="flex-1 flex items-center justify-start space-x-2 min-w-0">
          <GediOnLogoIcon size={26} showGlow={false} />
          <span className="text-base font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-purple-400 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] truncate">
            GediOn
          </span>
          {isRefreshing && (
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping ml-0.5 shrink-0" />
          )}
        </div>

        {/* Center: "Following" and "For You" feed tabs with active indicator */}
        <div className="flex items-center justify-center space-x-3 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => onSelectFeedTab?.('following')}
            className={`relative py-1 transition-colors ${
              currentFeedTab === 'following'
                ? 'text-white font-extrabold'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            Following
            {currentFeedTab === 'following' && (
              <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-fuchsia-500 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.7)]" />
            )}
          </button>
          <span className="text-white/20 select-none">|</span>
          <button
            type="button"
            onClick={() => onSelectFeedTab?.('forYou')}
            className={`relative py-1 transition-colors ${
              currentFeedTab === 'forYou'
                ? 'text-white font-extrabold'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            For You
            {currentFeedTab === 'forYou' && (
              <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-fuchsia-500 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.7)]" />
            )}
          </button>
        </div>

        {/* Right: Sleek notification bell icon (clean dark/transparent, no vertical offset or backlight glow) */}
        <div className="flex-1 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={handleBellClick}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 active:scale-90 transition-all flex items-center justify-center text-white/90 border border-white/10 relative"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell size={15} className="text-white/90" />
            {hasUnreadNotifications && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
