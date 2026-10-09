import { createClient } from '@supabase/supabase-js';
import { Reel, CommentItem, StoryItem } from '../types';

export const SUPABASE_URL = "https://aifktpstbquzfloleleb.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpZmt0cHN0YnF1emZsb2xlbGViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzA0NTksImV4cCI6MjA5NzIwNjQ1OX0.DVlA_himyLQRi1piTDjQYRnhAo766AsG7MVTP0txQyc";
export const STORAGE_BUCKET = 'reels';

export const CLOUDINARY_CLOUD_NAME = 'ulcqbucx';
export const CLOUDINARY_UPLOAD_PRESET = 'gedion_preset';
export const CLOUDINARY_UPLOAD_ENDPOINT = 'https://api.cloudinary.com/v1_1/ulcqbucx/video/upload';

export const LIKED_REELS_STORAGE_KEY = 'gedion_liked_reels_v1';

export function getStoredLikedReelIds(): string[] {
  try {
    const raw = localStorage.getItem(LIKED_REELS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String);
    }
  } catch {
    // ignore
  }
  return [];
}

export function setStoredReelLiked(reelId: string, isLiked: boolean): void {
  try {
    const current = new Set(getStoredLikedReelIds());
    if (isLiked) {
      current.add(String(reelId));
    } else {
      current.delete(String(reelId));
    }
    localStorage.setItem(LIKED_REELS_STORAGE_KEY, JSON.stringify(Array.from(current)));
  } catch {
    // ignore
  }
}

export function optimizeCloudinaryVideoUrl(url: string): string {
  if (!url) return url;
  if (url.includes('/video/upload/') && !url.includes('/video/upload/q_auto,f_auto,w_720,c_limit/')) {
    return url.replace('/video/upload/', '/video/upload/q_auto,f_auto,w_720,c_limit/');
  }
  return url;
}

/**
 * Direct Unsigned Upload to Cloudinary Video API.
 * CRITICAL: FormData contains ONLY "file" and "upload_preset" ("gedion_preset").
 * Never append 'api_key', 'timestamp', or 'signature' so unsigned upload succeeds without "Unknown API key".
 */
export function uploadVideoToCloudinaryUnsigned(
  selectedVideoFile: File | Blob,
  onProgress?: (percentComplete: number) => void,
  xhrRef?: { current: XMLHttpRequest | null }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', selectedVideoFile);
    formData.append('upload_preset', 'gedion_preset');

    const xhr = new XMLHttpRequest();
    if (xhrRef) {
      xhrRef.current = xhr;
    }

    xhr.open('POST', 'https://api.cloudinary.com/v1_1/ukcqbuxcx/video/upload', true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        onProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      if (xhrRef) {
        xhrRef.current = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response && response.secure_url) {
            const transformedUrl = optimizeCloudinaryVideoUrl(
              String(response.secure_url).replace(
                '/video/upload/',
                '/video/upload/q_auto,f_auto,w_720,c_limit/'
              )
            );
            resolve(transformedUrl);
          } else {
            reject(new Error('Cloudinary response did not contain a valid secure_url.'));
          }
        } catch {
          reject(new Error('Invalid response received from Cloudinary CDN.'));
        }
      } else {
        let errMsg = `Cloudinary upload failed (HTTP ${xhr.status}).`;
        try {
          const errJson = JSON.parse(xhr.responseText);
          if (errJson?.error?.message) {
            errMsg = `Cloudinary Error: ${errJson.error.message}`;
          }
        } catch {
          // ignore JSON parse error
        }
        reject(new Error(errMsg));
      }
    };

    xhr.onerror = () => {
      if (xhrRef) {
        xhrRef.current = null;
      }
      reject(
        new Error(
          'Network connection failed while uploading to Cloudinary CDN. Please check your internet connection and try again.'
        )
      );
    };

    xhr.ontimeout = () => {
      if (xhrRef) {
        xhrRef.current = null;
      }
      reject(new Error('Video upload timed out. Please try a smaller or shorter clip.'));
    };

    xhr.send(formData);
  });
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Direct Upload to Supabase Storage ('reels' or 'posts' bucket).
 * Uploads media file and returns the public accessible URL.
 */
export async function uploadMediaToSupabaseStorage(
  file: File | Blob,
  bucket: string = 'reels',
  onProgress?: (percent: number) => void
): Promise<string> {
  const mime = file.type || '';
  let ext = 'jpg';
  if (mime.includes('video/mp4')) ext = 'mp4';
  else if (mime.includes('video/webm')) ext = 'webm';
  else if (mime.includes('video/quicktime')) ext = 'mov';
  else if (mime.includes('image/png')) ext = 'png';
  else if (mime.includes('image/webp')) ext = 'webp';
  else if (mime.includes('image/jpeg')) ext = 'jpg';
  else if (mime.includes('image/gif')) ext = 'gif';
  else if ('name' in file && typeof (file as File).name === 'string') {
    const parts = (file as File).name.split('.');
    if (parts.length > 1) ext = parts.pop() || ext;
  }

  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
  const filePath = `public/${fileName}`;

  onProgress?.(30);

  // Attempt upload to target bucket (e.g. 'reels' or 'posts')
  let { data, error } = await supabase.storage.from(bucket).upload(filePath, file, {
    contentType: mime || undefined,
    upsert: true,
  });

  // If primary bucket failed and wasn't 'reels', fallback to 'reels' bucket
  if (error && bucket !== 'reels') {
    const retry = await supabase.storage.from('reels').upload(filePath, file, {
      contentType: mime || undefined,
      upsert: true,
    });
    data = retry.data;
    error = retry.error;
    bucket = 'reels';
  }

  if (error || !data) {
    throw new Error(error?.message || 'Failed to upload media to Supabase Storage');
  }

  onProgress?.(85);

  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  if (!publicUrlData || !publicUrlData.publicUrl) {
    throw new Error('Failed to retrieve public URL from Supabase Storage');
  }

  onProgress?.(100);
  return publicUrlData.publicUrl;
}

export interface SupabaseReelRow {
  id: string | number;
  user_id?: string | null;
  video_url: string;
  caption?: string | null;
  tags?: string[] | string | null;
  creator_name?: string | null;
  creator_avatar?: string | null;
  likes_count?: number | null;
  views_count?: number | string | null;
  created_at?: string | null;
}

export function mapSupabaseRowToReel(row: SupabaseReelRow): Reel {
  let parsedTags: string[] = [];
  if (Array.isArray(row.tags)) {
    parsedTags = row.tags;
  } else if (typeof row.tags === 'string') {
    try {
      if (row.tags.startsWith('[') || row.tags.startsWith('{')) {
        parsedTags = JSON.parse(row.tags);
      } else {
        parsedTags = row.tags.split(',').map((t) => t.trim()).filter(Boolean);
      }
    } catch {
      parsedTags = row.tags.split(' ').filter((t) => t.startsWith('#'));
    }
  } else if (typeof row.caption === 'string') {
    const matched = row.caption.match(/#[a-zA-Z0-9_]+/g);
    if (matched && matched.length > 0) {
      parsedTags = matched;
    }
  }

  const idStr = String(row.id);
  const creatorName =
    row.creator_name ||
    (row.user_id ? `creator_${String(row.user_id).slice(0, 6)}` : 'creator');
  const username = creatorName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const rawVideoUrl = row.video_url || (row as any).videoUrl || '';
  const videoUrl = optimizeCloudinaryVideoUrl(rawVideoUrl);

  const likedIds = getStoredLikedReelIds();
  const isStoredLiked = likedIds.includes(idStr);

  const mappedReel: Reel = {
    id: idStr,
    creatorId: row.user_id || undefined,
    username: username || 'creator',
    displayName: creatorName,
    avatar:
      row.creator_avatar ||
      `https://api.dicebear.com/7.x/bottts/svg?seed=${username}&backgroundColor=06b6d4,a855f7`,
    isVerified: false,
    isFollowing: false,
    videoUrl: videoUrl,
    fallbackGradient: 'from-black via-[#0a0a0a] to-black',
    poster: '',
    caption: row.caption || '',
    tags: parsedTags,
    audioTitle: 'Original Audio',
    audioArtist: creatorName,
    likesCount: typeof row.likes_count === 'number' ? row.likes_count : 0,
    isLiked: isStoredLiked,
    commentsCount: 0,
    isBookmarked: false,
    sharesCount: 0,
    viewsCount:
      row.views_count !== undefined && row.views_count !== null
        ? String(row.views_count)
        : '0',
    themeAccent: '#06b6d4',
    mediaType: 'video',
    comments: [],
  };

  (mappedReel as any).video_url = videoUrl;
  return mappedReel;
}

/**
 * Fetch ONLY real posts/reels directly from Supabase ordered by created_at DESC
 */
export async function fetchSupabaseReels(): Promise<Reel[]> {
  try {
    let allRows: any[] = [];

    // 1. Try 'reels' table (confirmed active in Supabase)
    const reelsRes = await supabase
      .from('reels')
      .select('*')
      .order('created_at', { ascending: false });

    if (!reelsRes.error && Array.isArray(reelsRes.data)) {
      allRows = [...allRows, ...reelsRes.data];
    }

    // 2. Also try 'posts' table (if present)
    const postsRes = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (!postsRes.error && Array.isArray(postsRes.data)) {
      allRows = [...allRows, ...postsRes.data];
    }

    // Dedup by id or video_url
    const seen = new Set<string>();
    const uniqueRows: any[] = [];
    for (const row of allRows) {
      const key = String(row.id || row.video_url || '');
      if (key && !seen.has(key)) {
        seen.add(key);
        uniqueRows.push(row);
      }
    }

    return uniqueRows
      .filter((row: any) => Boolean(row && (row.video_url || row.videoUrl)))
      .map((row: SupabaseReelRow) => mapSupabaseRowToReel(row));
  } catch (err) {
    console.warn('Fetch Supabase reels exception:', err);
    return [];
  }
}

/**
 * Query Supabase for posts/reels uploaded by the specified user.
 * Queries 'posts' table and 'reels' table (with error resilience and deduplication).
 * Filters strictly by user_id or matching username / author handle.
 */
export async function fetchUserPostsFromSupabase(
  userId?: string,
  username?: string,
  displayName?: string
): Promise<Reel[]> {
  try {
    let allRows: any[] = [];

    // 1. Query 'posts' table
    try {
      const postsRes = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!postsRes.error && Array.isArray(postsRes.data)) {
        allRows = [...allRows, ...postsRes.data];
      }
    } catch (e) {
      console.warn('Posts table query note:', e);
    }

    // 2. Query 'reels' table
    try {
      const reelsRes = await supabase
        .from('reels')
        .select('*')
        .order('created_at', { ascending: false });

      if (!reelsRes.error && Array.isArray(reelsRes.data)) {
        allRows = [...allRows, ...reelsRes.data];
      }
    } catch (e) {
      console.warn('Reels table query note:', e);
    }

    // Dedup by id or video_url
    const seen = new Set<string>();
    const uniqueRows: any[] = [];
    for (const row of allRows) {
      const key = String(row.id || row.video_url || '');
      if (key && !seen.has(key)) {
        seen.add(key);
        uniqueRows.push(row);
      }
    }

    const cleanUser = String(username || '').toLowerCase().replace(/^@/, '');
    const cleanName = String(displayName || '').toLowerCase().replace(/^@/, '');
    const targetUserId = String(userId || '');
    const isRamesh = cleanUser === 'rameshrao034' || targetUserId.includes('rameshrao034');

    const mapped = uniqueRows
      .filter((row: any) => Boolean(row && (row.video_url || row.videoUrl)))
      .map((row: SupabaseReelRow) => mapSupabaseRowToReel(row));

    const filtered = mapped.filter((r) => {
      // 1. Match by user_id or creatorId
      if (targetUserId && r.creatorId && String(r.creatorId) === targetUserId) {
        return true;
      }
      // 2. Match by username
      const rUsername = r.username.toLowerCase().replace(/^@/, '');
      if (cleanUser && rUsername === cleanUser) {
        return true;
      }
      // 3. Match by displayName
      const rDisplayName = r.displayName.toLowerCase().replace(/^@/, '');
      if (cleanName && rDisplayName === cleanName) {
        return true;
      }
      // 4. Special match for primary creator handle if user is Ramesh Rao
      if (isRamesh && (rUsername === 'rameshrao034' || rDisplayName === 'rameshrao034')) {
        return true;
      }
      return false;
    });

    return filtered;
  } catch (err) {
    console.warn('Error fetching user posts from Supabase:', err);
    return [];
  }
}

export function formatTimeAgo(isoString?: string | null): string {
  if (!isoString) return 'Just now';
  try {
    const past = new Date(isoString).getTime();
    const now = Date.now();
    const diffSec = Math.floor((now - past) / 1000);
    if (diffSec < 45) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  } catch {
    return 'Just now';
  }
}

/**
 * Update like count for a post in Supabase 'posts' table in the background without freezing UI
 */
export async function updateReelLikesInSupabase(
  reelId: string,
  newCount: number,
  isLiked?: boolean
): Promise<void> {
  if (typeof isLiked === 'boolean') {
    setStoredReelLiked(reelId, isLiked);
  }
  try {
    const safeCount = Math.max(0, newCount);
    const { error } = await supabase
      .from('posts')
      .update({ likes_count: safeCount })
      .eq('id', reelId);
    if (error) {
      console.warn('Error updating likes in Supabase posts:', error.message);
    }
    supabase
      .from('reels')
      .update({ likes_count: safeCount })
      .eq('id', reelId)
      .then(() => {}, () => {});
  } catch (err) {
    console.warn('Exception updating likes in Supabase posts:', err);
  }
}

/**
 * Fetch comments for a specific post from Supabase `comments` table
 */
export async function fetchSupabaseComments(reelId: string): Promise<CommentItem[]> {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('reel_id', reelId)
      .order('created_at', { ascending: false });

    if (error || !data || !Array.isArray(data)) {
      return [];
    }

    return data.map((row: any) => ({
      id: String(row.id),
      username: row.user_name || 'user',
      avatar:
        row.user_avatar ||
        `https://api.dicebear.com/7.x/bottts/svg?seed=${row.user_name || 'user'}&backgroundColor=06b6d4,a855f7`,
      text: row.comment_text || '',
      timestamp: formatTimeAgo(row.created_at),
      likes: 0,
      isLiked: false,
    }));
  } catch (err) {
    console.warn('Exception fetching comments from Supabase:', err);
    return [];
  }
}

/**
 * Insert a comment into Supabase `comments` table
 */
export async function insertSupabaseComment(
  reelId: string,
  commentText: string,
  userName = 'user',
  userAvatar = 'https://api.dicebear.com/7.x/bottts/svg?seed=user&backgroundColor=06b6d4,a855f7'
): Promise<CommentItem> {
  const commentId = `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const nowIso = new Date().toISOString();

  try {
    const { data, error } = await supabase
      .from('comments')
      .insert([
        {
          id: commentId,
          reel_id: reelId,
          user_name: userName,
          user_avatar: userAvatar,
          comment_text: commentText,
          created_at: nowIso,
        },
      ])
      .select();

    if (error) {
      console.warn('Error inserting comment to Supabase:', error.message);
    }

    return {
      id: (data && data[0]?.id) || commentId,
      username: userName,
      avatar: userAvatar,
      text: commentText,
      timestamp: 'Just now',
      likes: 0,
      isLiked: false,
    };
  } catch (err) {
    console.warn('Exception inserting comment to Supabase:', err);
    return {
      id: commentId,
      username: userName,
      avatar: userAvatar,
      text: commentText,
      timestamp: 'Just now',
      likes: 0,
      isLiked: false,
    };
  }
}

export interface UserProfileData {
  name: string;
  username: string;
  bio: string;
  link: string;
  gender: 'Male' | 'Female' | 'Custom' | 'Prefer not to say';
  avatar: string;
}

/**
 * Upload profile avatar image directly to Supabase Storage.
 * Attempts 'avatars' or 'profiles' bucket with seamless fallback to 'reels'.
 * Returns public accessible URL.
 */
export async function uploadProfileAvatarToSupabase(
  file: File | Blob,
  userId?: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  const mime = file.type || 'image/jpeg';
  let ext = 'jpg';
  if (mime.includes('png')) ext = 'png';
  else if (mime.includes('webp')) ext = 'webp';
  else if (mime.includes('gif')) ext = 'gif';
  else if ('name' in file && typeof (file as File).name === 'string') {
    const parts = (file as File).name.split('.');
    if (parts.length > 1) ext = parts.pop() || ext;
  }

  const safeUserId = (userId || 'user').replace(/[^a-zA-Z0-9_-]/g, '');
  const fileName = `avatar_${safeUserId}_${Date.now()}.${ext}`;
  const filePath = `avatars/${fileName}`;

  onProgress?.(25);

  // Attempt upload to 'avatars' bucket, fallback to 'profiles', then 'reels'
  const candidateBuckets = ['avatars', 'profiles', 'reels'];
  let successfulBucket = '';
  let uploadedPath = '';
  let lastError: any = null;

  for (const b of candidateBuckets) {
    try {
      const { data, error } = await supabase.storage.from(b).upload(`public/${filePath}`, file, {
        contentType: mime,
        upsert: true,
      });
      if (!error && data) {
        successfulBucket = b;
        uploadedPath = data.path;
        break;
      } else {
        lastError = error;
      }
    } catch (e) {
      lastError = e;
    }
  }

  if (!successfulBucket || !uploadedPath) {
    throw new Error(lastError?.message || 'Failed to upload avatar to Supabase Storage');
  }

  onProgress?.(85);

  const { data: publicUrlData } = supabase.storage.from(successfulBucket).getPublicUrl(uploadedPath);
  if (!publicUrlData || !publicUrlData.publicUrl) {
    throw new Error('Failed to retrieve avatar public URL from Supabase Storage');
  }

  onProgress?.(100);
  return publicUrlData.publicUrl;
}

/**
 * Direct Database Mutation (UPDATE `profiles` table in Supabase).
 * Includes: full_name, username, bio, website, and avatar_url.
 * Sanitizes username and gracefully handles duplicate username errors or schema variations.
 */
export async function updateSupabaseProfileRecord(
  userId: string | undefined,
  payload: {
    name: string;
    username: string;
    bio: string;
    website?: string;
    avatarUrl: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const targetId = userId || 'default_user';
    const cleanedUsername = payload.username
      .replace(/^@+/, '')
      .replace(/\s+/g, '')
      .toLowerCase()
      .trim() || 'creator';

    const cleanedName = payload.name.trim() || 'Creator';
    const cleanedBio = payload.bio.trim();
    const cleanedWebsite = (payload.website || '').trim();
    const avatarUrl = payload.avatarUrl;
    const nowIso = new Date().toISOString();

    // 1. Attempt explicit update with all requested fields
    const fullPayload: Record<string, any> = {
      full_name: cleanedName,
      username: cleanedUsername,
      bio: cleanedBio,
      website: cleanedWebsite,
      avatar_url: avatarUrl,
      updated_at: nowIso,
    };

    let { data, error } = await supabase
      .from('profiles')
      .update(fullPayload)
      .eq('id', targetId)
      .select();

    // Handle unique username constraint violation
    if (error && (error.code === '23505' || /duplicate|unique/i.test(error.message))) {
      return {
        success: false,
        error: `Username @${cleanedUsername} is already taken. Please choose another username.`,
      };
    }

    // If columns like full_name or website don't exist in postgres schema cache, retry with active core columns
    if (error && /column.*does not exist/i.test(error.message)) {
      const corePayload: Record<string, any> = {
        username: cleanedUsername,
        handle: `@${cleanedUsername}`,
        bio: cleanedBio,
        avatar_url: avatarUrl,
        updated_at: nowIso,
      };

      const retry = await supabase
        .from('profiles')
        .update(corePayload)
        .eq('id', targetId)
        .select();

      data = retry.data;
      error = retry.error;
    }

    // If 0 rows were updated by targetId, fallback to updating by username or default_user
    if (!error && (!data || data.length === 0)) {
      const fallbackPayload: Record<string, any> = {
        username: cleanedUsername,
        handle: `@${cleanedUsername}`,
        bio: cleanedBio,
        avatar_url: avatarUrl,
        updated_at: nowIso,
      };

      const fallbackUpdate = await supabase
        .from('profiles')
        .update(fallbackPayload)
        .or(`id.eq.default_user,username.eq.${cleanedUsername}`)
        .select();

      data = fallbackUpdate.data;
      error = fallbackUpdate.error;
    }

    if (error) {
      console.warn('Note on Supabase profiles update:', error.message);
      return { success: false, error: error.message };
    }

    // 2. Synchronize auth.users metadata if session user is active
    try {
      await supabase.auth.updateUser({
        data: {
          full_name: cleanedName,
          name: cleanedName,
          username: cleanedUsername,
          avatar_url: avatarUrl,
          picture: avatarUrl,
          website: cleanedWebsite,
        },
      });
    } catch (authErr) {
      console.warn('Note on Supabase auth metadata update:', authErr);
    }

    // 3. Update existing posts/reels authored by this user in background so changes reflect globally
    try {
      if (userId) {
        supabase
          .from('posts')
          .update({
            creator_name: cleanedName,
            creator_avatar: avatarUrl,
            username: cleanedUsername,
          })
          .eq('user_id', userId)
          .then(
            () => {},
            () => {}
          );
      }
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.warn('Exception updating profile in Supabase:', err);
    return { success: false, error: err?.message || 'Failed to update profile' };
  }
}

/**
 * Sync and persist user profile changes with Supabase `profiles` table
 */
export async function syncProfileToSupabase(
  profile: UserProfileData,
  userId?: string
): Promise<boolean> {
  const result = await updateSupabaseProfileRecord(userId, {
    name: profile.name,
    username: profile.username,
    bio: profile.bio,
    website: profile.link,
    avatarUrl: profile.avatar,
  });
  return result.success;
}

/**
 * Fetch the freshest profile record directly from the `profiles` table by current session ID or username.
 * Guaranteed never to revert back to hardcoded strings on page refresh.
 */
export async function fetchFreshestSupabaseProfile(
  userId?: string,
  username?: string
): Promise<Partial<UserProfileData> | null> {
  try {
    let row: any = null;

    // 1. Prioritize querying by authenticated session user ID
    if (userId) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (data) row = data;
    }

    // 2. Fallback query by username
    if (!row && username) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle();
      if (data) row = data;
    }

    // 3. Fallback query for default_user row
    if (!row) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', 'default_user')
        .maybeSingle();
      if (data) row = data;
    }

    if (!row) return null;

    const rawHandle = row.handle ? String(row.handle).replace(/^@+/, '') : '';
    const cleanUsername = rawHandle || row.username || username || 'creator';

    return {
      name: row.full_name || row.name || row.username || 'Creator',
      username: cleanUsername,
      bio: row.bio || '',
      link: row.website || row.link || '',
      avatar: row.avatar_url || row.avatar || '',
    };
  } catch (err) {
    console.warn('Exception fetching freshest profile:', err);
    return null;
  }
}

/**
 * Fetch profile data from Supabase `profiles` table
 */
export async function fetchSupabaseProfile(
  username: string
): Promise<Partial<UserProfileData> | null> {
  return fetchFreshestSupabaseProfile(undefined, username);
}

/**
 * Fetch real follower, following, and total likes counts from Supabase (defaults to real 0)
 * Query followers table:
 * Followers Count: SELECT count(*) FROM followers WHERE following_id = target_user_id
 * Following Count: SELECT count(*) FROM followers WHERE follower_id = target_user_id
 */
export async function fetchUserMetricsFromSupabase(
  userId?: string,
  username?: string
): Promise<{
  followersCount: number;
  followingCount: number;
  totalLikesCount: number;
}> {
  let followersCount = 0;
  let followingCount = 0;
  let totalLikesCount = 0;

  try {
    const cleanUser = String(username || '').toLowerCase().replace(/^@/, '');

    // 1. Query Supabase 'followers' table
    const followerFilters: string[] = [];
    if (userId) followerFilters.push(`following_id.eq.${userId}`);
    if (cleanUser) followerFilters.push(`following_username.ilike.${cleanUser}`);

    const followingFilters: string[] = [];
    if (userId) followingFilters.push(`follower_id.eq.${userId}`);
    if (cleanUser) followingFilters.push(`follower_username.ilike.${cleanUser}`);

    const [followersRes, followingRes, reelsRes] = await Promise.all([
      followerFilters.length > 0
        ? supabase.from('followers').select('*', { count: 'exact', head: true }).or(followerFilters.join(','))
        : Promise.resolve({ count: 0, error: null }),
      followingFilters.length > 0
        ? supabase.from('followers').select('*', { count: 'exact', head: true }).or(followingFilters.join(','))
        : Promise.resolve({ count: 0, error: null }),
      supabase.from('reels').select('*'),
    ]);

    if (!followersRes.error && typeof (followersRes as any)?.count === 'number') {
      followersCount = (followersRes as any).count;
    } else {
      // Check local synchronized follow store
      try {
        const raw = localStorage.getItem('gedion_supabase_followers_v1');
        if (raw) {
          const list: any[] = JSON.parse(raw);
          followersCount = list.filter((r) => {
            if (userId && r.following_id === userId) return true;
            if (cleanUser && String(r.following_username || '').toLowerCase() === cleanUser) return true;
            return false;
          }).length;
        }
      } catch {}
    }

    if (!followingRes.error && typeof (followingRes as any)?.count === 'number') {
      followingCount = (followingRes as any).count;
    } else {
      // Check local synchronized follow store
      try {
        const raw = localStorage.getItem('gedion_supabase_followers_v1');
        if (raw) {
          const list: any[] = JSON.parse(raw);
          followingCount = list.filter((r) => {
            if (userId && r.follower_id === userId) return true;
            if (cleanUser && String(r.follower_username || '').toLowerCase() === cleanUser) return true;
            return false;
          }).length;
        }
      } catch {}
    }

    const allRows: any[] = [];
    if (!reelsRes.error && Array.isArray(reelsRes.data)) {
      allRows.push(...reelsRes.data);
    }

    // Match rows uploaded by this user to compute total likes
    const matchedLikes = allRows
      .filter((row: any) => {
        if (userId && (row.user_id === userId || row.creatorId === userId)) return true;
        const cName = String(row.creator_name || '').toLowerCase().replace(/^@/, '');
        if (cleanUser && (cName === cleanUser || (cleanUser === 'rameshrao034' && cName === 'creator'))) return true;
        return false;
      })
      .reduce((sum, r: any) => sum + (Number(r.likes_count) || 0), 0);

    totalLikesCount = matchedLikes;
  } catch {
    // Return real 0 if table empty or not accessible
  }

  return { followersCount, followingCount, totalLikesCount };
}

/**
 * Checks whether a reel belongs to the currently logged in user/session.
 * Checks user ID, creatorId, username, and author handle.
 */
export function isReelOwnedByUser(reel: Reel, user: any): boolean {
  if (!reel || !user) return false;

  const targetUserId = String(user.id || '');
  const cleanUser = String(user.username || '').toLowerCase().replace(/^@/, '');
  const cleanName = String(user.displayName || user.name || '').toLowerCase().replace(/^@/, '');
  const isRamesh = cleanUser === 'rameshrao034' || targetUserId.includes('rameshrao034');

  // Match by user_id or creatorId
  if (targetUserId) {
    if (reel.creatorId && String(reel.creatorId) === targetUserId) return true;
    if (reel.userId && String(reel.userId) === targetUserId) return true;
  }

  // Match by username
  const rUsername = String(reel.username || '').toLowerCase().replace(/^@/, '');
  if (cleanUser && rUsername === cleanUser) return true;

  // Match by displayName
  const rDisplayName = String(reel.displayName || '').toLowerCase().replace(/^@/, '');
  if (cleanName && (rDisplayName === cleanName || rUsername === cleanName)) return true;

  // Primary creator handle default fallback
  if (isRamesh && (rUsername === 'rameshrao034' || rDisplayName === 'rameshrao034' || rDisplayName === 'ramesh rao')) {
    return true;
  }

  return false;
}

/**
 * Delete a reel permanently from Supabase 'posts' table and 'reels' table.
 */
export async function deleteReelFromSupabase(reelId: string): Promise<boolean> {
  if (!reelId) return false;
  let deleted = false;
  const numId = Number(reelId);

  // 1. Delete from 'posts' table
  try {
    const { error: postErr } = await supabase
      .from('posts')
      .delete()
      .eq('id', reelId);
    if (!postErr) deleted = true;
    if (!isNaN(numId)) {
      await supabase.from('posts').delete().eq('id', numId);
    }
  } catch (err) {
    console.warn('Supabase posts delete note:', err);
  }

  // 2. Delete from 'reels' table
  try {
    const { error: reelErr } = await supabase
      .from('reels')
      .delete()
      .eq('id', reelId);
    if (!reelErr) deleted = true;
    if (!isNaN(numId)) {
      await supabase.from('reels').delete().eq('id', numId);
    }
  } catch (err) {
    console.warn('Supabase reels delete note:', err);
  }

  // 3. Also remove from local custom reels in browser storage
  try {
    const raw = localStorage.getItem('gedion_custom_reels');
    if (raw) {
      const parsed: Reel[] = JSON.parse(raw);
      const filtered = parsed.filter((r) => r.id !== reelId);
      localStorage.setItem('gedion_custom_reels', JSON.stringify(filtered));
    }
  } catch (err) {
    console.warn('Local storage delete note:', err);
  }

  return deleted;
}

/**
 * Update reel metadata (caption, title, tags) in Supabase 'posts' and 'reels' tables,
 * and sync local browser storage.
 */
export async function updateReelDetailsInSupabase(
  reelId: string,
  updates: { caption: string; title?: string; tags?: string[] }
): Promise<boolean> {
  if (!reelId) return false;
  let success = false;
  const numId = Number(reelId);

  // Extract hashtags from caption if not explicitly provided
  const tags =
    updates.tags && updates.tags.length > 0
      ? updates.tags
      : updates.caption.match(/#[a-zA-Z0-9_]+/g) || [];

  // 1. Update in 'posts' table
  try {
    const { error: postErr } = await supabase
      .from('posts')
      .update({
        caption: updates.caption,
        title: updates.title || updates.caption,
        tags: tags,
      })
      .eq('id', reelId);
    if (!postErr) success = true;

    if (!isNaN(numId)) {
      await supabase
        .from('posts')
        .update({
          caption: updates.caption,
          title: updates.title || updates.caption,
          tags: tags,
        })
        .eq('id', numId);
    }
  } catch (err) {
    console.warn('Note updating Supabase posts:', err);
  }

  // 2. Update in 'reels' table
  try {
    const { error: reelErr } = await supabase
      .from('reels')
      .update({
        caption: updates.caption,
        title: updates.title || updates.caption,
        tags: tags,
      })
      .eq('id', reelId);
    if (!reelErr) success = true;

    if (!isNaN(numId)) {
      await supabase
        .from('reels')
        .update({
          caption: updates.caption,
          title: updates.title || updates.caption,
          tags: tags,
        })
        .eq('id', numId);
    }
  } catch (err) {
    console.warn('Note updating Supabase reels:', err);
  }

  // 3. Update in local storage
  try {
    const raw = localStorage.getItem('gedion_custom_reels');
    if (raw) {
      const parsed: Reel[] = JSON.parse(raw);
      const updated = parsed.map((r) =>
        r.id === reelId
          ? {
              ...r,
              caption: updates.caption,
              tags: tags,
            }
          : r
      );
      localStorage.setItem('gedion_custom_reels', JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('Note updating local custom reels:', err);
  }

  return success;
}

export interface SearchedUser {
  id: string;
  username: string;
  name: string;
  avatar: string;
  bio?: string;
  isFollowing?: boolean;
  isVerified?: boolean;
}

/**
 * Search users in real-time from Supabase profiles and posts creators
 */
export async function searchSupabaseUsers(query: string): Promise<SearchedUser[]> {
  const clean = query.trim().replace(/^@/, '');
  if (!clean) return [];

  try {
    const results: SearchedUser[] = [];
    const seen = new Set<string>();

    // 1. Query Supabase 'profiles' table filtering by username and full_name (ilike search)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${clean}%,full_name.ilike.%${clean}%`)
        .limit(25);

      if (!error && Array.isArray(data)) {
        for (const row of data) {
          const uName = row.username || (row.handle ? String(row.handle).replace(/^@+/, '') : '');
          if (!uName) continue;
          const uLower = uName.toLowerCase();
          if (seen.has(uLower)) continue;
          seen.add(uLower);
          results.push({
            id: String(row.id || uName),
            username: uName,
            name: row.full_name || row.name || uName,
            avatar:
              row.avatar_url ||
              row.avatar ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${uName}&backgroundColor=06b6d4,a855f7`,
            bio: row.bio || '',
            isVerified: Boolean(row.is_verified || row.verified || row.isVerified),
          });
        }
      } else if (error) {
        // Fallback in case full_name column name is not present
        const { data: fallbackData } = await supabase
          .from('profiles')
          .select('*')
          .ilike('username', `%${clean}%`)
          .limit(25);

        if (Array.isArray(fallbackData)) {
          for (const row of fallbackData) {
            const uName = row.username || (row.handle ? String(row.handle).replace(/^@+/, '') : '');
            if (!uName) continue;
            const uLower = uName.toLowerCase();
            if (seen.has(uLower)) continue;
            seen.add(uLower);
            results.push({
              id: String(row.id || uName),
              username: uName,
              name: row.full_name || row.name || uName,
              avatar:
                row.avatar_url ||
                row.avatar ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${uName}&backgroundColor=06b6d4,a855f7`,
              bio: row.bio || '',
              isVerified: Boolean(row.is_verified || row.verified || row.isVerified),
            });
          }
        }
      }
    } catch (e) {
      console.warn('Profiles query note:', e);
    }

    // 2. Also search distinct creators from posts/reels table
    try {
      const { data: postsData } = await supabase
        .from('posts')
        .select('creator_name, user_id, creator_avatar')
        .ilike('creator_name', `%${clean}%`)
        .limit(20);

      if (Array.isArray(postsData)) {
        for (const p of postsData) {
          if (!p.creator_name) continue;
          const uName = p.creator_name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
          if (seen.has(uName)) continue;
          seen.add(uName);
          results.push({
            id: String(p.user_id || uName),
            username: uName,
            name: p.creator_name,
            avatar:
              p.creator_avatar ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${uName}&backgroundColor=06b6d4,a855f7`,
            isVerified: false,
          });
        }
      }
    } catch (e) {
      console.warn('Posts search note:', e);
    }

    return results;
  } catch (err) {
    console.warn('Error searching users in Supabase:', err);
    return [];
  }
}

/**
 * Send real-time direct message to Supabase 'messages' table
 */
export async function sendSupabaseMessage(msg: {
  conversationId: string;
  senderId: string;
  recipientId: string;
  text: string;
  mediaUrl?: string;
  mediaType?: string;
}): Promise<boolean> {
  try {
    const fullPayload = {
      conversation_id: msg.conversationId,
      sender_id: msg.senderId,
      recipient_id: msg.recipientId,
      text: msg.text,
      media_url: msg.mediaUrl,
      media_type: msg.mediaType,
      created_at: new Date().toISOString(),
    };

    let { error } = await supabase.from('messages').insert([fullPayload]);
    if (error) {
      // Fallback for minimal schema without optional media columns
      const minimalPayload = {
        conversation_id: msg.conversationId,
        sender_id: msg.senderId,
        text: msg.text,
        created_at: new Date().toISOString(),
      };
      const retry = await supabase.from('messages').insert([minimalPayload]);
      if (!retry.error) {
        error = null;
      }
    }
    return !error;
  } catch (err) {
    console.warn('Exception sending message to Supabase:', err);
    return false;
  }
}

/**
 * Fetch messages for a specific conversation from Supabase 'messages' table
 */
export async function fetchSupabaseMessages(conversationId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (!error && Array.isArray(data)) {
      return data;
    }
  } catch (err) {
    console.warn('Exception fetching messages from Supabase:', err);
  }
  return [];
}

/**
 * Toggle Save / Unsave post in Supabase 'saved_posts' table
 */
export async function toggleSupabaseSavedPost(
  userId: string,
  postId: string,
  isSaved: boolean
): Promise<boolean> {
  if (!postId) return false;
  try {
    if (isSaved) {
      await supabase.from('saved_posts').upsert(
        {
          user_id: userId || 'anonymous',
          post_id: postId,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,post_id' }
      );
    } else {
      await supabase
        .from('saved_posts')
        .delete()
        .eq('post_id', postId);
      if (userId) {
        await supabase
          .from('saved_posts')
          .delete()
          .match({ user_id: userId, post_id: postId });
      }
    }
    return true;
  } catch (err) {
    console.warn('Supabase saved_posts toggle error:', err);
    return false;
  }
}

/**
 * Insert active story into Supabase 'stories' table with 24-hour expiration
 */
export async function insertSupabaseStory(story: {
  userId: string;
  username: string;
  displayName: string;
  avatar: string;
  mediaUrl: string;
  mediaType?: 'image' | 'video';
  caption?: string;
}): Promise<boolean> {
  try {
    const isVideo =
      story.mediaType === 'video' ||
      Boolean(
        story.mediaUrl.match(/\.(mp4|webm|mov|ogg)($|\?)/i) ||
        story.mediaUrl.startsWith('data:video')
      );
    const resolvedType: 'image' | 'video' = isVideo ? 'video' : 'image';
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const createdAt = new Date().toISOString();

    const fullPayload = {
      user_id: story.userId,
      username: story.username,
      display_name: story.displayName,
      avatar: story.avatar,
      media_url: story.mediaUrl,
      media_type: resolvedType,
      caption: story.caption || '',
      expires_at: expiresAt,
      created_at: createdAt,
    };

    let { error } = await supabase.from('stories').insert([fullPayload]);
    if (error) {
      console.warn('Supabase full payload notice, retrying with exact core columns:', error.message);
      // Fallback to exact core columns specified in requirements:
      // { user_id, media_url, media_type, created_at, expires_at }
      const corePayload = {
        user_id: story.userId,
        media_url: story.mediaUrl,
        media_type: resolvedType,
        created_at: createdAt,
        expires_at: expiresAt,
      };
      const retry = await supabase.from('stories').insert([corePayload]);
      if (retry.error) {
        console.warn('Supabase core story insert notice:', retry.error.message);
      } else {
        error = null;
      }
    }
    return !error;
  } catch (err) {
    console.warn('Exception inserting story into Supabase:', err);
    return false;
  }
}

/**
 * Fetch strictly active 24-hour stories from Supabase
 */
export async function fetchSupabaseActiveStories(): Promise<StoryItem[]> {
  try {
    const nowIso = new Date().toISOString();
    let rows: any[] | null = null;

    // First try querying with profiles relationship
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('*, profiles:user_id(username, full_name, avatar_url)')
        .gt('expires_at', nowIso)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        rows = data;
      }
    } catch {
      rows = null;
    }

    // If join failed or returned null, perform direct table query
    if (!rows) {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .gt('expires_at', nowIso)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        rows = data;
      }
    }

    if (Array.isArray(rows) && rows.length > 0) {
      return rows.map((row: any) => {
        const profile = row.profiles || {};
        const rawUsername = row.username || profile.username || 'creator';
        const formattedUsername = rawUsername.startsWith('@') ? rawUsername : `@${rawUsername}`;
        const displayName = row.display_name || profile.full_name || rawUsername;
        const avatar =
          row.avatar ||
          profile.avatar_url ||
          `https://api.dicebear.com/7.x/bottts/svg?seed=${rawUsername}&backgroundColor=06b6d4,a855f7`;

        return {
          id: String(row.id),
          username: formattedUsername,
          displayName,
          avatar,
          storyMediaUrl: row.media_url,
          caption: row.caption || undefined,
          timestamp: 'Just now',
          isVerified: true,
          isViewed: false,
        };
      });
    }
    return [];
  } catch (err) {
    console.warn('Error fetching active stories from Supabase:', err);
    return [];
  }
}

