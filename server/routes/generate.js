'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const router = require('express').Router({ mergeParams: true });

const { readSites, ROOT, OUTPUT_DIR, DOCS_DIR } = require('../lib/paths');
const { requireValidSiteId, requireSiteExists, safeError } = require('../lib/validate');

const NGINX_WEB_ROOT = '/var/www/html';

function generate(siteId, slug) {
  return execFileSync('node', ['generator/index.js', siteId, slug], {
    cwd: ROOT, encoding: 'utf-8', timeout: 30000,
  });
}

// Deploy to nginx (/var/www/html/<slug>/)
router.post('/', requireValidSiteId, requireSiteExists, (req, res) => {
  const site = readSites().find(s => s.id === req.params.siteId);
  try {
    const out = generate(site.id, site.slug);

    if (!fs.existsSync(NGINX_WEB_ROOT)) {
      return res.status(500).json({ error: `Nginx web root not found: ${NGINX_WEB_ROOT}` });
    }

    const srcDir  = path.join(OUTPUT_DIR, site.slug);
    const destDir = path.join(NGINX_WEB_ROOT, site.slug);
    fs.mkdirSync(destDir, { recursive: true });
    execFileSync('cp', ['-rT', srcDir, destDir], { timeout: 30000 });

    res.json({ success: true, message: out.trim() || 'Site deployed to nginx', siteSlug: site.slug });
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

// Deploy to GitHub Pages (docs/<slug>/)
router.post('/github-pages', requireValidSiteId, requireSiteExists, (req, res) => {
  const site = readSites().find(s => s.id === req.params.siteId);
  try {
    const out = generate(site.id, site.slug);

    const srcDir  = path.join(OUTPUT_DIR, site.slug);
    const destDir = path.join(DOCS_DIR, site.slug);
    fs.mkdirSync(destDir, { recursive: true });
    execFileSync('cp', ['-rT', srcDir, destDir], { timeout: 30000 });

    res.json({ success: true, message: out.trim() || 'Site deployed to GitHub Pages', siteSlug: site.slug });
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

module.exports = router;
