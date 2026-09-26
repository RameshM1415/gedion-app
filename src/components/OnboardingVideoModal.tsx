import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  Unlock,
  Sparkles,
  DollarSign,
  Zap,
  Video,
  ShieldCheck,
  CheckCircle2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  AlertCircle,
  Globe,
} from 'lucide-react';
import { GediOnLogoIcon } from './GediOnLogoIcon';
import { AuthUser, markOnboardingCompleted, setStoredAuth } from '../utils/authStorage';

export type OnboardingLanguage = 'en' | 'hi';

export const VIDEO_SOURCES: Record<OnboardingLanguage, string> = {
  en: 'https://files.catbox.moe/xcplmo.mp4',
  hi: 'https://files.catbox.moe/0cahcd.mp4',
};

export interface CreatorOnboardingModalProps {
  isOpen: boolean;
  user: AuthUser;
  onComplete: (updatedUser: AuthUser) => void;
  /** Optional video source override */
  videoUrl?: string;
}

export const OnboardingVideoModal: React.FC<CreatorOnboardingModalProps> = ({
  isOpen,
  user,
  onComplete,
  videoUrl,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const maxWatchedTimeRef = useRef<number>(0);

  // Default to English as primary default on load
  const [selectedLanguage, setSelectedLanguage] = useState<OnboardingLanguage>('en');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(8);
  const [isVideoEnded, setIsVideoEnded] = useState<boolean>(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Active video source based on selection
  const activeVideoUrl = videoUrl || VIDEO_SOURCES[selectedLanguage];

  // Initialize and attempt unmuted autoplay; gracefully fallback to muted autoplay if restricted
  useEffect(() => {
    if (!isOpen) return;

    setCurrentTime(0);
    maxWatchedTimeRef.current = 0;

    const startPlayback = async () => {
      if (!videoRef.current) return;
      try {
        videoRef.current.currentTime = 0;
        videoRef.current.muted = false;
        setIsMuted(false);
        await videoRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        // Fallback to muted autoplay if audio autoplay is restricted by browser policy
        console.warn('Autoplay with audio restricted by browser. Falling back to muted autoplay.', err);
        if (videoRef.current) {
          videoRef.current.muted = true;
          setIsMuted(true);
          try {
            await videoRef.current.play();
            setIsPlaying(true);
          } catch (playbackErr) {
            console.warn('Muted autoplay fallback error:', playbackErr);
          }
        }
      }
    };

    const timer = setTimeout(startPlayback, 120);
    return () => clearTimeout(timer);
  }, [isOpen, selectedLanguage, activeVideoUrl]);

  // Reset to English and reset states whenever modal is re-opened
  useEffect(() => {
    if (isOpen) {
      setSelectedLanguage('en');
      setIsVideoEnded(false);
      setCurrentTime(0);
      maxWatchedTimeRef.current = 0;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Language switch handler
  const handleLanguageChange = (lang: OnboardingLanguage) => {
    if (lang === selectedLanguage) return;
    setSelectedLanguage(lang);
    setIsVideoEnded(false);
    setCurrentTime(0);
    maxWatchedTimeRef.current = 0;
  };

  // Strict anti-skipping and progress calculation
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const total = videoRef.current.duration || duration;

    // Track highest continuous watched point
    if (current > maxWatchedTimeRef.current) {
      if (current - maxWatchedTimeRef.current > 1.5) {
        videoRef.current.currentTime = maxWatchedTimeRef.current;
        triggerWarning('Fast-forwarding is disabled during creator onboarding');
        return;
      }
      maxWatchedTimeRef.current = current;
    }

    setCurrentTime(current);

    // If near the end (within 0.35s), trigger completion of active video
    if (total > 0 && current >= total - 0.35 && !isVideoEnded) {
      handleVideoEnded();
    }
  };

  const handleSeeking = () => {
    if (!videoRef.current) return;
    if (videoRef.current.currentTime > maxWatchedTimeRef.current + 0.4) {
      videoRef.current.currentTime = maxWatchedTimeRef.current;
      triggerWarning('Please watch the full briefing. Skipping is disabled.');
    }
  };

  const triggerWarning = (msg: string) => {
    setWarningMessage(msg);
    setTimeout(() => {
      setWarningMessage(null);
    }, 2500);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current && !isNaN(videoRef.current.duration) && videoRef.current.duration > 0) {
      setDuration(videoRef.current.duration);
    }
  };

  // When active video reaches end, unlock the bottom action button
  const handleVideoEnded = () => {
    setIsVideoEnded(true);
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted && videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleVideoError = () => {
    // If external video stream fails, graceful nominal timer prevents user entrapment
    let simulated = 0;
    const fallbackDuration = 8;
    setDuration(fallbackDuration);
    const interval = setInterval(() => {
      simulated += 0.5;
      setCurrentTime(simulated);
      if (simulated >= fallbackDuration) {
        clearInterval(interval);
        handleVideoEnded();
      }
    }, 500);
  };

  const remainingSeconds = Math.max(0, Math.ceil(duration - currentTime));
  const progressPercent = duration > 0 ? Math.min(100, Math.round((currentTime / duration) * 100)) : 0;

  // Complete onboarding action
  const handleGetStarted = () => {
    if (!isVideoEnded) return;
    const updated = markOnboardingCompleted();
    setStoredAuth(updated);
    onComplete(updated);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-2xl text-white select-none">
      {/* Ambient Cyberpunk Neon Backlight Glows */}
      <div className="pointer-events-none absolute -top-28 -left-28 h-80 w-80 rounded-full bg-cyan-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-28 -right-28 h-80 w-80 rounded-full bg-purple-600/25 blur-[120px]" />

      {/* Warning Toast Notification if user attempts to scrub or fast-forward */}
      <AnimatePresence>
        {warningMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[140] px-4 py-2.5 rounded-full bg-amber-950/95 border border-amber-400 text-xs font-bold text-amber-200 shadow-[0_0_25px_rgba(245,158,11,0.5)] backdrop-blur-xl flex items-center gap-2 max-w-[90vw]"
          >
            <AlertCircle size={15} className="text-amber-400 shrink-0" />
            <span>{warningMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Glassmorphic Container (Framed for mobile & tablet) */}
      <div className="relative flex flex-col h-full w-full max-w-[440px] md:h-[94vh] md:max-h-[890px] md:rounded-[36px] overflow-hidden bg-[#07060f] border border-white/10 shadow-[0_0_60px_rgba(6,182,212,0.25)]">
        
        {/* Top Header Bar */}
        <div className="shrink-0 px-4 pt-4 pb-2 bg-gradient-to-b from-black/90 to-transparent z-20">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <GediOnLogoIcon size={30} showGlow={false} />
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-purple-300">
                  GediOn Creator
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 tracking-wider">
                  MANDATORY
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 text-[11px] font-mono text-cyan-400 font-bold px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30">
              <Sparkles size={11} className="animate-spin" />
              <span>Monetization Pass</span>
            </div>
          </div>

          <h1 className="text-base font-bold text-white tracking-tight leading-snug">
            Creator Welcome & Earnings Guide
          </h1>
          <p className="text-[11px] text-white/60">
            Watch the full briefing to activate your creator monetization & feed access.
          </p>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-4 py-1 space-y-3.5 scrollbar-none">
          
          {/* Responsive Vertical 9:16 Video Container with glowing neon cyan border */}
          <div className="relative w-full aspect-[9/16] max-h-[52vh] sm:max-h-[55vh] mx-auto rounded-2xl overflow-hidden border border-cyan-400/40 shadow-[0_0_30px_rgba(6,182,212,0.4)] bg-black group">
            
            {/* HTML5 Video Player: controls disabled, playsInline, autoPlay */}
            <video
              key={activeVideoUrl}
              ref={videoRef}
              src={activeVideoUrl}
              autoPlay
              playsInline
              muted={isMuted}
              controls={false}
              onTimeUpdate={handleTimeUpdate}
              onSeeking={handleSeeking}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleVideoEnded}
              onError={handleVideoError}
              className="h-full w-full object-cover rounded-2xl"
            />

            {/* Subtle Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/35 pointer-events-none rounded-2xl" />

            {/* Top Bar inside Video: Live Status Badge (Left) & Briefing Indicator (Right) */}
            <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
              {/* Top-Left Live Status Badge */}
              <div className="pointer-events-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-[11px] font-mono font-bold">
                <span className={`h-2 w-2 rounded-full ${isVideoEnded ? 'bg-emerald-400' : 'bg-cyan-400 animate-ping'}`} />
                <span className={isVideoEnded ? 'text-emerald-300' : 'text-cyan-200'}>
                  {isVideoEnded ? 'Verified ✓' : `Briefing: ${remainingSeconds}s`}
                </span>
              </div>

              {/* Top-Right Pulsing Neon Badge: ✨ Creator Briefing */}
              <div className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/85 backdrop-blur-md border border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.5)] text-cyan-300 text-xs font-black tracking-wide animate-pulse">
                <Sparkles size={13} className="text-cyan-300" />
                <span>✨ Briefing</span>
              </div>
            </div>

            {/* Sleek Floating Glassmorphism Language Selector Pill: [ 🌐 English | 🇮🇳 Hindi ] */}
            <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20">
              <div className="flex items-center p-1 rounded-full bg-black/85 backdrop-blur-xl border border-white/25 shadow-[0_4px_25px_rgba(0,0,0,0.8),0_0_18px_rgba(6,182,212,0.35)]">
                {/* Left option: 🌐 English (Default Active) */}
                <button
                  type="button"
                  onClick={() => handleLanguageChange('en')}
                  className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs transition-all duration-200 select-none ${
                    selectedLanguage === 'en'
                      ? 'bg-gradient-to-r from-cyan-500 via-cyan-400 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.8)] font-black scale-[1.03]'
                      : 'text-white/70 hover:text-white hover:bg-white/10 font-medium'
                  }`}
                  aria-label="Switch to English briefing"
                >
                  <Globe size={13} className={selectedLanguage === 'en' ? 'text-white' : 'text-cyan-300'} />
                  <span>English</span>
                </button>

                <div className="h-3 w-[1px] bg-white/20 mx-0.5" />

                {/* Right option: 🇮🇳 Hindi */}
                <button
                  type="button"
                  onClick={() => handleLanguageChange('hi')}
                  className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs transition-all duration-200 select-none ${
                    selectedLanguage === 'hi'
                      ? 'bg-gradient-to-r from-cyan-500 via-cyan-400 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.8)] font-black scale-[1.03]'
                      : 'text-white/70 hover:text-white hover:bg-white/10 font-medium'
                  }`}
                  aria-label="Switch to Hindi briefing"
                >
                  <span className="text-sm">🇮🇳</span>
                  <span>Hindi</span>
                </button>
              </div>
            </div>

            {/* Floating Audio & Playback Controls (With Unmute & Play/Pause) */}
            <div className="absolute bottom-16 right-3 flex items-center gap-2 z-10">
              <button
                type="button"
                onClick={toggleMute}
                className={`p-2.5 rounded-full backdrop-blur-md border active:scale-95 transition-all shadow-lg flex items-center gap-1.5 ${
                  isMuted
                    ? 'bg-rose-950/80 border-rose-400/60 text-rose-300 hover:bg-rose-900/80'
                    : 'bg-black/75 border-white/20 text-cyan-300 hover:bg-black/90'
                }`}
                aria-label={isMuted ? 'Unmute briefing' : 'Mute briefing'}
              >
                {isMuted ? (
                  <>
                    <VolumeX size={15} className="text-rose-400 shrink-0" />
                    <span className="text-[10px] font-bold pr-1">Unmute</span>
                  </>
                ) : (
                  <Volume2 size={15} className="text-cyan-300" />
                )}
              </button>
              <button
                type="button"
                onClick={togglePlay}
                className="p-2.5 rounded-full bg-black/75 hover:bg-black/90 text-white border border-white/20 active:scale-95 transition-all shadow-lg backdrop-blur-md"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={15} /> : <Play size={15} className="text-cyan-300" />}
              </button>
            </div>

            {/* Bottom Hero Overlay Pill */}
            <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-black/75 backdrop-blur-xl border border-white/15">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-cyan-400 to-purple-500 p-[1px] shrink-0">
                  <div className="h-full w-full rounded-[11px] bg-black/80 flex items-center justify-center">
                    <ShieldCheck size={16} className="text-cyan-300" />
                  </div>
                </div>
                <div className="truncate">
                  <p className="text-xs font-extrabold text-white truncate">GediOn Creator Badge</p>
                  <p className="text-[10px] text-cyan-300/90 font-medium">Automatic monetization unlocked</p>
                </div>
              </div>
              <span className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 text-[10px] font-bold">
                Level 1
              </span>
            </div>

            {/* Completion Overlay */}
            <AnimatePresence>
              {isVideoEnded && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 bg-black/65 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 rounded-2xl"
                >
                  <div className="h-14 w-14 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.6)] mb-2.5">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="text-base font-black text-white">Monetization Briefing Complete!</h3>
                  <p className="text-xs text-white/70 max-w-xs mt-1">
                    Your creator wallet is verified. Tap below to start creating & earning on GediOn!
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Real-time Non-scrubbable Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono px-1">
              <span className="text-white/60">
                {selectedLanguage === 'en' ? 'Briefing: English' : 'Briefing: Hindi'}
              </span>
              <span className={isVideoEnded ? 'text-emerald-400 font-bold' : 'text-cyan-300 font-bold'}>
                {isVideoEnded ? '100% • Briefing Completed' : `${progressPercent}% • Complete video required`}
              </span>
            </div>
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden p-[1px]">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isVideoEnded
                    ? 'bg-gradient-to-r from-cyan-400 via-emerald-400 to-green-400 shadow-[0_0_15px_#10b981]'
                    : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 shadow-[0_0_12px_#06b6d4]'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Key Highlights / Earnings Badges */}
          <div className="space-y-2">
            {/* Highlight 1: 🎥 Create Reels & Stories */}
            <div className="p-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 flex items-center gap-3 transition-colors">
              <div className="h-9 w-9 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
                <Video size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-white">🎥 Create Reels & Stories</h4>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold">
                    4K Ultra
                  </span>
                </div>
                <p className="text-[10px] text-white/60 leading-tight mt-0.5">
                  Universal camera, viral Punjabi sounds, custom live neon filters, and photo reels.
                </p>
              </div>
            </div>

            {/* Highlight 2: 💰 Earn via Creator Fund & Fan Gifts */}
            <div className="p-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 flex items-center gap-3 transition-colors">
              <div className="h-9 w-9 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center shrink-0 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
                <DollarSign size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-white">💰 Earn via Creator Fund & Fan Gifts</h4>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                    ₹4.50/1K Views
                  </span>
                </div>
                <p className="text-[10px] text-white/60 leading-tight mt-0.5">
                  Receive verified views royalties plus 100% direct fan diamond tips with zero cut.
                </p>
              </div>
            </div>

            {/* Highlight 3: ⚡ Instant 1-Tap UPI Withdrawal */}
            <div className="p-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 flex items-center gap-3 transition-colors">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                <Zap size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-white">⚡ Instant 1-Tap UPI Withdrawal</h4>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                    Zero Fee
                  </span>
                </div>
                <p className="text-[10px] text-white/60 leading-tight mt-0.5">
                  Transfer earnings daily into Google Pay, PhonePe, or Paytm with instant bank settlement.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Floating Action Bar & Dynamic Lock/Unlock Action Button */}
        <div className="p-4 bg-gradient-to-t from-black via-black/95 to-transparent shrink-0 border-t border-white/5">
          <button
            type="button"
            disabled={!isVideoEnded}
            onClick={handleGetStarted}
            style={{
              boxShadow: isVideoEnded
                ? '0 0 25px rgba(6, 182, 212, 0.7), 0 0 45px rgba(168, 85, 247, 0.45)'
                : undefined,
            }}
            className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 select-none active:scale-[0.98] ${
              isVideoEnded
                ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 text-white shadow-lg cursor-pointer hover:brightness-110 animate-pulse'
                : 'bg-white/10 border border-white/10 text-white/40 cursor-not-allowed'
            }`}
          >
            {isVideoEnded ? (
              <>
                <Unlock size={17} className="text-cyan-200" />
                <span className="font-extrabold tracking-wide">🎉 Start Creating on GediOn →</span>
              </>
            ) : (
              <>
                <Lock size={16} className="text-white/40" />
                <span>Watch full briefing to unlock ({remainingSeconds}s)</span>
              </>
            )}
          </button>

          <p className="text-[10px] text-center text-white/35 mt-2">
            🔒 By continuing, you agree to the GediOn Creator Monetization & Safety Guidelines
          </p>
        </div>

      </div>
    </div>
  );
};

// Export alias for seamless compatibility
export { OnboardingVideoModal as CreatorOnboardingModal };
