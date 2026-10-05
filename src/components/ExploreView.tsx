import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Play,
  Volume2,
  VolumeX,
  Heart,
  MessageCircle,
  Share2,
  ArrowLeft,
  Sparkles,
  UserPlus,
  UserCheck,
  Send,
  Loader2,
} from 'lucide-react';
import { Reel } from '../types';
import {
  fetchSupabaseReels,
  updateReelLikesInSupabase,
  searchSupabaseUsers,
  SearchedUser,
} from '../utils/supabaseClient';
import { useTheme } from '../context/ThemeContext';

export interface ExploreViewProps {
  onClose: () => void;
  reels: Reel[];
  onOpenReel?: (reelId: string) => void;
  onOpenProfile?: (username: string) => void;
  onOpenChatWithUser?: (username: string) => void;
}

const CATEGORY_PILLS = [
  '🔥 Trending',
  '🎬 Bollywood',
  '⚡ Viral',
  '🎧 Remixes',
  '😂 Comedy',
  '💃 Dance',
];

export const ExploreView: React.FC<ExploreViewProps> = ({
  onClose,
  reels,
  onOpenReel,
  onOpenProfile,
  onOpenChatWithUser,
}) => {
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('🔥 Trending');
  const [cloudReels, setCloudReels] = useState<Reel[]>(reels);
  const [isLoading, setIsLoading] = useState(false);

  // Real-time user search results
  const [searchedUsers, setSearchedUsers] = useState<SearchedUser[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [followedUsernames, setFollowedUsernames] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('gedion_followed_users_v1');
      if (stored) return new Set(JSON.parse(stored));
    } catch {}
    return new Set();
  });

  // Full-screen vertical swipe mode state
  const [activeSwipeReelIndex, setActiveSwipeReelIndex] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    fetchSupabaseReels()
      .then((fetched) => {
        if (isMounted) {
          setCloudReels(fetched);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [reels]);

  // Real-time user search query with debouncing
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchedUsers([]);
      setIsSearchingUsers(false);
      return;
    }

    setIsSearchingUsers(true);
    const timer = setTimeout(() => {
      searchSupabaseUsers(trimmed)
        .then((users) => {
          setSearchedUsers(users);
        })
        .finally(() => {
          setIsSearchingUsers(false);
        });
    }, 180);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const allReels = cloudReels.length > 0 ? cloudReels : reels;

  // Filter reels based on search query and category chip
  const filteredReels = allReels.filter((reel) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        reel.username.toLowerCase().includes(q) ||
        reel.displayName.toLowerCase().includes(q) ||
        reel.caption.toLowerCase().includes(q) ||
        reel.audioTitle.toLowerCase().includes(q) ||
        reel.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchQuery) return false;
    }

    if (selectedCategory === '🔥 Trending') return true;
    if (selectedCategory === '🎬 Bollywood') {
      return (
        reel.tags.some((t) => /bollywood|desi|hindi|haveli/i.test(t)) ||
        /bollywood|desi|kesariya|pathaan|nasha/i.test(reel.caption + reel.audioTitle)
      );
    }
    if (selectedCategory === '⚡ Viral') {
      return (
        reel.tags.some((t) => /viral|trending|epic/i.test(t)) ||
        reel.viewsCount.includes('M')
      );
    }
    if (selectedCategory === '🎧 Remixes') {
      return (
        reel.tags.some((t) => /remix|electronic|lofi|bass/i.test(t)) ||
        /remix|dub|mix|lo-fi|bootleg|beats/i.test(reel.caption + reel.audioTitle)
      );
    }
    if (selectedCategory === '😂 Comedy') {
      return (
        reel.tags.some((t) => /comedy|humor|standup|relatable/i.test(t)) ||
        /comedy|laugh|funny|mom|generation/i.test(reel.caption)
      );
    }
    if (selectedCategory === '💃 Dance') {
      return (
        reel.tags.some((t) => /dance|choreography|kathak|fusion/i.test(t)) ||
        /dance|choreography|hook step|kathak/i.test(reel.caption)
      );
    }

    return true;
  });

  const handleTileClick = (index: number) => {
    setActiveSwipeReelIndex(index);
    setIsPlaying(true);
    if (onOpenReel && filteredReels[index]) {
      onOpenReel(filteredReels[index].id);
    }
  };

  const handleToggleFollowUser = (e: React.MouseEvent, username: string) => {
    e.stopPropagation();
    setFollowedUsernames((prev) => {
      const next = new Set(prev);
      if (next.has(username)) {
        next.delete(username);
      } else {
        next.add(username);
      }
      try {
        localStorage.setItem('gedion_followed_users_v1', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const activeReel =
    activeSwipeReelIndex !== null ? filteredReels[activeSwipeReelIndex] : null;

  return (
    <div
      className={`absolute inset-0 z-40 flex flex-col select-none transition-colors ${
        isDark ? 'bg-[#000000] text-white' : 'bg-white text-black'
      }`}
    >
      {/* 1. TOP SEARCH BAR HEADER */}
      <div
        className={`flex items-center gap-2.5 px-4 pt-3.5 pb-2.5 shrink-0 border-b backdrop-blur-md z-10 transition-colors ${
          isDark ? 'bg-black/90 border-[#262626]' : 'bg-white/90 border-[#efefef]'
        }`}
      >
        {/* Search Input Container */}
        <div
          className={`flex-1 flex items-center rounded-2xl px-3.5 py-2 transition-all ${
            isDark
              ? 'bg-[#18181b] border border-[#27272a] focus-within:border-[#0095f6]'
              : 'bg-zinc-100 border border-zinc-200 focus-within:border-[#0095f6]'
          }`}
        >
          <Search size={16} className="text-zinc-400 shrink-0 mr-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search accounts, creators, tags..."
            className="w-full bg-transparent text-xs font-normal focus:outline-none placeholder-zinc-500"
            autoFocus={false}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-1 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Back to feed"
          className="p-1.5 rounded-full text-zinc-400 hover:text-white active:scale-95 transition-all cursor-pointer"
        >
          <X size={20} />
        </button>
      </div>

      {/* 2. REAL-TIME SEARCH RESULTS OR EXPLORE GRID */}
      <div className="flex-1 overflow-y-auto px-3 pt-2 pb-24 no-scrollbar">
        {searchQuery.trim() ? (
          /* ========================================================================= */
          /* LIVE SEARCH MODE (Users & Matching Reels) */
          /* ========================================================================= */
          <div className="space-y-4">
            {/* Real Users Search Results Section */}
            <div>
              <div className="flex items-center justify-between px-1 py-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  Accounts & Creators
                </p>
                {isSearchingUsers && (
                  <Loader2 size={13} className="animate-spin text-[#0095f6]" />
                )}
              </div>

              {searchedUsers.length > 0 ? (
                <div
                  className={`rounded-2xl border divide-y overflow-hidden transition-colors ${
                    isDark
                      ? 'bg-[#121214] border-[#262626] divide-[#262626]'
                      : 'bg-white border-[#efefef] divide-[#efefef]'
                  }`}
                >
                  {searchedUsers.map((user) => {
                    const isFollowing = followedUsernames.has(user.username);

                    return (
                      <div
                        key={user.id || user.username}
                        onClick={() => {
                          if (onOpenProfile) {
                            onOpenProfile(user.username);
                          }
                        }}
                        className={`flex items-center justify-between p-3 cursor-pointer transition-colors active:scale-[0.99] ${
                          isDark ? 'hover:bg-zinc-900/60' : 'hover:bg-zinc-50'
                        }`}
                      >
                        {/* User Avatar & Info */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative p-[1.5px] rounded-full bg-gradient-to-tr from-[#fba73f] via-[#dc2743] to-[#bc1888] shrink-0">
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className="w-10 h-10 rounded-full object-cover border-[1.5px] border-black"
                              loading="lazy"
                            />
                          </div>

                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold tracking-tight truncate hover:underline">
                              {user.username}
                            </span>
                            <span className="text-[11px] text-zinc-400 truncate font-normal">
                              {user.name}
                            </span>
                            {user.bio && (
                              <span className="text-[10px] text-zinc-500 truncate max-w-[180px]">
                                {user.bio}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons: Follow + Message */}
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={(e) => handleToggleFollowUser(e, user.username)}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm ${
                              isFollowing
                                ? isDark
                                  ? 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:border-zinc-600'
                                  : 'bg-zinc-200 text-zinc-800 border border-zinc-300 hover:bg-zinc-300'
                                : 'bg-[#0095f6] text-white hover:bg-[#1877f2]'
                            }`}
                          >
                            {isFollowing ? 'Following' : 'Follow'}
                          </button>

                          {onOpenChatWithUser && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenChatWithUser(user.username);
                              }}
                              aria-label={`Message ${user.username}`}
                              className={`p-1.5 rounded-xl border transition-all active:scale-90 cursor-pointer ${
                                isDark
                                  ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700'
                                  : 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:text-black'
                              }`}
                            >
                              <Send size={14} className="-rotate-12" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : !isSearchingUsers ? (
                <div className="p-4 text-center rounded-2xl bg-[#121214] border border-[#262626] text-zinc-500 text-xs">
                  No accounts found matching &quot;{searchQuery}&quot;
                </div>
              ) : null}
            </div>

            {/* Matching Reels Grid */}
            <div className="pt-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 px-1 mb-2">
                Matching Posts & Reels
              </p>

              {filteredReels.length > 0 ? (
                <div className="grid grid-cols-3 gap-1.5">
                  {filteredReels.map((reel, index) => (
                    <div
                      key={reel.id}
                      onClick={() => handleTileClick(index)}
                      className="group relative aspect-[9/15] rounded-xl overflow-hidden cursor-pointer bg-black border border-white/5 active:scale-95 transition-transform"
                    >
                      {reel.poster ? (
                        <img
                          src={reel.poster}
                          alt={reel.caption}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <video
                          src={reel.videoUrl}
                          muted
                          playsInline
                          preload="metadata"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent flex flex-col justify-end p-1.5 pointer-events-none">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-white drop-shadow-md">
                          <Play size={10} className="fill-white text-white shrink-0" />
                          <span>{reel.viewsCount || '0'}</span>
                        </div>
                        <p className="text-[10px] text-white/80 font-medium truncate mt-0.5">
                          @{reel.username}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 text-center py-6">
                  No video reels matching &quot;{searchQuery}&quot;
                </p>
              )}
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* DEFAULT EXPLORE VIEW: Category Pills + Trending Grid */
          /* ========================================================================= */
          <div>
            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 mb-3">
              {CATEGORY_PILLS.map((pill) => {
                const isActive = selectedCategory === pill;
                return (
                  <button
                    key={pill}
                    type="button"
                    onClick={() => setSelectedCategory(pill)}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer ${
                      isActive
                        ? 'bg-[#0095f6] text-white shadow-sm'
                        : isDark
                        ? 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                        : 'bg-zinc-100 border border-zinc-200 text-zinc-600 hover:text-black'
                    }`}
                  >
                    {pill}
                  </button>
                );
              })}
            </div>

            {/* 3-Column Video Explore Grid */}
            {isLoading && filteredReels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <Loader2 size={24} className="animate-spin text-[#0095f6] mb-3" />
                <p className="text-xs font-semibold text-zinc-400">Loading Explore Feed...</p>
              </div>
            ) : filteredReels.length > 0 ? (
              <div className="grid grid-cols-3 gap-1.5">
                {filteredReels.map((reel, index) => (
                  <div
                    key={reel.id}
                    onClick={() => handleTileClick(index)}
                    className="group relative aspect-[9/15] rounded-xl overflow-hidden cursor-pointer bg-black border border-white/5 active:scale-95 transition-transform"
                  >
                    {reel.poster ? (
                      <img
                        src={reel.poster}
                        alt={reel.caption}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <video
                        src={reel.videoUrl}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent flex flex-col justify-end p-1.5 pointer-events-none">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-white drop-shadow-md">
                        <Play size={10} className="fill-white text-white shrink-0" />
                        <span>{reel.viewsCount || '0'}</span>
                      </div>
                      <p className="text-[10px] text-white/80 font-medium truncate mt-0.5">
                        @{reel.username}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <Search size={28} className="text-zinc-600 mb-3" />
                <p className="text-xs text-zinc-400 font-semibold">No Reels Found in this category</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
