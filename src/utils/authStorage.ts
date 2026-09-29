/**
 * Client-Side 100% Free Authentication Storage for GediOn
 * Supports "Continue with Google" & "Instant Email OTP (Gmail)"
 * Stores session in localStorage ('gedion_auth')
 */

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  username: string;
  avatar: string;
  provider: 'google' | 'email_otp' | 'supabase';
  createdAt: number;
  lastLoginAt: number;
  hasCompletedDemoVideo?: boolean;
  hasCompletedOnboarding?: boolean;
}

const AUTH_STORAGE_KEY = 'gedion_auth';

export const DEFAULT_AUTH_USER: AuthUser = {
  id: 'usr_ramesh_google',
  email: 'rameshrao034@gmail.com',
  displayName: 'Ramesh Rao',
  username: 'rameshrao034',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  provider: 'google',
  createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
  lastLoginAt: Date.now(),
  hasCompletedDemoVideo: true,
  hasCompletedOnboarding: true,
};

/**
 * Map real Supabase user object to GediOn AuthUser
 */
export const mapSupabaseUserToAuthUser = (sbUser: any): AuthUser => {
  const metadata = sbUser.user_metadata || {};
  const email = sbUser.email || '';
  const namePart = metadata.full_name || metadata.name || (email ? email.split('@')[0] : 'creator');
  const cleanUsername = (metadata.username || (email ? email.split('@')[0] : 'creator'))
    .replace(/[^a-zA-Z0-9_.]/g, '')
    .toLowerCase();

  const formattedName =
    metadata.full_name ||
    metadata.name ||
    namePart
      .split(/[._-]/)
      .filter(Boolean)
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ') ||
    'Creator';

  const avatar =
    metadata.avatar_url ||
    metadata.picture ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}&backgroundColor=06b6d4,a855f7`;

  return {
    id: sbUser.id,
    email: email,
    displayName: formattedName,
    username: cleanUsername,
    avatar: avatar,
    provider: sbUser.app_metadata?.provider === 'google' ? 'google' : 'supabase',
    createdAt: new Date(sbUser.created_at || Date.now()).getTime(),
    lastLoginAt: Date.now(),
    hasCompletedDemoVideo: true,
    hasCompletedOnboarding: true,
  };
};

/**
 * Retrieve active session from localStorage
 */
export const getStoredAuth = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch (e) {
    console.error('Failed to parse gedion_auth session', e);
    return null;
  }
};

/**
 * Save active session to localStorage
 */
export const setStoredAuth = (user: AuthUser): void => {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Failed to save gedion_auth session', e);
  }
};

/**
 * Clear session from localStorage
 */
export const clearStoredAuth = (): void => {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear gedion_auth session', e);
  }
};

/**
 * Helper to derive display name and username from email
 */
export const deriveUserFromEmail = (email: string, provider: 'google' | 'email_otp' = 'email_otp'): AuthUser => {
  const cleanEmail = email.trim().toLowerCase();
  const namePart = cleanEmail.split('@')[0] || 'creator';
  const cleanUsername = namePart.replace(/[^a-zA-Z0-9_.]/g, '').toLowerCase() || 'user';
  
  // Format formatted display name: e.g. "ramesh.rao" -> "Ramesh Rao"
  const formattedName = namePart
    .split(/[._-]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ') || 'GediOn Creator';

  // Seed avatar color/pattern deterministically
  const avatarSeed = encodeURIComponent(cleanUsername);
  const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed}&backgroundColor=06b6d4,a855f7`;

  return {
    id: `usr_${cleanUsername.replace(/[^a-zA-Z0-9]/g, '_')}`,
    email: cleanEmail,
    displayName: formattedName,
    username: cleanUsername,
    avatar,
    provider,
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
    hasCompletedDemoVideo: false,
    hasCompletedOnboarding: false,
  };
};

/**
 * Mark onboarding / demo video as completed for active user
 */
export const markOnboardingCompleted = (): AuthUser => {
  const current = getStoredAuth() || DEFAULT_AUTH_USER;
  const updated: AuthUser = {
    ...current,
    hasCompletedDemoVideo: true,
    hasCompletedOnboarding: true,
  };
  setStoredAuth(updated);
  return updated;
};

export const markDemoVideoCompleted = markOnboardingCompleted;
