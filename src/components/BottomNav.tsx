import React from 'react';
import { Home, Search, Plus, Send, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavTab } from '../types';

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
  isRefreshing = false,
  hasUnreadMessages = true,
  hasUnreadNotifications = true,
  isVisible = true,
}) => {
  const lastHomeTapRef = React.useRef<number>(0);
  const [isBouncing, setIsBouncing] = React.useState(false);
  const [userAvatar, setUserAvatar] = React.useState<string | null>(null);

  React.useEffect(() => {
    const updateAvatar = () => {
      try {
        const saved = localStorage.getItem('gedion_user_profile_v1');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.avatar) setUserAvatar(parsed.avatar);
        }
      } catch {
        // ignore
      }
    };
    updateAvatar();
    window.addEventListener('storage', updateAvatar);
    window.addEventListener('profile-updated', updateAvatar);
    return () => {
      window.removeEventListener('storage', updateAvatar);
      window.removeEventListener('profile-updated', updateAvatar);
    };
  }, []);

  const handleHomeClick = () => {
    const now = Date.now();
    const timeSinceLastTap = now - lastHomeTapRef.current;
    lastHomeTapRef.current = now;

    const isDoubleTap = timeSinceLastTap < 400;
    const isAlreadyOnHome = activeTab === 'home';

    if (isAlreadyOnHome || isDoubleTap) {
      setIsBouncing(true);
      setTimeout(() => setIsBouncing(false), 800);
      onHomeRefresh?.();
    } else {
      onSelectTab('home');
    }
  };
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="bottom-dock-container"
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 44, transition: { duration: 0.2, ease: 'easeIn' } }}
          transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
          className="absolute bottom-0 left-0 right-0 z-30 flex justify-center pb-3 pt-1 px-4 pointer-events-none"
        >
          <div className="pointer-events-auto flex items-center justify-between w-full max-w-[420px] rounded-full px-5 py-2 glass-panel border border-white/10 shadow-[0_10px_35px_rgba(0,0,0,0.8)]">
            {/* Home / Reels */}
            <button
              onClick={handleHomeClick}
              aria-label="Home Feed"
              className="relative flex flex-col items-center justify-center p-1 transition-transform active:scale-90"
            >
              <motion.div
                animate={
                  isBouncing || isRefreshing
                    ? {
                        scale: [1, 1.35, 0.88, 1.15, 1],
                        rotate: [0, -14, 14, -6, 0],
                      }
                    : {}
                }
                transition={{ duration: 0.55 }}
                className="relative flex items-center justify-center"
              >
                <Home
                  size={22}
                  className={`transition-colors duration-200 ${
                    activeTab === 'home'
                      ? 'text-white'
                      : 'text-white/50 hover:text-white/80'
                  }`}
                  strokeWidth={activeTab === 'home' ? 2.5 : 2}
                />
              </motion.div>
              {activeTab === 'home' && !isBouncing && !isRefreshing && (
                <motion.div
                  layoutId="navIndicator"
                  className="absolute -bottom-1 h-1 w-1 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                />
              )}
            </button>

            {/* Search (Explore & Trending Search with Vivid Electric Neon Glow) */}
            <button
              onClick={() => onSelectTab('explore')}
              aria-label="Search and Explore"
              style={{
                backgroundColor: 'rgba(6, 182, 212, 0.18)',
                border: '1px solid rgba(6, 182, 212, 0.4)',
                boxShadow: '0 0 14px rgba(6, 182, 212, 0.6), 0 0 24px rgba(6, 182, 212, 0.25)',
              }}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-cyan-300 transition-transform active:scale-90 hover:scale-105"
            >
              <Search
                size={19}
                className="text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.85)]"
                strokeWidth={2.5}
              />
              {activeTab === 'explore' && (
                <motion.div
                  layoutId="navIndicator"
                  className="absolute -bottom-1 h-1 w-1 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                />
              )}
            </button>

            {/* Create (+ Button with Neon Gradient Border) */}
            <button
              onClick={() => onSelectTab('create')}
              aria-label="Create Reel"
              className="group relative -top-3 flex items-center justify-center transition-transform active:scale-90 hover:scale-105"
            >
              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-400 via-purple-500 to-pink-500 p-[2px] shadow-[0_0_20px_rgba(168,85,247,0.5)] group-hover:shadow-[0_0_25px_rgba(6,182,212,0.7)] transition-all">
                <div className="flex h-full w-full items-center justify-center rounded-2xl bg-black transition-colors group-hover:bg-black/80">
                  <Plus size={22} className="text-white" strokeWidth={3} />
                </div>
              </div>
            </button>

            {/* Direct Messages / Chat (Identical Electric Cyan Neon Backlight Glow) */}
            <button
              onClick={() => onSelectTab('messages')}
              aria-label="Direct Messages"
              style={{
                backgroundColor: 'rgba(6, 182, 212, 0.18)',
                border: '1px solid rgba(6, 182, 212, 0.4)',
                boxShadow: '0 0 14px rgba(6, 182, 212, 0.6), 0 0 24px rgba(6, 182, 212, 0.25)',
              }}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-cyan-300 transition-transform active:scale-90 hover:scale-105"
            >
              <Send
                size={19}
                className="-rotate-45 translate-x-0.5 -translate-y-0.5 text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.85)] transition-colors duration-200"
                strokeWidth={2.5}
              />
              {hasUnreadMessages && activeTab !== 'messages' && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-400 border-2 border-black shadow-[0_0_8px_rgba(6,182,212,1)]" />
                </span>
              )}
              {activeTab === 'messages' && (
                <motion.div
                  layoutId="navIndicator"
                  className="absolute -bottom-1 h-1 w-1 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                />
              )}
            </button>

            {/* Profile */}
            <button
              onClick={() => onSelectTab('profile')}
              aria-label="My Profile"
              className="relative flex flex-col items-center justify-center p-1 transition-transform active:scale-90"
            >
              {userAvatar ? (
                <div
                  className={`h-6 w-6 rounded-full p-[1.5px] transition-all duration-200 ${
                    activeTab === 'profile'
                      ? 'bg-gradient-to-tr from-cyan-400 to-purple-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]'
                      : 'bg-white/20'
                  }`}
                >
                  <img
                    src={userAvatar}
                    alt="Profile"
                    className="h-full w-full rounded-full object-cover"
                  />
                </div>
              ) : (
                <User
                  size={22}
                  className={`transition-colors duration-200 ${
                    activeTab === 'profile' ? 'text-white' : 'text-white/50 hover:text-white/80'
                  }`}
                  strokeWidth={activeTab === 'profile' ? 2.5 : 2}
                />
              )}
              {activeTab === 'profile' && (
                <motion.div
                  layoutId="navIndicator"
                  className="absolute -bottom-1 h-1 w-1 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                />
              )}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

