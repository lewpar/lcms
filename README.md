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

| Block      | Description |
|------------|-------------|
| Markdown   | GFM markdown with tables, code fences, headings |
| Heading    | Standalone H1–H6 with auto-generated anchor |
| Callout    | Side-accented callout in blue, green, yellow, red, purple, or grey |
| Quiz       | Interactive multiple-choice quiz with progress, feedback, and results |
| Code       | Syntax-highlighted code block with language label and caption |
| Image      | Uploaded or URL image with alt text and caption |
| Video      | Embedded video (YouTube/Vimeo) |
| Page Link  | Card linking to another page in the site |
| Case Study | Structured case study with background and instructions |
| Divider    | Horizontal rule |

## Project structure

```
lcms/
├── client/       React CMS (Vite)
├── server/       Express API + static file serving
├── generator/    Static site generator (Node, outputs HTML/CSS/JS)
├── content/      Sites, pages, and uploaded assets (source of truth)
└── output/       Generated static sites (gitignored)
```
