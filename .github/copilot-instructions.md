# AI Agent Instructions for jgornick.github.com

## Project Overview
Hugo static blog deployed to GitHub Pages with Decap CMS admin interface. Custom domain: https://joegornick.com

## Architecture

### Blog: Hugo Static Site Generator
- **Theme**: Archie via Go modules (`config.yaml` → `module.imports`)
- **Content**: Markdown posts in `content/posts/` with specific frontmatter schema
- **Styling**: Dark theme forced via `params.mode: "dark"` + custom CSS in `assets/css/`
- **Build output**: `public/` (git-ignored, generated during CI/CD)

### CMS: Decap CMS
- **Admin UI**: `static/admin/` served at `/admin/` endpoint
- **Config**: `static/admin/config.yml` defines collections, fields, and backend
- **Authentication**: GitHub OAuth via Cloudflare Workers proxy (not Netlify/self-hosted)
- **Backend**: Points to `main` branch (changed from `hugo` - critical for deployments)

### OAuth Proxy: Cloudflare Worker
- **Location**: `decap-oauth-worker/` subdirectory
- **Purpose**: GitHub OAuth flow for Decap CMS authentication
- **Deployment**: `npx wrangler deploy` from `decap-oauth-worker/`
- **Secrets**: `OAUTH_CLIENT_ID` and `OAUTH_CLIENT_SECRET` set via `wrangler secret put`

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

# Local development (Hugo only)
hugo server -D

# Local CMS development (RECOMMENDED)
./dev-cms.sh  # Starts both Decap backend + Hugo server
```

## Critical Developer Workflows

### Local CMS Testing (Without GitHub)
**Use the `dev-cms.sh` script** - starts both services with proper configuration:
1. Decap CMS backend on http://localhost:8081 (local mode, no auth required)
2. Hugo dev server on http://localhost:1313
3. Access CMS at http://localhost:1313/admin/ - makes real commits to local files
4. Changes immediately visible in Hugo preview

**Never** manually start `npx decap-server` and `hugo server` separately - the script handles proper coordination.

### Cloudflare Worker Development
```bash
cd decap-oauth-worker
npx wrangler dev           # Local development
npx wrangler deploy        # Deploy to production
npx wrangler tail          # View logs
npx wrangler secret put OAUTH_CLIENT_ID  # Set secrets
```

## Project-Specific Conventions

### Branch Strategy History
- **Current**: `main` is the default branch (renamed from `hugo`)
- **Old**: `master` branch was static HTML, deleted during migration
- **Why it matters**: CMS config, workflow triggers, and environment protection rules reference `main`

### Content Structure
Posts use this frontmatter schema (enforced in `static/admin/config.yml`):
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
- **OAuth Worker**: https://joegornick-cms-oauth.jgornick.workers.dev
- **GitHub OAuth App**: Callback must match worker URL

## Critical Files Not to Break

- `config.yaml`: Changing `baseURL` or `permalinks` breaks SEO and existing links
- `static/CNAME`: Required for custom domain, must contain `joegornick.com`
- `.github/workflows/deploy.yml`: Hugo version must be extended variant
- `static/admin/config.yml`: Backend `branch` must match default branch name

## Common Pitfalls

1. **CMS won't authenticate**: Check worker is deployed and `base_url` in CMS config matches worker URL
2. **Deployment fails**: Verify `main` branch is in github-pages environment protection rules
3. **Theme not loading**: Run `hugo mod get -u` to update Go module dependencies
4. **Local CMS doesn't save**: Must use `local_backend: true` in `static/admin/config.yml`

## Documentation Reference
- **Setup guide**: `docs/decap-cms-upgrade.md` - comprehensive migration documentation
- **Archie theme**: https://github.com/athul/archie
- **Decap CMS**: https://decapcms.org/docs/configuration-options/
