# Hugo Narrow Theme Customizations

This document tracks all customizations made to the hugo-narrow theme so they can be
reapplied and re-verified after theme upgrades.

**Theme:** `github.com/tom2almighty/hugo-narrow` v1.3.16
**Requires:** Hugo **extended** ≥ 0.158.0 (theme `min_version`)
**Last Updated:** October 7, 2026

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

### 5. `layouts/_partials/layout/footer.html`
**Purpose:** Link the identity system from every page, as a text link on the credit
line: "Powered by Hugo & Narrow · Identity".

**Why an override and not the theme's `footer` menu:** the theme can render a
`site.Menus.footer` from config, but it draws it as a separate centred row of icon
buttons with a divider, which is a lot of chrome for one link. That row is also an
unlabelled `<nav>`. The mobile nav panel's `<nav>` is unlabelled too, so the menu made
axe report `landmark-unique` on every page, undoing the header fix in §1. This was
measured in October 2026 before switching to the text link. The text link adds no
landmark at all.

**Diff vs. upstream v1.3.16 — one hunk:** a `·` separator and an `Identity` anchor
appended to the "Powered by" paragraph, with the same classes as the Narrow link. The
separator is `aria-hidden`. The link is wrapped in `with site.GetPage "/identity"`, so
it takes the page's real permalink and disappears if the page is ever removed.
Everything else is verbatim upstream.

---

## New Assets

### 6. `assets/icons/instagram.svg`
Theme ships `github.svg` but still has no Instagram icon (verified in v1.3.16); without
this file the social link falls back to a generic circle+plus icon.

---

## CSS Customizations

Loaded as standalone stylesheets (not compiled into the theme's Tailwind bundle):

- `assets/css/custom/custom.css` — color scheme + overrides
- `assets/css/custom/chroma.css` — syntax highlighting palette

### 7. Minnesota color schemes (four)
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

Each scheme is defined **once**. Until October 2026, `custom.css` also opened with
an older dark-only Boundary Waters block (tokens, `::selection` and caret, 105
lines). It was dead: every selector reappeared later with identical selector text and
every property, so the later block always won. But it read as the source of truth.
It showed dark values on the base `[data-theme]` selector, and its `.dark` block still
carried the old failing `--color-important` (3.57:1). It has been deleted. Its header
comment, which explains the palette and the September accessibility pass, stays at the
top of the file, now marked as describing the dark face. Proven safe, not assumed:
computed `--color-*`, `::selection` and caret colours on `<html>` were identical before
and after, 232 values across all 4 schemes × light/dark.

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

**404 numeral (WCAG 1.4.3).** The theme's 404 page draws a big "404" as
`text-primary` at `opacity-20`, above the real "Page Not Found" `<h1>`. Composited,
that is **1.32:1** light and **1.54:1** dark. At 128px bold it is large text, so the bar
is 3:1. It was never caught because 404.html is not in the sitemap, so neither audit
script visited it (they do now). Fixed in CSS by swapping the transparency for
`--color-subtle` at full opacity. That token is the scheme's low-emphasis colour, and
every scheme keeps it ≥ 3:1 on its background. Measured on all 8 scheme × mode
combinations: 3.54–4.14:1 and zero axe violations on the page.

Two alternatives were measured and rejected:
- `aria-hidden="true"` does nothing for contrast. The text is still on screen, and axe
  still fails it at 1.32:1.
- Keeping the teal and fading it less (`color-mix` toward the background) only passes
  on the light face at ≥ 70% primary, which is barely faded at all.

**Reduced motion (WCAG 2.3.3).** Added a `prefers-reduced-motion` block.

**Relationship to the identity system.** The identity system pinned Night Sky Dark
`oklch(0.288 0.062 252)` as "Background" and Starlight `oklch(0.920 0.022 212)` as
"Body Copy". The desaturation changes both (lightness preserved, chroma reduced).
**Decided September 2026: keep the desaturation and update the identity system to
match.** **Logo colours were deliberately left alone**: Night Sky Blue and Water Blue
remain the brand/logo pair.

The link colour never departed from the palette — Ice Blue is an approved entry in it.

Also worth recording: the identity system designated Night Sky Blue
`oklch(0.620 0.148 252)` the "Primary Brand" colour, but at body text size it measures
**3.90:1** — below the 4.5:1 bar the same document sets. It cannot be used for links
as-is, which is why the theme had already lightened it. Since v1.4 the identity page
states this explicitly: Night Sky Blue is a logo colour, and Ice Blue is the link
colour.

The identity page no longer keeps its own copy of these values; it reads them live
from this file. See [Identity system page](#identity-system-page).

---

## Identity system page

`/identity/` documents the logo, both faces of the palette, typography and usage rules.
Until October 2026 it was `static/identity.html`, a standalone page with Tailwind from a
CDN and its own copy of the colour tokens. It is now an ordinary Hugo page in the site's
layout, with the site's header, footer and Light / Dark / System toggle.

| File | Role |
|---|---|
| `content/identity/_index.md` | Front matter and the intro paragraph |
| `layouts/identity.html` | The page *(our file — no upstream counterpart)* |
| `layouts/_partials/identity/logo.html` | The JG mark as SVG, from one set of grid coordinates *(ours)* |
| `data/identity.yaml` | Logo colours, colour names, palette rows, experimenter choices |
| `assets/css/identity.css` | Page styles |
| `assets/js/identity.js` | Live values and ratios, copy buttons, colour experimenter |
| `layouts/_partials/layout/head/custom-head.html` | Loads the page's CSS, JS and fonts, on that page only |

**No colour value is copied.** Logo colours live in `data/identity.yaml`. The site
palette is read live from `custom.css`, so the page cannot drift from what the site
paints. That replaces the old rule of editing both files together.

To show a face whatever mode the page is in, an element carries
`data-theme="mn-boundary-waters"` (light face) or the same plus `class="dark"` (dark
face). The scheme's own selectors then set that face's tokens on the element, so a
"dark ground" really is the dark background. This works for two reasons. The scheme
selectors are not scoped to `:root`. And `[data-theme="x"].dark` (0,2,0) beats the
theme's bare `.dark` defaults (0,1,0). **After a theme upgrade, check the light-face panel
still shows `#eff4fa` while the page is dark.** If the theme ever scopes tokens to
`:root` or `html`, the pinned panels would quietly show the page's face instead.

**Values are filled in by script.** `identity.js` reads each token with
`getComputedStyle`, and measures hex and contrast from browser-painted pixels (fill a
canvas, read it back). Without scripts, palette rows show their token names, ratios in
the prose fall back to wording like "below 3:1", and the copy buttons and colour
experimenter stay hidden.

**Why a section page.** It is `content/identity/_index.md`, not `content/identity.md`.
Sections are listed in `sitemap.xml`, so both audit scripts cover the page. They are not
in the home RSS feed, which lists `site.RegularPages`, or in search, which uses
`mainSections`. As a regular page it showed up in RSS as if it were a new post. Setting
`build.list: local` fixed RSS but also dropped the page from the sitemap. `outputs:
[html]` stops the section from getting a feed of its own.

**Old URL.** `aliases: [/identity.html]` makes Hugo write a redirect page at the old
address, so existing links keep working.

**Page-only assets.** The page's CSS and JS are *not* in `assets/css/custom/`, because the
theme loads every file there on every page. Instead `custom-head.html`, which upstream
ships empty as an extension hook and `head.html` calls last, loads them when
`.Layout` is `identity`, fingerprinted with SRI in production. The theme's compiled
Tailwind only contains utilities the theme uses, so the page has its own `id-` classes.

**Typography.** The identity names Inter and JetBrains Mono, but the site has never
loaded either; it uses system fonts. The page loads both from Google Fonts for its
specimens only, and says so. Whether the site should adopt them, or the identity should
drop them, is an open decision.

**Copy SVG** strips page-only attributes and adds `xmlns`. A standalone `.svg` file
needs it, and Hugo's HTML minifier strips it from inline SVG in production builds.

**What the page taught.** Writing the light face surfaced a real rule: the Master Color
logo does **not** work on the light background. Water Blue is 1.82:1 and Night Sky Blue
3.29:1 against `#eff4fa`, so the J nearly vanishes. The page says so: Master Color on dark
grounds, Solid Black on light, and the App Tile (`favicon.svg`, which carries its own
ground) when the ground is unknown. That is why the site header can use the same logo
in both modes. Its first hover audit also caught the COPY buttons crossfading through
~1.4:1, so they now swap colours instantly.

**Verified October 2026:** axe found zero violations, including best-practice rules,
in both modes at 1280px and 390px, with no horizontal overflow. All 28 of the page's
controls were hovered in both modes and passed at 50ms and 300ms. The production build
was also served and checked: minified JS, live values, valid copied SVG. Note that
`a11y-hover-audit.js` only hovers elements whose class contains `hover:`, so it does
**not** exercise this page's own controls. Check them by hand after changing the page.

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

Both jobs run on `ubuntu-26.04`, not `ubuntu-latest`, so a runner upgrade lands as a pull
request instead of mid-deploy. GitHub moves `ubuntu-latest` to 26.04 between 2026-10-19
and 2026-11-19.

### 14. `archetypes/default.md`
Comment documenting recommended cover image dimensions.

---

## Decap CMS — removed

Removed on 2026-10-06, along with `decap-oauth-worker/` and `dev-cms.sh`. Every CMS save
committed straight to `main`, and `main` deploys on every push, so nothing sat between an
edit and the live site. Posts are now plain Markdown in `content/posts/`, written locally
and previewed with `hugo server -D`.

**History note:** an earlier commit briefly vendored the 4.9 MB `decap-cms.js` bundle. It
was rewritten out with `git filter-repo`, so the pre-rewrite SHAs `610bbfe`, `bdecafb` and
`59e712c` no longer exist; they are `a83f72c`, `cb849f2` and `0b5dd86`.

---

## `main` takes pull requests only

Since 2026-10-06, ruleset `24605285` ("main: pull requests only") keeps anything from
reaching `main`, and so the live site, except a pull request merged on GitHub. It has no
bypass list, so it applies to the repo owner too: `git push origin main` is rejected with
`GH013: Repository rule violations`. It also blocks deleting `main` and force-pushing to it.

- **0 required approvals.** GitHub does not let you approve your own pull request, so
  requiring one would make every PR unmergeable. Merging it is the review.
- **Squash or rebase only.** Merge commits are off in the repo settings and in the
  ruleset. Merge with `gh pr merge --squash` or `gh pr merge --rebase`.
- **Editing a file on github.com** offers a new branch and a pull request instead of a
  commit to `main`.
- `require_extra_approval_for_unattributed_changes: true` was filled in by GitHub, not
  asked for. It is a preview setting that, per GitHub's docs, only affects pull requests
  Copilot opens under its own identity.

Secret scanning and push protection are on too, so GitHub refuses a known secret type at
push time even when no local hook ran: a commit made on github.com, or `--no-verify`.

Forking cannot be turned off; GitHub only allows that for private repositories owned by an
organization. A fork can only reach `main` through a pull request, and `deploy.yml` does
not run on pull requests.

```bash
# What is enforced on main right now
gh api repos/jgornick/jgornick.github.com/rules/branches/main
# Remove the ruleset
gh api --method DELETE repos/jgornick/jgornick.github.com/rulesets/24605285
```

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
4. Re-derive `header.html`, `render-link.html`, `head.html` and `footer.html` from the
   **new** upstream source and re-apply the documented changes, rather than carrying the
   old overrides forward. `head.html` is a whole-file copy for a one-hunk change, so it is
   the most likely to silently miss new upstream meta tags — diff it first.
   Check whether upstream has stopped using `inline-flex` on external links — if so,
   `render-link.html` can be dropped entirely. Likewise check whether upstream now
   guards the keywords fallback on `.IsPage` — if so, drop `head.html`.
5. Check whether the theme now ships an Instagram icon (then drop ours).
6. Check the identity page's dependencies on the theme still hold. `head.html` must
   still call `layout/head/custom-head.html`. The scheme selectors must still work on a
   nested element: in dark mode, `/identity/`'s light-face palette panel must show
   `#eff4fa`. See [Identity system page](#identity-system-page).
7. Build with `hugo --gc --minify` and confirm zero warnings.
8. Compare built output file lists before/after to catch dropped assets.

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
- [ ] Logo square, nav centered, Light/Dark/System toggle on the right
- [ ] No scheme picker, content-width or language switchers (intentionally disabled)

**Links & color:**
- [ ] External links wrap mid-text with no ragged gap before them, and the icon never
      sits alone on a line or overflows the paragraph (sweep viewport widths 360–1400)
- [ ] All prose links underlined, including inside `<strong>`
- [ ] `data-theme="mn-boundary-waters"` present on `<html>`
- [ ] Code blocks use the Catppuccin Frappé palette

**Other:**
- [ ] Instagram + GitHub icons render in the author card and footer
- [ ] Footer credit line reads "Powered by Hugo & Narrow · Identity" and the link opens
      `/identity/`; the old `/identity.html` redirects there
- [ ] `/identity/` palette rows show values and ratios (not just `--color-*` names), and
      Copy SVG yields a file with `xmlns`
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

Both scripts also audit `/404.html` on every run (`EXTRA_PATHS`), after the sitemap
pages and regardless of `AXE_MAX_PAGES`. Hugo renders the 404 page outside the page
tree, so it is never in `sitemap.xml`. Following the sitemap alone missed a real
contrast failure on it for months.

`a11y-audit.sh` runs `@axe-core/cli`, which drives the installed Google Chrome through
ChromeDriver. When the two drift apart after a Chrome update, every page fails with
`session not created: This version of ChromeDriver only supports Chrome version N`.
That is a tooling error, not an audit result; update Chrome, or pass the CLI a matching
`--chromedriver-path`. `a11y-hover-audit.js` uses Playwright's bundled Chromium and is
unaffected.

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
- **page coverage**: scanning the sitemap only tests the pages the sitemap lists. The 404
  page's 1.32:1 numeral shipped unnoticed because nothing ever visited it.
- **transitions**: the hover audit samples 50ms after hovering, mid-transition. A
  crossfade that moves text and background in opposite directions (dark-on-light to
  light-on-dark) passes through near-equal colours on the way. That is a real, if brief,
  low-contrast frame, so swap such colours instantly rather than crossfading them.
