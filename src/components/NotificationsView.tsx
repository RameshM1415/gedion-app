import React, { useState, useEffect } from 'react';
import { Heart, X, Check, ArrowLeft } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../utils/supabaseClient';
import { getStoredAuth, DEFAULT_AUTH_USER } from '../utils/authStorage';
import {
  NotificationItem,
  fetchUserNotifications,
  acceptFollowRequest,
  deleteNotification,
  markAllNotificationsAsRead,
  toggleFollowBack,
  setCachedNotifications,
  formatRelativeTime,
} from '../utils/notificationsService';

export type { NotificationItem };

export interface NotificationsViewProps {
  onClose: () => void;
  onOpenProfile?: (username: string) => void;
  reels?: any;
  onOpenChatWithUser?: (username: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  onClose,
  onOpenProfile,
}) => {
  const { isDark } = useTheme();
  const currentUser = getStoredAuth() || DEFAULT_AUTH_USER;

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionToasts, setActionToasts] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setActionToasts(msg);
    setTimeout(() => setActionToasts(null), 2500);
  };

  // 1. Fetch live notifications from Supabase & subscribe to real-time additions
  useEffect(() => {
    let isSubscribed = true;

    async function load() {
      setIsLoading(true);
      const items = await fetchUserNotifications(currentUser?.id, currentUser?.username);
      if (isSubscribed) {
        setNotifications(items);
        setIsLoading(false);
      }
      // Mark as read upon opening notifications screen
      markAllNotificationsAsRead(currentUser?.id, currentUser?.username).catch(() => {});
    }

    load();

    // 2. Realtime subscription to Supabase 'notifications' table for live INSERT events
    const cleanUser = (currentUser?.username || '').toLowerCase().replace(/^@/, '');
    const channel = supabase
      .channel(`realtime-notifications-${cleanUser || 'user'}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const row = payload.new;
          if (!row) return;

          // Check if notification targets the logged-in user
          const rowRecipient = (row.recipient_username || row.recipient_id || row.user_id || '').toLowerCase();
          const isTargeted =
            !rowRecipient ||
            rowRecipient === cleanUser ||
            rowRecipient === currentUser?.id?.toLowerCase();

          if (isTargeted) {
            const actorUser = (row.actor_username || row.sender_username || 'creator').replace(/^@/, '');
            const newNotif: NotificationItem = {
              id: String(row.id || Date.now()),
              userId: row.user_id || currentUser?.id,
              type: row.type || 'follow',
              actorId: row.actor_id,
              actorUsername: actorUser,
              actorName: row.actor_name || row.sender_name || actorUser,
              actorAvatar:
                row.actor_avatar ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${actorUser}&backgroundColor=06b6d4,a855f7`,
              message:
                row.message ||
                (row.type === 'follow_request' ? 'requested to follow you' : 'started following you'),
              timestamp: formatRelativeTime(row.created_at),
              createdAt: row.created_at || new Date().toISOString(),
              status: row.status || (row.type === 'follow_request' ? 'pending' : 'accepted'),
              isFollowingBack: false,
              isRead: false,
            };

            setNotifications((prev) => {
              const updated = [newNotif, ...prev.filter((n) => n.id !== newNotif.id)];
              setCachedNotifications(updated);
              return updated;
            });

            // Trigger unread indicator event
            window.dispatchEvent(
              new CustomEvent('gedion-unread-activity', { detail: { count: 1 } })
            );
          }
        }
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, currentUser?.username]);

  // Handle Confirm / Accept Follow Request
  const handleAcceptRequest = async (notif: NotificationItem) => {
    // Optimistic UI state update
    setNotifications((prev) => {
      const updated = prev.map((n) =>
        n.id === notif.id ? { ...n, status: 'accepted' as const, isFollowingBack: true } : n
      );
      setCachedNotifications(updated);
      return updated;
    });

    showToast(`Accepted follow request from @${notif.actorUsername}`);

    try {
      await acceptFollowRequest(notif.id, notif.actorUsername, currentUser);
    } catch (err) {
      console.warn('Accept follow request error:', err);
    }
  };

  // Handle Delete Follow Request
  const handleDeleteRequest = async (notifId: string, actorUsername: string) => {
    // Optimistic removal from list
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== notifId);
      setCachedNotifications(updated);
      return updated;
    });

    showToast(`Removed follow request from @${actorUsername}`);

    try {
      await deleteNotification(notifId);
    } catch (err) {
      console.warn('Delete follow notification error:', err);
    }
  };

  // Handle Follow Back Toggle
  const handleToggleFollowBackAction = async (notif: NotificationItem) => {
    const nextState = !notif.isFollowingBack;

    // Optimistic toggle
    setNotifications((prev) => {
      const updated = prev.map((n) =>
        n.id === notif.id ? { ...n, isFollowingBack: nextState } : n
      );
      setCachedNotifications(updated);
      return updated;
    });

    showToast(nextState ? `Following @${notif.actorUsername}` : `Unfollowed @${notif.actorUsername}`);

    try {
      await toggleFollowBack(notif.actorUsername, currentUser, notif.isFollowingBack ?? false);
    } catch (err) {
      console.warn('Toggle follow back error:', err);
      // Revert on error
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isFollowingBack: !nextState } : n))
      );
    }
  };

  const pendingRequests = notifications.filter(
    (n) => n.type === 'follow_request' && n.status === 'pending'
  );
  const regularNotifications = notifications.filter(
    (n) => !(n.type === 'follow_request' && n.status === 'pending')
  );

  return (
    <div
      className={`absolute inset-0 z-30 flex flex-col pt-0 pb-20 overflow-y-auto no-scrollbar transition-colors select-none ${
        isDark ? 'bg-black text-white' : 'bg-[#ffffff] text-neutral-900'
      }`}
    >
      {/* Top Header */}
      <header
        className={`sticky top-0 z-20 flex flex-col border-b backdrop-blur-md transition-colors ${
          isDark ? 'bg-black/95 border-neutral-800' : 'bg-[#ffffff]/95 border-neutral-200'
        }`}
      >
        <div className="w-full pt-[env(safe-area-inset-top,0px)]" />
        <div className="flex items-center justify-between px-4 h-[48px]">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              aria-label="Back"
              className="p-1 -ml-1 rounded-full hover:opacity-75 active:scale-95 transition-all cursor-pointer"
            >
              <ArrowLeft size={22} />
            </button>
            <h2 className="text-[17px] font-bold tracking-tight">Notifications</h2>
          </div>

          <div className="flex items-center gap-2">
            <Heart size={20} className="text-rose-500 fill-rose-500" />
          </div>
        </div>
      </header>

      {/* Floating Toast Notification */}
      {actionToasts && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-neutral-900/95 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-semibold shadow-xl backdrop-blur-md animate-fade-in pointer-events-none">
          {actionToasts}
        </div>
      )}

      {/* Notifications Body Content */}
      <div className="flex-1 flex flex-col p-3">
        {isLoading && notifications.length === 0 ? (
          <div className="flex flex-col gap-4 p-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <div className="w-11 h-11 rounded-full bg-neutral-200 dark:bg-neutral-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800" />
                  <div className="h-2 w-1/4 rounded bg-neutral-200 dark:bg-neutral-800" />
                </div>
                <div className="w-20 h-7 rounded-lg bg-neutral-200 dark:bg-neutral-800 shrink-0" />
              </div>
            ))}
          </div>
        ) : notifications.length > 0 ? (
          <div className="flex flex-col">
            {/* 1. Follow Requests Section */}
            {pendingRequests.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider px-2 py-1.5">
                  Follow Requests ({pendingRequests.length})
                </h3>
                <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-900">
                  {pendingRequests.map((notif) => (
                    <div
                      key={notif.id}
                      className="flex items-center justify-between py-3 px-2 gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-900/40 rounded-xl transition-colors"
                    >
                      {/* Avatar & Message */}
                      <div
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                        onClick={() => onOpenProfile?.(notif.actorUsername)}
                      >
                        <div className="relative p-[1.5px] rounded-full bg-gradient-to-tr from-[#fba73f] via-[#dc2743] to-[#bc1888] shrink-0">
                          <img
                            src={notif.actorAvatar}
                            alt=""
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${notif.actorUsername}&backgroundColor=06b6d4,a855f7`;
                            }}
                            className="w-11 h-11 rounded-full object-cover border-[1.5px] border-white dark:border-black"
                          />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <p className="text-xs text-neutral-900 dark:text-neutral-100 leading-snug">
                            <span className="font-bold mr-1">@{notif.actorUsername}</span>
                            <span className="text-neutral-600 dark:text-neutral-400">
                              requested to follow you
                            </span>
                          </p>
                          <span className="text-[11px] text-neutral-400 mt-0.5">{notif.timestamp}</span>
                        </div>
                      </div>

                      {/* Follow Request Actions: Confirm (blue) / Delete (gray) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleAcceptRequest(notif)}
                          className="px-3.5 py-1.5 rounded-lg bg-[#0095f6] hover:bg-[#1877f2] text-white text-xs font-semibold active:scale-95 transition-all shadow-sm cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRequest(notif.id, notif.actorUsername)}
                          className="px-3 py-1.5 rounded-lg bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold active:scale-95 transition-all cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Activity / Follows List */}
            <div>
              {pendingRequests.length > 0 && (
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider px-2 py-1.5">
                  Recent
                </h3>
              )}
              <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-900">
                {regularNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="flex items-center justify-between py-3 px-2 gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-900/40 rounded-xl transition-colors"
                  >
                    {/* Avatar & Message */}
                    <div
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      onClick={() => onOpenProfile?.(notif.actorUsername)}
                    >
                      <div className="relative p-[1.5px] rounded-full bg-gradient-to-tr from-[#fba73f] via-[#dc2743] to-[#bc1888] shrink-0">
                        <img
                          src={notif.actorAvatar}
                          alt=""
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${notif.actorUsername}&backgroundColor=06b6d4,a855f7`;
                          }}
                          className="w-11 h-11 rounded-full object-cover border-[1.5px] border-white dark:border-black"
                        />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <p className="text-xs text-neutral-900 dark:text-neutral-100 leading-snug">
                          <span className="font-bold mr-1">@{notif.actorUsername}</span>
                          <span className="text-neutral-600 dark:text-neutral-400">{notif.message}</span>
                        </p>
                        <span className="text-[11px] text-neutral-400 mt-0.5">{notif.timestamp}</span>
                      </div>
                    </div>

                    {/* Action button: Follow Back / Following Toggle */}
                    {notif.type === 'follow_request' && notif.status === 'accepted' ? (
                      <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 flex items-center gap-1 px-2 shrink-0">
                        <Check size={14} className="text-[#0095f6]" /> Confirmed
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleFollowBackAction(notif)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold active:scale-95 transition-all cursor-pointer shadow-sm shrink-0 ${
                          notif.isFollowingBack
                            ? 'bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-200'
                            : 'bg-[#0095f6] hover:bg-[#1877f2] text-white'
                        }`}
                      >
                        {notif.isFollowingBack ? 'Following' : 'Follow Back'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Clean Instagram Activity Zero-State Screen */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center my-auto min-h-[340px]">
            <div
              className={`h-16 w-16 rounded-full flex items-center justify-center mb-4 border ${
                isDark
                  ? 'bg-neutral-900 border-neutral-800 text-rose-400'
                  : 'bg-neutral-50 border-neutral-200 text-rose-500'
              }`}
            >
              <Heart size={30} />
            </div>
            <h3 className="text-sm font-bold tracking-tight">Activity On Your Account</h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-xs leading-relaxed">
              When people follow you, like your posts, or send follow requests, you&apos;ll see them here in real-time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

