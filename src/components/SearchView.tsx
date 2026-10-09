import React, { useState, useEffect } from 'react';
import {
  Search,
  X,
  Play,
  BadgeCheck,
  Loader2,
} from 'lucide-react';
import { Reel } from '../types';
import {
  fetchSupabaseReels,
  searchSupabaseUsers,
  SearchedUser,
} from '../utils/supabaseClient';
import { useTheme } from '../context/ThemeContext';

export interface SearchViewProps {
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

export const SearchView: React.FC<SearchViewProps> = ({
  onClose,
  reels,
  onOpenReel,
  onOpenProfile,
}) => {
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('🔥 Trending');
  const [cloudReels, setCloudReels] = useState<Reel[]>(reels);
  const [isLoading, setIsLoading] = useState(false);

  // Real-time user search results
  const [searchedUsers, setSearchedUsers] = useState<SearchedUser[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [avatarErrors, setAvatarErrors] = useState<Record<string, boolean>>({});

  // Fetch initial/updated reels from Supabase
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    fetchSupabaseReels()
      .then((fetched) => {
        if (isMounted && fetched.length > 0) {
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

  // Real-time user search query: debounced by 300ms
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
        .catch(() => {
          setSearchedUsers([]);
        })
        .finally(() => {
          setIsSearchingUsers(false);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const allReels = cloudReels.length > 0 ? cloudReels : reels;

  // Filter explore reels based on category chip
  const filteredReels = allReels.filter((reel) => {
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
    if (onOpenReel && filteredReels[index]) {
      onOpenReel(filteredReels[index].id);
    }
  };

  const handleUserClick = (username: string) => {
    if (onOpenProfile) {
      onOpenProfile(username);
    }
  };

  const isSearchActive = searchQuery.trim().length > 0;

  return (
    <div
      className={`absolute inset-0 z-40 flex flex-col select-none transition-colors ${
        isDark ? 'bg-[#000000] text-white' : 'bg-[#ffffff] text-black'
      }`}
    >
      {/* 1. TOP SEARCH BAR HEADER */}
      <div
        className={`flex flex-col shrink-0 border-b backdrop-blur-md z-10 transition-colors ${
          isDark ? 'bg-black/95 border-[#262626]' : 'bg-[#ffffff] border-[#dbdbdb]'
        }`}
      >
        {/* Top safe-area filler */}
        <div className="w-full pt-[env(safe-area-inset-top,0px)]" />

        <div className="flex items-center gap-2.5 px-4 pt-2.5 pb-2.5">
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
                aria-label="Clear search"
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
      </div>

      {/* 2. BODY CONTENT: REAL-TIME USER SEARCH RESULTS OR EXPLORE MEDIA GRID */}
      <div className="flex-1 overflow-y-auto px-3 pt-2 pb-24 no-scrollbar">
        {isSearchActive ? (
          /* ========================================================================= */
          /* LIVE USER SEARCH RESULTS LIST */
          /* ========================================================================= */
          <div className="py-1">
            {/* Loading indicator */}
            {isSearchingUsers && (
              <div className="flex items-center justify-center py-4 text-xs text-zinc-400 gap-2">
                <Loader2 size={16} className="animate-spin text-[#0095f6]" />
                <span>Searching creators...</span>
              </div>
            )}

            {/* Results list */}
            {searchedUsers.length > 0 ? (
              <div className="flex flex-col divide-y divide-zinc-800/40">
                {searchedUsers.map((user) => {
                  const cleanUsername = user.username.replace(/^@/, '');
                  const initial = (user.name || user.username || 'U')
                    .charAt(0)
                    .toUpperCase();
                  const hasImgError = avatarErrors[user.username];

                  return (
                    <div
                      key={user.id || user.username}
                      onClick={() => handleUserClick(user.username)}
                      className={`flex items-center gap-3.5 px-3 py-3 rounded-xl cursor-pointer transition-colors active:scale-[0.99] ${
                        isDark
                          ? 'hover:bg-zinc-900/70 active:bg-zinc-800/80'
                          : 'hover:bg-zinc-100 active:bg-zinc-200'
                      }`}
                    >
                      {/* User circular avatar with valid fallback */}
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-full overflow-hidden p-[1.5px] bg-gradient-to-tr from-[#fba73f] via-[#dc2743] to-[#bc1888]">
                          <div className="w-full h-full rounded-full overflow-hidden bg-neutral-900 flex items-center justify-center">
                            {user.avatar && !hasImgError ? (
                              <img
                                src={user.avatar}
                                alt=""
                                onError={() =>
                                  setAvatarErrors((prev) => ({
                                    ...prev,
                                    [user.username]: true,
                                  }))
                                }
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-tr from-[#fba73f] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white font-bold text-sm">
                                {initial}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Username & Full display name */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-bold text-sm tracking-tight truncate ${
                              isDark ? 'text-white' : 'text-neutral-900'
                            }`}
                          >
                            @{cleanUsername}
                          </span>
                          {user.isVerified && (
                            <BadgeCheck
                              size={16}
                              className="fill-[#0095f6] text-black shrink-0"
                            />
                          )}
                        </div>
                        <p
                          className={`text-xs truncate font-normal mt-0.5 ${
                            isDark ? 'text-neutral-400' : 'text-neutral-600'
                          }`}
                        >
                          {user.name}
                        </p>
                        {user.bio && (
                          <p
                            className={`text-[11px] truncate mt-0.5 ${
                              isDark ? 'text-neutral-500' : 'text-neutral-400'
                            }`}
                          >
                            {user.bio}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : !isSearchingUsers ? (
              /* Clean empty state */
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${
                    isDark
                      ? 'bg-neutral-900 text-neutral-500'
                      : 'bg-neutral-100 text-neutral-400'
                  }`}
                >
                  <Search size={24} />
                </div>
                <p
                  className={`text-sm font-semibold ${
                    isDark ? 'text-neutral-200' : 'text-neutral-800'
                  }`}
                >
                  No accounts found
                </p>
                <p
                  className={`text-xs mt-1 max-w-xs ${
                    isDark ? 'text-neutral-500' : 'text-neutral-500'
                  }`}
                >
                  No creators found matching &ldquo;{searchQuery}&rdquo;.
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          /* ========================================================================= */
          /* DEFAULT EXPLORE VIEW: Category Pills + Trending Media Grid */
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
                <p className="text-xs font-semibold text-zinc-400">
                  Loading Explore Feed...
                </p>
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
                        alt=""
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
                <p className="text-xs text-zinc-400 font-semibold">
                  No Reels Found in this category
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export { SearchView as ExploreView };
export type { SearchViewProps as ExploreViewProps };
