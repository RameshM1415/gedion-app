import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ShieldAlert,
  AlertTriangle,
  EyeOff,
  MessageSquareX,
  Copyright,
  CheckCircle2,
  Info,
  ChevronRight,
  ShieldCheck,
  Send,
  Loader2,
  FileText,
} from 'lucide-react';
import { Reel } from '../types';
import { supabase } from '../utils/supabaseClient';

export interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reel: Reel;
  onReportSubmitted: (reelId: string, reason: string, details?: string) => void;
}

export const REPORT_CATEGORIES = [
  {
    id: 'spam',
    title: 'Spam or Misleading',
    description: 'Scams, repetitive posts, fake engagement, or clickbait.',
    icon: AlertTriangle,
  },
  {
    id: 'adult',
    title: 'Inappropriate / Adult Content',
    description: 'Nudity, sexual activity, extreme violence, or graphic imagery.',
    icon: EyeOff,
  },
  {
    id: 'harassment',
    title: 'Harassment or Hate Speech',
    description: 'Bullying, targeted attacks, slurs, or identity-based hate.',
    icon: MessageSquareX,
  },
  {
    id: 'copyright',
    title: 'Copyright Infringement',
    description: 'Unauthorized audio/video re-upload or intellectual property violation.',
    icon: Copyright,
  },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  reel,
  onReportSubmitted,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason || isSubmitting) return;

    setIsSubmitting(true);

    // Silently log to Supabase reports table if available
    try {
      await supabase.from('reports').insert([
        {
          reel_id: reel.id,
          creator_name: reel.displayName,
          creator_username: reel.username,
          category: selectedReason,
          details: details.trim(),
          created_at: new Date().toISOString(),
        },
      ]);
    } catch {
      // ignore
    }

    // Call parent handler
    onReportSubmitted(reel.id, selectedReason, details.trim());
    setIsSubmitting(false);
    onClose();
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-sm"
            />

            {/* Sliding Cyberpunk Bottom Sheet Modal */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="fixed bottom-0 inset-x-0 z-[85] flex flex-col rounded-t-3xl bg-[#090912]/98 backdrop-blur-2xl border-t border-rose-500/30 p-5 pb-8 shadow-[0_-20px_50px_rgba(244,63,94,0.25)] max-h-[88vh] overflow-y-auto no-scrollbar text-white select-none"
            >
              {/* Drag Handle */}
              <div className="flex justify-center -mt-2 pb-3 shrink-0">
                <div className="h-1.5 w-11 rounded-full bg-white/30" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    <ShieldAlert size={18} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">Report Content</h3>
                    <p className="text-[10px] text-white/50">
                      Reel by <span className="text-cyan-300">@{reel.username}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close report dialog"
                  className="p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="mt-3.5 space-y-4">
                <p className="text-xs font-semibold text-white/80">
                  Why are you reporting this reel?
                </p>

                {/* 1. Category Options */}
                <div className="space-y-2">
                  {REPORT_CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = selectedReason === cat.title;
                    return (
                      <div
                        key={cat.id}
                        onClick={() => setSelectedReason(cat.title)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-rose-950/40 border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                            : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.07] hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-xl shrink-0 ${
                              isSelected
                                ? 'bg-rose-500 text-white'
                                : 'bg-white/10 text-white/70'
                            }`}
                          >
                            <Icon size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white tracking-wide">
                              {cat.title}
                            </p>
                            <p className="text-[10px] text-white/50 leading-tight">
                              {cat.description}
                            </p>
                          </div>
                        </div>

                        <div
                          className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'border-rose-400 bg-rose-500 text-white'
                              : 'border-white/30'
                          }`}
                        >
                          {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Optional Comment Box */}
                <div className="space-y-1 pt-1">
                  <label className="text-[11px] font-semibold text-white/60">
                    Provide extra details (optional)
                  </label>
                  <textarea
                    rows={2}
                    maxLength={200}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Provide extra details (optional)..."
                    className="w-full rounded-2xl bg-white/[0.05] border border-white/15 px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-rose-400 transition-colors resize-none"
                  />
                </div>

                {/* 2. Community Safety Guidelines Callout Link */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowGuidelines(true)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-cyan-950/30 hover:bg-cyan-950/50 border border-cyan-400/20 text-xs text-cyan-300 font-semibold transition-all group"
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={15} className="text-cyan-400" />
                      <span>Community Safety Guidelines</span>
                    </div>
                    <ChevronRight
                      size={15}
                      className="text-cyan-400/70 group-hover:translate-x-0.5 transition-transform"
                    />
                  </button>
                </div>

                {/* Action: Submit Report Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={!selectedReason || isSubmitting}
                    className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg ${
                      selectedReason && !isSubmitting
                        ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 text-white shadow-[0_0_25px_rgba(244,63,94,0.7)] hover:shadow-[0_0_35px_rgba(244,63,94,0.9)] active:scale-98 cursor-pointer'
                        : 'bg-white/10 text-white/30 cursor-not-allowed border border-white/5'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin text-white" />
                        <span>Submitting Report...</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert size={16} />
                        <span>Submit Report</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 2. COMMUNITY SAFETY GUIDELINES MODAL OVERLAY                 */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showGuidelines && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGuidelines(false)}
              className="fixed inset-0 z-[90] bg-black/85 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[95] w-[90vw] max-w-md max-h-[82vh] rounded-3xl bg-[#0b0c16] border border-cyan-400/40 p-5 shadow-[0_0_50px_rgba(6,182,212,0.4)] overflow-y-auto no-scrollbar text-white"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={20} className="text-cyan-400" />
                  <h3 className="font-extrabold text-sm text-white">
                    GediOn Community Safety Guidelines
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuidelines(false)}
                  className="p-1 rounded-full text-white/60 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Guidelines Content */}
              <div className="mt-4 space-y-3.5 text-xs text-white/80 leading-relaxed">
                <div className="p-3 rounded-2xl bg-cyan-950/30 border border-cyan-400/20">
                  <h4 className="font-bold text-cyan-300 text-xs mb-1 flex items-center gap-1.5">
                    <span>🛡️</span> Zero Tolerance for Harassment &amp; Hate
                  </h4>
                  <p className="text-[11px] text-white/70">
                    We prohibit hate speech, discrimination, slurs, threats, and bullying targeted at any individual or group. GediOn is a positive home for all creators.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-purple-950/30 border border-purple-400/20">
                  <h4 className="font-bold text-purple-300 text-xs mb-1 flex items-center gap-1.5">
                    <span>🎨</span> Originality &amp; Intellectual Property
                  </h4>
                  <p className="text-[11px] text-white/70">
                    Only upload content, music, and visuals you own or have explicit rights to license. Re-uploading other creators’ videos without attribution will result in content removal.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-pink-950/30 border border-pink-400/20">
                  <h4 className="font-bold text-pink-300 text-xs mb-1 flex items-center gap-1.5">
                    <span>⚡</span> Authentic &amp; Safe Content
                  </h4>
                  <p className="text-[11px] text-white/70">
                    Do not post spam, deceptive schemes, dangerous challenges, or adult graphic content. Protect the safety of minors and vulnerable members at all times.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-400/20">
                  <h4 className="font-bold text-emerald-300 text-xs mb-1 flex items-center gap-1.5">
                    <span>🤝</span> Proactive Creator Moderation
                  </h4>
                  <p className="text-[11px] text-white/70">
                    Our human and algorithmic moderation systems review flagged reels 24x7. Violating accounts face temporary suspension or permanent termination.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowGuidelines(false)}
                className="w-full mt-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-purple-500 text-black font-extrabold text-xs shadow-[0_0_20px_rgba(6,182,212,0.6)] active:scale-95 transition-all"
              >
                I Understand &amp; Agree
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
