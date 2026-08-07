# High-Contrast Sunset Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current NY editorial theme with a full-width high-contrast charcoal header, wide reactive form with retro 3D pop, and a Mistral sunset striped footer.

**Architecture:** Single-page static site. Three files change: `public/index.html` (markup structure), `public/style.css` (complete theme rewrite using `:root` tokens), `public/app.js` (no functional change — only verify existing logic still binds to new markup IDs). Worker API at `src/worker.js` is untouched.

**Tech Stack:** Vanilla HTML/CSS/JS, Cloudflare Worker, Inter + SF Mono fonts.

## Global Constraints

- Design tokens MUST live in `:root` custom properties in `public/style.css`; never inline hex values in rule bodies.
- No filler text anywhere — only the name "JOEL BENWAY", social links (GitHub/Twitter/LinkedIn), form labels, placeholders, buttons, and status messages.
- LinkedIn username is `jbenway`.
- Form field IDs (`sender-email`, `message`, `sender-key`, `status-message`, `submit-btn`, `contact-form`) MUST remain unchanged so `public/app.js` continues to work without edits.
- `.key-locked` class MUST stay on the PGP key textarea for the auto-lock logic in `app.js`.
- Footer is purely decorative (5 colored stripes, no text).
- Header top accent stripe and footer use the exact 5 Mistral colors in order: `#FFD800`, `#FFAF00`, `#FF8205`, `#FA500F`, `#E10500`.

---

## File Structure

- **Modify:** `public/index.html` — new full-width header, wide form container, sunset footer markup.
- **Modify:** `public/style.css` — complete rewrite of theme tokens, layout, header, form, footer styles.
- **Verify only:** `public/app.js` — no edits; confirm element IDs and classes still match new HTML.

---

### Task 1: Rewrite `public/index.html` with full-width header + wide form + sunset footer

**Files:**

- Modify: `public/index.html`

**Interfaces:**

- Consumes: existing `app.js` element IDs (`contact-form`, `sender-email`, `message`, `sender-key`, `status-message`, `submit-btn`) and `.key-locked` class.
- Produces: HTML structure with `.header`, `.header-strip`, `.header-inner`, `.name`, `.nav-links` containing `.pill` anchors, `.main-inner` form, and `.footer` with 5 `.stripe` divs.

- [ ] **Step 1: Replace the entire contents of `public/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Joel Benway</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <header class="header">
      <div class="header-strip">
        <div class="stripe-band"></div>
        <div class="stripe-band"></div>
        <div class="stripe-band"></div>
        <div class="stripe-band"></div>
        <div class="stripe-band"></div>
      </div>
      <div class="header-inner">
        <h1 class="name">JOEL BENWAY</h1>
        <nav class="nav-links">
          <a class="pill" href="https://github.com/joelbenway" target="_blank" rel="noopener"
            >GitHub</a
          >
          <a class="pill" href="https://x.com/joelbenway" target="_blank" rel="noopener">Twitter</a>
          <a class="pill" href="https://linkedin.com/in/jbenway" target="_blank" rel="noopener"
            >LinkedIn</a
          >
        </nav>
      </div>
    </header>

    <main class="main">
      <div class="main-inner">
        <form id="contact-form" class="form" novalidate>
          <div class="field">
            <label for="sender-email">Your email</label>
            <input
              type="email"
              id="sender-email"
              name="email"
              placeholder="you@example.com"
              autocomplete="email"
            />
          </div>

          <div class="field">
            <label for="message">Message</label>
            <textarea
              id="message"
              name="message"
              rows="5"
              placeholder="Write your message…"
            ></textarea>
          </div>

          <div class="field">
            <label for="sender-key"
              >Your PGP public key
              <span class="optional">optional — attach for encrypted reply</span></label
            >
            <textarea
              id="sender-key"
              name="senderKey"
              rows="4"
              placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----"
            ></textarea>
          </div>

          <div id="status-message" class="status" role="status" aria-live="polite"></div>

          <div class="actions">
            <button type="submit" id="submit-btn" class="btn btn-primary">Send</button>
            <button type="reset" class="btn btn-reset">Reset</button>
          </div>
        </form>
      </div>
    </main>

    <footer class="footer">
      <div class="stripe-band"></div>
      <div class="stripe-band"></div>
      <div class="stripe-band"></div>
      <div class="stripe-band"></div>
      <div class="stripe-band"></div>
    </footer>

    <script src="app.js"></script>
  </body>
</html>
```

- [ ] **Step 2: Verify element IDs are present**

Run this grep to confirm all IDs `app.js` depends on exist in the new HTML:

```bash
rg -c "contact-form|sender-email|message|sender-key|status-message|submit-btn" public/index.html
```

Expected: matches on all six IDs.

- [ ] **Step 3: Commit**

```bash
git add public/index.html
git commit -m "redesign: full-width header, wide form, sunset footer markup"
```

---

### Task 2: Rewrite `public/style.css` with High-Contrast Sunset Studio theme

**Files:**

- Modify: `public/style.css`

**Interfaces:**

- Consumes: HTML classes from Task 1 (`.header`, `.header-strip`, `.header-inner`, `.name`, `.nav-links`, `.pill`, `.main-inner`, `.form`, `.field`, `.actions`, `.btn`, `.btn-primary`, `.btn-reset`, `.status`, `.key-locked`, `.footer`, `.stripe-band`).
- Produces: Complete responsive stylesheet using `:root` tokens.

- [ ] **Step 1: Replace the entire contents of `public/style.css`**

```css
/* ===========================================
   Theme tokens — edit this block to restyle.
   Keep :root intact; do not inline these values.
   =========================================== */
:root {
  --bg: #f6f4ee;
  --text: #18181b;
  --text-muted: #66635b;
  --header-bg: #18181b;
  --surface: #ffffff;
  --border: #18181b;
  --accent: #fa500f;
  --accent-hover: #e04400;
  --locked-bg: #efece6;
  --locked-text: #66635b;
  --locked-border: #b0ac9f;
  --focus-ring: rgba(250, 80, 15, 0.25);
  --success: #2a7a4a;
  --error: #d63;

  --stripe-1: #ffd800;
  --stripe-2: #ffaf00;
  --stripe-3: #ff8205;
  --stripe-4: #fa500f;
  --stripe-5: #e10500;

  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'SF Mono', 'JetBrains Mono', ui-monospace, monospace;

  --shadow-hard: 4px 4px 0px var(--text);
  --shadow-hard-accent: 4px 4px 0px var(--accent);
  --shadow-press: 2px 2px 0px var(--text);
}

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  height: 100%;
}

body {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

a {
  color: inherit;
  text-decoration: none;
}

/* === Header === */

.header {
  width: 100%;
  background: var(--header-bg);
}

.header-strip {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.header-strip .stripe-band:nth-child(1) {
  height: 1px;
  background: var(--stripe-1);
}
.header-strip .stripe-band:nth-child(2) {
  height: 1px;
  background: var(--stripe-2);
}
.header-strip .stripe-band:nth-child(3) {
  height: 1px;
  background: var(--stripe-3);
}
.header-strip .stripe-band:nth-child(4) {
  height: 1px;
  background: var(--stripe-4);
}
.header-strip .stripe-band:nth-child(5) {
  height: 1px;
  background: var(--stripe-5);
}

.header-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  max-width: 1100px;
  width: 92%;
  margin: 0 auto;
  padding: 32px 0;
}

.name {
  font-family: var(--font-sans);
  font-weight: 900;
  font-size: clamp(1.8rem, 5vw, 3rem);
  letter-spacing: 0.05em;
  color: var(--surface);
  line-height: 1;
  text-transform: uppercase;
}

.nav-links {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.pill {
  display: inline-block;
  background: var(--surface);
  color: var(--text);
  font-weight: 700;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  padding: 8px 16px;
  border: 2px solid var(--text);
  box-shadow: 3px 3px 0px var(--accent);
  transition:
    transform 120ms ease,
    box-shadow 120ms ease;
}

.pill:hover {
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0px var(--accent);
}

.pill:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0px var(--accent);
}

/* === Main === */

.main {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 56px 0;
}

.main-inner {
  width: 92%;
  max-width: 960px;
}

/* === Form === */

.form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text);
}

.optional {
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  color: var(--text-muted);
}

input,
textarea {
  display: block;
  width: 100%;
  border: 2.5px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text);
  font-family: inherit;
  font-size: 0.95rem;
  padding: 12px 14px;
  outline: none;
  box-shadow: var(--shadow-hard);
  transition:
    box-shadow 150ms ease,
    border-color 150ms ease;
}

input::placeholder,
textarea::placeholder {
  color: var(--text-muted);
}

input:focus,
textarea:focus {
  border-color: var(--accent);
  box-shadow: var(--shadow-hard-accent);
}

textarea {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  resize: vertical;
  min-height: 70px;
}

.key-locked {
  background: var(--locked-bg);
  color: var(--locked-text);
  border-color: var(--locked-border);
  box-shadow: 3px 3px 0px var(--locked-border);
  cursor: default;
}

/* === Status === */

.status {
  font-size: 0.85rem;
  min-height: 1.2em;
  color: var(--text-muted);
  transition: color 200ms;
}

.status.success {
  color: var(--success);
}
.status.error {
  color: var(--error);
}
.status.hidden {
  visibility: hidden;
}

/* === Actions === */

.actions {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-top: 4px;
}

.btn {
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  border: 2.5px solid var(--border);
  border-radius: 4px;
  padding: 12px 28px;
  box-shadow: var(--shadow-hard);
  transition:
    transform 120ms ease,
    box-shadow 120ms ease,
    background 150ms ease;
}

.btn:active {
  transform: translate(2px, 2px);
  box-shadow: var(--shadow-press);
}

.btn-primary {
  background: var(--accent);
  color: var(--surface);
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-hover);
}

.btn-reset {
  background: var(--surface);
  color: var(--text);
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: var(--shadow-press);
  transform: translate(2px, 2px);
}

/* === Footer (Mistral Sunset Stripes) === */

.footer {
  width: 100%;
  margin-top: auto;
  display: flex;
  flex-direction: column;
}

.footer .stripe-band:nth-child(1) {
  height: 6px;
  background: var(--stripe-1);
}
.footer .stripe-band:nth-child(2) {
  height: 6px;
  background: var(--stripe-2);
}
.footer .stripe-band:nth-child(3) {
  height: 6px;
  background: var(--stripe-3);
}
.footer .stripe-band:nth-child(4) {
  height: 6px;
  background: var(--stripe-4);
}
.footer .stripe-band:nth-child(5) {
  height: 6px;
  background: var(--stripe-5);
}

/* === Responsive === */

@media (max-width: 600px) {
  .header-inner {
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
  }
  .nav-links {
    width: 100%;
  }
  .pill {
    flex: 1;
    text-align: center;
  }
  .main-inner {
    width: 94%;
  }
  .actions {
    flex-wrap: wrap;
  }
}
```

- [ ] **Step 2: Verify no stale CSS classes remain**

Run:

```bash
rg -c "rule-top|rule-orange|role-links|font-serif" public/style.css
```

Expected: no matches (the old NY editorial classes are gone).

- [ ] **Step 3: Commit**

```bash
git add public/style.css
git commit -m "style: high-contrast sunset studio theme with 3D retro pop"
```

---

### Task 3: Verify app.js binds correctly to new markup and dev server renders

**Files:**

- Verify only: `public/app.js` (no edits expected)

**Interfaces:**

- Consumes: final `index.html` and `style.css` from Tasks 1-2.
- Produces: confirmation that PGP lookup, field lock, form submit, and reset all still work against the new theme.

- [ ] **Step 1: Confirm element IDs in HTML match what `app.js` queries**

Run:

```bash
rg "getElementById" public/app.js
```

Expected output references: `contact-form`, `sender-email`, `message`, `sender-key`, `status-message`, `submit-btn` — all must exist in `public/index.html`.

- [ ] **Step 2: Confirm `.key-locked` class is present in both files**

Run:

```bash
rg "key-locked" public/app.js public/style.css public/index.html
```

Expected: `app.js` adds/removes the class, `style.css` defines the visual state. `index.html` does NOT hardcode it (it's applied dynamically).

- [ ] **Step 3: Start dev server and visually verify**

Run:

```bash
npx wrangler dev
```

Open `http://127.0.0.1:8787` in a browser. Verify:

- Full-width charcoal header with thin sunset stripe at top
- Name "JOEL BENWAY" in white on left, three retro pill links on right
- Wide form with 3D hard-shadow inputs, orange focus glow
- Send button is orange with hard shadow; Reset is white with hard shadow
- 5-band sunset stripe footer pinned at bottom
- Tabbing through fields works; typing `-----BEGIN PGP PUBLIC KEY BLOCK-----` into the PGP key field locks it gray

- [ ] **Step 4: No commit needed if verification passes**

If `app.js` needed changes, commit them:

```bash
git add public/app.js
git commit -m "fix: adjust app.js bindings for new theme"
```

---

## Self-Review

**Spec coverage:**

- Full-width charcoal header with sunset top accent → Task 1 HTML + Task 2 CSS ✓
- Wide reactive form (max-width 960px, 92% width) → Task 2 `.main-inner` ✓
- Retro 3D pop inputs/buttons (hard box-shadow, 2.5px borders) → Task 2 inputs/buttons ✓
- Mistral sunset striped footer (5 bands, exact colors) → Task 1 HTML + Task 2 CSS ✓
- No filler text → HTML in Task 1 contains only name, links, form labels/placeholders, buttons ✓
- `:root` tokens preserved → Task 2 opens with full token block ✓
- `.key-locked` state retained → Task 2 CSS + Task 3 verification ✓
- app.js untouched → Task 3 verification-only ✓

**Placeholder scan:** No TBDs, TODOs, or "implement later" present.

**Type consistency:** All class names referenced in CSS match the class attributes written in the HTML. All element IDs match existing `app.js` queries. No naming drift.
