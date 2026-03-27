# LCMS — Local Content Management System

A locally-hosted CMS that exports static sites as vanilla HTML/CSS/JS.

## Quick start

```bash
npm run install:all   # install all dependencies (first time only)
npm run dev           # start CMS at http://localhost:5173
```

## Exporting

Click **Export Static Site** in the sidebar, or run:

```bash
npm run generate
```

Output lands in `output/`. Deploy that directory to any static host (Netlify, Vercel, GitHub Pages, etc.).

## Block types

| Block    | Description |
|----------|-------------|
| Markdown | Full GFM markdown with tables, lists, code fences |
| Heading  | Standalone H1–H6 with optional anchor ID |
| Alert    | Coloured banner — info / success / warning / error |
| Callout  | Side-accented callout with icon and colour |
| Quiz     | Interactive multiple-choice quiz (JS-powered in output) |
| Code     | Code block with language label and optional caption |
| Image    | Uploaded or URL-linked image with alt text and caption |
| Divider  | Horizontal rule |

## Project structure

```
lcms/
├── client/        React CMS app (Vite)
├── server/        Express API
├── generator/     Static site generator
├── content/
│   ├── pages/     Page JSON files (source of truth)
│   └── assets/    Uploaded images
└── output/        Generated static site (gitignore this)
```
