# LCMS — Learning Content Management System

## What it is
A locally-hosted CMS for building and exporting static learning websites.
The user creates sites in the CMS, authors content using a block-based editor,
then generates or deploys fully self-contained static HTML/CSS/JS sites.

## Tech stack
- **Framework**: Next.js 14 (App Router), running on Node.js
- **UI**: React 18, all components are `'use client'` (no SSR anywhere)
- **API**: Next.js route handlers under `src/app/api/`
- **Generator**: `src/generator/index.js` — a CommonJS module that builds
  static sites from content JSON into `output/`
- **Key deps**: `marked` (Markdown→HTML), `highlight.js` (code blocks), `uuid`

## Commands
- `npm run dev` — start dev server (hot reload)
- `npm run build` — production build
- `npm run start` — run production build
- `npm run generate` — CLI: `node src/generator/index.js <siteId> <slug>`

## Project structure
```
src/
  app/
    page.jsx          # Root page — renders <App />
    layout.jsx        # Root layout
    api/              # All API route handlers
      cms-settings/   # CMS-wide settings (base URL, themes)
      sites/          # CRUD for sites; nested: pages, settings, assets,
                      #   generate, deploy
    site-preview/     # Serves generated HTML from output/ in an iframe
    assets/           # Serves uploaded asset files from content/
  components/         # React UI components (all 'use client')
  generator/          # Static site builder (CommonJS module + CLI)
  lib/
    paths.js          # All filesystem paths; ROOT = process.cwd()
    storage.js        # readSites() / writeSites()
    validate.js       # UUID validation, path traversal prevention

content/              # Source of truth (tracked in git)
  sites.json          # Array of { id, name, slug, deployedGithubPages }
  cms-settings.json   # CMS-wide settings
  sites/<id>/
    site.json         # Per-site settings (title, theme, sections, nav)
    pages/<id>.json   # Individual page content (blocks array)
    assets/           # Uploaded images for this site

output/               # Generated static sites (gitignored)
  <slug>/             # index.html + page dirs + styles.css + js files

docs/                 # GitHub Pages deployments (tracked in git)
  <slug>/             # Copy of output/<slug>/ committed and pushed
```

## How data flows
1. User edits a site/page in the React UI
2. UI calls REST API routes under `/api/sites/[siteId]/...`
3. API routes read/write JSON files in `content/` via `src/lib/paths.js`
4. When the user generates a site, the API calls `generate(siteId, slug, ROOT)`
   from `src/generator/index.js` which reads `content/` and writes `output/`
5. The CMS previews the generated site in an iframe via `/site-preview/[...path]`
   (served by a Next.js route handler reading from `output/`)
6. GitHub Pages deploy: generate → copy to `docs/<slug>/` → git add/commit/push

## Important conventions
- `ROOT` is always `process.cwd()` (not `__dirname`) — Next.js compiles route
  handlers into `.next/server/` so `__dirname` is unreliable at runtime
- The generator is a **synchronous** CommonJS module; it is imported directly
  by API routes (not spawned as a child process)
- All HTML served from `/site-preview/` has a `<base href="...">` tag injected
  so relative asset URLs resolve correctly regardless of trailing slash behaviour
- The `docs/` folder is what GitHub Pages serves; `output/` is local only

---

## General rules

**Do not use emojis anywhere unless the user explicitly asks for them.** This applies to all block content, titles, text fields, code, labels, CSS comments, and any other output. The `icon` field on page files is the only exception; a simple relevant emoji there is fine.

---

## Task-specific instructions

**When asked to create or author a site**, read `.github/instructions/creating-sites.instructions.md` before doing anything.

**When asked to add or create a new block type**, read `.github/instructions/creating-blocks.instructions.md` before doing anything.

