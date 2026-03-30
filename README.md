# LCMS — Learning Content Management System

A locally-hosted CMS for building and exporting static learning sites as vanilla HTML/CSS/JS.

## Requirements

- Node.js 18+

## Getting started

```bash
# Install dependencies (first time only)
npm install
cd client && npm install && cd ..
```

| Script | Description |
|--------|-------------|
| `./start.sh` | Start in development mode — API on `:3001`, CMS on `:5173` (Vite HMR) |
| `./start-prod.sh` | Build the client then start a single production server on `:3001` |
| `./stop.sh` | Stop whichever mode is running |

## What it does

The CMS lets you create multiple sites, each with a home page and any number of content pages. Pages are built from blocks using a split-pane editor with a live preview on the right. Saving a page automatically regenerates the preview.

Sites are exported as fully self-contained static sites — no runtime dependencies, no server required.

## Block types

### Content
| Block       | Description |
|-------------|-------------|
| Markdown    | GFM markdown with tables, code fences, headings |
| Heading     | Standalone H1–H6 with auto-generated anchor |
| Callout     | Side-accented callout in blue, green, yellow, red, purple, or grey |
| Difficulty  | Difficulty rating badge (Easy / Medium / Hard / Very Hard) |
| Divider     | Horizontal rule |

### Media
| Block       | Description |
|-------------|-------------|
| Image       | Uploaded or URL image with alt text and caption |
| Video       | Embedded video (YouTube) |
| Code        | Syntax-highlighted code block with language label and caption |
| Embed       | Generic iframe embed with configurable height |

### Interactive
| Block              | Description |
|--------------------|-------------|
| Quiz               | Multiple-choice quiz with progress tracking, per-question feedback, and a results screen |
| Flashcard          | Flip-card deck with front/back sides and prev/next navigation |
| Fill in the Blank  | Cloze-style exercise with plain text or syntax-highlighted code mode |
| Accordion          | Collapsible sections with title and markdown content |
| Playground         | In-browser JavaScript editor with an output console |

### Structure
| Block       | Description |
|-------------|-------------|
| Table       | Data table with editable headers and rows |
| Page Link   | Card linking to another page in the site |
| Case Study  | Structured case study with background and instructions |

## Deployment

The **Deploy** button in the sidebar offers two targets.

### Nginx (local server)

Builds the site and copies it to `/var/www/html/<site-slug>/`, making it immediately live via nginx. Requires nginx to be installed and the web root to be writable by your user — see [INSTALL.md](INSTALL.md) for the one-time setup.

The nginx option is greyed out if nginx is not detected on the system.

### GitHub Pages

Builds the site, copies it to `docs/<site-slug>/`, then runs `git add docs/ && git commit && git push`. A commit message field is shown in the dialog before deploying; if left blank it defaults to `Deploy <site-slug> to GitHub Pages`.

**One-time setup:** in your GitHub repository settings, set the Pages source to **Deploy from a branch** → branch `master` (or `main`) → folder `/docs`.

## Project structure

```
lcms/
├── client/       React CMS (Vite)
├── server/       Express API + static file serving
├── generator/    Static site generator (Node, outputs HTML/CSS/JS)
├── content/      Sites, pages, and uploaded assets (source of truth)
└── output/       Generated static sites (gitignored)
```

## Dependencies

**Server** (`package.json`)

| Package | Purpose |
|---------|---------|
| `express` | HTTP server and API routing |
| `cors` | Cross-origin headers for dev mode |
| `multer` | Multipart file upload handling (asset uploads) |
| `marked` | Markdown → HTML in the static site generator |
| `uuid` | Generating unique IDs for sites, pages, and blocks |
| `concurrently` | Running server and Vite dev server in parallel |

**Client** (`client/package.json`)

| Package | Purpose |
|---------|---------|
| `react` / `react-dom` | CMS UI framework |
| `marked` | Live markdown rendering in the CMS block preview |
| `highlight.js` | Syntax highlighting in the CMS code block preview |
| `vite` | Dev server with HMR and production bundler |
| `@vitejs/plugin-react` | Vite plugin for JSX and React Fast Refresh |

**Generated sites** (no npm — loaded from CDN only when needed)

| Library | Used by |
|---------|---------|
| `highlight.js` (CDN) | Pages with a Code block |
