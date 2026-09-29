import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, User } from 'lucide-react';
import { FeedTab } from '../types';
import { GediOnLogoIcon } from './GediOnLogoIcon';
import { AuthUser } from '../utils/authStorage';

interface TopHeaderProps {
  currentFeedTab: FeedTab;
  onSelectFeedTab: (tab: FeedTab) => void;
  onOpenSearch?: () => void;
  onOpenActivity: () => void;
  onOpenAuth?: () => void;
  currentUser?: AuthUser | null;
  hasUnreadNotifications?: boolean;
  isRefreshing?: boolean;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentFeedTab,
  onSelectFeedTab,
  onOpenActivity,
  onOpenAuth,
  currentUser,
  hasUnreadNotifications = true,
  isRefreshing = false,
}) => {
  return (
    <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3.5 pt-3.5 pb-2 bg-gradient-to-b from-black/85 via-black/45 to-transparent pointer-events-auto">
      {/* Brand Logo with Official GediOn Badge & Chrome Typeface */}
      <div className="flex items-center gap-2.5 cursor-pointer select-none group">
        <div className={`relative w-[34px] h-[34px] md:w-[38px] md:h-[38px] shrink-0 aspect-square flex items-center justify-center transition-transform duration-300 group-hover:scale-105 ${isRefreshing ? 'scale-110 animate-pulse' : ''}`}>
          <GediOnLogoIcon className="w-full h-full" />
        </div>
        <span className="text-xl md:text-[22px] font-extrabold tracking-tight text-chrome-silver select-none transition-all duration-300 group-hover:brightness-110">
          GediOn
        </span>
      </div>

      {/* Center Refresh Indicator or Following | For You Tabs */}
      <div className="relative flex items-center gap-4 text-sm font-semibold">
        <button
          onClick={() => onSelectFeedTab('following')}
          className={`relative px-1 py-1 transition-colors ${
            currentFeedTab === 'following' ? 'text-white' : 'text-white/60 hover:text-white/80'
          }`}
        >
          Following
          {currentFeedTab === 'following' && (
            <motion.div
              layoutId="feedUnderline"
              className="absolute -bottom-0.5 left-0 right-0 h-[2px] rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]"
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            />
          )}
        </button>

        <span className="text-white/20 font-light">|</span>

        <button
          onClick={() => onSelectFeedTab('forYou')}
          className={`relative px-1 py-1 transition-colors ${
            currentFeedTab === 'forYou' ? 'text-white' : 'text-white/60 hover:text-white/80'
          }`}
        >
          For You
          {currentFeedTab === 'forYou' && (
            <motion.div
              layoutId="feedUnderline"
              className="absolute -bottom-0.5 left-0 right-0 h-[2px] rounded-full bg-gradient-to-r from-cyan-400 to-pink-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            />
          )}
        </button>
      </div>

      {/* Floating Refresh Pill underneath Header when refreshing */}
      <AnimatePresence>
        {isRefreshing && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="absolute top-12 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-cyan-400/40 shadow-[0_0_20px_rgba(6,182,212,0.5)] pointer-events-none"
          >
            <div className="h-3 w-3 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
            <span className="text-[11px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-purple-300">
              Refreshing Reels...
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle glowing neon sweep line across header bottom during refresh */}
      <AnimatePresence>
        {isRefreshing && (
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 shadow-[0_0_12px_#06b6d4] origin-left"
          />
        )}
      </AnimatePresence>

      {/* Right Tools: Account / Auth Button & Activity/Notifications button */}
      <div className="flex items-center gap-2">

        <button
          onClick={onOpenActivity}
          aria-label="Activity and Notifications"
          style={{
            boxShadow: '0 0 16px rgba(6, 182, 212, 0.65), 0 0 30px rgba(168, 85, 247, 0.35)',
          }}
          className="relative flex h-[42px] w-[42px] items-center justify-center rounded-full bg-gradient-to-tr from-cyan-500/20 via-black/70 to-purple-600/30 backdrop-blur-md border border-cyan-400/70 text-white hover:text-cyan-200 transition-all active:scale-95 group"
        >
          <Bell
            size={20}
            className="text-cyan-200 transition-transform group-hover:scale-110 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]"
          />
          {hasUnreadNotifications && (
            <span className="absolute top-1.5 right-1.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500 border-2 border-black shadow-[0_0_10px_rgba(236,72,153,1)]" />
            </span>
          )}
        </button>
      </div>
  );
};

