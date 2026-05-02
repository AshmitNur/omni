/**
 * Selise Content Block client for live site persistence.
 *
 * The app stores one published JSON site record per IAM user. The record is
 * keyed by ownerId/userId for authenticated editor reads and by slug/username
 * for public live-site routing.
 */

import type { VibeComponentData } from '../components/builder/registry';
import { getAccessToken, refreshAccessToken } from './blocks';
import { BLOCKS_API_BASE, BLOCKS_PROJECT_KEY, BLOCKS_PROJECT_SLUG, MCP_PROXY_URL } from './config';

const API_BASE = BLOCKS_API_BASE;
const X_BLOCKS_KEY = BLOCKS_PROJECT_KEY;
const PROJECT_SLUG = BLOCKS_PROJECT_SLUG;

const CONTENT_TYPE = import.meta.env.VITE_CONTENT_TYPE || 'vibe_site';
const CONTENT_API_BASE = (
  import.meta.env.VITE_CONTENT_API_BASE || `${API_BASE}/cms/v1/Content`
).replace(/\/$/, '');
const GRAPHQL_API_BASE = (
  import.meta.env.VITE_BLOCKS_GRAPHQL_API_BASE ||
  `${API_BASE}/uds/v1/${PROJECT_SLUG}/gateway`
).replace(/\/$/, '');
const INVENTORY_CONTENT_CATEGORY = 'VibeSite';
const INVENTORY_CONTENT_TAG = 'vibe-site';
const INVENTORY_CHUNK_SIZE = 2500;

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

interface InventoryMutationResult {
  insertInventoryItem?: {
    itemId?: string;
    acknowledged?: boolean;
  };
  updateInventoryItem?: {
    itemId?: string;
    acknowledged?: boolean;
  };
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
  if (token) headers.Authorization = `bearer ${token}`;
  return headers;
}

function isHostedBlocksRuntime() {
  if (typeof window === 'undefined') return false;
  return !['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}

function getRequestCredentials(): RequestCredentials | undefined {
  return isHostedBlocksRuntime() ? 'include' : undefined;
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

function isAuthError(error: unknown) {
  if (!isRecord(error)) return false;
  const errors = Array.isArray(error.errors) ? error.errors : [];
  const messages = errors
    .filter(isRecord)
    .map((item) => `${readString(item, ['message']) || ''} ${readString(readRecord(item, ['extensions']) || {}, ['code']) || ''}`);
  const directMessage = readString(error, ['message', 'error', 'error_description']) || '';
  return [...messages, directMessage].some((message) =>
    /unauthenticated|unauthorized|AUTH_NOT_AUTHENTICATED|invalid_token/i.test(message)
  );
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
  includeAuth = true,
  retryAuth = true
): Promise<unknown | null> {
  const res = await fetch(`${CONTENT_API_BASE}/${action}`, {
    method: 'POST',
    headers: getHeaders(includeAuth),
    credentials: getRequestCredentials(),
    body: JSON.stringify(payload),
  });

  const data = await parseResponse(res);
  if (includeAuth && retryAuth && (res.status === 401 || isAuthError(data))) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return postContent(action, payload, includeAuth, false);
  }
  if (res.status === 404) return null;
  if (!res.ok) {
    throw createContentError(`Content ${action} failed`, res.status, data);
  }

  return data;
}

async function postGraphql<T>(
  query: string,
  variables: Record<string, unknown> = {},
  includeAuth = true,
  retryAuth = true
): Promise<T> {
  const res = await fetch(GRAPHQL_API_BASE, {
    method: 'POST',
    headers: getHeaders(includeAuth),
    credentials: getRequestCredentials(),
    body: JSON.stringify({ query, variables }),
  });

  const data = await parseResponse(res);
  if (includeAuth && retryAuth && (res.status === 401 || isAuthError(data))) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return postGraphql<T>(query, variables, includeAuth, false);
  }
  if (!res.ok) {
    throw createContentError('Data Gateway request failed', res.status, data);
  }

  if (isRecord(data) && Array.isArray(data.errors) && data.errors.length > 0) {
    const firstError = data.errors.find(isRecord);
    const message = firstError ? readString(firstError, ['message']) : undefined;
    throw new Error(message || 'Data Gateway request failed');
  }

  return (isRecord(data) ? data.data : data) as T;
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
  const rawName = user.userName || user.email?.split('@')[0] || user.displayName || user.itemId;
  const slug = slugify(rawName, 'user');
  // Avoid returning generic 'user' if possible
  if (slug === 'user' && user.itemId) return slugify(user.itemId);
  return slug;
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

function encodeSiteData(data: unknown) {
  const serialized = JSON.stringify(data);
  const chunks: string[] = [];
  for (let index = 0; index < serialized.length; index += INVENTORY_CHUNK_SIZE) {
    chunks.push(serialized.slice(index, index + INVENTORY_CHUNK_SIZE));
  }
  return chunks;
}

function decodeSiteData(chunks: unknown, fallback: VibeSiteData) {
  if (!Array.isArray(chunks)) return fallback;
  try {
    return JSON.parse(chunks.map(String).join('')) as VibeSiteData;
  } catch {
    return fallback;
  }
}

function buildInventoryContentInput(ownerId: string, username: string, siteData: Partial<VibeSiteData>) {
  const payload = buildContentPayload(ownerId, username, siteData);

  return {
    ItemName: `${INVENTORY_CONTENT_TAG}:${payload.slug}`,
    Category: INVENTORY_CONTENT_CATEGORY,
    Supplier: ownerId,
    ItemLoc: payload.username,
    Status: 'Published',
    Tags: [INVENTORY_CONTENT_TAG, payload.slug, ownerId],
    ItemImageFileId: payload.slug,
    ItemImageFileIds: encodeSiteData(payload),
    Stock: 1,
    Price: 0,
    EligibleWarranty: false,
    EligibleReplacement: false,
    Discount: false,
  };
}

function inventoryFilter(filter: Record<string, unknown>) {
  return JSON.stringify(filter);
}

function normalizeInventorySiteRecord(record: unknown): VibeSiteContent | null {
  if (!isRecord(record)) return null;

  const ownerId = readString(record, ['Supplier']) || '';
  const username = readString(record, ['ItemLoc', 'ItemImageFileId']) || 'site';
  const fallbackData = normalizeSiteData(
    {
      siteName: readString(record, ['ItemName'])?.replace(`${INVENTORY_CONTENT_TAG}:`, '') || 'My Vibe Site',
      username,
      publicSlug: username,
      pages: [],
    },
    username
  );
  const data = normalizeSiteData(decodeSiteData(record.ItemImageFileIds, fallbackData), username);

  return {
    itemId: readString(record, ['ItemId']),
    contentType: CONTENT_TYPE,
    ownerId,
    userId: ownerId,
    username,
    slug: username,
    data,
    isPublished: true,
    projectSlug: PROJECT_SLUG,
    createdAt: readString(record, ['CreatedDate']),
    updatedAt: readString(record, ['LastUpdatedDate']),
  };
}

async function getInventorySiteByOwner(ownerId: string): Promise<VibeSiteContent | null> {
  if (!ownerId) return null;
  type Response = {
    getInventoryItems?: {
      items?: unknown[];
    };
  };

  const data = await postGraphql<Response>(
    `query VibeInventorySite($input: DynamicQueryInput) {
      getInventoryItems(input: $input) {
        items {
          ItemId
          ItemName
          Category
          Supplier
          ItemLoc
          Status
          Tags
          ItemImageFileId
          ItemImageFileIds
          CreatedDate
          LastUpdatedDate
        }
      }
    }`,
    {
      input: {
        filter: inventoryFilter({ Category: INVENTORY_CONTENT_CATEGORY, Supplier: ownerId }),
        sort: JSON.stringify({ LastUpdatedDate: -1 }),
        pageNo: 1,
        pageSize: 1,
      },
    },
    true
  );

  const item = data.getInventoryItems?.items?.[0];
  if (item) {
    console.log(`[OMNI] Site data loaded from Inventory for ${ownerId}`);
  }
  return normalizeInventorySiteRecord(item);
}

async function getInventorySiteBySlug(slug: string, includeAuth: boolean): Promise<VibeSiteContent | null> {
  type Response = {
    getInventoryItems?: {
      items?: unknown[];
    };
  };

  const publicSlug = slugify(slug, 'site');
  const data = await postGraphql<Response>(
    `query VibeInventorySite($input: DynamicQueryInput) {
      getInventoryItems(input: $input) {
        items {
          ItemId
          ItemName
          Category
          Supplier
          ItemLoc
          Status
          Tags
          ItemImageFileId
          ItemImageFileIds
          CreatedDate
          LastUpdatedDate
        }
      }
    }`,
    {
      input: {
        filter: inventoryFilter({ Category: INVENTORY_CONTENT_CATEGORY, ItemLoc: publicSlug }),
        sort: JSON.stringify({ LastUpdatedDate: -1 }),
        pageNo: 1,
        pageSize: 1,
      },
    },
    includeAuth
  );

  return normalizeInventorySiteRecord(data.getInventoryItems?.items?.[0]);
}


export async function upsertInventorySiteContent(
  ownerId: string,
  username: string,
  siteData: Partial<VibeSiteData>
): Promise<VibeSiteContent | null> {
  if (!ownerId) {
    console.error('[OMNI] Cannot upsert: ownerId is missing');
    return null;
  }

  console.log(`[OMNI] Starting site upsert for user: ${ownerId} (${username})`);

  // Strategy 0: Use MCP Proxy to bypass CORS for content
  if (MCP_PROXY_URL) {
    try {
      console.log('[OMNI] Attempting site sync via MCP Proxy...');
      const proxyRes = await fetch(`${MCP_PROXY_URL}/proxy/upsert-site`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId, username, siteData })
      });

      if (proxyRes.ok) {
        const data = await proxyRes.json();
        console.log('[OMNI] Proxy site sync successful:', data);
        // Extract ItemId from either insert or update response
        const finalId = data.data?.insertInventoryItem?.itemId || 
                      data.data?.updateInventoryItem?.itemId || 
                      data.insertInventoryItem?.itemId || 
                      data.updateInventoryItem?.itemId;

        return {
          ...(buildContentPayload(ownerId, username, siteData) as VibeSiteContent),
          itemId: finalId,
          data: normalizeSiteData(siteData, username),
        };
      }
      console.warn('[OMNI] Proxy site sync failed, falling back to direct...');
    } catch (err) {
      console.error('[OMNI] Proxy site error:', err);
    }
  }

  const input = buildInventoryContentInput(ownerId, username, siteData);
  const existing = await getInventorySiteByOwner(ownerId);

  try {
    if (existing?.itemId) {
      console.log(`[OMNI] Existing site found (${existing.itemId}). Updating...`);
      const response = await postGraphql<InventoryMutationResult>(
        `mutation UpdateVibeSite($itemId: String!, $input: InventoryItemInput!) {
          updateInventoryItem(itemId: $itemId, input: $input) {
            itemId
            acknowledged
          }
        }`,
        {
          itemId: existing.itemId,
          input: { ...input, ItemId: existing.itemId }
        },
        true
      );
      
      console.log('[OMNI] Update response:', response);
      return {
        ...existing,
        data: normalizeSiteData(siteData, username),
        updatedAt: new Date().toISOString()
      };
    } else {
      console.log('[OMNI] No existing site. Inserting new record...');
      const response = await postGraphql<InventoryMutationResult>(
        `mutation InsertVibeSite($input: InventoryItemInput!) {
          insertInventoryItem(input: $input) {
            itemId
            acknowledged
          }
        }`,
        { input },
        true
      );

      console.log('[OMNI] Insert response:', response);
      const newItemId = response.insertInventoryItem?.itemId;

      return {
        ...(buildContentPayload(ownerId, username, siteData) as VibeSiteContent),
        itemId: newItemId,
        data: normalizeSiteData(siteData, username),
      };
    }
  } catch (error) {
    console.error('[OMNI] Upsert FAILED:', error);
    return null;
  }
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
  const inventoryRecord = await upsertInventorySiteContent(ownerId, username, siteData);
  if (inventoryRecord) return inventoryRecord;
  throw new Error('Data Gateway content sync returned no site record.');
}

export async function getSiteContentByOwner(ownerId: string): Promise<VibeSiteContent | null> {
  if (!ownerId) return null;
  try {
    const inventoryRecord = await getInventorySiteByOwner(ownerId);
    if (inventoryRecord) return inventoryRecord;
  } catch (gatewayError) {
    console.warn('Data Gateway content load failed, trying Content API fallback.', gatewayError);
  }

  try {
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
  } catch (contentError) {
    console.warn('Content API owner lookup failed.', contentError);
    return null;
  }
}

export async function getSiteContentBySlug(slug: string): Promise<VibeSiteContent | null> {
  const publicSlug = slugify(slug, 'site');
  try {
    const inventoryRecord = await getInventorySiteBySlug(publicSlug, false);
    if (inventoryRecord) return inventoryRecord;
  } catch (gatewayError) {
    const token = getAccessToken();
    if (token) {
      try {
        const authenticatedInventoryRecord = await getInventorySiteBySlug(publicSlug, true);
        if (authenticatedInventoryRecord) return authenticatedInventoryRecord;
      } catch (authenticatedGatewayError) {
        console.warn('Authenticated Data Gateway slug lookup failed.', authenticatedGatewayError);
      }
    }
    console.warn('Public Data Gateway slug lookup failed, trying Content API fallback.', gatewayError);
  }

  try {
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
  } catch (contentError) {
    console.warn('Content API slug lookup failed.', contentError);
    return null;
  }
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
  if (!userId) return null;
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
  if (!userId) return;
  const key = `vibe-site-${userId}`;
  localStorage.setItem(key, JSON.stringify(normalizeSiteData(data)));
}
