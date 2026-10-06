import React, { useEffect, useState, useRef } from 'react';
import { Home, Search, PlusSquare, Clapperboard, User, RotateCw } from 'lucide-react';
import { NavTab } from '../types';
import { useTheme } from '../context/ThemeContext';

interface BottomNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onHomeRefresh?: () => void;
  onHomeScrollToTop?: () => void;
  isRefreshing?: boolean;
  hasUnreadMessages?: boolean;
  hasUnreadNotifications?: boolean;
  isVisible?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  onHomeRefresh,
  onHomeScrollToTop,
  isRefreshing = false,
  hasUnreadMessages = false,
  hasUnreadNotifications = false,
  isVisible = true,
}) => {
  const { isDark } = useTheme();
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [isDoubleTapSpinning, setIsDoubleTapSpinning] = useState(false);

  // Timing references for high-precision double-tap detection
  const lastHomeTapRef = useRef<number>(0);
  const singleTapTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const updateAvatar = () => {
      try {
        const saved = localStorage.getItem('gedion_user_profile_v1');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.avatar) setUserAvatar(parsed.avatar);
        }
      } catch {}
    };
    updateAvatar();
    window.addEventListener('storage', updateAvatar);
    window.addEventListener('profile-updated', updateAvatar);
    return () => {
      window.removeEventListener('storage', updateAvatar);
      window.removeEventListener('profile-updated', updateAvatar);
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
      }
    };
  }, []);

  const handleHomeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const now = Date.now();
    const DOUBLE_TAP_THRESHOLD = 320; // 320ms window for double tap

    if (now - lastHomeTapRef.current < DOUBLE_TAP_THRESHOLD) {
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      lastHomeTapRef.current = 0;

      // Haptic feedback
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([25, 40, 25]);
        } catch {}
      }

      // Trigger 360-degree rotation spin animation
      setIsDoubleTapSpinning(true);
      setTimeout(() => setIsDoubleTapSpinning(false), 900);

      if (activeTab !== 'home') {
        onSelectTab('home');
      }
      onHomeScrollToTop?.();
      onHomeRefresh?.();
    } else {
      lastHomeTapRef.current = now;
      if (activeTab !== 'home') {
        onSelectTab('home');
      } else {
        singleTapTimerRef.current = window.setTimeout(() => {
          onHomeScrollToTop?.();
        }, DOUBLE_TAP_THRESHOLD);
      }
    }
  };

  if (!isVisible) return null;

  const isReelsTab = activeTab === 'reels';
  const isSearchActive = activeTab === 'explore' || (activeTab as string) === 'search';

  // Dynamic bar background: solid dark/black on Reels tab, standard theme on other tabs
  const barThemeClasses = isReelsTab
    ? 'bg-black/95 backdrop-blur-md border-white/10 text-white shadow-2xl'
    : isDark
    ? 'bg-black border-[#262626] text-white'
    : 'bg-white border-[#efefef] text-black';

  const defaultIconColor = isReelsTab
    ? 'text-white/70 hover:text-white'
    : isDark
    ? 'text-zinc-400 hover:text-white'
    : 'text-zinc-600 hover:text-black';

  return (
    <nav
      className={`fixed bottom-0 inset-x-0 z-40 max-w-[440px] mx-auto h-[50px] border-t px-5 flex items-center justify-between select-none transition-colors duration-300 ${barThemeClasses}`}
    >
      {/* 1. Home (🏠) with Double-Tap Refresh & Spin Animation */}
      <button
        type="button"
        onClick={handleHomeClick}
        title="Double-tap to refresh feed"
        aria-label="Home Feed - Double tap to refresh"
        className="flex items-center justify-center p-2 transition-transform active:scale-85 relative cursor-pointer"
      >
        <div
          className={`transition-transform duration-700 ease-out flex items-center justify-center ${
            isDoubleTapSpinning || isRefreshing ? 'rotate-[360deg] scale-110' : ''
          }`}
        >
          {isRefreshing ? (
            <RotateCw
              size={23}
              strokeWidth={2.5}
              className="animate-spin text-cyan-400"
            />
          ) : (
            <Home
              size={24}
              strokeWidth={activeTab === 'home' ? 2.5 : 1.8}
              className={
                activeTab === 'home'
                  ? 'fill-current'
                  : defaultIconColor
              }
            />
          )}
        </div>
      </button>

      {/* 2. Video / Reels (Clapperboard icon) - Opens full-screen vertical Reels */}
      <button
        type="button"
        onClick={() => onSelectTab('reels')}
        aria-label="Reels Player"
        className="flex items-center justify-center p-2 transition-transform active:scale-90 cursor-pointer"
      >
        <Clapperboard
          size={24}
          strokeWidth={isReelsTab ? 2.5 : 1.8}
          className={
            isReelsTab
              ? 'fill-white text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.7)]'
              : defaultIconColor
          }
        />
      </button>

      {/* 3. Create / Upload (+) - Opens Create modal */}
      <button
        type="button"
        onClick={() => onSelectTab('create')}
        aria-label="Create Post or Reel"
        className="flex items-center justify-center p-2 transition-transform active:scale-90 cursor-pointer"
      >
        <PlusSquare
          size={24}
          strokeWidth={activeTab === 'create' ? 2.5 : 1.8}
          className={
            activeTab === 'create'
              ? 'text-[#0095f6]'
              : defaultIconColor
          }
        />
      </button>

      {/* 4. Search (🔍) - Explore & User Search Tab */}
      <button
        type="button"
        onClick={() => onSelectTab('explore')}
        aria-label="Search & Explore"
        className="flex items-center justify-center p-2 transition-transform active:scale-90 cursor-pointer"
      >
        <Search
          size={24}
          strokeWidth={isSearchActive ? 2.8 : 1.8}
          className={`transition-all ${
            isSearchActive
              ? isReelsTab || isDark
                ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]'
                : 'text-black drop-shadow-[0_0_6px_rgba(0,0,0,0.3)]'
              : defaultIconColor
          }`}
        />
      </button>

      {/* 5. Profile (Avatar) */}
      <button
        type="button"
        onClick={() => onSelectTab('profile')}
        aria-label="Profile"
        className="flex items-center justify-center p-1.5 transition-transform active:scale-90 cursor-pointer"
      >
        <div
          className={`w-6 h-6 rounded-full overflow-hidden transition-all ${
            activeTab === 'profile'
              ? isReelsTab || isDark
                ? 'ring-2 ring-white ring-offset-2 ring-offset-black'
                : 'ring-2 ring-black ring-offset-2 ring-offset-white'
              : isReelsTab
              ? 'opacity-80'
              : 'opacity-90'
          }`}
        >
          {userAvatar ? (
            <img
              src={userAvatar}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className={`w-full h-full flex items-center justify-center ${
                isReelsTab || isDark
                  ? 'bg-zinc-800 text-white'
                  : 'bg-zinc-200 text-zinc-700'
              }`}
            >
              <User size={14} />
            </div>
          )}
        </div>
      </button>
    </nav>
  );
};
