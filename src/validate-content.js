'use strict';

/**
 * LCMS content validator.
 *
 * Checks every JSON file under content/ for:
 *   - Valid JSON syntax
 *   - All required keys present
 *   - No unrecognised (extra) keys
 *   - UUID v4 format where required
 *   - Cross-reference integrity (section IDs, page ID ↔ filename)
 *   - Block-level schema per block type
 *
 * Usage:
 *   node src/validate-content.js          # validates all sites
 *   node src/validate-content.js <siteId> # validates one site
 *
 * Exit code 0 = valid, 1 = errors found.
 */

const fs   = require('fs');
const path = require('path');

const ROOT        = process.cwd();
const CONTENT_DIR = process.env.LCMS_DATA_DIR || path.join(ROOT, 'content');
const SITES_INDEX = path.join(CONTENT_DIR, 'sites.json');
const SITES_DIR   = path.join(CONTENT_DIR, 'sites');

const UUID_RE   = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_RE   = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const ISO_RE    = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

const RESERVED_SLUGS = new Set([
  'assets', 'api', 'admin', 'static', 'public', 'media', 'upload', 'uploads',
  'files', 'images', 'img', 'js', 'css', 'fonts', 'favicon', 'robots',
  'sitemap', 'feed', 'rss', 'atom', 'auth', 'login', 'logout', 'signup',
  'register', 'dashboard', 'settings', 'profile', 'account',
]);

// ── Errors collector ────────────────────────────────────────────────────────

let errors = [];
let warnings = [];

function err(location, message) {
  errors.push({ location, message });
}

function warn(location, message) {
  warnings.push({ location, message });
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function isUUID(str) {
  return typeof str === 'string' && UUID_RE.test(str);
}

function isString(v) { return typeof v === 'string'; }
function isArray(v)  { return Array.isArray(v); }
function isObject(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
function isInt(v)    { return typeof v === 'number' && Number.isInteger(v); }

function readJSON(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function checkKeys(loc, obj, required, optional) {
  const allowed = new Set([...required, ...optional]);
  for (const k of required) {
    if (!(k in obj)) err(loc, `Missing required key: "${k}"`);
  }
  for (const k of Object.keys(obj)) {
    if (!allowed.has(k)) err(loc, `Unrecognised key: "${k}"`);
  }
}

// ── Block schemas ────────────────────────────────────────────────────────────

const BLOCK_SCHEMAS = {
  'markdown':         { req: ['id', 'type', 'content'],                  opt: [] },
  'heading':          { req: ['id', 'type', 'level', 'text'],            opt: ['id_attr'] },
  'code':             { req: ['id', 'type', 'content'],                  opt: ['language', 'caption'] },
  'callout':          { req: ['id', 'type', 'content'],                  opt: ['title', 'color'] },
  'tip':              { req: ['id', 'type', 'content'],                  opt: ['title'] },
  'table':            { req: ['id', 'type', 'headers', 'rows'],          opt: ['caption'] },
  'image':            { req: ['id', 'type', 'src'],                      opt: ['alt', 'caption', 'align', 'width', 'height'] },
  'video':            { req: ['id', 'type', 'url'],                      opt: ['caption'] },
  'embed':            { req: ['id', 'type', 'src'],                      opt: ['height', 'caption'] },
  'iframe':           { req: ['id', 'type', 'mode'],                     opt: ['src', 'html', 'height', 'caption'] },
  'playground':       { req: ['id', 'type', 'starterCode'],              opt: ['title'] },
  'fill-in-the-blank':{ req: ['id', 'type', 'prompt', 'answers'],       opt: ['language', 'title'] },
  'quiz':             { req: ['id', 'type', 'questions'],                opt: ['title', 'description'] },
  'flashcard':        { req: ['id', 'type', 'cards'],                    opt: ['title'] },
  'accordion':        { req: ['id', 'type', 'items'],                    opt: [] },
  'case-study':       { req: ['id', 'type'],                             opt: ['title', 'summary', 'background', 'instructions'] },
  'page-link':        { req: ['id', 'type', 'pageSlug'],                 opt: ['pageId', 'pageTitle', 'description'] },
  'hint':             { req: ['id', 'type', 'body'],                     opt: ['title'] },
  'difficulty':       { req: ['id', 'type', 'level'],                    opt: ['label'] },
  'divider':          { req: ['id', 'type'],                             opt: [] },
  'steps':            { req: ['id', 'type', 'items'],                    opt: ['title'] },
  'recipe-detail':    { req: ['id', 'type', 'items'],                    opt: ['name', 'description', 'image', 'servings', 'ingredientsTitle'] },
};

const KNOWN_BLOCK_TYPES = new Set(Object.keys(BLOCK_SCHEMAS));

function validateBlock(loc, block, blockIds) {
  if (!isObject(block)) {
    err(loc, 'Block must be an object');
    return;
  }

  // id
  if (!('id' in block)) {
    err(loc, 'Block is missing required key: "id"');
  } else if (!isString(block.id) || block.id.trim() === '') {
    err(loc, `Block "id" must be a non-empty string (got: ${JSON.stringify(block.id)})`);
  } else {
    if (blockIds.has(block.id)) {
      err(loc, `Duplicate block id: "${block.id}"`);
    } else {
      blockIds.add(block.id);
    }
  }

  // type
  if (!('type' in block)) {
    err(loc, 'Block is missing required key: "type"');
    return;
  }
  if (!isString(block.type)) {
    err(loc, `Block "type" must be a string`);
    return;
  }
  if (!KNOWN_BLOCK_TYPES.has(block.type)) {
    err(loc, `Unknown block type: "${block.type}". Known types: ${[...KNOWN_BLOCK_TYPES].join(', ')}`);
    return;
  }

  const schema = BLOCK_SCHEMAS[block.type];
  checkKeys(loc, block, schema.req, schema.opt);

  // Type-specific value checks
  switch (block.type) {
    case 'heading': {
      if ('level' in block && block.level !== 2 && block.level !== 3) {
        err(loc, `heading "level" must be 2 or 3 (got: ${block.level})`);
      }
      break;
    }
    case 'callout': {
      const validColors = ['blue', 'green', 'yellow', 'red', 'purple', 'gray'];
      if ('color' in block && !validColors.includes(block.color)) {
        err(loc, `callout "color" must be one of: ${validColors.join(', ')} (got: "${block.color}")`);
      }
      break;
    }
    case 'table': {
      if ('headers' in block && !isArray(block.headers)) {
        err(loc, `table "headers" must be an array`);
      }
      if ('rows' in block) {
        if (!isArray(block.rows)) {
          err(loc, `table "rows" must be an array`);
        } else if (isArray(block.headers)) {
          const colCount = block.headers.length;
          block.rows.forEach((row, i) => {
            if (!isArray(row)) {
              err(loc, `table rows[${i}] must be an array`);
            } else if (row.length !== colCount) {
              err(loc, `table rows[${i}] has ${row.length} cells but headers has ${colCount} columns`);
            }
          });
        }
      }
      break;
    }
    case 'quiz': {
      if ('questions' in block) {
        if (!isArray(block.questions) || block.questions.length === 0) {
          err(loc, `quiz "questions" must be a non-empty array`);
        } else {
          block.questions.forEach((q, qi) => {
            const qloc = `${loc} > questions[${qi}]`;
            if (!isObject(q)) { err(qloc, 'Question must be an object'); return; }
            checkKeys(qloc, q,
              ['id', 'question', 'options', 'correctIndex'],
              ['explanation', 'media']
            );
            if ('options' in q) {
              if (!isArray(q.options) || q.options.length < 2) {
                err(qloc, `"options" must be an array with at least 2 items`);
              } else if ('correctIndex' in q) {
                if (!isInt(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
                  err(qloc, `"correctIndex" (${q.correctIndex}) is out of bounds for options array (length ${q.options.length})`);
                }
              }
            }
            if ('media' in q && q.media !== null) {
              if (!isObject(q.media)) {
                err(qloc, `"media" must be an object or omitted`);
              } else {
                const validMediaTypes = ['code', 'image'];
                if (!validMediaTypes.includes(q.media.type)) {
                  err(qloc, `media "type" must be one of: ${validMediaTypes.join(', ')}`);
                }
              }
            }
          });
        }
      }
      break;
    }
    case 'flashcard': {
      if ('cards' in block) {
        if (!isArray(block.cards) || block.cards.length === 0) {
          err(loc, `flashcard "cards" must be a non-empty array`);
        } else {
          block.cards.forEach((c, ci) => {
            const cloc = `${loc} > cards[${ci}]`;
            if (!isObject(c)) { err(cloc, 'Card must be an object'); return; }
            if (!('front' in c) || !isString(c.front)) err(cloc, `Missing or invalid "front"`);
            if (!('back' in c)  || !isString(c.back))  err(cloc, `Missing or invalid "back"`);
          });
        }
      }
      break;
    }
    case 'accordion': {
      if ('items' in block) {
        if (!isArray(block.items) || block.items.length === 0) {
          err(loc, `accordion "items" must be a non-empty array`);
        } else {
          block.items.forEach((item, ii) => {
            const iloc = `${loc} > items[${ii}]`;
            if (!isObject(item)) { err(iloc, 'Accordion item must be an object'); return; }
            checkKeys(iloc, item, ['title', 'content'], []);
          });
        }
      }
      break;
    }
    case 'fill-in-the-blank': {
      if ('prompt' in block && 'answers' in block) {
        if (isString(block.prompt) && isArray(block.answers)) {
          const blankCount = (block.prompt.match(/___/g) || []).length;
          if (blankCount !== block.answers.length) {
            err(loc, `fill-in-the-blank has ${blankCount} blank(s) (___) in "prompt" but "answers" has ${block.answers.length} item(s) — they must match`);
          }
        }
      }
      break;
    }
    case 'difficulty': {
      if ('level' in block) {
        if (!isInt(block.level) || block.level < 1 || block.level > 4) {
          err(loc, `difficulty "level" must be an integer between 1 and 4 (got: ${block.level})`);
        }
      }
      break;
    }
    case 'steps': {
      if ('items' in block) {
        if (!isArray(block.items)) {
          err(loc, `steps "items" must be an array`);
        } else {
          block.items.forEach((item, ii) => {
            const iloc = `${loc} > items[${ii}]`;
            if (!isObject(item)) { err(iloc, 'Step item must be an object'); return; }
            checkKeys(iloc, item, ['id', 'body'], ['title']);
          });
        }
      }
      break;
    }
    case 'recipe-detail': {
      if ('items' in block) {
        if (!isArray(block.items)) {
          err(loc, `recipe-detail "items" must be an array`);
        } else {
          block.items.forEach((item, ii) => {
            const iloc = `${loc} > items[${ii}]`;
            if (!isObject(item)) { err(iloc, 'Ingredient item must be an object'); return; }
            checkKeys(iloc, item, ['id', 'name'], ['amount', 'unit', 'note']);
          });
        }
      }
      break;
    }
    case 'iframe': {
      if ('mode' in block && block.mode !== 'url' && block.mode !== 'html') {
        err(loc, `iframe "mode" must be "url" or "html" (got: "${block.mode}")`);
      }
      break;
    }
  }
}

function validateBlocks(loc, blocks, blockIds) {
  if (!isArray(blocks)) {
    err(loc, '"blocks" must be an array');
    return;
  }
  blocks.forEach((block, i) => {
    validateBlock(`${loc} > blocks[${i}] (type="${block && block.type}")`, block, blockIds);
  });
}

// ── sites.json validation ────────────────────────────────────────────────────

function validateSitesIndex(targetSiteId) {
  const loc = 'content/sites.json';

  if (!fs.existsSync(SITES_INDEX)) {
    err(loc, 'File not found');
    return [];
  }

  let sites;
  try {
    sites = readJSON(SITES_INDEX);
  } catch (e) {
    err(loc, `Invalid JSON: ${e.message}`);
    return [];
  }

  if (!isArray(sites)) {
    err(loc, 'Root value must be an array');
    return [];
  }

  const seenIds   = new Set();
  const seenNames = new Set();
  const seenSlugs = new Set();

  const result = [];

  sites.forEach((site, i) => {
    const sloc = `${loc}[${i}]`;

    if (!isObject(site)) {
      err(sloc, 'Site entry must be an object');
      return;
    }

    checkKeys(sloc, site,
      ['id', 'name', 'slug'],
      ['deployedGithubPages']
    );

    // id
    if ('id' in site) {
      if (!isUUID(site.id)) {
        err(sloc, `"id" must be a UUID v4 (got: "${site.id}")`);
      } else {
        if (seenIds.has(site.id)) err(sloc, `Duplicate site id: "${site.id}"`);
        else seenIds.add(site.id);

        // Check folder exists
        const dir = path.join(SITES_DIR, site.id);
        if (!fs.existsSync(dir)) {
          err(sloc, `Directory content/sites/${site.id}/ does not exist`);
        }
      }
    }

    // name
    if ('name' in site) {
      if (!isString(site.name) || site.name.trim() === '') {
        err(sloc, `"name" must be a non-empty string`);
      } else {
        if (seenNames.has(site.name)) err(sloc, `Duplicate site name: "${site.name}"`);
        else seenNames.add(site.name);
      }
    }

    // slug
    if ('slug' in site) {
      if (!isString(site.slug) || !SLUG_RE.test(site.slug)) {
        err(sloc, `"slug" must be lowercase letters, numbers, and hyphens only (got: "${site.slug}")`);
      } else {
        if (RESERVED_SLUGS.has(site.slug)) err(sloc, `"slug" is a reserved word: "${site.slug}"`);
        if (seenSlugs.has(site.slug)) err(sloc, `Duplicate site slug: "${site.slug}"`);
        else seenSlugs.add(site.slug);
      }
    }

    // deployedGithubPages
    if ('deployedGithubPages' in site && typeof site.deployedGithubPages !== 'boolean') {
      err(sloc, `"deployedGithubPages" must be a boolean`);
    }

    if (!targetSiteId || site.id === targetSiteId) {
      result.push(site);
    }
  });

  return result;
}

// ── site.json validation ─────────────────────────────────────────────────────

function validateSiteJson(siteId, blockIds) {
  const filePath = path.join(SITES_DIR, siteId, 'site.json');
  const loc = `content/sites/${siteId}/site.json`;

  if (!fs.existsSync(filePath)) {
    err(loc, 'File not found');
    return null;
  }

  let site;
  try {
    site = readJSON(filePath);
  } catch (e) {
    err(loc, `Invalid JSON: ${e.message}`);
    return null;
  }

  if (!isObject(site)) {
    err(loc, 'Root value must be an object');
    return null;
  }

  checkKeys(loc, site,
    ['title', 'navPages', 'sections', 'home'],
    ['description', 'disableNav', 'floatingDarkMode', 'header', 'footer', 'theme',
     'createdAt', 'updatedAt']
  );

  // title
  if ('title' in site && (!isString(site.title) || site.title.trim() === '')) {
    err(loc, `"title" must be a non-empty string`);
  }

  // description
  if ('description' in site && !isString(site.description)) {
    err(loc, `"description" must be a string`);
  }

  // disableNav
  if ('disableNav' in site && typeof site.disableNav !== 'boolean') {
    err(loc, `"disableNav" must be a boolean`);
  }

  // floatingDarkMode
  if ('floatingDarkMode' in site && typeof site.floatingDarkMode !== 'boolean') {
    err(loc, `"floatingDarkMode" must be a boolean`);
  }

  // navPages
  if ('navPages' in site && !isArray(site.navPages)) {
    err(loc, `"navPages" must be an array`);
  }

  // sections
  const sectionIds = new Set();
  if ('sections' in site) {
    if (!isArray(site.sections)) {
      err(loc, `"sections" must be an array`);
    } else {
      site.sections.forEach((sec, i) => {
        const sloc = `${loc} > sections[${i}]`;
        if (!isObject(sec)) { err(sloc, 'Section must be an object'); return; }
        checkKeys(sloc, sec, ['id', 'name'], []);
        if ('id' in sec) {
          if (!isUUID(sec.id)) {
            err(sloc, `"id" must be a UUID v4 (got: "${sec.id}")`);
          } else {
            if (sectionIds.has(sec.id)) err(sloc, `Duplicate section id: "${sec.id}"`);
            else sectionIds.add(sec.id);
          }
        }
        if ('name' in sec && (!isString(sec.name) || sec.name.trim() === '')) {
          err(sloc, `"name" must be a non-empty string`);
        }
      });
    }
  }

  // theme — accept any object if present (user-defined)
  if ('theme' in site && !isObject(site.theme)) {
    err(loc, `"theme" must be an object`);
  }

  // header / footer
  if ('header' in site && !isString(site.header)) err(loc, `"header" must be a string`);
  if ('footer' in site && !isString(site.footer)) err(loc, `"footer" must be a string`);

  // home
  if ('home' in site) {
    const hloc = `${loc} > home`;
    if (!isObject(site.home)) {
      err(hloc, '"home" must be an object');
    } else {
      checkKeys(hloc, site.home,
        ['heroTitle', 'blocks'],
        ['heroSubtitle', 'showPageGrid']
      );
      if ('heroTitle' in site.home && !isString(site.home.heroTitle)) {
        err(hloc, `"heroTitle" must be a string`);
      }
      if ('heroSubtitle' in site.home && !isString(site.home.heroSubtitle)) {
        err(hloc, `"heroSubtitle" must be a string`);
      }
      if ('showPageGrid' in site.home && typeof site.home.showPageGrid !== 'boolean') {
        err(hloc, `"showPageGrid" must be a boolean`);
      }
      if ('blocks' in site.home) {
        validateBlocks(hloc, site.home.blocks, blockIds);
      }
    }
  }

  return sectionIds;
}

// ── page JSON validation ─────────────────────────────────────────────────────

function validatePages(siteId, sectionIds, blockIds) {
  const pagesDir = path.join(SITES_DIR, siteId, 'pages');
  const siteloc  = `content/sites/${siteId}`;

  if (!fs.existsSync(pagesDir)) {
    err(siteloc, `pages/ directory not found`);
    return;
  }

  const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.json'));

  const seenSlugs = new Set();

  files.forEach(filename => {
    const loc      = `content/sites/${siteId}/pages/${filename}`;
    const fileUUID = filename.replace(/\.json$/, '');

    if (!isUUID(fileUUID)) {
      err(loc, `Filename must be a UUID v4 followed by .json (got: "${filename}")`);
    }

    let page;
    try {
      page = readJSON(path.join(pagesDir, filename));
    } catch (e) {
      err(loc, `Invalid JSON: ${e.message}`);
      return;
    }

    if (!isObject(page)) {
      err(loc, 'Root value must be an object');
      return;
    }

    checkKeys(loc, page,
      ['id', 'title', 'slug', 'section', 'description', 'createdAt', 'updatedAt', 'blocks'],
      ['order', 'icon', 'inNav', 'iconCollapsedOnly']
    );

    // id must match filename
    if ('id' in page) {
      if (!isUUID(page.id)) {
        err(loc, `"id" must be a UUID v4 (got: "${page.id}")`);
      } else if (page.id !== fileUUID) {
        err(loc, `"id" field ("${page.id}") must match filename ("${fileUUID}")`);
      }
    }

    // title
    if ('title' in page && (!isString(page.title) || page.title.trim() === '')) {
      err(loc, `"title" must be a non-empty string`);
    }

    // slug
    if ('slug' in page) {
      if (!isString(page.slug) || !SLUG_RE.test(page.slug)) {
        err(loc, `"slug" must be lowercase letters, numbers, and hyphens only (got: "${page.slug}")`);
      } else {
        if (seenSlugs.has(page.slug)) err(loc, `Duplicate page slug within site: "${page.slug}"`);
        else seenSlugs.add(page.slug);
      }
    }

    // section — must match a section id in site.json, unless sections is empty
    if ('section' in page) {
      if (!isString(page.section) || page.section.trim() === '') {
        err(loc, `"section" must be a non-empty string`);
      } else if (sectionIds !== null) {
        if (sectionIds.size > 0 && !sectionIds.has(page.section)) {
          err(loc, `"section" ("${page.section}") does not match any section id in site.json`);
        }
      }
    }

    // description
    if ('description' in page && !isString(page.description)) {
      err(loc, `"description" must be a string`);
    }

    // order
    if ('order' in page && !isInt(page.order)) {
      err(loc, `"order" must be an integer`);
    }

    // timestamps
    if ('createdAt' in page && (!isString(page.createdAt) || !ISO_RE.test(page.createdAt))) {
      err(loc, `"createdAt" must be an ISO 8601 timestamp`);
    }
    if ('updatedAt' in page && (!isString(page.updatedAt) || !ISO_RE.test(page.updatedAt))) {
      err(loc, `"updatedAt" must be an ISO 8601 timestamp`);
    }

    // blocks
    if ('blocks' in page) {
      validateBlocks(loc, page.blocks, blockIds);
    }
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const targetSiteId = process.argv[2] || null;

  if (targetSiteId && !isUUID(targetSiteId)) {
    console.error(`Error: "${targetSiteId}" is not a valid UUID v4.`);
    process.exit(1);
  }

  const blockIds = new Set(); // global — UUIDs must be unique across the whole project

  console.log('LCMS content validator\n');

  // 1. Validate sites.json
  const sites = validateSitesIndex(targetSiteId);

  // 2. Validate each site
  for (const site of sites) {
    if (!isUUID(site.id)) continue; // already flagged above

    const sectionIds = validateSiteJson(site.id, blockIds);
    validatePages(site.id, sectionIds, blockIds);
  }

  // 3. Report
  if (warnings.length > 0) {
    console.log(`Warnings (${warnings.length}):`);
    for (const w of warnings) {
      console.log(`  [warn]  ${w.location}\n          ${w.message}`);
    }
    console.log('');
  }

  if (errors.length === 0) {
    const scope = targetSiteId ? `site ${targetSiteId}` : 'all sites';
    console.log(`No errors found (${scope}).`);
    process.exit(0);
  } else {
    console.log(`Errors (${errors.length}):`);
    for (const e of errors) {
      console.log(`  [error] ${e.location}\n          ${e.message}`);
    }
    console.log(`\n${errors.length} error(s) found. Fix them before generating the site.`);
    process.exit(1);
  }
}

main();
