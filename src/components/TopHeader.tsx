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
    <header className="relative z-40 w-full bg-gradient-to-b from-black/90 via-black/60 to-transparent px-3.5 pt-2.5 pb-1 select-none">
      <div className="flex items-center justify-between w-full max-w-md mx-auto">
        {/* Left Side: Brand Logo and Title */}
        <div className="flex items-center space-x-2 shrink-0">
          <GediOnLogoIcon size={30} showGlow={false} />
          <h1 className="text-base font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-purple-400 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            GediOn
          </h1>
          {isRefreshing && (
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping ml-1" />
          )}
        </div>

        {/* Center: Feed Tabs (Following | For You) */}
        <div className="flex items-center space-x-3 text-xs font-bold">
          <button
            type="button"
            onClick={() => onSelectFeedTab?.('following')}
            className={`relative py-1 transition-colors ${
              currentFeedTab === 'following'
                ? 'text-white'
                : 'text-white/45 hover:text-white/75'
            }`}
          >
            Following
            {currentFeedTab === 'following' && (
              <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-gradient-to-r from-cyan-400 to-fuchsia-500 rounded-full" />
            )}
          </button>
          <span className="text-white/20 select-none">|</span>
          <button
            type="button"
            onClick={() => onSelectFeedTab?.('forYou')}
            className={`relative py-1 transition-colors ${
              currentFeedTab === 'forYou'
                ? 'text-white'
                : 'text-white/45 hover:text-white/75'
            }`}
          >
            For You
            {currentFeedTab === 'forYou' && (
              <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-gradient-to-r from-cyan-400 to-fuchsia-500 rounded-full" />
            )}
          </button>
        </div>

        {/* Right Side: Sleek Notification Bell ONLY (No YouTube button, clean dark/transparent background with subtle border, no heavy cyan glow) */}
        <div className="flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={handleBellClick}
            className="w-8 h-8 rounded-full bg-black/40 hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center text-white/90 border border-white/15 relative"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell className="w-3.5 h-3.5 text-white/90" />
            {hasUnreadNotifications && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-black" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
