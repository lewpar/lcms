'use strict';

const fs      = require('fs');
const path    = require('path');
const { v4: uuidv4 } = require('uuid');
const router  = require('express').Router();
const { readSites, writeSites, siteDir, settingsFile, ensureDirs, slugify, OUTPUT_DIR } = require('../lib/paths');

router.get('/', (req, res) => {
  res.json(readSites());
});

router.post('/', (req, res) => {
  const name = (req.body.name || 'New Site').trim();
  const id   = uuidv4();
  const slug = slugify(name);
  ensureDirs(id);
  fs.writeFileSync(settingsFile(id), JSON.stringify({ title: name, navPages: [], sections: [], theme: {} }, null, 2));
  const site = { id, name, slug };
  writeSites([...readSites(), site]);
  res.json(site);
});

router.patch('/:siteId', (req, res) => {
  const sites = readSites();
  const idx   = sites.findIndex(s => s.id === req.params.siteId);
  if (idx === -1) return res.status(404).json({ error: 'Site not found' });
  if (req.body.name) {
    sites[idx].name = req.body.name.trim();
    sites[idx].slug = slugify(sites[idx].name);
    const fp = settingsFile(req.params.siteId);
    if (fs.existsSync(fp)) {
      try {
        const s = JSON.parse(fs.readFileSync(fp, 'utf-8'));
        fs.writeFileSync(fp, JSON.stringify({ ...s, title: sites[idx].name }, null, 2));
      } catch {}
    }
  }
  writeSites(sites);
  res.json(sites[idx]);
});

router.delete('/:siteId', (req, res) => {
  const sites = readSites();
  const site  = sites.find(s => s.id === req.params.siteId);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  const contentDir = siteDir(req.params.siteId);
  if (fs.existsSync(contentDir)) fs.rmSync(contentDir, { recursive: true });
  const outputDir = path.join(OUTPUT_DIR, site.slug);
  if (fs.existsSync(outputDir)) fs.rmSync(outputDir, { recursive: true });
  writeSites(sites.filter(s => s.id !== req.params.siteId));
  res.json({ success: true });
});

module.exports = router;
