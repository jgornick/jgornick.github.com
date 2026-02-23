#!/bin/bash
#
# Hugo Theme Upgrade Comparison Tool
#
# Usage: ./scripts/diff-theme-upgrade.sh [OLD_VERSION] [NEW_VERSION]
# Example: ./scripts/diff-theme-upgrade.sh v1.3.1 v1.4.0
#
# This script helps identify what changed in the theme between versions
# so you can update your customized overrides without losing new features.

set -e

THEME_NAME="hugo-narrow"
THEME_AUTHOR="tom2almighty"
CACHE_BASE="$HOME/Library/Caches/hugo_cache/modules/filecache/modules/pkg/mod/github.com/${THEME_AUTHOR}"

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get current theme version from go.mod
CURRENT_VERSION=$(grep "${THEME_AUTHOR}/${THEME_NAME}" go.mod | awk '{print $2}')

# Parse arguments
OLD_VERSION="${1:-$CURRENT_VERSION}"
NEW_VERSION="${2}"

if [ -z "$NEW_VERSION" ]; then
    echo -e "${RED}Error: NEW_VERSION required${NC}"
    echo "Usage: $0 [OLD_VERSION] NEW_VERSION"
    echo "Example: $0 v1.3.1 v1.4.0"
    echo ""
    echo "Current version: $CURRENT_VERSION"
    exit 1
fi

echo -e "${BLUE}=== Hugo Theme Upgrade Comparison ===${NC}"
echo "Theme: ${THEME_AUTHOR}/${THEME_NAME}"
echo "Comparing: $OLD_VERSION → $NEW_VERSION"
echo ""

# Theme paths
OLD_THEME_PATH="${CACHE_BASE}/${THEME_NAME}@${OLD_VERSION}"
NEW_THEME_PATH="${CACHE_BASE}/${THEME_NAME}@${NEW_VERSION}"

# Check if theme versions are cached
if [ ! -d "$OLD_THEME_PATH" ]; then
    echo -e "${YELLOW}Warning: Old theme version not in cache: $OLD_VERSION${NC}"
    echo "Run: hugo mod get github.com/${THEME_AUTHOR}/${THEME_NAME}@${OLD_VERSION}"
    exit 1
fi

if [ ! -d "$NEW_THEME_PATH" ]; then
    echo -e "${YELLOW}Downloading new theme version...${NC}"
    hugo mod get "github.com/${THEME_AUTHOR}/${THEME_NAME}@${NEW_VERSION}"
fi

# Find all customized files (files that exist both locally and in theme)
echo -e "${BLUE}Analyzing customized files...${NC}"
echo ""

CUSTOMIZED_FILES=()
while IFS= read -r -d '' local_file; do
    # Get relative path from layouts/ directory
    rel_path="${local_file#layouts/}"

    # Check if this file exists in the theme
    if [ -f "${OLD_THEME_PATH}/layouts/${rel_path}" ]; then
        CUSTOMIZED_FILES+=("$rel_path")
    fi
done < <(find layouts -type f -name "*.html" -print0)

if [ ${#CUSTOMIZED_FILES[@]} -eq 0 ]; then
    echo -e "${GREEN}No customized template files found.${NC}"
    exit 0
fi

echo -e "${YELLOW}Found ${#CUSTOMIZED_FILES[@]} customized file(s):${NC}"
for file in "${CUSTOMIZED_FILES[@]}"; do
    echo "  - $file"
done
echo ""

# Analyze each customized file
for rel_path in "${CUSTOMIZED_FILES[@]}"; do
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}File: ${rel_path}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    LOCAL_FILE="layouts/${rel_path}"
    OLD_THEME_FILE="${OLD_THEME_PATH}/layouts/${rel_path}"
    NEW_THEME_FILE="${NEW_THEME_PATH}/layouts/${rel_path}"

    # Check if file exists in new theme version
    if [ ! -f "$NEW_THEME_FILE" ]; then
        echo -e "${RED}⚠️  File removed in new theme version!${NC}"
        echo "   Your override may no longer be needed or may break the build."
        echo ""
        continue
    fi

    # Compare old theme → new theme (what changed in the theme)
    if diff -q "$OLD_THEME_FILE" "$NEW_THEME_FILE" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ No changes in theme${NC}"
        echo "  Your customizations are based on the same theme version."
        echo ""
        continue
    fi

    echo -e "${YELLOW}Theme file changed between versions${NC}"
    echo ""

    # Show what changed in the theme
    echo -e "${BLUE}Changes in theme ($OLD_VERSION → $NEW_VERSION):${NC}"
    echo "────────────────────────────────────────────────"
    diff -u "$OLD_THEME_FILE" "$NEW_THEME_FILE" || true
    echo ""

    # Compare your customizations vs old theme (what you changed)
    echo -e "${BLUE}Your customizations vs old theme:${NC}"
    echo "────────────────────────────────────────────────"
    diff -u "$OLD_THEME_FILE" "$LOCAL_FILE" || true
    echo ""

    # Compare your customizations vs new theme (what needs updating)
    echo -e "${BLUE}Your customizations vs new theme:${NC}"
    echo "────────────────────────────────────────────────"
    diff -u "$NEW_THEME_FILE" "$LOCAL_FILE" || true
    echo ""

    echo -e "${YELLOW}Action needed:${NC}"
    echo "  1. Review theme changes above"
    echo "  2. Update ${LOCAL_FILE} to incorporate new features"
    echo "  3. Preserve your customizations (marked with +/- in second diff)"
    echo "  4. Update CUSTOMIZATIONS.md with new version and line numbers"
    echo ""
done

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Analysis complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Review diffs above for each customized file"
echo "  2. Manually merge theme changes into your overrides"
echo "  3. Update go.mod: hugo mod get github.com/${THEME_AUTHOR}/${THEME_NAME}@${NEW_VERSION}"
echo "  4. Update CUSTOMIZATIONS.md with new version number"
echo "  5. Test locally: hugo server"
echo "  6. Commit changes"
