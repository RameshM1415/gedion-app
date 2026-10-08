import React, { useState, useEffect } from 'react';
import { Heart, X, UserPlus, UserCheck, Check, Trash2, Bell } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../utils/supabaseClient';
import { getStoredAuth, DEFAULT_AUTH_USER } from '../utils/authStorage';
import { followUser } from '../utils/followersService';

export interface NotificationItem {
  id: string;
  type: 'follow' | 'follow_request' | 'like' | 'comment';
  actorUsername: string;
  actorName: string;
  actorAvatar: string;
  message: string;
  timestamp: string;
  status?: 'pending' | 'accepted' | 'declined';
  isFollowingBack?: boolean;
  isRead?: boolean;
}

export interface NotificationsViewProps {
  onClose: () => void;
  onOpenProfile?: (username: string) => void;
  reels?: any;
  onOpenChatWithUser?: (username: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  onClose,
  onOpenProfile,
  onOpenChatWithUser,
}) => {
  const { isDark } = useTheme();
  const currentUser = getStoredAuth() || DEFAULT_AUTH_USER;

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const stored = localStorage.getItem('gedion_notifications_v1');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  // Fetch from Supabase notifications table & listen for Realtime events
  useEffect(() => {
    let isSubscribed = true;

    async function loadNotifications() {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30);

        if (!error && Array.isArray(data) && isSubscribed) {
          const mapped: NotificationItem[] = data.map((n: any) => ({
            id: String(n.id),
            type: n.type || 'follow',
            actorUsername: n.actor_username || n.sender_username || 'creator',
            actorName: n.actor_name || n.sender_name || n.actor_username || 'Creator',
            actorAvatar:
              n.actor_avatar ||
              n.sender_avatar ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${n.actor_username || 'user'}&backgroundColor=06b6d4,a855f7`,
            message: n.message || (n.type === 'follow_request' ? 'requested to follow you' : 'started following you'),
            timestamp: 'Just now',
            status: n.status || 'pending',
            isFollowingBack: false,
            isRead: Boolean(n.is_read),
          }));

          if (mapped.length > 0) {
            setNotifications(mapped);
          }
        }
      } catch (err) {
        console.warn('Notifications fetch note:', err);
      }
    }

    loadNotifications();

    // Supabase Realtime channel listener for live new notifications
    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const row = payload.new;
          if (!row) return;

          const newNotif: NotificationItem = {
            id: String(row.id || Date.now()),
            type: row.type || 'follow',
            actorUsername: row.actor_username || row.sender_username || 'creator',
            actorName: row.actor_name || row.sender_name || 'Creator',
            actorAvatar:
              row.actor_avatar ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${row.actor_username || 'user'}&backgroundColor=06b6d4,a855f7`,
            message: row.message || (row.type === 'follow_request' ? 'requested to follow you' : 'started following you'),
            timestamp: 'Just now',
            status: 'pending',
            isFollowingBack: false,
            isRead: false,
          };

          setNotifications((prev) => [newNotif, ...prev]);

          // Trigger red unread badge event
          window.dispatchEvent(new CustomEvent('gedion-unread-activity', { detail: { count: 1 } }));
        }
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Save to localStorage whenever notifications change
  useEffect(() => {
    try {
      localStorage.setItem('gedion_notifications_v1', JSON.stringify(notifications));
    } catch {}
  }, [notifications]);

  // Handle Accept / Confirm Follow Request
  const handleAcceptRequest = async (notifId: string, actorUsername: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, status: 'accepted', isFollowingBack: true } : n))
    );

    try {
      await supabase.from('notifications').update({ status: 'accepted', is_read: true }).eq('id', notifId);
      // Add to followers
      followUser(
        { id: `usr_${actorUsername}`, username: actorUsername },
        { id: currentUser.id, username: currentUser.username }
      ).catch(() => {});
    } catch (err) {
      console.warn('Accept follow request error:', err);
    }
  };

  // Handle Delete / Decline Follow Request
  const handleDeleteRequest = async (notifId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    try {
      await supabase.from('notifications').delete().eq('id', notifId);
    } catch (err) {
      console.warn('Delete follow notification error:', err);
    }
  };

  // Handle Follow Back Toggle
  const handleToggleFollowBack = async (notifId: string, targetUsername: string) => {
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id === notifId) {
          const next = !n.isFollowingBack;
          return { ...n, isFollowingBack: next };
        }
        return n;
      })
    );

    try {
      await followUser(
        { id: currentUser.id, username: currentUser.username },
        { id: `usr_${targetUsername}`, username: targetUsername }
      );
    } catch (err) {
      console.warn('Follow back error:', err);
    }
  };

  return (
    <div
      className={`absolute inset-0 z-30 flex flex-col pt-0 pb-20 overflow-y-auto no-scrollbar transition-colors ${
        isDark ? 'bg-black text-white' : 'bg-[#ffffff] text-black'
      }`}
    >
      {/* Header */}
      <header
        className={`sticky top-0 z-10 flex flex-col border-b backdrop-blur-md transition-colors ${
          isDark ? 'bg-black/95 border-[#262626]' : 'bg-[#ffffff] border-[#dbdbdb]'
        }`}
      >
        <div className="w-full pt-[env(safe-area-inset-top,0px)]" />
        <div className="flex items-center justify-between px-4 h-[48px]">
          <div className="flex items-center gap-2">
            <Heart size={22} className="text-rose-500 fill-rose-500" />
            <h2 className="text-lg font-bold tracking-tight">Notifications</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Notifications"
            className="p-1.5 rounded-full hover:opacity-75 active:scale-95 transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* Notifications List or Empty State */}
      <div className="flex-1 flex flex-col p-3">
        {notifications.length > 0 ? (
          <div className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className="flex items-center justify-between py-3 px-1 gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-900/40 rounded-xl transition-colors"
              >
                {/* Actor Avatar & Text */}
                <div
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                  onClick={() => onOpenProfile?.(notif.actorUsername)}
                >
                  <div className="relative p-[1.5px] rounded-full bg-gradient-to-tr from-[#fba73f] via-[#dc2743] to-[#bc1888] shrink-0">
                    <img
                      src={notif.actorAvatar}
                      alt={notif.actorUsername}
                      className="w-11 h-11 rounded-full object-cover border-[1.5px] border-black"
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <p className="text-xs text-neutral-900 dark:text-neutral-100 leading-snug">
                      <span className="font-bold mr-1">@{notif.actorUsername}</span>
                      <span className="text-neutral-600 dark:text-neutral-400">{notif.message}</span>
                    </p>
                    <span className="text-[10px] text-neutral-400 mt-0.5">{notif.timestamp}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                {notif.type === 'follow_request' && notif.status === 'pending' ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleAcceptRequest(notif.id, notif.actorUsername)}
                      className="px-3 py-1.5 rounded-lg bg-[#0095f6] hover:bg-[#1877f2] text-white text-xs font-semibold active:scale-95 transition-all shadow-sm cursor-pointer"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRequest(notif.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold active:scale-95 transition-all cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleToggleFollowBack(notif.id, notif.actorUsername)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold active:scale-95 transition-all cursor-pointer shadow-sm shrink-0 ${
                      notif.isFollowingBack
                        ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                        : 'bg-[#0095f6] hover:bg-[#1877f2] text-white'
                    }`}
                  >
                    {notif.isFollowingBack ? 'Following' : 'Follow Back'}
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Clean Instagram Activity Zero-State Screen */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center my-auto min-h-[340px]">
            <div
              className={`h-16 w-16 rounded-full flex items-center justify-center mb-4 border ${
                isDark
                  ? 'bg-zinc-900 border-[#262626] text-rose-400'
                  : 'bg-zinc-50 border-[#efefef] text-rose-500'
              }`}
            >
              <Heart size={30} />
            </div>
            <h3 className="text-sm font-bold tracking-tight">
              Activity On Your Account
            </h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">
              When people follow you, like your posts, or send follow requests, you&apos;ll see them here in real-time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
