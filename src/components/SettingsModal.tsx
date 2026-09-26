import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Lock,
  Bell,
  Volume2,
  Database,
  Trash2,
  HelpCircle,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Check,
  Mail,
  User,
  ExternalLink,
  Sparkles,
  PlayCircle,
} from 'lucide-react';
import { AuthUser, clearStoredAuth, DEFAULT_AUTH_USER } from '../utils/authStorage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
  onOpenAuthModal?: () => void;
  onOpenOnboardingVideo?: () => void;
  currentUser?: AuthUser;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
  onOpenAuthModal,
  onOpenOnboardingVideo,
  currentUser,
}) => {
  // Settings toggle states
  const [isPrivateAccount, setIsPrivateAccount] = useState(false);
  const [isPauseNotifications, setIsPauseNotifications] = useState(false);
  const [isSoundAlerts, setIsSoundAlerts] = useState(true);
  const [isDataSaver, setIsDataSaver] = useState(false);

  if (!isOpen) return null;

  const user = currentUser || DEFAULT_AUTH_USER;

  const handleClearCache = () => {
    onShowToast('Cache cleared (0 MB)');
  };

  const handleLogOut = () => {
    clearStoredAuth();
    onShowToast('Logged out of GediOn');
    setTimeout(() => {
      onClose();
      onOpenAuthModal?.();
    }, 350);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      className="fixed inset-0 z-[80] flex flex-col bg-[#07070b] text-white"
    >
      {/* Sticky Top Bar with centered title */}
      <div className="sticky top-0 z-20 shrink-0 flex items-center justify-between px-4 py-3.5 border-b border-white/10 bg-[#07070b]/95 backdrop-blur-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back"
          className="flex items-center gap-1 text-white/80 hover:text-white p-1 rounded-full active:scale-95 transition-all"
        >
          <ArrowLeft size={22} />
        </button>
        <h2 className="text-base font-bold text-white tracking-tight">Settings</h2>
        <div className="w-8" /> {/* Spacer to balance back button */}
      </div>

      {/* Settings list container */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 pb-28 no-scrollbar">
        {/* Section: Account & Authentication */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
              Account & Authentication
            </p>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
              <Check size={11} />
              <span>Active Session</span>
            </span>
          </div>

          <div className="rounded-2xl bg-gradient-to-b from-cyan-950/30 via-white/[0.04] to-purple-950/20 border border-cyan-500/30 p-4 space-y-3 shadow-[0_0_25px_rgba(6,182,212,0.15)]">
            {/* User Profile Card */}
            <div className="flex items-center gap-3">
              <img
                src={user.avatar}
                alt={user.displayName}
                className="h-12 w-12 rounded-full object-cover border-2 border-cyan-400/60 shadow-[0_0_12px_rgba(6,182,212,0.4)] shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-bold text-white truncate">{user.displayName}</p>
                  {user.provider === 'google' ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/40">
                      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.4 7.33 24 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.99 0 12s.45 3.85 1.24 5.42l4.04-3.15z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.6 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                        />
                      </svg>
                      <span>Google Verified</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                      <Mail size={10} />
                      <span>Email OTP Verified</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/60 font-mono truncate">{user.email}</p>
                <p className="text-[10px] text-white/40 font-mono mt-0.5">@{user.username}</p>
              </div>
            </div>

            {/* Quick Switch / Re-login action */}
            <div className="space-y-2 pt-1">
              {onOpenOnboardingVideo && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenOnboardingVideo();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-400/40 text-cyan-200 text-xs font-bold active:scale-98 transition-all flex items-center justify-between gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                >
                  <div className="flex items-center gap-2">
                    <PlayCircle size={15} className="text-cyan-400 animate-pulse" />
                    <span>Creator Welcome & Earnings Guide</span>
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      user.hasCompletedOnboarding || user.hasCompletedDemoVideo
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                    }`}
                  >
                    {user.hasCompletedOnboarding || user.hasCompletedDemoVideo ? 'Completed ✓' : 'Watch Required'}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuthModal?.();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white/80 hover:text-white text-xs font-semibold active:scale-98 transition-all flex items-center justify-center gap-1.5"
              >
                <Sparkles size={14} className="text-cyan-400" />
                <span>Switch Account / Sign In with Another Profile</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section: Account & Privacy */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/40 px-1">
            Account & Privacy
          </p>

          <div className="rounded-2xl bg-white/[0.04] border border-white/10 divide-y divide-white/5 overflow-hidden">
            {/* Account Privacy Toggle */}
            <div className="flex items-center justify-between p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400">
                  <Lock size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Private Account</p>
                  <p className="text-[11px] text-white/50">
                    {isPrivateAccount
                      ? 'Only approved followers can view your reels'
                      : 'Anyone on GediOn can see your reels'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isPrivateAccount}
                onClick={() => {
                  const next = !isPrivateAccount;
                  setIsPrivateAccount(next);
                  onShowToast(next ? 'Account set to Private' : 'Account set to Public');
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isPrivateAccount ? 'bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.6)]' : 'bg-white/20'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isPrivateAccount ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Section: Notifications */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/40 px-1">
            Notifications
          </p>

          <div className="rounded-2xl bg-white/[0.04] border border-white/10 divide-y divide-white/5 overflow-hidden">
            {/* Pause All Toggle */}
            <div className="flex items-center justify-between p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400">
                  <Bell size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Pause All Notifications</p>
                  <p className="text-[11px] text-white/50">Temporarily mute push alerts</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isPauseNotifications}
                onClick={() => {
                  const next = !isPauseNotifications;
                  setIsPauseNotifications(next);
                  onShowToast(next ? 'Notifications paused' : 'Notifications unpaused');
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isPauseNotifications ? 'bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.6)]' : 'bg-white/20'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isPauseNotifications ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Sound Alerts Toggle */}
            <div className="flex items-center justify-between p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-500/15 text-pink-400">
                  <Volume2 size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Sound Alerts</p>
                  <p className="text-[11px] text-white/50">Play chime on likes and replies</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isSoundAlerts}
                onClick={() => {
                  const next = !isSoundAlerts;
                  setIsSoundAlerts(next);
                  onShowToast(next ? 'Sound alerts enabled' : 'Sound alerts muted');
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isSoundAlerts ? 'bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.6)]' : 'bg-white/20'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isSoundAlerts ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Section: Data & Storage */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/40 px-1">
            Data & Cache
          </p>

          <div className="rounded-2xl bg-white/[0.04] border border-white/10 divide-y divide-white/5 overflow-hidden">
            {/* Data Saver Toggle */}
            <div className="flex items-center justify-between p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                  <Database size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Data Saver</p>
                  <p className="text-[11px] text-white/50">Reduce cellular data usage for reels</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isDataSaver}
                onClick={() => {
                  const next = !isDataSaver;
                  setIsDataSaver(next);
                  onShowToast(next ? 'Data saver turned on' : 'Data saver turned off');
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isDataSaver ? 'bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.6)]' : 'bg-white/20'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isDataSaver ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Clear Cache Button */}
            <button
              type="button"
              onClick={handleClearCache}
              className="w-full flex items-center justify-between p-3.5 hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                  <Trash2 size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Clear Cache</p>
                  <p className="text-[11px] text-white/50">Frees up device storage instantly</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-white/40">Free up</span>
            </button>
          </div>
        </div>

        {/* Section: Support & Community */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/40 px-1">
            Community & Legal
          </p>

          <div className="rounded-2xl bg-white/[0.04] border border-white/10 divide-y divide-white/5 overflow-hidden">
            <button
              type="button"
              onClick={() => onShowToast('Community Guidelines & Safety: In Good Standing ✓')}
              className="w-full flex items-center justify-between p-3.5 hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Community Guidelines & Help</p>
                  <p className="text-[11px] text-white/50">Safety guidelines and creator terms</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-white/30" />
            </button>
          </div>
        </div>

        {/* Section: Log Out */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleLogOut}
            className="w-full py-3.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/30 text-rose-400 font-semibold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <LogOut size={16} />
            <span>Log Out</span>
          </button>

          <p className="text-center text-[11px] text-white/30 mt-4">
            GediOn Ultra v1.2.0 • Build Asia-East1
          </p>
        </div>
      </div>
    </motion.div>
  );
};
