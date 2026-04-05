# LCMS — Learning Content Management System

A locally-hosted CMS for building and exporting static learning sites as vanilla HTML/CSS/JS.

## Requirements

- Node.js 18+

## Getting started

```bash
# Install dependencies (first time only)
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the Next.js dev server on `:3000` (hot reload) |
| `npm run build` | Build for production |
| `npm run start` | Run the production build |

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

The **Deploy** button in the sidebar deploys to GitHub Pages.

Builds the site, copies it to `docs/<site-slug>/`, then runs `git add docs/ && git commit && git push`. A commit message field is shown in the dialog before deploying; if left blank it defaults to `Deploy <site-slug> to GitHub Pages`.

**One-time setup:** in your GitHub repository settings, set the Pages source to **Deploy from a branch** → branch `master` (or `main`) → folder `/docs`.

## Project structure

```
lcms/
├── src/
│   ├── app/          Next.js App Router (pages + API route handlers)
│   ├── components/   React UI components
│   ├── generator/    Static site builder (reads content/, writes output/)
│   └── lib/          Shared server utilities (paths, storage, validation)
├── content/          Sites, pages, and uploaded assets (source of truth)
├── docs/             GitHub Pages deployments (committed to git)
└── output/           Generated static sites (gitignored)
```

## Dependencies

| Package | Purpose |
|---------|---------|
| `next` | App framework — UI bundling and API route handlers |
| `react` / `react-dom` | CMS UI |
| `marked` | Markdown → HTML (editor preview and static site generator) |
| `highlight.js` | Syntax highlighting in the CMS code block preview |
| `uuid` | Generating unique IDs for sites, pages, and blocks |

**Generated sites** (no npm — loaded from CDN only when needed)

| Library | Used by |
|---------|---------|
| `highlight.js` (CDN) | Pages with a Code block |
