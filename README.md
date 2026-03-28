# LCMS — Local Content Management System

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

| Block       | Description |
|-------------|-------------|
| Markdown    | GFM markdown with tables, code fences, headings |
| Heading     | Standalone H1–H6 with auto-generated anchor |
| Callout     | Side-accented callout in blue, green, yellow, red, purple, or grey |
| Quiz        | Interactive multiple-choice quiz with progress, feedback, and results |
| Code        | Syntax-highlighted code block with language label and caption |
| Image       | Uploaded or URL image with alt text and caption |
| Video       | Embedded video (YouTube) |
| Page Link   | Card linking to another page in the site |
| Case Study  | Structured case study with background and instructions |
| Flashcard   | Flip-card deck with front/back sides and prev/next navigation |
| Table       | Data table with editable headers and rows |
| Accordion   | Collapsible sections with title and markdown content |
| Embed       | Generic iframe embed with configurable height |
| Playground  | Interactive JavaScript editor with output console |
| Divider     | Horizontal rule |

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
