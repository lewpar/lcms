'use strict';

const { execSync } = require('child_process');
const router = require('express').Router({ mergeParams: true });
const { readSites, ROOT } = require('../lib/paths');

router.post('/', (req, res) => {
  const site = readSites().find(s => s.id === req.params.siteId);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  try {
    const out = execSync(`node generator/index.js ${req.params.siteId} ${site.slug}`, {
      cwd: ROOT, encoding: 'utf-8', timeout: 30000,
    });
    res.json({ success: true, message: out.trim() || 'Site generated', siteSlug: site.slug });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
