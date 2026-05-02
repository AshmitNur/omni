/**
 * Selise Blocks API Client
 * Replaces Firebase with Selise Blocks IAM for authentication & user management.
 * Docs: https://docs.seliseblocks.com/reference
 */

const API_BASE = import.meta.env.VITE_BLOCKS_API_URL || 'https://api.seliseblocks.com';
const X_BLOCKS_KEY = import.meta.env.VITE_X_BLOCKS_KEY || 'f44b9e7d-7c65-4783-a360-14a7df36674e';

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

async function parseAuthError(res: Response, fallback: string) {
  const text = await res.text();
  if (!text) return fallback;

  try {
    const err = JSON.parse(text);
    return err.error_description || err.message || err.error || fallback;
  } catch {
    return text || fallback;
  }
}

function createTokenBody(values: Record<string, string>) {
  const body = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => body.set(key, value));
  return body;
}

// ─── Auth: Login (Password Grant) ──────────────────────────────
export async function loginWithPassword(email: string, password: string): Promise<BlocksUser> {
  const body = createTokenBody({
    grant_type: 'password',
    username: email.trim(),
    password,
  });

  const res = await fetch(`${API_BASE}/idp/v1/Authentication/Token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'x-blocks-key': X_BLOCKS_KEY,
    },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(await parseAuthError(res, 'Login failed'));
  }

  const data = await res.json();
  if (data.enable_mfa) {
    throw new Error('MFA is required for this account. MFA verification is not implemented in this build yet.');
  }
  if (!data.access_token) {
    throw new Error(data.error_description || data.error || 'Login did not return an access token');
  }

  storeTokens(data.access_token, data.refresh_token);

  // Fetch user profile after login
  const user = await fetchCurrentAccount();
  return user;
}

// ─── Auth: Public Signup (Step 1: Request Code) ────────────────
export async function requestSignup(email: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/identifier/v1/People/Signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-blocks-key': X_BLOCKS_KEY,
    },
    body: JSON.stringify({ email, captchaCode: '' }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.errors?.Email || err.error_description || err.message || 'Signup request failed');
  }

  const data = await res.json();
  if (data.errors && data.errors.Email) {
    throw new Error(data.errors.Email);
  }
  return data.isSuccess;
}

// ─── Auth: Activate Account (Step 2: Submit Details & Code) ────
export async function activateAccount(
  firstName: string,
  lastName: string,
  password: string,
  code: string
): Promise<boolean> {
  const res = await fetch(`${API_BASE}/idp/v1/Iam/Activate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-blocks-key': X_BLOCKS_KEY,
    },
    body: JSON.stringify({
      firstname: firstName,
      lastname: lastName,
      password,
      code,
      captchaCode: '',
      projectKey: X_BLOCKS_KEY,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error_description || err.message || 'Activation failed. Invalid code.');
  }

  const data = await res.json();
  if (!data.isSuccess) {
    throw new Error('Activation failed. Please check your code.');
  }
  return true;
}

// ─── Auth: Refresh Token ───────────────────────────────────────
export async function refreshAccessToken(): Promise<boolean> {
  const rt = getRefreshToken();
  if (!rt) return false;

  const body = createTokenBody({
    grant_type: 'refresh_token',
    refresh_token: rt,
  });

  const res = await fetch(`${API_BASE}/idp/v1/Authentication/Token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'x-blocks-key': X_BLOCKS_KEY,
    },
    body: body.toString(),
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
    itemId: data.itemId || data.id || data.ItemId || data.Id || data.userName || '',
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
