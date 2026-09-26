import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share2, PlusSquare, Sparkles, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface PwaInstallBannerProps {
  deferredPrompt: BeforeInstallPromptEvent | null;
  onInstalled?: () => void;
  /** Whether any full-screen sheet or modal is currently covering the screen */
  isModalOpen?: boolean;
}

export const PwaInstallBanner: React.FC<PwaInstallBannerProps> = ({
  deferredPrompt,
  onInstalled,
  isModalOpen = false,
}) => {
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('gedion_pwa_installed');
    if (stored === 'true') return true;
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    return Boolean(isStandalone);
  });

  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('gedion_pwa_dismissed') === 'true';
  });

  const [showIosGuide, setShowIosGuide] = useState<boolean>(false);
  const [showInstalledToast, setShowInstalledToast] = useState<boolean>(false);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);

  // Detect iOS browser
  const isIos =
    typeof window !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream;

  // Listen to the system appinstalled event
  useEffect(() => {
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsDismissed(true);
      localStorage.setItem('gedion_pwa_installed', 'true');
      setShowInstalledToast(true);
      if (onInstalled) onInstalled();
      setTimeout(() => setShowInstalledToast(false), 4000);
    };

    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [onInstalled]);

  // Handle Install Now button click
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      setIsInstalling(true);
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          setIsDismissed(true);
          localStorage.setItem('gedion_pwa_installed', 'true');
          setShowInstalledToast(true);
          if (onInstalled) onInstalled();
          setTimeout(() => setShowInstalledToast(false), 4000);
        }
      } catch (err) {
        console.warn('PWA install prompt error:', err);
      } finally {
        setIsInstalling(false);
      }
    } else if (isIos) {
      // If on iOS or browser without prompt, show native guide
      setShowIosGuide(true);
    } else {
      // In browsers where beforeinstallprompt isn't fired yet or testing in dev preview
      // Provide a helpful guide
      setShowIosGuide(true);
    }
  };

  // Handle Maybe Later dismiss
  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('gedion_pwa_dismissed', 'true');
  };

  // Do not show banner if already installed, dismissed, or full screen modal is open
  const shouldShowBanner = !isInstalled && !isDismissed && !isModalOpen;

  return (
    <>
      {/* Sleek Floating Glass Banner / Bottom Drawer */}
      <AnimatePresence>
        {shouldShowBanner && (
          <motion.aside
            aria-label="Install GediOn App"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            className="fixed bottom-20 left-3 right-3 sm:left-5 sm:right-5 z-40 max-w-[480px] mx-auto select-none"
          >
            {/* Ambient Cyan Outer Glow */}
            <div className="pointer-events-none absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-500/30 via-blue-500/20 to-purple-500/30 blur-lg -z-10" />

            {/* Main Glassmorphism Drawer Card */}
            <div className="relative p-3.5 sm:p-4 rounded-2xl bg-black/80 backdrop-blur-md border border-cyan-500/30 text-white shadow-[0_8px_32px_rgba(0,0,0,0.85),0_0_25px_rgba(6,182,212,0.35)] overflow-hidden">
              
              {/* Subtle top neon highlight bar */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

              <div className="flex items-start gap-3">
                {/* App icon with glowing cyan border */}
                <div className="relative h-12 w-12 rounded-2xl p-[1.5px] bg-gradient-to-tr from-cyan-400 via-sky-300 to-purple-500 shadow-[0_0_18px_rgba(6,182,212,0.6)] shrink-0 group">
                  <div className="h-full w-full rounded-[14px] overflow-hidden bg-black flex items-center justify-center">
                    <img
                      src="/gedion-icon-192.png"
                      alt="GediOn App Icon"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/gedion-icon.jpg';
                      }}
                    />
                  </div>
                  {/* Mini pulsing indicator badge */}
                  <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-500 border border-black" />
                  </span>
                </div>

                {/* Text Content */}
                <div className="min-w-0 flex-1 pr-6">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <h3 className="text-sm font-extrabold text-white tracking-wide">
                      Install GediOn App
                    </h3>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                      PWA
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-white/70 leading-snug">
                    Add to Home Screen for fullscreen reels experience &amp; zero lag.
                  </p>
                </div>

                {/* Close X Button */}
                <button
                  type="button"
                  onClick={handleDismiss}
                  aria-label="Dismiss banner"
                  className="absolute top-3 right-3 p-1 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Action Buttons Row */}
              <div className="mt-3.5 pt-2.5 border-t border-white/10 flex items-center justify-end gap-2.5">
                {/* Subtle [Maybe Later] button */}
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
                >
                  Maybe Later
                </button>

                {/* [Install Now 🚀] primary glowing button */}
                <button
                  type="button"
                  disabled={isInstalling}
                  onClick={handleInstallClick}
                  style={{
                    boxShadow: '0 0 20px rgba(6, 182, 212, 0.6), 0 0 35px rgba(59, 130, 246, 0.35)',
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-cyan-400 to-blue-600 text-white font-extrabold text-xs active:scale-95 transition-all duration-200 hover:brightness-110 flex items-center gap-1.5 shadow-lg select-none"
                >
                  <Download size={14} className="animate-bounce" />
                  <span>{isInstalling ? 'Installing...' : 'Install Now 🚀'}</span>
                </button>
              </div>

            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Manual Install Instruction Popover for iOS or browsers without deferred prompt */}
      <AnimatePresence>
        {showIosGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              className="relative w-full max-w-sm rounded-3xl bg-[#0b0914] border border-cyan-500/40 p-5 text-white shadow-[0_0_40px_rgba(6,182,212,0.3)]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-xl p-[1px] bg-gradient-to-tr from-cyan-400 to-blue-500">
                    <img
                      src="/gedion-icon-192.png"
                      alt="GediOn"
                      className="h-full w-full rounded-[11px] object-cover bg-black"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/gedion-icon.jpg';
                      }}
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Install GediOn App</h4>
                    <p className="text-[11px] text-cyan-300">Fast 1-Tap Home Screen Setup</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIosGuide(false)}
                  className="p-1 text-white/50 hover:text-white rounded-full"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="py-4 space-y-3 text-xs text-white/80">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-xs">
                    1
                  </span>
                  <p className="leading-snug">
                    {isIos ? (
                      <>
                        Tap the <span className="font-bold text-white inline-flex items-center gap-1"><Share2 size={13} className="text-cyan-300" /> Share</span> icon in Safari's bottom toolbar.
                      </>
                    ) : (
                      <>
                        Tap the browser menu icon <span className="font-bold text-white">(⋮ or ⋯)</span> in the address bar.
                      </>
                    )}
                  </p>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-xs">
                    2
                  </span>
                  <p className="leading-snug">
                    Scroll down and select{' '}
                    <span className="font-bold text-cyan-300 inline-flex items-center gap-1">
                      <PlusSquare size={13} /> &quot;Add to Home Screen&quot;
                    </span>
                    .
                  </p>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-xs">
                    3
                  </span>
                  <p className="leading-snug">
                    Launch GediOn directly from your home screen for ultra-smooth fullscreen reels!
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowIosGuide(false);
                  handleDismiss();
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-xs text-white shadow-lg active:scale-95 transition-transform"
              >
                Got It! 🚀
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Celebratory Toast on App Installed */}
      <AnimatePresence>
        {showInstalledToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl bg-emerald-950/90 border border-emerald-400 text-emerald-200 text-xs font-bold shadow-[0_0_30px_rgba(16,185,129,0.5)] backdrop-blur-xl flex items-center gap-2 max-w-[90vw]"
          >
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>🎉 GediOn App installed! Launch from your Home Screen for zero lag.</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
