'use strict';

const fs   = require('fs');
const path = require('path');

// Path to the sites index — mirrors the constant in paths.js but kept here
// to avoid a circular dependency (paths.js re-exports from this module).
const SITES_INDEX = path.join(__dirname, '..', '..', 'content', 'sites.json');

function readSites()       { try { return JSON.parse(fs.readFileSync(SITES_INDEX, 'utf-8')); } catch { return []; } }
function writeSites(sites) { fs.writeFileSync(SITES_INDEX, JSON.stringify(sites, null, 2)); }

module.exports = { readSites, writeSites };
