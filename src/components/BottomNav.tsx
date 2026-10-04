import React, { useEffect, useState } from 'react';
import { Home, Film, PlusSquare, Send, User } from 'lucide-react';
import { NavTab } from '../types';
import { useTheme } from '../context/ThemeContext';

interface BottomNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onHomeRefresh?: () => void;
  isRefreshing?: boolean;
  hasUnreadMessages?: boolean;
  hasUnreadNotifications?: boolean;
  isVisible?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  onHomeRefresh,
  hasUnreadMessages = false,
  hasUnreadNotifications = false,
  isVisible = true,
}) => {
  const { isDark } = useTheme();
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

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
    };
  }, []);

  if (!isVisible) return null;

  return (
    <nav
      className={`fixed bottom-0 inset-x-0 z-40 max-w-[440px] mx-auto h-[50px] border-t px-5 flex items-center justify-between select-none transition-colors ${
        isDark ? 'bg-black border-[#262626] text-white' : 'bg-white border-[#efefef] text-black'
      }`}
    >
      {/* 1. Home (🏠) */}
      <button
        type="button"
        onClick={() => {
          if (activeTab === 'home' && onHomeRefresh) {
            onHomeRefresh();
          } else {
            onSelectTab('home');
          }
        }}
        aria-label="Home Feed"
        className="flex items-center justify-center p-2 transition-transform active:scale-90"
      >
        <Home
          size={24}
          strokeWidth={activeTab === 'home' ? 2.5 : 1.8}
          className={activeTab === 'home' ? 'fill-current' : ''}
        />
      </button>

      {/* 2. Reels (▶️) - Dedicated full-screen vertical reels tab */}
      <button
        type="button"
        onClick={() => onSelectTab('reels')}
        aria-label="Reels Player"
        className="flex items-center justify-center p-2 transition-transform active:scale-90"
      >
        <Film
          size={24}
          strokeWidth={activeTab === 'reels' ? 2.5 : 1.8}
          className={activeTab === 'reels' ? 'fill-current' : ''}
        />
      </button>

      {/* 3. Create (+) - Opens Create modal */}
      <button
        type="button"
        onClick={() => onSelectTab('create')}
        aria-label="Create Post or Reel"
        className="flex items-center justify-center p-2 transition-transform active:scale-90"
      >
        <PlusSquare
          size={24}
          strokeWidth={activeTab === 'create' ? 2.5 : 1.8}
        />
      </button>

      {/* 4. Direct Messages (✈️) */}
      <button
        type="button"
        onClick={() => onSelectTab('messages')}
        aria-label="Direct Messages"
        className="relative flex items-center justify-center p-2 transition-transform active:scale-90"
      >
        <Send
          size={23}
          strokeWidth={activeTab === 'messages' ? 2.5 : 1.8}
          className={`-rotate-12 translate-y-[-1px] ${
            activeTab === 'messages' ? 'fill-current' : ''
          }`}
        />
        {hasUnreadMessages && (
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-black" />
        )}
      </button>

      {/* 5. Profile (Avatar) */}
      <button
        type="button"
        onClick={() => onSelectTab('profile')}
        aria-label="Profile"
        className="flex items-center justify-center p-1.5 transition-transform active:scale-90"
      >
        <div
          className={`w-6 h-6 rounded-full overflow-hidden transition-all ${
            activeTab === 'profile'
              ? isDark
                ? 'ring-2 ring-white ring-offset-2 ring-offset-black'
                : 'ring-2 ring-black ring-offset-2 ring-offset-white'
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
                isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-200 text-zinc-700'
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
