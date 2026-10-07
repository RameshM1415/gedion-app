import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, UserCheck, UserPlus, Users, Loader2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { AuthUser } from '../utils/authStorage';
import {
  FollowUserItem,
  fetchFollowersList,
  fetchFollowingList,
  followUser,
  unfollowUser,
} from '../utils/followersService';

export interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: {
    id?: string;
    username: string;
    displayName?: string;
  };
  initialTab?: 'followers' | 'following';
  currentUser?: AuthUser | null;
  onOpenProfile?: (username: string) => void;
  onRequireAuth?: (prompt: string) => void;
}

export const FollowersModal: React.FC<FollowersModalProps> = ({
  isOpen,
  onClose,
  targetUser,
  initialTab = 'followers',
  currentUser,
  onOpenProfile,
  onRequireAuth,
}) => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [usersList, setUsersList] = useState<FollowUserItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingIds, setActionLoadingIds] = useState<Set<string>>(new Set());

  // Reset tab when modal opens or initialTab changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSearchQuery('');
    }
  }, [isOpen, initialTab]);

  // Load followers or following from Supabase
  const loadUsers = useCallback(async () => {
    if (!isOpen || !targetUser.username) return;
    setIsLoading(true);

    try {
      if (activeTab === 'followers') {
        const list = await fetchFollowersList(
          targetUser.id,
          targetUser.username,
          currentUser?.id,
          currentUser?.username
        );
        setUsersList(list);
      } else {
        const list = await fetchFollowingList(
          targetUser.id,
          targetUser.username,
          currentUser?.id,
          currentUser?.username
        );
        setUsersList(list);
      }
    } catch (err) {
      console.warn('Error fetching follow list:', err);
      setUsersList([]);
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, targetUser, activeTab, currentUser]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Filter list by search query
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return usersList;
    return usersList.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q)
    );
  }, [usersList, searchQuery]);

  // Toggle follow/unfollow for a user in the list
  const handleToggleFollowUser = async (userItem: FollowUserItem) => {
    if (!currentUser) {
      onRequireAuth?.('Sign in to follow creators on GediOn!');
      return;
    }

    const cleanCurrent = currentUser.username.toLowerCase().replace(/^@/, '');
    const cleanTarget = userItem.username.toLowerCase().replace(/^@/, '');
    if (cleanCurrent === cleanTarget) return;

    const nextFollowing = !userItem.isFollowing;

    // Optimistically update list
    setUsersList((prev) =>
      prev.map((u) =>
        u.username.toLowerCase().replace(/^@/, '') === cleanTarget
          ? { ...u, isFollowing: nextFollowing }
          : u
      )
    );

    setActionLoadingIds((prev) => new Set(prev).add(userItem.id));

    try {
      if (nextFollowing) {
        await followUser(
          {
            id: currentUser.id,
            username: currentUser.username,
            displayName: currentUser.displayName,
            avatar: currentUser.avatar,
          },
          {
            id: userItem.id,
            username: userItem.username,
            displayName: userItem.displayName,
            avatar: userItem.avatar,
          }
        );
      } else {
        await unfollowUser(
          { id: currentUser.id, username: currentUser.username },
          { id: userItem.id, username: userItem.username }
        );
      }
    } catch (err) {
      console.warn('Error toggling follow:', err);
    } finally {
      setActionLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(userItem.id);
        return next;
      });
    }
  };

  const handleUserClick = (username: string) => {
    onClose();
    onOpenProfile?.(username);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        />

        {/* Modal Sheet */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 290 }}
          className={`relative z-10 w-full max-w-[440px] h-[82vh] max-h-[640px] flex flex-col rounded-t-[24px] sm:rounded-[24px] overflow-hidden shadow-2xl border transition-colors ${
            isDark ? 'bg-black text-white border-zinc-800' : 'bg-white text-black border-zinc-200'
          }`}
        >
          {/* Top Drag Handle for mobile */}
          <div className="w-full flex items-center justify-center pt-2.5 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-zinc-600/50" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
            <div className="font-bold text-sm tracking-tight truncate max-w-[240px]">
              @{targetUser.username}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tabs: Followers vs Following */}
          <div className="grid grid-cols-2 border-b border-zinc-200 dark:border-zinc-800 text-center font-bold text-xs shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('followers')}
              className={`py-3 transition-colors relative cursor-pointer ${
                activeTab === 'followers'
                  ? 'text-black dark:text-white'
                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
              }`}
            >
              <span>Followers</span>
              {activeTab === 'followers' && (
                <div className="absolute bottom-0 inset-x-8 h-0.5 bg-black dark:bg-white rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('following')}
              className={`py-3 transition-colors relative cursor-pointer ${
                activeTab === 'following'
                  ? 'text-black dark:text-white'
                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
              }`}
            >
              <span>Following</span>
              {activeTab === 'following' && (
                <div className="absolute bottom-0 inset-x-8 h-0.5 bg-black dark:bg-white rounded-full" />
              )}
            </button>
          </div>

          {/* Search Bar */}
          <div className="px-4 py-2.5 shrink-0">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-xs">
              <Search size={15} className="text-zinc-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full bg-transparent border-none outline-none text-xs placeholder:text-zinc-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto px-4 divide-y divide-zinc-100 dark:divide-zinc-900/60 no-scrollbar">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-zinc-400">
                <Loader2 size={24} className="animate-spin text-[#0095f6]" />
                <span className="text-xs">Loading {activeTab}...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-52 text-center p-6 text-zinc-400">
                <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-3">
                  <Users size={24} className="text-zinc-400" />
                </div>
                <h4 className="font-bold text-sm text-black dark:text-white">
                  {searchQuery
                    ? 'No users found'
                    : activeTab === 'followers'
                    ? 'No followers yet'
                    : 'Not following anyone yet'}
                </h4>
                <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                  {searchQuery
                    ? `No users match "${searchQuery}"`
                    : activeTab === 'followers'
                    ? `When people follow @${targetUser.username}, they'll appear here.`
                    : `@${targetUser.username} is not following any accounts yet.`}
                </p>
              </div>
            ) : (
              filteredUsers.map((userItem) => {
                const isViewer =
                  currentUser &&
                  userItem.username.toLowerCase().replace(/^@/, '') ===
                    currentUser.username.toLowerCase().replace(/^@/, '');
                const isItemLoading = actionLoadingIds.has(userItem.id);

                return (
                  <div
                    key={userItem.username}
                    className="flex items-center justify-between py-3 gap-3"
                  >
                    {/* User Avatar + Names (Clickable) */}
                    <div
                      onClick={() => handleUserClick(userItem.username)}
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
                    >
                      <img
                        src={userItem.avatar}
                        alt={userItem.displayName}
                        className="w-11 h-11 rounded-full object-cover border border-zinc-200 dark:border-zinc-800 shrink-0 group-hover:opacity-90 transition-opacity"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-xs truncate group-hover:underline text-black dark:text-white">
                          {userItem.username}
                        </span>
                        <span className="text-[11px] text-zinc-500 truncate">
                          {userItem.displayName}
                        </span>
                      </div>
                    </div>

                    {/* Follow / Following Button (not displayed for the current viewer themselves) */}
                    {!isViewer && (
                      <button
                        type="button"
                        onClick={() => handleToggleFollowUser(userItem)}
                        disabled={isItemLoading}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0 flex items-center gap-1.5 shadow-sm ${
                          userItem.isFollowing
                            ? 'bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-black dark:text-white border border-zinc-300 dark:border-zinc-700'
                            : 'bg-[#0095f6] hover:bg-[#1877f2] text-white'
                        }`}
                      >
                        {isItemLoading ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : userItem.isFollowing ? (
                          <>
                            <UserCheck size={13} />
                            <span>Following</span>
                          </>
                        ) : (
                          <>
                            <UserPlus size={13} />
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
      </div>
    </AnimatePresence>
  );
};
