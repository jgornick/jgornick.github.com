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
**Purpose:** Show the site logo on mobile as well as desktop.

**Why an override is needed:** The theme renders two separate header branches — a desktop
branch (`hidden … md:flex`) and a mobile branch (`flex … md:hidden`). Only the desktop
branch includes a logo. Adding one to the mobile branch is a structural HTML change.

**Diff vs. upstream v1.3.16 — three hunks only:**
1. Removed the top-of-file `$logoSrc` assignment (moved into `site-logo.html`).
2. Desktop branch: replaced the inline logo block with
   `{{ partial "navigation/site-logo.html" . }}`.
3. Mobile branch: wrapped the menu toggle in a flex row and added
   `{{ partial "navigation/site-logo.html" . }}` to its left.

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

### 5. Minnesota "Boundary Waters" color scheme
`[data-theme="mn-boundary-waters"]` light/dark blocks define the full token set in OKLCH,
plus `::selection` and input caret colors. Registered in `params.yaml` under `themes:`
alongside three other Minnesota schemes, with `colorScheme: "mn-boundary-waters"` active.

### 6. Mobile font size
`@media (max-width: 40rem) { .prose { font-size: 1rem !important; } }` — theme default of
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

---

## Configuration Changes

### 11. `config/_default/hugo.yaml`
- `locale: en-us` — `languageCode` was deprecated in Hugo 0.158.0.
- `markup.highlight.style: catppuccin-frappe` — the default `github` style was unreadable
  in light mode.
- `module.hugoVersion.min: 0.158.0` — matches the theme's requirement.

### 12. `config/_default/params.yaml`
- `header.showThemeSwitch` / `showDarkModeSwitch` / `showLanguageSwitch` are all `false`
  (deliberate — the header intentionally shows only logo + nav).
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
