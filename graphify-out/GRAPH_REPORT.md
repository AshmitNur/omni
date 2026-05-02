# Graph Report - UPE  (2026-05-02)

## Corpus Check
- 27 files · ~19,506 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 132 nodes · 245 edges · 11 communities detected
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]

## God Nodes (most connected - your core abstractions)
1. `normalizeSiteData()` - 11 edges
2. `normalizeContentRecord()` - 11 edges
3. `isRecord()` - 10 edges
4. `postContent()` - 10 edges
5. `slugify()` - 10 edges
6. `readString()` - 9 edges
7. `postGraphql()` - 9 edges
8. `buildContentPayload()` - 8 edges
9. `upsertSiteContent()` - 8 edges
10. `getAccessToken()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `getAccessToken()` --calls--> `getHeaders()`  [INFERRED]
  src\lib\blocks.ts → src\lib\content.ts
- `getAccessToken()` --calls--> `getSiteContentBySlug()`  [INFERRED]
  src\lib\blocks.ts → src\lib\content.ts
- `getAccessToken()` --calls--> `getAuthHeaders()`  [INFERRED]
  src\lib\blocks.ts → src\lib\media.ts
- `getAccessToken()` --calls--> `uploadViaLegacyEndpoint()`  [INFERRED]
  src\lib\blocks.ts → src\lib\media.ts
- `loginWithPassword()` --calls--> `handleLogin()`  [INFERRED]
  src\lib\blocks.ts → src\pages\Login.tsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.16
Nodes (18): activateAccount(), cacheUser(), clearSession(), createTokenBody(), fetchCurrentAccount(), getAccessToken(), getHeaders(), getRefreshToken() (+10 more)

### Community 1 - "Community 1"
Cohesion: 0.27
Nodes (17): assertSupportedImage(), collectConfigurationNames(), fetchStorageConfigurationNames(), fileToDataUrl(), getAuthHeaders(), getPreSignedUrl(), getRequestCredentials(), getResponseErrorMessage() (+9 more)

### Community 2 - "Community 2"
Cohesion: 0.17
Nodes (2): cn(), metalButtonVariants()

### Community 3 - "Community 3"
Cohesion: 0.26
Nodes (9): handlePropChange(), addComponent(), getErrorMessage(), handleDragEnd(), handleOpenLiveSite(), handleSave(), removeComponent(), updateActivePage() (+1 more)

### Community 4 - "Community 4"
Cohesion: 0.5
Nodes (8): ensureSiteContent(), getHeaders(), getRequestCredentials(), getSiteContentByOwner(), isHostedBlocksRuntime(), parseResponse(), postContent(), upsertSiteContent()

### Community 5 - "Community 5"
Cohesion: 0.5
Nodes (9): createContentError(), isAuthError(), isRecord(), normalizeContentRecord(), postGraphql(), readField(), readRecord(), readString() (+1 more)

### Community 6 - "Community 6"
Cohesion: 0.43
Nodes (6): getInventorySiteBySlug(), getPublicSitePath(), getSiteContentBySlug(), normalizePageSlug(), slugify(), fetchSite()

### Community 7 - "Community 7"
Cohesion: 0.38
Nodes (7): decodeSiteData(), getLocalSiteData(), getPreferredUsername(), normalizeInventorySiteRecord(), normalizeSiteData(), setLocalSiteData(), loadData()

### Community 8 - "Community 8"
Cohesion: 0.33
Nodes (2): useAuth(), ProtectedRoute()

### Community 9 - "Community 9"
Cohesion: 0.47
Nodes (6): buildContentPayload(), buildInventoryContentInput(), encodeSiteData(), getInventorySiteByOwner(), inventoryFilter(), upsertInventorySiteContent()

### Community 10 - "Community 10"
Cohesion: 0.67
Nodes (2): handleResize(), initScene()

## Knowledge Gaps
- **Thin community `Community 2`** (12 nodes): `cn()`, `liquid-glass-button.tsx`, `utils.ts`, `handleInternalMouseDown()`, `handleInternalMouseEnter()`, `handleInternalMouseLeave()`, `handleInternalMouseUp()`, `handleInternalTouchCancel()`, `handleInternalTouchEnd()`, `handleInternalTouchStart()`, `metalButtonVariants()`, `ShineEffect()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 8`** (6 nodes): `useAuth()`, `getBaseRoute()`, `PageWrapper()`, `ProtectedRoute()`, `App.tsx`, `AuthContext.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 10`** (4 nodes): `web-gl-shader.tsx`, `animate()`, `handleResize()`, `initScene()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getAccessToken()` connect `Community 0` to `Community 1`, `Community 4`, `Community 6`?**
  _High betweenness centrality (0.199) - this node is a cross-community bridge._
- **Why does `getHeaders()` connect `Community 4` to `Community 0`, `Community 5`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Why does `refreshAccessToken()` connect `Community 0` to `Community 4`, `Community 5`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._