'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT             = path.join(__dirname, '..', '..');
const CONTENT_DIR      = path.join(ROOT, 'content');
const SITES_DIR        = path.join(CONTENT_DIR, 'sites');
const SITES_INDEX      = path.join(CONTENT_DIR, 'sites.json');
const OUTPUT_DIR       = path.join(ROOT, 'output');
const CMS_SETTINGS_FILE = path.join(CONTENT_DIR, 'cms-settings.json');
const DOCS_DIR          = path.join(ROOT, 'docs');
const NGINX_WEB_ROOT    = '/var/www/html';

for (const dir of [CONTENT_DIR, SITES_DIR, OUTPUT_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
if (!fs.existsSync(SITES_INDEX)) fs.writeFileSync(SITES_INDEX, '[]');

function readSites()       { try { return JSON.parse(fs.readFileSync(SITES_INDEX, 'utf-8')); } catch { return []; } }
function writeSites(sites) { fs.writeFileSync(SITES_INDEX, JSON.stringify(sites, null, 2)); }

function siteDir(id)      { return path.join(SITES_DIR, id); }
function pagesDir(id)     { return path.join(siteDir(id), 'pages'); }
function assetsDir(id)    { return path.join(siteDir(id), 'assets'); }
function settingsFile(id) { return path.join(siteDir(id), 'site.json'); }

function ensureDirs(id) {
  for (const d of [siteDir(id), pagesDir(id), assetsDir(id)]) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'site';
}

const RESERVED_SLUGS = new Set([
  'assets', 'api', 'admin', 'static', 'public', 'media', 'upload', 'uploads',
  'files', 'images', 'img', 'js', 'css', 'fonts', 'favicon', 'robots',
  'sitemap', 'feed', 'rss', 'atom', 'auth', 'login', 'logout', 'signup',
  'register', 'dashboard', 'settings', 'profile', 'account',
]);

function isReservedSlug(slug) { return RESERVED_SLUGS.has(slug); }

module.exports = {
  ROOT, CONTENT_DIR, SITES_DIR, SITES_INDEX, OUTPUT_DIR, CMS_SETTINGS_FILE, DOCS_DIR, NGINX_WEB_ROOT,
  readSites, writeSites,
  siteDir, pagesDir, assetsDir, settingsFile, ensureDirs,
  slugify, RESERVED_SLUGS, isReservedSlug,
};
