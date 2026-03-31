'use strict';

const fs      = require('fs');
const path    = require('path');
const { v4: uuidv4 } = require('uuid');
const router  = require('express').Router();
const { readSites, writeSites, siteDir, settingsFile, ensureDirs, slugify, OUTPUT_DIR, DOCS_DIR } = require('../lib/paths');
const { requireValidSiteId, requireSiteExists, safeError, MAX_STR } = require('../lib/validate');

router.get('/', (req, res) => {
  const sites = readSites().map(s => ({
    ...s,
    deployedGithubPages: fs.existsSync(path.join(DOCS_DIR, s.slug, 'index.html')),
  }));
  res.json(sites);
});

router.post('/', (req, res) => {
  const name  = (req.body.name || 'New Site').trim().slice(0, MAX_STR.name);
  const sites = readSites();
  if (sites.some(s => s.name.toLowerCase() === name.toLowerCase())) {
    return res.status(409).json({ error: `A site named "${name}" already exists.` });
  }
  const id   = uuidv4();
  const slug = slugify(name);
  ensureDirs(id);
  try {
    fs.writeFileSync(settingsFile(id), JSON.stringify({ title: name, navPages: [], sections: [], theme: {} }, null, 2));
    const site = { id, name, slug };
    writeSites([...sites, site]);
    res.json(site);
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

router.patch('/:siteId', requireValidSiteId, (req, res) => {
  const sites = readSites();
  const idx   = sites.findIndex(s => s.id === req.params.siteId);
  if (idx === -1) return res.status(404).json({ error: 'Site not found.' });
  if (req.body.name) {
    const newName = String(req.body.name).trim().slice(0, MAX_STR.name);
    const duplicate = sites.find(s => s.id !== req.params.siteId && s.name.toLowerCase() === newName.toLowerCase());
    if (duplicate) return res.status(409).json({ error: `A site named "${newName}" already exists.` });
    const oldSlug = sites[idx].slug;
    sites[idx].name = newName;
    sites[idx].slug = slugify(newName);
    if (oldSlug !== sites[idx].slug) {
      const oldOutput = path.join(OUTPUT_DIR, oldSlug);
      if (fs.existsSync(oldOutput)) fs.renameSync(oldOutput, path.join(OUTPUT_DIR, sites[idx].slug));
      const oldDocs = path.join(DOCS_DIR, oldSlug);
      if (fs.existsSync(oldDocs)) fs.renameSync(oldDocs, path.join(DOCS_DIR, sites[idx].slug));
    }
    const fp = settingsFile(req.params.siteId);
    if (fs.existsSync(fp)) {
      try {
        const s = JSON.parse(fs.readFileSync(fp, 'utf-8'));
        fs.writeFileSync(fp, JSON.stringify({ ...s, title: sites[idx].name }, null, 2));
      } catch (err) { console.error('Failed to update settings title on rename:', err.message); }
    }
  }
  try {
    writeSites(sites);
    res.json(sites[idx]);
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

router.delete('/:siteId/deploy/github-pages', requireValidSiteId, requireSiteExists, (req, res) => {
  const site = readSites().find(s => s.id === req.params.siteId);
  try {
    const deployDir = path.join(DOCS_DIR, site.slug);
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
