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
export { SearchView, ExploreView } from './SearchView';
export type { SearchViewProps, ExploreViewProps } from './SearchView';

// 2. CREATE / RECORD VIEW (Now modularized in RecordingView.tsx)
export { RecordingView, CreateView } from './RecordingView';
export type { RecordingViewProps } from './RecordingView';

// 3. ACTIVITY & NOTIFICATIONS VIEW
export { NotificationsView } from './NotificationsView';
export { NotificationsView as ActivityView } from './NotificationsView';

// 4. PROFILE SCREEN & VIEW
export { ProfileScreen, ProfileView } from './ProfileScreen';

// 5. CREATOR WALLET
export { WalletScreen } from './WalletScreen';

// 6. CONTENT MODERATION / REPORT
export { ReportModal } from './ReportModal';
