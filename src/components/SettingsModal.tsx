import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Lock,
  Bell,
  Volume2,
  Trash2,
  HelpCircle,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Check,
  Mail,
  User,
  ExternalLink,
  PlayCircle,
  Sun,
  Moon,
} from 'lucide-react';
import { AuthUser, clearStoredAuth, DEFAULT_AUTH_USER } from '../utils/authStorage';
import { useTheme } from '../context/ThemeContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
  onOpenAuthModal?: () => void;
  onOpenOnboardingVideo?: () => void;
  currentUser?: AuthUser | null;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onShowToast = () => {},
  onOpenAuthModal,
  onOpenOnboardingVideo,
  currentUser,
}) => {
  const { theme, setTheme, isDark } = useTheme();

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
      className={`fixed inset-0 z-[80] flex flex-col transition-colors select-none ${
        isDark ? 'bg-black text-white' : 'bg-white text-black'
      }`}
    >
      {/* Sticky Top Bar with centered title */}
      <div
        className={`sticky top-0 z-20 shrink-0 flex items-center justify-between px-4 py-3.5 border-b transition-colors ${
          isDark ? 'bg-black/95 border-[#262626]' : 'bg-white/95 border-[#efefef]'
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Back"
          className="flex items-center gap-1 p-1 rounded-full active:scale-95 transition-all opacity-85 hover:opacity-100"
        >
          <ArrowLeft size={22} />
        </button>
        <h2 className="text-base font-bold tracking-tight">Settings</h2>
        <div className="w-8" />
      </div>

      {/* Settings list container */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 pb-28 no-scrollbar">
        {/* Section: Appearance & Theme Engine */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 px-1">
            Appearance & Theme
          </p>

          <div
            className={`rounded-2xl border divide-y overflow-hidden transition-colors ${
              isDark
                ? 'bg-zinc-950 border-[#262626] divide-[#262626]'
                : 'bg-white border-[#efefef] divide-[#efefef]'
            }`}
          >
            {/* Theme Selection */}
            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    isDark ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-900'
                  }`}
                >
                  {isDark ? <Moon size={18} /> : <Sun size={18} />}
                </div>
                <div>
                  <p className="text-sm font-semibold">Theme Mode</p>
                  <p className="text-[11px] text-zinc-500">
                    {isDark ? 'VIP Dark Mode (OLED Pure Black)' : 'Light Mode (Crisp White)'}
                  </p>
                </div>
              </div>

              {/* Segmented Pill Selector for Light / Dark */}
              <div
                className={`flex items-center p-1 rounded-full border ${
                  isDark ? 'bg-zinc-900 border-[#262626]' : 'bg-zinc-100 border-[#efefef]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setTheme('light');
                    onShowToast('Light Mode activated ☀️');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    !isDark
                      ? 'bg-white text-black shadow-xs'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Sun size={13} />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTheme('dark');
                    onShowToast('VIP Dark Mode activated 🌙');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    isDark
                      ? 'bg-black text-white shadow-xs border border-zinc-800'
                      : 'text-zinc-500 hover:text-black'
                  }`}
                >
                  <Moon size={13} />
                  <span>VIP Dark</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Account & Authentication */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              Account & Authentication
            </p>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
              <Check size={11} />
              <span>Active Session</span>
            </span>
          </div>

          <div
            className={`rounded-2xl border p-4 space-y-3 transition-colors ${
              isDark ? 'bg-zinc-950 border-[#262626]' : 'bg-white border-[#efefef]'
            }`}
          >
            {/* User Profile Card */}
            <div className="flex items-center gap-3">
              <img
                src={user.avatar}
                alt={user.displayName}
                className="h-12 w-12 rounded-full object-cover border border-zinc-500/30 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-bold truncate">{user.displayName}</p>
                  {user.provider === 'google' ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
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
                      <span>Google</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                      <Mail size={10} />
                      <span>Email OTP</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">@{user.username}</p>
              </div>
            </div>

            {/* Quick Switch action */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuthModal?.();
                }}
                className={`w-full py-2.5 px-3 rounded-xl border text-xs font-semibold active:scale-98 transition-all flex items-center justify-center gap-1.5 ${
                  isDark
                    ? 'bg-zinc-900 hover:bg-zinc-800 border-[#262626] text-white'
                    : 'bg-zinc-100 hover:bg-zinc-200 border-[#efefef] text-black'
                }`}
              >
                <span>Switch Account / Sign In with Another Profile</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section: Account & Privacy */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 px-1">
            Account & Privacy
          </p>

          <div
            className={`rounded-2xl border divide-y overflow-hidden transition-colors ${
              isDark
                ? 'bg-zinc-950 border-[#262626] divide-[#262626]'
                : 'bg-white border-[#efefef] divide-[#efefef]'
            }`}
          >
            {/* Account Privacy Toggle */}
            <div className="flex items-center justify-between p-3.5">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    isDark ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-900'
                  }`}
                >
                  <Lock size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold">Private Account</p>
                  <p className="text-[11px] text-zinc-500">
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
                  isPrivateAccount ? 'bg-[#0095f6]' : isDark ? 'bg-zinc-800' : 'bg-zinc-300'
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
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 px-1">
            Notifications
          </p>

          <div
            className={`rounded-2xl border divide-y overflow-hidden transition-colors ${
              isDark
                ? 'bg-zinc-950 border-[#262626] divide-[#262626]'
                : 'bg-white border-[#efefef] divide-[#efefef]'
            }`}
          >
            {/* Pause All Toggle */}
            <div className="flex items-center justify-between p-3.5">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    isDark ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-900'
                  }`}
                >
                  <Bell size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold">Pause All Notifications</p>
                  <p className="text-[11px] text-zinc-500">Temporarily mute push alerts</p>
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
                  isPauseNotifications ? 'bg-[#0095f6]' : isDark ? 'bg-zinc-800' : 'bg-zinc-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isPauseNotifications ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Section: Data & Storage */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 px-1">
            Data & Storage
          </p>

          <div
            className={`rounded-2xl border divide-y overflow-hidden transition-colors ${
              isDark
                ? 'bg-zinc-950 border-[#262626] divide-[#262626]'
                : 'bg-white border-[#efefef] divide-[#efefef]'
            }`}
          >
            <div
              onClick={handleClearCache}
              className={`flex items-center justify-between p-3.5 cursor-pointer transition-colors ${
                isDark ? 'hover:bg-zinc-900' : 'hover:bg-zinc-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    isDark ? 'bg-zinc-900 text-zinc-300' : 'bg-zinc-100 text-zinc-700'
                  }`}
                >
                  <Trash2 size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold">Clear Media Cache</p>
                  <p className="text-[11px] text-zinc-500">Free up local browser storage</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-zinc-500" />
            </div>
          </div>
        </div>

        {/* Section: Log Out */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleLogOut}
            className="w-full py-3.5 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/30 text-rose-500 text-sm font-bold flex items-center justify-center gap-2 active:scale-98 transition-all"
          >
            <LogOut size={16} />
            <span>Log Out of GediOn</span>
          </button>
          <p className="text-center text-[10px] text-zinc-500 mt-3 font-mono">
            GediOn Instagram Edition v2.0 • Supabase & Cloudinary Active
          </p>
        </div>
      </div>
    </motion.div>
  );
};
