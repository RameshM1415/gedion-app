import React, { useEffect, useState, useRef } from 'react';
import { RotateCw } from 'lucide-react';
import { NavTab } from '../types';
import { useTheme } from '../context/ThemeContext';

/* =========================================================================
   AUTHENTIC INSTAGRAM BOLD SVG ICONS (Crisp, High-Contrast 24x24 Vectors)
   ========================================================================= */

// 1. Home Icon (Solid filled house when active, crisp 2px outlined when inactive)
const InstagramHomeIcon: React.FC<{ isActive: boolean; className?: string }> = ({
  isActive,
  className = '',
}) => {
  if (isActive) {
    return (
      <svg
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
      >
        <path d="M22 23h-6.001a1 1 0 0 1-1-1v-5.455a2.997 2.997 0 1 0-5.994 0V22a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V11.543a1.002 1.002 0 0 1 .31-.724l9.99-9.544a1.002 1.002 0 0 1 1.38 0l9.99 9.544a1.002 1.002 0 0 1 .31.724V22a1 1 0 0 1-1 1Z" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9.005 16.545a2.997 2.997 0 0 1 5.99 0" />
      <path d="M2.5 10.732V21a1 1 0 0 0 1 1h4.5a1 1 0 0 0 1-1v-4.455a3 3 0 0 1 6 0V21a1 1 0 0 0 1 1H20.5a1 1 0 0 0 1-1V10.732a1 1 0 0 0-.312-.728L12.5 1.728a.72.72 0 0 0-.976 0L2.812 10.004a1 1 0 0 0-.312.728Z" />
    </svg>
  );
};

// 2. Reels Icon (Authentic Instagram Clapperboard: filled when active, 2px outline when inactive)
const InstagramReelsIcon: React.FC<{ isActive: boolean; className?: string }> = ({
  isActive,
  className = '',
}) => {
  if (isActive) {
    return (
      <svg
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M3.75 3.5h16.5A2.75 2.75 0 0 1 23 6.25v11.5A2.75 2.75 0 0 1 20.25 20.5H3.75A2.75 2.75 0 0 1 1 17.75V6.25A2.75 2.75 0 0 1 3.75 3.5ZM9.5 7.5l-2-2.5H4.25a1.25 1.25 0 0 0-1.25 1.25v1.25H9.5Zm2.5 0h4.25l-2-2.5H10l2 2.5Zm6.75 0H21V6.25a1.25 1.25 0 0 0-1.25-1.25h-3.25l2.25 2.5ZM10.5 10.5v6l5-3-5-3Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="4" width="20" height="16" rx="3" />
      <path d="m4.5 4 4 4.5M10.5 4l4 4.5M16.5 4l4 4.5M2 8.5h20" />
      <polygon points="10 11.5 15 14.5 10 17.5 10 11.5" fill="currentColor" stroke="none" />
    </svg>
  );
};

// 3. Create / Plus Icon (Solid filled rounded square with cut-out plus when active, crisp 2px outlined square with plus when inactive)
const InstagramCreateIcon: React.FC<{ isActive: boolean; className?: string }> = ({
  isActive,
  className = '',
}) => {
  if (isActive) {
    return (
      <svg
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M2 7a5 5 0 0 1 5-5h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7Zm11 4h3.5a1 1 0 1 0 0-2H13V5.5a1 1 0 1 0-2 0V9H7.5a1 1 0 0 0 0 2H11v3.5a1 1 0 1 0 2 0V11Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
      <line x1="12" y1="7.5" x2="12" y2="16.5" />
      <line x1="7.5" y1="12" x2="16.5" y2="12" />
    </svg>
  );
};

// Direct / Messages Paper Plane Icon (Used in header and DMs)
const InstagramDirectIcon: React.FC<{ isActive: boolean; className?: string }> = ({
  isActive,
  className = '',
}) => {
  if (isActive) {
    return (
      <svg
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
      >
        <path d="M22.955 1.543a1.458 1.458 0 0 0-1.423-.332L2.094 6.786a1.464 1.464 0 0 0-.153 2.722l6.236 3.197 3.2 6.236c.394.767 1.423.89 1.98.243l3.66-4.248 4.673 3.535a1.464 1.464 0 0 0 2.29-.906l3.418-14.86a1.46 1.46 0 0 0-.443-1.162ZM9.362 11.758l9.646-7.854-7.464 9.176-.367 2.88-1.815-4.202Z" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
};

// 4. Search Icon (Bold 2.8px thick stroke when active, crisp 2px stroke when inactive)
const InstagramSearchIcon: React.FC<{ isActive: boolean; className?: string }> = ({
  isActive,
  className = '',
}) => {
  if (isActive) {
    return (
      <svg
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        <circle cx="10.5" cy="10.5" r="7.5" />
        <path d="m21 21-5.2-5.2" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7.5" />
      <path d="m21 21-4.8-4.8" />
    </svg>
  );
};

// 5. Fallback Profile Icon if no avatar
const InstagramProfileIcon: React.FC<{ isActive: boolean; className?: string }> = ({
  isActive,
  className = '',
}) => {
  if (isActive) {
    return (
      <svg
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
      >
        <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-5.33 0-8 2.67-8 6a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1c0-3.33-2.67-6-8-6Z" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="7" r="4.5" />
      <path d="M20 21c0-4-3.5-7-8-7s-8 3-8 7" />
    </svg>
  );
};

interface BottomNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onHomeRefresh?: () => void;
  onHomeScrollToTop?: () => void;
  onReelsRefresh?: () => void;
  onReelsScrollToTop?: () => void;
  isRefreshing?: boolean;
  hasUnreadMessages?: boolean;
  hasUnreadNotifications?: boolean;
  isVisible?: boolean;
  userAvatar?: string | null;
  currentUser?: any;
}

// Helper to determine if an avatar string is a valid non-empty URL
const isValidUrl = (url: unknown): url is string => {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return false;
  return (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('./')
  );
};

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  onHomeRefresh,
  onHomeScrollToTop,
  onReelsRefresh,
  onReelsScrollToTop,
  isRefreshing = false,
  hasUnreadMessages = false,
  hasUnreadNotifications = false,
  isVisible = true,
  userAvatar: propAvatar,
  currentUser,
}) => {
  const { isDark } = useTheme();
  const [userAvatar, setUserAvatar] = useState<string | null>(
    propAvatar || currentUser?.avatar_url || currentUser?.avatar || null
  );
  const [hasAvatarImgError, setHasAvatarImgError] = useState(false);
  const [isDoubleTapSpinning, setIsDoubleTapSpinning] = useState(false);
  const [isReelsDoubleTapSpinning, setIsReelsDoubleTapSpinning] = useState(false);

  // Candidate avatar resolution
  const candidateAvatar =
    propAvatar ||
    currentUser?.avatar_url ||
    currentUser?.avatar ||
    userAvatar;

  // Reset error state when avatar changes
  useEffect(() => {
    setHasAvatarImgError(false);
  }, [candidateAvatar]);

  const isValidAvatar = isValidUrl(candidateAvatar);

  const userInitial = (
    currentUser?.displayName?.trim() ||
    currentUser?.username?.trim() ||
    'P'
  )
    .charAt(0)
    .toUpperCase();

  // Synchronize avatar from props
  useEffect(() => {
    if (propAvatar) setUserAvatar(propAvatar);
    else if (currentUser?.avatar_url) setUserAvatar(currentUser.avatar_url);
    else if (currentUser?.avatar) setUserAvatar(currentUser.avatar);
  }, [propAvatar, currentUser?.avatar_url, currentUser?.avatar]);

  // Timing references for high-precision double-tap detection
  const lastHomeTapRef = useRef<number>(0);
  const singleTapTimerRef = useRef<number | null>(null);
  const lastReelsTapRef = useRef<number>(0);
  const singleReelsTapTimerRef = useRef<number | null>(null);

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

    const handleProfileChanged = (e: Event) => {
      const custom = e as CustomEvent<any>;
      if (custom.detail?.avatar) {
        setUserAvatar(custom.detail.avatar);
      }
    };

    window.addEventListener('storage', updateAvatar);
    window.addEventListener('profile-updated', updateAvatar);
    window.addEventListener('gedion-profile-changed', handleProfileChanged);
    return () => {
      window.removeEventListener('storage', updateAvatar);
      window.removeEventListener('profile-updated', updateAvatar);
      window.removeEventListener('gedion-profile-changed', handleProfileChanged);
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
      }
      if (singleReelsTapTimerRef.current) {
        clearTimeout(singleReelsTapTimerRef.current);
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

  const handleReelsClick = (e: React.MouseEvent) => {
    e.preventDefault();

    // 1. If user is NOT on the reels tab: Simply switch to Reels tab and keep current reel playing!
    // Never trigger refresh or scroll-to-top when switching tabs
    if (activeTab !== 'reels') {
      if (singleReelsTapTimerRef.current) {
        clearTimeout(singleReelsTapTimerRef.current);
        singleReelsTapTimerRef.current = null;
      }
      lastReelsTapRef.current = 0;
      onSelectTab('reels');
      return;
    }

    // 2. User is ALREADY on Reels tab: Debounce single-tap from double-tap (350ms threshold)
    const now = Date.now();
    const DOUBLE_TAP_THRESHOLD = 350; // 350ms window for double tap

    if (now - lastReelsTapRef.current < DOUBLE_TAP_THRESHOLD) {
      // Double tap detected while already on Reels view!
      if (singleReelsTapTimerRef.current) {
        clearTimeout(singleReelsTapTimerRef.current);
        singleReelsTapTimerRef.current = null;
      }
      lastReelsTapRef.current = 0;

      // Haptic feedback
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([25, 40, 25]);
        } catch {}
      }

      // Trigger spin animation on clapperboard icon
      setIsReelsDoubleTapSpinning(true);
      setTimeout(() => setIsReelsDoubleTapSpinning(false), 600);

      onReelsRefresh?.();
    } else {
      // First tap while already on Reels tab: record timestamp
      lastReelsTapRef.current = now;
      if (singleReelsTapTimerRef.current) {
        clearTimeout(singleReelsTapTimerRef.current);
      }
      singleReelsTapTimerRef.current = window.setTimeout(() => {
        singleReelsTapTimerRef.current = null;
        // Single tap on Reels tab just keeps current reel playing smoothly
      }, DOUBLE_TAP_THRESHOLD);
    }
  };

  if (!isVisible) return null;

  const isReelsTab = activeTab === 'reels';
  const isSearchActive = activeTab === 'explore' || (activeTab as string) === 'search';

  // Dynamic bar background: solid pure black (#000000) on Reels tab, crisp pure white (#ffffff) on regular pages with a razor-thin 0.5px subtle border-top (#dbdbdb)
  const barThemeClasses = isReelsTab
    ? 'bg-[#000000] border-t border-zinc-900/90 text-white shadow-2xl'
    : isDark
    ? 'bg-[#000000] border-t border-[#262626] text-white'
    : 'bg-[#ffffff] border-t border-[#dbdbdb] text-[#000000] shadow-sm';

  // Elevated height and extended bottom safe-area padding to lift navigation icons comfortably from screen base
  const barHeightClasses = isReelsTab
    ? 'h-[76px] pb-4 pt-1'
    : 'h-[58px] pb-2.5 pt-1';

  // High-contrast icon colors: deep jet black (#000000) active / sharp #262626 inactive on light, pure white (#ffffff) on dark/reels
  const getIconColor = (isActive: boolean) => {
    if (isReelsTab || isDark) {
      return isActive
        ? 'text-[#ffffff] drop-shadow-[0_0_10px_rgba(255,255,255,0.7)]'
        : 'text-[#ffffff]/85 hover:text-[#ffffff]';
    }
    return isActive
      ? 'text-[#000000]'
      : 'text-[#262626] hover:text-[#000000]';
  };

  return (
    <nav
      className={`fixed bottom-0 inset-x-0 z-40 max-w-[440px] mx-auto border-t px-6 flex items-center justify-between select-none transition-all duration-200 ${barHeightClasses} ${barThemeClasses}`}
    >
      {/* 1. Home (🏠) with Double-Tap Refresh & Spin Animation */}
      <button
        type="button"
        onClick={handleHomeClick}
        title="Home - Double-tap to refresh feed"
        aria-label="Home Feed"
        className="relative flex items-center justify-center p-2 transition-transform duration-150 ease-out active:scale-90 cursor-pointer"
      >
        <div
          className={`transition-transform duration-700 ease-out flex items-center justify-center ${
            isDoubleTapSpinning || isRefreshing ? 'rotate-[360deg] scale-110' : ''
          }`}
        >
          {isRefreshing ? (
            <RotateCw
              size={24}
              strokeWidth={2.5}
              className={`animate-spin ${isReelsTab || isDark ? 'text-white' : 'text-black'}`}
            />
          ) : (
            <InstagramHomeIcon
              isActive={activeTab === 'home'}
              className={`transition-colors duration-150 ${getIconColor(activeTab === 'home')}`}
            />
          )}
        </div>
      </button>

      {/* 2. Video / Reels (Clapperboard icon) with Double-Tap Refresh & Shuffle */}
      <button
        type="button"
        onClick={handleReelsClick}
        title="Reels - Double-tap to shuffle"
        aria-label="Reels Player"
        className="relative flex items-center justify-center p-2 transition-transform duration-150 ease-out active:scale-90 cursor-pointer"
      >
        <div
          className={`transition-transform duration-700 ease-out flex items-center justify-center ${
            isReelsDoubleTapSpinning ? 'rotate-[360deg] scale-110' : ''
          }`}
        >
          <InstagramReelsIcon
            isActive={isReelsTab}
            className={`transition-colors duration-150 ${getIconColor(isReelsTab)}`}
          />
        </div>
      </button>

      {/* 3. Create / Upload (+) (Square Plus Icon) */}
      <button
        type="button"
        onClick={() => onSelectTab('create')}
        title="Create Post or Reel"
        aria-label="Create Post or Reel"
        className="relative flex items-center justify-center p-2 transition-transform duration-150 ease-out active:scale-90 cursor-pointer"
      >
        <InstagramCreateIcon
          isActive={activeTab === 'create'}
          className={`transition-colors duration-150 ${getIconColor(activeTab === 'create')}`}
        />
      </button>

      {/* 4. Search & Explore (🔍) */}
      <button
        type="button"
        onClick={() => onSelectTab('explore')}
        title="Search & Explore"
        aria-label="Search & Explore"
        className="relative flex items-center justify-center p-2 transition-transform duration-150 ease-out active:scale-90 cursor-pointer"
      >
        <InstagramSearchIcon
          isActive={isSearchActive}
          className={`transition-colors duration-150 ${getIconColor(isSearchActive)}`}
        />
      </button>

      {/* 5. Profile (Avatar) with crisp 1.5px border ring when active */}
      <button
        type="button"
        onClick={() => onSelectTab('profile')}
        title="Profile"
        aria-label="Profile"
        className="relative flex items-center justify-center p-1.5 transition-transform duration-150 ease-out active:scale-90 cursor-pointer"
      >
        <div
          className={`w-[26px] h-[26px] rounded-full overflow-hidden transition-all duration-150 flex items-center justify-center ${
            activeTab === 'profile'
              ? isReelsTab || isDark
                ? 'ring-[1.5px] ring-white ring-offset-1 ring-offset-black'
                : 'ring-[1.5px] ring-black ring-offset-1 ring-offset-white'
              : isReelsTab
              ? 'opacity-85'
              : 'opacity-95'
          }`}
        >
          {isValidAvatar && !hasAvatarImgError ? (
            <img
              src={candidateAvatar}
              alt=""
              onError={() => setHasAvatarImgError(true)}
              className="w-full h-full object-cover select-none pointer-events-none"
            />
          ) : userInitial ? (
            <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#fba73f] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white font-extrabold text-[11px] select-none shadow-inner">
              {userInitial}
            </div>
          ) : (
            <InstagramProfileIcon
              isActive={activeTab === 'profile'}
              className={`w-5 h-5 ${getIconColor(activeTab === 'profile')}`}
            />
          )}
        </div>
      </button>
    </nav>
  );
};
