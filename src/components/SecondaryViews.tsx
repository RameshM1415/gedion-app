import React from 'react';
import { Heart, X } from 'lucide-react';
import { Reel } from '../types';
import { useTheme } from '../context/ThemeContext';

export interface ViewProps {
  onClose: () => void;
  reels: Reel[];
  onPublish?: (newReel: Reel) => void;
  initialMode?: 'POST' | 'STORY' | 'PHOTO' | 'REEL' | 'LIVE';
  onOpenChatWithUser?: (username: string) => void;
}

// 1. EXPLORE & SEARCH VIEW
export { ExploreView } from './ExploreView';

// 2. CREATE / RECORD VIEW (Now modularized in RecordingView.tsx)
export { RecordingView, CreateView } from './RecordingView';
export type { RecordingViewProps } from './RecordingView';

// 3. ACTIVITY & INBOX VIEW (Clean Instagram Notifications)
export const ActivityView: React.FC<ViewProps> = ({ onClose }) => {
  const { isDark } = useTheme();

  return (
    <div
      className={`absolute inset-0 z-30 flex flex-col pt-0 pb-20 overflow-y-auto no-scrollbar transition-colors ${
        isDark ? 'bg-black text-white' : 'bg-[#ffffff] text-black'
      }`}
    >
      {/* Header */}
      <header
        className={`sticky top-0 z-10 flex flex-col border-b backdrop-blur-md transition-colors ${
          isDark ? 'bg-black/95 border-[#262626]' : 'bg-[#ffffff] border-[#dbdbdb]'
        }`}
      >
        <div className="w-full pt-[env(safe-area-inset-top,0px)]" />
        <div className="flex items-center justify-between px-4 h-[48px]">
          <div className="flex items-center gap-2">
            <Heart size={22} className="text-rose-500 fill-rose-500" />
            <h2 className="text-lg font-bold tracking-tight">Notifications</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Notifications"
            className="p-1.5 rounded-full hover:opacity-75 active:scale-95 transition-all"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* Clean Instagram Activity Zero-State Screen */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div
          className={`h-16 w-16 rounded-full flex items-center justify-center mb-4 border ${
            isDark
              ? 'bg-zinc-900 border-[#262626] text-rose-400'
              : 'bg-zinc-50 border-[#efefef] text-rose-500'
          }`}
        >
          <Heart size={30} />
        </div>
        <h3 className="text-sm font-bold tracking-tight">
          Activity On Your Posts
        </h3>
        <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">
          When people like or comment on your posts and reels, you&apos;ll see them here.
        </p>
      </div>
    </div>
  );
};

// 4. PROFILE SCREEN & VIEW
export { ProfileScreen, ProfileView } from './ProfileScreen';

// 5. CREATOR WALLET
export { WalletScreen } from './WalletScreen';

// 6. CONTENT MODERATION / REPORT
export { ReportModal } from './ReportModal';
