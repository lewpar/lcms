import fs from 'fs';
import path from 'path';
import { pagesDir } from './paths.js';
import { assertWithinDir } from './validate.js';

/**
 * Returns the absolute path to a page JSON file for a given site, or null
 * if the filename would escape the pages directory (path traversal guard).
 */
export function safePagePath(siteId, filename) {
  const base = pagesDir(siteId);
  const fp = path.join(base, filename);
  if (!assertWithinDir(fp, base)) return null;
  return fp;
}

/**
 * Returns true if any page in the site already uses the given slug.
 * Pass excludeId to skip a specific page (useful for update operations).
 */
export function slugExists(siteId, slug, excludeId = null) {
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
