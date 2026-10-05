import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Sparkles,
  CheckCircle2,
  Loader2,
  Mail,
  MessageSquare,
} from 'lucide-react';
import { AuthUser } from '../utils/authStorage';
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
  const [problemText, setProblemText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = problemText.trim();
    if (!trimmed) {
      onShowToast('Please type your problem or feedback first.');
      return;
    }

    setIsSubmitting(true);

    // 1. Persist to Supabase support_tickets / feedback table (non-blocking)
    try {
      await supabase.from('support_tickets').insert([
        {
          user_id: currentUser?.id || 'guest',
          username: currentUser?.username || 'guest_user',
          user_email: currentUser?.email || 'unspecified@gedion.app',
          message: trimmed,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.warn('Supabase support ticket notice:', err);
    }

    // 2. Guaranteed local storage backup
    try {
      const stored = localStorage.getItem('gedion_support_tickets_v1');
      const tickets = stored ? JSON.parse(stored) : [];
      tickets.push({
        id: `ticket_${Date.now()}`,
        message: trimmed,
        username: currentUser?.username || 'guest',
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem('gedion_support_tickets_v1', JSON.stringify(tickets));
    } catch {
      // ignore
    }

    setIsSubmitting(false);
    setShowSuccessBanner(true);
    setProblemText('');
    onShowToast('Thank you! Your issue has been submitted. Our team is on it.');

    // Auto-dismiss after brief confirmation
    setTimeout(() => {
      setShowSuccessBanner(false);
      onClose();
    }, 1800);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center select-none">
        {/* Dark Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Slide-Up Bottom Sheet (Dark Theme) */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative z-[95] w-full max-w-[440px] max-h-[90vh] flex flex-col rounded-t-[28px] sm:rounded-[28px] overflow-hidden shadow-2xl bg-[#0f0f10] border border-[#27272a] text-[#f4f4f5]"
        >
          {/* Top Subtle Drag Handle */}
          <div className="flex justify-center pt-2.5 pb-1 shrink-0">
            <div className="h-1.5 w-11 rounded-full bg-[#27272a]" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#27272a] shrink-0 bg-[#0f0f10]">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold tracking-tight text-[#f4f4f5]">
                Help & 24/7 Support
              </h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-full text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#27272a]/60 active:scale-95 transition-all"
            >
              <X size={19} />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 no-scrollbar">
            {/* 1. About GediOn Commitment & Static Official Contact Details */}
            <div className="rounded-2xl p-4 bg-[#18181b] border border-[#27272a] space-y-3.5 shadow-sm">
              {/* Creator Note */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Sparkles size={15} />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                    Always Here For You
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-[#d4d4d8] font-normal">
                  GediOn is built to empower creators with seamless entertainment, crystal-clear streaming,
                  and an authentic community. Your happiness and privacy are our top priority. We are always
                  here for you 24/7.
                </p>
              </div>

              {/* Static Contact Details (Clean text info, non-clickable) */}
              <div className="pt-3 border-t border-[#27272a]/90 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#a1a1aa]">
                  Official Contact Channels
                </p>

                <div className="flex flex-col gap-1.5 text-xs text-[#a1a1aa]">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#25D366]/15 text-[#25D366]">
                      <MessageSquare size={12} />
                    </span>
                    <span className="text-[#a1a1aa]">WhatsApp:</span>
                    <span className="font-semibold text-[#f4f4f5] select-all">+91 9922931273</span>
                    <span className="text-[10px] text-[#71717a] font-medium">(24/7 Support)</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#38bdf8]/15 text-[#38bdf8]">
                      <Mail size={12} />
                    </span>
                    <span className="text-[#a1a1aa]">Email:</span>
                    <span className="font-semibold text-[#f4f4f5] select-all">gedion123@gmail.com</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Direct In-App Problem Box (Main Highlight) */}
            <form onSubmit={handleSubmit} className="space-y-3 pt-1">
              <div className="flex items-center justify-between px-1">
                <label
                  htmlFor="support-problem-input"
                  className="text-[11px] font-bold uppercase tracking-wider text-[#a1a1aa]"
                >
                  Direct In-App Problem & Feedback
                </label>
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active 24/7
                </span>
              </div>

              {/* Dark Textarea Input */}
              <div className="relative">
                <textarea
                  id="support-problem-input"
                  rows={4}
                  value={problemText}
                  onChange={(e) => setProblemText(e.target.value)}
                  placeholder="Explain your problem, query, or feedback here... We'll resolve it right away."
                  disabled={isSubmitting}
                  className="w-full rounded-2xl p-3.5 text-xs font-normal leading-relaxed resize-none focus:outline-none transition-all bg-[#18181b] border border-[#27272a] text-[#f4f4f5] placeholder-[#71717a] focus:border-[#0095f6] focus:bg-[#1a1a20]"
                />
              </div>

              {/* Stylish Prominent Action Button */}
              <button
                type="submit"
                disabled={isSubmitting || !problemText.trim()}
                className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg cursor-pointer ${
                  showSuccessBanner
                    ? 'bg-emerald-600 text-white'
                    : problemText.trim()
                    ? 'bg-gradient-to-r from-[#0095f6] via-[#1d4ed8] to-[#7c3aed] hover:brightness-110 text-white'
                    : 'bg-[#1e1e24] text-[#71717a] border border-[#27272a] cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white" />
                    <span>Submitting to Support...</span>
                  </>
                ) : showSuccessBanner ? (
                  <>
                    <CheckCircle2 size={16} className="text-white" />
                    <span>Submitted Successfully!</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Send Problem / Submit Feedback</span>
                  </>
                )}
              </button>
            </form>

            {/* In-Modal Confirmation Toast Notification */}
            <AnimatePresence>
              {showSuccessBanner && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-xl p-3 bg-[#18181b] border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow-xl"
                >
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>Thank you! Your issue has been submitted. Our team is on it.</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="text-center pt-1 pb-2">
              <p className="text-[10px] text-[#71717a] leading-normal font-mono">
                GediOn Support Network • Secure & Confidential
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
