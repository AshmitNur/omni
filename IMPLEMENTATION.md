# VibeBuilder — Selise Blocks Integration Plan

> Implementation roadmap for integrating Selise Blocks (IDP, UDS/Data, Media/Storage) into the VibeBuilder drag-and-drop website builder SaaS.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Environment Setup](#2-environment-setup)
3. [Auth — Selise IDP Block](#3-auth--selise-idp-block)
4. [Data Schema Design — UDS / Data Gateway](#4-data-schema-design--uds--data-gateway)
5. [Media — Selise Storage Block](#5-media--selise-storage-block)
6. [Frontend Integration Patterns](#6-frontend-integration-patterns)
7. [Workspace Isolation Strategy](#7-workspace-isolation-strategy)
8. [API Call Flows](#8-api-call-flows)
9. [Live Site Renderer](#9-live-site-renderer)
10. [Implementation Phases](#10-implementation-phases)

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                     VIBE BUILDER APP                     │
│  React (Construct boilerplate) + DnD editor + Canvas     │
└────────────────────────┬─────────────────────────────────┘
                         │  REST / GraphQL
          ┌──────────────┼──────────────────┐
          ▼              ▼                  ▼
  ┌───────────┐  ┌──────────────┐  ┌──────────────┐
  │ Selise IDP│  │ Selise UDS   │  │Selise Storage│
  │  (Auth)   │  │ (Data/Schema)│  │  (Media)     │
  └───────────┘  └──────────────┘  └──────────────┘
  Users, Roles,  Website schemas,  Images, assets
  Sessions, MFA  Page JSON layouts
```

**Key principle:** No traditional DB. Every piece of app state — user accounts, website layouts, page configs — is stored inside Selise Blocks services via their APIs.

---

## 2. Environment Setup

### Required environment variables

```env
# Core Blocks config
VITE_BLOCKS_API_URL=https://api.seliseblocks.com
VITE_X_BLOCKS_KEY=your-project-api-key
VITE_PROJECT_SLUG=your-project-slug

# Auth / OIDC (if using social login)
VITE_OIDC_CLIENT_ID=your-client-id
VITE_OIDC_REDIRECT_URI=http://localhost:5173/auth/callback

# Optional CAPTCHA
VITE_CAPTCHA_SITE_KEY=your-captcha-key
VITE_CAPTCHA_TYPE=reCaptcha
```

> Get `X_BLOCKS_KEY` from the Environment Overview page on the Selise Cloud Portal.

### Project scaffold (Construct React)

```bash
# Clone the Construct boilerplate (pre-wired to all Blocks services)
git clone https://github.com/SELISEdigitalplatforms/blocks-construct-react vibebuilder
cd vibebuilder
npm install
```

All auth context, token storage, and refresh logic comes pre-built in Construct — do **not** rewrite from scratch.

---

## 3. Auth — Selise IDP Block

### 3.1 How IDP Works

The Identity Provider (IDP) block handles registration, login, MFA, roles, and session management. All tokens are JWTs issued by Selise's IDP.

**Base URL:** `https://api.seliseblocks.com/idp/v1`

**Required headers on every protected call:**

```
X-Blocks-Key: <your project key>
Authorization: Bearer <access_token>
Content-Type: application/json
```

### 3.2 User Registration Flow

```
1. POST /idp/v1/user/register
   Body: { email, password, firstName, lastName }
   → Returns: { isSuccess: true, itemId: "usr_abc123" }

2. User receives activation email (auto-handled by IDP)

3. User clicks link → POST /idp/v1/user/activate
   Body: { token: "<activation_token>" }
```

**Important IDP convention:** Response envelopes use `isSuccess` (not `success`) and identifiers use `itemId` (not `id`). Silently wrong field names return empty results.

### 3.3 Login Flow

```
1. GET /idp/v1/auth/login-options
   → Returns available methods (password, social, OIDC)

2. POST /idp/v1/auth/token    (application/x-www-form-urlencoded)
   grant_type=password
   username=user@email.com
   password=secret
   client_id=<OIDC_CLIENT_ID>
   → Returns: { access_token, refresh_token, expires_in }

3. If MFA required → branch to MFA flow (see 3.4)

4. Store tokens (Construct handles this in auth context)
```

> **Token endpoint only** uses `application/x-www-form-urlencoded` — all other IDP endpoints use `application/json`.

### 3.4 MFA (Optional but Recommended)

```
Email OTP:
  POST /idp/v1/auth/mfa/email/send   → sends 5-digit OTP
  POST /idp/v1/auth/mfa/email/verify  Body: { otp: "12345" }

TOTP (Authenticator App):
  POST /idp/v1/auth/mfa/totp/enroll  → returns QR code / secret
  POST /idp/v1/auth/mfa/totp/verify   Body: { code: "123456" }
```

### 3.5 Roles and Permissions (RBAC)

Two roles are needed for VibeBuilder:

| Role | Description |
|------|-------------|
| `vibe_user` | Standard user — can create/edit their own sites |
| `vibe_admin` | Admin — can view all tenants |

```
1. POST /idp/v1/role/create
   Body: { name: "vibe_user", description: "Website builder user" }
   → { isSuccess: true, itemId: "role_xyz" }

2. POST /idp/v1/permission/create
   Body: { name: "website:write", roleId: "role_xyz" }

3. POST /idp/v1/user/role/assign
   Body: { userId: "usr_abc123", roleId: "role_xyz" }
```

Assign `vibe_user` role automatically on registration via a post-registration hook or admin API call.

### 3.6 Session Management

```
Logout:
  POST /idp/v1/auth/logout
  Header: Authorization: Bearer <access_token>

List active sessions:
  GET /idp/v1/auth/sessions

Logout all devices:
  POST /idp/v1/auth/logout/all
```

### 3.7 Auth Service (TypeScript)

```typescript
// src/services/auth.service.ts

const BASE = import.meta.env.VITE_BLOCKS_API_URL;
const KEY  = import.meta.env.VITE_X_BLOCKS_KEY;

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'password',
    username: email,
    password,
    client_id: import.meta.env.VITE_OIDC_CLIENT_ID,
  });

  const res = await fetch(`${BASE}/idp/v1/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Blocks-Key': KEY,
    },
    body,
  });

  if (!res.ok) throw new Error('Login failed');
  return res.json();
}

export async function registerUser(data: {
  email: string; password: string; firstName: string; lastName: string;
}) {
  const res = await fetch(`${BASE}/idp/v1/user/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Blocks-Key': KEY },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.isSuccess) throw new Error('Registration failed');
  return json.itemId; // user ID
}
```

---

## 4. Data Schema Design — UDS / Data Gateway

All website data is stored in the **Selise UDS (Unified Data Service)** block, which provides schema-based dynamic storage with GraphQL access. Think of it as a flexible JSON document store with a defined schema layer.

### 4.1 Schema: `websites`

Stores one document per website project owned by a user.

```json
{
  "schemaName": "websites",
  "fields": [
    { "name": "tenantUserId",  "type": "string",  "required": true, "indexed": true },
    { "name": "name",          "type": "string",  "required": true },
    { "name": "slug",          "type": "string",  "required": true, "unique": true },
    { "name": "description",   "type": "string",  "required": false },
    { "name": "isPublished",   "type": "boolean", "default": false },
    { "name": "publishedAt",   "type": "datetime","required": false },
    { "name": "createdAt",     "type": "datetime","required": true },
    { "name": "updatedAt",     "type": "datetime","required": true },
    { "name": "settings",      "type": "json",    "required": false }
  ]
}
```

`settings` (JSON) stores site-wide config like global colors, fonts, favicon URL:

```json
{
  "primaryColor": "#6366f1",
  "fontFamily": "Inter",
  "faviconUrl": "https://media.seliseblocks.com/...",
  "customDomain": null
}
```

---

### 4.2 Schema: `pages`

One document per page within a website.

```json
{
  "schemaName": "pages",
  "fields": [
    { "name": "websiteId",   "type": "string",  "required": true, "indexed": true },
    { "name": "tenantUserId","type": "string",  "required": true, "indexed": true },
    { "name": "name",        "type": "string",  "required": true },
    { "name": "slug",        "type": "string",  "required": true },
    { "name": "order",       "type": "number",  "required": true },
    { "name": "isHomePage",  "type": "boolean", "default": false },
    { "name": "metaTitle",   "type": "string",  "required": false },
    { "name": "metaDesc",    "type": "string",  "required": false },
    { "name": "layout",      "type": "json",    "required": true },
    { "name": "updatedAt",   "type": "datetime","required": true }
  ]
}
```

The critical field is `layout` — a JSON array that is the serialized drag-and-drop canvas state:

```json
{
  "layout": [
    {
      "id": "block_001",
      "type": "HeroSection",
      "order": 0,
      "props": {
        "heading": "Welcome to My Site",
        "subheading": "Built with VibeBuilder",
        "backgroundImage": "https://media.seliseblocks.com/img/hero-bg.jpg",
        "ctaText": "Get Started",
        "ctaLink": "/about",
        "textColor": "#ffffff",
        "overlayOpacity": 0.5
      }
    },
    {
      "id": "block_002",
      "type": "TextBlock",
      "order": 1,
      "props": {
        "content": "<p>This is rich text content...</p>",
        "alignment": "center",
        "padding": "40px 20px"
      }
    },
    {
      "id": "block_003",
      "type": "ImageGallery",
      "order": 2,
      "props": {
        "images": [
          { "url": "https://media.seliseblocks.com/img/photo1.jpg", "alt": "Photo 1" },
          { "url": "https://media.seliseblocks.com/img/photo2.jpg", "alt": "Photo 2" }
        ],
        "columns": 3,
        "gap": "16px"
      }
    },
    {
      "id": "block_004",
      "type": "ContactForm",
      "order": 3,
      "props": {
        "fields": ["name", "email", "message"],
        "submitLabel": "Send Message",
        "recipientEmail": "owner@example.com"
      }
    }
  ]
}
```

**Design rationale:** The `layout` array is ordered (by the `order` field on each block), self-describing via `type`, and fully JSON-serializable — making it trivial to save to UDS and reconstruct on render.

---

### 4.3 Schema: `media_assets`

Tracks all uploaded media associated with a user's websites (metadata only; binary is in Selise Storage).

```json
{
  "schemaName": "media_assets",
  "fields": [
    { "name": "tenantUserId", "type": "string",  "required": true, "indexed": true },
    { "name": "websiteId",    "type": "string",  "required": false },
    { "name": "fileName",     "type": "string",  "required": true },
    { "name": "mimeType",     "type": "string",  "required": true },
    { "name": "fileSize",     "type": "number",  "required": true },
    { "name": "storageUrl",   "type": "string",  "required": true },
    { "name": "uploadedAt",   "type": "datetime","required": true }
  ]
}
```

---

### 4.4 CRUD Operations via UDS API

**Create a website:**

```typescript
// POST /uds/v1/data/websites
async function createWebsite(token: string, payload: {
  name: string; slug: string; tenantUserId: string;
}) {
  return fetch(`${BASE}/uds/v1/data/websites`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Blocks-Key': KEY,
    },
    body: JSON.stringify({ ...payload, isPublished: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }),
  }).then(r => r.json());
}
```

**Save page layout (auto-save on drag):**

```typescript
// PUT /uds/v1/data/pages/:pageId
async function savePageLayout(token: string, pageId: string, layout: LayoutBlock[]) {
  return fetch(`${BASE}/uds/v1/data/pages/${pageId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Blocks-Key': KEY,
    },
    body: JSON.stringify({ layout, updatedAt: new Date().toISOString() }),
  }).then(r => r.json());
}
```

**Fetch all pages for a website:**

```typescript
// GET /uds/v1/data/pages?filter=websiteId:<id>&filter=tenantUserId:<uid>
async function getPagesForWebsite(token: string, websiteId: string, userId: string) {
  const params = new URLSearchParams({
    'filter': `websiteId:${websiteId}`,
    'filter2': `tenantUserId:${userId}`,
    'sort': 'order:asc'
  });
  return fetch(`${BASE}/uds/v1/data/pages?${params}`, {
    headers: { 'Authorization': `Bearer ${token}`, 'X-Blocks-Key': KEY },
  }).then(r => r.json());
}
```

---

## 5. Media — Selise Storage Block

All user-uploaded images go through the **Selise Storage** block.

### 5.1 Upload Flow

```
1. User selects image in editor (image gallery block or hero background picker)
2. Frontend → POST /storage/v1/upload  (multipart/form-data)
3. Selise returns: { url: "https://media.seliseblocks.com/...", fileId: "..." }
4. URL is stored in the block's props.backgroundImage / props.images[]
5. Save media_asset metadata record to UDS (optional, for media library UI)
```

```typescript
async function uploadImage(token: string, file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  form.append('visibility', 'public'); // public for live site serving

  const res = await fetch(`${BASE}/storage/v1/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Blocks-Key': KEY,
    },
    body: form,
  });

  const data = await res.json();
  return data.url; // CDN-served URL, store directly in block props
}
```

**Key point:** Store the `url` directly inside the block's JSON props. Since all images are CDN-served by Selise, no proxying is needed on the renderer side.

---

## 6. Frontend Integration Patterns

### 6.1 Auth Context (using Construct's built-in)

Construct provides a pre-built `AuthContext`. Wrap your app:

```tsx
// src/main.tsx
import { AuthProvider } from '@selise/construct-react';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
```

Consume in components:

```tsx
const { user, accessToken, logout } = useAuth();
```

`user.sub` is the `tenantUserId` — use this everywhere to scope data queries.

### 6.2 Auto-save on Drag

Use a **debounced save** to avoid calling the UDS API on every pixel drag:

```typescript
import { useMemo } from 'react';
import { debounce } from 'lodash-es';

const debouncedSave = useMemo(
  () => debounce((layout: LayoutBlock[]) => {
    savePageLayout(accessToken, currentPageId, layout);
  }, 1200), // 1.2s after last change
  [accessToken, currentPageId]
);

// Call this whenever layout state changes
useEffect(() => { debouncedSave(layout); }, [layout]);
```

### 6.3 TypeScript Types

```typescript
// src/types/vibe.ts

export type ComponentType =
  | 'HeroSection'
  | 'TextBlock'
  | 'ImageGallery'
  | 'ContactForm'
  | 'Divider'
  | 'VideoEmbed'
  | 'Testimonial'
  | 'PricingTable';

export interface LayoutBlock {
  id: string;
  type: ComponentType;
  order: number;
  props: Record<string, unknown>;
}

export interface Page {
  itemId: string;
  websiteId: string;
  tenantUserId: string;
  name: string;
  slug: string;
  order: number;
  isHomePage: boolean;
  metaTitle?: string;
  layout: LayoutBlock[];
  updatedAt: string;
}

export interface Website {
  itemId: string;
  tenantUserId: string;
  name: string;
  slug: string;
  isPublished: boolean;
  settings: SiteSettings;
  createdAt: string;
}

export interface SiteSettings {
  primaryColor: string;
  fontFamily: string;
  faviconUrl?: string;
}
```

---

## 7. Workspace Isolation Strategy

Since UDS doesn't have row-level security baked in automatically, workspace isolation is enforced in two layers:

**Layer 1 — Query-time filter:** Every data fetch includes `tenantUserId` as a filter param matching `user.sub` from the JWT. A user can only request their own data.

**Layer 2 — Server-side policy (UDS Access Policies):** Configure a UDS Access Policy that enforces:

```json
{
  "policy": "owner-only",
  "field": "tenantUserId",
  "claimSource": "jwt.sub"
}
```

This means even if someone crafts a request with another user's `websiteId`, UDS will reject it because their JWT `sub` won't match the `tenantUserId` on the record.

**Never return all records without a user filter.** Always compose queries as:

```
GET /uds/v1/data/websites?filter=tenantUserId:<user.sub>
```

---

## 8. API Call Flows

### 8.1 New User Onboarding

```
Register → Activate Email → Login → Assign vibe_user Role
    → Create default Website ("My First Site")
    → Create default Page ("Home", slug: "home", isHomePage: true, layout: [])
    → Redirect to Editor
```

### 8.2 Editor Load

```
Editor opens for page X
    → GET /uds/v1/data/pages/:pageId  (with tenantUserId filter)
    → Parse layout JSON → hydrate DnD canvas
    → Subscribe to auto-save debounce
```

### 8.3 Publish

```
User clicks "Publish"
    → PUT /uds/v1/data/websites/:websiteId  { isPublished: true, publishedAt: now }
    → Live renderer route becomes publicly accessible
    → All page slugs resolve under /site/:websiteSlug/:pageSlug
```

---

## 9. Live Site Renderer

The renderer reads published site data and renders it without auth.

```
Route: /site/:siteSlug/:pageSlug

1. GET /uds/v1/data/websites?filter=slug:<siteSlug>&filter=isPublished:true
   → if not found → 404

2. GET /uds/v1/data/pages?filter=websiteId:<id>&filter=slug:<pageSlug>
   → Parse layout[]

3. For each block in layout:
   → Render <VibeComponent type={block.type} props={block.props} />

4. Navigation links between pages:
   → /site/<siteSlug>/<page.slug>  for each page in the site
```

The renderer is a **separate route** (or separate Next.js app) that only performs reads — no auth token needed because published site data is public.

**Component renderer:**

```tsx
// src/renderer/VibeRenderer.tsx
import { HeroSection, TextBlock, ImageGallery, ContactForm } from '../components/vibe';

const COMPONENT_MAP: Record<ComponentType, React.FC<any>> = {
  HeroSection,
  TextBlock,
  ImageGallery,
  ContactForm,
  // ...
};

export function VibeRenderer({ layout }: { layout: LayoutBlock[] }) {
  const sorted = [...layout].sort((a, b) => a.order - b.order);
  return (
    <main>
      {sorted.map(block => {
        const Comp = COMPONENT_MAP[block.type];
        return Comp ? <Comp key={block.id} {...block.props} /> : null;
      })}
    </main>
  );
}
```

---

## 10. Implementation Phases

| Phase | Scope | Selise Blocks Used |
|-------|-------|--------------------|
| **Phase 1** — Auth Foundation | Registration, login, MFA, role assignment | IDP Block |
| **Phase 2** — Data Layer | Define UDS schemas, test CRUD for websites + pages | UDS / Data Gateway |
| **Phase 3** — Editor Core | DnD canvas, component library, block prop editor | — |
| **Phase 4** — Auto-save | Debounced layout serialization → UDS | UDS |
| **Phase 5** — Media | Image upload widget, media library UI | Storage Block |
| **Phase 6** — Publish + Renderer | Publish toggle, live site renderer, public routing | UDS (read-only) |
| **Phase 7** — Polish | Multi-page nav, site settings, SEO meta, LMT observability | IDP sessions, LMT |

---

## Quick Reference: Key API Endpoints

| Action | Method + Path |
|--------|--------------|
| Register user | `POST /idp/v1/user/register` |
| Login (get token) | `POST /idp/v1/auth/token` (form-encoded) |
| Logout | `POST /idp/v1/auth/logout` |
| Assign role | `POST /idp/v1/user/role/assign` |
| Create schema record | `POST /uds/v1/data/:schemaName` |
| Update schema record | `PUT /uds/v1/data/:schemaName/:id` |
| Query schema records | `GET /uds/v1/data/:schemaName?filter=field:value` |
| Delete schema record | `DELETE /uds/v1/data/:schemaName/:id` |
| Upload media | `POST /storage/v1/upload` (multipart) |

---

*Aligned with Selise Blocks Cloud docs (docs.seliseblocks.com) and blocks-skills GitHub repo conventions as of May 2026.*
