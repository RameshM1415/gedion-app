export interface CommentItem {
  id: string;
  username: string;
  avatar: string;
  text: string;
  timestamp: string;
  likes: number;
  isLiked?: boolean;
}

export interface Reel {
  id: string;
  creatorId?: string;
  creatorEmail?: string;
  userId?: string;
  username: string;
  displayName: string;
  avatar: string;
  isVerified: boolean;
  isFollowing: boolean;
  videoUrl: string;
  fallbackGradient: string;
  poster: string;
  caption: string;
  tags: string[];
  audioTitle: string;
  audioArtist: string;
  audioUrl?: string;
  likesCount: number;
  isLiked: boolean;
  commentsCount: number;
  isBookmarked: boolean;
  sharesCount: number;
  viewsCount: string;
  themeAccent: string; // e.g. '#a855f7', '#06b6d4', '#ec4899', '#10b981'
  badgeText?: string;
  mediaType?: 'video' | 'image';
  comments: CommentItem[];
}

export type FeedTab = 'following' | 'forYou';
export type NavTab = 'home' | 'explore' | 'create' | 'messages' | 'activity' | 'profile';

export interface ChatMessage {
  id: string;
  senderId: 'me' | string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  timestamp: string;
  isRead?: boolean;
  status?: 'sending' | 'sent' | 'delivered';
}

export interface Conversation {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatar: string;
  isVerified?: boolean;
  isOnline?: boolean;
  lastSeen?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: ChatMessage[];
}

export interface StoryItem {
  id: string;
  username: string; // e.g. '@ankurarya4095'
  displayName: string;
  avatar: string;
  isVerified?: boolean;
  storyMediaUrl: string;
  caption?: string;
  timestamp: string;
  isViewed?: boolean;
}
