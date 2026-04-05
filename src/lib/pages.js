'use strict';

const fs = require('fs');
const path = require('path');
const { pagesDir } = require('./paths');
const { assertWithinDir } = require('./validate');

/**
 * Returns the absolute path to a page JSON file for a given site, or null
 * if the filename would escape the pages directory (path traversal guard).
 */
function safePagePath(siteId, filename) {
  const base = pagesDir(siteId);
  const fp = path.join(base, filename);
  if (!assertWithinDir(fp, base)) return null;
  return fp;
}

/**
 * Returns true if any page in the site already uses the given slug.
 * Pass excludeId to skip a specific page (useful for update operations).
 */
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

module.exports = { safePagePath, slugExists };
