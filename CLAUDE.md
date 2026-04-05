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

## Creating a new site

**When asked to create a new site, always do so by writing JSON files in the `content/` directory. Do NOT create HTML, CSS, JavaScript, React, or Next.js files — the CMS and generator handle all of that.**

**Do NOT run `npm run generate` or any generate command after creating a site.** The user will generate and preview the site themselves via the CMS UI. Running the generator is unnecessary and should be skipped.

A site is made up of three things in `content/`:

```
content/
  sites.json                   ← append one entry to register the site
  sites/<site-uuid>/           ← folder name must equal the site's UUID
    site.json                  ← title, theme, sections, home page blocks
    pages/<page-uuid>.json     ← filename must equal the page's UUID
    assets/                    ← leave empty unless uploading images
```

**UUID rules — critical:**
- Generate a fresh UUID v4 for the site, for each section, each page, and each block.
- The site UUID must appear in **three** places identically: the `id` field in `sites.json`, the folder name `content/sites/<uuid>/`, and nothing else.
- Each page UUID must appear in **two** places identically: the `id` field inside the page JSON, and the filename `<uuid>.json`.
- Each section UUID in `site.json` must be copied exactly into the `section` field of every page that belongs to that section.
- Each block must have an `"id"` field set to a UUID v4, unique across the entire project.

**To register a site**, append an object to `content/sites.json`:
```json
{ "id": "e1c9bcd9-ef68-475b-99b8-fa8b799afee7", "name": "Site Name", "slug": "site-slug" }
```

### `content/sites.json` — entry schema

Each entry in the array is an object:

| Field | Required | Description |
|-------|----------|-------------|
| `id` | ✅ | UUID v4. Must match the folder name `content/sites/<id>/` exactly. |
| `name` | ✅ | Human-readable site title. Must be unique across all sites. |
| `slug` | ✅ | URL-safe, lowercase, hyphens only. Must be unique. Avoid reserved words (`api`, `admin`, `assets`, `static`, `public`, `media`, `auth`, `login`, `logout`, `dashboard`, `settings`, `profile`, `account`, `upload`, `uploads`, `files`, `images`, `img`, `js`, `css`, `fonts`, `favicon`, `robots`, `sitemap`, `feed`, `rss`, `atom`, `register`). |
| `deployedGithubPages` | ❌ | Boolean. Set to `true` after a GitHub Pages deploy. Omit when creating. |

### `content/sites/<id>/site.json` — schema

Controls the site title, theme, sections (sidebar groups), header/footer HTML, and home page content.

| Field | Required | Description |
|-------|----------|-------------|
| `title` | ✅ | Site title shown in the header and browser tab. |
| `description` | ❌ | Short description of the site (used in meta tags / home page). |
| `navPages` | ✅ | Array of page UUIDs pinned to the top nav. Use `[]` if none. |
| `sections` | ✅ | Array of `{ "id": "<uuid>", "name": "Section Name" }` objects. Each is a sidebar group heading. At least one section is required. |
| `theme` | ❌ | **Omit entirely.** The CMS default theme will be used automatically. Do not generate or include a theme object. |
| `disableNav` | ❌ | Boolean. If `true`, hides the sidebar and top navigation bar entirely. Useful for single-page sites that only use the home page. Omit or set to `false` to show navigation. |
| `floatingDarkMode` | ❌ | Boolean. If `true`, adds a fixed floating dark/light mode toggle button in the corner of the exported site. Useful for single-page sites where the top bar (which normally contains the dark mode toggle) is hidden. Omit or set to `false` to disable. |
| `header` | ❌ | HTML string injected into the site header area. Omit or set to `""` for none. |
| `footer` | ❌ | HTML string injected into the site footer area. Omit or set to `""` for none. |
| `home` | ✅ | Object controlling the home page — see home fields table below. |

**`home` fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `heroTitle` | ✅ | Large title displayed in the home page hero section. |
| `heroSubtitle` | ❌ | Subtitle shown below the hero title. Use `""` for none. |
| `showPageGrid` | ❌ | Boolean. If `true`, displays a grid of all pages on the home page. |
| `blocks` | ✅ | Array of content blocks for the home page body. Can be `[]`. |

**Each page file** is named `<page-uuid>.json` and must contain an `"id"` field equal to that UUID. Pages also need: `title`, `slug`, `section` (UUID from site.json), `description`, `icon`, `order`, `createdAt`, `updatedAt`, and `blocks`.

**Blocks** are the content units on a page. Available types: `markdown`, `heading`, `code`, `callout`, `tip`, `table`, `image`, `video`, `embed`, `iframe`, `playground`, `fill-in-the-blank`, `quiz`, `flashcard`, `accordion`, `case-study`, `page-link`, `hint`, `difficulty`, `divider`, `steps`, `recipe-detail`. If you need the full schema and examples for each block type, read **[.ai/BLOCKS.md](./.ai/BLOCKS.md)**.

For the complete step-by-step authoring guide including full JSON schemas, theme options, and a worked example, read **[.ai/AUTHORING.md](./.ai/AUTHORING.md)**.

---

## Creating a new CMS block

When asked to add a new block type, you must touch **six files** in order. Skipping any one leaves the block broken in a specific way. The full step-by-step guide (with code examples for every step) is in **[.ai/CREATE-BLOCK.md](./.ai/CREATE-BLOCK.md)** — read it before starting.

### Files to touch and what to add

| # | File | What to add |
|---|------|-------------|
| 1 | `src/blockTypes.js` | Entry in `BLOCK_TYPES` array (type, icon, label, group); case in `defaultBlock()` returning the initial data object with sensible empty defaults |
| 2 | `src/components/BlockEditor.jsx` | Case in `blockSummary()` for the collapsed card text; an editor form component `MyBlockEditor({ block, onChange })`; a render line in the block dispatch inside `{expanded && ...}` |
| 3 | `src/components/Preview.jsx` | Case in the `BlockPreview` switch returning inline-styled JSX (no CSS classes — inline styles only) |
| 4 | `src/generator/index.js` | Case in `renderBlock()` returning an HTML string; light-mode CSS in `cssFor()`; dark-mode overrides in `darkModeVars` |
| 5 | `.ai/BLOCKS.md` | A new section documenting the block schema (required/optional fields, allowed values, full JSON example) |
| 6 | `CLAUDE.md` | Type name added to the block types list in the "Creating a new site" section above |

### Key conventions

- **`src/blockTypes.js`** — `type` must be all lowercase, hyphens allowed. `defaultBlock` must include every field the editor form reads, with empty/zero defaults. Never `null`.
- **`BlockEditor.jsx`** — the editor component receives `block` (current data) and `onChange(patch)` (call with a partial object to merge). Use `<div className="field">` + `<label>` for every input pair.
- **`Preview.jsx`** — inline styles only. If a live preview is not meaningful, return a grey italic placeholder string.
- **`generator/index.js`** — always `esc()` user strings, `md()` for markdown fields. Use CSS variables (`var(--primary)`, `var(--border)`, `var(--radius)`, `var(--surface)`, `var(--text)`) for theme-aware colour. Add both light **and** dark mode CSS.
- **`.ai/BLOCKS.md`** — document every field. State defaults. List all allowed enum values. Include a realistic full JSON example.

### Checklist

Before considering a new block done, verify all of the following:

- [ ] Appears in the "Add block" picker (Step 1)
- [ ] Shows editing controls when expanded (Step 2)
- [ ] Shows meaningful summary text when collapsed (Step 2)
- [ ] Renders correctly in the inline editor preview panel (Step 3)
- [ ] Renders correctly in the generated/previewed static site (Step 4)
- [ ] Looks correct in dark mode (Step 4 — dark CSS)
- [ ] Schema documented in `.ai/BLOCKS.md` (Step 5)
- [ ] Type name added to the block list in `CLAUDE.md` (Step 6)

