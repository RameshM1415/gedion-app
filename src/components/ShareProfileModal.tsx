import React from 'react';
import { motion } from 'framer-motion';
import { X, MessageCircle, Share2, Copy, Check } from 'lucide-react';
import { ProfileQRCode } from './ProfileQRCode';

interface ShareProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  avatarUrl: string;
  onShowToast: (msg: string) => void;
}

export const ShareProfileModal: React.FC<ShareProfileModalProps> = ({
  isOpen,
  onClose,
  username,
  avatarUrl,
  onShowToast,
}) => {
  if (!isOpen) return null;

  const profileUrl = `https://gedion.app/@${username}`;

  const handleShareToWhatsApp = () => {
    const text = encodeURIComponent(`Check out my profile on GediOn: ${profileUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `GediOn Profile - @${username}`,
          text: `Check out my profile on GediOn!`,
          url: profileUrl,
        });
        onShowToast('Shared successfully!');
      } catch (err) {
        // User cancelled or not supported
        if ((err as Error).name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(profileUrl);
      onShowToast('Link copied!');
    } else {
      onShowToast('Link copied!');
    }
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-sm rounded-3xl bg-[#0c0d14] border border-white/15 p-6 text-white shadow-2xl flex flex-col items-center overflow-hidden"
      >
        {/* Close Button top-right */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        {/* Ambient neon backdrop glow */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-pink-500/20 blur-3xl" />

        {/* Modal Header */}
        <div className="flex flex-col items-center text-center mt-1 mb-5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-cyan-400">
            NAMETAG & QR CODE
          </span>
          <h3 className="text-lg font-extrabold text-white mt-0.5">Share Profile</h3>
        </div>

        {/* Dark Glassmorphic Card containing the QR Code */}
        <div className="relative flex flex-col items-center p-6 rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/15 shadow-2xl backdrop-blur-xl">
          {/* QR Code Canvas/SVG */}
          <ProfileQRCode value={profileUrl} size={190} logoSrc={avatarUrl} />

          {/* Username tag under QR code with neon glow */}
          <div className="mt-4 px-4 py-1.5 rounded-full bg-black/60 border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.35)] flex items-center gap-1.5">
            <span className="text-cyan-400 font-bold text-xs">@</span>
            <span className="text-white font-bold text-xs tracking-wide">{username}</span>
          </div>

          <p className="text-[10px] text-white/50 text-center mt-2 max-w-[200px]">
            Scan to view reels, stories & follow on GediOn
          </p>
        </div>

        {/* Action Buttons Bottom Bar */}
        <div className="w-full space-y-2.5 mt-6">
          {/* Share to WhatsApp */}
          <button
            type="button"
            onClick={handleShareToWhatsApp}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] font-bold text-xs text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all"
          >
            <MessageCircle size={16} />
            <span>Share to WhatsApp</span>
          </button>

          {/* Dual Buttons: Share Profile & Copy Link */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleNativeShare}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-500 hover:opacity-95 active:scale-[0.98] font-bold text-xs text-white shadow-lg shadow-purple-600/30 flex items-center justify-center gap-1.5 transition-all"
            >
              <Share2 size={15} />
              <span>Share Profile</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 active:scale-[0.98] font-bold text-xs text-white border border-white/15 flex items-center justify-center gap-1.5 transition-all"
            >
              <Copy size={15} />
              <span>Copy Link</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
