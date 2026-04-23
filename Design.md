# Universal Profile Engine — Design System & UI Specification

**Document Type:** Design Reference  
**Theme:** Obsidian · Metallic · Premium Frosted Glass  
**Version:** 1.0

---

## 1. Design Philosophy

The Universal Profile Engine presents itself as a **premium, serious tool** — not a toy. The aesthetic draws from high-end macOS/visionOS UI patterns: deep obsidian backgrounds, surfaces that appear to float in frosted glass, and metallic accents that signal precision and trust.

Every surface has **depth**. Every interaction has **weight**. The UI never feels flat.

> **Design Mantra:** *"Forged in obsidian. Finished in chrome."*

---

## 2. Color System

### 2.1 Base Palette

```css
:root {
  /* === OBSIDIAN BASE === */
  --color-void:          #07080A;   /* deepest background — near black */
  --color-obsidian:      #0D0F12;   /* primary app background */
  --color-obsidian-mid:  #131619;   /* card/panel backgrounds */
  --color-obsidian-lift: #1A1D22;   /* elevated surfaces */
  --color-obsidian-rim:  #20242B;   /* subtle borders, dividers */

  /* === METALLIC ACCENTS === */
  --color-chrome-dark:   #3A3F4A;   /* muted chrome */
  --color-chrome:        #6B7280;   /* neutral metallic */
  --color-chrome-light:  #9CA3AF;   /* highlight chrome */
  --color-silver:        #C8CDD6;   /* bright metallic, headings */
  --color-platinum:      #E8ECF0;   /* near-white, primary text */

  /* === FROSTED GLASS === */
  --glass-bg:            rgba(255, 255, 255, 0.04);
  --glass-bg-hover:      rgba(255, 255, 255, 0.07);
  --glass-bg-active:     rgba(255, 255, 255, 0.10);
  --glass-border:        rgba(255, 255, 255, 0.08);
  --glass-border-bright: rgba(255, 255, 255, 0.16);
  --glass-shine:         rgba(255, 255, 255, 0.03);   /* top-edge specular */

  /* === METALLIC GRADIENT === */
  --grad-metal:          linear-gradient(135deg, #3A3F4A 0%, #6B7280 40%, #9CA3AF 60%, #6B7280 100%);
  --grad-chrome:         linear-gradient(180deg, #C8CDD6 0%, #8C9199 50%, #C8CDD6 100%);

  /* === ACCENT (Selective Use) === */
  --color-accent:        #5B8DEF;   /* electric steel-blue */
  --color-accent-glow:   rgba(91, 141, 239, 0.20);
  --color-accent-muted:  rgba(91, 141, 239, 0.12);

  /* === SEMANTIC === */
  --color-success:       #3FB97A;
  --color-error:         #E05C6B;
  --color-warning:       #D4924A;
}
```

### 2.2 Color Usage Rules

| Element | Token |
|---------|-------|
| App background | `--color-obsidian` |
| Cards, panels | `--glass-bg` over `--color-obsidian-mid` |
| Primary text | `--color-platinum` |
| Secondary text | `--color-chrome-light` |
| Muted/label text | `--color-chrome` |
| Active borders | `--glass-border-bright` |
| Inactive borders | `--glass-border` |
| CTA buttons | `--color-accent` with glow |
| Metallic headings | `--grad-chrome` via `background-clip: text` |

---

## 3. Typography

### 3.1 Typeface Selection

```css
/* === DISPLAY — Headings & Branding === */
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap');
--font-display: 'Syne', sans-serif;

/* === BODY — UI Text & Forms === */
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');
--font-body: 'DM Sans', sans-serif;

/* === MONO — Code, IDs, Tags === */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400&display=swap');
--font-mono: 'JetBrains Mono', monospace;
```

**Why these fonts:**
- **Syne** — geometric, editorial, slightly cold. Perfect for a premium tool.
- **DM Sans** — warm but precise. Prevents the UI from feeling sterile.
- **JetBrains Mono** — for usernames, IDs, and URL slugs; reinforces the technical platform feel.

### 3.2 Type Scale

```css
--text-2xs:  0.625rem;   /* 10px — metadata, tags */
--text-xs:   0.75rem;    /* 12px — captions, hints */
--text-sm:   0.875rem;   /* 14px — secondary labels */
--text-base: 1rem;       /* 16px — body, form inputs */
--text-lg:   1.125rem;   /* 18px — section headers */
--text-xl:   1.25rem;    /* 20px — card titles */
--text-2xl:  1.5rem;     /* 24px — page headings */
--text-3xl:  1.875rem;   /* 30px — hero text */
--text-4xl:  2.25rem;    /* 36px — display */
--text-5xl:  3rem;       /* 48px — brand moments */
```

### 3.3 Typography Styles

```css
.text-brand-hero {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: var(--text-5xl);
  background: var(--grad-chrome);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.03em;
  line-height: 1.05;
}

.text-section-heading {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--text-2xl);
  color: var(--color-silver);
  letter-spacing: -0.02em;
}

.text-body {
  font-family: var(--font-body);
  font-weight: 400;
  font-size: var(--text-base);
  color: var(--color-chrome-light);
  line-height: 1.65;
}

.text-label {
  font-family: var(--font-body);
  font-weight: 500;
  font-size: var(--text-sm);
  color: var(--color-chrome);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
```

---

## 4. Glassmorphism System

### 4.1 Glass Surface Recipe

All floating panels, cards, modals, and nav elements use this pattern:

```css
.glass-surface {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-top: 1px solid var(--glass-border-bright);    /* specular top edge */
  border-radius: 16px;
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  box-shadow:
    0 0 0 0.5px rgba(255,255,255,0.04) inset,          /* inner rim */
    0 4px 24px rgba(0, 0, 0, 0.40),                    /* depth shadow */
    0 1px 2px rgba(0, 0, 0, 0.60);                     /* grounding shadow */
}

.glass-surface:hover {
  background: var(--glass-bg-hover);
  border-color: var(--glass-border-bright);
  transition: all 180ms ease;
}
```

### 4.2 Glass Depth Levels

| Level | Usage | Blur | BG Opacity |
|-------|-------|------|------------|
| `glass-0` | Modals, overlays | `blur(32px)` | `0.06` |
| `glass-1` | Cards, panels | `blur(24px)` | `0.04` |
| `glass-2` | Inputs, fields | `blur(12px)` | `0.03` |
| `glass-3` | Subtle chips, tags | `blur(8px)` | `0.05` |

### 4.3 Metallic Border Effect

For key UI elements (active cards, selected states, CTA zones):

```css
.metallic-border {
  border: 1px solid transparent;
  background-clip: padding-box;
  position: relative;
}

.metallic-border::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  background: var(--grad-metal);
  z-index: -1;
  opacity: 0.4;
}
```

---

## 5. Component Specifications

### 5.1 Navigation Bar

```
┌──────────────────────────────────────────────────────────────────┐
│  ◈ Universal Profile Engine          [Profile ▾]   [Log Out]    │
└──────────────────────────────────────────────────────────────────┘
```

- Fixed top, `height: 60px`
- Full-width glass surface: `blur(24px)`, `border-bottom: 1px solid var(--glass-border)`
- Logo: Syne Bold, metallic gradient text
- Avatar: 32px circle with metallic ring border
- Subtle ambient glow line on bottom edge using `box-shadow`

### 5.2 Form Inputs

```css
.input-field {
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  color: var(--color-platinum);
  font-family: var(--font-body);
  font-size: var(--text-base);
  padding: 12px 16px;
  transition: border-color 200ms, box-shadow 200ms;
}

.input-field:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-muted);
}

.input-field::placeholder {
  color: var(--color-chrome-dark);
}
```

Labels use `.text-label` style — uppercase, tracked, chrome color. They sit **above** the input with 6px spacing.

### 5.3 Primary Button (CTA)

```css
.btn-primary {
  background: var(--color-accent);
  border: 1px solid rgba(91, 141, 239, 0.4);
  border-radius: 10px;
  color: #fff;
  font-family: var(--font-body);
  font-weight: 500;
  font-size: var(--text-sm);
  padding: 10px 20px;
  letter-spacing: 0.02em;
  box-shadow: 0 0 20px var(--color-accent-glow);
  transition: all 150ms ease;
}

.btn-primary:hover {
  filter: brightness(1.1);
  box-shadow: 0 0 32px var(--color-accent-glow);
  transform: translateY(-1px);
}
```

### 5.4 Ghost Button (Secondary)

```css
.btn-ghost {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border-bright);
  border-radius: 10px;
  color: var(--color-chrome-light);
  padding: 10px 20px;
  backdrop-filter: blur(8px);
  transition: all 150ms ease;
}

.btn-ghost:hover {
  background: var(--glass-bg-active);
  color: var(--color-platinum);
}
```

### 5.5 Profile Picture Upload Zone

```
┌─────────────────────────────────────────┐
│                                         │
│         [ ◈ Drop image here ]          │
│          or click to browse             │
│                                         │
│    Accepts JPG · PNG · WEBP · Max 5MB  │
│                                         │
└─────────────────────────────────────────┘
```

- Dashed border using SVG dash pattern in `var(--glass-border-bright)`
- Hover state: border animates to metallic gradient, subtle background lift
- Drag-over state: `var(--color-accent-muted)` background wash

### 5.6 Social Link Input Row

```
[ LinkedIn ]   [  https://linkedin.com/in/username  ]  [×]
[ GitHub   ]   [  https://github.com/username       ]  [×]
[ Portfolio]   [  https://yoursite.com              ]  [×]
              [+ Add Link]
```

- Platform icon rendered in `--color-chrome` (24×24)
- Input field in glass style
- Remove button: subtle ×, appears on hover only
- Row background lifts on hover: `var(--glass-bg-hover)`

---

## 6. Page Layouts

### 6.1 Login / Register Page

```
┌─────────────────────────────────────────────────────────────────┐
│                    [DEEP OBSIDIAN BG]                           │
│              subtle mesh gradient noise texture                 │
│                                                                 │
│                    ┌────────────────────┐                       │
│                    │  ◈ UPE             │  ← glass card        │
│                    │                    │     centered          │
│                    │  Email             │     max-w: 420px      │
│                    │  [____________]    │                       │
│                    │  Password          │                       │
│                    │  [____________]    │                       │
│                    │                    │                       │
│                    │  [  Sign In  ]     │                       │
│                    │                    │                       │
│                    │  New here?         │                       │
│                    │  Create account →  │                       │
│                    └────────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

- Full-viewport dark background with radial gradient emanating from center
- Single glass card floating at center
- Background: faint geometric grid lines at `opacity: 0.03`

### 6.2 Editor Dashboard

```
┌──── NAV ─────────────────────────────────────────────────────────┐
│                                                                   │
│  ┌── SIDEBAR (240px) ──┐  ┌──── MAIN CONTENT AREA ──────────┐   │
│  │  Profile            │  │                                  │   │
│  │  Media    ←selected │  │   [Active editor section]        │   │
│  │  Links              │  │                                  │   │
│  │                     │  │   Glass card content panels      │   │
│  │  ─────────────────  │  │                                  │   │
│  │  Preview ↗          │  │   [Save Changes]                 │   │
│  └─────────────────────┘  └──────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
```

- Sidebar: glass surface with metallic left-border accent on active item
- Main area: `--color-obsidian` background, content in glass cards
- Mobile: sidebar collapses to bottom tab bar

### 6.3 Public Profile Renderer

```
┌─────────────────────────────────────────────────────────────────┐
│  [HEADER IMAGE — full width, 320px height, dark overlay]        │
│                                                                 │
│            ┌───────────────────────────────────┐               │
│        [◉] │  Display Name                     │               │
│   avatar   │  Professional Headline            │               │
│   (120px)  │                                   │               │
│            │  [LinkedIn] [GitHub] [Portfolio]  │               │
│            └───────────────────────────────────┘               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  About Me                                               │   │
│  │  Bio text content...                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                 Powered by Universal Profile Engine             │
└─────────────────────────────────────────────────────────────────┘
```

- Header image has gradient overlay: `linear-gradient(to bottom, transparent 40%, var(--color-obsidian))`
- Avatar overlaps the header-to-content boundary; metallic ring border (3px)
- Profile card: glass surface, centered, `max-width: 760px`
- Social links: glass chips with platform icon + label

---

## 7. Motion & Animation

### 7.1 Principles

- **Purposeful only:** Animations guide attention; never decorative noise
- **Fast in, slow out:** Entrances use `ease-out`; exits use `ease-in`
- **Respect reduced motion:** All animations wrapped in `@media (prefers-reduced-motion: no-preference)`

### 7.2 Standard Transitions

```css
/* Base interaction transitions */
--transition-fast:   100ms ease;
--transition-base:   180ms ease;
--transition-slow:   320ms ease;

/* Spring-like for transforms */
--transition-spring: 240ms cubic-bezier(0.34, 1.56, 0.64, 1);
```

### 7.3 Page Load Sequence

```
0ms   → Background renders
80ms  → Nav fades in (opacity 0→1, translateY -8px→0)
160ms → Main card fades in (opacity 0→1, translateY 16px→0)
240ms → Form fields stagger in (each: 40ms delay apart)
320ms → CTA button fades in with glow pulse (1 cycle only)
```

### 7.4 Micro-interactions

| Trigger | Effect |
|---------|--------|
| Input focus | Border accent glow expands (200ms ease) |
| Button hover | Lift + glow intensify (150ms) |
| Upload drag-over | Border pulses with accent color |
| Save success | Brief green shimmer sweep across card |
| Error state | Subtle red border + shake (320ms) |
| Nav item click | Left accent bar slides (200ms spring) |

---

## 8. Spacing & Layout

```css
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  20px;
--space-6:  24px;
--space-8:  32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

**Layout constants:**
- `--border-radius-sm: 8px`
- `--border-radius-md: 12px`
- `--border-radius-lg: 16px`
- `--border-radius-xl: 24px`
- `--border-radius-full: 9999px`
- Sidebar width: `240px`
- Content max-width: `800px`
- Nav height: `60px`

---

## 9. Responsive Breakpoints

| Breakpoint | Width | Notes |
|-----------|-------|-------|
| `xs` | 375px | Minimum supported |
| `sm` | 640px | — |
| `md` | 768px | Sidebar → tab bar |
| `lg` | 1024px | Full layout |
| `xl` | 1280px | Wider content margins |

---

## 10. Iconography

- **Icon set:** [Phosphor Icons](https://phosphoricons.com/) — `Regular` weight
- **Size standard:** 20px in UI, 24px in navigation, 16px in inputs
- **Color:** `var(--color-chrome)` default; `var(--color-silver)` on hover/active
- **Special:** Platform icons (GitHub, LinkedIn) use brand SVGs at `var(--color-chrome-light)`

---

## 11. Accessibility Notes

- All interactive elements must have `:focus-visible` styles (no `:focus` suppression)
- Minimum contrast ratio 4.5:1 for body text against background
- All images require `alt` attributes
- Form inputs require associated `<label>` elements (never placeholder-only)
- Glass effects must not be the only visual differentiator (pair with border or shadow)

---

*End of Design Specification*
