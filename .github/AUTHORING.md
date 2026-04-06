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

Controls the site title, description, sections (sidebar groups), navigation, and home page content.

```json
{
  "title": "My Course Title",
  "description": "A short description of what this site teaches.",
  "navPages": [],
  "sections": [
    { "id": "a3f1c2d4-0000-0000-0000-000000000001", "name": "Reading" },
    { "id": "a3f1c2d4-0000-0000-0000-000000000002", "name": "Activities" }
  ],
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

### `theme` — optional, omit by default

**Do not include a `theme` field when authoring a site.** The CMS default theme will be applied automatically, giving a clean purple/dark-navy look. Only include `theme` if the user has explicitly asked for a specific colour scheme.

### `disableNav` — optional

Set `"disableNav": true` to hide the sidebar and top navigation bar entirely in the generated site. This is useful for **single-page sites** that only use the home page and don't need navigation. Omit the field (or set it to `false`) to show the standard navigation.

### `floatingDarkMode` — optional

Set `"floatingDarkMode": true` to add a fixed floating dark/light mode toggle button in the corner of the exported site. This is most useful for **single-page sites** where `disableNav` is enabled, because the top bar that normally contains the dark mode toggle is hidden. Omit the field (or set it to `false`) to disable the floating button.

---

## Single-page sites

If the user asks for a single-page site — one that has no sidebar, no page links, and presents all its content on the home screen — follow the pattern below instead of the standard multi-page flow.

### What changes

| Concern | Multi-page site | Single-page site |
|---------|----------------|-----------------|
| Content lives in | `pages/<uuid>.json` files | `site.json` → `home.blocks` |
| Sidebar / top nav | Shown | Hidden (`disableNav: true`) |
| Dark-mode toggle | In top nav bar | Floating button (`floatingDarkMode: true`) |
| `sections` array | One or more sections | Empty array `[]` |
| `pages/` directory | Required | Create the folder but leave it empty |
| `showPageGrid` | Usually `true` | Set to `false` (there are no pages to grid) |

### `site.json` for a single-page site

```json
{
  "title": "My Single-Page Site",
  "description": "A concise description.",
  "navPages": [],
  "sections": [],
  "disableNav": true,
  "floatingDarkMode": true,
  "home": {
    "heroTitle": "My Single-Page Site",
    "heroSubtitle": "A subtitle shown beneath the hero title.",
    "showPageGrid": false,
    "blocks": [
      {
        "id": "sp-block-1",
        "type": "markdown",
        "content": "All site content goes here as blocks, exactly as you would write them on a normal page."
      }
    ]
  }
}
```

Add as many blocks to `home.blocks` as needed — every block type available in [BLOCKS.md](./BLOCKS.md) works here.

### What to skip

- **Do not create any page JSON files.** The `pages/` directory should exist but be empty.
- **Do not add any sections** to the `sections` array — they would be unused.
- **Do not set `navPages`** to anything other than `[]`.

### Worked example — single-page reference card

#### `content/sites.json` (append)
```json
{
  "id": "dddddddd-0000-0000-0000-000000000001",
  "name": "Python Quick Reference",
  "slug": "python-quick-ref"
}
```

#### `content/sites/dddddddd-0000-0000-0000-000000000001/site.json`
```json
{
  "title": "Python Quick Reference",
  "description": "A single-page cheat sheet for Python syntax.",
  "navPages": [],
  "sections": [],
  "disableNav": true,
  "floatingDarkMode": true,
  "home": {
    "heroTitle": "Python Quick Reference",
    "heroSubtitle": "Everything you need on one page.",
    "showPageGrid": false,
    "blocks": [
      {
        "id": "sp-1",
        "type": "heading",
        "level": 2,
        "text": "Variables"
      },
      {
        "id": "sp-2",
        "type": "code",
        "language": "python",
        "content": "x = 42\nname = \"Alice\"\npi = 3.14",
        "caption": "Basic variable assignment"
      },
      {
        "id": "sp-3",
        "type": "heading",
        "level": 2,
        "text": "Control Flow"
      },
      {
        "id": "sp-4",
        "type": "code",
        "language": "python",
        "content": "if x > 0:\n    print(\"positive\")\nelif x == 0:\n    print(\"zero\")\nelse:\n    print(\"negative\")",
        "caption": "if / elif / else"
      }
    ]
  }
}
```

The `pages/` and `assets/` directories still need to exist:
```
content/sites/dddddddd-0000-0000-0000-000000000001/
  site.json
  pages/          ← empty
  assets/         ← empty
```

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
| `order` | Integer. Optional. Pages sort ascending by `order` within a section. Start at 0 or 1. Pages without `order` sort last. |
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

Run `npm run validate` (or `npm run validate <site-uuid>` for a single site) after writing all files. The validator will catch most of the issues below automatically. Fix every reported error before finishing.

### UUID integrity (most common source of bugs)
- [ ] `content/sites.json` entry `id` = `content/sites/<that-id>/` folder name (they must be the same string)
- [ ] Every page file's `id` field = its filename without `.json` (e.g. `"id": "f4a7b3c2-..."` → file is `f4a7b3c2-....json`)
- [ ] Every page's `section` field is copied exactly from a section `id` in `site.json`
- [ ] No two sites, sections, or pages share a UUID

### Slugs
- [ ] All slugs are lowercase with only letters, digits, and hyphens
- [ ] No slug clashes within the same site
- [ ] Site slug does not use a reserved word (see Step 2 table)

### Single-page sites
- [ ] `disableNav: true` is set in `site.json`
- [ ] `floatingDarkMode: true` is set in `site.json`
- [ ] `sections` is `[]`
- [ ] `showPageGrid` is `false`
- [ ] No page JSON files have been created (pages/ directory is empty)
- [ ] All content is in `home.blocks`

### Content
- [ ] `correctIndex` in quiz questions is 0-based and within bounds of `options`
- [ ] `fill-in-the-blank` blocks have a non-empty `prefix` or `suffix` (not both empty)
- [ ] `fill-in-the-blank` blocks have a non-empty `correctAnswer`

### JSON validity
- [ ] `sites.json` is valid JSON (no trailing commas)
- [ ] All page and site JSON files are valid (no trailing commas, strings are quoted)
