# LCMS — Site Authoring Guide

Step-by-step instructions for building a complete learning site by writing JSON files directly into the `content/` directory. No UI interaction or API calls are needed.

---

## UUIDs — the single most important rule

**Every site, every section, every page, and every block has a UUID (version 4) as its identifier.**

- Generate a fresh UUID v4 for each of these things before you start writing files.
- UUIDs must be unique across the **entire project** — not just within one site.
- A UUID looks like: `e1c9bcd9-ef68-475b-99b8-fa8b799afee7`

These three things must all share the **same UUID**:
1. The `"id"` field in `content/sites.json` for a site
2. The folder name `content/sites/<uuid>/`
3. Nothing else — they must match exactly

For pages, these two things must share the **same UUID**:
1. The `"id"` field inside the page JSON file
2. The filename `<uuid>.json`

For sections, the UUID in `site.json` sections array must match the `"section"` field in every page that belongs to that section.

---

## Directory structure for a site

```
content/
  sites.json                        ← master registry of all sites
  sites/
    <site-uuid>/                    ← folder name = site UUID (matches sites.json id)
      site.json                     ← site settings, theme, sections, home page
      pages/
        <page-uuid>.json            ← filename = page UUID (matches id field inside)
      assets/                       ← uploaded images (leave empty if none)
```

---

## Step 1 — Generate all UUIDs up front

Before writing any files, generate and note down all the UUIDs you will need:

- **1 site UUID** — used in `sites.json`, and as the folder name under `content/sites/`
- **1 UUID per section** — used in `site.json` and referenced by pages
- **1 UUID per page** — used as the filename and as the `id` field inside the file
- **1 UUID per block** — used as the `id` field of every block in `site.json` and page files

---

## Step 2 — Register the site in `content/sites.json`

`sites.json` is an array of site descriptor objects. Append a new entry:

```json
[
  {
    "id": "e1c9bcd9-ef68-475b-99b8-fa8b799afee7",
    "name": "My Course Title",
    "slug": "my-course-title"
  }
]
```

| Field  | Rules |
|--------|-------|
| `id`   | The site UUID you generated. Must be unique across all sites. The folder `content/sites/<id>/` must use this exact value as its name. |
| `name` | Human-readable title. Must be unique across all sites. |
| `slug` | URL-safe, lowercase, hyphens only. Must be unique. Avoid reserved words: `assets`, `api`, `admin`, `static`, `public`, `media`, `upload`, `uploads`, `files`, `images`, `img`, `js`, `css`, `fonts`, `favicon`, `robots`, `sitemap`, `feed`, `rss`, `atom`, `auth`, `login`, `logout`, `signup`, `register`, `dashboard`, `settings`, `profile`, `account`. |

---

## Step 3 — Create the site directory

The directory name **must exactly match** the `id` in `sites.json`:

```
content/sites/e1c9bcd9-ef68-475b-99b8-fa8b799afee7/
content/sites/e1c9bcd9-ef68-475b-99b8-fa8b799afee7/pages/
content/sites/e1c9bcd9-ef68-475b-99b8-fa8b799afee7/assets/
```

---

## Step 4 — Write `content/sites/<site-uuid>/site.json`

Controls the site title, description, sections (sidebar groups), navigation, theme, and home page content.

```json
{
  "title": "My Course Title",
  "description": "A short description of what this site teaches.",
  "navPages": [],
  "sections": [
    { "id": "a3f1c2d4-0000-0000-0000-000000000001", "name": "Reading" },
    { "id": "a3f1c2d4-0000-0000-0000-000000000002", "name": "Activities" }
  ],
  "theme": {
    "primary": "#6c63ff",
    "sidebarBg": "#1e293b",
    "contentBg": "#ffffff",
    "textColor": "#1e293b",
    "darkPrimary": "#7c74ff",
    "darkSidebarBg": "#131925",
    "darkContentBg": "#0f172a",
    "darkTextColor": "#e2e8f0",
    "radius": 8,
    "font": "inter",
    "fontSize": 16,
    "contentWidth": 800,
    "sidebarWidth": 240,
    "showBreadcrumbs": true,
    "showReadingTime": true
  },
  "home": {
    "heroTitle": "My Course Title",
    "heroSubtitle": "A short subtitle shown on the home page.",
    "showPageGrid": true,
    "blocks": [
      {
        "id": "home-block-1",
        "type": "markdown",
        "content": "Introductory paragraph for the home page."
      }
    ]
  }
}
```

### `sections`
Each section is a sidebar group heading. Pages are assigned to sections by matching their `section` field to a section `id`.

**Critical:** Every section `id` must be a UUID v4 that you generate. You will copy this UUID exactly into the `section` field of every page that belongs to that section.

`navPages` can be left as `[]`; the sidebar is built automatically from the pages directory.

### `theme` — key fields

| Field | Description |
|-------|-------------|
| `primary` | Accent/link colour (hex) |
| `sidebarBg` / `darkSidebarBg` | Sidebar background in light/dark mode |
| `contentBg` / `darkContentBg` | Main content area background |
| `textColor` / `darkTextColor` | Body text colour |
| `radius` | Border radius in px for cards/buttons |
| `font` | `"inter"`, `"system"`, `"serif"`, or `"mono"` |
| `fontSize` | Base font size in px (typically 15–17) |
| `contentWidth` | Max width of content area in px |
| `sidebarWidth` | Sidebar width in px |
| `showBreadcrumbs` | Show breadcrumb trail above page title |
| `showReadingTime` | Estimate reading time in sidebar |

---

## Step 5 — Write page files in `content/sites/<site-uuid>/pages/<page-uuid>.json`

Each file is one page. **The filename and the `id` field inside must be the same UUID.**

```json
{
  "id": "f4a7b3c2-1234-5678-abcd-ef0123456789",
  "title": "Page Title",
  "slug": "page-slug",
  "section": "a3f1c2d4-0000-0000-0000-000000000001",
  "description": "One-sentence summary shown in the page grid.",
  "icon": "📄",
  "order": 0,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z",
  "blocks": []
}
```

| Field | Rules |
|-------|-------|
| `id` | UUID v4. **Must match the filename exactly**: `f4a7b3c2-1234-5678-abcd-ef0123456789.json` |
| `slug` | URL-safe, lowercase, hyphens only. Must be unique within the site. |
| `section` | UUID of the section from `site.json`. **Must match a section `id` exactly — copy-paste, don't retype.** |
| `icon` | An emoji. Optional but recommended. |
| `order` | Integer. Pages sort ascending by `order` within a section. Start at 0 or 1. |
| `createdAt` / `updatedAt` | ISO 8601 timestamps. Use the current time. |
| `blocks` | Array of content blocks. For full block type reference see [BLOCKS.md](./BLOCKS.md). |

---

## Complete worked example

A minimal but complete site with two sections and two pages. Replace all UUIDs with freshly generated values.

### `content/sites.json` (append this object to the array)
```json
{
  "id": "aaaaaaaa-0000-0000-0000-000000000001",
  "name": "Intro to Python",
  "slug": "intro-python"
}
```

### `content/sites/aaaaaaaa-0000-0000-0000-000000000001/site.json`
```json
{
  "title": "Intro to Python",
  "description": "A beginner-friendly introduction to Python programming.",
  "navPages": [],
  "sections": [
    { "id": "bbbbbbbb-0000-0000-0000-000000000001", "name": "Lessons" },
    { "id": "bbbbbbbb-0000-0000-0000-000000000002", "name": "Activities" }
  ],
  "theme": {
    "primary": "#3b82f6",
    "sidebarBg": "#1e293b",
    "contentBg": "#ffffff",
    "textColor": "#1e293b",
    "darkPrimary": "#60a5fa",
    "darkSidebarBg": "#0f172a",
    "darkContentBg": "#1e293b",
    "darkTextColor": "#e2e8f0",
    "radius": 6,
    "font": "inter",
    "fontSize": 16,
    "contentWidth": 800,
    "sidebarWidth": 240,
    "showBreadcrumbs": true,
    "showReadingTime": true
  },
  "home": {
    "heroTitle": "Intro to Python",
    "heroSubtitle": "Learn the fundamentals of Python from scratch.",
    "showPageGrid": true,
    "blocks": [
      {
        "id": "home-1",
        "type": "markdown",
        "content": "This course covers the core building blocks of Python. Start with **Variables** then move on to the **Activity** to practise what you have learned."
      }
    ]
  }
}
```

### `content/sites/aaaaaaaa-0000-0000-0000-000000000001/pages/cccccccc-0000-0000-0000-000000000001.json`
```json
{
  "id": "cccccccc-0000-0000-0000-000000000001",
  "title": "Variables",
  "slug": "variables",
  "section": "bbbbbbbb-0000-0000-0000-000000000001",
  "description": "Understand how Python stores data using variables.",
  "icon": "📦",
  "order": 0,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z",
  "blocks": [
    {
      "id": "v-1",
      "type": "markdown",
      "content": "A **variable** is a named container for a value. In Python you create one by assigning a value — no `var` or `let` keyword needed."
    },
    {
      "id": "v-2",
      "type": "code",
      "language": "python",
      "content": "name = \"Alice\"\nage = 30\nprint(name, age)",
      "caption": "Creating and printing two variables"
    },
    {
      "id": "v-3",
      "type": "callout",
      "title": "Python is dynamically typed",
      "content": "You do not need to declare the type of a variable. Python infers it from the assigned value.",
      "color": "blue"
    },
    {
      "id": "v-quiz",
      "type": "quiz",
      "title": "Variables Quiz",
      "description": "Check your understanding.",
      "questions": [
        {
          "id": "vq-1",
          "question": "Which line correctly creates a variable in Python?",
          "options": ["var x = 5", "let x = 5", "x = 5", "int x = 5"],
          "correctIndex": 2,
          "explanation": "Python does not use var, let, or type declarations. Simply write x = 5."
        }
      ]
    }
  ]
}
```

### `content/sites/aaaaaaaa-0000-0000-0000-000000000001/pages/cccccccc-0000-0000-0000-000000000002.json`
```json
{
  "id": "cccccccc-0000-0000-0000-000000000002",
  "title": "Activity: Fix the Variables",
  "slug": "activity-fix-variables",
  "section": "bbbbbbbb-0000-0000-0000-000000000002",
  "description": "Find and fix the mistakes in the broken Python code.",
  "icon": "🔧",
  "order": 0,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z",
  "blocks": [
    {
      "id": "act-diff",
      "type": "difficulty",
      "level": 1,
      "label": "Easy"
    },
    {
      "id": "act-1",
      "type": "callout",
      "title": "What to do",
      "content": "The playground below contains broken Python-style code. Fix each error and run the code to see the correct output.",
      "color": "purple"
    },
    {
      "id": "act-2",
      "type": "playground",
      "title": "Fix the errors",
      "starterCode": "# Fix the errors below\nvar name = 'Alice'\nlet age = 30\nprint(name, age)"
    },
    {
      "id": "act-divider",
      "type": "divider"
    },
    {
      "id": "act-hint",
      "type": "hint",
      "title": "Hint",
      "body": "Python does not use `var` or `let`. Remove those keywords."
    }
  ]
}
```

---

## Checklist before saving

### UUID integrity (most common source of bugs)
- [ ] `content/sites.json` entry `id` = `content/sites/<that-id>/` folder name (they must be the same string)
- [ ] Every page file's `id` field = its filename without `.json` (e.g. `"id": "f4a7b3c2-..."` → file is `f4a7b3c2-....json`)
- [ ] Every page's `section` field is copied exactly from a section `id` in `site.json`
- [ ] No two sites, sections, or pages share a UUID

### Slugs
- [ ] All slugs are lowercase with only letters, digits, and hyphens
- [ ] No slug clashes within the same site
- [ ] Site slug does not use a reserved word (see Step 2 table)

### Content
- [ ] `correctIndex` in quiz questions is 0-based and within bounds of `options`
- [ ] `fill-in-the-blank` blocks have a non-empty `prefix` or `suffix` (not both empty)
- [ ] `fill-in-the-blank` blocks have a non-empty `correctAnswer`

### JSON validity
- [ ] `sites.json` is valid JSON (no trailing commas)
- [ ] All page and site JSON files are valid (no trailing commas, strings are quoted)
