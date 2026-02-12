# Decap CMS Upgrade Plan

## Summary

Convert your Hugo blog from manual submodule deployment to GitHub Actions with Decap CMS admin interface. Both the blog (`https://joegornick.com`) and CMS admin (`https://joegornick.com/admin/`) will be hosted on GitHub Pages. Authentication will use GitHub OAuth via a Cloudflare Workers proxy (free tier, no credit card required). The resume section will be removed, and the submodule structure simplified. Local development mode allows testing CMS changes before pushing to GitHub.

## Key Decisions

- **Deployment:** Switched from submodule to gh-pages branch via GitHub Actions - eliminates manual deploy script and simplifies repository structure
- **CMS hosting:** Same domain as blog rather than home server - reduces complexity, no need for local server or VPN access
- **Authentication:** Cloudflare Workers OAuth proxy over self-hosted Git Gateway - free tier, serverless, minimal maintenance vs. running multiple servers
- **Resume removal:** Cleaner content model with single collection type, resume not frequently updated
- **Local development:** Added local backend mode - allows testing CMS workflow without GitHub authentication or commits

## Implementation Steps

### 1. Create Decap CMS admin interface files

- Add `static/admin/index.html` with Decap CMS loader script
- Add `static/admin/config.yml` configuring:
  - GitHub backend pointing to `jgornick/jgornick.github.com` repo
  - OAuth proxy URL (placeholder, updated after step 5)
  - Posts collection matching your frontmatter schema: `title`, `date`, `tags`, `categories`, `draft`
  - Slug pattern: `{{year}}-{{month}}-{{day}}-{{slug}}`
  - Media folder: `static/images` for future uploads
  - **Enable local backend:** `local_backend: true` for local development

### 2. Remove resume content and layouts

- Delete `content/resume/` folder
- Delete `layouts/resume/` folder
- Delete `layouts/shortcodes/gdoc.html`
- Delete `static/css/resume.css`

### 3. Create GitHub Actions workflow

- Add `.github/workflows/deploy.yml`:
  - Trigger on push to `main` branch
  - Checkout with `submodules: recursive` for theme
  - Setup Hugo extended latest version
  - Build with `hugo --minify`
  - Deploy to `gh-pages` branch using `peaceiris/actions-gh-pages@v3`
  - Set `GITHUB_TOKEN` for authentication

### 4. Test locally before pushing

- Run `npx @decaporg/decap-server` in one terminal (starts local CMS backend on port 8081)
- Run `hugo server -D` in another terminal (starts Hugo dev server on port 1313)
- Visit `http://localhost:1313/admin/` → CMS interface loads in local mode
- Create/edit test posts → changes write directly to local `content/posts/` files
- Verify changes appear in Hugo dev server immediately
- No GitHub commits required for testing

### 5. Deploy Cloudflare Workers OAuth proxy

- Sign up for free Cloudflare account (no credit card)
- Clone `sterlingwes/decap-proxy` template
- Create GitHub OAuth App:
  - Homepage URL: `https://YOUR_WORKER.workers.dev`
  - Callback: `https://YOUR_WORKER.workers.dev/callback`
- Install Wrangler CLI: `npm install -g wrangler`
- Configure Worker with Client ID and Secret as environment secrets
- Deploy: `wrangler deploy`
- Update `static/admin/config.yml` `base_url` with deployed worker URL

### 6. Configure GitHub Pages deployment

- Update repository Settings → Pages:
  - Source: "Deploy from a branch"
  - Branch: `gh-pages` / `root`
- Verify `static/CNAME` contains `joegornick.com`

### 7. Remove submodule and cleanup

- Remove `public/` folder and submodule reference from `.gitmodules`
- Run `git rm --cached public` to untrack submodule
- Delete or archive `deploy.sh` (no longer needed)
- Add `public/` to `.gitignore` if not already present

### 8. Update Hugo config

- Keep `config.yaml` mostly unchanged
- Verify `baseURL: "https://joegornick.com/"`
- Keep `permalinks.posts` to maintain existing URLs

## Verification

### Local Testing

- Run `npx @decaporg/decap-server` and `hugo server -D`
- Visit `http://localhost:1313/admin/` → CMS loads in local mode (no login required)
- Create test post → file appears in `content/posts/`
- Edit existing post → changes save to local file
- Check `http://localhost:1313/` → post appears on blog

### Production Testing

- Push changes to `main` branch → GitHub Actions builds and deploys to gh-pages
- Visit `https://joegornick.com` → blog renders correctly with all 9 posts
- Visit `https://joegornick.com/admin/` → Decap CMS admin loads
- Click "Login with GitHub" → OAuth flow redirects through Cloudflare Worker → authenticated
- Create test draft post in CMS → appears as new commit in repo
- Publish draft → site rebuilds via GitHub Actions → post visible on blog
- Check old post URLs still work (permalink compatibility)

## Local Development Workflow

Daily workflow becomes:
```bash
# Terminal 1: Start CMS backend
npx @decaporg/decap-server

# Terminal 2: Start Hugo
hugo server -D

# Open browser to http://localhost:1313/admin/
# Make changes in CMS → files update locally
# Preview at http://localhost:1313/
# Commit and push when ready
```

This is completely optional - you can still edit markdown files directly if you prefer!

## Cloudflare Workers Information

**Cost:**
- Free tier: 100,000 requests/day
- No credit card required
- Your use case will be well under 1% of the free quota

**What's required:**
1. Email address for Cloudflare account
2. Choose a subdomain name for your worker (e.g., `jgornick-decap.workers.dev`)
3. Install `wrangler` CLI tool: `npm install -g wrangler`
4. Run `wrangler login` to connect your account
5. Deploy the OAuth proxy code
