# Universal Profile Engine — Product Requirements Document

**Project:** CSE226 Vibe Coding Project  
**Version:** 1.0  
**Status:** Draft  
**Classification:** Internal / Academic

---

## 1. Executive Summary

The Universal Profile Engine is a **multi-tenant SaaS website builder** that empowers any user to establish a personal digital presence in minutes — without writing a single line of code. Users sign up, fill in their profile data, upload media, and receive a unique public URL showcasing their professional identity.

The platform is built frontend-first, orchestrating **Selise Blocks** (IAM, Media, Content) as the sole backend infrastructure. No custom databases or API servers are permitted for core features.

---

## 2. Problem Statement

Professionals and students struggle to maintain an accessible, up-to-date digital presence. Existing solutions (LinkedIn, Linktree, personal portfolios) either lock users into rigid templates or require coding knowledge. The Universal Profile Engine removes both barriers by offering:

- Zero-code profile creation
- Instant public hosting at a unique URL
- Full control over identity, media, and social links
- Powered by enterprise-grade blocks (Selise ecosystem)

---

## 3. Goals & Success Metrics

| Goal | Metric |
|------|--------|
| Seamless onboarding | New user can register, log in, and publish a profile in under 5 minutes |
| Data persistence | Profile data survives logout/login with 100% fidelity |
| Public accessibility | Public profile URL loads without authentication |
| Media upload success | Profile picture and header image upload with no manual refresh required |
| Multi-tenancy | Each user's data is fully isolated; one user cannot see another's draft data |

---

## 4. Scope

### In Scope
- User registration and authentication (Selise IAM Block)
- Profile editor dashboard (authenticated)
- Media upload for profile picture and header image (Selise Media Block)
- Data persistence for all profile fields (Selise Content Block)
- Public profile renderer accessible via unique URL
- Responsive design (desktop + mobile)

### Out of Scope
- Custom domain mapping
- Analytics / visitor tracking
- Real-time collaboration
- Payment / subscription management
- Template marketplace
- SEO optimization tooling

---

## 5. User Personas

### Persona A — "The Student"
- University student building a portfolio for internship applications
- Non-technical; comfortable with form-based UIs
- Wants something up within 10 minutes

### Persona B — "The Professional"
- Mid-level developer or designer
- Wants control over bio, links, and profile image
- Expects the public page to look polished enough to share with recruiters

### Persona C — "The Visitor"
- Recruiter, peer, or professor viewing a shared link
- Not logged in; expects fast, clean, no-friction page load

---

## 6. User Stories

### Authentication Layer

| ID | Role | Story | Acceptance Criteria |
|----|------|-------|---------------------|
| US-01 | New User | I want to create an account using my email and a password | Registration form validates email format; duplicate email shows error; on success, user is redirected to Editor |
| US-02 | Returning User | I want to log in and be taken directly to my editor | Valid credentials redirect to Editor; invalid credentials show clear error message |
| US-03 | Unauthenticated User | I should be blocked from accessing the editor | Any direct navigation to `/editor` redirects to `/login` |
| US-04 | Logged-in User | I want to log out and have my session fully cleared | Post-logout, navigating back to `/editor` requires re-authentication |

### Site Editor (Creator Dashboard)

| ID | Role | Story | Acceptance Criteria |
|----|------|-------|---------------------|
| US-05 | Authenticated User | I want to update my display name and headline | Changes reflect immediately in the editor preview; persisted to Selise Content Block on save |
| US-06 | Authenticated User | I want to write a multi-line "About Me" bio | Textarea supports line breaks; renders correctly on the public profile |
| US-07 | Authenticated User | I want to upload a profile picture | Accepts JPG/PNG/WEBP; upload goes to Selise Media Block; returned URL is stored in Content Block |
| US-08 | Authenticated User | I want to upload a header/banner image | Same upload flow as profile picture with separate field mapping |
| US-09 | Authenticated User | I want to add/edit/remove social links (LinkedIn, GitHub, Portfolio) | Each link validates URL format; stored in Content Block; removal clears field |
| US-10 | Authenticated User | I want my data pre-filled when I return to the editor | On login, editor fetches existing data from Content Block and populates all fields |

### Public Profile Renderer

| ID | Role | Story | Acceptance Criteria |
|----|------|-------|---------------------|
| US-11 | Visitor | I want to view a user's public profile via a unique URL | URL pattern: `/profile/:username` or `/profile/:id`; loads without authentication |
| US-12 | Visitor | I want to see the user's profile image, bio, and social links | All uploaded images render from Selise Media URLs; links open in new tab |
| US-13 | Visitor | I want the page to load fast and look professional | No login prompt; clean layout with no broken image states |

---

## 7. Functional Requirements

### 7.1 Authentication (Selise IAM Block)

- **FR-01:** Integrate Selise IAM Block for user registration (email + password minimum)
- **FR-02:** Implement session management via IAM tokens; store securely (HttpOnly cookie or memory — not localStorage)
- **FR-03:** Implement route guards; all `/editor/*` routes require valid session
- **FR-04:** Expose a logout function that invalidates the session token

### 7.2 Content Schema (Selise Content Block)

Design the following schema within the Selise dashboard:

| Field Name | Type | Description |
|------------|------|-------------|
| `user_id` | String (unique) | Foreign key to IAM user |
| `username` | String (unique) | URL-safe slug for public profile |
| `display_name` | String | Full display name |
| `headline` | String | Professional tagline (max 120 chars) |
| `bio_text` | Long Text | Multi-line "About Me" section |
| `profile_image_url` | String (URL) | Returned URL from Media Block |
| `header_image_url` | String (URL) | Returned URL from Media Block |
| `linkedin_url` | String (URL) | LinkedIn profile link |
| `github_url` | String (URL) | GitHub profile link |
| `portfolio_url` | String (URL) | Personal portfolio or external link |
| `created_at` | Timestamp | Auto-set on first save |
| `updated_at` | Timestamp | Auto-updated on each save |

- **FR-05:** On first login, check if a Content record exists for the user; if not, create a blank record
- **FR-06:** All save operations use upsert logic (create if new, update if exists)
- **FR-07:** Public profile fetch queries Content Block by `username` or `user_id` without requiring auth

### 7.3 Media (Selise Media Block)

- **FR-08:** Profile picture upload: accepts image files; sends to Media Block; stores returned URL in Content Block field `profile_image_url`
- **FR-09:** Header image upload: same flow, stored in `header_image_url`
- **FR-10:** Display upload progress indicator; show error on failed upload
- **FR-11:** Allow image replacement (re-upload overwrites the URL in Content Block)

### 7.4 Public Renderer

- **FR-12:** Public route `/profile/:id` or `/u/:username` renders profile data fetched from Content Block
- **FR-13:** No authentication required; Selise Content Block read must be configured for public read access on this endpoint
- **FR-14:** Handle missing profiles gracefully (404 state with a friendly message)

---

## 8. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | Public profile page must achieve First Contentful Paint < 2s on a standard connection |
| Responsiveness | All views must be functional on viewport widths from 375px to 1440px |
| Security | No Selise API keys exposed in client-side code; use environment variables |
| Accessibility | Minimum WCAG 2.1 AA compliance for form elements and images (alt text) |
| Error Handling | All API failures must surface user-readable error messages; no raw stack traces |
| State Management | Editor state must not be lost on accidental page refresh (auto-save or draft persistence) |

---

## 9. Technical Constraints

1. **No Custom Backend:** SQL, NoSQL, and custom REST/GraphQL API servers are prohibited for core features
2. **Selise Blocks Only:** IAM, Media, and Content Blocks are the sole permitted data infrastructure
3. **Frontend-First Architecture:** All logic is orchestration of Selise API calls
4. **Schema in Selise Dashboard:** Content schema must be configured in the Selise admin UI, not code-defined

---

## 10. Technical Stack (Recommended)

| Layer | Technology |
|-------|-----------|
| Framework | React (Vite) or Next.js |
| Styling | Tailwind CSS |
| State | Zustand or React Context |
| Routing | React Router v6 / Next.js App Router |
| API Calls | Fetch API or Axios |
| Auth Storage | Secure session token (IAM-managed) |
| Hosting | Vercel / Netlify (frontend only) |

---

## 11. Page & Route Map

```
/                   → Landing / Marketing page (optional)
/register           → Registration form (IAM Block)
/login              → Login form (IAM Block)
/editor             → Creator Dashboard (authenticated)
  /editor/profile   → Identity & bio editing
  /editor/media     → Image upload management
  /editor/links     → Social links management
/profile/:username  → Public profile renderer (no auth)
/404                → Not found fallback
```

---

## 12. Acceptance Criteria Summary

The project is considered complete when:

- [ ] A new user can register and log in via Selise IAM
- [ ] The editor is inaccessible without a valid session
- [ ] All profile fields can be edited and saved to Selise Content Block
- [ ] Profile and header images upload via Selise Media Block and display correctly
- [ ] Social links are validated and persisted
- [ ] A public URL renders the complete profile without requiring login
- [ ] Data persists across logout/login cycles
- [ ] The UI is responsive on mobile and desktop

---

## 13. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Selise Block API rate limits | Medium | Implement debounced saves; cache fetched data |
| Selise IAM token expiry mid-session | Low | Implement token refresh logic or re-auth prompt |
| Media Block URL instability | Low | Store full absolute URLs; do not rely on relative paths |
| Public Content Block read permission misconfiguration | High | Test public fetch early in development; document required Selise dashboard settings |

---

*End of PRD*
