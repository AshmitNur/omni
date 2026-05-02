/**
 * Selise Content Block API Client
 * Replaces localStorage with Selise Content Block for site data persistence.
 * 
 * The Content Block acts as a schemaless JSON store keyed by:
 *   - contentType: 'vibe_site'
 *   - ownerId: the authenticated user's itemId
 * 
 * Each user gets ONE content record that holds their entire site JSON.
 */

import { getAccessToken } from './blocks';

const API_BASE = import.meta.env.VITE_BLOCKS_API_URL || 'https://api.seliseblocks.com';
const X_BLOCKS_KEY = import.meta.env.VITE_X_BLOCKS_KEY || '';

const CONTENT_TYPE = 'vibe_site';

function getHeaders(contentType = 'application/json') {
  const headers: Record<string, string> = {
    'x-blocks-key': X_BLOCKS_KEY,
  };
  if (contentType) headers['Content-Type'] = contentType;
  const token = getAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export interface VibeSiteContent {
  itemId?: string;
  contentType: string;
  ownerId: string;
  slug: string;
  data: {
    siteName: string;
    username: string;
    pages: any[];
  };
  createdAt?: string;
  updatedAt?: string;
}

// ─── Create or Update site content ─────────────────────────────
export async function upsertSiteContent(
  ownerId: string,
  username: string,
  siteData: any
): Promise<VibeSiteContent> {
  const payload = {
    contentType: CONTENT_TYPE,
    ownerId,
    slug: username.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    data: {
      ...siteData,
      username,
    },
  };

  const res = await fetch(`${API_BASE}/cms/v1/Content/Upsert`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Content save failed (${res.status})`);
  }

  return await res.json();
}

// ─── Get site content by owner (authenticated) ────────────────
export async function getSiteContentByOwner(ownerId: string): Promise<VibeSiteContent | null> {
  const res = await fetch(`${API_BASE}/cms/v1/Content/GetByOwner`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      contentType: CONTENT_TYPE,
      ownerId,
    }),
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Content fetch failed (${res.status})`);
  }

  const data = await res.json();
  // API may return an array or a single item
  if (Array.isArray(data)) {
    return data.length > 0 ? data[0] : null;
  }
  return data;
}

// ─── Get site content by slug (public, no auth required) ──────
export async function getSiteContentBySlug(slug: string): Promise<VibeSiteContent | null> {
  const res = await fetch(`${API_BASE}/cms/v1/Content/GetBySlug`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-blocks-key': X_BLOCKS_KEY,
    },
    body: JSON.stringify({
      contentType: CONTENT_TYPE,
      slug,
    }),
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Public content fetch failed (${res.status})`);
  }

  const data = await res.json();
  if (Array.isArray(data)) {
    return data.length > 0 ? data[0] : null;
  }
  return data;
}

// ─── Fallback: localStorage bridge ─────────────────────────────
// During API integration, this provides graceful degradation.
// If the API call fails, we fall back to localStorage.

export function getLocalSiteData(userId: string): any | null {
  const key = `vibe-site-${userId}`;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function setLocalSiteData(userId: string, data: any): void {
  const key = `vibe-site-${userId}`;
  localStorage.setItem(key, JSON.stringify(data));
}
