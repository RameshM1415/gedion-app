import React from 'react';
import { Bell, X } from 'lucide-react';
import { Reel } from '../types';

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

// 3. ACTIVITY & INBOX VIEW (Zero mock notifications)
export const ActivityView: React.FC<ViewProps> = ({ onClose }) => {
  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-[#08080c] text-white pt-5 pb-20 px-4 overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Bell size={22} className="text-cyan-400" />
          <h2 className="text-lg font-bold">Activity</h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Close Activity"
          className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Sleek Cyberpunk Zero-State Screen */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="h-16 w-16 rounded-3xl bg-gradient-to-tr from-cyan-500/20 to-fuchsia-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 mb-4 shadow-[0_0_25px_rgba(6,182,212,0.25)]">
          <Bell size={28} />
        </div>
        <h3 className="text-sm font-black uppercase tracking-wider font-mono text-white">
          No activity yet
        </h3>
        <p className="text-xs text-white/50 mt-1.5 max-w-xs leading-relaxed">
          Real-time likes, comments, and follower alerts from your Supabase reels will appear here.
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
