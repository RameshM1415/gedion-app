import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trash2,
  Share2,
  Copy,
  ShieldAlert,
  X,
  Loader2,
  Check,
} from 'lucide-react';
import { Reel } from '../types';
import { deleteReelFromSupabase, isReelOwnedByUser } from '../utils/supabaseClient';
import { getStoredAuth, DEFAULT_AUTH_USER } from '../utils/authStorage';

export interface ReelOptionsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  reel: Reel | null;
  currentUser: any;
  onDeleteReel?: (reelId: string) => void;
  onOpenReport?: (reel: Reel) => void;
  onOpenShare?: (reel: Reel) => void;
  onShowToast?: (message: string) => void;
}

export const ReelOptionsMenu: React.FC<ReelOptionsMenuProps> = ({
  isOpen,
  onClose,
  reel,
  currentUser,
  onDeleteReel,
  onOpenReport,
  onOpenShare,
  onShowToast,
}) => {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !reel) return null;

  const activeUser = currentUser || getStoredAuth() || DEFAULT_AUTH_USER;
  const isOwn = isReelOwnedByUser(reel, activeUser);

  const handleCopyLink = async () => {
    try {
      const shareUrl = `${window.location.origin}${window.location.pathname}?reel=${reel.id}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      if (onShowToast) {
        onShowToast('Link copied to clipboard! 📋');
      }
      setTimeout(() => {
        setCopied(false);
        onClose();
      }, 1200);
    } catch {
      if (onShowToast) {
        onShowToast('Link copied to clipboard! 📋');
      }
      onClose();
    }
  };

  const handleConfirmDelete = async () => {
    if (!reel || isDeleting) return;
    setIsDeleting(true);

    const reelId = reel.id;

    try {
      // 1. Instantly trigger optimistic removal in parent UI state
      if (onDeleteReel) {
        onDeleteReel(reelId);
      }

      // 2. Broadcast global reel-deleted event
      window.dispatchEvent(
        new CustomEvent('reel-deleted', {
          detail: { reelId },
        })
      );

      // 3. Show instant success toast notification
      if (onShowToast) {
        onShowToast('Reel deleted successfully');
      }

      // 4. Close modal
      onClose();
      setShowConfirmDelete(false);

      // 5. Delete in background from Supabase
      await deleteReelFromSupabase(reelId);
    } catch (err) {
      console.warn('Error during reel deletion:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            if (!isDeleting) {
              setShowConfirmDelete(false);
              onClose();
            }
          }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-pointer"
        />

        {/* Modal Sheet */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative w-full max-w-sm sm:max-w-md mx-auto rounded-t-3xl sm:rounded-3xl border-t sm:border border-neutral-800 bg-[#18181b] text-white p-5 shadow-2xl z-10 overflow-hidden"
        >
          {/* Top handle bar */}
          <div className="flex justify-center -mt-2 pb-2">
            <div className="bg-neutral-600 w-10 h-1 rounded-full my-2 mx-auto" />
          </div>

          {!showConfirmDelete ? (
            /* ================= VIEW 1: REEL ACTION MENU ================= */
            <div className="flex flex-col gap-2">
              {/* Header preview of reel */}
              <div className="flex items-center gap-3 pb-3 mb-1 border-b border-neutral-800">
                <div className="h-12 w-9 rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden shrink-0">
                  {reel.poster ? (
                    <img
                      src={reel.poster}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : reel.videoUrl ? (
                    <video
                      src={`${reel.videoUrl}#t=0.1`}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xs">
                      🎬
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs truncate text-white">
                      @{reel.username}
                    </span>
                    {isOwn && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#0095f6]/15 text-[#0095f6] border border-[#0095f6]/25">
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-xs truncate mt-0.5 text-neutral-400">
                    {reel.caption || 'Untitled reel'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-full transition-colors cursor-pointer hover:bg-neutral-800 text-neutral-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              {/* ACTION ITEMS */}
              <div className="flex flex-col gap-1 py-1">
                {/* 1. OWN REEL: Clean Red Delete Option */}
                {isOwn && (
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(true)}
                    className="flex items-center justify-between w-full p-3.5 rounded-2xl text-red-500 hover:bg-neutral-800/50 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl text-red-500">
                        <Trash2 size={18} />
                      </div>
                      <div className="flex flex-col items-start text-left">
                        <span className="text-sm font-semibold text-red-500">
                          Delete Reel
                        </span>
                        <span className="text-[11px] text-neutral-400">
                          Permanently remove from your profile & feed
                        </span>
                      </div>
                    </div>
                  </button>
                )}

                {/* 2. NOT OWN REEL: Report option */}
                {!isOwn && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenReport?.(reel);
                    }}
                    className="flex items-center justify-between w-full p-3.5 rounded-2xl text-white hover:bg-neutral-800/50 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl text-amber-500">
                        <ShieldAlert size={18} />
                      </div>
                      <div className="flex flex-col items-start text-left">
                        <span className="text-sm font-semibold text-white">
                          Report Reel
                        </span>
                        <span className="text-[11px] text-neutral-400">
                          Report offensive, spam, or copyright violations
                        </span>
                      </div>
                    </div>
                  </button>
                )}

                {/* 3. Share Reel */}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenShare?.(reel);
                  }}
                  className="flex items-center justify-between w-full p-3.5 rounded-2xl text-white hover:bg-neutral-800/50 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl text-neutral-200">
                      <Share2 size={18} />
                    </div>
                    <div className="flex flex-col items-start text-left">
                      <span className="text-sm font-semibold text-white">
                        Share Reel
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        Share to friends or external social apps
                      </span>
                    </div>
                  </div>
                </button>

                {/* 4. Copy Link */}
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center justify-between w-full p-3.5 rounded-2xl text-white hover:bg-neutral-800/50 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl text-neutral-200">
                      {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                    </div>
                    <div className="flex flex-col items-start text-left">
                      <span className="text-sm font-semibold text-white">
                        {copied ? 'Link Copied!' : 'Copy Link'}
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        Copy link to clipboard
                      </span>
                    </div>
                  </div>
                </button>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="w-full mt-2 py-3 rounded-2xl font-semibold text-xs bg-neutral-800 text-neutral-200 active:bg-neutral-700 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            /* ================= VIEW 2: CONFIRMATION MODAL ================= */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center text-center py-2"
            >
              {/* Alert icon */}
              <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-800/80 border border-neutral-700">
                <Trash2 size={28} className="text-red-500" />
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold tracking-tight text-white">
                Delete Reel?
              </h3>

              {/* Description */}
              <p className="text-xs mt-2 max-w-xs leading-relaxed text-neutral-400">
                Are you sure you want to permanently delete this reel? This action cannot be undone.
              </p>

              {/* Actions */}
              <div className="flex items-center gap-3 w-full mt-6">
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-4 rounded-2xl font-semibold text-xs bg-neutral-800 text-neutral-200 hover:bg-neutral-700 active:bg-neutral-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      <span>Delete Reel</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

