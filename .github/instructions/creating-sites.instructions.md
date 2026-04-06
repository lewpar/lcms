---
applyTo: "content/**"
---

# Creating a new site

When asked to create or author a site, read `.github/AUTHORING.md` for the complete step-by-step guide, and `.github/BLOCKS.md` for the full block type schema reference.

## Critical rules

**Write JSON files in `content/` only.** Do NOT create HTML, CSS, JavaScript, React, or Next.js files — the CMS and generator handle all of that.

**Do NOT run `npm run generate` or any generate command.** The user will generate and preview the site themselves via the CMS UI.

## Block types

Available block types: `markdown`, `heading`, `code`, `callout`, `tip`, `table`, `image`, `video`, `embed`, `iframe`, `playground`, `fill-in-the-blank`, `quiz`, `flashcard`, `accordion`, `case-study`, `page-link`, `hint`, `difficulty`, `divider`, `steps`, `recipe-detail`.

For the full schema and examples of each block type, read `.github/BLOCKS.md`.

## Single-page sites

**When the user asks for a single-page site, a one-page site, a landing page, a reference card, a cheat sheet, or any site where all content should appear on one screen with no sidebar or navigation**, treat it as a single-page site and follow the rules below.

Read the "Single-page sites" section of `.github/AUTHORING.md` before authoring.

You **must** set all five of the following in `site.json`:

```json
"sections": [],
"disableNav": true,
"floatingDarkMode": true,
"home": {
  "showPageGrid": false,
  "blocks": [ ... ]
}
```

- **Do not create any page JSON files.** Create the `pages/` directory but leave it empty.
- **All content goes in `home.blocks`** — use as many blocks as needed.
- **Do not add `navPages`** other than `[]`.
