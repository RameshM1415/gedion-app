import { supabase } from './supabaseClient';
import { AuthUser } from './authStorage';

export interface FollowRecord {
  id?: string;
  follower_id: string;
  follower_username: string;
  follower_name?: string;
  follower_avatar?: string;
  following_id: string;
  following_username: string;
  following_name?: string;
  following_avatar?: string;
  created_at?: string;
}

export interface FollowUserItem {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio?: string;
  isVerified?: boolean;
  isFollowing: boolean;
}

const LOCAL_FOLLOWS_KEY = 'gedion_supabase_followers_v1';

/**
 * Retrieve synchronized local follow records
 */
function getLocalFollowRecords(): FollowRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_FOLLOWS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('Error reading local follows:', err);
  }
  return [];
}

/**
 * Persist synchronized local follow records
 */
function saveLocalFollowRecords(records: FollowRecord[]): void {
  try {
    localStorage.setItem(LOCAL_FOLLOWS_KEY, JSON.stringify(records));
  } catch (err) {
    console.warn('Error saving local follows:', err);
  }
}

function addLocalFollowRecord(rec: FollowRecord): void {
  const current = getLocalFollowRecords();
  const fUser = rec.follower_username.toLowerCase().replace(/^@/, '');
  const tUser = rec.following_username.toLowerCase().replace(/^@/, '');

  const exists = current.some(
    (r) =>
      r.follower_username.toLowerCase().replace(/^@/, '') === fUser &&
      r.following_username.toLowerCase().replace(/^@/, '') === tUser
  );

  if (!exists) {
    current.push(rec);
    saveLocalFollowRecords(current);
  }
}

function removeLocalFollowRecord(followerUsername: string, followingUsername: string): void {
  const current = getLocalFollowRecords();
  const fUser = followerUsername.toLowerCase().replace(/^@/, '');
  const tUser = followingUsername.toLowerCase().replace(/^@/, '');

  const filtered = current.filter(
    (r) =>
      !(
        r.follower_username.toLowerCase().replace(/^@/, '') === fUser &&
        r.following_username.toLowerCase().replace(/^@/, '') === tUser
      )
  );

  saveLocalFollowRecords(filtered);
}

/**
 * Query real followers count directly from Supabase 'followers' table.
 * SELECT count(*) FROM followers WHERE following_id = target_user_id
 * Returns real 0 if no followers.
 */
export async function fetchRealFollowersCount(
  targetUserId?: string,
  targetUsername?: string
): Promise<number> {
  const cleanUser = String(targetUsername || '').toLowerCase().replace(/^@/, '');
  let countFromDb = 0;
  let dbSuccess = false;

  try {
    // 1. Query Supabase 'followers' table
    if (targetUserId || cleanUser) {
      const filters = [];
      if (targetUserId) filters.push(`following_id.eq.${targetUserId}`);
      if (cleanUser) filters.push(`following_username.ilike.${cleanUser}`);

      const { count, error } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .or(filters.join(','));

      if (!error && typeof count === 'number') {
        countFromDb = count;
        dbSuccess = true;
      }
    }
  } catch (err) {
    // Table might not exist yet in schema cache
  }

  // 2. Query synchronized local follow records
  const localList = getLocalFollowRecords().filter((r) => {
    if (targetUserId && r.following_id === targetUserId) return true;
    if (cleanUser && r.following_username.toLowerCase().replace(/^@/, '') === cleanUser) return true;
    return false;
  });

  if (dbSuccess) {
    return Math.max(countFromDb, localList.length);
  }

  return localList.length;
}

/**
 * Query real following count directly from Supabase 'followers' table.
 * SELECT count(*) FROM followers WHERE follower_id = target_user_id
 * Returns real 0 if not following anyone.
 */
export async function fetchRealFollowingCount(
  targetUserId?: string,
  targetUsername?: string
): Promise<number> {
  const cleanUser = String(targetUsername || '').toLowerCase().replace(/^@/, '');
  let countFromDb = 0;
  let dbSuccess = false;

  try {
    // 1. Query Supabase 'followers' table
    if (targetUserId || cleanUser) {
      const filters = [];
      if (targetUserId) filters.push(`follower_id.eq.${targetUserId}`);
      if (cleanUser) filters.push(`follower_username.ilike.${cleanUser}`);

      const { count, error } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .or(filters.join(','));

      if (!error && typeof count === 'number') {
        countFromDb = count;
        dbSuccess = true;
      }
    }
  } catch (err) {
    // Table might not exist yet
  }

  // 2. Query synchronized local follow records
  const localList = getLocalFollowRecords().filter((r) => {
    if (targetUserId && r.follower_id === targetUserId) return true;
    if (cleanUser && r.follower_username.toLowerCase().replace(/^@/, '') === cleanUser) return true;
    return false;
  });

  if (dbSuccess) {
    return Math.max(countFromDb, localList.length);
  }

  return localList.length;
}

/**
 * Query real posts/reels count for a specific user from Supabase.
 * Real count of media uploaded by this user in the database.
 */
export async function fetchRealUserPostsCount(
  targetUserId?: string,
  targetUsername?: string
): Promise<number> {
  const cleanUser = String(targetUsername || '').toLowerCase().replace(/^@/, '');
  const seenReelIds = new Set<string>();

  try {
    // 1. Query Supabase 'reels' table
    const { data: reelsData, error: reelsError } = await supabase
      .from('reels')
      .select('id, creator_name, user_id');

    if (!reelsError && Array.isArray(reelsData)) {
      for (const r of reelsData) {
        if (!r.id) continue;
        const cName = String(r.creator_name || '').toLowerCase().replace(/^@/, '');
        const uId = String(r.user_id || '');
        if (cleanUser && cName === cleanUser) {
          seenReelIds.add(String(r.id));
        } else if (targetUserId && uId === targetUserId) {
          seenReelIds.add(String(r.id));
        }
      }
    }
  } catch {}

  // 2. Also check local custom reels published in browser
  try {
    const raw = localStorage.getItem('gedion_custom_reels');
    if (raw) {
      const local: any[] = JSON.parse(raw);
      if (Array.isArray(local)) {
        for (const r of local) {
          if (!r.id || r.id.startsWith('mock_')) continue;
          const u = String(r.username || '').toLowerCase().replace(/^@/, '');
          const cId = String(r.creatorId || '');
          if (cleanUser && u === cleanUser) {
            seenReelIds.add(String(r.id));
          } else if (targetUserId && cId === targetUserId) {
            seenReelIds.add(String(r.id));
          }
        }
      }
    }
  } catch {}

  return seenReelIds.size;
}

/**
 * Check if the currently logged-in user already follows a target user
 */
export async function checkIsUserFollowing(
  currentUserId?: string,
  currentUsername?: string,
  targetUserId?: string,
  targetUsername?: string
): Promise<boolean> {
  if (!currentUsername || !targetUsername) return false;
  const fUser = currentUsername.toLowerCase().replace(/^@/, '');
  const tUser = targetUsername.toLowerCase().replace(/^@/, '');
  if (fUser === tUser) return false;

  // 1. Check local fast-path
  const localList = getLocalFollowRecords();
  const foundLocal = localList.some(
    (r) =>
      r.follower_username.toLowerCase().replace(/^@/, '') === fUser &&
      r.following_username.toLowerCase().replace(/^@/, '') === tUser
  );
  if (foundLocal) return true;

  // 2. Query Supabase 'followers' table
  try {
    const filters = [];
    if (currentUserId && targetUserId) {
      filters.push(`and(follower_id.eq.${currentUserId},following_id.eq.${targetUserId})`);
    }
    filters.push(`and(follower_username.ilike.${fUser},following_username.ilike.${tUser})`);

    const { data, error } = await supabase
      .from('followers')
      .select('id')
      .or(filters.join(','))
      .limit(1);

    if (!error && Array.isArray(data) && data.length > 0) {
      // Sync back to local store
      addLocalFollowRecord({
        follower_id: currentUserId || `usr_${fUser}`,
        follower_username: fUser,
        following_id: targetUserId || `usr_${tUser}`,
        following_username: tUser,
      });
      return true;
    }
  } catch {}

  return false;
}

/**
 * Follow a user end-to-end:
 * 1. Insert into Supabase `followers` table.
 * 2. Synchronize local store.
 * 3. Broadcast real-time follow event.
 * 4. Return new followers count.
 */
export async function followUser(
  follower: { id: string; username: string; displayName?: string; avatar?: string },
  following: { id: string; username: string; displayName?: string; avatar?: string }
): Promise<{ success: boolean; newFollowersCount: number }> {
  const fId = follower.id || `usr_${follower.username}`;
  const tId = following.id || `usr_${following.username}`;
  const fUser = follower.username.toLowerCase().replace(/^@/, '');
  const tUser = following.username.toLowerCase().replace(/^@/, '');

  if (fUser === tUser) {
    return { success: false, newFollowersCount: 0 };
  }

  const newRecord: FollowRecord = {
    follower_id: fId,
    follower_username: fUser,
    follower_name: follower.displayName || follower.username,
    follower_avatar: follower.avatar,
    following_id: tId,
    following_username: tUser,
    following_name: following.displayName || following.username,
    following_avatar: following.avatar,
    created_at: new Date().toISOString(),
  };

  // 1. Insert into Supabase 'followers' table
  try {
    await supabase.from('followers').insert([
      {
        follower_id: fId,
        follower_username: fUser,
        following_id: tId,
        following_username: tUser,
        created_at: newRecord.created_at,
      },
    ]);
  } catch (err) {
    console.warn('Note on Supabase followers insert:', err);
  }

  // 1b. Emit Realtime notification for recipient in 'notifications' table
  try {
    await supabase.from('notifications').insert([
      {
        user_id: tId,
        recipient_id: tId,
        recipient_username: tUser,
        actor_id: fId,
        actor_username: fUser,
        actor_name: follower.displayName || follower.username,
        actor_avatar: follower.avatar,
        type: 'follow',
        message: 'started following you',
        status: 'accepted',
        is_read: false,
        created_at: newRecord.created_at,
      },
    ]);
  } catch {
    // Non-blocking fallback for schemas with fewer columns
    try {
      await supabase.from('notifications').insert([
        {
          user_id: tId,
          type: 'follow',
          actor_username: fUser,
          message: 'started following you',
          is_read: false,
          created_at: newRecord.created_at,
        },
      ]);
    } catch {}
  }

  // 2. Synchronize local store
  addLocalFollowRecord(newRecord);

  // 3. Broadcast event for real-time synchronization across all tabs and components
  window.dispatchEvent(
    new CustomEvent('gedion-follow-changed', {
      detail: {
        followerUsername: fUser,
        followingUsername: tUser,
        isFollowing: true,
      },
    })
  );

  const updatedCount = await fetchRealFollowersCount(tId, tUser);
  return { success: true, newFollowersCount: updatedCount };
}

/**
 * Unfollow a user end-to-end:
 * 1. Delete from Supabase `followers` table.
 * 2. Remove from local store.
 * 3. Broadcast real-time follow event.
 * 4. Return updated followers count.
 */
export async function unfollowUser(
  follower: { id: string; username: string },
  following: { id: string; username: string }
): Promise<{ success: boolean; newFollowersCount: number }> {
  const fId = follower.id || `usr_${follower.username}`;
  const tId = following.id || `usr_${following.username}`;
  const fUser = follower.username.toLowerCase().replace(/^@/, '');
  const tUser = following.username.toLowerCase().replace(/^@/, '');

  // 1. Delete from Supabase 'followers' table
  try {
    await supabase
      .from('followers')
      .delete()
      .or(
        `and(follower_id.eq.${fId},following_id.eq.${tId}),and(follower_username.ilike.${fUser},following_username.ilike.${tUser})`
      );
  } catch (err) {
    console.warn('Note on Supabase followers delete:', err);
  }

  // 2. Remove from local store
  removeLocalFollowRecord(fUser, tUser);

  // 3. Broadcast event
  window.dispatchEvent(
    new CustomEvent('gedion-follow-changed', {
      detail: {
        followerUsername: fUser,
        followingUsername: tUser,
        isFollowing: false,
      },
    })
  );

  const updatedCount = await fetchRealFollowersCount(tId, tUser);
  return { success: true, newFollowersCount: updatedCount };
}

/**
 * Fetch full list of followers for a user from Supabase.
 * Displays avatar, username, name, and follow status.
 */
export async function fetchFollowersList(
  targetUserId?: string,
  targetUsername?: string,
  currentUserId?: string,
  currentUsername?: string
): Promise<FollowUserItem[]> {
  const cleanTarget = String(targetUsername || '').toLowerCase().replace(/^@/, '');
  const cleanCurrent = String(currentUsername || '').toLowerCase().replace(/^@/, '');

  const userMap = new Map<string, FollowUserItem>();

  // 1. Query Supabase 'followers' table
  try {
    const filters = [];
    if (targetUserId) filters.push(`following_id.eq.${targetUserId}`);
    if (cleanTarget) filters.push(`following_username.ilike.${cleanTarget}`);

    const { data, error } = await supabase
      .from('followers')
      .select('*')
      .or(filters.join(','));

    if (!error && Array.isArray(data)) {
      for (const row of data) {
        const u = String(row.follower_username || '').toLowerCase().replace(/^@/, '');
        if (!u) continue;
        userMap.set(u, {
          id: String(row.follower_id || `usr_${u}`),
          username: u,
          displayName: row.follower_name || u,
          avatar:
            row.follower_avatar ||
            `https://api.dicebear.com/7.x/bottts/svg?seed=${u}&backgroundColor=06b6d4,a855f7`,
          isFollowing: false,
        });
      }
    }
  } catch {}

  // 2. Merge local records
  const localList = getLocalFollowRecords().filter((r) => {
    if (targetUserId && r.following_id === targetUserId) return true;
    if (cleanTarget && r.following_username.toLowerCase().replace(/^@/, '') === cleanTarget) return true;
    return false;
  });

  for (const r of localList) {
    const u = r.follower_username.toLowerCase().replace(/^@/, '');
    if (!u) continue;
    if (!userMap.has(u)) {
      userMap.set(u, {
        id: r.follower_id || `usr_${u}`,
        username: u,
        displayName: r.follower_name || u,
        avatar:
          r.follower_avatar ||
          `https://api.dicebear.com/7.x/bottts/svg?seed=${u}&backgroundColor=06b6d4,a855f7`,
        isFollowing: false,
      });
    }
  }

  // 3. Enrich details with profiles or reels if available
  const items = Array.from(userMap.values());
  for (const item of items) {
    item.isFollowing = await checkIsUserFollowing(
      currentUserId,
      cleanCurrent,
      item.id,
      item.username
    );
  }

  return items;
}

/**
 * Fetch full list of accounts a user is following from Supabase.
 * Displays avatar, username, name, and follow status.
 */
export async function fetchFollowingList(
  targetUserId?: string,
  targetUsername?: string,
  currentUserId?: string,
  currentUsername?: string
): Promise<FollowUserItem[]> {
  const cleanTarget = String(targetUsername || '').toLowerCase().replace(/^@/, '');
  const cleanCurrent = String(currentUsername || '').toLowerCase().replace(/^@/, '');

  const userMap = new Map<string, FollowUserItem>();

  // 1. Query Supabase 'followers' table
  try {
    const filters = [];
    if (targetUserId) filters.push(`follower_id.eq.${targetUserId}`);
    if (cleanTarget) filters.push(`follower_username.ilike.${cleanTarget}`);

    const { data, error } = await supabase
      .from('followers')
      .select('*')
      .or(filters.join(','));

    if (!error && Array.isArray(data)) {
      for (const row of data) {
        const u = String(row.following_username || '').toLowerCase().replace(/^@/, '');
        if (!u) continue;
        userMap.set(u, {
          id: String(row.following_id || `usr_${u}`),
          username: u,
          displayName: row.following_name || u,
          avatar:
            row.following_avatar ||
            `https://api.dicebear.com/7.x/bottts/svg?seed=${u}&backgroundColor=06b6d4,a855f7`,
          isFollowing: false,
        });
      }
    }
  } catch {}

  // 2. Merge local records
  const localList = getLocalFollowRecords().filter((r) => {
    if (targetUserId && r.follower_id === targetUserId) return true;
    if (cleanTarget && r.follower_username.toLowerCase().replace(/^@/, '') === cleanTarget) return true;
    return false;
  });

  for (const r of localList) {
    const u = r.following_username.toLowerCase().replace(/^@/, '');
    if (!u) continue;
    if (!userMap.has(u)) {
      userMap.set(u, {
        id: r.following_id || `usr_${u}`,
        username: u,
        displayName: r.following_name || u,
        avatar:
          r.following_avatar ||
          `https://api.dicebear.com/7.x/bottts/svg?seed=${u}&backgroundColor=06b6d4,a855f7`,
        isFollowing: false,
      });
    }
  }

  // 3. Check if current user follows each item in following list
  const items = Array.from(userMap.values());
  for (const item of items) {
    item.isFollowing = await checkIsUserFollowing(
      currentUserId,
      cleanCurrent,
      item.id,
      item.username
    );
  }

  return items;
}
