'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const router = require('express').Router({ mergeParams: true });

const { readSites, ROOT, OUTPUT_DIR } = require('../lib/paths');
const { requireValidSiteId, requireSiteExists, safeError } = require('../lib/validate');

const NGINX_WEB_ROOT = '/var/www/html';

router.post('/', requireValidSiteId, requireSiteExists, (req, res) => {
  const site = readSites().find(s => s.id === req.params.siteId);
  try {
    // 1. Generate site to output/<slug>/
    const out = execFileSync('node', ['generator/index.js', req.params.siteId, site.slug], {
      cwd: ROOT, encoding: 'utf-8', timeout: 30000,
    });

    // 2. Check nginx web root exists
    if (!fs.existsSync(NGINX_WEB_ROOT)) {
      return res.status(500).json({ error: `Nginx web root not found: ${NGINX_WEB_ROOT}` });
    }

    // 3. Copy generated output to /var/www/html/<slug>/
    const srcDir  = path.join(OUTPUT_DIR, site.slug);
    const destDir = path.join(NGINX_WEB_ROOT, site.slug);
    fs.mkdirSync(destDir, { recursive: true });
    // -rT: copy contents of src into dest (GNU coreutils, available on Ubuntu)
    execFileSync('cp', ['-rT', srcDir, destDir], { timeout: 30000 });

    res.json({ success: true, message: out.trim() || 'Site deployed', siteSlug: site.slug });
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

module.exports = router;
