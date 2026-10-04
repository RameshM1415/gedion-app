import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ArrowLeft,
  Check,
  Camera,
  Settings,
  Grid,
  Bookmark,
  Heart,
  Link as LinkIcon,
  Share2,
  Sparkles,
  Play,
  Volume2,
  VolumeX,
  MessageCircle,
  Plus,
  ShieldCheck,
  Activity,
  Loader2,
  Tv,
  Wallet,
  ArrowUpRight,
  LogOut,
  LogIn,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import { Reel } from '../types';
import { compressImageFile } from '../utils/mediaUtils';
import { SettingsModal } from './SettingsModal';
import { ShareProfileModal } from './ShareProfileModal';
import { CreatorInsightsModal } from './CreatorInsightsModal';
import { WalletScreen } from './WalletScreen';
import { ReelOptionsMenu } from './ReelOptionsMenu';
import { AuthUser, DEFAULT_AUTH_USER, getStoredAuth } from '../utils/authStorage';
import { useTheme } from '../context/ThemeContext';
import {
  supabase,
  mapSupabaseRowToReel,
  SupabaseReelRow,
  syncProfileToSupabase,
  fetchSupabaseProfile,
  fetchUserMetricsFromSupabase,
  fetchUserPostsFromSupabase,
  deleteReelFromSupabase,
  UserProfileData,
} from '../utils/supabaseClient';

export type { UserProfileData };

const STORAGE_KEY = 'gedion_user_profile_v1';
const SAVED_REELS_STORAGE_KEY = 'gedion_saved_reels_v1';

const DEFAULT_PROFILE: UserProfileData = {
  name: 'Creator',
  username: 'creator',
  bio: '',
  link: '',
  gender: 'Prefer not to say',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
};

export interface ProfileScreenProps {
  onClose: () => void;
  reels: Reel[];
  onOpenReel?: (reelId: string) => void;
  onOpenCreateReel?: () => void;
  onEditingChange?: (isEditing: boolean) => void;
  onOpenAuthModal?: (prompt?: string) => void;
  onOpenOnboardingVideo?: () => void;
  onSignOut?: () => void;
  onDeleteReel?: (reelId: string) => void;
  currentUser?: AuthUser | null;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onClose,
  reels,
  onOpenReel,
  onOpenCreateReel,
  onEditingChange,
  onOpenAuthModal,
  onOpenOnboardingVideo,
  onSignOut,
  onDeleteReel,
  currentUser,
}) => {
  const { isDark } = useTheme();
  // Load persisted user profile or initialize from authenticated session
  const [profile, setProfile] = useState<UserProfileData>(() => {
    const active = currentUser || getStoredAuth() || DEFAULT_AUTH_USER;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (active && parsed.username === 'creator' && active.username !== 'creator') {
          return {
            ...DEFAULT_PROFILE,
            ...parsed,
            name: active.displayName || active.username,
            username: active.username,
            avatar: active.avatar || parsed.avatar,
          };
        }
        return { ...DEFAULT_PROFILE, ...parsed };
      }
    } catch {
      // ignore
    }
    if (active) {
      return {
        ...DEFAULT_PROFILE,
        name: active.displayName || active.username || DEFAULT_PROFILE.name,
        username: active.username || DEFAULT_PROFILE.username,
        avatar: active.avatar || DEFAULT_PROFILE.avatar,
      };
    }
    return DEFAULT_PROFILE;
  });

  // Sync profile when currentUser prop changes
  useEffect(() => {
    if (currentUser) {
      setProfile((prev) => ({
        ...prev,
        name: currentUser.displayName || currentUser.username || prev.name,
        username: currentUser.username || prev.username,
        avatar: currentUser.avatar || prev.avatar,
      }));
    }
  }, [currentUser]);

  const [activeProfileTab, setActiveProfileTab] = useState<'reels' | 'saved'>('reels');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dynamic Wallet Balance state (defaults strictly to 0)
  const [walletBalance, setWalletBalance] = useState<number>(0);

  // Real Supabase User Metrics (start strictly at 0)
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);
  const [totalLikesCount, setTotalLikesCount] = useState<number>(0);

  // Creator's uploaded reels from Supabase 'posts' table & local state
  const [creatorReels, setCreatorReels] = useState<Reel[]>([]);
  const [isLoadingReels, setIsLoadingReels] = useState(false);

  // Full-screen playback state for tapped grid item
  const [playbackReel, setPlaybackReel] = useState<Reel | null>(null);
  const [playbackMuted, setPlaybackMuted] = useState(false);

  // Saved reels state persisted in localStorage
  const [savedReelIds, setSavedReelIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(SAVED_REELS_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return reels.filter((r) => r.isBookmarked).map((r) => r.id);
  });

  // Fetch creator reels from Supabase `posts` / `reels` table
  const loadCreatorReels = useCallback(async () => {
    setIsLoadingReels(true);
    const active = currentUser || getStoredAuth() || DEFAULT_AUTH_USER;
    const targetUserId = active?.id;
    const targetUsername = active?.username || profile.username || 'rameshrao034';
    const targetDisplayName = active?.displayName || profile.name;

    try {
      // 1. Accurately query Supabase's posts / reels table for the logged-in user's uploads
      const userPosts = await fetchUserPostsFromSupabase(
        targetUserId,
        targetUsername,
        targetDisplayName
      );

      // 2. Also check any local custom reels published in current browser storage
      let localCustom: Reel[] = [];
      try {
        const raw = localStorage.getItem('gedion_custom_reels');
        if (raw) localCustom = JSON.parse(raw);
      } catch (e) {
        console.warn('Error reading local custom reels', e);
      }

      const cleanUser = targetUsername.toLowerCase().replace(/^@/, '');
      const isRamesh = cleanUser === 'rameshrao034' || (targetUserId && targetUserId.includes('rameshrao034'));

      const validLocal = localCustom.filter((r) => {
        if (r.id.startsWith('mock_')) return false;
        if (targetUserId && r.creatorId === targetUserId) return true;
        const u = r.username.toLowerCase().replace(/^@/, '');
        if (u === cleanUser) return true;
        if (isRamesh && u === 'rameshrao034') return true;
        return false;
      });

      // Merge and deduplicate by id and videoUrl
      const combined = [...validLocal, ...userPosts];
      const seen = new Set<string>();
      const deduped: Reel[] = [];
      for (const r of combined) {
        const key = String(r.id || r.videoUrl || '');
        if (key && !seen.has(key)) {
          seen.add(key);
          deduped.push(r);
        }
      }

      setCreatorReels(deduped);
    } catch (err) {
      console.warn('Error loading creator posts:', err);
    } finally {
      setIsLoadingReels(false);
    }
  }, [currentUser, profile.username, profile.name]);

  // Reel Options Menu & Delete State
  const [optionsReel, setOptionsReel] = useState<Reel | null>(null);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [profileToast, setProfileToast] = useState<string | null>(null);

  const handleOpenReelOptions = useCallback((reel: Reel) => {
    setOptionsReel(reel);
    setIsOptionsOpen(true);
  }, []);

  const handleCloseReelOptions = useCallback(() => {
    setIsOptionsOpen(false);
    setOptionsReel(null);
  }, []);

  const handleDeleteReelFromProfile = useCallback(async (reelId: string) => {
    // 1. Optimistically decrement REELS count and remove immediately from creatorReels & savedReels
    setCreatorReels((prev) => prev.filter((r) => r.id !== reelId));
    setSavedReelIds((prev) => prev.filter((id) => id !== reelId));

    // 2. Dismiss playback modal if currently open
    setPlaybackReel((current) => (current?.id === reelId ? null : current));

    // 3. Notify parent applet state
    onDeleteReel?.(reelId);

    // 4. Broadcast global reel-deleted event so all app views stay in sync
    window.dispatchEvent(
      new CustomEvent('reel-deleted', { detail: { reelId } })
    );

    // 5. Show quick success toast notification
    setProfileToast('Reel deleted successfully');
    setTimeout(() => setProfileToast(null), 3200);

    // 6. Close options modal
    setIsOptionsOpen(false);
    setOptionsReel(null);

    // 7. Delete in background from Supabase
    await deleteReelFromSupabase(reelId);
  }, [onDeleteReel]);

  // Listen for newly published reels via upload modal AND deleted reels:
  // Optimistically increment/decrement REELS count immediately without page reload!
  useEffect(() => {
    const handleReelPublished = (e: Event) => {
      const customEvent = e as CustomEvent<Reel>;
      const newReel = customEvent.detail;
      if (newReel) {
        // Optimistically increment REELS count and prepend to creatorReels grid
        setCreatorReels((prev) => {
          const filtered = prev.filter((r) => r.id !== newReel.id);
          return [newReel, ...filtered];
        });
      }
      // Re-fetch from Supabase immediately so the count updates instantly without requiring a page reload
      loadCreatorReels();
    };

    const handleReelDeleted = (e: Event) => {
      const customEvent = e as CustomEvent<{ reelId: string }>;
      const deletedId = customEvent.detail?.reelId;
      if (deletedId) {
        setCreatorReels((prev) => prev.filter((r) => r.id !== deletedId));
        setSavedReelIds((prev) => prev.filter((id) => id !== deletedId));
        setPlaybackReel((current) => (current?.id === deletedId ? null : current));
      }
    };

    window.addEventListener('reel-published', handleReelPublished);
    window.addEventListener('reel-deleted', handleReelDeleted);
    return () => {
      window.removeEventListener('reel-published', handleReelPublished);
      window.removeEventListener('reel-deleted', handleReelDeleted);
    };
  }, [loadCreatorReels]);

  // Ensure any reels uploaded and present in parent reels state are also reflected in creatorReels
  useEffect(() => {
    if (Array.isArray(reels) && reels.length > 0) {
      const active = currentUser || getStoredAuth() || DEFAULT_AUTH_USER;
      const targetUserId = active?.id;
      const cleanUser = (active?.username || profile.username || 'rameshrao034').toLowerCase().replace(/^@/, '');
      const isRamesh = cleanUser === 'rameshrao034' || (targetUserId && targetUserId.includes('rameshrao034'));

      const userReelsFromProps = reels.filter((r) => {
        if (r.id.startsWith('mock_')) return false;
        if (targetUserId && r.creatorId === targetUserId) return true;
        const u = r.username.toLowerCase().replace(/^@/, '');
        if (u === cleanUser) return true;
        if (isRamesh && u === 'rameshrao034') return true;
        return false;
      });

      if (userReelsFromProps.length > 0) {
        setCreatorReels((prev) => {
          const seen = new Set(prev.map((p) => p.id || p.videoUrl));
          const toAdd = userReelsFromProps.filter((r) => !seen.has(r.id || r.videoUrl));
          if (toAdd.length === 0) return prev;
          return [...toAdd, ...prev];
        });
      }
    }
  }, [reels, currentUser, profile.username]);

  // Sync profile, metrics, and wallet balance from Supabase on mount
  useEffect(() => {
    let isMounted = true;
    const active = currentUser || getStoredAuth() || DEFAULT_AUTH_USER;

    if (profile.username) {
      fetchSupabaseProfile(profile.username).then((cloudData) => {
        if (isMounted && cloudData) {
          setProfile((prev) => ({
            ...prev,
            ...cloudData,
          }));
        }
      });
    }

    // Fetch real followers, following, and likes counts from Supabase
    fetchUserMetricsFromSupabase(active?.id, active?.username || profile.username).then((metrics) => {
      if (isMounted) {
        setFollowersCount(metrics.followersCount);
        setFollowingCount(metrics.followingCount);
        setTotalLikesCount(metrics.totalLikesCount);
      }
    });

    // Fetch real wallet balance from Supabase 'wallets' table
    if (active?.id) {
      supabase
        .from('wallets')
        .select('*')
        .eq('user_id', active.id)
        .maybeSingle()
        .then(({ data }) => {
          if (isMounted && data) {
            const bal =
              typeof data.coins === 'number'
                ? data.coins
                : typeof data.balance === 'number'
                ? data.balance
                : 0;
            setWalletBalance(bal);
          }
        });
    } else {
      setWalletBalance(0);
    }

    loadCreatorReels();

    return () => {
      isMounted = false;
    };
  }, [profile.username, currentUser, loadCreatorReels]);

  // 3. Likes & Engagement Aggregation:
  // Calculate total LIKES counter on profile by summing the likes_count across all reels published by this user
  const dynamicLikesCount = useMemo(() => {
    const sumFromReels = creatorReels.reduce((acc, r) => acc + (Number(r.likesCount) || 0), 0);
    return Math.max(sumFromReels, totalLikesCount);
  }, [creatorReels, totalLikesCount]);

  // Sync savedReelIds to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SAVED_REELS_STORAGE_KEY, JSON.stringify(savedReelIds));
    } catch {
      // ignore
    }
  }, [savedReelIds]);

  // Listen for external saved reel updates
  useEffect(() => {
    const handleSavedUpdate = () => {
      try {
        const stored = localStorage.getItem(SAVED_REELS_STORAGE_KEY);
        if (stored) {
          setSavedReelIds(JSON.parse(stored));
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('saved-reels-updated', handleSavedUpdate);
    window.addEventListener('storage', handleSavedUpdate);
    return () => {
      window.removeEventListener('saved-reels-updated', handleSavedUpdate);
      window.removeEventListener('storage', handleSavedUpdate);
    };
  }, []);

  // Sync edit modal state to parent to hide BottomNav
  useEffect(() => {
    onEditingChange?.(
      isEditModalOpen || isSettingsModalOpen || isShareModalOpen || isInsightsOpen || isWalletOpen || playbackReel !== null
    );
  }, [
    isEditModalOpen,
    isSettingsModalOpen,
    isShareModalOpen,
    isInsightsOpen,
    isWalletOpen,
    playbackReel,
    onEditingChange,
  ]);

  // Sync wallet balance updates
  useEffect(() => {
    const handleWalletUpdate = () => {
      try {
        const stored = localStorage.getItem('gedion_wallet_balance_v2');
        if (stored !== null) {
          const val = parseFloat(stored);
          if (!isNaN(val)) setWalletBalance(val);
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('storage', handleWalletUpdate);
    return () => window.removeEventListener('storage', handleWalletUpdate);
  }, []);

  // Edit Modal Draft Form State
  const [draftName, setDraftName] = useState(profile.name);
  const [draftUsername, setDraftUsername] = useState(profile.username);
  const [draftBio, setDraftBio] = useState(profile.bio);
  const [draftLink, setDraftLink] = useState(profile.link);
  const [draftGender, setDraftGender] = useState<UserProfileData['gender']>(profile.gender);
  const [draftAvatar, setDraftAvatar] = useState(profile.avatar);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  const handleOpenEditModal = () => {
    if (!currentUser) {
      onOpenAuthModal?.('Sign in to customize your creator profile!');
      return;
    }
    setDraftName(profile.name);
    setDraftUsername(profile.username);
    setDraftBio(profile.bio);
    setDraftLink(profile.link);
    setDraftGender(profile.gender);
    setDraftAvatar(profile.avatar);
    setIsEditModalOpen(true);
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImageFile(file, 400, 400, 0.85);
      setDraftAvatar(compressed);
    } catch (err) {
      console.error('Error compressing profile picture:', err);
    }
    e.target.value = '';
  };

  const handleUsernameChange = (val: string) => {
    const clean = val.replace(/^@+/, '').trim();
    setDraftUsername(clean);
  };

  // 1. Sync and persist profile changes with Supabase `profiles` table
  const handleSaveProfile = async () => {
    const cleanedUsername = draftUsername.replace(/^@+/, '').trim() || 'user';
    const updatedProfile: UserProfileData = {
      name: draftName.trim() || 'Creator',
      username: cleanedUsername,
      bio: draftBio.trim(),
      link: draftLink.trim(),
      gender: draftGender,
      avatar: draftAvatar,
    };

    setIsSavingProfile(true);
    setProfile(updatedProfile);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProfile));
      window.dispatchEvent(new Event('profile-updated'));
    } catch (err) {
      console.error('Failed to save profile to localStorage:', err);
    }

    // Persist to Supabase `profiles` table
    await syncProfileToSupabase(updatedProfile, currentUser?.id);
    setIsSavingProfile(false);
    setIsEditModalOpen(false);
    showToast('Profile updated & synced to cloud! 🚀');
  };

  // Filter saved reels
  const savedReels = reels.filter((r) => r.isBookmarked || savedReelIds.includes(r.id));

  // 2. Tap to open full-screen playback
  const handleTileClick = (reel: Reel) => {
    if (onOpenReel) {
      onOpenReel(reel.id);
    } else {
      setPlaybackReel(reel);
    }
  };

  return (
    <div
      className={`absolute inset-0 z-30 flex flex-col pt-3 pb-24 px-4 overflow-y-auto no-scrollbar select-none transition-colors ${
        isDark ? 'bg-black text-white' : 'bg-white text-black'
      }`}
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-bold text-white shadow-xl backdrop-blur-xl"
          >
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Header: Username with verification badge, settings gear icon, and share profile action */}
      <div
        className={`flex items-center justify-between pb-3 border-b shrink-0 transition-colors ${
          isDark ? 'border-[#262626]' : 'border-[#efefef]'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-base tracking-tight">@{profile.username}</span>
          {currentUser && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#0095f6] text-white text-[10px] font-black">
              ✓
            </span>
          )}
          {currentUser ? (
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-500/10 border border-zinc-500/20 text-[10px] font-semibold text-zinc-400"
            >
              <ShieldCheck size={11} />
              <span>Verified</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenAuthModal?.('Sign in to access your creator profile & reels!')}
              className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-semibold text-blue-500 cursor-pointer"
            >
              <LogIn size={10} />
              <span>Guest</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Share Profile Action Button */}
          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            aria-label="Share profile"
            className="p-2 rounded-full hover:opacity-75 active:scale-95 transition-all"
          >
            <Share2 size={18} />
          </button>

          {/* Settings Gear Icon Button */}
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            aria-label="Settings"
            className="p-2 rounded-full hover:opacity-75 active:scale-95 transition-all"
          >
            <Settings size={18} />
          </button>

          {/* Close / Back to Feed */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Back to Feed"
            className="p-2 rounded-full hover:opacity-75 active:scale-95 transition-all"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* 1. Profile Card: Circular avatar with IG gradient ring, stats row, full name, handle, bio */}
      <div className="flex flex-col items-center mt-4">
        {/* Circular avatar with Instagram gradient ring and Camera badge */}
        <div className="relative">
          <div className="h-24 w-24 rounded-full p-[2.5px] bg-gradient-to-tr from-[#fba73f] via-[#dc2743] to-[#bc1888]">
            <img
              src={profile.avatar}
              alt="Creator avatar"
              className={`h-full w-full rounded-full object-cover border-2 ${
                isDark ? 'border-black' : 'border-white'
              }`}
            />
          </div>

          {/* "Edit / Camera" Badge Button */}
          <button
            type="button"
            onClick={handleOpenEditModal}
            aria-label="Edit avatar"
            className={`absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-[#0095f6] text-white border-2 hover:scale-110 active:scale-95 transition-transform cursor-pointer shadow-sm ${
              isDark ? 'border-black' : 'border-white'
            }`}
          >
            <Camera size={14} strokeWidth={2.5} />
          </button>
        </div>

        {/* Full Name & Handle (@creator) */}
        <div className="flex flex-col items-center mt-3 text-center">
          <h2 className="font-bold text-base tracking-tight">
            {profile.name}
          </h2>
          <span className="text-xs text-zinc-500 font-medium">
            @{profile.username}
          </span>
        </div>

        {/* Editable Bio text */}
        {profile.bio && (
          <p
            className={`text-xs max-w-xs text-center mt-1.5 leading-relaxed font-normal ${
              isDark ? 'text-zinc-300' : 'text-zinc-700'
            }`}
          >
            {profile.bio}
          </p>
        )}

        {/* Attached Link */}
        {profile.link && (
          <a
            href={profile.link.startsWith('http') ? profile.link : `https://${profile.link}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 mt-1.5 text-xs text-[#0095f6] hover:underline"
          >
            <LinkIcon size={12} />
            <span className="truncate max-w-[240px]">{profile.link.replace(/^https?:\/\//, '')}</span>
          </a>
        )}

        {/* Stats Row: Reels Count, Followers Count, Following Count, and Likes Count */}
        <div
          className={`flex items-center justify-around w-full max-w-sm mt-4 py-2 px-4 rounded-xl border transition-colors ${
            isDark ? 'bg-zinc-950 border-[#262626]' : 'bg-zinc-50 border-[#efefef]'
          }`}
        >
          <div className="flex flex-col items-center">
            <span className="font-bold text-sm">
              {creatorReels.length}
            </span>
            <span className="text-[11px] text-zinc-500 mt-0.5">
              Reels
            </span>
          </div>
          <div className={`h-6 w-[1px] ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
          <div className="flex flex-col items-center">
            <span className="font-bold text-sm">
              {followersCount.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-zinc-500 mt-0.5">
              Followers
            </span>
          </div>
          <div className={`h-6 w-[1px] ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
          <div className="flex flex-col items-center">
            <span className="font-bold text-sm">
              {followingCount.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-zinc-500 mt-0.5">
              Following
            </span>
          </div>
          <div className={`h-6 w-[1px] ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
          <div className="flex flex-col items-center">
            <span className="font-bold text-sm">
              {dynamicLikesCount.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-zinc-500 mt-0.5">
              Likes
            </span>
          </div>
        </div>

        {/* Action Buttons: "Edit Profile", "Share Profile", "Insights" */}
        <div className="flex items-center gap-2 mt-4 w-full max-w-sm">
          <button
            type="button"
            onClick={handleOpenEditModal}
            className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-semibold active:scale-95 transition-all cursor-pointer ${
              isDark
                ? 'bg-zinc-900 hover:bg-zinc-800 border-[#262626] text-white'
                : 'bg-zinc-100 hover:bg-zinc-200 border-[#efefef] text-black'
            }`}
          >
            <span>Edit profile</span>
          </button>
          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-semibold active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              isDark
                ? 'bg-zinc-900 hover:bg-zinc-800 border-[#262626] text-white'
                : 'bg-zinc-100 hover:bg-zinc-200 border-[#efefef] text-black'
            }`}
          >
            <Share2 size={13} />
            <span>Share profile</span>
          </button>
          <button
            type="button"
            onClick={() => setIsInsightsOpen(true)}
            className={`py-1.5 px-3 rounded-lg border text-xs font-semibold active:scale-95 transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
              isDark
                ? 'bg-zinc-900 hover:bg-zinc-800 border-[#262626] text-white'
                : 'bg-zinc-100 hover:bg-zinc-200 border-[#efefef] text-black'
            }`}
            title="Creator Insights & Analytics"
          >
            <Activity size={14} />
            <span>Insights</span>
          </button>
        </div>

        {/* Creator Wallet Card */}
        <div className="w-full max-w-sm mt-3.5">
          <button
            type="button"
            onClick={() => setIsWalletOpen(true)}
            className={`w-full rounded-xl p-3 border flex items-center justify-between transition-colors active:scale-98 cursor-pointer ${
              isDark
                ? 'bg-zinc-950 hover:bg-zinc-900 border-[#262626] text-white'
                : 'bg-zinc-50 hover:bg-zinc-100 border-[#efefef] text-black'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                  isDark ? 'bg-zinc-900 text-white' : 'bg-zinc-200 text-zinc-900'
                }`}
              >
                <Wallet size={18} />
              </div>

              <div className="text-left min-w-0">
                <p className="text-xs font-bold tracking-tight">Creator Wallet &amp; Earnings</p>
                <p className="text-xs text-emerald-500 font-semibold mt-0.5">
                  ₹{walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} • Instant Payout
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs font-semibold text-zinc-400">
              <span>View</span>
              <ArrowUpRight size={14} />
            </div>
          </button>
        </div>

        {/* Authentication Action: Sign Out button when logged in, or Log In button if guest */}
        <div className="w-full max-w-sm mt-3">
          {currentUser ? (
            <button
              type="button"
              onClick={onSignOut}
              className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/15 active:scale-98 text-xs font-semibold text-rose-500 border border-rose-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut size={14} />
              <span>Log Out (@{profile.username})</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenAuthModal?.('Sign in to access your creator profile & broadcast reels!')}
              className="w-full py-2 px-4 rounded-xl bg-[#0095f6] hover:bg-[#1877f2] active:scale-98 text-xs font-bold text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <LogIn size={15} />
              <span>Log In to GediOn</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Creator Video Grid & Tabs: Tab 1 "Reels", Tab 2 "Saved" */}
      <div
        className={`flex items-center justify-around mt-6 border-b shrink-0 transition-colors ${
          isDark ? 'border-[#262626]' : 'border-[#efefef]'
        }`}
      >
        <button
          type="button"
          onClick={() => setActiveProfileTab('reels')}
          className={`flex items-center gap-1.5 pb-2.5 text-xs font-bold transition-all ${
            activeProfileTab === 'reels'
              ? isDark
                ? 'text-white border-b-2 border-white'
                : 'text-black border-b-2 border-black'
              : 'text-zinc-400 border-b-2 border-transparent hover:text-zinc-600'
          }`}
        >
          <Grid size={16} />
          <span>Reels ({creatorReels.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveProfileTab('saved')}
          className={`flex items-center gap-1.5 pb-2.5 text-xs font-bold transition-all ${
            activeProfileTab === 'saved'
              ? isDark
                ? 'text-white border-b-2 border-white'
                : 'text-black border-b-2 border-black'
              : 'text-zinc-400 border-b-2 border-transparent hover:text-zinc-600'
          }`}
        >
          <Bookmark size={16} />
          <span>Saved ({savedReels.length})</span>
        </button>
      </div>

      {/* Tab 1: "My Reels" - 3-column grid or Empty State */}
      {activeProfileTab === 'reels' ? (
        <div className="mt-3 min-h-[220px]">
          {isLoadingReels ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500 gap-2">
              <Loader2 size={24} className="animate-spin text-zinc-400" />
              <span className="text-xs">Loading reels...</span>
            </div>
          ) : creatorReels.length > 0 ? (
            /* 3-Column Video Grid */
            <div className="grid grid-cols-3 gap-1">
              {creatorReels.map((reel) => {
                const isVideo = reel.mediaType === 'video' || (!reel.mediaType && Boolean(reel.videoUrl));
                return (
                  <div
                    key={reel.id}
                    onClick={() => handleTileClick(reel)}
                    className={`group relative aspect-[9/15] overflow-hidden cursor-pointer transition-all active:scale-95 ${
                      isDark ? 'bg-zinc-900' : 'bg-zinc-100'
                    }`}
                  >
                    {reel.poster ? (
                      <img
                        src={reel.poster}
                        alt={reel.caption || 'Creator Reel'}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <video
                        src={`${reel.videoUrl}#t=0.001`}
                        preload="metadata"
                        muted
                        playsInline
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 pointer-events-none"
                      />
                    )}

                    {/* 3-Dots Options Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenReelOptions(reel);
                      }}
                      className="absolute top-1.5 left-1.5 p-1 rounded-full bg-black/60 backdrop-blur-md text-white/90 hover:text-white hover:bg-black/90 transition-colors z-10"
                      aria-label="Reel options"
                    >
                      <MoreVertical size={11} />
                    </button>

                    {/* Play Icon indicator on top-right */}
                    {isVideo && (
                      <div className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 backdrop-blur-md">
                        <Play size={10} className="fill-white text-white translate-x-[0.5px]" />
                      </div>
                    )}

                    {/* View / Likes count badge in bottom-left */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1.5">
                      <span className="text-[10px] font-bold text-white flex items-center gap-1 drop-shadow-md">
                        <Heart size={10} className="fill-white text-white" />
                        {reel.likesCount || reel.viewsCount || '0'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Clean Instagram Profile Empty State */
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-full mb-3 border ${
                  isDark ? 'border-zinc-800 bg-zinc-950 text-zinc-400' : 'border-zinc-200 bg-zinc-50 text-zinc-600'
                }`}
              >
                <Camera size={30} />
              </div>

              <h3 className="text-sm font-bold tracking-tight">
                Share Photos and Videos
              </h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">
                When you share photos and videos, they will appear on your profile.
              </p>

              <button
                type="button"
                onClick={() => {
                  if (onOpenCreateReel) {
                    onOpenCreateReel();
                  } else {
                    onClose();
                  }
                }}
                className="mt-4 px-4 py-2 rounded-lg bg-[#0095f6] text-white text-xs font-bold hover:bg-[#1877f2] active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus size={15} strokeWidth={2.5} />
                <span>Share your first post</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Tab 2: Saved Reels */
        <div className="mt-3 min-h-[220px]">
          {savedReels.length > 0 ? (
            <div className="grid grid-cols-3 gap-1">
              {savedReels.map((reel) => {
                const isVideo = reel.mediaType === 'video' || (!reel.mediaType && Boolean(reel.videoUrl));
                return (
                  <div
                    key={reel.id}
                    onClick={() => handleTileClick(reel)}
                    className={`group relative aspect-[9/15] overflow-hidden cursor-pointer transition-all active:scale-95 ${
                      isDark ? 'bg-zinc-900' : 'bg-zinc-100'
                    }`}
                  >
                    <img
                      src={reel.poster || reel.videoUrl}
                      alt={reel.caption}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />

                    {/* Bookmark badge top-right */}
                    <div className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 backdrop-blur-md">
                      <Bookmark size={11} className="fill-white text-white" />
                    </div>

                    {isVideo && (
                      <div className="absolute top-1.5 left-1.5 p-1 rounded-full bg-black/60 backdrop-blur-md">
                        <Play size={10} className="fill-white text-white translate-x-[0.5px]" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1.5">
                      <span className="text-[10px] font-bold text-white flex items-center gap-1 drop-shadow-md">
                        <Heart size={10} className="fill-white text-white" />
                        {reel.viewsCount || '0'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-full mb-3 border ${
                  isDark ? 'border-zinc-800 bg-zinc-950 text-zinc-400' : 'border-zinc-200 bg-zinc-50 text-zinc-600'
                }`}
              >
                <Bookmark size={26} />
              </div>
              <h3 className="text-sm font-bold tracking-tight">Save</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">
                Save photos and videos that you want to see again. No one is notified, and only you can see what you&apos;ve saved.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* FULL-SCREEN VIDEO PLAYBACK MODAL ON TAP                     */}
      {/* ============================================================ */}
      <AnimatePresence>
        {playbackReel && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[80] flex flex-col bg-black text-white"
          >
            {/* Top Playback Bar */}
            <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
              <button
                type="button"
                onClick={() => setPlaybackReel(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-xs font-bold text-white border border-white/10 hover:bg-black/80"
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPlaybackMuted((prev) => !prev)}
                  className="p-2 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/10 hover:bg-black/80"
                  aria-label={playbackMuted ? 'Unmute' : 'Mute'}
                >
                  {playbackMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenReelOptions(playbackReel)}
                  className="p-2 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/10 hover:border-white/30 hover:bg-black/80"
                  aria-label="Reel options"
                >
                  <MoreVertical size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setPlaybackReel(null)}
                  className="p-2 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/10 hover:bg-black/80"
                  aria-label="Close playback"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Video Player */}
            <div className="relative flex-1 h-full w-full flex items-center justify-center bg-black">
              {playbackReel.videoUrl ? (
                <video
                  src={playbackReel.videoUrl}
                  poster={playbackReel.poster}
                  autoPlay
                  playsInline
                  loop
                  muted={playbackMuted}
                  className="h-full w-full object-cover"
                />
              ) : (
                <img
                  src={playbackReel.poster}
                  alt={playbackReel.caption}
                  className="h-full w-full object-cover"
                />
              )}

              {/* Bottom Scrim & Info */}
              <div className="absolute bottom-0 inset-x-0 p-5 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col gap-1.5 pointer-events-none">
                <span className="font-extrabold text-sm text-white drop-shadow-md">
                  @{playbackReel.username}
                </span>
                <p className="text-xs text-white/90 drop-shadow-sm line-clamp-2">
                  {playbackReel.caption}
                </p>
                <div className="flex items-center gap-4 mt-1 text-xs text-white/70">
                  <span className="flex items-center gap-1 text-rose-500 font-bold">
                    <Heart size={14} className="fill-rose-500 text-rose-500" />
                    {playbackReel.likesCount}
                  </span>
                  <span className="flex items-center gap-1 font-bold text-white/90">
                    <MessageCircle size={14} />
                    {playbackReel.commentsCount || 0}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 1. "EDIT PROFILE" SLIDING BOTTOM MODAL & SUPABASE SYNC       */}
      {/* ============================================================ */}
      <AnimatePresence>
        {isEditModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed bottom-0 inset-x-0 z-[75] flex flex-col h-[82vh] max-h-[82vh] rounded-t-3xl bg-[#090912]/98 backdrop-blur-2xl border-t border-white/15 shadow-[0_-20px_50px_rgba(0,0,0,0.95)] overflow-hidden text-white"
            >
              {/* Drag Handle */}
              <div className="flex justify-center pt-2.5 pb-1 shrink-0">
                <div className="h-1.5 w-11 rounded-full bg-white/30" />
              </div>

              {/* Modal Navigation Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-xs font-semibold text-white/60 hover:text-white"
                >
                  Cancel
                </button>
                <h3 className="font-extrabold text-sm text-white">Edit Profile</h3>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile}
                  className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 text-black font-extrabold text-xs shadow-[0_0_12px_rgba(6,182,212,0.7)] active:scale-95 transition-all flex items-center gap-1"
                >
                  {isSavingProfile ? (
                    <Loader2 size={13} className="animate-spin text-black" />
                  ) : (
                    <Check size={13} strokeWidth={3} />
                  )}
                  <span>Save</span>
                </button>
              </div>

              {/* Form Content */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 no-scrollbar pb-10">
                {/* Avatar change with camera badge */}
                <div className="flex flex-col items-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative cursor-pointer group"
                  >
                    <div className="h-20 w-20 rounded-full p-[2px] bg-gradient-to-tr from-cyan-400 via-fuchsia-500 to-pink-500 shadow-[0_0_20px_rgba(6,182,212,0.5)]">
                      <img
                        src={draftAvatar}
                        alt="Avatar preview"
                        className="h-full w-full rounded-full object-cover border-2 border-black"
                      />
                    </div>
                    <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera size={20} className="text-white drop-shadow" />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 text-xs font-bold text-cyan-300 hover:text-cyan-200"
                  >
                    Change Profile Photo
                  </button>
                </div>

                {/* Display Name */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/60">Display Name</label>
                  <input
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    placeholder="Your creator name"
                    className="w-full rounded-xl bg-white/[0.06] border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                </div>

                {/* Username */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/60">Handle / Username</label>
                  <div className="flex items-center rounded-xl bg-white/[0.06] border border-white/10 px-3.5 py-2.5 focus-within:border-cyan-400 transition-colors">
                    <span className="text-xs font-bold text-cyan-400 mr-1 select-none">@</span>
                    <input
                      type="text"
                      value={draftUsername}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      placeholder="username"
                      className="w-full bg-transparent text-xs text-white placeholder-white/30 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Bio text */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-white/60">Bio</label>
                    <span className={`text-[10px] ${draftBio.length > 150 ? 'text-pink-400' : 'text-white/40'}`}>
                      {draftBio.length} / 150
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={150}
                    value={draftBio}
                    onChange={(e) => setDraftBio(e.target.value)}
                    placeholder="Tell your fans about your craft, aesthetic, or beats..."
                    className="w-full rounded-xl bg-white/[0.06] border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400 transition-colors resize-none"
                  />
                </div>

                {/* Link */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/60">Website / Link</label>
                  <div className="flex items-center rounded-xl bg-white/[0.06] border border-white/10 px-3.5 py-2.5 focus-within:border-cyan-400 transition-colors">
                    <LinkIcon size={14} className="text-white/40 mr-2 shrink-0" />
                    <input
                      type="url"
                      value={draftLink}
                      onChange={(e) => setDraftLink(e.target.value)}
                      placeholder="https://gedion.app/@creator"
                      className="w-full bg-transparent text-xs text-white placeholder-white/30 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Cloud sync indicator info */}
                <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-400/20 text-[11px] text-cyan-200/90 flex items-center gap-2">
                  <Sparkles size={14} className="text-cyan-400 shrink-0" />
                  <span>Your profile updates sync securely with Supabase cloud database.</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsModalOpen && (
          <SettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            onShowToast={showToast}
            onOpenAuthModal={onOpenAuthModal}
            onOpenOnboardingVideo={onOpenOnboardingVideo}
            currentUser={currentUser}
          />
        )}
      </AnimatePresence>

      {/* Share Profile Modal */}
      <AnimatePresence>
        {isShareModalOpen && (
          <ShareProfileModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            username={profile.username}
            avatarUrl={profile.avatar}
            onShowToast={showToast}
          />
        )}
      </AnimatePresence>

      {/* Creator Insights Analytics Modal */}
      <AnimatePresence>
        {isInsightsOpen && (
          <CreatorInsightsModal
            isOpen={isInsightsOpen}
            onClose={() => setIsInsightsOpen(false)}
            reels={creatorReels.length > 0 ? creatorReels : reels}
            onOpenReel={(id) => {
              const target = reels.find((r) => r.id === id);
              if (target) setPlaybackReel(target);
            }}
          />
        )}
      </AnimatePresence>

      {/* Creator Wallet & UPI Payout Dashboard Modal */}
      <AnimatePresence>
        {isWalletOpen && (
          <WalletScreen
            isOpen={isWalletOpen}
            onClose={() => {
              setIsWalletOpen(false);
              try {
                const stored = localStorage.getItem('gedion_wallet_balance_v3');
                if (stored !== null) {
                  const val = parseFloat(stored);
                  if (!isNaN(val)) setWalletBalance(val);
                }
              } catch {
                // ignore
              }
            }}
            reels={creatorReels.length > 0 ? creatorReels : reels}
            currentUser={currentUser}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Also export as ProfileView for backward compatibility
export const ProfileView = ProfileScreen;
