# Hugo Narrow Theme Customizations

This document tracks all customizations made to the hugo-narrow theme so they can be
reapplied and re-verified after theme upgrades.

**Theme:** `github.com/tom2almighty/hugo-narrow` v1.3.16
**Requires:** Hugo **extended** ≥ 0.158.0 (theme `min_version`)
**Last Updated:** September 7, 2026

**Philosophy:** Minimize layout overrides by using CSS where possible. Only override
templates when structural HTML changes are required.

---

## Layout Overrides

### 1. `layouts/_partials/navigation/header.html`
**Purpose:** Show the site logo on mobile as well as desktop; label the nav landmark.

**Why an override is needed:** The theme renders two separate header branches — a desktop
branch (`hidden … md:flex`) and a mobile branch (`flex … md:hidden`). Only the desktop
branch includes a logo. Adding one to the mobile branch is a structural HTML change.

**Diff vs. upstream v1.3.16 — three hunks only:**
1. Removed the top-of-file `$logoSrc` assignment (moved into `site-logo.html`).
2. Desktop branch: replaced the inline logo block with
   `{{ partial "navigation/site-logo.html" . }}`.
3. Mobile branch: wrapped the menu toggle in a flex row and added
   `{{ partial "navigation/site-logo.html" . }}` to its left.
4. Desktop `<nav>` got `aria-label="{{ T `nav.menu` }}"`. The page has several `<nav>`
   landmarks and only the breadcrumb was labelled, so axe reported `landmark-unique`
   on every page. This clears it everywhere except post pages (see Known Gaps).

Everything else is verbatim upstream, so `diff` against the theme source stays readable.

### 2. `layouts/_partials/navigation/site-logo.html` *(our file — no upstream counterpart)*
**Purpose:** Render the logo once, used by both header branches.
**Customization:** the image-logo anchor uses `rounded-lg` instead of the theme's
`rounded-full`, so the logo is square with rounded corners rather than a circle.

Because this file does not exist upstream, it never conflicts on a theme upgrade.

---

### 3. `layouts/_markup/render-link.html`
**Purpose:** Stop external links from forcing a line break before themselves.

**The bug:** the theme's hook puts `inline-flex` on external-link anchors so it can lay
out the trailing external-link icon. An inline-flex box is *atomic* — it cannot break
across lines — so a multi-word link becomes one unbreakable unit and jumps to the next
line whenever it does not fit in the space left on the current line, leaving a ragged gap
mid-paragraph. (Present in v1.3.1 too; not introduced by the v1.3.16 upgrade.)

**The fix:** render the anchor as a normal inline box so its text wraps like any other
text, and put only the **last word plus the icon** inside a `whitespace-nowrap` span, so
the icon stays welded to that word and the two wrap together.

**Why not CSS:** there is no "last word" selector, and NBSP glue does not hold across an
element boundary — verified in-browser. A CSS-only icon either orphans onto a line of its
own or overflows its container (measured at 11px past the paragraph edge at 1280px).

Because `.Text` arrives as rendered HTML, the split must not cut through tags. The hook
handles four cases, documented inline: no spaces; plain text; a single wrapping tag such
as `[**Afternoon Printing**](...)` (split inside the tag); and anything else, which falls
back to no glue so the text still wraps. `code` is excluded from the tag case so its
background does not extend behind the icon.

**Note:** tag names are emitted with `printf "<%s>" | safeHTML` — interpolating them
inline makes html/template's contextual autoescaping escape the `<`.

---

## New Assets

### 4. `assets/icons/instagram.svg`
Theme ships `github.svg` but still has no Instagram icon (verified in v1.3.16); without
this file the social link falls back to a generic circle+plus icon.

---

## CSS Customizations

Loaded as standalone stylesheets (not compiled into the theme's Tailwind bundle):

- `assets/css/custom/custom.css` — color scheme + overrides
- `assets/css/custom/chroma.css` — syntax highlighting palette

### 5. Minnesota color schemes (four)
All four schemes registered in `params.yaml` under `themes:` are now implemented in
`custom.css` (token set + `::selection` + caret) and `chroma.css` (syntax palette).
`colorScheme: "mn-boundary-waters"` is active.

| Scheme | Background | Link | Link hue separation |
|---|---|---|---|
| `mn-boundary-waters` | `#1e2c3b` navy | `#77c6d4` ice blue | 22° |
| `mn-lake-superior` | `#1b3234` deep water | `#eeba70` agate amber | 150° |
| `mn-north-shore` | `#213126` basalt/pine | `#7cd1f3` birch blue | 58° |
| `mn-night-sky` | `#1d1c2b` violet-black | `#83e7a8` aurora green | 102° |

**Previously only Boundary Waters existed.** The other three were registered in
`params.yaml` but had no CSS at all, so selecting one would have fallen back to the
theme's stock colors. That was latent rather than visible only because
`header.showThemeSwitch` is `false` — see Configuration Changes.

Each scheme is built to the rules this codebase learned in the September 2026
accessibility pass, and each was verified by measurement, not by eye:

- background chroma ≤ 0.030 (large saturated fields are what made the site tiring)
- body text ≥ 7:1 (AAA); links ≥ 4.5:1 **and** ≥ 15° of HSL hue separation from the
  background — the hue rule is the one a contrast checker will not tell you about
- `--color-border` ≥ 3:1 for WCAG 1.4.11 (tightest across the four is 3.60:1)
- all 68 syntax-highlighting colors ≥ 4.5:1 against the real composited code
  background (tightest is 5.08:1)

**Syntax palette fix applied to all four, including Boundary Waters:** code comments
were `oklch(0.582 0.036 252)` = **3.45:1** and line numbers `oklch(0.620 0.040 252)` =
**4.01:1**, both below AA. Comments are prose and need to be readable, so every scheme
now places them at L ≥ 0.700 (5.46:1). axe never caught this because no post's code
sample happens to contain a comment — it was found by enumerating the palette rather
than by scanning a page.

### 6. Mobile font size
`@media (max-width: 40rem) { .prose { font-size: 1.1rem; } }` — theme default of
0.9rem (14.4px) was too small on phones.

### 7. Breadcrumb mobile stacking
`@media (max-width: 48rem)` rules stack `.breadcrumb ol` vertically with per-level indent
and lift the `max-w` truncation. Theme uses `flex items-center`, which squished the text.

### 8. Link treatment in prose
Rules for `.prose a > strong` and `.prose strong > a` force link color and underline.
Needed because the base reset sets `a { text-decoration: inherit; }`, so links wrapped in
`<strong>` lost both color and underline.

### 9. External-link icon
`.prose a.external-link .external-link-icon` sets `inline-block`, a small left margin and
baseline nudge, and `currentColor` in place of the theme hook's hard-coded `#9ca3af`, so
the icon matches the link colour instead of sitting at lower contrast than the text.

### 10. Contrast boosts
Explicit colors for `.text-muted-foreground/50|60`, the `hover:text-*` utilities, and the
Hugo credit link, so dimmed/hover states keep sufficient contrast.

### 10a. Accessibility pass (September 2026)
Measured with axe-core + Playwright across all 11 sitemap pages at 1280px and 390px, plus
pixel-diffed screenshots for things axe cannot see (focus rings, real rendered contrast).

**Readability / "too blue".** Every text pair already cleared WCAG AA before this pass —
the weakest was 5.31:1 — so this was never a luminance problem. Two measured causes:

- *Saturation.* Background `#112c49` was 62% HSL saturation and the card `#051e38` was
  84%. Background chroma roughly halved (bg `0.062 -> 0.034`, card `0.058 -> 0.030`,
  popover `0.054 -> 0.028`, muted `0.050 -> 0.030`) and the text tint eased
  (`0.022 -> 0.014`). **Lightness is untouched, so every contrast ratio is preserved.**
- *Hue collision.* Links rendered at HSL hue 211.6°; the page background renders at
  211.1°. Links were the same hue as the page, only lighter — the worst case for edge
  acuity. `--color-primary` is now Ice Blue `oklch(0.780 0.080 210)`, giving 22° of
  separation and lifting links from 5.31:1 to 7.30:1 (AAA).

**Non-text contrast (WCAG 1.4.11).** `--color-border` was 2.20:1 against the background,
below the 3:1 required for meaningful UI boundaries. Raised to 3.62:1
(`0.482 0.040 252 -> 0.600 0.030 252`). `--color-subtle` likewise raised.

**Focus visibility (WCAG 2.4.11).** Verified by pixel-diffing focused vs. unfocused
screenshots of every tab stop. Most controls fall back to Chromium's `outline: auto`,
which paints a white two-tone ring (~14:1) and is fine — note the *computed*
`outline-color` reads `rgb(0,95,204)` there, which is misleading; the painted ring is
not that colour. But four controls (header nav links, mobile menu button, code-block
Copy button) set only a background tint on focus, measuring **1.36-1.39:1**. A global
`:focus-visible` ring now guarantees an indicator; all 11 tab stops measure 10.9-13.0:1.

**Search modal keyboard trap (WCAG 4.1.2 / 2.4.3).** The theme hides the closed dialog
with `opacity-0` + `pointer-events-none` + `aria-hidden="true"` but never removes it from
the tab order, so its input and buttons stayed focusable while invisible. axe flagged
`aria-hidden-focus` on all 11 pages. Fixed in CSS with `visibility: hidden` plus a
delayed transition so the 300ms fade still plays. Verified: 3 focusable descendants,
0 reachable when closed; Ctrl+K still opens and focuses the input.

**Reduced motion (WCAG 2.3.3).** Added a `prefers-reduced-motion` block.

**Relationship to `identity.html`.** The identity system pinned Night Sky Dark
`oklch(0.288 0.062 252)` as "Background" and Starlight `oklch(0.920 0.022 212)` as
"Body Copy". The desaturation changes both (lightness preserved, chroma reduced).
**Decided September 2026: keep the desaturation and update the identity system to
match.** `static/identity.html` is now v1.4 — its `base`, `surface0`, `surface1` and
`text` tokens, the two affected swatches, and the accessibility guidance were updated
so the document and the site agree. **Logo colours were deliberately left alone**:
Night Sky Blue and Water Blue remain the brand/logo pair.

The link colour never departed from the palette — Ice Blue is an approved entry in it.

Also worth recording: identity.html designated Night Sky Blue `oklch(0.620 0.148 252)`
the "Primary Brand" colour, but at body text size it measures **3.90:1** — below the
4.5:1 bar the same document sets. It cannot be used for links as-is, which is why the
theme had already lightened it. v1.4 now states this explicitly: Night Sky Blue is a
logo colour, and Ice Blue is the link colour.

`static/identity.html` is a public page (`/identity.html`) but is a static file, so it
is not in `sitemap.xml` and the audit scripts do **not** cover it. Audit it explicitly
if it changes.

---

## Configuration Changes

### 11. `config/_default/hugo.yaml`
- `locale: en-us` — `languageCode` was deprecated in Hugo 0.158.0.
- `markup.highlight.style: catppuccin-frappe` — the default `github` style was unreadable
  in light mode.
- `module.hugoVersion.min: 0.158.0` — matches the theme's requirement.

### 12. `config/_default/params.yaml`
- `header.showThemeSwitch` / `showDarkModeSwitch` / `showLanguageSwitch` are all `false`
  (deliberate — the header intentionally shows only logo + nav). As of September 2026
  all four registered schemes are actually implemented, so enabling `showThemeSwitch`
  is now safe; before that it would have exposed three schemes with no CSS.
- `analytics.google` — hugo-narrow reads analytics from `params.yaml`, not `hugo.yaml`.
- `lightbox.enabled: false` — as of v1.3.16 the theme only emits gallery/lightbox assets
  (glightbox, photoswipe, fjGallery, lg fonts) when this is enabled, so the build output
  is smaller than it was on v1.3.1.

### 13. `.github/workflows/deploy.yml`
`HUGO_VERSION: 0.165.0` and `go-version: '1.25'` — the theme needs Hugo ≥ 0.158.0, and
`go.mod` declares `go 1.25.7`.

### 14. `archetypes/default.md`
Comment documenting recommended cover image dimensions.

---

## Upgrade Procedure

1. Note the current version in `go.mod`, then check the theme's `theme.toml` `min_version`
   against `HUGO_VERSION` in `deploy.yml` and `module.hugoVersion.min` in `hugo.yaml`.
2. Extract the old and new theme source side by side and diff them:
   ```sh
   for v in <old> <new>; do
     curl -sO "https://proxy.golang.org/github.com/tom2almighty/hugo-narrow/@v/$v.zip"
     unzip -qo "$v.zip" -d "$v"
   done
   diff -rq <old>/... <new>/...
   ```
3. `hugo mod get github.com/tom2almighty/hugo-narrow@<new>`
4. Re-derive `header.html` and `render-link.html` from the **new** upstream source and
   re-apply the documented changes, rather than carrying the old overrides forward.
   Check whether upstream has stopped using `inline-flex` on external links — if so,
   `render-link.html` can be dropped entirely.
5. Check whether the theme now ships an Instagram icon (then drop ours).
6. Build with `hugo --gc --minify` and confirm zero warnings.
7. Compare built output file lists before/after to catch dropped assets.

### Upgrade History
- **v1.3.1 → v1.3.16** (Sep 2026): Mobile nav was re-architected from a dropdown
  (`#mobile-menu`) to a full-width anchored panel below the header card
  (`navigation/mobile-nav-panel.html`). This **removed the need for two customizations** —
  the `mobile-menu-toggle.html` override and the `#mobile-menu` / `.mobile-menu.dropdown-menu`
  CSS that stopped the dropdown bleeding off-screen. Also new: nav submenus, a desktop
  content-width switcher, i18n moved YAML→TOML, and prose CSS split into `prose.*.css`.

---

## Testing After Upgrade

**Mobile (< 768px):**
- [ ] Logo visible in header, square with rounded corners (not circular)
- [ ] Menu button sits directly right of the logo
- [ ] Nav panel opens full-width below the header card, fully on-screen
- [ ] Breadcrumbs stack vertically with readable text
- [ ] Body text is 16px

**Desktop:**
- [ ] Logo square, nav centered, content-width switcher on the right
- [ ] No theme/dark-mode/language switchers (intentionally disabled)

**Links & color:**
- [ ] External links wrap mid-text with no ragged gap before them, and the icon never
      sits alone on a line or overflows the paragraph (sweep viewport widths 360–1400)
- [ ] All prose links underlined, including inside `<strong>`
- [ ] `data-theme="mn-boundary-waters"` present on `<html>`
- [ ] Code blocks use the Catppuccin Frappé palette

**Other:**
- [ ] Instagram + GitHub icons render in the author card and footer
- [ ] `gtag/js?id=G-CYCL78ZG85` requested in `<head>`
- [ ] Build emits no deprecation warnings


---

## Known Gaps

Two axe findings remain, both `moderate` and both classified by axe as *best-practice*
rather than WCAG failures. Each needs a new template override, which trades against the
"minimize layout overrides" philosophy above — left as a deliberate decision, not an
oversight.

### `landmark-unique` — 6 post pages
`layouts/_partials/content/post-navigation.html` renders `<nav class="post-navigation">`
with no accessible name, colliding with the mobile nav panel's unlabelled `<nav>`.
**Fix:** override the partial and add `aria-label="{{ T `nav.prev` }} / {{ T `nav.next` }}"`
(or a dedicated i18n key).

### `heading-order` — 6 pages
Card titles are `<h3>` while the only preceding heading is the page `<h1>`, so the
outline skips h2. Affects `content/post-list.html` (the `/posts/` and home listings) and
`content/post-navigation.html` (prev/next cards).
**Fix:** override both partials and change those `<h3>` to `<h2>`.

Note the `<h2 id="search-title">` inside the search modal does *not* fill the gap — it is
inside an `aria-hidden` subtree and so is absent from the accessibility tree.
