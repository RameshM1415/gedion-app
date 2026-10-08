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
  LogIn,
  MoreVertical,
  Trash2,
  Pencil,
  AlertTriangle,
} from 'lucide-react';
import { Reel } from '../types';
import { compressImageFile } from '../utils/mediaUtils';
import { SettingsModal } from './SettingsModal';
import { ShareProfileModal } from './ShareProfileModal';
import { CreatorInsightsModal } from './CreatorInsightsModal';
import { WalletScreen } from './WalletScreen';
import { ReelOptionsMenu } from './ReelOptionsMenu';
import { FollowersModal } from './FollowersModal';
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
  updateReelDetailsInSupabase,
  toggleSupabaseSavedPost,
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

  // Clickable Followers / Following Modal state
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [followersModalTab, setFollowersModalTab] = useState<'followers' | 'following'>('followers');

  // Dynamic Wallet Balance state (defaults strictly to 0)
  const [walletBalance, setWalletBalance] = useState<number>(0);

  // Instagram-Style Pull-to-Refresh State & Logic
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pullY, setPullY] = useState(0);
  const [isRefreshingProfile, setIsRefreshingProfile] = useState(false);
  const touchStartYRef = useRef<number | null>(null);
  const isDraggingPullRef = useRef(false);

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
  const loadCreatorReels = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoadingReels(true);
    }
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
      if (!silent) {
        setIsLoadingReels(false);
      }
    }
  }, [currentUser, profile.username, profile.name]);

  // Pull-to-Refresh handler: re-fetch latest profile data from Supabase
  const handleRefreshProfile = useCallback(async () => {
    setIsRefreshingProfile(true);
    const startTime = Date.now();
    try {
      const active = currentUser || getStoredAuth() || DEFAULT_AUTH_USER;
      const targetUsername = active?.username || profile.username || 'rameshrao034';
      const targetUserId = active?.id;

      // 1. Re-fetch latest profile details (bio, avatar, name, link) from Supabase
      if (targetUsername) {
        const cloudData = await fetchSupabaseProfile(targetUsername);
        if (cloudData) {
          setProfile((prev) => {
            const updated = { ...prev, ...cloudData };
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            } catch {}
            return updated;
          });
        }
      }

      // 2. Re-fetch followers, following, and likes counts from Supabase
      const metrics = await fetchUserMetricsFromSupabase(targetUserId, targetUsername);
      if (metrics) {
        setFollowersCount(metrics.followersCount);
        setFollowingCount(metrics.followingCount);
        setTotalLikesCount(metrics.totalLikesCount);
      }

      // 3. Re-fetch posts/reels grid from Supabase silently without content flicker
      await loadCreatorReels(true);

      // Ensure smooth animation duration window (~750ms)
      const elapsed = Date.now() - startTime;
      const minDuration = 750;
      if (elapsed < minDuration) {
        await new Promise((res) => setTimeout(res, minDuration - elapsed));
      }
    } catch (err) {
      console.warn('Error refreshing profile:', err);
    } finally {
      setIsRefreshingProfile(false);
    }
  }, [currentUser, profile.username, loadCreatorReels]);

  // Touch handlers for Pull-to-Refresh
  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop <= 2) {
      touchStartYRef.current = e.touches[0].clientY;
      isDraggingPullRef.current = true;
    } else {
      touchStartYRef.current = null;
      isDraggingPullRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingPullRef.current || touchStartYRef.current === null || isRefreshingProfile) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartYRef.current;

    if (diff > 0 && containerRef.current && containerRef.current.scrollTop <= 2) {
      const pull = Math.min(diff * 0.45, 60);
      setPullY(pull);
    } else {
      setPullY(0);
    }
  };

  const handleTouchEnd = async () => {
    if (pullY > 38 && !isRefreshingProfile) {
      setPullY(0);
      await handleRefreshProfile();
    } else {
      setPullY(0);
    }
    touchStartYRef.current = null;
    isDraggingPullRef.current = false;
  };

  // Mouse handlers for desktop testing
  const handleMouseDown = (e: React.MouseEvent) => {
    if (containerRef.current && containerRef.current.scrollTop <= 2) {
      touchStartYRef.current = e.clientY;
      isDraggingPullRef.current = true;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingPullRef.current || touchStartYRef.current === null || isRefreshingProfile) return;
    const diff = e.clientY - touchStartYRef.current;
    if (diff > 0 && containerRef.current && containerRef.current.scrollTop <= 2) {
      const pull = Math.min(diff * 0.4, 60);
      setPullY(pull);
    } else {
      setPullY(0);
    }
  };

  const handleMouseUp = async () => {
    if (isDraggingPullRef.current) {
      if (pullY > 38 && !isRefreshingProfile) {
        setPullY(0);
        await handleRefreshProfile();
      } else {
        setPullY(0);
      }
      touchStartYRef.current = null;
      isDraggingPullRef.current = false;
    }
  };

  // 3-Dots Action Menu & Edit Reel State on User's Reels Grid
  const [selectedGridReel, setSelectedGridReel] = useState<Reel | null>(null);
  const [isGridActionMenuOpen, setIsGridActionMenuOpen] = useState(false);
  const [isEditModalForReelOpen, setIsEditModalForReelOpen] = useState(false);
  const [showConfirmDeleteReel, setShowConfirmDeleteReel] = useState(false);
  const [editReelCaption, setEditReelCaption] = useState('');
  const [isSavingReelEdit, setIsSavingReelEdit] = useState(false);
  const [isDeletingReelFromGrid, setIsDeletingReelFromGrid] = useState(false);

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

  // 3-Dots Action Menu Handlers for Grid Reels
  const handleOpenGridReelMenu = useCallback((reel: Reel) => {
    setSelectedGridReel(reel);
    setShowConfirmDeleteReel(false);
    setIsGridActionMenuOpen(true);
  }, []);

  const handleConfirmDeleteReel = async () => {
    if (!selectedGridReel || isDeletingReelFromGrid) return;
    setIsDeletingReelFromGrid(true);
    const reelId = selectedGridReel.id;

    try {
      // 1. Instantly remove from local grid state
      setCreatorReels((prev) => prev.filter((r) => r.id !== reelId));
      setSavedReelIds((prev) => prev.filter((id) => id !== reelId));
      if (playbackReel?.id === reelId) {
        setPlaybackReel(null);
      }

      // 2. Notify parent
      onDeleteReel?.(reelId);

      // 3. Broadcast global reel-deleted event so all views update
      window.dispatchEvent(
        new CustomEvent('reel-deleted', { detail: { reelId } })
      );

      // 4. Show success toast
      showToast('Reel deleted successfully');

      // 5. Close menu
      setIsGridActionMenuOpen(false);
      setShowConfirmDeleteReel(false);
      setSelectedGridReel(null);

      // 6. Delete from Supabase in background
      await deleteReelFromSupabase(reelId);
    } catch (err) {
      console.warn('Error deleting reel:', err);
    } finally {
      setIsDeletingReelFromGrid(false);
    }
  };

  const handleSaveReelEdit = async () => {
    if (!selectedGridReel || isSavingReelEdit) return;
    setIsSavingReelEdit(true);
    const reelId = selectedGridReel.id;
    const cleanCaption = editReelCaption.trim();
    const tags = cleanCaption.match(/#[a-zA-Z0-9_]+/g) || [];

    try {
      // 1. Optimistically update creatorReels in state
      setCreatorReels((prev) =>
        prev.map((r) =>
          r.id === reelId
            ? {
                ...r,
                caption: cleanCaption,
                tags: tags.length > 0 ? tags : r.tags,
              }
            : r
        )
      );

      // 2. Broadcast global reel-updated event
      window.dispatchEvent(
        new CustomEvent('reel-updated', {
          detail: {
            reelId,
            caption: cleanCaption,
            tags,
          },
        })
      );

      // 3. Show success toast
      showToast('Reel updated successfully ✨');

      // 4. Close modal
      setIsEditModalForReelOpen(false);
      setSelectedGridReel(null);

      // 5. Save changes back to Supabase
      await updateReelDetailsInSupabase(reelId, {
        caption: cleanCaption,
        tags,
      });
    } catch (err) {
      console.warn('Error saving reel edits:', err);
      showToast('Failed to update reel');
    } finally {
      setIsSavingReelEdit(false);
    }
  };

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

  // Real-time listener for global follow status changes
  useEffect(() => {
    const handleFollowChange = () => {
      const active = currentUser || getStoredAuth() || DEFAULT_AUTH_USER;
      fetchUserMetricsFromSupabase(active?.id, active?.username || profile.username).then((metrics) => {
        setFollowersCount(metrics.followersCount);
        setFollowingCount(metrics.followingCount);
        setTotalLikesCount(metrics.totalLikesCount);
      });
    };

    window.addEventListener('gedion-follow-changed', handleFollowChange);
    return () => {
      window.removeEventListener('gedion-follow-changed', handleFollowChange);
    };
  }, [currentUser, profile.username]);

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

  // Toggle Save / Unsave bookmark with instant Supabase sync and UI update
  const handleToggleBookmarkSaved = async (reelId: string) => {
    const isCurrentlySaved = savedReelIds.includes(reelId);
    const nextSavedIds = isCurrentlySaved
      ? savedReelIds.filter((id) => id !== reelId)
      : [...savedReelIds, reelId];

    setSavedReelIds(nextSavedIds);
    try {
      localStorage.setItem(SAVED_REELS_STORAGE_KEY, JSON.stringify(nextSavedIds));
    } catch {}

    const active = currentUser || getStoredAuth() || DEFAULT_AUTH_USER;
    toggleSupabaseSavedPost(active?.id, reelId, !isCurrentlySaved).catch(() => {});

    showToast(isCurrentlySaved ? 'Removed from saved posts' : 'Saved to profile');
  };

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
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={`absolute inset-0 z-30 flex flex-col pt-0 pb-24 px-4 overflow-y-auto no-scrollbar select-none transition-colors ${
        isDark ? 'bg-black text-white' : 'bg-[#ffffff] text-black'
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

      {/* 1. Sticky Top Header: Username with verification badge, settings gear icon, and share profile action */}
      <header
        className={`sticky top-0 z-20 flex flex-col -mx-4 border-b shrink-0 backdrop-blur-md transition-colors ${
          isDark ? 'bg-black/95 border-[#262626]' : 'bg-[#ffffff] border-[#dbdbdb]'
        }`}
      >
        {/* Top safe-area filler */}
        <div className="w-full pt-[env(safe-area-inset-top,0px)]" />

        <div className="flex items-center justify-between px-4 h-[44px] w-full">
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
      </header>

      {/* 2. True Instagram Top Pull-to-Refresh Spinner: Horizontally centered directly below the top username header bar */}
      <div
        className="w-full flex items-center justify-center overflow-hidden transition-[height,opacity] duration-300 ease-out pointer-events-none select-none"
        style={{
          height: isRefreshingProfile ? '50px' : pullY > 0 ? `${Math.min(pullY, 54)}px` : '0px',
          opacity: isRefreshingProfile ? 1 : pullY > 8 ? Math.min((pullY - 8) / 24, 1) : 0,
        }}
      >
        <div className="flex items-center justify-center py-2.5">
          <div
            className={`w-[28px] h-[28px] rounded-full border-[2.5px] ${
              isDark
                ? 'border-zinc-800 border-t-white border-r-white'
                : 'border-zinc-200 border-t-zinc-900 border-r-zinc-900'
            } ${isRefreshingProfile ? 'animate-spin' : ''}`}
            style={{
              transform: isRefreshingProfile ? undefined : `rotate(${pullY * 6}deg)`,
              animationDuration: '0.75s',
            }}
          />
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

        {/* Stats Row: 3 clean columns (Reels, Followers, Following) - Clickable */}
        <div
          className={`grid grid-cols-3 w-full max-w-sm mt-4 py-2.5 px-2 rounded-xl border transition-colors ${
            isDark ? 'bg-zinc-950 border-[#262626]' : 'bg-zinc-50 border-[#efefef]'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('profile-reels-grid');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex flex-col items-center justify-center hover:opacity-80 active:scale-95 transition-all cursor-pointer"
          >
            <span className="font-bold text-sm">
              {creatorReels.length}
            </span>
            <span className="text-[11px] text-zinc-500 mt-0.5">
              Reels
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFollowersModalTab('followers');
              setIsFollowersModalOpen(true);
            }}
            className={`flex flex-col items-center justify-center border-x hover:opacity-80 active:scale-95 transition-all cursor-pointer ${
              isDark ? 'border-zinc-800' : 'border-zinc-200'
            }`}
          >
            <span className="font-bold text-sm">
              {followersCount.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-zinc-500 mt-0.5">
              Followers
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFollowersModalTab('following');
              setIsFollowersModalOpen(true);
            }}
            className="flex flex-col items-center justify-center hover:opacity-80 active:scale-95 transition-all cursor-pointer"
          >
            <span className="font-bold text-sm">
              {followingCount.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-zinc-500 mt-0.5">
              Following
            </span>
          </button>
        </div>

        {/* Action Buttons: "Edit Profile", "Share Profile", "Insights" */}
        <div className="flex items-center gap-2 mt-4 w-full max-w-sm">
          <button
            type="button"
            onClick={handleOpenEditModal}
            className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-semibold active:scale-95 transition-all cursor-pointer ${
              isDark
                ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-white'
                : 'bg-neutral-100 hover:bg-neutral-200 border-neutral-300 text-neutral-900'
            }`}
          >
            <span>Edit profile</span>
          </button>
          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-semibold active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              isDark
                ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-white'
                : 'bg-neutral-100 hover:bg-neutral-200 border-neutral-300 text-neutral-900'
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
                ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-white'
                : 'bg-neutral-100 hover:bg-neutral-200 border-neutral-300 text-neutral-900'
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

            <div className={`flex items-center gap-1 text-xs font-semibold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
              <span>View ↗</span>
            </div>
          </button>
        </div>

        {/* Guest Authentication Action if not logged in */}
        {!currentUser && (
          <div className="w-full max-w-sm mt-3">
            <button
              type="button"
              onClick={() => onOpenAuthModal?.('Sign in to access your creator profile & broadcast reels!')}
              className="w-full py-2 px-4 rounded-xl bg-[#0095f6] hover:bg-[#1877f2] active:scale-98 text-xs font-bold text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <LogIn size={15} />
              <span>Log In to GediOn</span>
            </button>
          </div>
        )}
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
        <div id="profile-reels-grid" className="mt-3 min-h-[220px]">
          {creatorReels.length > 0 ? (
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
                        e.preventDefault();
                        handleOpenGridReelMenu(reel);
                      }}
                      className="absolute top-1.5 left-1.5 p-1.5 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md text-white active:scale-90 transition-all z-10 cursor-pointer shadow-md"
                      aria-label="Reel options"
                    >
                      <MoreVertical size={13} strokeWidth={2.4} />
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
                    {reel.poster ? (
                      <img
                        src={reel.poster}
                        alt={reel.caption}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : reel.videoUrl ? (
                      <video
                        src={`${reel.videoUrl}#t=0.1`}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-zinc-900 text-white">
                        <Bookmark size={20} className="text-zinc-500" />
                      </div>
                    )}

                    {/* Bookmark badge top-right */}
                    <div className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 backdrop-blur-md">
                      <Bookmark size={11} className="fill-amber-400 text-amber-400" />
                    </div>

                    {isVideo && (
                      <div className="absolute top-1.5 left-1.5 p-1 rounded-full bg-black/60 backdrop-blur-md">
                        <Play size={10} className="fill-white text-white translate-x-[0.5px]" />
                      </div>
                    )}

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
                {/* Active Bookmark / Unsave Button */}
                <button
                  type="button"
                  onClick={() => handleToggleBookmarkSaved(playbackReel.id)}
                  className="p-2 rounded-full bg-black/60 backdrop-blur-md text-amber-400 border border-white/10 hover:border-white/30 hover:bg-black/80 transition-all active:scale-90 cursor-pointer"
                  aria-label="Bookmark"
                  title={savedReelIds.includes(playbackReel.id) ? 'Unsave' : 'Save'}
                >
                  <Bookmark
                    size={16}
                    className={
                      savedReelIds.includes(playbackReel.id)
                        ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                        : 'text-white'
                    }
                  />
                </button>

                <button
                  type="button"
                  onClick={() => setPlaybackMuted((prev) => !prev)}
                  className="p-2 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/10 hover:bg-black/80 cursor-pointer"
                  aria-label={playbackMuted ? 'Unmute' : 'Mute'}
                >
                  {playbackMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenReelOptions(playbackReel)}
                  className="p-2 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/10 hover:border-white/30 hover:bg-black/80 cursor-pointer"
                  aria-label="Reel options"
                >
                  <MoreVertical size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setPlaybackReel(null)}
                  className="p-2 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/10 hover:bg-black/80 cursor-pointer"
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

      {/* Instagram-Style 3-Dots Action Sheet for Reel on Profile Grid (Edit, Delete, Cancel) */}
      <AnimatePresence>
        {isGridActionMenuOpen && selectedGridReel && (
          <div className="fixed inset-0 z-[85] flex items-end justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isDeletingReelFromGrid) {
                  setIsGridActionMenuOpen(false);
                  setShowConfirmDeleteReel(false);
                  setSelectedGridReel(null);
                }
              }}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
            />

            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className={`relative w-full max-w-sm sm:max-w-md mx-auto rounded-t-3xl border-t p-5 shadow-2xl z-10 overflow-hidden select-none transition-colors ${
                isDark ? 'bg-[#0f0f12] border-white/10 text-white' : 'bg-white border-zinc-200 text-black'
              }`}
            >
              {/* Drag Handle */}
              <div className="flex justify-center -mt-2 pb-3">
                <div className={`h-1 w-10 rounded-full ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
              </div>

              {!showConfirmDeleteReel ? (
                <div className="flex flex-col gap-2">
                  {/* Reel Mini Preview */}
                  <div
                    className={`flex items-center gap-3 pb-3 mb-1 border-b ${
                      isDark ? 'border-zinc-800' : 'border-zinc-100'
                    }`}
                  >
                    <div className="h-14 w-10 rounded-lg overflow-hidden shrink-0 bg-black border border-white/10">
                      {selectedGridReel.poster ? (
                        <img
                          src={selectedGridReel.poster}
                          alt={selectedGridReel.caption || 'Reel preview'}
                          className="h-full w-full object-cover"
                        />
                      ) : selectedGridReel.videoUrl ? (
                        <video
                          src={`${selectedGridReel.videoUrl}#t=0.1`}
                          className="h-full w-full object-cover pointer-events-none"
                          muted
                          playsInline
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs">🎬</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-xs truncate block">
                        @{selectedGridReel.username || profile.username}
                      </span>
                      <p className="text-xs text-zinc-500 truncate mt-0.5">
                        {selectedGridReel.caption || 'No caption'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsGridActionMenuOpen(false);
                        setSelectedGridReel(null);
                      }}
                      className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                        isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Option 1: Edit Reel */}
                  <button
                    type="button"
                    onClick={() => {
                      setEditReelCaption(selectedGridReel.caption || '');
                      setIsGridActionMenuOpen(false);
                      setIsEditModalForReelOpen(true);
                    }}
                    className={`flex items-center justify-between w-full p-3.5 rounded-2xl border transition-all active:scale-[0.98] cursor-pointer ${
                      isDark
                        ? 'bg-zinc-900/70 hover:bg-zinc-900 border-zinc-800 text-white'
                        : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-black'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-[#0095f6]/15 text-[#0095f6]">
                        <Pencil size={18} />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-bold flex items-center gap-1.5">
                          Edit Reel
                        </span>
                        <span className="text-[11px] text-zinc-500">
                          Update caption, title & hashtags
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Option 2: Delete Reel */}
                  <button
                    type="button"
                    onClick={() => setShowConfirmDeleteReel(true)}
                    className="flex items-center justify-between w-full p-3.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/30 text-rose-500 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-rose-500/15 text-rose-500">
                        <Trash2 size={18} />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-bold text-rose-500 flex items-center gap-1.5">
                          Delete Reel
                        </span>
                        <span className="text-[11px] text-rose-500/70">
                          Permanently remove from profile & feed
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Option 3: Cancel */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsGridActionMenuOpen(false);
                      setSelectedGridReel(null);
                    }}
                    className={`w-full py-3 mt-1 rounded-2xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                      isDark
                        ? 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                        : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                /* Delete Confirmation View */
                <div className="flex flex-col items-center text-center py-2">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/15 text-rose-500 mb-3 border border-rose-500/30">
                    <AlertTriangle size={28} />
                  </div>
                  <h3 className="font-extrabold text-base mb-1">Delete this reel?</h3>
                  <p className="text-xs text-zinc-400 max-w-xs mb-5 leading-relaxed">
                    This reel will be permanently removed from your profile and the GediOn feed. This action cannot be undone.
                  </p>

                  <div className="flex flex-col gap-2.5 w-full">
                    <button
                      type="button"
                      onClick={handleConfirmDeleteReel}
                      disabled={isDeletingReelFromGrid}
                      className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40 cursor-pointer"
                    >
                      {isDeletingReelFromGrid ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Deleting...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 size={16} />
                          <span>Delete Reel</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isDeletingReelFromGrid}
                      onClick={() => setShowConfirmDeleteReel(false)}
                      className={`w-full py-3 rounded-2xl text-xs font-bold transition-all active:scale-98 cursor-pointer ${
                        isDark ? 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Instagram-Style Edit Reel Modal (Caption & Hashtags) */}
      <AnimatePresence>
        {isEditModalForReelOpen && selectedGridReel && (
          <div className="fixed inset-0 z-[88] flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isSavingReelEdit) {
                  setIsEditModalForReelOpen(false);
                  setSelectedGridReel(null);
                }
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
            />

            {/* Modal Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className={`relative w-full max-w-sm sm:max-w-md mx-auto rounded-t-3xl sm:rounded-3xl border-t sm:border p-5 shadow-2xl z-10 overflow-hidden select-none transition-colors ${
                isDark ? 'bg-[#090910] border-white/10 text-white' : 'bg-white border-zinc-200 text-black'
              }`}
            >
              {/* Drag Handle */}
              <div className="flex justify-center -mt-2 pb-2 sm:hidden">
                <div className={`h-1 w-10 rounded-full ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalForReelOpen(false);
                    setSelectedGridReel(null);
                  }}
                  disabled={isSavingReelEdit}
                  className="text-xs font-semibold text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <h3 className="font-extrabold text-sm">Edit Reel Info</h3>
                <button
                  type="button"
                  onClick={handleSaveReelEdit}
                  disabled={isSavingReelEdit}
                  className="px-3.5 py-1.5 rounded-full bg-[#0095f6] hover:bg-[#1877f2] text-white font-bold text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingReelEdit ? (
                    <Loader2 size={13} className="animate-spin text-white" />
                  ) : (
                    <Check size={13} strokeWidth={3} />
                  )}
                  <span>Done</span>
                </button>
              </div>

              {/* Form Body */}
              <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto no-scrollbar">
                {/* Media Preview + Caption Input Row */}
                <div className="flex gap-3">
                  <div className="w-20 aspect-[9/14] rounded-xl overflow-hidden bg-black shrink-0 border border-white/10">
                    {selectedGridReel.poster ? (
                      <img
                        src={selectedGridReel.poster}
                        alt="Reel"
                        className="h-full w-full object-cover"
                      />
                    ) : selectedGridReel.videoUrl ? (
                      <video
                        src={`${selectedGridReel.videoUrl}#t=0.1`}
                        className="h-full w-full object-cover pointer-events-none"
                        muted
                        playsInline
                      />
                    ) : null}
                  </div>

                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-zinc-400">Caption & Hashtags</label>
                    <textarea
                      value={editReelCaption}
                      onChange={(e) => setEditReelCaption(e.target.value)}
                      placeholder="Write a caption or add #hashtags..."
                      rows={4}
                      className="w-full resize-none rounded-xl bg-white/[0.06] border border-white/10 p-2.5 text-xs placeholder-zinc-500 focus:outline-none focus:border-[#0095f6] transition-colors leading-relaxed"
                    />
                  </div>
                </div>

                {/* Quick Hashtag helper buttons */}
                <div>
                  <span className="text-[11px] font-semibold text-zinc-400 block mb-1.5">Quick Hashtags:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {['#reels', '#trending', '#viral', '#gedion', '#explore', '#comedy', '#music'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (!editReelCaption.includes(tag)) {
                            setEditReelCaption((prev) => (prev ? `${prev} ${tag}` : tag));
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all active:scale-95 cursor-pointer ${
                          editReelCaption.includes(tag)
                            ? 'bg-[#0095f6]/20 border-[#0095f6]/40 text-[#0095f6]'
                            : isDark
                            ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                            : 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-black'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Followers / Following Instagram Modal Sheet */}
      <FollowersModal
        isOpen={isFollowersModalOpen}
        onClose={() => setIsFollowersModalOpen(false)}
        targetUser={{
          id: currentUser?.id,
          username: profile.username,
          displayName: profile.name,
        }}
        initialTab={followersModalTab}
        currentUser={currentUser}
        onOpenProfile={(u) => {
          setIsFollowersModalOpen(false);
        }}
        onRequireAuth={onOpenAuthModal}
      />
    </div>
  );
};

// Also export as ProfileView for backward compatibility
export const ProfileView = ProfileScreen;
