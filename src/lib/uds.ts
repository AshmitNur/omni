import { getAccessToken, refreshAccessToken } from './blocks';
import { BLOCKS_API_BASE, BLOCKS_PROJECT_KEY, MCP_PROXY_URL } from './config';

const API_BASE = BLOCKS_API_BASE;
const X_BLOCKS_KEY = BLOCKS_PROJECT_KEY;

export interface Website {
  itemId?: string;
  tenantUserId: string;
  name: string;
  slug: string;
  description?: string;
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  settings?: Record<string, any>;
}

export interface Page {
  itemId?: string;
  websiteId: string;
  tenantUserId: string;
  name: string;
  slug: string;
  order: number;
  isHomePage: boolean;
  metaTitle?: string;
  metaDesc?: string;
  layout: any[];
  updatedAt: string;
}

async function request<T>(
  path: string,
  method = 'GET',
  body?: any,
  includeAuth = true,
  retryAuth = true
): Promise<T> {
  const isProxy = !!MCP_PROXY_URL;
  const baseUrl = isProxy ? `${MCP_PROXY_URL}/proxy/data` : `${API_BASE}/uds/v1/data`;
  const url = `${baseUrl}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-blocks-key': X_BLOCKS_KEY,
  };

  const token = includeAuth ? getAccessToken() : null;
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  console.log(`[UDS] ${method} ${path} -> ${res.status}`);

  if (includeAuth && retryAuth && res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return request<T>(path, method, body, includeAuth, false);
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `UDS request failed (${res.status})`);
  }

  return res.json();
}

// ─── Websites CRUD ──────────────────────────────────────────────

export async function createWebsite(payload: Partial<Website>): Promise<Website> {
  if (!payload.tenantUserId) throw new Error("createWebsite: tenantUserId is required");
  const now = new Date().toISOString();
  const res: any = await request<Website>('/websites', 'POST', {
    ...payload,
    createdAt: now,
    updatedAt: now,
  });
  const itemId = res.itemId || res.id || res.data?.itemId;
  return { ...res, itemId };
}

export async function updateWebsite(id: string, payload: Partial<Website>): Promise<Website> {
  return request<Website>(`/websites/${id}`, 'PUT', {
    ...payload,
    updatedAt: new Date().toISOString(),
  });
}

export async function getWebsites(userId: string): Promise<Website[]> {
  if (!userId) throw new Error("getWebsites: userId is required");
  // Selise UDS filter syntax: filter=field:value
  const res: any = await request<Website[] | { items: Website[] }>(`/websites?filter=tenantUserId:${userId}`);
  const items = Array.isArray(res) ? res : res.items || [];
  return items.map((item: any) => ({ ...item, itemId: item.itemId || item.id || item.data?.itemId }));
}

export async function getWebsiteBySlug(slug: string): Promise<Website | null> {
  const results = await getWebsites('dummy'); // This is a bit hacky, better to use the filter directly
  // Actually let's just do it properly
  const res: any = await request<Website[] | { items: Website[] }>(`/websites?filter=slug:${slug}`);
  const items = Array.isArray(res) ? res : res.items || [];
  if (items.length === 0) return null;
  const item = items[0];
  return { ...item, itemId: item.itemId || item.id || item.data?.itemId };
}

// ─── Pages CRUD ─────────────────────────────────────────────────

export async function createPage(payload: Partial<Page>): Promise<Page> {
  const res: any = await request<Page>('/pages', 'POST', {
    ...payload,
    updatedAt: new Date().toISOString(),
  });
  const itemId = res.itemId || res.id || res.data?.itemId;
  return { ...res, itemId };
}

export async function updatePage(id: string, payload: Partial<Page>): Promise<Page> {
  return request<Page>(`/pages/${id}`, 'PUT', {
    ...payload,
    updatedAt: new Date().toISOString(),
  });
}

export async function getPages(websiteId: string, userId: string): Promise<Page[]> {
  if (!userId || !websiteId) throw new Error("getPages: userId and websiteId are required");
  const params = new URLSearchParams({
    filter: `websiteId:${websiteId}`,
    filter2: `tenantUserId:${userId}`,
    sort: 'order:asc'
  });
  const res: any = await request<Page[] | { items: Page[] }>(`/pages?${params.toString()}`);
  const items = Array.isArray(res) ? res : res.items || [];
  return items.map((item: any) => ({ ...item, itemId: item.itemId || item.id || item.data?.itemId }));
}

export async function deletePage(id: string): Promise<void> {
  await request(`/pages/${id}`, 'DELETE');
}

// ─── Composite Helpers ──────────────────────────────────────────

export async function ensureWebsite(userId: string, username: string, defaultName: string): Promise<{ website: Website; pages: Page[] }> {
  let websites = await getWebsites(userId);
  
  // Normalize result (handle both array and paginated object)
  if (!Array.isArray(websites)) {
    websites = (websites as any).items || [];
  }

  if (websites.length > 0) {
    const website = websites[0];
    const pages = await getPages(website.itemId!, userId);
    return { website, pages };
  }

  // Create default website
  const website = await createWebsite({
    name: defaultName,
    slug: username,
    tenantUserId: userId,
    isPublished: false,
  });

  // Create default home page
  const page = await createPage({
    websiteId: website.itemId,
    tenantUserId: userId,
    name: 'Home',
    slug: 'home',
    order: 0,
    isHomePage: true,
    layout: [],
  });

  return { website, pages: [page] };
}
