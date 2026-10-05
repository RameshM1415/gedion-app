import React, { useRef, useState, useEffect } from 'react';
import { Reel } from '../types';
import { RightActionBar } from './RightActionBar';
import { BottomInfoBar } from './BottomInfoBar';
import { CenterPulseIcon } from './CenterPulseIcon';
import { FloatingHearts, FloatingHeartItem } from './FloatingHearts';
import { LikesAndPlaysModal } from './LikesAndPlaysModal';
import { supabase, updateReelLikesInSupabase } from '../utils/supabaseClient';

import { AuthUser } from '../utils/authStorage';

interface ReelItemProps {
  reel: Reel;
  isActive: boolean;
  isMuted: boolean;
  onUpdateReel: (updated: Reel) => void;
  onOpenComments: () => void;
  onOpenShare: () => void;
  onOpenReport?: () => void;
  onOpenOptions?: () => void;
  onOpenLikes?: () => void;
  currentUser?: AuthUser | null;
  onRequireAuth?: (promptMessage: string) => void;
}

export const ReelItem: React.FC<ReelItemProps> = ({
  reel,
  isActive,
  isMuted,
  onUpdateReel,
  onOpenComments,
  onOpenShare,
  onOpenReport,
  onOpenOptions,
  onOpenLikes,
  currentUser,
  onRequireAuth,
}) => {
  const effectiveVideoUrl = reel.videoUrl || (reel as any).video_url || '';
  const isImage = reel.mediaType === 'image' || (!effectiveVideoUrl && Boolean(reel.poster));
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showPulse, setShowPulse] = useState(false);
  const [pulseIsPlaying, setPulseIsPlaying] = useState(false);
  const [hearts, setHearts] = useState<FloatingHeartItem[]>([]);
  const [doubleTapHearts, setDoubleTapHearts] = useState<{ id: number }[]>([]);
  const [followToast, setFollowToast] = useState<string | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isLocalLikesOpen, setIsLocalLikesOpen] = useState(false);

  // Instant Optimistic UI state for Like status and Like counter
  const [optimisticLiked, setOptimisticLiked] = useState<boolean>(Boolean(reel.isLiked));
  const [optimisticLikesCount, setOptimisticLikesCount] = useState<number>(
    typeof reel.likesCount === 'number' ? reel.likesCount : 0
  );

  useEffect(() => {
    setOptimisticLiked(Boolean(reel.isLiked));
    setOptimisticLikesCount(typeof reel.likesCount === 'number' ? reel.likesCount : 0);
  }, [reel.id, reel.isLiked, reel.likesCount]);

  // Zoom / Pan state for photo mode
  const [zoomScale, setZoomScale] = useState(1);
  const touchStartDistRef = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(1);

  // High-precision double-tap detection refs
  const lastTapTimeRef = useRef<number>(0);
  const lastTapPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const singleTapTimeoutRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize and clean up audio element
  useEffect(() => {
    if (reel.audioUrl) {
      const audio = new Audio(reel.audioUrl);
      audio.loop = true;
      audio.muted = isMuted;
      audioRef.current = audio;
    } else {
      audioRef.current = null;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [reel.audioUrl]);

  // Synchronize playback with isActive state
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;

    if (isActive) {
      if (video) {
        video.currentTime = 0;
        if (audio) {
          audio.currentTime = 0;
          audio.muted = isMuted;
        }
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
              if (audio) {
                audio.play().catch(() => {});
              }
            })
            .catch((err) => {
              console.log('Autoplay handled:', err);
              setIsPlaying(false);
            });
        }
      } else if (audio) {
        audio.currentTime = 0;
        audio.muted = isMuted;
        audio.play().catch(() => {});
        setIsPlaying(true);
      }
    } else {
      if (video) {
        video.pause();
      }
      if (audio) {
        audio.pause();
      }
      setIsPlaying(false);
      setZoomScale(1);
    }
  }, [isActive, isMuted]);

  // Handle Mute state change
  useEffect(() => {
    if (reel.audioUrl) {
      if (videoRef.current) {
        videoRef.current.muted = true;
      }
      if (audioRef.current) {
        audioRef.current.muted = isMuted;
      }
    } else {
      if (videoRef.current) {
        videoRef.current.muted = isMuted;
      }
    }
  }, [isMuted, reel.audioUrl]);

  // Toggle Play / Pause on Single Tap
  const togglePlayPause = () => {
    if (isImage) {
      if (audioRef.current) {
        if (audioRef.current.paused) {
          audioRef.current.play().catch(() => {});
          setIsPlaying(true);
          setPulseIsPlaying(true);
        } else {
          audioRef.current.pause();
          setIsPlaying(false);
          setPulseIsPlaying(false);
        }
        setShowPulse(true);
        setTimeout(() => setShowPulse(false), 500);
      } else {
        setZoomScale((prev) => (prev > 1 ? 1 : 1.5));
      }
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
      audioRef.current?.play().catch(() => {});
      setIsPlaying(true);
      setPulseIsPlaying(true);
    } else {
      video.pause();
      audioRef.current?.pause();
      setIsPlaying(false);
      setPulseIsPlaying(false);
    }
    setShowPulse(true);
    setTimeout(() => setShowPulse(false), 500);
  };

  // Shared Optimistic UI Like Toggle (used by both Double-Tap and Heart button click)
  const applyOptimisticLikeToggle = () => {
    const nextIsLiked = !optimisticLiked;
    const nextCount = nextIsLiked
      ? optimisticLikesCount + 1
      : Math.max(0, optimisticLikesCount - 1);

    // 1. Instant 0ms Optimistic UI state update
    setOptimisticLiked(nextIsLiked);
    setOptimisticLikesCount(nextCount);

    onUpdateReel({
      ...reel,
      isLiked: nextIsLiked,
      likesCount: nextCount,
    });

    // 2. Background non-blocking Supabase sync (never freezes UI)
    updateReelLikesInSupabase(reel.id, nextCount, nextIsLiked).catch(() => {});
  };

  // 1. Double-Tap Instagram Dual-Tone Heart Burst & Optimistic Like Toggle
  const triggerDoubleTapHeart = () => {
    const heartId = Date.now() + Math.random();

    // Trigger center Instagram pop-up heart burst animation
    setDoubleTapHearts((prev) => [...prev, { id: heartId }]);

    // Auto-cleanup safety timer
    setTimeout(() => {
      setDoubleTapHearts((prev) => prev.filter((p) => p.id !== heartId));
    }, 850);

    // Haptic feedback if supported on mobile
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([30, 50, 30]);
      } catch {
        // ignore
      }
    }

    // Instantly toggle liked status (+1 when liked, -1 when unliked) and sync in background
    applyOptimisticLikeToggle();
  };

  // Unified Double-Tap vs Single-Tap listener on the video container
  const handlePointerOrClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    const DOUBLE_TAP_THRESHOLD = 320;
    const DISTANCE_THRESHOLD = 60;

    const currentX = e.clientX;
    const currentY = e.clientY;
    const prevPos = lastTapPosRef.current;
    const dist = Math.hypot(currentX - prevPos.x, currentY - prevPos.y);

    if (now - lastTapTimeRef.current < DOUBLE_TAP_THRESHOLD && dist < DISTANCE_THRESHOLD) {
      // Double tap detected!
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
        singleTapTimeoutRef.current = null;
      }
      lastTapTimeRef.current = 0;
      triggerDoubleTapHeart();
    } else {
      // Single tap candidate
      lastTapTimeRef.current = now;
      lastTapPosRef.current = { x: currentX, y: currentY };
      singleTapTimeoutRef.current = window.setTimeout(() => {
        togglePlayPause();
      }, DOUBLE_TAP_THRESHOLD);
    }
  };

  const handleHeartComplete = (id: number) => {
    setHearts((prev) => prev.filter((h) => h.id !== id));
  };

  // 2. Heart (Dil) Button Action & Instant Optimistic Sync
  const handleToggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Haptic pulse
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(25);
      } catch {
        // ignore
      }
    }

    applyOptimisticLikeToggle();
  };

  const handleToggleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      onRequireAuth?.('Sign in to bookmark and save reels to your profile!');
      return;
    }
    const newIsBookmarked = !reel.isBookmarked;
    try {
      const stored = localStorage.getItem('gedion_saved_reels_v1');
      let savedIds: string[] = stored ? JSON.parse(stored) : [];
      if (newIsBookmarked) {
        if (!savedIds.includes(reel.id)) savedIds.push(reel.id);
      } else {
        savedIds = savedIds.filter((id) => id !== reel.id);
      }
      localStorage.setItem('gedion_saved_reels_v1', JSON.stringify(savedIds));
      window.dispatchEvent(new Event('saved-reels-updated'));
    } catch {
      // ignore
    }
    onUpdateReel({
      ...reel,
      isBookmarked: newIsBookmarked,
    });
  };

  // 5. Creator Follow Toggle
  const handleToggleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextFollowing = !reel.isFollowing;

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(40);
      } catch {
        // ignore
      }
    }

    onUpdateReel({
      ...reel,
      isFollowing: nextFollowing,
    });

    if (nextFollowing) {
      setFollowToast(`Following @${reel.username}`);
    } else {
      setFollowToast(`Unfollowed @${reel.username}`);
    }

    setTimeout(() => {
      setFollowToast(null);
    }, 2400);
  };

  const mediaSource = isImage ? (reel.poster || effectiveVideoUrl) : effectiveVideoUrl;

  // Pinch-to-zoom support for mobile touch screens
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
      initialScaleRef.current = zoomScale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / touchStartDistRef.current;
      const newScale = Math.min(Math.max(initialScaleRef.current * factor, 1), 3);
      setZoomScale(newScale);
    }
  };

  const handleTouchEnd = () => {
    touchStartDistRef.current = null;
    if (zoomScale < 1.05) {
      setZoomScale(1);
    }
  };

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-black select-none snap-start-always gpu-accelerated"
      onClick={handlePointerOrClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Ambience / Poster fallback */}
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-700 ${
          videoLoaded && !videoError && !isImage ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ backgroundImage: `url(${reel.poster || mediaSource})` }}
      >
        <div className={`absolute inset-0 bg-gradient-to-t ${reel.fallbackGradient} opacity-80`} />
      </div>

      {/* Main Fullscreen Media (Photo or Video) */}
      {isImage ? (
        <div className="relative h-full w-full flex items-center justify-center overflow-hidden">
          <img
            src={mediaSource}
            alt={reel.caption || 'GediOn Photo'}
            loading="eager"
            className="h-full w-full object-cover transition-transform duration-200 ease-out will-change-transform"
            style={{
              transform: `scale(${zoomScale})`,
              cursor: zoomScale > 1 ? 'grab' : 'zoom-in',
            }}
          />
        </div>
      ) : (
        <video
          ref={videoRef}
          src={reel.videoUrl}
          poster={reel.poster}
          playsInline
          webkit-playsinline="true"
          loop
          muted={reel.audioUrl ? true : isMuted}
          preload="auto"
          onLoadedData={() => setVideoLoaded(true)}
          onTimeUpdate={() => {
            if (audioRef.current && videoRef.current && !audioRef.current.paused) {
              if (Math.abs(videoRef.current.currentTime - audioRef.current.currentTime) > 0.3) {
                audioRef.current.currentTime = videoRef.current.currentTime;
              }
            }
          }}
          onError={() => {
            console.warn(`Video load fallback for ${reel.id}`);
            setVideoError(true);
          }}
          className="h-full w-full object-cover"
        />
      )}

      {/* Cinematic Top and Bottom Gradient Scrims */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/85" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black via-black/50 to-transparent" />

      {/* Center Pulse Play/Pause Indicator */}
      <CenterPulseIcon isPlaying={pulseIsPlaying} visible={showPulse} />

      {/* 1. Double-Tap Clean Center Instagram Dual-Tone Heart Burst (100% transparent video background) */}
      {doubleTapHearts.map((pop) => (
        <div
          key={pop.id}
          onAnimationEnd={() => setDoubleTapHearts((prev) => prev.filter((p) => p.id !== pop.id))}
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 animate-ig-heart-burst select-none"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-28 w-28 drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)] drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] select-none pointer-events-none"
          >
            <defs>
              <linearGradient id={`ig-heart-grad-${pop.id}`} x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fd1d1d" />
                <stop offset="45%" stopColor="#e1306c" />
                <stop offset="100%" stopColor="#833ab4" />
              </linearGradient>
            </defs>
            <path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              fill={`url(#ig-heart-grad-${pop.id})`}
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      ))}

      {/* Follow Toast Notification */}
      {followToast && (
        <div className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/95 border border-zinc-700 text-xs font-bold text-white shadow-xl backdrop-blur-md">
          <span className="text-emerald-400 font-extrabold text-sm">✓</span>
          <span>{followToast}</span>
        </div>
      )}

      {/* Floating Particle Hearts */}
      <FloatingHearts hearts={hearts} onHeartComplete={handleHeartComplete} />

      {/* Right Action Rail (Like, Comment, Save, Share, Follow) */}
      <RightActionBar
        reel={{
          ...reel,
          isLiked: optimisticLiked,
          likesCount: optimisticLikesCount,
        }}
        isPlaying={isPlaying}
        onToggleLike={handleToggleLike}
        onToggleBookmark={handleToggleBookmark}
        onToggleFollow={handleToggleFollow}
        onOpenComments={onOpenComments}
        onOpenShare={onOpenShare}
        onOpenReport={onOpenReport}
        onOpenOptions={onOpenOptions}
        onOpenLikesSheet={() => {
          if (onOpenLikes) {
            onOpenLikes();
          } else {
            setIsLocalLikesOpen(true);
          }
        }}
      />

      {/* Bottom Creator & Audio Info Bar */}
      <BottomInfoBar reel={reel} />

      {/* Fallback Likes and Plays Modal */}
      {!onOpenLikes && (
        <LikesAndPlaysModal
          isOpen={isLocalLikesOpen}
          onClose={() => setIsLocalLikesOpen(false)}
          reel={{
            ...reel,
            isLiked: optimisticLiked,
            likesCount: optimisticLikesCount,
          }}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

