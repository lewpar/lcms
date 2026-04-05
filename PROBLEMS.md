# Known Problems

A backlog of identified issues across the codebase. To be addressed in a future pass.

---

## No Unit Tests

There are currently **zero unit or integration tests** in this project. The test suite was removed during the Next.js migration and has not been rebuilt. Key areas that should have test coverage include:

- `src/generator/index.js` — static site builder (complex logic, many edge cases)
- `src/lib/paths.js` and `src/lib/storage.js` — filesystem helpers
- All API route handlers — CRUD, validation, error paths
- `src/lib/validate.js` — sanitisation and validation helpers

---

## Issues

### 🔴 HIGH — Bugs that will cause incorrect behaviour

**1. Body size limit comment with no actual implementation** (`next.config.mjs`)
The comment states the body size limit was increased for file uploads, but the config does nothing. Next.js 14's App Router default is **4 MB**. The asset upload route accepts up to 8 MB, so any upload between 4–8 MB silently returns a 413 before the route handler runs.
Fix: add `experimental: { serverActions: { bodySizeLimit: '8mb' } }` or the equivalent `api.bodyParser.sizeLimit`.

---

**2. `previewAssetPaths` flag not reset on exception** (`src/generator/index.js:~1405`)
```js
previewAssetPaths = true;
const blocksHtml = annotatedBlocks.map(renderBlock).join('\n'); // may throw
previewAssetPaths = false; // never reached if above throws
```
If `renderBlock` throws on a malformed block the module-level flag is left as `true`, corrupting all subsequent `generate()` calls in the same process. Needs a `try/finally`.

---

**3. `Promise.allSettled` silently swallows undeploy errors** (`src/App.jsx:112`)
```js
await Promise.allSettled([undeployGithubPages(siteId)]);
```
Using `Promise.allSettled` for a single promise means undeploy failures are silently ignored. If the git push fails, `deleteSite()` is still called, potentially orphaning the GitHub Pages deployment with no feedback to the user.
Fix: `await undeployGithubPages(siteId)` directly, or check the settled result.

---

**4. `handleDeleteSite` has no try-catch** (`src/App.jsx:110`)
Unlike `handleRenameSite` and `handleCreateSite`, the delete handler has no error handling. If `deleteSite()` throws, the dialog closes silently with no toast. The site remains in the list but the user doesn't know the operation failed.

---

**5. `pagesLoading` not reset when switching sites** (`src/App.jsx:86`)
`openSite()` resets `pages`, `settings`, `search`, and `collapsedSections` — but not `pagesLoading`. If the previous site's page load was still in flight, the spinner persists on the new site until its own `loadPages()` completes.
Fix: add `setPagesLoading(false)` inside `openSite`.

---

**6. DEFAULT_THEME written to disk on every theme edit** (`src/app/api/cms-settings/themes/[id]/route.js`)
`allThemes()` injects `DEFAULT_THEME` into the returned array if it isn't already in `settings.themes`. When the PUT route then does `write({ ...settings, themes })`, the injected default gets persisted to `cms-settings.json` even though the user never saved it. Every theme edit unintentionally writes the default theme to disk.

---

### 🟡 MEDIUM — Correctness issues or misleading behaviour

**7. DELETE site does not clean `docs/`** (`src/app/api/sites/[siteId]/route.js:73`)
The delete route removes `content/<id>/` and `output/<slug>/` but not `docs/<slug>/`. Deployed files remain on disk after deletion. `DOCS_DIR` is even imported in the file but never used — confirming the missing code.
Fix: add `fs.rmSync(path.join(DOCS_DIR, site.slug), { recursive: true, force: true })` in the DELETE handler.

---

**8. "Also undeploy" checkbox shown for non-deployed sites** (`src/components/SiteSelector.jsx:349`)
The checkbox is always rendered in the delete dialog regardless of `gearSite.deployedGithubPages`, and is always defaulted to `true`. For sites never deployed, this triggers a spurious git operation on delete.
Fix: conditionally render the checkbox only when `gearSite.deployedGithubPages` is true.

---

**9. Duplicate page bypasses reserved slug check** (`src/app/api/sites/[siteId]/pages/[id]/duplicate/route.js`)
The create-page route validates against `isReservedSlug()` before saving. The duplicate route only checks `slugExists()` — no reserved slug check. A copy of a page could end up with a slug like `assets-copy` or `api-copy`.

---

**10. Theme name length limit bypassable with whitespace** (`src/app/api/cms-settings/themes/[id]/route.js:44`)
```js
updated.name = updated.name.trim().slice(0, 100) || updated.name;
```
If `trim().slice(0, 100)` produces an empty string (all whitespace), it falls back to the original untrimmed value, bypassing the 100-char limit.

---

**11. SitePreview error state hidden after first successful generation** (`src/components/SitePreview.jsx:106`)
```js
{!everGenerated && failed && <error UI>}
```
Once `everGenerated` is true, subsequent generation failures show no error indicator. The iframe displays stale content with only a brief spinner, and the user has no way to know generation failed.

---

**12. `loadSettings` failure silently swallowed** (`src/App.jsx:144`)
```js
catch { /* non-fatal */ }
```
If settings fail to load, the user sees and edits the default settings without knowing. At minimum a `console.warn`; ideally a toast notification.

---

**13. Settings title update on site rename fails silently** (`src/app/api/sites/[siteId]/route.js:40`)
When renaming a site, the route updates `settings.json` inside a try-catch that only calls `console.error` on failure. The rename succeeds in `sites.json` but the settings file title becomes stale with no client-visible error.

---

**14. `safePagePath` / `slugExists` copy-pasted across four route files**
The same helper functions are duplicated in `pages/route.js`, `pages/[id]/route.js`, `pages/[id]/duplicate/route.js`, and `pages/reorder/route.js`. Any bug fix must be applied in four places. Should be extracted to `src/lib/`.

---

**15. `updatePage` and `patchPage` in `api.js` are identical** (`src/api.js:142–160`)
Both functions call `PUT` on the same endpoint. Only `patchPage` is used in the codebase. `updatePage` is dead code and should be removed.

---

**16. Reorder pages silently skips missing IDs** (`src/app/api/sites/[siteId]/pages/reorder/route.js:29`)
The route silently `continue`s on any ID that doesn't exist on disk. The client expects all IDs to be reordered in sequence, but missing IDs shift the `order` values of subsequent pages without any error response.

---

**17. `<base>` tag injection fails silently on non-standard HTML** (`src/app/site-preview/[...path]/route.js:64`)
```js
html.replace('<head>', `<head>\n  <base href="...">`)
```
If the HTML has no `<head>` tag or uses different casing, the replacement is a no-op and all relative asset URLs break. Should use a case-insensitive regex.

---

### 🟠 LOW — Fragile code and minor gaps

**18. No `trailingSlash` in `next.config.mjs`**
Next.js redirects `/site-preview/demo/` → `/site-preview/demo`. This is the root cause that required the `<base>` tag workaround. Setting `trailingSlash: true` in `next.config.mjs` would be a cleaner fix.

**19. `LCMS_DATA_DIR` env var is undocumented**
`src/lib/paths.js` supports a `LCMS_DATA_DIR` environment variable to override the content directory. There is no `.env.example` or documentation mentioning it.

**20. INSTALL.md references removed scripts and nginx**
- Line 52 references `./start-api-dev.sh` — this script does not exist
- The guide is structured around nginx setup, which is no longer a supported deployment target
