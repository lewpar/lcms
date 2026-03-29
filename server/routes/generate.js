'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const router = require('express').Router({ mergeParams: true });

const { readSites, ROOT, OUTPUT_DIR, DOCS_DIR, NGINX_WEB_ROOT } = require('../lib/paths');
const { requireValidSiteId, requireSiteExists, safeError } = require('../lib/validate');

function generate(siteId, slug) {
  return execFileSync('node', ['generator/index.js', siteId, slug], {
    cwd: ROOT, encoding: 'utf-8', timeout: 30000,
  });
}

// Copy the generated output directory into a deployment destination.
// Uses `cp -rT` (GNU coreutils) to merge the source tree into the dest dir.
function deployToDir(slug, destRoot) {
  const srcDir  = path.join(OUTPUT_DIR, slug);
  const destDir = path.join(destRoot, slug);
  fs.mkdirSync(destDir, { recursive: true });
  execFileSync('cp', ['-rT', srcDir, destDir], { timeout: 30000 });
}

// Generate only — outputs to output/<slug>/ for the live preview.
// Does not require nginx or any external web server.
router.post('/', requireValidSiteId, requireSiteExists, (req, res) => {
  const site = readSites().find(s => s.id === req.params.siteId);
  try {
    const out = generate(site.id, site.slug);
    res.json({ success: true, message: out.trim() || 'Site generated', siteSlug: site.slug });
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

// Deploy to nginx (/var/www/html/<slug>/)
router.post('/nginx', requireValidSiteId, requireSiteExists, (req, res) => {
  const site = readSites().find(s => s.id === req.params.siteId);
  try {
    const out = generate(site.id, site.slug);

    if (!fs.existsSync(NGINX_WEB_ROOT)) {
      return res.status(500).json({ error: `Nginx web root not found: ${NGINX_WEB_ROOT}` });
    }

    deployToDir(site.slug, NGINX_WEB_ROOT);
    res.json({ success: true, message: out.trim() || 'Site deployed to nginx', siteSlug: site.slug });
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

// Deploy to GitHub Pages (docs/<slug>/)
router.post('/github-pages', requireValidSiteId, requireSiteExists, (req, res) => {
  const site = readSites().find(s => s.id === req.params.siteId);
  try {
    const out = generate(site.id, site.slug);
    deployToDir(site.slug, DOCS_DIR);
    res.json({ success: true, message: out.trim() || 'Site deployed to GitHub Pages', siteSlug: site.slug });
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

module.exports = router;
