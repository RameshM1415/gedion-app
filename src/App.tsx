import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Download, X } from 'lucide-react';
import { INITIAL_REELS } from './data/mockReels';
import { Reel, FeedTab, NavTab, CommentItem, StoryItem } from './types';
import { TopHeader } from './components/TopHeader';
import { StoriesTray } from './components/StoriesTray';
import { StoryPreviewModal } from './components/StoryPreviewModal';
import { AddStoryModal } from './components/AddStoryModal';
import { MOCK_STORIES } from './data/mockStories';
import { BottomNav } from './components/BottomNav';
import { ReelsFeed } from './components/ReelsFeed';
import { ReelOptionsMenu } from './components/ReelOptionsMenu';
import { CommentDrawer } from './components/CommentDrawer';
import { ShareSheet } from './components/ShareSheet';
import { ReportModal } from './components/ReportModal';
import { LikesAndPlaysModal } from './components/LikesAndPlaysModal';
import { ExploreView, ActivityView, ProfileScreen, ProfileView } from './components/SecondaryViews';
import { ChatView } from './components/ChatView';
import { SplashScreen } from './components/SplashScreen';
import { AuthModal } from './components/AuthModal';
import { OnboardingVideoModal } from './components/OnboardingVideoModal';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { VideoUploadModal } from './components/VideoUploadModal';
import { supabase, fetchSupabaseReels, deleteReelFromSupabase, updateReelLikesInSupabase } from './utils/supabaseClient';
import { InstagramFeed } from './components/InstagramFeed';
import { ReelsHeader } from './components/ReelsHeader';
import { UserProfileModal } from './components/UserProfileModal';
import { useTheme } from './context/ThemeContext';
import {
  AuthUser,
  getStoredAuth,
  setStoredAuth,
  clearStoredAuth,
  mapSupabaseUserToAuthUser,
  DEFAULT_AUTH_USER,
} from './utils/authStorage';

const LOCAL_REELS_STORAGE_KEY = 'gedion_custom_reels';
const LOCAL_STORIES_STORAGE_KEY = 'gedion_user_stories';

const getInitialStories = (): StoryItem[] => {
  try {
    const saved = localStorage.getItem(LOCAL_STORIES_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return [...parsed, ...MOCK_STORIES];
      }
    }
  } catch (e) {
    console.error('Failed to parse cached stories', e);
  }
  return MOCK_STORIES;
};

const getInitialReels = (): Reel[] => {
  try {
    const saved = localStorage.getItem('gedion_custom_reels') || localStorage.getItem('gedion_local_reels_v2');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const customIds = new Set(parsed.map((r: Reel) => r.id));
        const remainingInitials = INITIAL_REELS.filter(r => !customIds.has(r.id));
        return [...parsed, ...remainingInitials];
      }
    }
  } catch (e) {
    console.error('Failed to parse cached reels', e);
  }
  return INITIAL_REELS;
};

export const App: React.FC = () => {
  const { isDark } = useTheme();
  const [reels, setReels] = useState<Reel[]>(getInitialReels);
  const [feedTab, setFeedTab] = useState<FeedTab>('forYou');
  const [navTab, setNavTab] = useState<NavTab>('home');
  const [reelsInitialReelId, setReelsInitialReelId] = useState<string | null>(null);
  const [reelsSubTab, setReelsSubTab] = useState<'forYou' | 'friends'>('forYou');
  const [selectedProfileUsername, setSelectedProfileUsername] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [createMode, setCreateMode] = useState<'POST' | 'STORY' | 'PHOTO' | 'REEL' | 'LIVE'>('REEL');
  const [chatTargetUser, setChatTargetUser] = useState<string | null>(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Options Menu & Deletion State
  const [optionsReel, setOptionsReel] = useState<Reel | null>(null);
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
  const [deleteToast, setDeleteToast] = useState<string | null>(null);
  const [feedToast, setFeedToast] = useState<string | null>(null);

  // Authentication State & Session Persistence (Supabase Auth)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    return getStoredAuth();
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authPromptMessage, setAuthPromptMessage] = useState<string | undefined>(undefined);
  const [isOnboardingVideoOpen, setIsOnboardingVideoOpen] = useState(false);
  const [authToast, setAuthToast] = useState<string | null>(null);

  // Stories Feature State (Status Bar & Preview / Add)
  const [stories, setStories] = useState<StoryItem[]>(getInitialStories);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number>(0);
  const [isStoryPreviewOpen, setIsStoryPreviewOpen] = useState<boolean>(false);
  const [isAddStoryOpen, setIsAddStoryOpen] = useState<boolean>(false);
  const [storyToast, setStoryToast] = useState<string | null>(null);
  const [isStoriesVisible, setIsStoriesVisible] = useState<boolean>(true);

  const hasUserStory = stories.some(
    (s) => s.id.startsWith('story_') || (currentUser && s.username === currentUser.username)
  );

  const handleSelectStory = (index: number) => {
    setSelectedStoryIndex(index);
    setIsStoryPreviewOpen(true);
  };

  const handleOpenAddStory = () => {
    setIsAddStoryOpen(true);
  };

  const handlePublishStory = (newStory: StoryItem) => {
    setStories((prev) => {
      const updated = [newStory, ...prev];
      try {
        const userCreated = updated.filter((s) => s.id.startsWith('story_'));
        localStorage.setItem(LOCAL_STORIES_STORAGE_KEY, JSON.stringify(userCreated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
    setStoryToast('🎉 Story published live to GediOn Status!');
    setTimeout(() => setStoryToast(null), 3500);
  };

  // 2. Auth State Listener on App Launch
  useEffect(() => {
    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const authUser = mapSupabaseUserToAuthUser(session.user);
        setCurrentUser(authUser);
        setStoredAuth(authUser);
      }
    });

    // Listen to real-time auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const authUser = mapSupabaseUserToAuthUser(session.user);
        setCurrentUser(authUser);
        setStoredAuth(authUser);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        clearStoredAuth();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLoginSuccess = (user: AuthUser, welcomeToast: string) => {
    setCurrentUser(user);
    setStoredAuth(user);
    setIsAuthModalOpen(false);
    setAuthPromptMessage(undefined);

    // Onboarding Step: check if user completed onboarding
    if (!user.hasCompletedOnboarding && !user.hasCompletedDemoVideo) {
      setIsOnboardingVideoOpen(true);
    } else {
      setNavTab('home');
      setAuthToast(welcomeToast);
      setTimeout(() => setAuthToast(null), 3500);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase signOut notice:', err);
    }
    clearStoredAuth();
    setCurrentUser(null);
    setAuthToast('Signed out. You are now exploring GediOn as a Guest.');
    setTimeout(() => setAuthToast(null), 3500);
  };

  const handleOnboardingComplete = (updatedUser: AuthUser) => {
    setCurrentUser(updatedUser);
    setStoredAuth(updatedUser);
    setIsOnboardingVideoOpen(false);
    setNavTab('home');
    setAuthToast(`🎉 Creator account activated! Welcome to GediOn, @${updatedUser.username}!`);
    setTimeout(() => setAuthToast(null), 3800);
  };

  // PWA beforeinstallprompt capture
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Refresh and Scroll-To-Top state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [scrollToTopTrigger, setScrollToTopTrigger] = useState(0);
  const [reelsRefreshTrigger, setReelsRefreshTrigger] = useState(0);
  const [showPublishToast, setShowPublishToast] = useState(false);

  // Lifted modal state for CommentDrawer, ShareSheet, and ReportModal
  const [commentReelId, setCommentReelId] = useState<string | null>(null);
  const [shareReelId, setShareReelId] = useState<string | null>(null);
  const [reportReelId, setReportReelId] = useState<string | null>(null);
  const [likesReelId, setLikesReelId] = useState<string | null>(null);
  const [reportToast, setReportToast] = useState<string | null>(null);

  // Hidden reported reels in current session
  const [hiddenReelIds, setHiddenReelIds] = useState<string[]>(() => {
    try {
      const stored = sessionStorage.getItem('gedion_hidden_reels_v1');
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return [];
  });

  const isCommentsOpen = Boolean(commentReelId);
  const isShareOpen = Boolean(shareReelId);
  const isReportOpen = Boolean(reportReelId);
  const isLikesOpen = Boolean(likesReelId);
  const isCreateOpen = navTab === 'create';
  const isSheetOpen = isCommentsOpen || isShareOpen || isReportOpen || isLikesOpen;

  const activeCommentReel = reels.find((r) => r.id === commentReelId) || reels[0];
  const activeShareReel = reels.find((r) => r.id === shareReelId) || reels[0];
  const activeReportReel = reels.find((r) => r.id === reportReelId) || reels[0];
  const activeLikesReel = reels.find((r) => r.id === likesReelId) || reels[0];

  // Filter reels based on Following vs For You and exclude hidden reported reels
  const displayedReels = reels
    .filter((r) => !hiddenReelIds.includes(r.id))
    .filter((r) => (feedTab === 'following' ? r.isFollowing : true));

  const handleUpdateReel = (updated: Reel) => {
    setReels((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const handleToggleLike = useCallback((reelId: string) => {
    setReels((prev) =>
      prev.map((r) => {
        if (r.id === reelId) {
          const nextLiked = !r.isLiked;
          const nextCount = nextLiked ? (r.likesCount || 0) + 1 : Math.max(0, (r.likesCount || 0) - 1);
          // Sync with Supabase in background
          updateReelLikesInSupabase(r.id, nextCount, nextLiked).catch(() => {});
          return { ...r, isLiked: nextLiked, likesCount: nextCount };
        }
        return r;
      })
    );
  }, []);

  const handleToggleBookmark = useCallback((reelId: string) => {
    setReels((prev) =>
      prev.map((r) => (r.id === reelId ? { ...r, isBookmarked: !r.isBookmarked } : r))
    );
  }, []);

  // Seamless navigation from Home Feed video posts to full-screen Reels viewer
  const handleOpenReelsFromHome = useCallback((reelId: string, isSoundOn?: boolean) => {
    if (isSoundOn !== undefined) {
      setIsMuted(!isSoundOn);
    }
    setReelsInitialReelId(reelId);
    setNavTab('reels');
  }, []);

  const handleBackToHomeFeed = useCallback(() => {
    setNavTab('home');
    setReelsInitialReelId(null);
  }, []);

  const handleOpenOptions = useCallback((reel: Reel) => {
    setCommentReelId(null);
    setShareReelId(null);
    setOptionsReel(reel);
    setIsOptionsMenuOpen(true);
  }, []);

  const handleCloseOptions = useCallback(() => {
    setIsOptionsMenuOpen(false);
    setOptionsReel(null);
  }, []);

  const handleDeleteReel = useCallback(async (reelId: string) => {
    setReels((prev) => prev.filter((r) => r.id !== reelId));

    window.dispatchEvent(
      new CustomEvent('reel-deleted', { detail: { reelId } })
    );

    setDeleteToast('Reel deleted successfully');
    setTimeout(() => setDeleteToast(null), 3000);

    setIsOptionsMenuOpen(false);
    setOptionsReel(null);

    await deleteReelFromSupabase(reelId);
  }, []);

  // Listen for reel deletion and reel updates across all views
  useEffect(() => {
    const handleReelDeleted = (e: Event) => {
      const customEvent = e as CustomEvent<{ reelId: string }>;
      const deletedId = customEvent.detail?.reelId;
      if (deletedId) {
        setReels((prev) => prev.filter((r) => r.id !== deletedId));
      }
    };

    const handleReelUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ reelId: string; caption: string; tags?: string[] }>;
      const { reelId, caption, tags } = customEvent.detail || {};
      if (reelId) {
        setReels((prev) =>
          prev.map((r) =>
            r.id === reelId
              ? {
                  ...r,
                  caption,
                  tags: tags && tags.length > 0 ? tags : r.tags,
                }
              : r
          )
        );
      }
    };

    window.addEventListener('reel-deleted', handleReelDeleted);
    window.addEventListener('reel-updated', handleReelUpdated);
    return () => {
      window.removeEventListener('reel-deleted', handleReelDeleted);
      window.removeEventListener('reel-updated', handleReelUpdated);
    };
  }, []);

  const handleSelectNavTab = (tab: NavTab) => {
    if (tab === 'create') {
      if (!currentUser) {
        setAuthPromptMessage('Sign in to broadcast your reels to GediOn!');
        setIsAuthModalOpen(true);
        return;
      }
      setCreateMode('REEL');
    }
    setCommentReelId(null);
    setShareReelId(null);
    setReportReelId(null);
    if (tab === 'home') {
      setIsStoriesVisible(true);
    }
    setNavTab(tab);
  };

  const handleHomeScrollToTop = useCallback(() => {
    setScrollToTopTrigger((prev) => prev + 1);
  }, []);

  // Instagram-Style Home Feed Refresh & Content Shuffling Logic
  const handleHomeRefresh = async () => {
    setIsStoriesVisible(true);
    setIsRefreshing(true);
    // 1. Immediately scroll smoothly to the very top (scrollY: 0)
    setScrollToTopTrigger((prev) => prev + 1);

    const startTime = Date.now();
    try {
      // 2. Re-fetch posts/videos from Supabase
      const cloudReels = await fetchSupabaseReels();

      // Read local custom user creations
      let localCustom: Reel[] = [];
      try {
        const raw = localStorage.getItem('gedion_custom_reels');
        if (raw) localCustom = JSON.parse(raw);
      } catch (e) {
        console.error(e);
      }

      const cloud = Array.isArray(cloudReels) ? cloudReels : [];
      // Identify current top post ID before refresh
      const previousTopId = displayedReels[0]?.id || reels[0]?.id;

      setReels((prev) => {
        // Pool all reels: local custom, cloud, current, and baseline INITIAL_REELS
        const combined = [...localCustom, ...cloud, ...prev, ...INITIAL_REELS];
        const seen = new Set<string>();
        const pool: Reel[] = [];
        for (const item of combined) {
          if (item && item.id && !seen.has(item.id)) {
            seen.add(item.id);
            pool.push(item);
          }
        }

        if (pool.length <= 1) return pool;

        // Randomize/shuffle feed using Fisher-Yates shuffle
        const shuffled = [...pool];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        // CRITICAL: The video/post that was showing before refresh must NOT remain at the top;
        // fresh/different content must appear at the top!
        if (shuffled[0].id === previousTopId && shuffled.length > 1) {
          const swapIdx = shuffled.findIndex((r, idx) => idx > 0 && r.id !== previousTopId);
          if (swapIdx > 0) {
            [shuffled[0], shuffled[swapIdx]] = [shuffled[swapIdx], shuffled[0]];
          } else {
            const target = 1 + Math.floor(Math.random() * (shuffled.length - 1));
            [shuffled[0], shuffled[target]] = [shuffled[target], shuffled[0]];
          }
        }

        return shuffled;
      });

      // Ensure minimum duration (~750ms) for sleek spinner animation
      const elapsed = Date.now() - startTime;
      const minDuration = 750;
      if (elapsed < minDuration) {
        await new Promise((res) => setTimeout(res, minDuration - elapsed));
      }
    } catch (err) {
      console.warn('Error refreshing posts from Supabase:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleReelsScrollToTop = useCallback(() => {
    setScrollToTopTrigger((prev) => prev + 1);
  }, []);

  const handleReelsRefresh = useCallback(() => {
    if (navTab !== 'reels') {
      setNavTab('reels');
    }
    setReelsInitialReelId(null);
    setReelsRefreshTrigger((prev) => prev + 1);
  }, [navTab]);

  // Cloud Reels Handlers
  const handleReelsLoaded = useCallback((loadedReels: Reel[]) => {
    setReels((prev) => {
      let localCustom: Reel[] = [];
      try {
        const raw = localStorage.getItem('gedion_custom_reels');
        if (raw) localCustom = JSON.parse(raw);
      } catch (e) {
        console.error(e);
      }

      const cloud = Array.isArray(loadedReels) ? loadedReels : [];
      const combined = [...localCustom, ...prev.filter(r => !r.id.startsWith('mock_'))];
      const uniqueLocal = combined.filter((r, idx, arr) => arr.findIndex(x => x.id === r.id) === idx);
      const remainingCloud = cloud.filter((c) => !uniqueLocal.some((u) => u.id === c.id));
      return [...uniqueLocal, ...remainingCloud];
    });
  }, []);

  const handleNewRealtimeReel = useCallback((newReel: Reel) => {
    setReels((prev) => {
      if (prev.some((r) => r.id === newReel.id)) return prev;
      return [newReel, ...prev];
    });
    // Auto-scroll to top when a fresh reel is published live
    setScrollToTopTrigger((prev) => prev + 1);
  }, []);

  // Fetch initial cloud reels on mount
  useEffect(() => {
    let isMounted = true;
    fetchSupabaseReels().then((cloudReels) => {
      if (isMounted) {
        handleReelsLoaded(cloudReels);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [handleReelsLoaded]);

  // Publish Action & State Update
  const handlePublishReel = (newReel: Reel) => {
    const creatorUser = currentUser;
    const enrichedReel: Reel = {
      ...newReel,
      creatorId: creatorUser?.id,
      creatorEmail: creatorUser?.email,
      username: creatorUser?.username || newReel.username,
      displayName: creatorUser?.displayName || newReel.displayName,
      avatar: creatorUser?.avatar || newReel.avatar,
    };

    setReels((prev) => {
      const filtered = prev.filter((r) => r.id !== enrichedReel.id);
      const updated = [enrichedReel, ...filtered];
      try {
        localStorage.setItem('gedion_custom_reels', JSON.stringify(updated.filter(r => !r.id.startsWith('mock_'))));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
    setFeedTab('forYou');
    setNavTab('home');
    // Smooth scroll to top and auto-play new reel
    setScrollToTopTrigger((prev) => prev + 1);

    // Broadcast live event for ProfileScreen and real-time counters
    window.dispatchEvent(new CustomEvent('reel-published', { detail: enrichedReel }));

    setShowPublishToast(true);
    setTimeout(() => setShowPublishToast(false), 3800);
  };

  const handleOpenComments = (reelId: string) => {
    setShareReelId(null);
    setCommentReelId(reelId);
  };

  const handleCloseComments = () => {
    setCommentReelId(null);
  };

  const handleOpenShare = (reelId: string) => {
    setCommentReelId(null);
    setShareReelId(reelId);
  };

  const handleCloseShare = () => {
    setShareReelId(null);
  };

  const handleOpenReport = (reelId: string) => {
    setCommentReelId(null);
    setShareReelId(null);
    setReportReelId(reelId);
  };

  const handleCloseReport = () => {
    setReportReelId(null);
  };

  const handleReportSubmitted = (reelId: string, reason: string) => {
    // Immediately hide the reported reel from the active user's current feed session
    setHiddenReelIds((prev) => {
      const updated = [...new Set([...prev, reelId])];
      try {
        sessionStorage.setItem('gedion_hidden_reels_v1', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    setReportReelId(null);
    setReportToast('Report submitted. Thank you for keeping GediOn safe! 🛡️');
    setTimeout(() => setReportToast(null), 3800);
  };

  const handleAddComment = (commentOrText: string | CommentItem) => {
    if (!commentReelId) return;
    const newComment: CommentItem =
      typeof commentOrText === 'string'
        ? {
            id: `comment-${Date.now()}`,
            username: currentUser?.username || 'you',
            avatar:
              currentUser?.avatar ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
            text: commentOrText,
            timestamp: 'Just now',
            likes: 0,
          }
        : commentOrText;

    setReels((prev) =>
      prev.map((r) =>
        r.id === commentReelId
          ? {
              ...r,
              comments: [newComment, ...(r.comments || [])],
              commentsCount: (r.commentsCount || 0) + 1,
            }
          : r
      )
    );
  };

  return (
    <div
      className={`relative flex h-[100dvh] w-screen items-center justify-center overflow-hidden transition-colors ${
        isDark ? 'bg-[#000000]' : 'bg-[#f4f4f4]'
      }`}
    >
      {/* Initial App Launch / Splash Screen */}
      <AnimatePresence>
        {showSplash && (
          <SplashScreen onComplete={() => setShowSplash(false)} />
        )}
      </AnimatePresence>

      {/* Mobile-first viewport container (Clean Instagram device frame) */}
      <main
        className={`relative h-[100dvh] max-h-[100dvh] w-full max-w-[440px] md:h-[94vh] md:max-h-[890px] md:rounded-[36px] overflow-hidden shadow-2xl transition-colors md:border select-none ${
          isDark
            ? 'bg-black text-white md:border-[#262626]'
            : 'bg-white text-black md:border-[#efefef]'
        }`}
      >
        {/* Main Tab Views */}
        <div className="relative h-full w-full overflow-hidden">
          {/* 1. HOME TAB (🏠): Instagram-Style Post Feed (Default Landing Screen) */}
          <div className={navTab === 'home' ? 'relative h-full w-full overflow-hidden' : 'hidden'}>
            <InstagramFeed
              reels={displayedReels}
              stories={stories}
              currentUser={currentUser}
              isActiveFeed={navTab === 'home'}
              isMuted={isMuted}
              isRefreshing={isRefreshing}
              onRefreshFeed={handleHomeRefresh}
              onToggleMute={handleToggleMute}
              onToggleLike={handleToggleLike}
              onToggleBookmark={handleToggleBookmark}
              onOpenComments={handleOpenComments}
              onOpenShare={handleOpenShare}
              onOpenOptions={handleOpenOptions}
              onOpenReels={handleOpenReelsFromHome}
              onOpenProfile={(username) => setSelectedProfileUsername(username)}
              onOpenYourStory={handleOpenAddStory}
              onSelectStory={handleSelectStory}
              onOpenCreate={() => {
                if (!currentUser) {
                  setAuthPromptMessage('Sign in to post photos and videos to GediOn!');
                  setIsAuthModalOpen(true);
                  return;
                }
                setCreateMode('POST');
                setNavTab('create');
              }}
              onOpenActivity={() => setNavTab('activity')}
              onOpenMessages={() => setNavTab('messages')}
              onShowToast={(msg) => {
                setFeedToast(msg);
                setTimeout(() => setFeedToast(null), 2500);
              }}
              hasUserStory={hasUserStory}
              scrollToTopTrigger={scrollToTopTrigger}
            />
          </div>

          {/* 2. REELS TAB (▶️): Full-bleed, edge-to-edge vertical Reels player */}
          {navTab === 'reels' && (
            <div className="relative h-full w-full overflow-hidden bg-black text-white">
              <ReelsFeed
                reels={displayedReels}
                isMuted={isMuted}
                onToggleMute={handleToggleMute}
                initialReelId={reelsInitialReelId}
                onUpdateReel={handleUpdateReel}
                onOpenComments={handleOpenComments}
                onOpenShare={handleOpenShare}
                onOpenReport={handleOpenReport}
                onOpenOptions={handleOpenOptions}
                onOpenLikes={(reelId) => setLikesReelId(reelId)}
                onOpenProfile={(username) => setSelectedProfileUsername(username)}
                scrollToTopTrigger={scrollToTopTrigger}
                reelsRefreshTrigger={reelsRefreshTrigger}
                onReelsLoaded={handleReelsLoaded}
                onNewRealtimeReel={handleNewRealtimeReel}
                currentUser={currentUser}
                onStoriesVisibilityChange={setIsStoriesVisible}
                onRequireAuth={(prompt) => {
                  setAuthPromptMessage(prompt);
                  setIsAuthModalOpen(true);
                }}
                onOpenCreateStory={() => {
                  if (!currentUser) {
                    setAuthPromptMessage('Sign in to broadcast your reels to GediOn!');
                    setIsAuthModalOpen(true);
                    return;
                  }
                  setCreateMode('REEL');
                  setNavTab('create');
                }}
              />

              {/* Floating Instagram Reels Top Header: Back Arrow (←), "Reels | Friends" tabs, and Camera Action */}
              <div className="absolute top-0 inset-x-0 z-30 pointer-events-none flex flex-col bg-gradient-to-b from-black/85 via-black/40 to-transparent pt-1.5 pb-2 transition-all duration-300">
                <ReelsHeader
                  activeSubTab={reelsSubTab}
                  onSubTabChange={setReelsSubTab}
                  onBackToHome={handleBackToHomeFeed}
                  onOpenCreateReel={() => {
                    if (!currentUser) {
                      setAuthPromptMessage('Sign in to broadcast your reels to GediOn!');
                      setIsAuthModalOpen(true);
                      return;
                    }
                    setCreateMode('REEL');
                    setNavTab('create');
                  }}
                />
              </div>
            </div>
          )}

          {/* 3. EXPLORE & SEARCH (2nd Tab in BottomNav) */}
          {(navTab === 'explore' || (navTab as string) === 'search') && (
            <ExploreView
              onClose={() => setNavTab('home')}
              reels={reels}
              onOpenProfile={(username) => {
                setSelectedProfileUsername(username);
              }}
              onOpenChatWithUser={(username) => {
                setChatTargetUser(username);
                setNavTab('messages');
              }}
            />
          )}

          {/* 4. CREATE / RECORD */}
          {navTab === 'create' && (
            <VideoUploadModal
              isOpen={navTab === 'create'}
              onClose={() => setNavTab('home')}
              onPublish={handlePublishReel}
              currentUser={currentUser}
            />
          )}

          {/* 5. DIRECT MESSAGES */}
          {navTab === 'messages' && (
            <ChatView
              onClose={() => setNavTab('home')}
              initialUserId={chatTargetUser}
              onClearInitialUser={() => setChatTargetUser(null)}
            />
          )}

          {/* 6. ACTIVITY / NOTIFICATIONS */}
          {navTab === 'activity' && (
            <ActivityView
              onClose={() => setNavTab('home')}
              reels={reels}
              onOpenChatWithUser={(user) => {
                setChatTargetUser(user);
                setNavTab('messages');
              }}
            />
          )}

          {/* 7. PROFILE */}
          {navTab === 'profile' && (
            <ProfileScreen
              onClose={() => setNavTab('home')}
              reels={reels}
              onOpenCreateReel={() => {
                if (!currentUser) {
                  setAuthPromptMessage('Sign in to broadcast your reels to GediOn!');
                  setIsAuthModalOpen(true);
                  return;
                }
                setCreateMode('REEL');
                setNavTab('create');
              }}
              onEditingChange={setIsEditProfileOpen}
              onOpenAuthModal={(prompt) => {
                setAuthPromptMessage(prompt || 'Sign in to access your creator profile & broadcast reels!');
                setIsAuthModalOpen(true);
              }}
              onOpenOnboardingVideo={() => setIsOnboardingVideoOpen(true)}
              onSignOut={handleSignOut}
              onDeleteReel={handleDeleteReel}
              currentUser={currentUser}
            />
          )}
        </div>

        {/* PWA 1-Tap App Install Prompt Banner */}
        <PwaInstallBanner
          deferredPrompt={deferredPrompt}
          isModalOpen={isSheetOpen || isCreateOpen || isEditProfileOpen || isOnboardingVideoOpen || isAuthModalOpen}
        />

        {/* Toast Notifications */}
        <AnimatePresence>
          {showPublishToast && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-bold text-white shadow-xl backdrop-blur-xl pointer-events-none"
            >
              <span>🎉 Published to GediOn Feed!</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {deleteToast && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="absolute top-16 left-1/2 -translate-x-1/2 z-[95] flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/95 border border-rose-500 text-xs font-bold text-white shadow-xl backdrop-blur-xl pointer-events-none text-center max-w-[90%]"
            >
              <span className="text-rose-400 font-extrabold text-sm">✓</span>
              <span>{deleteToast}</span>
            </motion.div>
          )}
        </AnimatePresence>



        <AnimatePresence>
          {feedToast && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="absolute top-16 left-1/2 -translate-x-1/2 z-[95] flex items-center gap-2 px-4 py-2.5 rounded-full bg-zinc-900/95 border border-zinc-700 text-xs font-bold text-white shadow-xl backdrop-blur-xl pointer-events-none text-center max-w-[90%]"
            >
              <span>{feedToast}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reel Options Menu Modal (Delete / Share / Report / Copy Link) */}
        {optionsReel && (
          <ReelOptionsMenu
            isOpen={isOptionsMenuOpen}
            onClose={handleCloseOptions}
            reel={optionsReel}
            currentUser={currentUser}
            onDeleteReel={handleDeleteReel}
            onOpenReport={(r) => handleOpenReport(r.id)}
            onOpenShare={(r) => handleOpenShare(r.id)}
            onShowToast={(msg) => {
              if (msg === 'Reel deleted successfully') {
                setDeleteToast(msg);
                setTimeout(() => setDeleteToast(null), 3000);
              } else {
                setFeedToast(msg);
                setTimeout(() => setFeedToast(null), 2500);
              }
            }}
          />
        )}

        {/* Floating Toast upon successfully publishing a new Story */}
        <AnimatePresence>
          {storyToast && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-zinc-900/95 border border-zinc-700 text-xs font-bold text-white shadow-xl backdrop-blur-xl pointer-events-none"
            >
              <span>{storyToast}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Toast upon Login Verification / Celebratory Auth */}
        <AnimatePresence>
          {authToast && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-zinc-900/95 border border-zinc-700 text-xs font-bold text-white shadow-xl backdrop-blur-xl pointer-events-none"
            >
              <span>{authToast}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Toast upon Reporting a Reel */}
        <AnimatePresence>
          {reportToast && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-zinc-900/95 border border-zinc-700 text-xs font-bold text-white shadow-xl backdrop-blur-xl pointer-events-none text-center max-w-[90%]"
            >
              <span>{reportToast}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Comments Bottom Sheet Drawer */}
        <CommentDrawer
          isOpen={isCommentsOpen}
          onClose={handleCloseComments}
          reel={activeCommentReel}
          comments={activeCommentReel?.comments ?? []}
          onAddComment={handleAddComment}
          currentUser={currentUser || undefined}
        />

        {/* Share Modal Bottom Sheet */}
        {activeShareReel && (
          <ShareSheet
            isOpen={isShareOpen}
            onClose={handleCloseShare}
            reel={activeShareReel}
            onOpenReport={(r) => handleOpenReport(r.id)}
          />
        )}

        {/* Report Content Bottom Sheet */}
        {activeReportReel && (
          <ReportModal
            isOpen={isReportOpen}
            onClose={handleCloseReport}
            reel={activeReportReel}
            onReportSubmitted={handleReportSubmitted}
          />
        )}

        {/* Likes and Plays Modal Bottom Sheet */}
        <LikesAndPlaysModal
          isOpen={isLikesOpen}
          onClose={() => setLikesReelId(null)}
          reel={activeLikesReel}
          currentUser={currentUser}
        />

        {/* Floating Bottom Navigation Bar (Hidden when drawer, share, edit profile, or create camera is open) */}
        <BottomNav
          activeTab={navTab}
          onSelectTab={handleSelectNavTab}
          onHomeRefresh={handleHomeRefresh}
          onHomeScrollToTop={handleHomeScrollToTop}
          onReelsRefresh={handleReelsRefresh}
          onReelsScrollToTop={handleReelsScrollToTop}
          isRefreshing={isRefreshing}
          hasUnreadMessages={false}
          hasUnreadNotifications={false}
          isVisible={!isSheetOpen && !isCreateOpen && !isEditProfileOpen}
        />
      </main>

      {/* Real Supabase Authentication Modal (Sign In / Sign Up with Email & Google) */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => {
              setIsAuthModalOpen(false);
              setAuthPromptMessage(undefined);
            }}
            onLoginSuccess={handleLoginSuccess}
            promptMessage={authPromptMessage}
            canDismiss={true}
          />
        )}
      </AnimatePresence>

      {/* Mandatory Zomato-Style Onboarding Demo & Earnings Video Screen */}
      <AnimatePresence>
        {isOnboardingVideoOpen && (
          <OnboardingVideoModal
            isOpen={isOnboardingVideoOpen}
            user={currentUser || DEFAULT_AUTH_USER}
            onComplete={handleOnboardingComplete}
          />
        )}
      </AnimatePresence>

      {/* Story Fullscreen Preview Modal */}
      <StoryPreviewModal
        stories={stories}
        initialIndex={selectedStoryIndex}
        isOpen={isStoryPreviewOpen}
        onClose={() => setIsStoryPreviewOpen(false)}
      />

      {/* Add Story Modal */}
      <AddStoryModal
        isOpen={isAddStoryOpen}
        onClose={() => setIsAddStoryOpen(false)}
        onPublishStory={handlePublishStory}
        currentUser={currentUser}
      />

      {/* Creator Public Profile Modal (Clickable avatar / username from Reels & Feed) */}
      <UserProfileModal
        isOpen={Boolean(selectedProfileUsername)}
        onClose={() => setSelectedProfileUsername(null)}
        username={selectedProfileUsername}
        reels={reels}
        currentUser={currentUser}
        onOpenChatWithUser={(targetUser) => {
          setSelectedProfileUsername(null);
          setChatTargetUser(targetUser);
          setNavTab('messages');
        }}
        onOpenReel={(reelId) => {
          setSelectedProfileUsername(null);
          handleOpenReelsFromHome(reelId);
        }}
      />
    </div>
  );
};
