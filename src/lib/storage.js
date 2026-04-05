'use strict';

const fs   = require('fs');
const path = require('path');

// LCMS_DATA_DIR mirrors the override in paths.js — both must agree on location.
const CONTENT_DIR = process.env.LCMS_DATA_DIR || path.join(__dirname, '..', '..', 'content');
const SITES_INDEX = path.join(CONTENT_DIR, 'sites.json');

function readSites()       { try { return JSON.parse(fs.readFileSync(SITES_INDEX, 'utf-8')); } catch { return []; } }
function writeSites(sites) { fs.writeFileSync(SITES_INDEX, JSON.stringify(sites, null, 2)); }

module.exports = { readSites, writeSites };
