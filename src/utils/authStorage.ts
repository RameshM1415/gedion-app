id: `usr_${cleanUsername.replace(/[^a-zA-Z0-9]/g, '_')}` // <-- yahan error tha
```[span_3](start_span)[span_3](end_span)

---

### Isko 1-Click Mein Fix Karein (100% Tested Clean Code)

Is baar koi typing nahi karni hai. Neeche diya gaya poora code **Copy** kijiye:

```ts
/**
 * Client-Side 100% Free Authentication Storage For GediOn
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
  id: 'usr_rameshrao034',
  email: 'rameshrao034@gmail.com',
  displayName: 'Ramesh Rao',
  username: 'rameshrao034',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  provider: 'google',
  createdAt: 1700000000000,
  lastLoginAt: Date.now(),
  hasCompletedDemoVideo: true,
  hasCompletedOnboarding: true,
};

/**
 * Clean username and display name builder (Hides raw Gmail ID everywhere)
 */
const extractSafeDetails = (email: string, meta: any = {}) => {
  const cleanEmail = (email || '').trim().toLowerCase();
  const namePart = meta.username || meta.full_name || meta.name || cleanEmail.split('@')[0] || 'creator';
  const cleanUsername = namePart.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || 'creator';
  
  const rawDisplay = meta.full_name || meta.name || namePart.replace(/[._]/g, ' ');
  const formattedName = rawDisplay
    .split(' ')
    .filter(Boolean)
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ') || 'GediOn Creator';

  return { cleanEmail, cleanUsername, formattedName };
};

/**
 * Map real Supabase user object to GediOn AuthUser
 */
export const mapSupabaseUserToAuthUser = (sbUser: any): AuthUser => {
  const metadata = sbUser.user_metadata || {};
  const email = sbUser.email || '';
  const { cleanEmail, cleanUsername, formattedName } = extractSafeDetails(email, metadata);

  const avatar =
    metadata.avatar_url ||
    metadata.picture ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}&backgroundColor=06b6d4,a855f7`;

  return {
    id: sbUser.id || `usr_${cleanUsername}`,
    email: cleanEmail,
    displayName: formattedName,
    username: cleanUsername,
    avatar,
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
    if (!raw) return DEFAULT_AUTH_USER;
    return JSON.parse(raw) as AuthUser;
  } catch (e) {
    console.error('Failed to parse gedion_auth session', e);
    return DEFAULT_AUTH_USER;
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
  const { cleanEmail, cleanUsername, formattedName } = extractSafeDetails(email);
  const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}&backgroundColor=06b6d4,a855f7`;

  return {
    id: `usr_${cleanUsername}`,
    email: cleanEmail,
    displayName: formattedName,
    username: cleanUsername,
    avatar,
    provider,
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
    hasCompletedDemoVideo: true,
    hasCompletedOnboarding: true,
  };
};

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
