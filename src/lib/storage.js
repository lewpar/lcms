'use strict';

const fs   = require('fs');
const path = require('path');

// process.cwd() is always the project root in Next.js; __dirname is unreliable
// in compiled output.
const CONTENT_DIR = process.env.LCMS_DATA_DIR || path.join(process.cwd(), 'content');
const SITES_INDEX = path.join(CONTENT_DIR, 'sites.json');

function readSites()       { try { return JSON.parse(fs.readFileSync(SITES_INDEX, 'utf-8')); } catch { return []; } }
function writeSites(sites) { fs.writeFileSync(SITES_INDEX, JSON.stringify(sites, null, 2)); }

module.exports = { readSites, writeSites };
