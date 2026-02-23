# Hugo Narrow Theme Customizations

This document tracks all customizations made to the hugo-narrow theme to ensure they can be reapplied after theme upgrades.

**Theme:** `github.com/tom2almighty/hugo-narrow` v1.3.1
**Last Updated:** February 22, 2026

**Philosophy:** Minimize layout overrides by using CSS where possible. Only override templates when structural HTML changes are required.

---

## Files Created (Layout Overrides)

### 1. `layouts/_partials/navigation/header.html`
**Purpose:** Show logo on mobile + remove circular rounding + reorganize navigation
**Why override needed:** Requires structural HTML changes:
- Removing `hidden` class from logo container
- Removing `rounded-full` class from logo anchor
- Moving navigation from always-visible to desktop-only (`hidden md:flex`)
- Reorganizing mobile control buttons

**Changes from theme:**
- Line 4: Changed `hidden w-full items-center md:flex` → `flex w-full items-center`
- Line 9: Removed `rounded-full` class from logo anchor tag
- Line 25: Changed `mx-8 flex` → `mx-8 hidden md:flex` (nav desktop-only)
- Line 42: Changed `text-muted-foreground hover:text-primary` → `text-primary` (consistent link colors)
- Line 56: Desktop controls section
- Line 70: Mobile controls reorganized with `flex md:hidden ml-auto`

**Note:** Cannot be done with CSS alone due to multiple inline class changes across different elements and structural reorganization.

---

### 2. `layouts/_partials/navigation/mobile-menu-toggle.html`
**Purpose:** Right-align mobile menu dropdown + normalize link colors
**Why override needed:** Requires structural HTML changes to class attributes

**Changes from theme:**
- Line 16: Changed `left-0` → `right-0` (align menu to right side below button)
- Line 16: Changed `w-80` → `w-auto` (let menu width adjust to content)
- Line 40: Changed `text-muted-foreground hover:text-primary` → `text-primary` (consistent link colors)

**Note:** Mobile menu positioning changed to align with mobile control buttons on the right. Cannot be overridden with CSS due to inline Tailwind utility classes.

---

## Files Created (New Assets)

### 3. `assets/icons/instagram.svg`
**Purpose:** Add Instagram icon for social media links
**Content:** SVG with camera icon (rect, circle, line elements)
**Why:** Theme had GitHub icon but was missing Instagram icon (showed fallback circle+plus icon)

---

## CSS Customizations

All CSS customizations are in: `assets/css/custom/frappe.css`

These CSS rules override theme defaults **without requiring layout file copies**.

### 4. Catppuccin Frappé Color Scheme
**Lines 1-90:** Complete color scheme implementation using OKLCH color space

**Key change (Feb 16, 2026):** Updated foreground colors on colored backgrounds
- `--color-primary-foreground`: Changed from Crust (dark `0.234`) to Text (light `0.850`)
- `--color-secondary-foreground`: Changed to Text (light) for consistency
- `--color-accent-foreground`: Changed to Text (light) for consistency

**Why:** Colored buttons (blue/mauve/lavender backgrounds) need light text for proper contrast. Original dark text on medium-light backgrounds failed readability requirements.

### 5. Mobile Font Size Increase
```css
@media (max-width: 40rem) {
  .prose {
    font-size: 1rem !important;
  }
}
```
**Why:** Default mobile font was 0.9rem (14.4px), too small. Increased to 1rem (16px).

---

### 6. Link Color Normalization
```css
/* Normalize visited link colors */
a:visited {
  color: var(--color-primary);
}

.prose a:visited {
  color: var(--tw-prose-links);
}

nav a:visited {
  color: inherit;
}

/* Handle links with <strong> tags */
.prose strong > a,
.prose strong > a:visited {
  color: var(--tw-prose-links) !important;
  text-decoration: underline !important;
  /* ... full properties */
}

/* Ensure ALL links in prose are underlined */
.prose a {
  text-decoration: underline !important;
  text-decoration-color: var(--tw-prose-links) !important;
  /* ... full properties */
}
```

**Why:**
- Visited links showed different colors
- Links inside `<strong>` tags inherited strong's color instead of link color
- Base CSS reset sets `a { text-decoration: inherit; }`, so links in strong tags had no underline

---

### 7. Navigation Link Colors
```css
/* Override nav link default color to use primary color */
.nav-link {
  color: var(--color-primary) !important;
}

/* Active nav links use accent color with dark text */
.nav-link.nav-active-indicator {
  background-color: var(--color-accent) !important;
  color: oklch(0.234 0.019 265.326) !important;
}

/* Nav link hover states */
.nav-link:hover {
  color: var(--color-primary) !important;
  background-color: color-mix(in oklab, var(--color-primary) 10%, transparent) !important;
}
```

**Why:**
- Theme uses `text-muted-foreground` for nav links, which is too muted
- Navigation should match primary color scheme for consistency
- Active state uses accent background with dark text for proper contrast

---

### 8. Button Contrast Fix
```css
/* Override primary button text to use dark text for better contrast on light blue */
.bg-primary.text-primary-foreground {
  color: oklch(0.234 0.019 265.326) !important; /* Crust - dark text on light blue button */
}
```

**Why:**
- Primary color (blue #8caaee at 74% lightness) needs dark text for proper contrast
- Light text on medium-light background failed readability requirements
- Dark text (Crust at 23% lightness) provides 51% lightness difference = excellent contrast
- Applies to "View All Posts" button and similar primary-colored buttons

---

### 9. Mobile Menu Dropdown
```css
.mobile-menu.dropdown-menu {
  min-width: auto !important;
}

#mobile-menu {
  left: auto !important;
  right: 0 !important;
}
```

**Why:**
- Theme sets `min-width: 20rem`, preventing content-based sizing
- Logo being visible pushed menu button right, but dropdown was still left-anchored (bleeding off-screen)
- **CSS-only solution** replaces what was previously a full layout override

---

### 10. Breadcrumb Mobile Stacking
```css
@media (max-width: 48rem) {
  .breadcrumb ol {
    flex-direction: column !important;
    align-items: flex-start !important;
  }

  .breadcrumb span[class*="max-w"] {
    max-width: none !important;
  }
}
```

**Why:**
- Mobile portrait mode was squishing breadcrumb text
- Theme uses `flex items-center` which creates horizontal layout
- **CSS-only solution** overrides inline classes without needing template copy

---
```css
/* Normalize visited link colors */
a:visited {
  color: var(--color-primary);
}

.prose a:visited {
  color: var(--tw-prose-links);
}

nav a:visited {
  color: inherit;
}

/* Handle links with <strong> tags */
.prose strong > a,
.prose strong > a:visited {
  color: var(--tw-prose-links) !important;
  text-decoration: underline !important;
  text-decoration-color: var(--tw-prose-links) !important;
  text-decoration-thickness: 1px !important;
  text-underline-offset: 2px !important;
}

.prose strong > a:hover {
  color: var(--color-primary) !important;
  text-decoration-color: transparent !important;
}

.prose a > strong,
.prose a:visited > strong {
  color: inherit !important;
}

.prose p > a > strong {
  color: inherit !important;
}

/* Ensure ALL links in prose are underlined */
.prose a {
  text-decoration: underline !important;
  text-decoration-color: var(--tw-prose-links) !important;
  text-decoration-thickness: 1px !important;
  text-underline-offset: 2px !important;
}

.prose a:hover {
  text-decoration-color: transparent !important;
}
```

**Why:**
1. Visited links showed different colors (inconsistent UX)
2. Links inside `<strong>` tags inherited strong's color instead of link color
3. Base CSS reset sets `a { text-decoration: inherit; }`, so links in strong tags had no underline
4. Three problematic scenarios: `<strong><a>`, `<a><strong>`, and visited states

---

## Configuration Changes

### 11. `config/_default/hugo.yaml`
**Line 49:** Changed `style: github` → `style: catppuccin-frappe`

**Why:** GitHub syntax highlighting theme was unreadable in light mode. Catppuccin Frappé matches the site's color scheme.

---

### 12. `config/_default/params.yaml`
**Lines 79-83:** Added analytics configuration
```yaml
analytics:
  enabled: true
  google:
    enabled: true
    id: "G-CYCL78ZG85"
```

**Why:** Hugo-narrow theme uses `params.yaml` for analytics config (not `hugo.yaml` like Hugo defaults).

---

### 13. `archetypes/default.md`
**Line 8:** Added comment to cover field
```yaml
cover: "" # Recommended: 1920×1080px (16:9) or 2000×1000px (2:1)
```

**Why:** Provides guidance for cover image dimensions based on theme's aspect ratio utilities.

---

## Upgrade Checklist

When upgrading hugo-narrow theme:

### Before Upgrading:
- [ ] Note current theme version: v1.2.3
- [ ] Back up `layouts/_partials/navigation/header.html`
- [ ] Back up `assets/css/custom/frappe.css`
- [ ] Back up `assets/icons/instagram.svg`

### After Upgrading:
- [ ] Compare `header.html` with theme's new version
- [ ] Check if theme added Instagram icon (can remove ours if so)
- [ ] Verify CSS overrides still work (test breadcrumbs, mobile menu, links)
- [ ] Test on mobile: logo visibility, breadcrumb stacking, menu dropdown position
- [ ] Verify syntax highlighting still works with Catppuccin Frappé
- [ ] Check analytics integration still functions

### Files to Watch in Theme Updates:
- `layouts/_partials/navigation/header.html` - Our only layout override
- `layouts/_partials/navigation/breadcrumb.html` - We use CSS to override this
- `layouts/_partials/navigation/mobile-menu-toggle.html` - We use CSS to override this
- Icon system changes (might add Instagram natively)

---

## Quick Reference

| What Needed Fixing | Solution Type | Files/Code |
|-------------------|---------------|------------|
| Logo hidden on mobile | **Layout override** | `layouts/_partials/navigation/header.html` |
| Logo appears circular | **Layout override** | `layouts/_partials/navigation/header.html` |
| Breadcrumbs squished on mobile | **CSS override** | `.breadcrumb ol { flex-direction: column !important; }` |
| Mobile menu bleeds off-screen | **CSS override** | `#mobile-menu { left: auto !important; right: 0 !important; }` |
| Mobile menu too wide | **CSS override** | `.mobile-menu.dropdown-menu { min-width: auto !important; }` |
| Instagram icon missing | **New asset** | `assets/icons/instagram.svg` |
| Mobile text too small | **CSS override** | `.prose { font-size: 1rem !important; }` |
| Visited links different color | **CSS override** | `a:visited { color: var(--color-primary); }` |
| Links in `<strong>` wrong color/underline | **CSS override** | `.prose strong > a`, `.prose a` rules |
| Nav links wrong color/contrast | **CSS override** | `.nav-link { color: var(--color-primary) !important; }` |
| Primary button low contrast | **CSS override** | `.bg-primary.text-primary-foreground` dark text override |
| Code blocks unreadable in light | **Config change** | `hugo.yaml`: `style: catppuccin-frappe` |
| Analytics not working | **Config change** | `params.yaml`: analytics section |
| Cover size unclear | **Config change** | `archetypes/default.md`: comment |

---

## Why This Approach Works

### Minimizing Layout Overrides
- **Before:** 3 layout files (breadcrumb, header, mobile-menu-toggle)
- **After:** 1 layout file (header only)
- **Benefit:** Fewer files to maintain, easier upgrades

### CSS vs Template Philosophy
- **Use CSS when:** Changing styles, positioning, sizing, colors
- **Use templates when:** Changing HTML structure, element order, removing/adding elements
- **Our approach:** Only `header.html` requires structural changes; rest handled by CSS

### Upgrade-Friendly Design
CSS overrides using `!important` are:
- ✅ Explicit about what they're changing
- ✅ Survive theme updates (HTML structure stays same)
- ✅ Easy to test (inspect element shows both theme + custom CSS)
- ✅ Documented in one file (`frappe.css`)

Template overrides are:
- ✅ Minimized to only what CSS can't handle
- ✅ Well-documented with inline comments
- ✅ Easy to diff against theme updates

---

## Testing After Changes

**Mobile (< 640px width):**
- [ ] Logo visible in header
- [ ] Logo has square shape with rounded corners (not circular)
- [ ] Breadcrumbs stack vertically with readable text
- [ ] Mobile menu button on right side
- [ ] Mobile menu dropdown appears right-aligned, doesn't bleed off screen
- [ ] Mobile menu dropdown sizes to content
- [ ] Body text is 16px (comfortable to read)

**Links:**
- [ ] All links are underlined
- [ ] Links in `<strong>` tags are underlined
- [ ] `<strong>` inside links maintains link color
- [ ] Visited links use same blue as unvisited
- [ ] Hover removes underline and adds background

**Navigation & Buttons:**
- [ ] Nav links use primary blue color (not muted gray)
- [ ] Nav links have good contrast against card background
- [ ] Active nav link has accent background with dark text
- [ ] "View All Posts" button has dark text on light blue (readable)
- [ ] Button hover states work properly

**Other:**
- [ ] Code blocks use Catppuccin Frappé colors
- [ ] Instagram icon appears in author section and footer
- [ ] Google Analytics script present in `<head>`

---

## Notes

- **Hugo's template lookup:** Project `layouts/` → Theme `layouts/` (ours override theme's)
- **CSS specificity:** `!important` used only where needed to override inline Tailwind classes
- **Color variables:** `--color-primary`, `--tw-prose-links` defined by frappe.css theme
- **Theme structure:** hugo-narrow loads as Go module (files not in project directory)
- **Inline classes:** Theme uses Tailwind utility classes directly in templates (why CSS overrides needed)

