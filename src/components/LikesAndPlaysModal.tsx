import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Heart, Play, UserCheck, UserPlus, Check } from 'lucide-react';
import { Reel } from '../types';
import { formatCount } from '../utils/formatters';

export interface LikeUser {
  id: string;
  username: string;
  fullName: string;
  avatar: string;
  isVerified?: boolean;
  isFollowing?: boolean;
}

interface LikesAndPlaysModalProps {
  isOpen: boolean;
  onClose: () => void;
  reel?: Reel | null;
  currentUser?: {
    username: string;
    avatar?: string;
    displayName?: string;
  } | null;
}

// Seed likers library for rich and realistic user representation
const SEED_USERS: LikeUser[] = [
  {
    id: 'user_1',
    username: 'sofia_creates',
    fullName: 'Sofia Morales',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    isVerified: true,
    isFollowing: false,
  },
  {
    id: 'user_2',
    username: 'alex.visuals',
    fullName: 'Alex Rivera',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    isVerified: false,
    isFollowing: true,
  },
  {
    id: 'user_3',
    username: 'mayalina',
    fullName: 'Maya Lin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    isVerified: true,
    isFollowing: false,
  },
  {
    id: 'user_4',
    username: 'liam_urban',
    fullName: 'Liam Walker',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    isVerified: false,
    isFollowing: false,
  },
  {
    id: 'user_5',
    username: 'elena.rostova',
    fullName: 'Elena Rostova',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    isVerified: true,
    isFollowing: false,
  },
  {
    id: 'user_6',
    username: 'marcus_beats',
    fullName: 'Marcus Chen',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
    isVerified: false,
    isFollowing: true,
  },
  {
    id: 'user_7',
    username: 'chloe.inparis',
    fullName: 'Chloe Dupont',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
    isVerified: false,
    isFollowing: false,
  },
  {
    id: 'user_8',
    username: 'lucassilva.film',
    fullName: 'Lucas Silva',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    isVerified: true,
    isFollowing: false,
  },
  {
    id: 'user_9',
    username: 'priya.design',
    fullName: 'Priya Patel',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    isVerified: false,
    isFollowing: false,
  },
  {
    id: 'user_10',
    username: 'dkim.reels',
    fullName: 'Daniel Kim',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    isVerified: false,
    isFollowing: true,
  },
  {
    id: 'user_11',
    username: 'amara_vibes',
    fullName: 'Amara Okafor',
    avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80',
    isVerified: true,
    isFollowing: false,
  },
  {
    id: 'user_12',
    username: 'jordanreed.tv',
    fullName: 'Jordan Reed',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    isVerified: false,
    isFollowing: false,
  },
];

export const LikesAndPlaysModal: React.FC<LikesAndPlaysModalProps> = ({
  isOpen,
  onClose,
  reel,
  currentUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    SEED_USERS.forEach((u) => {
      initial[u.id] = Boolean(u.isFollowing);
    });
    return initial;
  });

  const toggleFollowUser = (userId: string) => {
    setFollowingMap((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(25);
      } catch {
        // ignore
      }
    }
  };

  // Compile full user list, prepending the current viewer if they have liked this reel
  const allLikers = useMemo(() => {
    const list: LikeUser[] = [];

    // If current viewer liked the reel, display them first
    if (reel?.isLiked && currentUser) {
      list.push({
        id: 'current_user_liker',
        username: currentUser.username || 'you',
        fullName: currentUser.displayName || 'You',
        avatar:
          currentUser.avatar ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        isVerified: false,
        isFollowing: false,
      });
    }

    // Add seed users with deterministic slicing based on reel id
    const offset = reel?.id
      ? Math.abs(reel.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 4
      : 0;
    const rotated = [...SEED_USERS.slice(offset), ...SEED_USERS.slice(0, offset)];
    list.push(...rotated);

    return list;
  }, [reel?.id, reel?.isLiked, currentUser]);

  // Filter users in real-time according to search query
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allLikers;
    return allLikers.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q)
    );
  }, [allLikers, searchQuery]);

  // Calculated plays count display
  const playsCountDisplay = useMemo(() => {
    if (!reel) return '0';
    if (reel.viewsCount) return reel.viewsCount;
    const estimated = Math.max(reel.likesCount * 4 + 140, 100);
    return formatCount(estimated);
  }, [reel]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm"
          />

          {/* Slide-Up Bottom Sheet */}
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
            className="absolute bottom-0 left-0 right-0 z-50 flex flex-col h-[70vh] max-h-[70vh] rounded-t-3xl bg-[#121217] backdrop-blur-2xl border-t border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.95)] overflow-hidden text-white"
          >
            {/* Top Drag Handle */}
            <div className="flex justify-center pt-2.5 pb-1 shrink-0 cursor-grab active:cursor-grabbing">
              <div className="h-1.5 w-11 rounded-full bg-white/25 hover:bg-white/40 transition-colors" />
            </div>

            {/* Header: "Likes and plays" with Close button */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white tracking-tight">Likes and plays</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Metrics Bar: Likes & Plays Stats */}
            <div className="flex items-center gap-4 px-5 py-2.5 bg-black/25 border-b border-white/5 shrink-0 text-xs font-semibold">
              <div className="flex items-center gap-1.5 text-zinc-300">
                <Heart size={14} className="fill-[#EF4444] text-[#EF4444]" />
                <span>
                  <strong className="text-white font-bold">{formatCount(reel?.likesCount || 0)}</strong> likes
                </span>
              </div>
              <span className="h-3 w-px bg-white/15" />
              <div className="flex items-center gap-1.5 text-zinc-300">
                <Play size={13} className="fill-cyan-400 text-cyan-400" />
                <span>
                  <strong className="text-white font-bold">{playsCountDisplay}</strong> plays
                </span>
              </div>
            </div>

            {/* Search Bar */}
            <div className="px-5 pt-3 pb-2 shrink-0">
              <div className="relative flex items-center w-full">
                <Search
                  size={16}
                  className="absolute left-3.5 text-zinc-400 pointer-events-none"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search"
                  className="w-full bg-[#24242e] text-white text-sm placeholder-zinc-400 pl-10 pr-9 py-2 rounded-xl border border-white/5 focus:outline-none focus:border-zinc-500 focus:bg-[#2a2a36] transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    className="absolute right-3 p-0.5 rounded-full text-zinc-400 hover:text-white transition-colors"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* User List */}
            <div className="flex-1 overflow-y-auto px-5 py-2 space-y-1 divide-y divide-white/5 no-scrollbar">
              {filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center text-zinc-400 gap-2">
                  <Search size={32} className="text-zinc-600 mb-1" />
                  <p className="text-sm font-semibold text-zinc-300">No users found</p>
                  <p className="text-xs text-zinc-500">
                    No users matching &quot;{searchQuery}&quot; liked this reel.
                  </p>
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const isViewer = user.id === 'current_user_liker';
                  const isFollowing = followingMap[user.id] ?? Boolean(user.isFollowing);

                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between py-3 gap-3 group"
                    >
                      {/* Avatar & User Details */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          <img
                            src={user.avatar}
                            alt={user.username}
                            className="h-11 w-11 rounded-full object-cover border border-white/10"
                            onError={(e) => {
                              // Fallback image if network fails
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80';
                            }}
                          />
                        </div>

                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-sm text-white truncate">
                              {user.username}
                            </span>
                            {user.isVerified && (
                              <span className="inline-flex items-center justify-center h-3.5 w-3.5 rounded-full bg-[#0095f6] text-[9px] text-white font-black">
                                ✓
                              </span>
                            )}
                            {isViewer && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-zinc-400 truncate">
                            {user.fullName}
                          </span>
                        </div>
                      </div>

                      {/* Working Follow Toggle Button */}
                      {!isViewer && (
                        <button
                          type="button"
                          onClick={() => toggleFollowUser(user.id)}
                          className={`shrink-0 text-xs font-semibold px-4 py-1.5 rounded-lg active:scale-95 transition-all duration-150 flex items-center justify-center gap-1 min-w-[84px] cursor-pointer ${
                            isFollowing
                              ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700/80'
                              : 'bg-[#0095f6] hover:bg-[#1877f2] text-white shadow-sm'
                          }`}
                        >
                          {isFollowing ? (
                            <>
                              <Check size={13} strokeWidth={2.5} />
                              <span>Following</span>
                            </>
                          ) : (
                            <>
                              <UserPlus size={13} strokeWidth={2.5} />
                              <span>Follow</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
