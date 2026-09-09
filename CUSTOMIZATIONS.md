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
5. Desktop layout restructured so the nav is centred on the **card** rather than on
   the space left over. Upstream makes the `<nav>` the `flex-1` element between the
   logo and the controls, so it centres itself in the remainder and drifts whenever
   those two differ in width. Now both sides are `flex-1` and the nav is its natural
   width between them. Measured at 768/900/1100/1280/1440/1800px: worst offset from
   the card centre is 0.01px, against roughly 40px before.

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

### 4. `layouts/_partials/layout/head.html`
**Purpose:** Stop untagged posts from advertising the site-wide keyword list.

**The bug:** the theme's keywords meta is a two-branch fallback —

```go-html-template
content="{{- with .Params.tags -}}{{ delimit . `, ` }}
  {{- else -}}{{- with site.Params.keywords -}}{{ delimit . `, ` }}{{- end -}}{{- end -}}"
```

`tags: []` is falsy in Go templates, so an empty list takes the `else` branch and every
untagged post inherited `site.Params.keywords` — "Tech, Blog, Programming, Software
Engineering". Five of seven posts were untagged, so an essay about labour and the tax
code shipped claiming to be about software engineering. Site keywords are a *site*
default; a single page is the one place they can be wrong.

**The fix:** build the value into a variable first, and only reach for the site list when
the page is not a single page. Home, section and taxonomy pages keep the site-wide list,
which is where it was always accurate. A post emits its own tags or no keywords meta at
all — the tag is skipped entirely rather than rendered empty.

Verified across the built site: 5 site-keyword pages (`/`, `/posts/`, `/tags/`,
`/tags/npm/`, `/tags/yarn/`), 2 posts carrying their own tags, 5 untagged posts with no
keywords tag.

**Note:** `meta name="keywords"` has been ignored by Google since 2009 and is not a Bing
ranking signal either, so this is a correctness fix, not an SEO one.

**Diff vs. upstream v1.3.16 — one hunk:** the keywords `<meta>` block, replaced by the
variable form above. Everything else in the file is verbatim upstream, and the whole
file must be re-synced on a theme upgrade since a partial override is all-or-nothing.

---

## New Assets

### 5. `assets/icons/instagram.svg`
Theme ships `github.svg` but still has no Instagram icon (verified in v1.3.16); without
this file the social link falls back to a generic circle+plus icon.

---

## CSS Customizations

Loaded as standalone stylesheets (not compiled into the theme's Tailwind bundle):

- `assets/css/custom/custom.css` — color scheme + overrides
- `assets/css/custom/chroma.css` — syntax highlighting palette

### 6. Minnesota color schemes (four)
All four schemes registered in `params.yaml` under `themes:` are now implemented in
`custom.css` (token set + `::selection` + caret) and `chroma.css` (syntax palette).
`colorScheme: "mn-boundary-waters"` is active.

| Scheme | Light background / link | Dark background / link |
|---|---|---|
| `mn-lake-superior` | `#ecf6f6` / `#9f4325` agate rust | `#1b3234` / `#eeba70` agate amber |
| `mn-boundary-waters` | `#eff4fa` / `#00716c` deep water | `#1e2c3b` / `#77c6d4` ice blue |
| `mn-north-shore` | `#eef6f0` / `#1666aa` deep lake blue | `#213126` / `#7cd1f3` birch blue |
| `mn-night-sky` | `#f2f3fa` / `#137738` deep aurora | `#1d1c2b` / `#83e7a8` aurora green |

Every scheme now has **both faces**: the light palette on `[data-theme="x"]`
and the dark one on `[data-theme="x"].dark`. Light faces share a single
lightness ladder and vary only by hue, so the contrast maths is identical
across schemes and only the hue-dependent checks differ per scheme.

### Light and dark mode

**The site follows `prefers-color-scheme`.** `theme-init.js` adds a `.dark`
class from the OS setting (or the visitor's explicit Light/Dark/System choice),
and every scheme now defines a genuinely different palette for each state, so
that class actually changes the page.

Before September 2026 it did not. Both blocks held identical values in every
scheme, so the `.dark` class changed nothing and a light-mode visitor was
served the dark site. That was measured, not assumed: `prefers-color-scheme:
light` and `dark` both rendered `#1e2c3b`.

Both header controls are on:

- **Scheme picker** (`showThemeSwitch`) — choose the flavour
- **Light/Dark/System** (`showDarkModeSwitch`) — override the OS per device

Verified across all **8 combinations** (4 schemes × light/dark), all 11 pages:
zero WCAG A/AA violations, weakest text contrast 4.65:1, all 68 syntax colours
≥ 4.5:1 against the real composited code ground, and the focus ring — which
keys off `--color-foreground` — inverting with the scheme at 10.0–13.6:1.

Two bugs surfaced while building the pairs, both of which had been shipping:

- `--color-important` in Boundary Waters was `oklch(0.620 0.175 15)` =
  **3.57:1**, below AA. axe never flagged it because no sampled page renders
  that token as text; it only appeared when enumerating the token set.
- `.text-muted-foreground/50`, used for the "No previous / No next post"
  labels, composited to **3.75:1** on the light grounds even with the existing
  80% boost. The transparency is gone; the muted token now carries the dimming
  on its own.

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
- `header.showContentWidthSwitch` is **`false`** — the page-width slider is hidden.
  `contentWidth: "56rem"` is the reading measure for this site; a slider invited
  readers to break it.
- `header.showThemeSwitch` is **`false`** — the site ships one flavour,
  `mn-boundary-waters`. The other three palettes stay in `custom.css` /
  `chroma.css` (~36KB unminified, roughly 3KB once minified and gzipped) so re-enabling the
  picker is a one-word change; nothing exposes them today. Prune them if that
  stops being worth the weight.
- `header.showDarkModeSwitch` is **`true`** — Light / Dark / System, the only
  control left in the header. It writes `localStorage.theme`; `System` defers to
  `prefers-color-scheme`. Verified after the header cleanup: Light `#eff4fa`,
  Dark `#1e2c3b`, System following the OS.
- `header.showLanguageSwitch` is `false` (single-language site).
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

## Decap CMS

### 15. `static/admin/index.html` — exact version pin + SRI
The admin page loaded `https://unpkg.com/decap-cms@^3.3.3/dist/decap-cms.js`. unpkg
resolves that caret **at page load**, not at build time, so the CMS had silently ridden
from 3.3.3 to 3.16.1 — 13 minor releases, none reviewed.

Now pinned to `decap-cms@3.16.1` with `integrity` + `crossorigin`. The exact-version URL
is strictly better than the range on every axis:

| | `@^3.3.3` | `@3.16.1` |
|---|---|---|
| Version served | whatever is latest, changes under you | fixed, reviewed |
| Response | 302 redirect | 200 direct |
| `cache-control` | `max-age=60` | `max-age=31536000` (immutable) |
| Tamper check | none | SHA-384, browser refuses on mismatch |

**Vendoring was considered and rejected.** A local copy removes the unpkg runtime
dependency, but the bundle is 4.9 MB and git stores each version bump as a new blob
forever. Not worth it for a personal blog. (One such blob is already in history from
commit 610bbfe — see the note at the end of this section.)

**To upgrade — the version and hash must change in the same edit, or the CMS will not
load at all:**
```sh
V=3.x.y
curl -sL "https://unpkg.com/decap-cms@$V/dist/decap-cms.js" \
  | openssl dgst -sha384 -binary | openssl base64 -A
```
Then load `/admin/` and confirm the login screen renders before pushing. SRI failure is
silent to the naked eye — the page just comes up blank — so this check is not optional.

**Verified:** login screen renders with the correct hash; with a deliberately corrupted
one the browser blocks the script (`Failed to find a valid digest in the 'integrity'
attribute … The resource has been blocked`) and `#nc-root` never appears. So the guard is
genuinely enforced, not decorative.

**Note on repo size:** commit 610bbfe briefly vendored the 4.9 MB bundle before this
commit removed it. Deleting a file does not remove it from git history, so that blob
still ships to anyone cloning. Harmless, but it is why `git clone` is larger than the
working tree suggests. Removing it would need a history rewrite and a force-push to
`main`, which is not worth it for one blob.

### 16. `static/admin/config.yml` — local backend package name
The comment read `npx @decaporg/decap-server`. That package does not exist and 404s on
npm; the real one is unscoped `decap-server`. `dev-cms.sh` always ran the correct one, so
only the comment was wrong. It now points at `./dev-cms.sh`, which starts `decap-server`
and `hugo server -D` together.

### 17. `decap-oauth-worker/package.json` — `sharp` override
`npm audit` reported 3 high-severity advisories through `wrangler → miniflare → sharp`
(libheif, GHSA-g89c-p67h-r497 / GHSA-2jg2-4ch7-h545). All three are **devDependencies** —
`wrangler` is the worker's only dependency and nothing in that chain ships in the deployed
Worker.

`npm audit fix --force` wanted to *downgrade* wrangler 4.130.0 → 4.15.2, which is worse
than the problem. miniflare pins `sharp` to exactly `0.35.2` and the fix needs `>=0.35.4`,
so there is no forward fix from upstream yet. Instead:

```json
"overrides": { "sharp": "^0.35.4" }
```

0.35.2 → 0.35.4 is a patch bump, and miniflare only uses sharp to emulate image transforms
in local `wrangler dev` — which this OAuth worker never does. Audit is clean and
`wrangler deploy --dry-run` builds (4.90 KiB, no bindings). **Drop this override** once
miniflare pins a patched sharp itself.

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
4. Re-derive `header.html`, `render-link.html` and `head.html` from the **new** upstream
   source and re-apply the documented changes, rather than carrying the old overrides
   forward. `head.html` is a whole-file copy for a one-hunk change, so it is the most
   likely to silently miss new upstream meta tags — diff it first.
   Check whether upstream has stopped using `inline-flex` on external links — if so,
   `render-link.html` can be dropped entirely. Likewise check whether upstream now
   guards the keywords fallback on `.IsPage` — if so, drop `head.html`.
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

## Re-running the audit

```sh
hugo server --port 1313 --disableFastRender
./scripts/a11y-audit.sh http://localhost:1313
node scripts/a11y-hover-audit.js http://localhost:1313
```

The URL you pass the scripts is authoritative — they force every audited page onto it.

Output goes to `a11y-reports/` and `a11y-hover-reports/`, both **gitignored** — they are
build artifacts. They used to be committed, which meant a stale February snapshot sat in
the repo describing a palette that no longer existed.

**Both scripts now pin sitemap URLs to the base URL you pass them.** `hugo server`
does not reliably rewrite `baseURL` in `sitemap.xml`, and both scripts follow the
sitemap — so a run could silently audit **joegornick.com** and report it as your local
result. This actually happened during the September 2026 pass and nearly led to
reporting a working change as having no effect. If the sitemap advertises a different
host the scripts now rewrite it and print a `warning:` line rather than quietly
following it.

**Passing `--baseURL`/`--appendPort=false` to `hugo server` is _not_ a sufficient
guard.** Measured directly: a server started with exactly those flags was still serving
`<loc>https://joegornick.com/</loc>` in its sitemap. The flags appear to hold right
after startup and then stop holding — running a one-shot `hugo` build alongside the
server is one way to get there, since that rewrites `public/`. Do not rely on them, and
do not rely on a one-time `curl` spot-check either; the URL rewriting inside the scripts
is the only thing that actually protects a run. Watch for the `warning:` line — if you
see it, the sitemap was lying and the scripts corrected it.

### What tooling will and will not catch here

axe alone would pass this site clean on colour — it reported **zero** contrast violations
both before and after the pass. Everything that actually mattered came from measuring
rendered pixels:

- **saturation** and **hue collision** are invisible to a contrast checker
- **focus rings** have no axe rule at all, and computed `outline-color` is misleading for
  `outline: auto` (Chromium paints a white two-tone ring, not the reported colour) —
  pixel-diff focused vs. unfocused screenshots instead
- **backgrounds must be composited**, not read from the first ancestor with a non-zero
  alpha. Semi-transparent layers (`bg-card/80` and friends) make a naive walk report a
  much lighter background and invent contrast failures that are not real. Cross-check any
  such helper against axe's own `bgColor` or a screenshot pixel before trusting it.
- **palette coverage**: scanning pages only tests the colours those pages happen to use.
  The failing comment colour was found by enumerating every `--chroma-*` variable.
