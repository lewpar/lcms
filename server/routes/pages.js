'use strict';

const fs     = require('fs');
const path   = require('path');
const { v4: uuidv4 } = require('uuid');
const router = require('express').Router({ mergeParams: true });
const { pagesDir, ensureDirs, isReservedSlug } = require('../lib/paths');

router.post('/reorder', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' });
  const dir = pagesDir(req.params.siteId);
  try {
    for (let i = 0; i < ids.length; i++) {
      const fp = path.join(dir, `${ids[i]}.json`);
      if (fs.existsSync(fp)) {
        const page = JSON.parse(fs.readFileSync(fp, 'utf-8'));
        page.order = i;
        fs.writeFileSync(fp, JSON.stringify(page, null, 2));
      }
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
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
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', (req, res) => {
  const fp = path.join(pagesDir(req.params.siteId), `${req.params.id}.json`);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Not found' });
  try { res.json(JSON.parse(fs.readFileSync(fp, 'utf-8'))); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', (req, res) => {
  ensureDirs(req.params.siteId);
  const id   = uuidv4();
  const now  = new Date().toISOString();
  const slug = req.body.slug || id;
  if (isReservedSlug(slug)) return res.status(400).json({ error: `"${slug}" is a reserved slug and cannot be used.` });
  const page = { id, title: req.body.title || 'Untitled', slug, description: '', blocks: [], createdAt: now, updatedAt: now };
  try {
    fs.writeFileSync(path.join(pagesDir(req.params.siteId), `${id}.json`), JSON.stringify(page, null, 2));
    res.json(page);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', (req, res) => {
  const fp = path.join(pagesDir(req.params.siteId), `${req.params.id}.json`);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Not found' });
  if (req.body.slug && isReservedSlug(req.body.slug)) return res.status(400).json({ error: `"${req.body.slug}" is a reserved slug and cannot be used.` });
  try {
    const existing = JSON.parse(fs.readFileSync(fp, 'utf-8'));
    const updated  = { ...existing, ...req.body, id: existing.id, createdAt: existing.createdAt, updatedAt: new Date().toISOString() };
    fs.writeFileSync(fp, JSON.stringify(updated, null, 2));
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/duplicate', (req, res) => {
  const fp = path.join(pagesDir(req.params.siteId), `${req.params.id}.json`);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Not found' });
  try {
    const existing = JSON.parse(fs.readFileSync(fp, 'utf-8'));
    const id  = uuidv4();
    const now = new Date().toISOString();
    const copy = { ...existing, id, title: existing.title + ' (copy)', slug: existing.slug + '-copy', createdAt: now, updatedAt: now };
    fs.writeFileSync(path.join(pagesDir(req.params.siteId), `${id}.json`), JSON.stringify(copy, null, 2));
    res.json(copy);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', (req, res) => {
  const fp = path.join(pagesDir(req.params.siteId), `${req.params.id}.json`);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Not found' });
  try { fs.unlinkSync(fp); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
