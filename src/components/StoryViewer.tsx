import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Send, CheckCircle2 } from 'lucide-react';
import { StoryItem } from '../types';

export interface StoryViewerProps {
  stories: StoryItem[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_IMAGE_DURATION = 5000; // 5 seconds for images

const isValidUrl = (url: unknown): url is string => {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return false;
  return (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('./')
  );
};

export const StoryViewer: React.FC<StoryViewerProps> = ({
  stories,
  initialIndex,
  isOpen,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [isPaused, setIsPaused] = useState(false);
  const [reactionToast, setReactionToast] = useState<string | null>(null);
  const [floatingReactions, setFloatingReactions] = useState<{ id: number; emoji: string; x: number }[]>([]);
  const [replyText, setReplyText] = useState('');
  const [avatarError, setAvatarError] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const elapsedBeforePauseRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const [storyDuration, setStoryDuration] = useState<number>(DEFAULT_IMAGE_DURATION);

  const currentStory = stories[currentIndex] || stories[0];

  const isVideo = Boolean(
    currentStory?.storyMediaUrl?.match(/\.(mp4|webm|mov|ogg)($|\?)/i) ||
      currentStory?.storyMediaUrl?.startsWith('blob:') ||
      currentStory?.storyMediaUrl?.startsWith('data:video')
  );

  // Reset state on initial index / story switch
  useEffect(() => {
    setCurrentIndex(initialIndex);
    setProgress(0);
    elapsedBeforePauseRef.current = 0;
    startTimeRef.current = Date.now();
    setStoryDuration(DEFAULT_IMAGE_DURATION);
    setAvatarError(false);
  }, [initialIndex]);

  useEffect(() => {
    setAvatarError(false);
    setProgress(0);
    elapsedBeforePauseRef.current = 0;
    startTimeRef.current = Date.now();

    if (!isVideo) {
      setStoryDuration(DEFAULT_IMAGE_DURATION);
    }
  }, [currentIndex, isVideo]);

  // Handle dynamic duration for video elements
  const handleVideoLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const dur = e.currentTarget.duration;
    if (dur && !isNaN(dur) && isFinite(dur) && dur > 0) {
      setStoryDuration(dur * 1000);
      startTimeRef.current = Date.now();
      elapsedBeforePauseRef.current = 0;
    }
  };

  // Navigate to next story or close if at the end
  const handleNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
      elapsedBeforePauseRef.current = 0;
      startTimeRef.current = Date.now();
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onClose]);

  // Navigate to previous story or reset current
  const handlePrev = useCallback(() => {
    if (progress > 20 || currentIndex === 0) {
      // Restart current story if already played more than 20%
      setProgress(0);
      elapsedBeforePauseRef.current = 0;
      startTimeRef.current = Date.now();
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
    } else {
      setCurrentIndex((prev) => Math.max(0, prev - 1));
      setProgress(0);
      elapsedBeforePauseRef.current = 0;
      startTimeRef.current = Date.now();
    }
  }, [currentIndex, progress]);

  // Progress Bar timer loop with dynamic duration support (5s for images, dynamic for video)
  useEffect(() => {
    if (!isOpen || isPaused || !currentStory) return;

    startTimeRef.current = Date.now() - elapsedBeforePauseRef.current;

    const step = () => {
      // If video is loaded, synchronize with video's current playback position if available
      let currentPct = 0;
      if (isVideo && videoRef.current && videoRef.current.duration > 0) {
        currentPct = Math.min(100, (videoRef.current.currentTime / videoRef.current.duration) * 100);
      } else {
        const elapsed = Date.now() - startTimeRef.current;
        currentPct = Math.min(100, (elapsed / storyDuration) * 100);
      }

      setProgress(currentPct);

      if (currentPct >= 100) {
        handleNext();
      } else {
        animFrameRef.current = requestAnimationFrame(step);
      }
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isOpen, isPaused, currentIndex, storyDuration, isVideo, handleNext, currentStory]);

  // Keyboard navigation support (ArrowRight for next, ArrowLeft for prev, Escape to close)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  // Handle Pause when pressing down, resume on release
  const handlePointerDown = () => {
    setIsPaused(true);
    if (isVideo && videoRef.current) {
      videoRef.current.pause();
    }
    elapsedBeforePauseRef.current = (progress / 100) * storyDuration;
  };

  const handlePointerUp = () => {
    setIsPaused(false);
    if (isVideo && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  // Quick Emoji Reaction handler
  const handleSendReaction = (emoji: string) => {
    const newReaction = {
      id: Date.now() + Math.random(),
      emoji,
      x: 35 + Math.random() * 30,
    };
    setFloatingReactions((prev) => [...prev, newReaction]);

    setReactionToast(`Sent ${emoji} to ${currentStory.username}`);
    setTimeout(() => setReactionToast(null), 2000);

    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 1800);
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setReactionToast(`Message sent to ${currentStory.username}`);
    setReplyText('');
    setTimeout(() => setReactionToast(null), 2000);
  };

  if (!isOpen || !currentStory) return null;

  const candidateAvatar = currentStory.avatar;
  const hasValidAvatarUrl = isValidUrl(candidateAvatar);
  const avatarInitial = (currentStory.username || 'S').replace(/^@/, '').charAt(0).toUpperCase();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 select-none"
      >
        {/* Main 9:16 Story Frame with Swipe Down to Exit */}
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.5 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 80 || info.velocity.y > 300) {
              onClose();
            }
          }}
          className="relative flex flex-col h-full w-full max-w-[440px] md:h-[94vh] md:max-h-[890px] md:rounded-[32px] overflow-hidden bg-neutral-950 shadow-2xl md:border md:border-white/15"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Background Media Image or Video */}
          <div className="absolute inset-0 z-0 bg-neutral-900 flex items-center justify-center">
            {isVideo ? (
              <video
                ref={videoRef}
                src={currentStory.storyMediaUrl}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={handleVideoLoadedMetadata}
                onEnded={handleNext}
                className="h-full w-full object-cover select-none pointer-events-none"
              />
            ) : (
              <img
                src={currentStory.storyMediaUrl}
                alt=""
                className="h-full w-full object-cover select-none pointer-events-none"
              />
            )}
            {/* Top and bottom dark scrims for legibility */}
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/90 via-black/45 to-transparent pointer-events-none" />
          </div>

          {/* Left / Right Tap Areas for Story Flipping */}
          <div className="absolute inset-0 z-10 flex pointer-events-auto">
            {/* Tap Left: Previous */}
            <div
              className="w-1/3 h-full cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              title="Previous story"
            />
            {/* Tap Right: Next */}
            <div
              className="w-2/3 h-full cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              title="Next story"
            />
          </div>

          {/* Top Floating Header & Segmented Progress Bars */}
          <div className="relative z-20 flex flex-col px-3.5 pt-3 pb-2 gap-2 pointer-events-none">
            {/* Segmented Top Progress Indicators matching count of stories */}
            <div className="flex items-center gap-1.5 w-full">
              {stories.map((story, idx) => {
                let fillPercent = 0;
                if (idx < currentIndex) {
                  fillPercent = 100;
                } else if (idx === currentIndex) {
                  fillPercent = progress;
                }

                return (
                  <div
                    key={story.id || idx}
                    className="relative flex-1 h-[2.5px] rounded-full bg-white/25 overflow-hidden backdrop-blur-sm"
                  >
                    <div
                      className="h-full bg-white transition-all duration-75 ease-linear rounded-full"
                      style={{ width: `${fillPercent}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Creator Info Row */}
            <div className="flex items-center justify-between pointer-events-auto">
              <div className="flex items-center gap-2.5">
                {/* Instagram Gradient Ring Avatar with safe fallback */}
                <div className="relative h-9 w-9 rounded-full p-[1.5px] bg-gradient-to-tr from-[#fba73f] via-[#dc2743] to-[#bc1888] flex items-center justify-center overflow-hidden">
                  {hasValidAvatarUrl && !avatarError ? (
                    <img
                      src={candidateAvatar}
                      alt=""
                      onError={() => setAvatarError(true)}
                      className="h-full w-full rounded-full object-cover border border-black"
                    />
                  ) : (
                    <div className="h-full w-full rounded-full bg-neutral-900 border border-black flex items-center justify-center text-white font-bold text-xs select-none">
                      {avatarInitial}
                    </div>
                  )}
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-bold text-white tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      {currentStory.username}
                    </span>
                    {currentStory.isVerified && (
                      <CheckCircle2 size={13} className="text-[#0095f6] fill-[#0095f6]" />
                    )}
                  </div>
                  <span className="text-[10.5px] font-medium text-white/70 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                    {currentStory.timestamp || 'Just now'}
                  </span>
                </div>
              </div>

              {/* Close Button (X) to dismiss */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full text-white/90 hover:text-white bg-black/20 hover:bg-black/40 backdrop-blur-md active:scale-90 transition-transform cursor-pointer"
                aria-label="Close story"
              >
                <X size={22} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Story Caption Sticker */}
          {currentStory.caption && (
            <div className="relative z-20 mt-auto mb-4 px-4 pointer-events-none">
              <div className="inline-block max-w-[90%] px-3.5 py-2 rounded-2xl bg-black/55 backdrop-blur-md border border-white/15 text-[13.5px] font-medium text-white shadow-xl">
                {currentStory.caption}
              </div>
            </div>
          )}

          {/* Bottom Interactive Reply Bar */}
          <div className="relative z-20 px-3.5 pb-4 pt-2 flex items-center gap-2 pointer-events-auto">
            <form onSubmit={handleSendReply} className="flex-1 relative flex items-center">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onFocus={() => setIsPaused(true)}
                onBlur={() => setIsPaused(false)}
                placeholder={`Reply to ${currentStory.username}...`}
                className="w-full h-11 pl-4 pr-10 rounded-full bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/20 text-white placeholder-white/60 text-xs focus:outline-none backdrop-blur-md transition-colors"
              />
              <button
                type="submit"
                disabled={!replyText.trim()}
                className="absolute right-2 flex h-7 w-7 items-center justify-center rounded-full text-[#0095f6] disabled:opacity-40 disabled:text-white/40 active:scale-95 cursor-pointer"
                aria-label="Send reply"
              >
                <Send size={15} />
              </button>
            </form>

            {/* Quick Emoji Reaction Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleSendReaction('❤️')}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:scale-90 text-red-500 backdrop-blur-md transition-all cursor-pointer"
                title="Love"
                aria-label="React with Heart"
              >
                <Heart size={18} fill="#ef4444" />
              </button>
              <button
                type="button"
                onClick={() => handleSendReaction('🔥')}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:scale-90 text-amber-400 backdrop-blur-md transition-all text-base cursor-pointer"
                title="Fire"
                aria-label="React with Fire"
              >
                🔥
              </button>
              <button
                type="button"
                onClick={() => handleSendReaction('👏')}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:scale-90 backdrop-blur-md transition-all text-base cursor-pointer"
                title="Clap"
                aria-label="React with Clap"
              >
                👏
              </button>
            </div>
          </div>

          {/* Floating Emoji Particle Animations */}
          <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
            {floatingReactions.map((r) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 1, y: 300, scale: 0.6 }}
                animate={{ opacity: 0, y: -200, scale: 1.6 }}
                transition={{ duration: 1.6, ease: 'easeOut' }}
                style={{ left: `${r.x}%`, position: 'absolute', bottom: '80px' }}
                className="text-3xl filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
              >
                {r.emoji}
              </motion.div>
            ))}
          </div>

          {/* Toast Notification for message or reaction sent */}
          <AnimatePresence>
            {reactionToast && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 z-40 px-4 py-1.5 rounded-full bg-black/80 border border-white/20 text-xs font-semibold text-white shadow-xl backdrop-blur-md"
              >
                {reactionToast}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Re-export as StoryPreviewModal for backwards compatibility
export { StoryViewer as StoryPreviewModal };
export type { StoryViewerProps as StoryPreviewModalProps };
