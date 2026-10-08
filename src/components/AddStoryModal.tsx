import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Sparkles, Image as ImageIcon, Send, Check, Loader2 } from 'lucide-react';
import { AuthUser } from '../utils/authStorage';
import { StoryItem } from '../types';
import { uploadMediaToSupabaseStorage, insertSupabaseStory } from '../utils/supabaseClient';

interface AddStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublishStory: (story: StoryItem) => void;
  currentUser: AuthUser | null;
}

export const AddStoryModal: React.FC<AddStoryModalProps> = ({
  isOpen,
  onClose,
  onPublishStory,
  currentUser,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string>('');
  const [caption, setCaption] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const localUrl = URL.createObjectURL(file);
    setSelectedMediaUrl(localUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMediaUrl) return;

    setIsSubmitting(true);

    let finalMediaUrl = selectedMediaUrl;

    if (selectedFile) {
      try {
        finalMediaUrl = await uploadMediaToSupabaseStorage(selectedFile, 'stories');
      } catch (err) {
        console.warn('Storage upload note:', err);
      }
    }

    const newStory: StoryItem = {
      id: `story_${Date.now()}`,
      username: currentUser?.username || 'you',
      displayName: currentUser?.displayName || currentUser?.username || 'Your story',
      avatar:
        currentUser?.avatar ||
        'https://api.dicebear.com/7.x/bottts/svg?seed=gedion_creator&backgroundColor=06b6d4,a855f7',
      storyMediaUrl: finalMediaUrl,
      caption: caption.trim() || undefined,
      timestamp: 'Just now',
      isVerified: currentUser?.provider === 'google',
      isViewed: false,
    };

    // Insert into Supabase stories table (expires_at = now() + 24 hours)
    insertSupabaseStory({
      userId: currentUser?.id || 'anonymous',
      username: newStory.username,
      displayName: newStory.displayName,
      avatar: newStory.avatar,
      mediaUrl: finalMediaUrl,
      caption: newStory.caption,
    }).catch(() => {});

    onPublishStory(newStory);
    setIsSubmitting(false);
    onClose();
  };

  const isVideo =
    selectedMediaUrl.match(/\.(mp4|webm|mov|ogg)($|\?)/i) ||
    selectedMediaUrl.startsWith('blob:') ||
    selectedMediaUrl.startsWith('data:video');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.94, y: 15 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.94, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-sm rounded-3xl bg-[#09090f] border border-white/15 p-5 shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-cyan-400 to-fuchsia-500 flex items-center justify-center">
                <Sparkles size={14} className="text-black" />
              </div>
              <h3 className="text-sm font-bold text-white tracking-wide">Add to Your Story</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 active:scale-95 transition-all"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Media Preview Box */}
          <div className="relative mt-3.5 aspect-[9/12] w-full rounded-2xl overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center group">
            {isVideo ? (
              <video
                src={selectedMediaUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={selectedMediaUrl}
                alt="Story media preview"
                className="w-full h-full object-cover"
              />
            )}

            {/* Gradient Scrim */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

            {/* Change Media Button Overlay */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-md border border-cyan-400/50 text-xs font-semibold text-cyan-300 flex items-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              <Upload size={13} />
              <span>Choose Photo / Video</span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Caption Input */}
          <form onSubmit={handleSubmit} className="mt-3.5 space-y-3">
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a story caption (optional)..."
              maxLength={120}
              className="w-full h-10 px-3.5 rounded-xl bg-white/5 border border-white/10 focus:border-cyan-400/50 text-white placeholder-white/40 text-xs focus:outline-none transition-colors"
            />

            {/* Share Button */}
            <button
              type="submit"
              disabled={isSubmitting || !selectedMediaUrl}
              className="w-full h-11 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-fuchsia-500 text-black font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.5)] active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send size={14} />
              <span>{isSubmitting ? 'Publishing...' : 'Share to Story'}</span>
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
