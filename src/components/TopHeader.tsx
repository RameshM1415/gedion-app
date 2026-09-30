import React from 'react';
import { Sparkles, Bell } from 'lucide-react';
import { AuthUser } from '../utils/authStorage';

interface TopHeaderProps {
  currentUser: AuthUser | null;
  onOpenAuth: () => void;
  onOpenNotifications?: () => void;
  onOpenSearch?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentUser,
  onOpenAuth,
  onOpenNotifications,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/90 via-black/50 to-transparent backdrop-blur-[2px] px-4 pt-3 pb-4">
      <div className="flex items-center justify-between max-w-md mx-auto">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Sparkles className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400">
              GediOn
            </h1>
          </div>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenNotifications}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center text-white/90"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
          </button>

          {currentUser ? (
            <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-md py-1 px-2.5 rounded-full border border-white/10">
              <img
                src={currentUser.avatar}
                alt={currentUser.displayName || currentUser.username}
                className="w-6 h-6 rounded-full object-cover border border-cyan-400/50"
              />
              <span className="text-xs font-semibold text-white/90 max-w-[90px] truncate">
                {currentUser.displayName || currentUser.username}
              </span>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 px-3.5 py-1.5 rounded-full shadow-md active:scale-95 transition-all"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
