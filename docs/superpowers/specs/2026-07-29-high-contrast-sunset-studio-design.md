# Design Spec: High-Contrast Sunset Studio Personal Website

**Date**: 2026-07-29  
**Author**: Joel Benway / OpenCode Agent

---

## 1. Goal & Requirements

- **Goal**: Create a clean, wide, reactive personal website with PGP email submission functionality.
- **Constraints**:
  - No filler text or extraneous messaging; strictly name, social links, and the contact form.
  - Header must pop with a full-width design.
  - Footer must feature stacked horizontal stripes from yellow to orange (Mistral style).
  - Form inputs and buttons must feature retro 3D pop (hard box shadows, crisp borders).
  - High legibility and responsive scaling across mobile and desktop.

---

## 2. Layout Architecture & Structure

### Canvas & Viewport

- **Body Background**: `#F6F4EE` (warm paper/off-white canvas).
- **Structure**: Full-height flexbox column (`min-height: 100vh`) with content centered and footer pinned to the bottom.

### Header (Full-Width Pop)

- **Container**: `width: 100%`, `background: #18181B` (deep charcoal).
- **Top Accent Line**: 5px horizontal stripe band atop header with color sequence `#FFD800` → `#FFAF00` → `#FF8205` → `#FA500F` → `#E10500`.
- **Inner Content**: `max-width: 1100px`, flex row with `justify-content: space-between` and `align-items: center`.
- **Name**: `JOEL BENWAY` in bold uppercase sans-serif font (`font-weight: 900`, `letter-spacing: 0.05em`, color `#FFFFFF`).
- **Social Navigation**: Links for GitHub (`https://github.com/joelbenway`), Twitter (`https://x.com/joelbenway`), and LinkedIn (`https://linkedin.com/in/jbenway`) styled as high-contrast retro pill buttons with `background: #FFFFFF`, `color: #18181B`, `font-weight: 700`, and `box-shadow: 3px 3px 0px #FA500F`.

### Main Form & Retro 3D Pop

- **Container**: `width: 92%`, `max-width: 960px`, `margin: 48px auto`.
- **Form Fields**:
  - Labels: Small bold uppercase labels (`font-size: 0.75rem`, `letter-spacing: 0.08em`, `color: #18181B`).
  - Inputs & Textareas: `background: #FFFFFF`, `border: 2.5px solid #18181B`, `border-radius: 4px`, `box-shadow: 4px 4px 0px #18181B`.
  - Focus State: `border-color: #FA500F`, `box-shadow: 5px 5px 0px #FA500F`, `outline: none`.
  - Locked PGP Key Field (`.key-locked`): `background: #EFECE6`, `color: #66635B`, `border-color: #B0AC9F`, `box-shadow: 3px 3px 0px #B0AC9F`.
- **Action Buttons**:
  - `Send`: Primary submit button with `background: #FA500F`, `color: #FFFFFF`, `border: 2.5px solid #18181B`, `box-shadow: 4px 4px 0px #18181B`, `font-weight: 700`. On active/click: translates down/right by `2px 2px` with `box-shadow: 2px 2px 0px #18181B`.
  - `Reset`: Secondary button with `background: #FFFFFF`, `color: #18181B`, `border: 2.5px solid #18181B`, `box-shadow: 4px 4px 0px #18181B`, `font-weight: 700`.

### Footer (Mistral Sunset Horizontal Stripes)

- **Container**: `width: 100%`, `margin-top: auto`.
- **Structure**: 5 stacked horizontal `<div>` elements (~6px height each, totaling 30px height), styled with sunset color palette:
  1. Stripe 1: `#FFD800`
  2. Stripe 2: `#FFAF00`
  3. Stripe 3: `#FF8205`
  4. Stripe 4: `#FA500F`
  5. Stripe 5: `#E10500`

---

## 3. CSS Variables & Custom Properties (`:root`)

All design tokens must be defined in CSS `:root` and preserved in block comments:

```css
:root {
  --bg: #f6f4ee;
  --text: #18181b;
  --text-muted: #66635b;
  --header-bg: #18181b;
  --surface: #ffffff;
  --border: #18181b;
  --accent: #fa500f;
  --accent-hover: #e04400;

  --stripe-1: #ffd800;
  --stripe-2: #ffaf00;
  --stripe-3: #ff8205;
  --stripe-4: #fa500f;
  --stripe-5: #e10500;

  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'SF Mono', 'JetBrains Mono', ui-monospace, monospace;
}
```

---

## 4. Verification & Testing

- Ensure HTML structure in `public/index.html` aligns with full-width header/footer layout.
- Ensure CSS in `public/style.css` provides responsive scaling (`clamp()` or `%` width for mobile/desktop).
- Test PGP key lookup and lock behavior with `public/app.js`.
