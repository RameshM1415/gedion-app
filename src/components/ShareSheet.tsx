import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Download, QrCode, MessageSquare, Share2, Sparkles, ShieldAlert } from 'lucide-react';
import { Reel } from '../types';

interface ShareSheetProps {
  isOpen: boolean;
  onClose: () => void;
  reel: Reel;
  onOpenReport?: (reel: Reel) => void;
}

export const ShareSheet: React.FC<ShareSheetProps> = ({ isOpen, onClose, reel, onOpenReport }) => {
  const [copied, setCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [sentFriendId, setSentFriendId] = useState<string | null>(null);

  const friends = [
    { id: 'f1', name: 'Alex M.', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=80' },
    { id: 'f2', name: 'Elena R.', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80' },
    { id: 'f3', name: 'David K.', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80' },
    { id: 'f4', name: 'Sophia T.', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80' },
  ];

  // 4. Copy Link action & floating neon toast
  const handleCopyLink = async () => {
    const currentUrl = window.location.href;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = currentUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setShowToast(true);
      setTimeout(() => {
        setCopied(false);
        setShowToast(false);
      }, 2600);
    } catch {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2600);
    }
  };

  // 4. Share on WhatsApp in a new window
  const handleShareWhatsApp = () => {
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
      'Watch this reel on GediOn: ' + window.location.href
    )}`;
    window.open(shareUrl, '_blank');
  };

  const handleSendToFriend = (id: string) => {
    setSentFriendId(id);
    setTimeout(() => setSentFriendId(null), 2500);
  };

  return (
    <>
      {/* Clean Floating Neon Toast: "Link copied to clipboard! 🚀" */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -25, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="fixed top-12 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-cyan-950/95 border border-cyan-400 text-xs font-bold text-white shadow-[0_0_30px_rgba(6,182,212,0.9)] backdrop-blur-2xl pointer-events-none"
          >
            <Sparkles size={16} className="text-cyan-300 animate-spin" />
            <span className="tracking-wide">Link copied to clipboard! 🚀</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Close backdrop to dismiss */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 z-40 bg-black/65 backdrop-blur-sm cursor-pointer"
            />

            {/* Animated Bottom Action Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 80 || info.velocity.y > 350) {
                  onClose();
                }
              }}
              className="absolute bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-3xl bg-[#09090f]/98 backdrop-blur-2xl border-t border-white/15 px-5 pt-3 pb-7 pb-[calc(1.75rem+env(safe-area-inset-bottom,0px))] shadow-[0_-20px_50px_rgba(0,0,0,0.95)] overflow-hidden select-none"
            >
              {/* Grab handle */}
              <div className="flex justify-center -mt-1 pb-3 shrink-0 cursor-grab active:cursor-grabbing">
                <div className="h-1.5 w-11 rounded-full bg-white/25 hover:bg-white/40 transition-colors" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                  <Share2 size={18} className="text-cyan-400" />
                  <span className="font-bold text-base text-white tracking-tight">Share Reel</span>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close share sheet"
                  className="p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Direct Message Friends List */}
              <div className="pt-3.5 pb-3 shrink-0">
                <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
                  Send in Direct Message
                </span>
                <div className="flex items-center gap-4 mt-2.5 overflow-x-auto no-scrollbar pb-1">
                  {friends.map((friend) => {
                    const isSent = sentFriendId === friend.id;
                    return (
                      <div key={friend.id} className="flex flex-col items-center gap-1.5 min-w-[56px]">
                        <div className="relative">
                          <img
                            src={friend.avatar}
                            alt={friend.name}
                            className="h-12 w-12 rounded-full object-cover border-2 border-white/15 shadow-sm"
                          />
                          {isSent && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-emerald-500/90 backdrop-blur-xs">
                              <Check size={20} className="text-white" strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] text-white/80 truncate w-14 text-center">
                          {friend.name}
                        </span>
                        <button
                          onClick={() => handleSendToFriend(friend.id)}
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold transition-all ${
                            isSent
                              ? 'bg-emerald-500/30 text-emerald-400'
                              : 'bg-white/10 text-cyan-300 hover:bg-white/20 active:scale-95'
                          }`}
                        >
                          {isSent ? 'Sent' : 'Send'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Share action buttons grid */}
              <div className="pt-3 border-t border-white/10 shrink-0">
                <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
                  Share via
                </span>
                <div className="grid grid-cols-4 gap-2.5 mt-3">
                  {/* Copy Link */}
                  <button
                    onClick={handleCopyLink}
                    className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all cursor-pointer border border-white/5 group"
                  >
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
                        copied
                          ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.7)]'
                          : 'bg-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                      }`}
                    >
                      {copied ? <Check size={20} strokeWidth={2.5} /> : <Copy size={20} />}
                    </div>
                    <span className="text-[11px] font-semibold text-white/90">
                      {copied ? 'Copied!' : 'Copy Link'}
                    </span>
                  </button>

                  {/* Share on WhatsApp */}
                  <button
                    onClick={handleShareWhatsApp}
                    className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all cursor-pointer border border-white/5 group"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                      <MessageSquare size={20} />
                    </div>
                    <span className="text-[11px] font-semibold text-white/90">WhatsApp</span>
                  </button>

                  {/* Download */}
                  <button
                    onClick={() => alert(`Saving @${reel.username}'s reel to your device...`)}
                    className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all cursor-pointer border border-white/5 group"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/20 text-purple-400 group-hover:bg-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
                      <Download size={20} />
                    </div>
                    <span className="text-[11px] font-semibold text-white/90">Save Video</span>
                  </button>

                  {/* QR Code */}
                  <button
                    onClick={() => alert(`GediOn QR Code ready for @${reel.username}'s reel!`)}
                    className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all cursor-pointer border border-white/5 group"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-500/20 text-pink-400 group-hover:bg-pink-500/30 shadow-[0_0_12px_rgba(236,72,153,0.3)]">
                      <QrCode size={20} />
                    </div>
                    <span className="text-[11px] font-semibold text-white/90">QR Code</span>
                  </button>
                </div>

                {/* 1. Reel Report / Flag Action Button */}
                <div className="pt-3.5 mt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenReport?.(reel);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-rose-950/30 hover:bg-rose-950/50 text-rose-300 hover:text-rose-200 border border-rose-500/30 transition-all active:scale-98 cursor-pointer text-xs font-bold shadow-[0_0_12px_rgba(244,63,94,0.2)]"
                  >
                    <ShieldAlert size={16} className="text-rose-400" />
                    <span>Report / Flag Reel</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
