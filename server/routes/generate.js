'use strict';

const { execFileSync } = require('child_process');
const router = require('express').Router({ mergeParams: true });
const { readSites, ROOT } = require('../lib/paths');
const { requireValidSiteId, requireSiteExists, safeError } = require('../lib/validate');

router.post('/', requireValidSiteId, requireSiteExists, (req, res) => {
  const site = readSites().find(s => s.id === req.params.siteId);
  try {
    // execFileSync with an argument array — no shell involved, no injection possible
    const out = execFileSync('node', ['generator/index.js', req.params.siteId, site.slug], {
      cwd: ROOT, encoding: 'utf-8', timeout: 30000,
    });
    res.json({ success: true, message: out.trim() || 'Site generated', siteSlug: site.slug });
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

module.exports = router;
