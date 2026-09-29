import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Download, X } from 'lucide-react';
import { INITIAL_REELS } from './data/mockReels';
import { Reel, FeedTab, NavTab } from './types';
import { TopHeader } from './components/TopHeader';
import { BottomNav } from './components/BottomNav';
import { ReelsFeed } from './components/ReelsFeed';
import { CommentDrawer } from './components/CommentDrawer';
import { ShareSheet } from './components/ShareSheet';
import { ReportModal } from './components/ReportModal';
import { ExploreView, ActivityView, ProfileScreen, ProfileView } from './components/SecondaryViews';
import { ChatView } from './components/ChatView';
import { SplashScreen } from './components/SplashScreen';
import { AuthModal } from './components/AuthModal';
import { OnboardingVideoModal } from './components/OnboardingVideoModal';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { VideoUploadModal } from './components/VideoUploadModal';
import { supabase, fetchSupabaseReels } from './utils/supabaseClient';
import {
  AuthUser,
  getStoredAuth,
  setStoredAuth,
  clearStoredAuth,
  mapSupabaseUserToAuthUser,
  DEFAULT_AUTH_USER,
} from './utils/authStorage';

const LOCAL_REELS_STORAGE_KEY = 'gedion_custom_reels';

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
  const [reels, setReels] = useState<Reel[]>(getInitialReels);
  const [feedTab, setFeedTab] = useState<FeedTab>('forYou');
  const [navTab, setNavTab] = useState<NavTab>('home');
  const [isMuted, setIsMuted] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [createMode, setCreateMode] = useState<'POST' | 'STORY' | 'PHOTO' | 'REEL' | 'LIVE'>('REEL');
  const [chatTargetUser, setChatTargetUser] = useState<string | null>(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Authentication State & Session Persistence (Supabase Auth)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    return getStoredAuth();
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authPromptMessage, setAuthPromptMessage] = useState<string | undefined>(undefined);
  const [isOnboardingVideoOpen, setIsOnboardingVideoOpen] = useState(false);
  const [authToast, setAuthToast] = useState<string | null>(null);

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
  const [showPublishToast, setShowPublishToast] = useState(false);

  // Lifted modal state for CommentDrawer, ShareSheet, and ReportModal
  const [commentReelId, setCommentReelId] = useState<string | null>(null);
  const [shareReelId, setShareReelId] = useState<string | null>(null);
  const [reportReelId, setReportReelId] = useState<string | null>(null);
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
  const isCreateOpen = navTab === 'create';
  const isSheetOpen = isCommentsOpen || isShareOpen || isReportOpen;

  const activeCommentReel = reels.find((r) => r.id === commentReelId) || reels[0];
  const activeShareReel = reels.find((r) => r.id === shareReelId) || reels[0];
  const activeReportReel = reels.find((r) => r.id === reportReelId) || reels[0];

  // Filter reels based on Following vs For You and exclude hidden reported reels
  const displayedReels = reels
    .filter((r) => !hiddenReelIds.includes(r.id))
    .filter((r) => (feedTab === 'following' ? r.isFollowing : true));

  const handleUpdateReel = (updated: Reel) => {
    setReels((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

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
    setNavTab(tab);
  };

  // Feature 1: Home Button Double-Tap to Refresh & Scroll-to-Top (Live Supabase 'posts' query)
    const handleHomeRefresh = async () => {
    setIsRefreshing(true);
    setScrollToTopTrigger((prev) => prev + 1);
    try {
      const cloudReels = await fetchSupabaseReels();
      if (Array.isArray(cloudReels)) {
        handleReelsLoaded(cloudReels);
      }
    } catch (err) {
      console.warn('Error refreshing posts from Supabase:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

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
    <div className="relative flex h-[100dvh] w-screen items-center justify-center bg-[#020204] overflow-hidden">
      {/* Initial App Launch / Splash Screen with Ambient Neon Glow Pulse */}
      <AnimatePresence>
        {showSplash && (
          <SplashScreen onComplete={() => setShowSplash(false)} />
        )}
      </AnimatePresence>

      {/* Ambient background glow effects for wide desktop screens */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-purple-600/15 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-cyan-600/15 blur-[120px]" />

      {/* Mobile-first viewport container (9:16 aspect ratio framing with elegant bezel on desktop) */}
      <main className="relative flex flex-col h-[100dvh] max-h-[100dvh] w-full max-w-[440px] md:h-[94vh] md:max-h-[890px] md:rounded-[36px] overflow-hidden bg-black shadow-[0_0_60px_-10px_rgba(168,85,247,0.3)] md:border md:border-white/15">
        {/* Top Header with Refresh Indicator & Account/Auth Launcher */}
        <TopHeader
          currentFeedTab={feedTab}
          onSelectFeedTab={(tab) => setFeedTab(tab)}
          onOpenActivity={() => setNavTab('activity')}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          currentUser={currentUser}
          hasUnreadNotifications={false}
          isRefreshing={isRefreshing}
        />

        {/* PWA 1-Tap App Install Prompt Banner / Bottom Drawer */}
        <PwaInstallBanner
          deferredPrompt={deferredPrompt}
          isModalOpen={isSheetOpen || isCreateOpen || isEditProfileOpen || isOnboardingVideoOpen || isAuthModalOpen}
        />

        {/* Floating Toast upon successfully publishing a new Reel */}
        <AnimatePresence>
          {showPublishToast && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="absolute top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-950/95 border border-cyan-400 text-xs font-bold text-white shadow-[0_0_25px_rgba(6,182,212,0.8)] backdrop-blur-xl pointer-events-none"
            >
              <Sparkles size={14} className="text-cyan-300 animate-spin" />
              <span>🎉 Reel published live to GediOn Cloud!</span>
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
              className="absolute top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-950/95 border border-cyan-400 text-xs font-bold text-cyan-200 shadow-[0_0_25px_rgba(6,182,212,0.65)] backdrop-blur-xl pointer-events-none"
            >
              <Sparkles size={14} className="text-cyan-300 animate-spin" />
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
              className="absolute top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-rose-950/95 border border-rose-500 text-xs font-bold text-rose-200 shadow-[0_0_25px_rgba(244,63,94,0.85)] backdrop-blur-xl pointer-events-none text-center max-w-[90%]"
            >
              <span>{reportToast}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Feed or Secondary Tab Views */}
        <div className="relative flex-1 h-full w-full overflow-hidden">
          {feedTab === 'forYou' || displayedReels.length > 0 ? (
            <ReelsFeed
              reels={displayedReels}
              isMuted={isMuted}
              onUpdateReel={handleUpdateReel}
              onOpenComments={handleOpenComments}
              onOpenShare={handleOpenShare}
              onOpenReport={handleOpenReport}
              scrollToTopTrigger={scrollToTopTrigger}
              onReelsLoaded={handleReelsLoaded}
              onNewRealtimeReel={handleNewRealtimeReel}
              currentUser={currentUser}
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
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center bg-[#07070c] text-white">
              <div className="h-16 w-16 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300 mb-3 shadow-[0_0_25px_rgba(6,182,212,0.25)]">
                <span className="text-2xl">👥</span>
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider font-mono text-white">
                NO CREATORS FOLLOWED YET
              </h3>
              <p className="text-xs text-white/50 mt-1.5 max-w-xs">
                Switch to &quot;For You&quot; to discover live cyber creators or tap + to broadcast your own reel.
              </p>
              <button
                onClick={() => setFeedTab('forYou')}
                className="mt-4 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-xs font-black uppercase tracking-wider text-black shadow-[0_0_20px_rgba(6,182,212,0.6)] cursor-pointer"
              >
                Explore For You
              </button>
            </div>
          )}

          {/* Secondary Views Modal Overlays */}
          {navTab === 'explore' && (
            <ExploreView onClose={() => setNavTab('home')} reels={reels} />
          )}
          {navTab === 'create' && (
            <VideoUploadModal
              isOpen={navTab === 'create'}
              onClose={() => setNavTab('home')}
              onPublish={handlePublishReel}
              currentUser={currentUser}
            />
          )}
          {navTab === 'messages' && (
            <ChatView
              onClose={() => setNavTab('home')}
              initialUserId={chatTargetUser}
              onClearInitialUser={() => setChatTargetUser(null)}
            />
          )}
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
              currentUser={currentUser}
            />
          )}
        </div>

        {/* Comments Bottom Sheet Drawer */}
        <CommentDrawer
          isOpen={isCommentsOpen}
          onClose={handleCloseComments}
          reel={activeCommentReel}
          comments={activeCommentReel?.comments ?? []}
          onAddComment={handleAddComment}
          currentUser={currentUser}
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

        {/* Floating Bottom Navigation Bar (Hidden when drawer, share, edit profile, or create camera is open) */}
        <BottomNav
          activeTab={navTab}
          onSelectTab={handleSelectNavTab}
          onHomeRefresh={handleHomeRefresh}
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
            user={currentUser}
            onComplete={handleOnboardingComplete}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
