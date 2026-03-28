'use strict';

const fs      = require('fs');
const path    = require('path');
const { v4: uuidv4 } = require('uuid');
const router  = require('express').Router();
const { readSites, writeSites, siteDir, settingsFile, ensureDirs, slugify, OUTPUT_DIR } = require('../lib/paths');
const { requireValidSiteId, requireSiteExists, safeError, MAX_STR } = require('../lib/validate');

const NGINX_WEB_ROOT = '/var/www/html';

router.get('/', (req, res) => {
  const sites = readSites().map(s => ({
    ...s,
    deployed: fs.existsSync(path.join(NGINX_WEB_ROOT, s.slug, 'index.html')),
  }));
  res.json(sites);
});

router.post('/', (req, res) => {
  const name = (req.body.name || 'New Site').trim().slice(0, MAX_STR.name);
  const id   = uuidv4();
  const slug = slugify(name);
  ensureDirs(id);
  try {
    fs.writeFileSync(settingsFile(id), JSON.stringify({ title: name, navPages: [], sections: [], theme: {} }, null, 2));
    const site = { id, name, slug };
    writeSites([...readSites(), site]);
    res.json(site);
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

router.patch('/:siteId', requireValidSiteId, (req, res) => {
  const sites = readSites();
  const idx   = sites.findIndex(s => s.id === req.params.siteId);
  if (idx === -1) return res.status(404).json({ error: 'Site not found.' });
  if (req.body.name) {
    sites[idx].name = String(req.body.name).trim().slice(0, MAX_STR.name);
    sites[idx].slug = slugify(sites[idx].name);
    const fp = settingsFile(req.params.siteId);
    if (fs.existsSync(fp)) {
      try {
        const s = JSON.parse(fs.readFileSync(fp, 'utf-8'));
        fs.writeFileSync(fp, JSON.stringify({ ...s, title: sites[idx].name }, null, 2));
      } catch {}
    }
  }
  try {
    writeSites(sites);
    res.json(sites[idx]);
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

router.delete('/:siteId/deploy', requireValidSiteId, requireSiteExists, (req, res) => {
  const site = readSites().find(s => s.id === req.params.siteId);
  try {
    const deployDir = path.join(NGINX_WEB_ROOT, site.slug);
    if (fs.existsSync(deployDir)) fs.rmSync(deployDir, { recursive: true });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

router.delete('/:siteId', requireValidSiteId, (req, res) => {
  const sites = readSites();
  const site  = sites.find(s => s.id === req.params.siteId);
  if (!site) return res.status(404).json({ error: 'Site not found.' });
  try {
    const contentDir = siteDir(req.params.siteId);
    if (fs.existsSync(contentDir)) fs.rmSync(contentDir, { recursive: true });
    const outputDir = path.join(OUTPUT_DIR, site.slug);
    if (fs.existsSync(outputDir)) fs.rmSync(outputDir, { recursive: true });
    writeSites(sites.filter(s => s.id !== req.params.siteId));
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

module.exports = router;
