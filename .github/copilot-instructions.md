# AI Agent Instructions for jgornick.github.com

## Project Overview
Hugo static blog deployed to GitHub Pages. Custom domain: https://joegornick.com

## Architecture

### Blog: Hugo Static Site Generator
- **Theme**: Archie via Go modules (`config.yaml` → `module.imports`)
- **Content**: Markdown posts in `content/posts/` with specific frontmatter schema
- **Styling**: Dark theme forced via `params.mode: "dark"` + custom CSS in `assets/css/`
- **Build output**: `public/` (git-ignored, generated during CI/CD)

## Deployment Strategy

### Modern Workflow-Based (NO gh-pages branch)
- **Trigger**: Push to `main` branch
- **Process**: GitHub Actions builds Hugo → uploads artifact → deploys via `actions/deploy-pages@v4`
- **File**: `.github/workflows/deploy.yml` specifies Hugo 0.139.3 extended
- **Critical**: Environment protection rules require `main` branch in github-pages deployment policies

### Commands
```bash
# Build locally
hugo --gc --minify

# Local development
hugo server -D
```

## Project-Specific Conventions

### Branch Strategy History
- **Current**: `main` is the default branch (renamed from `hugo`)
- **Old**: `master` branch was static HTML, deleted during migration
- **Why it matters**: Workflow triggers and environment protection rules reference `main`

### Content Structure
Posts use this frontmatter schema (new posts start from `archetypes/default.md`):
```yaml
title: String (required)
description: Text (optional)
date: DateTime (YYYY-MM-DDTHH:mm:ssZ)
tldr: Text (optional)
draft: Boolean (default: true)
tags: List (optional)
toc: Boolean (default: false)
```

### Permalink Pattern
Posts **must** use: `/:year/:month/:day/:title/` (preserves existing URLs from legacy site)

## Integration Points

### GitHub Pages Environment
- **Environment name**: `github-pages` (not default behavior)
- **Protection rules**: Only `main` branch allowed to deploy
- **Update protection**: `gh api --method POST repos/jgornick/jgornick.github.com/environments/github-pages/deployment-branch-policies -f name='BRANCH' -f type='branch'`

### Dependencies
- **Hugo version**: 0.139.3 extended (hardcoded in `.github/workflows/deploy.yml`)
- **Go version**: 1.23 (for Hugo modules)
- **Theme source**: `github.com/athul/archie` via Go modules (NOT git submodule)

### External Services
- **Custom domain**: joegornick.com (verified via `static/CNAME`)

## Critical Files Not to Break

- `config.yaml`: Changing `baseURL` or `permalinks` breaks SEO and existing links
- `static/CNAME`: Required for custom domain, must contain `joegornick.com`
- `.github/workflows/deploy.yml`: Hugo version must be extended variant

## Common Pitfalls

1. **Deployment fails**: Verify `main` branch is in github-pages environment protection rules
2. **Theme not loading**: Run `hugo mod get -u` to update Go module dependencies

## Documentation Reference
- **Archie theme**: https://github.com/athul/archie
