/**
 * Selise Content Block client for live site persistence.
 *
 * The app stores one published JSON site record per IAM user. The record is
 * keyed by ownerId/userId for authenticated editor reads and by slug/username
 * for public live-site routing.
 */

import type { VibeComponentData } from '../components/builder/registry';
import { getAccessToken } from './blocks';

const API_BASE = import.meta.env.VITE_BLOCKS_API_URL || 'https://api.seliseblocks.com';
const X_BLOCKS_KEY = import.meta.env.VITE_X_BLOCKS_KEY || '';
const PROJECT_SLUG = import.meta.env.VITE_PROJECT_SLUG || '';

const CONTENT_TYPE = import.meta.env.VITE_CONTENT_TYPE || 'vibe_site';
const CONTENT_API_BASE = (
  import.meta.env.VITE_CONTENT_API_BASE || `${API_BASE}/cms/v1/Content`
).replace(/\/$/, '');

type ContentRecord = Record<string, unknown>;

export interface VibeSitePage {
  id: string;
  title: string;
  slug: string;
  components: VibeComponentData[];
}

export interface VibeSiteData {
  siteName: string;
  username?: string;
  publicSlug?: string;
  pages: VibeSitePage[];
  publishedAt?: string;
  updatedAt?: string;
}

export interface VibeSiteContent {
  itemId?: string;
  contentType: string;
  ownerId: string;
  userId: string;
  username: string;
  slug: string;
  data: VibeSiteData;
  isPublished: boolean;
  projectSlug?: string;
  createdAt?: string;
  updatedAt?: string;
  created_at?: string;
  updated_at?: string;
}

function isRecord(value: unknown): value is ContentRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readField(record: ContentRecord, keys: string[]) {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return undefined;
}

function readString(record: ContentRecord, keys: string[]) {
  const value = readField(record, keys);
  if (value === undefined) return undefined;
  return typeof value === 'string' ? value : String(value);
}

function readRecord(record: ContentRecord, keys: string[]) {
  const value = readField(record, keys);
  return isRecord(value) ? value : undefined;
}

function getHeaders(includeAuth = true) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-blocks-key': X_BLOCKS_KEY,
  };
  const token = includeAuth ? getAccessToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function createContentError(prefix: string, status: number, error: unknown) {
  const errorRecord = isRecord(error) ? error : {};
  const nestedErrors = readRecord(errorRecord, ['errors']);
  const arrayError =
    Array.isArray(errorRecord.errors) && isRecord(errorRecord.errors[0])
      ? readString(errorRecord.errors[0], ['message'])
      : undefined;
  const detail =
    readString(errorRecord, ['message', 'error_description', 'error']) ||
    arrayError ||
    (nestedErrors ? readString(nestedErrors, ['Slug', 'slug', 'Email', 'email']) : undefined);

  return new Error(detail ? `${prefix}: ${detail}` : `${prefix} (${status})`);
}

async function parseResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function postContent(
  action: string,
  payload: Record<string, unknown>,
  includeAuth = true
): Promise<unknown | null> {
  const res = await fetch(`${CONTENT_API_BASE}/${action}`, {
    method: 'POST',
    headers: getHeaders(includeAuth),
    body: JSON.stringify(payload),
  });

  const data = await parseResponse(res);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw createContentError(`Content ${action} failed`, res.status, data);
  }

  return data;
}

function unwrapContentResponse(data: unknown): unknown | null {
  if (!data) return null;
  if (Array.isArray(data)) return data[0] ?? null;
  if (!isRecord(data)) return data;

  const candidates = [
    data.data,
    data.result,
    data.item,
    data.content,
    data.value,
    data.payload,
    data,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (Array.isArray(candidate)) return candidate[0] ?? null;
    if (isRecord(candidate) && Array.isArray(candidate.items)) return candidate.items[0] ?? null;
    if (isRecord(candidate) && Array.isArray(candidate.data)) return candidate.data[0] ?? null;
    return candidate;
  }

  return null;
}

export function slugify(value: string | undefined | null, fallback = 'site') {
  const slug = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || fallback;
}

export function normalizePageSlug(value: string | undefined | null) {
  return slugify(value, 'home');
}

export function getPublicSitePath(username: string, pageSlug = 'home', base = 'site') {
  const siteSlug = slugify(username, 'user');
  const normalizedPageSlug = normalizePageSlug(pageSlug);
  const root = `/${base}/${siteSlug}`;
  return normalizedPageSlug === 'home' ? root : `${root}/${normalizedPageSlug}`;
}

export function getPreferredUsername(user: {
  itemId?: string;
  userName?: string;
  email?: string;
  displayName?: string;
} | null | undefined) {
  if (!user) return 'guest';
  return slugify(user.userName || user.email?.split('@')[0] || user.displayName || user.itemId, 'user');
}

export function normalizeSiteData(siteData: Partial<VibeSiteData> | ContentRecord | null | undefined, username?: string) {
  const record = isRecord(siteData) ? siteData : {};
  const pages = Array.isArray(record.pages) ? record.pages : [];
  const normalizedPages = pages.map((rawPage, index) => {
    const page = isRecord(rawPage) ? rawPage : {};
    const title = readString(page, ['title', 'Title']) || (index === 0 ? 'Home' : `Page ${index + 1}`);
    const components = Array.isArray(page.components) ? (page.components as VibeComponentData[]) : [];

    return {
      id: readString(page, ['id', 'itemId', 'ItemId']) || `page_${index + 1}`,
      title,
      slug: normalizePageSlug(readString(page, ['slug', 'Slug']) || title || (index === 0 ? 'home' : `page-${index + 1}`)),
      components,
    };
  });

  if (normalizedPages.length === 0) {
    normalizedPages.push({
      id: 'home',
      title: 'Home',
      slug: 'home',
      components: [],
    });
  }

  const publicSlug = slugify(
    username || readString(record, ['publicSlug', 'username', 'slug', 'Slug']),
    'site'
  );

  return {
    ...record,
    siteName: readString(record, ['siteName', 'title', 'Title']) || 'My Vibe Site',
    username: publicSlug,
    publicSlug,
    pages: normalizedPages,
  } as VibeSiteData;
}

function buildContentPayload(ownerId: string, username: string, siteData: Partial<VibeSiteData>) {
  const now = new Date().toISOString();
  const publicSlug = slugify(username, ownerId || 'user');
  const siteDataRecord = isRecord(siteData) ? siteData : {};
  const normalizedData = normalizeSiteData(
    {
      ...siteData,
      publishedAt: siteData.publishedAt || now,
      updatedAt: now,
    },
    publicSlug
  );

  return {
    contentType: CONTENT_TYPE,
    ownerId,
    userId: ownerId,
    username: publicSlug,
    slug: publicSlug,
    title: normalizedData.siteName,
    isPublished: true,
    projectKey: X_BLOCKS_KEY,
    projectSlug: PROJECT_SLUG,
    data: normalizedData,
    created_at: readString(siteDataRecord, ['created_at']) || now,
    updated_at: now,
  };
}

function normalizeContentRecord(record: unknown): VibeSiteContent | null {
  const unwrapped = unwrapContentResponse(record);
  if (!isRecord(unwrapped)) return null;

  const rawData = readRecord(unwrapped, ['data', 'Data', 'payload', 'Payload']) || unwrapped;
  const slug = slugify(
    readString(unwrapped, ['slug', 'Slug']) || readString(rawData, ['publicSlug', 'username']),
    'site'
  );
  const ownerId = readString(unwrapped, ['ownerId', 'userId', 'UserId']) || readString(rawData, ['ownerId']) || '';
  const data = normalizeSiteData(rawData, slug);
  const isPublishedValue = readField(unwrapped, ['isPublished', 'IsPublished']);

  return {
    itemId: readString(unwrapped, ['itemId', 'ItemId', 'id']),
    contentType: readString(unwrapped, ['contentType', 'ContentType']) || CONTENT_TYPE,
    ownerId,
    userId: readString(unwrapped, ['userId', 'UserId']) || ownerId,
    username: slug,
    slug,
    data,
    isPublished: typeof isPublishedValue === 'boolean' ? isPublishedValue : true,
    projectSlug: readString(unwrapped, ['projectSlug', 'ProjectSlug']) || PROJECT_SLUG,
    createdAt: readString(unwrapped, ['createdAt', 'CreatedAt']),
    updatedAt: readString(unwrapped, ['updatedAt', 'UpdatedAt']),
    created_at: readString(unwrapped, ['created_at']),
    updated_at: readString(unwrapped, ['updated_at']),
  };
}

export async function upsertSiteContent(
  ownerId: string,
  username: string,
  siteData: Partial<VibeSiteData>
): Promise<VibeSiteContent> {
  const payload = buildContentPayload(ownerId, username, siteData);
  const data = await postContent('Upsert', payload, true);
  return normalizeContentRecord(data || payload) || (payload as VibeSiteContent);
}

export async function getSiteContentByOwner(ownerId: string): Promise<VibeSiteContent | null> {
  const data = await postContent(
    'GetByOwner',
    {
      contentType: CONTENT_TYPE,
      ownerId,
      userId: ownerId,
      projectKey: X_BLOCKS_KEY,
      projectSlug: PROJECT_SLUG,
    },
    true
  );

  return normalizeContentRecord(data);
}

export async function getSiteContentBySlug(slug: string): Promise<VibeSiteContent | null> {
  const publicSlug = slugify(slug, 'site');
  const data = await postContent(
    'GetBySlug',
    {
      contentType: CONTENT_TYPE,
      slug: publicSlug,
      username: publicSlug,
      isPublished: true,
      projectKey: X_BLOCKS_KEY,
      projectSlug: PROJECT_SLUG,
    },
    false
  );

  return normalizeContentRecord(data);
}

export async function ensureSiteContent(
  ownerId: string,
  username: string,
  defaultData: Partial<VibeSiteData>
): Promise<VibeSiteContent> {
  const existing = await getSiteContentByOwner(ownerId);
  if (existing) return existing;
  return upsertSiteContent(ownerId, username, defaultData);
}

export function getLocalSiteData(userId: string): VibeSiteData | null {
  const key = `vibe-site-${userId}`;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return normalizeSiteData(JSON.parse(raw) as unknown as ContentRecord);
  } catch {
    return null;
  }
}

export function setLocalSiteData(userId: string, data: Partial<VibeSiteData>): void {
  const key = `vibe-site-${userId}`;
  localStorage.setItem(key, JSON.stringify(normalizeSiteData(data)));
}
