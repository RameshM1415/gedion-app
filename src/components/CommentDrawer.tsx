import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Smile, Sparkles, Loader2 } from 'lucide-react';
import { CommentItem, Reel } from '../types';
import { formatCount } from '../utils/formatters';
import { fetchSupabaseComments, insertSupabaseComment } from '../utils/supabaseClient';

interface CommentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  reel?: Reel | null;
  comments?: CommentItem[];
  onAddComment?: (comment: CommentItem) => void;
  currentUser?: { username: string; avatar: string; displayName?: string };
}

export const CommentDrawer: React.FC<CommentDrawerProps> = ({
  isOpen,
  onClose,
  reel,
  comments = [],
  onAddComment,
  currentUser,
}) => {
  const [inputText, setInputText] = useState('');
  const [commentsList, setCommentsList] = useState<CommentItem[]>(comments);
  const [isLoading, setIsLoading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const commentsContainerRef = useRef<HTMLDivElement | null>(null);

  // Quick reaction emojis
  const quickEmojis = ['🔥', '✨', '👏', '❤️', '🙌', '💯', '🚀', '😍'];

  // Fetch comments from Supabase `comments` table whenever drawer opens or reel changes
  useEffect(() => {
    if (!isOpen || !reel) return;

    let isSubscribed = true;
    setIsLoading(true);

    fetchSupabaseComments(reel.id)
      .then((cloudComments) => {
        if (!isSubscribed) return;
        if (cloudComments && cloudComments.length > 0) {
          setCommentsList(cloudComments);
        } else if (reel.comments && reel.comments.length > 0) {
          setCommentsList(reel.comments);
        } else {
          setCommentsList([]);
        }
      })
      .catch((err) => {
        console.warn('Error fetching comments:', err);
        if (isSubscribed) {
          setCommentsList(reel.comments || []);
        }
      })
      .finally(() => {
        if (isSubscribed) setIsLoading(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, reel?.id]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || !reel || isPosting) return;

    setIsPosting(true);
    setInputText('');
    setShowEmojiPicker(false);

    const userName = currentUser?.username || 'you';
    const userAvatar =
      currentUser?.avatar ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';

    // Immediate 0ms local prepend for zero lag
    const tempComment: CommentItem = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      username: userName,
      avatar: userAvatar,
      text: trimmed,
      timestamp: 'Just now',
      likes: 0,
      isLiked: false,
    };

    setCommentsList((prev) => [tempComment, ...prev]);
    onAddComment?.(tempComment);

    // Auto-scroll to top immediately
    setTimeout(() => {
      if (commentsContainerRef.current) {
        commentsContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 40);

    // Insert into Supabase `comments` table in background
    try {
      const savedComment = await insertSupabaseComment(reel.id, trimmed, userName, userAvatar);
      // Replace temp ID with real Supabase ID if returned
      if (savedComment && savedComment.id) {
        setCommentsList((prev) =>
          prev.map((c) => (c.id === tempComment.id ? { ...c, id: savedComment.id } : c))
        );
      }
    } catch (err) {
      console.warn('Supabase comment insert error:', err);
    } finally {
      setIsPosting(false);
    }
  };

  const toggleCommentLike = (id: string) => {
    setCommentsList((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const nextLiked = !c.isLiked;
          return {
            ...c,
            isLiked: nextLiked,
            likes: nextLiked ? c.likes + 1 : Math.max(0, c.likes - 1),
          };
        }
        return c;
      })
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Dismiss */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 z-40 bg-black/65 backdrop-blur-sm"
          />

          {/* 3. Animated Comments Bottom Sheet: 65% screen height with smooth spring transition */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80 || info.velocity.y > 320) {
                onClose();
              }
            }}
            className="absolute bottom-0 left-0 right-0 z-50 flex flex-col h-[65vh] max-h-[65vh] rounded-t-3xl bg-[#09090f]/95 backdrop-blur-2xl border-t border-white/15 shadow-[0_-20px_50px_rgba(0,0,0,0.95)] overflow-hidden"
          >
            {/* Top drag bar */}
            <div className="flex justify-center pt-2.5 pb-1 shrink-0 cursor-grab active:cursor-grabbing">
              <div className="h-1.5 w-11 rounded-full bg-white/30 hover:bg-white/50 transition-colors" />
            </div>

            {/* Top Header: "Comments (<count>)" with close (X) button */}
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-white tracking-tight">Comments</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {formatCount(commentsList.length)}
                </span>
              </div>
              <button
                onClick={onClose}
                aria-label="Close comments"
                className="p-1 rounded-full text-white/60 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Comments List */}
            <div
              ref={commentsContainerRef}
              className="flex-1 overflow-y-auto px-5 py-3 space-y-4 no-scrollbar"
            >
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full py-10 text-white/50 gap-2">
                  <Loader2 size={24} className="animate-spin text-cyan-400" />
                  <span className="text-xs">Loading live comments...</span>
                </div>
              ) : commentsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center text-white/40">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 mb-2 text-xl">
                    💬
                  </div>
                  <p className="text-sm font-semibold text-white/80">No comments yet</p>
                  <p className="text-xs text-white/40 mt-1 max-w-[200px]">
                    Be the first to share your thoughts on this reel!
                  </p>
                </div>
              ) : (
                commentsList.map((comment) => (
                  <div key={comment.id} className="flex items-start justify-between gap-3 group">
                    <img
                      src={comment.avatar}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover border border-white/15 shrink-0 shadow-sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-xs text-white/95">
                          @{comment.username}
                        </span>
                        <span className="text-[10px] text-white/40">{comment.timestamp}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-white/85 leading-relaxed break-words font-normal">
                        {comment.text}
                      </p>
                      <button
                        type="button"
                        onClick={() => setInputText(`@${comment.username} `)}
                        className="mt-1 text-[11px] font-medium text-white/40 hover:text-cyan-400 transition-colors"
                      >
                        Reply
                      </button>
                    </div>

                    {/* Heart like action */}
                    <button
                      type="button"
                      onClick={() => toggleCommentLike(comment.id)}
                      className="flex flex-col items-center pt-1 text-white/40 hover:text-pink-500 transition-colors shrink-0"
                    >
                      <Heart
                        size={14}
                        className={
                          comment.isLiked
                            ? 'fill-pink-500 text-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]'
                            : 'text-white/40 group-hover:text-white/70'
                        }
                      />
                      {comment.likes > 0 && (
                        <span className="text-[10px] mt-0.5 text-white/60 font-medium">
                          {comment.likes}
                        </span>
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Sticky Input Bar */}
            <div className="sticky bottom-0 shrink-0 border-t border-white/10 bg-[#06060c]/98 backdrop-blur-2xl pb-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
              {/* Quick Emojis Shortcut Row */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-black/40 overflow-x-auto no-scrollbar gap-2">
                {quickEmojis.map((emoji, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setInputText((prev) => prev + emoji)}
                    className="text-lg hover:scale-125 transition-transform active:scale-95 px-1 cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Input Form with Glowing Neon Post Button */}
              <form onSubmit={handlePost} className="flex items-center gap-2.5 px-4 pt-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-cyan-400 p-[1.5px] shrink-0 shadow-md">
                  <img
                    src={
                      currentUser?.avatar ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
                    }
                    alt=""
                    className="h-full w-full rounded-full object-cover"
                  />
                </div>

                <div className="relative flex-1 flex items-center">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full rounded-full bg-white/10 pl-4 pr-10 py-2.5 text-xs text-white placeholder-white/40 border border-white/15 focus:outline-none focus:border-cyan-400 focus:bg-white/15 focus:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker((prev) => !prev)}
                    aria-label="Insert sparkle emoji"
                    className="absolute right-3 text-white/50 hover:text-cyan-300 transition-colors"
                  >
                    <Smile size={16} />
                  </button>
                </div>

                {/* Glowing Neon Post Button */}
                <button
                  type="submit"
                  disabled={!inputText.trim() || isPosting}
                  aria-label="Post comment"
                  className={`px-4 py-2 rounded-full font-bold text-xs transition-all shrink-0 cursor-pointer ${
                    inputText.trim() && !isPosting
                      ? 'bg-gradient-to-r from-cyan-400 via-sky-400 to-purple-500 text-black font-extrabold shadow-[0_0_15px_rgba(6,182,212,0.7)] hover:shadow-[0_0_22px_rgba(6,182,212,0.9)] active:scale-95'
                      : 'bg-white/10 text-white/30 cursor-not-allowed'
                  }`}
                >
                  {isPosting ? <Loader2 size={14} className="animate-spin text-white" /> : 'Post'}
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
