'use strict';

const fs     = require('fs');
const path   = require('path');
const { v4: uuidv4 } = require('uuid');
const router = require('express').Router({ mergeParams: true });
const { pagesDir, ensureDirs, isReservedSlug } = require('../lib/paths');
const {
  requireValidSiteId, requireValidId, requireSiteExists,
  isValidId, assertWithinDir, safeError, sanitisePage,
} = require('../lib/validate');

const MAX_REORDER_IDS = 1000;

// Resolve a page file path and verify it stays within the pages directory
function safePagePath(siteId, filename) {
  const base = pagesDir(siteId);
  const fp   = path.join(base, filename);
  if (!assertWithinDir(fp, base)) return null;
  return fp;
}

// Check whether any page in the site already uses the given slug (excluding one ID)
function slugExists(siteId, slug, excludeId = null) {
  const dir = pagesDir(siteId);
  if (!fs.existsSync(dir)) return false;
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .some(f => {
      if (excludeId && f === `${excludeId}.json`) return false;
      try {
        const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
        return d.slug === slug;
      } catch { return false; }
    });
}

// Apply to all routes in this router
router.use(requireValidSiteId, requireSiteExists);

router.post('/reorder', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array.' });
  if (ids.length > MAX_REORDER_IDS) return res.status(400).json({ error: `Cannot reorder more than ${MAX_REORDER_IDS} pages at once.` });

  // Validate every ID is a UUID — rejects any traversal attempt
  if (ids.some(id => !isValidId(id))) return res.status(400).json({ error: 'All IDs must be valid UUIDs.' });

  const dir = pagesDir(req.params.siteId);
  try {
    for (let i = 0; i < ids.length; i++) {
      const fp = safePagePath(req.params.siteId, `${ids[i]}.json`);
      if (!fp || !fs.existsSync(fp)) continue;
      const page = JSON.parse(fs.readFileSync(fp, 'utf-8'));
      page.order = i;
      fs.writeFileSync(fp, JSON.stringify(page, null, 2));
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

router.get('/', (req, res) => {
  const dir = pagesDir(req.params.siteId);
  if (!fs.existsSync(dir)) return res.json([]);
  try {
    const pages = fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        try {
          const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
          return { id: d.id, title: d.title, slug: d.slug, section: d.section || '', updatedAt: d.updatedAt, order: d.order };
        } catch { return null; }
      })
      .filter(Boolean)
      .sort((a, b) => {
        const aHasOrder = a.order != null;
        const bHasOrder = b.order != null;
        if (aHasOrder && bHasOrder) return a.order - b.order;
        if (aHasOrder) return -1;
        if (bHasOrder) return 1;
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      });
    res.json(pages);
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

router.get('/:id', requireValidId, (req, res) => {
  const fp = safePagePath(req.params.siteId, `${req.params.id}.json`);
  if (!fp) return res.status(400).json({ error: 'Invalid page ID.' });
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Not found.' });
  try { res.json(JSON.parse(fs.readFileSync(fp, 'utf-8'))); }
  catch (err) { res.status(500).json({ error: safeError(err) }); }
});

router.post('/', (req, res) => {
  ensureDirs(req.params.siteId);
  const id      = uuidv4();
  const now     = new Date().toISOString();
  const body    = sanitisePage(req.body);
  const slug    = body.slug || id;

  if (isReservedSlug(slug)) return res.status(400).json({ error: `"${slug}" is a reserved slug and cannot be used.` });
  if (slugExists(req.params.siteId, slug)) return res.status(409).json({ error: `A page with slug "${slug}" already exists.` });

  const page = { id, title: body.title || 'Untitled', slug, section: body.section || '', description: '', blocks: [], createdAt: now, updatedAt: now };
  try {
    fs.writeFileSync(path.join(pagesDir(req.params.siteId), `${id}.json`), JSON.stringify(page, null, 2));
    res.json(page);
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

router.put('/:id', requireValidId, (req, res) => {
  const fp = safePagePath(req.params.siteId, `${req.params.id}.json`);
  if (!fp) return res.status(400).json({ error: 'Invalid page ID.' });
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Not found.' });

  const body = sanitisePage(req.body);
  if (body.slug && isReservedSlug(body.slug)) return res.status(400).json({ error: `"${body.slug}" is a reserved slug and cannot be used.` });
  if (body.slug && slugExists(req.params.siteId, body.slug, req.params.id)) return res.status(409).json({ error: `A page with slug "${body.slug}" already exists.` });

  try {
    const existing = JSON.parse(fs.readFileSync(fp, 'utf-8'));
    const updated  = { ...existing, ...body, id: existing.id, createdAt: existing.createdAt, updatedAt: new Date().toISOString() };
    fs.writeFileSync(fp, JSON.stringify(updated, null, 2));
    res.json(updated);
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

router.post('/:id/duplicate', requireValidId, (req, res) => {
  const fp = safePagePath(req.params.siteId, `${req.params.id}.json`);
  if (!fp) return res.status(400).json({ error: 'Invalid page ID.' });
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Not found.' });
  try {
    const existing  = JSON.parse(fs.readFileSync(fp, 'utf-8'));
    const id        = uuidv4();
    const now       = new Date().toISOString();
    const baseSlug  = existing.slug + '-copy';
    // Ensure the copy slug is unique
    let slug = baseSlug;
    let counter = 2;
    while (slugExists(req.params.siteId, slug)) {
      slug = `${baseSlug}-${counter++}`;
    }
    const copy = { ...existing, id, title: existing.title + ' (copy)', slug, createdAt: now, updatedAt: now };
    fs.writeFileSync(path.join(pagesDir(req.params.siteId), `${id}.json`), JSON.stringify(copy, null, 2));
    res.json(copy);
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

router.delete('/:id', requireValidId, (req, res) => {
  const fp = safePagePath(req.params.siteId, `${req.params.id}.json`);
  if (!fp) return res.status(400).json({ error: 'Invalid page ID.' });
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Not found.' });
  try { fs.unlinkSync(fp); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: safeError(err) }); }
});

module.exports = router;
