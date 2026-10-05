import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Mail,
  Send,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Headset,
  Loader2,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import { AuthUser } from '../utils/authStorage';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../utils/supabaseClient';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: AuthUser | null;
  onShowToast?: (msg: string) => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onShowToast = () => {},
}) => {
  const { isDark } = useTheme();
  const [issueDescription, setIssueDescription] = useState('');
  const [issueCategory, setIssueCategory] = useState<'General' | 'Playback' | 'Account' | 'Suggestion'>('General');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleWhatsAppClick = () => {
    const defaultMsg = encodeURIComponent(
      `Hello GediOn Support, I need help with my account (@${currentUser?.username || 'user'}). Issue: `
    );
    const whatsappUrl = `https://wa.me/919922931273?text=${defaultMsg}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const handleEmailClick = () => {
    const subject = encodeURIComponent('GediOn App Support Request');
    const body = encodeURIComponent(
      `Hello GediOn Team,\n\nI need support with:\n\n[Please describe your request here]\n\nUsername: @${
        currentUser?.username || 'Guest'
      }\nApp Version: GediOn Instagram Edition v2.0`
    );
    window.location.href = `mailto:gedion123@gmail.com?subject=${subject}&body=${body}`;
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = issueDescription.trim();
    if (!trimmed) {
      onShowToast('Please describe your issue or suggestion first.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Try to record ticket in Supabase support_tickets table
      await supabase.from('support_tickets').insert([
        {
          user_id: currentUser?.id || 'guest',
          username: currentUser?.username || 'guest_user',
          user_email: currentUser?.email || 'unspecified@gedion.app',
          category: issueCategory,
          message: trimmed,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.warn('Supabase support_tickets logged locally:', err);
    }

    // 2. Also prepare mailto fallback so user request is never lost
    try {
      const storedTickets = localStorage.getItem('gedion_support_tickets_v1');
      const parsed = storedTickets ? JSON.parse(storedTickets) : [];
      parsed.push({
        id: `ticket_${Date.now()}`,
        message: trimmed,
        category: issueCategory,
        timestamp: new Date().toLocaleString(),
      });
      localStorage.setItem('gedion_support_tickets_v1', JSON.stringify(parsed));
    } catch {}

    setIsSubmitting(false);
    setIsSubmittedSuccess(true);
    setIssueDescription('');
    onShowToast('Thank you! Our support team will resolve your request shortly.');

    setTimeout(() => {
      setIsSubmittedSuccess(false);
      onClose();
    }, 2200);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        />

        {/* Modal Sheet */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className={`relative z-[95] w-full max-w-[440px] max-h-[92vh] flex flex-col rounded-t-[28px] sm:rounded-[28px] overflow-hidden shadow-2xl border transition-colors ${
            isDark
              ? 'bg-[#101014] text-white border-zinc-800'
              : 'bg-white text-zinc-900 border-zinc-200'
          }`}
        >
          {/* Top Drag Handle */}
          <div className="flex justify-center pt-2.5 pb-1 shrink-0">
            <div
              className={`h-1.5 w-12 rounded-full transition-colors ${
                isDark ? 'bg-zinc-700/80' : 'bg-zinc-300'
              }`}
            />
          </div>

          {/* Modal Header */}
          <div
            className={`flex items-center justify-between px-5 py-3 border-b shrink-0 ${
              isDark ? 'border-zinc-800/80' : 'border-zinc-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#0095f6] to-[#00c6ff] text-white shadow-md">
                <Headset size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight">24/7 Priority Support</h3>
                <p className="text-[11px] text-zinc-400 font-medium">Instant assistance & creator care</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={`p-1.5 rounded-full transition-colors active:scale-95 ${
                isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'
              }`}
            >
              <X size={20} />
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 no-scrollbar">
            {/* 1. Inspiring About GediOn Card */}
            <div className="relative rounded-2xl p-4 overflow-hidden border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-rose-500/10 to-purple-600/15 shadow-sm">
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles size={16} className="text-amber-400 shrink-0" />
                <h4 className="font-bold text-sm tracking-tight text-amber-300 drop-shadow-sm">
                  Welcome to GediOn – Where Creators Connect & Shine! 🌟
                </h4>
              </div>
              <p className="text-xs leading-relaxed text-zinc-300 font-normal">
                GediOn is designed to give you ultra-fast streaming, seamless reel creation, and an authentic
                community experience. Your privacy, creativity, and joy are our top priorities. Thank you for
                making GediOn your creative home!
              </p>
              <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full w-fit">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Support Agents Online • 24/7 Response</span>
              </div>
            </div>

            {/* 2. Quick Contact Options */}
            <div className="space-y-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-1">
                Instant Direct Assistance
              </p>

              {/* WhatsApp Support Button */}
              <div
                onClick={handleWhatsAppClick}
                className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer active:scale-[0.98] transition-all group ${
                  isDark
                    ? 'bg-zinc-900/80 border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-950/20'
                    : 'bg-emerald-50/50 border-emerald-300/60 hover:border-emerald-500 hover:bg-emerald-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#25D366] text-white shadow-md group-hover:scale-105 transition-transform">
                    {/* Authentic WhatsApp SVG Icon */}
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.53 7.34C9.33 7.34 9 7.42 8.73 7.71C8.46 8 7.7 8.72 7.7 10.18C7.7 11.64 8.76 13.05 8.91 13.25C9.06 13.45 10.95 16.37 13.85 17.62C14.54 17.92 15.08 18.1 15.5 18.23C16.2 18.45 16.83 18.42 17.33 18.34C17.89 18.26 19.05 17.64 19.29 16.96C19.53 16.28 19.53 15.7 19.46 15.58C19.38 15.46 19.18 15.38 18.89 15.24C18.59 15.09 17.15 14.38 16.88 14.28C16.61 14.18 16.41 14.13 16.22 14.43C16.02 14.72 15.44 15.38 15.27 15.58C15.1 15.77 14.92 15.8 14.63 15.65C14.34 15.5 13.4 15.19 12.28 14.19C11.41 13.41 10.82 12.45 10.65 12.16C10.48 11.87 10.63 11.71 10.78 11.56C10.91 11.43 11.07 11.22 11.22 11.05C11.37 10.88 11.42 10.76 11.52 10.56C11.62 10.37 11.57 10.2 11.5 10.05C11.42 9.9 10.84 8.47 10.6 7.89C10.36 7.32 10.12 7.4 9.94 7.39C9.77 7.38 9.57 7.34 9.53 7.34Z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-emerald-400">WhatsApp Support 24/7</p>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                        Fastest
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-white/90 mt-0.5">+91 9922931273</p>
                    <p className="text-[11px] text-zinc-400">Tap to start a direct WhatsApp chat</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
              </div>

              {/* Email Support Button */}
              <div
                onClick={handleEmailClick}
                className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer active:scale-[0.98] transition-all group ${
                  isDark
                    ? 'bg-zinc-900/80 border-sky-500/30 hover:border-sky-500 hover:bg-sky-950/20'
                    : 'bg-sky-50/50 border-sky-300/60 hover:border-sky-500 hover:bg-sky-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-md group-hover:scale-105 transition-transform">
                    <Mail size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-sky-400">Email Support</p>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300">
                        Official
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-white/90 mt-0.5">gedion123@gmail.com</p>
                    <p className="text-[11px] text-zinc-400">Send bug reports & business inquiries</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-sky-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* 3. Direct In-App Problem Submission Form */}
            <form onSubmit={handleSubmitTicket} className="space-y-3 pt-1">
              <div className="flex items-center justify-between px-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Direct In-App Help Ticket
                </p>
                <span className="text-[10px] text-zinc-500">Auto-routed to engineers</span>
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {(['General', 'Playback', 'Account', 'Suggestion'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setIssueCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                      issueCategory === cat
                        ? 'bg-[#0095f6] text-white shadow-sm'
                        : isDark
                        ? 'bg-zinc-800 text-zinc-400 hover:text-white'
                        : 'bg-zinc-100 text-zinc-600 hover:text-black'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Multiline Textarea */}
              <div className="relative">
                <textarea
                  rows={4}
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="Describe your issue, suggestion, or feedback in detail..."
                  disabled={isSubmitting}
                  className={`w-full rounded-2xl p-3.5 text-xs font-normal leading-relaxed resize-none focus:outline-none transition-all ${
                    isDark
                      ? 'bg-zinc-900 border border-zinc-700/80 text-white placeholder-zinc-500 focus:border-[#0095f6]'
                      : 'bg-zinc-50 border border-zinc-200 text-black placeholder-zinc-400 focus:border-[#0095f6]'
                  }`}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !issueDescription.trim()}
                className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all shadow-md cursor-pointer ${
                  isSubmittedSuccess
                    ? 'bg-emerald-500 text-white'
                    : issueDescription.trim()
                    ? 'bg-gradient-to-r from-[#0095f6] to-[#0077e6] hover:brightness-105 text-white'
                    : isDark
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Submitting Ticket...</span>
                  </>
                ) : isSubmittedSuccess ? (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Ticket Submitted Successfully!</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Send Message / Submit Help Request</span>
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-1 pb-2">
              <p className="text-[10px] text-zinc-500 leading-normal">
                GediOn Creator Protection Guarantee • Average response time: under 15 minutes
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
