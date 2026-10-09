import { supabase } from './supabaseClient';
import { AuthUser } from './authStorage';
import { followUser, unfollowUser, checkIsUserFollowing } from './followersService';

export interface NotificationItem {
  id: string;
  userId?: string;
  type: 'follow' | 'follow_request' | 'like' | 'comment';
  actorId?: string;
  actorUsername: string;
  actorName: string;
  actorAvatar: string;
  message: string;
  timestamp: string;
  createdAt?: string;
  status?: 'pending' | 'accepted' | 'declined';
  isFollowingBack?: boolean;
  isRead?: boolean;
}

const LOCAL_NOTIFS_STORAGE_KEY = 'gedion_notifications_v2';

export function formatRelativeTime(dateInput?: string | number): string {
  if (!dateInput) return 'Just now';
  const time = typeof dateInput === 'number' ? dateInput : new Date(dateInput).getTime();
  if (isNaN(time)) return 'Just now';
  const diffSec = Math.floor((Date.now() - time) / 1000);
  if (diffSec < 45) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d`;
  return `${Math.floor(diffSec / 604800)}w`;
}

export const INITIAL_SEED_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'seed_notif_1',
    type: 'follow_request',
    actorUsername: 'sarah_jenkins',
    actorName: 'Sarah Jenkins',
    actorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    message: 'requested to follow you',
    timestamp: '2h',
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    status: 'pending',
    isFollowingBack: false,
    isRead: false,
  },
  {
    id: 'seed_notif_2',
    type: 'follow',
    actorUsername: 'alex_rivera',
    actorName: 'Alex Rivera',
    actorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    message: 'started following you',
    timestamp: '4h',
    createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    status: 'accepted',
    isFollowingBack: false,
    isRead: false,
  },
  {
    id: 'seed_notif_3',
    type: 'follow',
    actorUsername: 'maya_creative',
    actorName: 'Maya Chen',
    actorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    message: 'started following you',
    timestamp: '1d',
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    status: 'accepted',
    isFollowingBack: true,
    isRead: true,
  },
  {
    id: 'seed_notif_4',
    type: 'follow',
    actorUsername: 'david_k',
    actorName: 'David Kim',
    actorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    message: 'started following you',
    timestamp: '2d',
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    status: 'accepted',
    isFollowingBack: false,
    isRead: true,
  },
];

export function getCachedNotifications(): NotificationItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_NOTIFS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return INITIAL_SEED_NOTIFICATIONS;
}

export function setCachedNotifications(notifs: NotificationItem[]): void {
  try {
    localStorage.setItem(LOCAL_NOTIFS_STORAGE_KEY, JSON.stringify(notifs));
  } catch {}
}

/**
 * Fetch notifications from Supabase table for the specified user
 */
export async function fetchUserNotifications(
  userId?: string,
  username?: string
): Promise<NotificationItem[]> {
  const cleanUser = (username || '').toLowerCase().replace(/^@/, '');
  const cached = getCachedNotifications();

  try {
    let rows: any[] | null = null;

    // 1. Try querying with user_id or recipient filters
    if (userId || cleanUser) {
      try {
        const filterClauses: string[] = [];
        if (userId) {
          filterClauses.push(`user_id.eq.${userId}`);
          filterClauses.push(`recipient_id.eq.${userId}`);
        }
        if (cleanUser) {
          filterClauses.push(`recipient_username.ilike.${cleanUser}`);
        }

        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .or(filterClauses.join(','))
          .order('created_at', { ascending: false })
          .limit(50);

        if (!error && Array.isArray(data)) {
          rows = data;
        }
      } catch {
        rows = null;
      }
    }

    // 2. If filtered query didn't return rows, try general notifications query
    if (!rows || rows.length === 0) {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && Array.isArray(data)) {
        rows = data;
      }
    }

    if (Array.isArray(rows) && rows.length > 0) {
      const mapped: NotificationItem[] = await Promise.all(
        rows.map(async (row) => {
          const actorUser = (row.actor_username || row.sender_username || 'creator').replace(/^@/, '');
          const isFollBack = await checkIsUserFollowing(userId, cleanUser, row.actor_id, actorUser);

          return {
            id: String(row.id),
            userId: row.user_id || row.recipient_id,
            type: (row.type as any) || 'follow',
            actorId: row.actor_id || row.sender_id,
            actorUsername: actorUser,
            actorName: row.actor_name || row.sender_name || actorUser,
            actorAvatar:
              row.actor_avatar ||
              row.sender_avatar ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${actorUser}&backgroundColor=06b6d4,a855f7`,
            message:
              row.message ||
              (row.type === 'follow_request'
                ? 'requested to follow you'
                : 'started following you'),
            timestamp: formatRelativeTime(row.created_at),
            createdAt: row.created_at,
            status: (row.status as any) || (row.type === 'follow_request' ? 'pending' : 'accepted'),
            isFollowingBack: isFollBack,
            isRead: Boolean(row.is_read),
          };
        })
      );

      // Merge with any unique local items
      const remoteIds = new Set(mapped.map((n) => n.id));
      const merged = [...mapped, ...cached.filter((c) => !remoteIds.has(c.id))];
      setCachedNotifications(merged);
      return merged;
    }
  } catch (err) {
    console.warn('Notifications fetch notice:', err);
  }

  // Fallback to cached notifications with updated follow back status
  const checkedCached = await Promise.all(
    cached.map(async (item) => ({
      ...item,
      isFollowingBack: item.isFollowingBack ?? (await checkIsUserFollowing(userId, cleanUser, item.actorId, item.actorUsername)),
    }))
  );

  return checkedCached;
}

/**
 * Handle Accept / Confirm Follow Request
 */
export async function acceptFollowRequest(
  notifId: string,
  actorUsername: string,
  currentUser: AuthUser
): Promise<boolean> {
  const cleanActor = actorUsername.replace(/^@/, '');

  // 1. Update Supabase notification status to accepted
  try {
    await supabase
      .from('notifications')
      .update({ status: 'accepted', is_read: true })
      .eq('id', notifId);
  } catch (err) {
    console.warn('Supabase accept notification error:', err);
  }

  // 2. Add mutual follow record in followers table
  try {
    await followUser(
      { id: currentUser.id, username: currentUser.username },
      { id: `usr_${cleanActor}`, username: cleanActor }
    );
  } catch (err) {
    console.warn('Error creating mutual follow:', err);
  }

  return true;
}

/**
 * Handle Delete / Dismiss Follow Request
 */
export async function deleteNotification(notifId: string): Promise<boolean> {
  try {
    await supabase.from('notifications').delete().eq('id', notifId);
    return true;
  } catch (err) {
    console.warn('Delete notification error:', err);
    return false;
  }
}

/**
 * Mark all notifications as read in Supabase and locally
 */
export async function markAllNotificationsAsRead(
  userId?: string,
  username?: string
): Promise<void> {
  const cleanUser = (username || '').toLowerCase().replace(/^@/, '');

  try {
    if (userId) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .or(`user_id.eq.${userId},recipient_id.eq.${userId}`);
    } else if (cleanUser) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .ilike('recipient_username', cleanUser);
    }
  } catch (err) {
    console.warn('Mark all read notice:', err);
  }

  // Broadcast event to clear header red dot
  window.dispatchEvent(new CustomEvent('gedion-unread-activity', { detail: { count: 0 } }));
}

/**
 * Toggle follow back status for a user
 */
export async function toggleFollowBack(
  actorUsername: string,
  currentUser: AuthUser,
  currentlyFollowing: boolean
): Promise<boolean> {
  const cleanActor = actorUsername.replace(/^@/, '');

  if (currentlyFollowing) {
    await unfollowUser(
      { id: currentUser.id, username: currentUser.username },
      { id: `usr_${cleanActor}`, username: cleanActor }
    );
    return false;
  } else {
    await followUser(
      { id: currentUser.id, username: currentUser.username },
      { id: `usr_${cleanActor}`, username: cleanActor }
    );
    return true;
  }
}
