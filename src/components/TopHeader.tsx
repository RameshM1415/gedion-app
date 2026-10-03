import React from 'react';
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
  isRefreshing = false,
}) => {
  return (
    <header className="relative z-40 w-full h-12 px-4 select-none flex items-center pointer-events-auto">
      <div className="flex items-center justify-between w-full">
        {/* Left: GediOn App Logo & Name Branding */}
        <div className="flex items-center space-x-2 shrink-0">
          <GediOnLogoIcon size={26} showGlow={false} />
          <span className="text-base font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-purple-400 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            GediOn
          </span>
          {isRefreshing && (
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping ml-0.5 shrink-0" />
          )}
        </div>

        {/* Center / Right-aligned balance: "Following | For You" Feed Toggle Tabs */}
        <div className="flex items-center space-x-3.5 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => onSelectFeedTab?.('following')}
            className={`relative py-1 transition-colors ${
              currentFeedTab === 'following'
                ? 'text-white font-extrabold'
                : 'text-white/45 hover:text-white/75'
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
                : 'text-white/45 hover:text-white/75'
            }`}
          >
            For You
            {currentFeedTab === 'forYou' && (
              <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-fuchsia-500 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.7)]" />
            )}
          </button>
        </div>

        {/* Right: Completely Clean (Empty / No action icons) */}
        <div className="w-6 shrink-0" />
      </div>
    </header>
  );
};
