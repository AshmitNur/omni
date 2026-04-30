/**
 * Selise Blocks API Client
 * Replaces Firebase with Selise Blocks IAM for authentication & user management.
 * Docs: https://docs.seliseblocks.com/reference
 */

const API_BASE = import.meta.env.VITE_BLOCKS_API_URL;
const X_BLOCKS_KEY = import.meta.env.VITE_X_BLOCKS_KEY;

// ─── Token storage keys ────────────────────────────────────────
const ACCESS_TOKEN_KEY  = 'omni_access_token';
const REFRESH_TOKEN_KEY = 'omni_refresh_token';
const USER_DATA_KEY     = 'omni_user_data';

// ─── Helpers ───────────────────────────────────────────────────
function getHeaders(contentType = 'application/json') {
  const headers: Record<string, string> = {
    'x-blocks-key': X_BLOCKS_KEY,
  };
  if (contentType) headers['Content-Type'] = contentType;
  const token = getAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

// ─── Token management ──────────────────────────────────────────
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function storeTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_DATA_KEY);
}

// ─── User data (cached from /GetAccount) ───────────────────────
export interface BlocksUser {
  itemId: string;
  email: string;
  userName: string;
  firstName: string;
  lastName: string;
  displayName: string;
  profileImageUrl?: string;
}

export function getCachedUser(): BlocksUser | null {
  const raw = localStorage.getItem(USER_DATA_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function cacheUser(user: BlocksUser) {
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
}

// ─── Auth: Login (Password Grant) ──────────────────────────────
export async function loginWithPassword(email: string, password: string): Promise<BlocksUser> {
  const body = new FormData();
  body.append('grant_type', 'password');
  body.append('username', email);
  body.append('password', password);

  const res = await fetch(`${API_BASE}/idp/v1/Authentication/Token`, {
    method: 'POST',
    headers: { 'x-blocks-key': X_BLOCKS_KEY },
    body,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error_description || err.error || 'Login failed');
  }

  const data = await res.json();
  storeTokens(data.access_token, data.refresh_token);

  // Fetch user profile after login
  const user = await fetchCurrentAccount();
  return user;
}

// ─── Auth: Register (IAM Create User) ──────────────────────────
export async function registerUser(
  firstName: string,
  lastName: string,
  email: string,
  password: string
): Promise<{ itemId: string }> {
  // Try the direct creation endpoint (requires admin context/token usually)
  const res = await fetch(`${API_BASE}/idp/v1/Iam/Create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-blocks-key': X_BLOCKS_KEY,
    },
    body: JSON.stringify({
      email,
      userName: email,
      password,
      firstName,
      lastName,
      language: 'en-US',
      mailPurpose: 'user_creation',
      userPassType: 0,
      userCreationType: 0,
      varifiedType: 0,
      platform: 'web',
      mfaEnabled: false,
      allowedLogInType: [0],
      projectKey: X_BLOCKS_KEY,
    }),
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Registration failed: Email/Password Sign-up is disabled for this project, or the API requires administrative privileges. Please enable it in the Selise Blocks dashboard or create users manually.');
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error_description || err.message || 'Registration failed');
  }

  return res.json();
}

// ─── Auth: Refresh Token ───────────────────────────────────────
export async function refreshAccessToken(): Promise<boolean> {
  const rt = getRefreshToken();
  if (!rt) return false;

  const body = new FormData();
  body.append('grant_type', 'refresh_token');
  body.append('refresh_token', rt);

  const res = await fetch(`${API_BASE}/idp/v1/Authentication/Token`, {
    method: 'POST',
    headers: { 'x-blocks-key': X_BLOCKS_KEY },
    body,
  });

  if (!res.ok) {
    clearSession();
    return false;
  }

  const data = await res.json();
  storeTokens(data.access_token, data.refresh_token);
  return true;
}

// ─── IAM: Get current user account ─────────────────────────────
export async function fetchCurrentAccount(): Promise<BlocksUser> {
  const res = await fetch(`${API_BASE}/idp/v1/Iam/GetAccount`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!res.ok) {
    throw new Error('Failed to fetch account');
  }

  const data = await res.json();

  const user: BlocksUser = {
    itemId: data.itemId || data.id || '',
    email: data.email || '',
    userName: data.userName || '',
    firstName: data.firstName || '',
    lastName: data.lastName || '',
    displayName: `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.userName || data.email,
    profileImageUrl: data.profileImageUrl,
  };

  cacheUser(user);
  return user;
}

// ─── Auth: Logout ──────────────────────────────────────────────
export function logout() {
  clearSession();
}

// ─── Auth: Check if we have a valid session ────────────────────
export function isAuthenticated(): boolean {
  return !!getAccessToken();
}
