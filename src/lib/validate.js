'use strict';

const path = require('path');
const { readSites } = require('./paths');
const { NextResponse } = require('next/server');

// ── ID / filename format checks ────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidId(str) {
  return typeof str === 'string' && UUID_RE.test(str);
}

// Safe filename: no path separators, no leading dots, no ".."
// Matches the UUID-based names we generate (e.g. "3f2504e0-...-.jpg")
const SAFE_FILENAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.[a-zA-Z0-9]+$/;

function isSafeFilename(name) {
  if (typeof name !== 'string') return false;
  if (name.includes('/') || name.includes('\\') || name.includes('..')) return false;
  return SAFE_FILENAME_RE.test(name);
}

// Verify a resolved path is strictly within a base directory
function assertWithinDir(resolvedPath, baseDir) {
  const rel = path.relative(baseDir, resolvedPath);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

// ── Error sanitisation ─────────────────────────────────

// Strip filesystem paths from error messages before sending to clients.
// The unix pattern uses a negative lookbehind so it doesn't mangle URLs
// (e.g. http://host/path — the slash is preceded by a word character).
function safeError(err, fallback = 'An internal error occurred.') {
  if (!err || typeof err.message !== 'string') return fallback;
  const msg = err.message
    .replace(/(?<![a-zA-Z0-9.])\/[^\s,'"()]+/g, '[path]') // unix paths
    .replace(/[A-Z]:\\[^\s,'"()]+/gi, '[path]');           // windows paths
  return msg && msg.trim().length > 0 && msg.length < 300 ? msg : fallback;
}

// ── Body sanitisation ──────────────────────────────────

const MAX_STR = {
  title:       200,
  name:        100,
  slug:        100,
  description: 1000,
  section:     100,
  header:      50000,
  footer:      50000,
};

function clampString(val, max) {
  return typeof val === 'string' ? val.slice(0, max) : undefined;
}

// Strip unknown keys and apply length limits to string fields
function sanitiseSettings(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const allowed = ['title', 'description', 'navPages', 'sections', 'theme', 'header', 'footer', 'home'];
  const out = {};
  for (const key of allowed) {
    if (!(key in raw)) continue;
    if (key === 'title')       { out.title       = clampString(raw.title, MAX_STR.title) ?? ''; }
    else if (key === 'description') { out.description = clampString(raw.description, MAX_STR.description) ?? ''; }
    else if (key === 'header') { out.header       = clampString(raw.header, MAX_STR.header) ?? ''; }
    else if (key === 'footer') { out.footer       = clampString(raw.footer, MAX_STR.footer) ?? ''; }
    else                       { out[key]         = raw[key]; }
  }
  return out;
}

function sanitisePage(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const allowed = ['title', 'slug', 'description', 'blocks', 'section', 'order', 'inNav', 'icon', 'iconCollapsedOnly'];
  const out = {};
  for (const key of allowed) {
    if (!(key in raw)) continue;
    if      (key === 'title')       out.title       = clampString(raw.title, MAX_STR.title) ?? '';
    else if (key === 'slug')        out.slug        = clampString(raw.slug, MAX_STR.slug) ?? '';
    else if (key === 'description') out.description = clampString(raw.description, MAX_STR.description) ?? '';
    else if (key === 'section')     out.section     = clampString(raw.section, MAX_STR.section) ?? '';
    else if (key === 'inNav')       out.inNav       = raw.inNav !== false;
    else if (key === 'icon')        out.icon        = clampString(raw.icon, 10) ?? '';
    else if (key === 'iconCollapsedOnly') out.iconCollapsedOnly = !!raw.iconCollapsedOnly;
    else                            out[key]        = raw[key];
  }
  return out;
}

// ── Slug validation ────────────────────────────────────

// Shared across all site routes; avoids duplicate definitions per route.
const SLUG_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

// Lazy-loaded to avoid circular dependency (paths → storage → [no deps])
let _isReservedSlug;
function isReservedSlug(slug) {
  if (!_isReservedSlug) _isReservedSlug = require('./paths').isReservedSlug;
  return _isReservedSlug(slug);
}

function validateSlug(slug) {
  if (!slug) return 'Slug is required.';
  if (!SLUG_RE.test(slug)) return 'Slug may only contain lowercase letters, numbers, and hyphens.';
  if (isReservedSlug(slug)) return `"${slug}" is a reserved slug.`;
  return null;
}

// ── Site resolution helper ─────────────────────────────

// Returns [site, null] on success or [null, errorResponse] on failure.
// Usage: const [site, err] = resolveSite(siteId); if (err) return err;
function resolveSite(siteId) {
  if (!isValidId(siteId)) return [null, NextResponse.json({ error: 'Invalid site ID.' }, { status: 400 })];
  const site = readSites().find(s => s.id === siteId);
  if (!site) return [null, NextResponse.json({ error: 'Site not found.' }, { status: 404 })];
  return [site, null];
}

module.exports = {
  isValidId, isSafeFilename, assertWithinDir, safeError,
  sanitiseSettings, sanitisePage,
  SLUG_RE, validateSlug, resolveSite,
  MAX_STR,
};
