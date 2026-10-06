import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  BadgeCheck,
  Grid,
  Share2,
  Send,
  UserCheck,
  UserPlus,
  Play,
  Heart,
  MessageCircle,
  MoreVertical,
  Link as LinkIcon,
  Film,
} from 'lucide-react';
import { Reel } from '../types';
import { AuthUser } from '../utils/authStorage';
import { useTheme } from '../context/ThemeContext';
import { formatCount } from '../utils/formatters';
import { fetchSupabaseProfile, fetchUserMetricsFromSupabase } from '../utils/supabaseClient';

export interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string | null;
  reels: Reel[];
  currentUser?: AuthUser | null;
  onOpenChatWithUser?: (username: string) => void;
  onOpenReel?: (reelId: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  username,
  reels,
  currentUser,
  onOpenChatWithUser,
  onOpenReel,
}) => {
  const { isDark } = useTheme();

  // Find sample reel for creator fallback details
  const creatorSampleReel = useMemo(() => {
    if (!username) return null;
    const clean = username.toLowerCase().replace(/^@/, '');
    return reels.find((r) => r.username.toLowerCase().replace(/^@/, '') === clean) || null;
  }, [username, reels]);

  // Filter all reels published by this creator
  const creatorReels = useMemo(() => {
    if (!username) return [];
    const clean = username.toLowerCase().replace(/^@/, '');
    return reels.filter((r) => r.username.toLowerCase().replace(/^@/, '') === clean);
  }, [username, reels]);

  // Profile metadata
  const [displayName, setDisplayName] = useState<string>(
    creatorSampleReel?.displayName || username || 'Creator'
  );
  const [avatar, setAvatar] = useState<string>(
    creatorSampleReel?.avatar ||
      `https://api.dicebear.com/7.x/bottts/svg?seed=${username}&backgroundColor=06b6d4,a855f7`
  );
  const [bio, setBio] = useState<string>(
    creatorSampleReel?.caption
      ? `${creatorSampleReel.caption.slice(0, 80)}...`
      : '✨ Creating reels & sharing moments on GediOn'
  );
  const [website, setWebsite] = useState<string>('');
  const [followersCount, setFollowersCount] = useState<number>(() => {
    const base = creatorSampleReel?.likesCount ? Math.floor(creatorSampleReel.likesCount * 1.8) : 240;
    return Math.max(base, 12);
  });
  const [followingCount, setFollowingCount] = useState<number>(185);

  // Follow State persisted to localStorage
  const [isFollowing, setIsFollowing] = useState<boolean>(() => {
    if (!username) return false;
    try {
      const stored = localStorage.getItem('gedion_followed_users_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.includes(username.toLowerCase().replace(/^@/, ''))) {
          return true;
        }
      }
    } catch {}
    return Boolean(creatorSampleReel?.isFollowing);
  });

  const [activeTab, setActiveTab] = useState<'reels' | 'tagged'>('reels');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync profile details from Supabase when modal opens
  useEffect(() => {
    if (!isOpen || !username) return;

    const clean = username.toLowerCase().replace(/^@/, '');

    // Check localStorage followed state
    try {
      const stored = localStorage.getItem('gedion_followed_users_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setIsFollowing(parsed.includes(clean));
        }
      }
    } catch {}

    // Set initial display name & avatar from sample reel
    if (creatorSampleReel) {
      if (creatorSampleReel.displayName) setDisplayName(creatorSampleReel.displayName);
      if (creatorSampleReel.avatar) setAvatar(creatorSampleReel.avatar);
    }

    // Fetch cloud profile from Supabase
    fetchSupabaseProfile(clean).then((profile) => {
      if (profile) {
        if (profile.name) setDisplayName(profile.name);
        if (profile.avatar) setAvatar(profile.avatar);
        if (profile.bio) setBio(profile.bio);
        if (profile.link) setWebsite(profile.link);
      }
    });

    // Fetch cloud metrics
    fetchUserMetricsFromSupabase(undefined, clean).then((metrics) => {
      if (metrics.followersCount > 0) {
        setFollowersCount(metrics.followersCount);
      }
      if (metrics.followingCount > 0) {
        setFollowingCount(metrics.followingCount);
      }
    });
  }, [isOpen, username, creatorSampleReel]);

  // Toggle Follow / Unfollow
  const handleToggleFollow = () => {
    if (!username) return;
    const clean = username.toLowerCase().replace(/^@/, '');
    const next = !isFollowing;
    setIsFollowing(next);
    setFollowersCount((prev) => (next ? prev + 1 : Math.max(0, prev - 1)));

    try {
      const stored = localStorage.getItem('gedion_followed_users_v1');
      let arr: string[] = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(arr)) arr = [];
      if (next) {
        if (!arr.includes(clean)) arr.push(clean);
      } else {
        arr = arr.filter((u) => u !== clean);
      }
      localStorage.setItem('gedion_followed_users_v1', JSON.stringify(arr));
    } catch {}

    setToastMessage(next ? `Followed @${clean}` : `Unfollowed @${clean}`);
    setTimeout(() => setToastMessage(null), 2200);
  };

  const handleMessageUser = () => {
    if (!username) return;
    onClose();
    onOpenChatWithUser?.(username);
  };

  const handleShareProfile = async () => {
    if (!username) return;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `@${username} on GediOn`,
          text: `Check out @${username}'s profile and reels on GediOn!`,
          url,
        });
        return;
      } catch {}
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setToastMessage('Profile link copied to clipboard');
      setTimeout(() => setToastMessage(null), 2500);
    }
  };

  if (!isOpen || !username) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: '100%' }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="fixed inset-0 z-[80] max-w-[440px] mx-auto h-[100dvh] flex flex-col bg-black text-white select-none overflow-hidden"
      >
        {/* Top Header Bar: Left Arrow (←), Username Title, and Right Actions */}
        <header className="w-full h-12 px-3 flex items-center justify-between border-b border-zinc-800/80 bg-black/95 backdrop-blur-md shrink-0 z-10">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onClose}
              aria-label="Back"
              className="p-1.5 -ml-1 rounded-full text-white/90 hover:text-white hover:bg-zinc-800/80 active:scale-90 transition-transform cursor-pointer"
            >
              <ArrowLeft size={22} strokeWidth={2.4} />
            </button>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-base tracking-tight truncate max-w-[200px]">
                {username}
              </span>
              {creatorSampleReel?.isVerified && (
                <BadgeCheck size={16} className="fill-[#0095f6] text-black shrink-0" />
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleShareProfile}
              aria-label="Share profile"
              className="p-2 rounded-full text-zinc-300 hover:text-white hover:bg-zinc-800 active:scale-90 transition-all cursor-pointer"
            >
              <Share2 size={19} />
            </button>
          </div>
        </header>

        {/* Scrollable Profile Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-16">
          {/* Creator Profile Header: Avatar & Counts */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center justify-between gap-4">
              {/* Creator Big Avatar with Instagram Gradient Ring */}
              <div className="relative p-[2px] rounded-full bg-gradient-to-tr from-[#fba73f] via-[#dc2743] to-[#bc1888] shrink-0">
                <div className="p-[2px] rounded-full bg-black">
                  <img
                    src={avatar}
                    alt={displayName}
                    className="w-[76px] h-[76px] rounded-full object-cover"
                  />
                </div>
              </div>

              {/* Stats Counters (Posts, Followers, Following) */}
              <div className="flex-1 flex items-center justify-around text-center">
                <div className="flex flex-col items-center">
                  <span className="text-base font-extrabold tracking-tight">
                    {creatorReels.length}
                  </span>
                  <span className="text-xs text-zinc-400 font-medium">Posts</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-base font-extrabold tracking-tight">
                    {formatCount(followersCount)}
                  </span>
                  <span className="text-xs text-zinc-400 font-medium">Followers</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-base font-extrabold tracking-tight">
                    {formatCount(followingCount)}
                  </span>
                  <span className="text-xs text-zinc-400 font-medium">Following</span>
                </div>
              </div>
            </div>

            {/* Display Name, Category & Bio */}
            <div className="mt-3 flex flex-col">
              <span className="font-bold text-sm leading-tight">{displayName}</span>
              <span className="text-xs text-zinc-400 font-medium mt-0.5">Digital Creator</span>
              {bio && (
                <p className="text-xs text-zinc-200 mt-1.5 leading-relaxed whitespace-pre-line">
                  {bio}
                </p>
              )}
              {website && (
                <a
                  href={website.startsWith('http') ? website : `https://${website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-[#0095f6] hover:underline mt-1 font-medium truncate"
                >
                  <LinkIcon size={12} className="shrink-0" />
                  <span>{website.replace(/^https?:\/\//, '')}</span>
                </a>
              )}
            </div>

            {/* Action Buttons: Follow & Message */}
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleFollow}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 shadow-sm ${
                  isFollowing
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700/80'
                    : 'bg-[#0095f6] hover:bg-[#1877f2] text-white'
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck size={14} />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={14} />
                    <span>Follow</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleMessageUser}
                className="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] transition-all text-white border border-zinc-700/80 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Send size={13} className="-rotate-12" />
                <span>Message</span>
              </button>
            </div>
          </div>

          {/* Grid Tabs: Reels / Tagged */}
          <div className="flex items-center border-t border-zinc-800/80 mt-2">
            <button
              type="button"
              onClick={() => setActiveTab('reels')}
              className={`flex-1 py-2.5 flex items-center justify-center gap-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'reels'
                  ? 'border-white text-white font-bold'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Grid size={18} />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tagged')}
              className={`flex-1 py-2.5 flex items-center justify-center gap-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'tagged'
                  ? 'border-white text-white font-bold'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Film size={18} />
            </button>
          </div>

          {/* 3-Column Posts / Reels Grid */}
          {creatorReels.length > 0 ? (
            <div className="grid grid-cols-3 gap-0.5 mt-0.5">
              {creatorReels.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    onClose();
                    onOpenReel?.(item.id);
                  }}
                  className="relative aspect-[3/4] bg-zinc-900 overflow-hidden cursor-pointer group active:opacity-90"
                >
                  {item.poster ? (
                    <img
                      src={item.poster}
                      alt={item.caption || 'Reel thumbnail'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : item.videoUrl ? (
                    <video
                      src={item.videoUrl}
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-600">
                      <Film size={24} />
                    </div>
                  )}

                  {/* Play & Views count overlay */}
                  <div className="absolute bottom-1.5 left-1.5 z-10 flex items-center gap-1 text-[11px] font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
                    <Play size={10} className="fill-white" />
                    <span>{item.viewsCount || '250'}</span>
                  </div>

                  {/* Gradient bottom scrim */}
                  <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
                </div>
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-3">
                <Film size={24} />
              </div>
              <h4 className="text-sm font-bold tracking-tight text-white">No Posts Yet</h4>
              <p className="text-xs text-zinc-500 mt-1 max-w-[200px]">
                When @{username} shares reels, they will appear here.
              </p>
            </div>
          )}
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/95 border border-zinc-700 text-xs font-bold text-white shadow-xl backdrop-blur-md pointer-events-none">
            <span>{toastMessage}</span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
