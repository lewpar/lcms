#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const mdRenderer = new marked.Renderer();
const _origHeading = mdRenderer.heading.bind(mdRenderer);
mdRenderer.heading = function(text, level) {
  const plain = String(text || '').replace(/<[^>]*>/g, '');
  const id = slugify(plain);
  return `<h${level}${id ? ` id="${id}"` : ''}>${text || ''}</h${level}>\n`;
};
marked.setOptions({ gfm: true, breaks: true });

const siteId   = process.argv[2];
const siteSlug = process.argv[3];

if (!siteId || !siteSlug) {
  console.error('Usage: node generator/index.js <siteId> <siteSlug>');
  process.exit(1);
}

const ROOT          = path.join(__dirname, '..');
const PAGES_DIR     = path.join(ROOT, 'content', 'sites', siteId, 'pages');
const ASSETS_DIR    = path.join(ROOT, 'content', 'sites', siteId, 'assets');
const SETTINGS_FILE = path.join(ROOT, 'content', 'sites', siteId, 'site.json');
const OUTPUT_DIR    = path.join(ROOT, 'output', siteSlug);
const ASSETS_URL_PREFIX = `/assets/${siteId}/`;

// ── Color helpers ──────────────────────────────────────

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}

function darken(hex, pct = 0.2) {
  const d = v => Math.max(0, Math.round(v * (1 - pct))).toString(16).padStart(2, '0');
  return '#' + hexToRgb(hex).map(d).join('');
}

// ── Helpers ────────────────────────────────────────────

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
}
function slugify(text) {
  return String(text||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}
function md(text) { return text ? marked.parse(text, { renderer: mdRenderer }) : ''; }

function extractToc(blocks) {
  const items = [];
  for (const b of (blocks || [])) {
    if (b.type === 'heading' && b.level <= 3 && b.text) {
      items.push({ text: b.text, level: b.level, id: b.id_attr || slugify(b.text) });
    } else if (b.type === 'markdown' && b.content) {
      for (const line of b.content.split('\n')) {
        const m = line.match(/^(#{1,3})\s+(.+)/);
        if (m) {
          const text = m[2].trim();
          items.push({ text, level: m[1].length, id: slugify(text) });
        }
      }
    }
  }
  return items;
}

function normalizeQuiz(block) {
  if (Array.isArray(block.questions)) return block;
  return { ...block, title: block.title || 'Quiz', description: block.description || '',
    questions: [{ id: block.id+'-q0', question: block.question||'', options: block.options||[], correctIndex: block.correctIndex||0, explanation: block.explanation||'' }] };
}

function calcReadingTime(blocks) {
  let words = 0;
  for (const b of blocks) {
    const text = [b.content||'', b.text||'', b.title||'', ...(b.questions||[]).map(q=>q.question+' '+(q.options||[]).join(' '))].join(' ');
    words += text.split(/\s+/).filter(Boolean).length;
  }
  return Math.max(1, Math.ceil(words / 200));
}

// ── YouTube helper ─────────────────────────────────────

function extractYouTubeId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1) || null;
    if (u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') {
      if (u.pathname.startsWith('/embed/')) return u.pathname.slice(7) || null;
      return u.searchParams.get('v') || null;
    }
  } catch {}
  return null;
}

// ── Block renderers ────────────────────────────────────

const CALLOUT_CFG = {
  blue:  { bg:'#eff6ff', border:'#3b82f6', text:'#1e40af' },
  green: { bg:'#f0fdf4', border:'#22c55e', text:'#15803d' },
  yellow:{ bg:'#fffbeb', border:'#f59e0b', text:'#92400e' },
  red:   { bg:'#fef2f2', border:'#ef4444', text:'#991b1b' },
  purple:{ bg:'#faf5ff', border:'#a855f7', text:'#6b21a8' },
  gray:  { bg:'#f8fafc', border:'#94a3b8', text:'#475569' },
};

function renderBlock(block) {
  switch (block.type) {
    case 'markdown':
      return `<div class="prose">${md(block.content)}</div>`;

    case 'heading': {
      const l = block.level || 2;
      const id = block.id_attr || slugify(block.text);
      return `<h${l} id="${esc(id)}" class="block-heading">${esc(block.text)}</h${l}>`;
    }

    case 'callout': {
      const color = CALLOUT_CFG[block.color] ? block.color : 'blue';
      const t = block.title ? `<div class="callout-title">${esc(block.title)}</div>` : '';
      return `<div class="callout callout-${color}">${t}<div class="callout-body">${md(block.content)}</div></div>`;
    }

    case 'quiz': {
      const b = normalizeQuiz(block);
      const qs = b.questions || [];
      const dataJson = JSON.stringify(qs).replace(/&/g,'\\u0026').replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/'/g,'\\u0027');
      const n = qs.length;
      const desc = b.description ? `<p class="qs-desc">${esc(b.description)}</p>` : '';
      return `<div class="quiz-block" data-questions='${dataJson}' data-quiz-id="${esc(b.id)}">
  <div class="quiz-block-header">
    <span class="quiz-block-header-title">${esc(b.title||'Quiz')}</span>
    <span class="quiz-block-header-badge">${n} question${n!==1?'s':''}</span>
  </div>
  <div class="qs-start">
    <h3 class="qs-title">${esc(b.title||'Quiz')}</h3>
    ${desc}<p class="qs-count">${n} question${n!==1?'s':''}</p>
    <button class="qs-start-btn quiz-btn" type="button">Start Quiz →</button>
    <div class="qs-resume" hidden>
      <p class="qs-resume-status"></p>
      <div class="qs-resume-actions">
        <button class="qs-continue-btn quiz-btn" type="button">Continue →</button>
        <button class="qs-restart-btn quiz-btn quiz-btn-outline" type="button">↺ Start Over</button>
      </div>
    </div>
  </div>
  <div class="qs-question" hidden>
    <div class="qs-progress-wrap">
      <div class="qs-progress-bar"><div class="qs-progress-fill"></div></div>
      <span class="qs-progress-text">1 / ${n}</span>
    </div>
    <div class="qs-q-text"></div>
    <ul class="qs-options" role="list"></ul>
    <div class="qs-nav">
      <button class="qs-submit quiz-btn" type="button" disabled>Submit Answer</button>
    </div>
    <div class="qs-feedback" hidden></div>
    <div class="qs-explanation" hidden></div>
    <div class="qs-next-nav" hidden>
      <button class="qs-next quiz-btn quiz-btn-outline" type="button" hidden>Next →</button>
      <button class="qs-finish quiz-btn quiz-btn-outline" type="button" hidden>See Results →</button>
    </div>
  </div>
  <div class="qs-results" hidden>
    <p class="qs-results-title">Quiz Complete</p>
    <div class="qs-score-ring"><div class="qs-score-inner">
      <div class="qs-score-num"></div><div class="qs-score-lbl">correct</div>
    </div></div>
    <div class="qs-score-pct"></div>
    <div class="qs-review"></div>
    <button class="qs-retry-btn quiz-btn" type="button">↺ Try Again</button>
  </div>
</div>`;
    }

    case 'code': {
      const lang = block.language ? `<div class="code-lang">${esc(block.language)}</div>` : '';
      const cap = block.caption ? `<figcaption class="code-cap">${esc(block.caption)}</figcaption>` : '';
      const langClass = block.language ? ` class="language-${esc(block.language)}"` : '';
      return `<figure class="code-block">${lang}<pre><code${langClass}>${esc(block.content||'')}</code></pre>${cap}</figure>`;
    }

    case 'image': {
      if (!block.src) return '';
      const src = block.src.startsWith(ASSETS_URL_PREFIX)
        ? `../assets/${block.src.slice(ASSETS_URL_PREFIX.length)}`
        : block.src.startsWith('/assets/') ? `../assets/${block.src.split('/').pop()}` : esc(block.src);
      const cap = block.caption ? `<figcaption>${esc(block.caption)}</figcaption>` : '';
      return `<figure class="image-block"><img src="${src}" alt="${esc(block.alt||'')}" loading="lazy" />${cap}</figure>`;
    }

    case 'case-study': {
      const backgroundHtml = block.background
        ? `<div class="cs-section"><div class="cs-section-label" style="color:#0ea5e9">Background</div><div class="cs-section-body">${md(block.background)}</div></div>` : '';
      const instructionsHtml = block.instructions
        ? `<div class="cs-section"><div class="cs-section-label" style="color:#8b5cf6">Instructions</div><div class="cs-section-body">${md(block.instructions)}</div></div>` : '';
      return `<div class="case-study">
  <div class="cs-header">
    ${block.title ? `<div class="cs-title">${esc(block.title)}</div>` : ''}
    ${block.summary ? `<div class="cs-summary">${esc(block.summary)}</div>` : ''}
  </div>
  <div class="cs-body">${backgroundHtml}${instructionsHtml}</div>
</div>`;
    }

    case 'page-link': {
      if (!block.pageSlug) return '';
      const href = `../${esc(block.pageSlug)}/`;
      const desc = block.description ? `<div class="pl-desc">${esc(block.description)}</div>` : '';
      return `<a class="page-link-card" href="${href}">
  <div class="pl-content">
    <div class="pl-title">${esc(block.pageTitle || block.pageSlug)}</div>
    ${desc}
  </div>
  <span class="pl-arrow">→</span>
</a>`;
    }

    case 'video': {
      const id = extractYouTubeId(block.url);
      if (!id) return '';
      const cap = block.caption ? `<figcaption>${esc(block.caption)}</figcaption>` : '';
      return `<figure class="video-block">
  <div class="video-embed"><iframe src="https://www.youtube-nocookie.com/embed/${esc(id)}" frameborder="0" allowfullscreen loading="lazy" title="${esc(block.caption || 'Video')}"></iframe></div>
  ${cap}
</figure>`;
    }

    case 'divider': return `<hr class="block-divider" />`;
    default:        return '';
  }
}

// ── Nav builder ────────────────────────────────────────

function buildNavHtml(navItems, currentSlug, toc) {
  const sectionOrder = [], sectionMap = {}, unsectioned = [];
  for (const p of navItems) {
    if (p.section) {
      if (!sectionMap[p.section]) { sectionMap[p.section] = []; sectionOrder.push(p.section); }
      sectionMap[p.section].push(p);
    } else { unsectioned.push(p); }
  }
  const tocHtml = (toc && toc.length > 0)
    ? `<div class="nav-toc">${toc.map(h =>
        `<a class="nav-toc-link nav-toc-level-${h.level}" href="#${esc(h.id)}">${esc(h.text)}</a>`
      ).join('')}</div>`
    : '';
  const link = p => {
    const isActive = p.slug === currentSlug;
    const href = currentSlug ? `../${esc(p.slug)}/` : `${esc(p.slug)}/`;
    return `<a href="${href}" class="nav-link${isActive ? ' active' : ''}">${esc(p.title)}</a>`
      + (isActive ? tocHtml : '');
  };
  let html = '';
  for (const p of unsectioned) html += link(p);
  for (const sec of sectionOrder) {
    html += `<div class="nav-section"><div class="nav-section-title">${esc(sec)}</div>`;
    for (const p of sectionMap[sec]) html += link(p);
    html += `</div>`;
  }
  return html;
}

// ── CSS ────────────────────────────────────────────────

function buildCss(theme) {
  const primary      = (theme && theme.primary)        || '#6c63ff';
  const sidebarBg    = (theme && theme.sidebarBg)      || '#1e293b';
  const radius       = (theme && theme.radius != null) ? theme.radius : 8;
  const fontKey      = (theme && theme.font)           || 'inter';
  const fontSize     = (theme && theme.fontSize)       || 16;
  const contentWidth = (theme && theme.contentWidth)   || 800;
  const sidebarWidth = (theme && theme.sidebarWidth)   || 240;
  const fontCss      = {
    system:        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    inter:         "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    roboto:        "'Roboto', -apple-system, BlinkMacSystemFont, sans-serif",
    lato:          "'Lato', -apple-system, BlinkMacSystemFont, sans-serif",
    'source-sans': "'Source Sans 3', -apple-system, BlinkMacSystemFont, sans-serif",
    'open-sans':   "'Open Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  }[fontKey] || "-apple-system, sans-serif";

  const [pr, pg, pb] = hexToRgb(primary);
  const primaryDark = darken(primary, 0.18);

  const darkModeVars = `
:root[data-theme="dark"]{
  --text:${theme.darkTextColor || theme.darkText || '#e2e8f0'};--text-muted:#94a3b8;
  --bg:${theme.darkContentBg || theme.darkBg || '#0f172a'};
  --surface:${theme.darkSurface || '#1e293b'};--border:${theme.darkBorder || '#334155'};
  --primary:${theme.darkPrimary || primary};
  --primary-rgb:${hexToRgb(theme.darkPrimary || primary).join(',')};
  --primary-light:rgba(${hexToRgb(theme.darkPrimary || primary).join(',')},0.12);
  --sidebar-bg:${theme.darkSidebarBg || darken(sidebarBg, 0.35)};
}
[data-theme="dark"] .callout-blue  {background:rgba(59,130,246,0.12) }[data-theme="dark"] .callout-blue   .callout-title{color:#93c5fd}
[data-theme="dark"] .callout-green {background:rgba(34,197,94,0.12)  }[data-theme="dark"] .callout-green  .callout-title{color:#86efac}
[data-theme="dark"] .callout-yellow{background:rgba(245,158,11,0.12) }[data-theme="dark"] .callout-yellow .callout-title{color:#fcd34d}
[data-theme="dark"] .callout-red   {background:rgba(239,68,68,0.12)  }[data-theme="dark"] .callout-red    .callout-title{color:#fca5a5}
[data-theme="dark"] .callout-purple{background:rgba(168,85,247,0.12) }[data-theme="dark"] .callout-purple .callout-title{color:#d8b4fe}
[data-theme="dark"] .callout-gray  {background:rgba(148,163,184,0.12)}[data-theme="dark"] .callout-gray   .callout-title{color:#cbd5e1}
[data-theme="dark"] .callout-body  {color:var(--text)}`;

  return `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
[hidden]{display:none!important}
:root{
  --primary:${primary};--primary-dark:${primaryDark};
  --primary-rgb:${pr},${pg},${pb};
  --primary-light:rgba(${pr},${pg},${pb},0.12);
  --primary-active:rgba(${pr},${pg},${pb},0.18);
  --sidebar-bg:${sidebarBg};--sidebar-border:color-mix(in srgb,${sidebarBg} 70%,#fff 30%);
  --sidebar-text:rgba(255,255,255,0.55);--sidebar-text-active:rgba(255,255,255,0.95);
  --radius:${radius}px;
  --text:${theme.textColor || '#1e293b'};--text-muted:#64748b;
  --bg:${theme.contentBg || '#fff'};--surface:${theme.surfaceBg || '#f8fafc'};--border:${theme.borderColor || '#e2e8f0'};
  --max-w:${contentWidth}px;
  --sidebar-w:${sidebarWidth}px;
}
html{scroll-behavior:smooth}
body{font-family:${fontCss};color:var(--text);background:var(--bg);line-height:1.7;font-size:${fontSize}px}
a{color:var(--primary)}a:hover{text-decoration:underline}
img{max-width:100%;height:auto;display:block}

.app-layout{display:flex;min-height:100vh}
.site-sidebar{width:var(--sidebar-w);flex-shrink:0;background:var(--sidebar-bg);position:fixed;top:0;left:0;height:100vh;overflow-y:auto;z-index:100;display:flex;flex-direction:column}
.sidebar-top{padding:20px 16px 16px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.site-logo{font-weight:800;color:#fff;font-size:1em;line-height:1.3;text-decoration:none;display:block}
.site-logo:hover{text-decoration:none;opacity:.85}
.sidebar-close{display:none;background:none;border:none;color:var(--sidebar-text);cursor:pointer;font-size:18px;padding:2px 6px;border-radius:4px}
.sidebar-close:hover{background:rgba(255,255,255,.1);color:#fff}
.sidebar-nav{flex:1;padding:12px 0;overflow-y:auto}
.nav-link{display:block;padding:7px 18px;color:var(--sidebar-text);font-size:.88em;border-left:3px solid transparent;transition:color .15s,background .15s;text-decoration:none}
.nav-link:hover{color:var(--sidebar-text-active);background:rgba(255,255,255,.07);text-decoration:none}
.nav-link.active{color:var(--sidebar-text-active);background:var(--primary-active);border-left-color:var(--primary);font-weight:600}
.nav-section{margin-top:20px}
.nav-section-title{font-size:.68em;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.3);padding:0 18px 6px}
.sidebar-footer-note{padding:14px 18px;font-size:.72em;color:rgba(255,255,255,.2);border-top:1px solid rgba(255,255,255,.06);flex-shrink:0}
.nav-toc{display:flex;flex-direction:column;margin:2px 0 4px;border-left:2px solid rgba(255,255,255,.12);margin-left:18px}
.nav-toc-link{display:block;font-size:.78em;color:rgba(255,255,255,.5);padding:3px 10px;text-decoration:none;line-height:1.4;transition:color .15s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nav-toc-link:hover{color:#fff}
.nav-toc-level-1{padding-left:10px;font-weight:600}
.nav-toc-level-2{padding-left:18px}
.nav-toc-level-3{padding-left:26px;font-size:.73em}

.content-area{margin-left:var(--sidebar-w);flex:1;min-height:100vh;display:flex;flex-direction:column}
.top-bar{height:52px;border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 24px;gap:14px;position:sticky;top:0;background:var(--bg);z-index:50;box-shadow:0 1px 3px rgba(0,0,0,.04)}
.hamburger{display:none;background:none;border:1px solid var(--border);cursor:pointer;font-size:16px;color:var(--text-muted);padding:4px 8px;border-radius:4px}
.hamburger:hover{background:var(--surface)}
.breadcrumb{display:flex;align-items:center;gap:6px;font-size:.83em;color:var(--text-muted)}
.breadcrumb a{color:var(--primary);text-decoration:none}.breadcrumb a:hover{text-decoration:underline}
.breadcrumb-sep{color:var(--border)}

.page-main{flex:1;padding:44px 40px}
.page-article{max-width:var(--max-w);margin:0 auto}
.page-header{margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid var(--border)}
.page-title{font-size:2.1rem;font-weight:800;line-height:1.2;color:var(--text);margin-bottom:6px}
.page-meta{display:flex;align-items:center;gap:14px;font-size:.8em;color:var(--text-muted)}
.page-meta-tag{background:var(--primary-light);color:var(--primary);padding:2px 9px;border-radius:20px;font-size:.85em;font-weight:600}
.blocks{display:flex;flex-direction:column;gap:20px}
.site-footer{margin-top:60px;padding:20px 40px;border-top:1px solid var(--border);font-size:.78em;color:var(--text-muted);display:flex;align-items:center;justify-content:space-between}

.sidebar-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:90}

.index-hero{margin-bottom:40px}
.index-hero h1{font-size:2.4rem;font-weight:800;margin-bottom:8px}
.index-hero p{font-size:1.05em;color:var(--text-muted)}
.home-hero{margin-bottom:36px}
.home-hero h1{font-size:2.4rem;font-weight:800;margin-bottom:8px;color:var(--text);line-height:1.2}
.home-hero p{font-size:1.05em;color:var(--text-muted);line-height:1.7}
.home-page-grid{margin-top:48px;padding-top:32px;border-top:1px solid var(--border)}
.page-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
.page-card{border:1px solid var(--border);border-radius:var(--radius);padding:20px;color:var(--text);transition:border-color .15s,box-shadow .15s;text-decoration:none;display:block}
.page-card:hover{border-color:var(--primary);box-shadow:0 4px 12px var(--primary-light);text-decoration:none}
.page-card-section{font-size:.7em;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--primary);margin-bottom:6px}
.page-card-title{font-weight:700;font-size:1.05em;margin-bottom:4px}
.page-card-desc{font-size:.85em;color:var(--text-muted)}
.section-group{margin-bottom:32px}
.section-group-title{font-size:.75em;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted);margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border)}

.prose{color:var(--text)}
.prose h1,.prose h2,.prose h3,.prose h4,.prose h5,.prose h6{font-weight:700;line-height:1.3;margin:1.3em 0 .5em;color:var(--text)}
.prose h1{font-size:1.875em}.prose h2{font-size:1.5em;border-bottom:1px solid var(--border);padding-bottom:.3em}.prose h3{font-size:1.25em}
.prose p{margin:.8em 0}
.prose ul,.prose ol{padding-left:1.6em;margin:.8em 0}.prose li{margin:.3em 0}
.prose blockquote{border-left:4px solid var(--border);margin:1em 0;padding:.5em 1em;color:var(--text-muted);font-style:italic}
.prose code{background:var(--surface);padding:2px 5px;border-radius:4px;font-family:'SF Mono','Fira Code',monospace;font-size:.875em;color:#e11d48}
.prose pre{background:#0f172a;color:#e2e8f0;padding:1em;border-radius:var(--radius);overflow-x:auto;margin:1em 0}
.prose pre code{background:none;padding:0;color:inherit}
.prose table{border-collapse:collapse;width:100%;margin:1em 0}
.prose th,.prose td{border:1px solid var(--border);padding:8px 12px;text-align:left}.prose th{background:var(--surface);font-weight:600}
.prose img{border-radius:6px;margin:1em 0}.prose hr{border:none;border-top:1px solid var(--border);margin:1.5em 0}
.prose strong{font-weight:700}.prose a{color:var(--primary)}

.block-heading{font-weight:700;line-height:1.3;color:var(--text)}
.callout{padding:14px 16px;border-radius:0 var(--radius) var(--radius) 0;border-left:4px solid}.callout-title{font-weight:700;margin-bottom:6px}
.callout-body p:first-child{margin-top:0}.callout-body p:last-child{margin-bottom:0}
.callout-blue  {background:#eff6ff;border-color:#3b82f6}.callout-blue   .callout-title{color:#1e40af}
.callout-green {background:#f0fdf4;border-color:#22c55e}.callout-green  .callout-title{color:#15803d}
.callout-yellow{background:#fffbeb;border-color:#f59e0b}.callout-yellow .callout-title{color:#92400e}
.callout-red   {background:#fef2f2;border-color:#ef4444}.callout-red    .callout-title{color:#991b1b}
.callout-purple{background:#faf5ff;border-color:#a855f7}.callout-purple .callout-title{color:#6b21a8}
.callout-gray  {background:#f8fafc;border-color:#94a3b8}.callout-gray   .callout-title{color:#475569}
.code-block{border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
.code-lang{background:#1e293b;color:#94a3b8;padding:5px 14px;font-size:.72em;font-family:monospace}
.code-block pre{background:#0f172a;color:#e2e8f0;padding:16px;margin:0;overflow-x:auto;font-family:'SF Mono','Fira Code',monospace;font-size:.875em;line-height:1.65}
.code-cap{background:var(--surface);border-top:1px solid var(--border);padding:5px 14px;font-size:.78em;color:var(--text-muted);text-align:center}
.image-block{text-align:center}.image-block img{margin:0 auto;border-radius:var(--radius)}.image-block figcaption{margin-top:8px;font-size:.83em;color:var(--text-muted);font-style:italic}
.block-divider{border:none;border-top:1px solid var(--border)}
.page-link-card{display:flex;align-items:center;justify-content:space-between;gap:16px;border:1.5px solid var(--border);border-radius:var(--radius);padding:14px 18px;background:var(--surface);text-decoration:none;color:inherit;transition:border-color .15s,background .15s}
.page-link-card:hover{border-color:var(--primary);background:var(--primary-light)}
.pl-title{font-weight:700;color:var(--text);font-size:.95em}.pl-desc{color:var(--text-muted);font-size:.85em;margin-top:3px}
.pl-arrow{color:var(--primary);font-size:1.2em;flex-shrink:0}
.page-prev-next{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:24px 0 8px;border-top:1px solid var(--border);margin-top:32px}
.pn-btn{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border:1.5px solid var(--border);border-radius:var(--radius);color:var(--text);text-decoration:none;font-size:.88em;font-weight:600;transition:border-color .15s,color .15s,background .15s}
.pn-btn:hover{border-color:var(--primary);color:var(--primary);background:var(--primary-light)}
.pn-prev{margin-right:auto}.pn-next{margin-left:auto}

.case-study{border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
.cs-header{background:var(--surface);padding:20px 24px;border-bottom:1px solid var(--border)}
.cs-title{font-size:1.12em;font-weight:700;color:var(--text);margin-bottom:4px}
.cs-summary{font-size:.9em;color:var(--text-muted)}
.cs-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.cs-tag{background:var(--primary-light);color:var(--primary);font-size:.68em;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:2px 9px;border-radius:20px}
.cs-body{display:grid;grid-template-columns:1fr 1fr}
.cs-section{padding:18px 24px;border-top:1px solid var(--border)}
.cs-section:nth-child(odd){border-right:1px solid var(--border)}
.cs-section-label{font-size:.66em;font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px}
.cs-section-body p:first-child{margin-top:0}.cs-section-body p:last-child{margin-bottom:0}
@media(max-width:600px){.cs-body{grid-template-columns:1fr}.cs-section:nth-child(odd){border-right:none}}

.quiz-block{border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;background:var(--bg);box-shadow:0 2px 12px rgba(0,0,0,.06)}
.quiz-block-header{background:var(--primary);padding:14px 24px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.quiz-block-header-title{font-size:.88em;font-weight:700;color:#fff;letter-spacing:.01em}
.quiz-block-header-badge{background:rgba(255,255,255,.2);color:#fff;font-size:.7em;font-weight:700;text-transform:uppercase;letter-spacing:.1em;padding:3px 10px;border-radius:20px}
.quiz-btn{background:var(--primary);color:#fff;border:none;padding:11px 28px;border-radius:var(--radius);font-size:.9em;font-weight:700;cursor:pointer;font-family:inherit;transition:background .15s,box-shadow .15s;box-shadow:0 2px 6px rgba(0,0,0,.12)}
.quiz-btn:hover{background:var(--primary-dark);box-shadow:0 4px 10px rgba(0,0,0,.16)}.quiz-btn:disabled{opacity:.4;cursor:not-allowed;box-shadow:none}
.quiz-btn-outline{background:transparent;color:var(--primary);border:1.5px solid var(--primary);box-shadow:none}
.quiz-btn-outline:hover{background:var(--primary-light);box-shadow:none}
.qs-start{padding:36px 32px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;background:var(--bg)}
.qs-resume{display:flex;flex-direction:column;align-items:center;gap:12px;width:100%;border-top:1px solid var(--border);padding-top:16px;margin-top:6px}
.qs-resume-status{font-size:.88em;color:var(--text-muted);max-width:320px;line-height:1.6}
.qs-resume-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.qs-title{font-size:1.35em;font-weight:800;color:var(--text);line-height:1.3}.qs-desc{color:var(--text-muted);font-size:.93em;max-width:400px;line-height:1.6}.qs-count{color:var(--text-muted);font-size:.82em;display:flex;align-items:center;gap:6px}
.qs-count::before{content:'';display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--primary);opacity:.6}
.qs-question{padding:24px 28px;background:var(--bg)}
.qs-progress-wrap{display:flex;align-items:center;gap:12px;margin-bottom:22px;padding-bottom:20px;border-bottom:1px solid var(--border)}
.qs-progress-bar{flex:1;height:8px;background:var(--border);border-radius:4px;overflow:hidden}
.qs-progress-fill{height:100%;background:var(--primary);border-radius:4px;transition:width .5s cubic-bezier(.4,0,.2,1);width:0%}
.qs-progress-text{font-size:.8em;color:var(--text-muted);font-weight:700;white-space:nowrap;min-width:52px;text-align:right}
.qs-q-text{font-size:1.06em;font-weight:700;margin-bottom:18px;line-height:1.5;color:var(--text)}
.qs-options{list-style:none;display:flex;flex-direction:column;gap:10px;margin-bottom:16px}
.qs-option{width:100%;text-align:left;background:var(--bg);border:1.5px solid var(--border);border-radius:var(--radius);padding:13px 16px;cursor:pointer;font-size:.93em;color:var(--text);transition:border-color .15s,background .15s,box-shadow .15s;font-family:inherit;display:flex;align-items:center;gap:14px}
.qs-option:hover:not(:disabled){border-color:var(--primary);background:var(--primary-light);box-shadow:0 2px 8px rgba(0,0,0,.06)}
.qs-option-letter{width:30px;height:30px;border-radius:50%;background:var(--surface);border:1.5px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:.72em;font-weight:800;flex-shrink:0;transition:all .15s;color:var(--text-muted)}
.qs-option:hover:not(:disabled) .qs-option-letter{background:var(--primary);border-color:var(--primary);color:#fff}
.qs-option.qs-selected{border-color:var(--primary);background:var(--primary-light);box-shadow:0 0 0 3px var(--primary-light)}
.qs-option.qs-selected .qs-option-letter{background:var(--primary);border-color:var(--primary);color:#fff}
.qs-option.qs-correct{border-color:#22c55e;background:#f0fdf4;color:#15803d;font-weight:600;box-shadow:none}
.qs-option.qs-correct .qs-option-letter{background:#22c55e;border-color:#22c55e;color:#fff}
.qs-option.qs-incorrect{border-color:#ef4444;background:#fef2f2;color:#b91c1c;box-shadow:none}
.qs-option.qs-incorrect .qs-option-letter{background:#ef4444;border-color:#ef4444;color:#fff}
.qs-option-text{flex:1;line-height:1.45}
.qs-nav{margin-bottom:12px}
.qs-feedback{padding:12px 16px;border-radius:var(--radius);font-weight:600;font-size:.88em;margin-top:14px;display:flex;align-items:flex-start;gap:8px;line-height:1.5}
.qs-feedback.qs-correct{background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0}
.qs-feedback.qs-incorrect{background:#fef2f2;color:#dc2626;border:1px solid #fecaca}
.qs-explanation{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:12px 16px;font-size:.88em;color:var(--text-muted);margin-top:10px;line-height:1.6}
.qs-next-nav{display:flex;gap:8px;margin-top:16px}
.qs-results{padding:40px 32px;display:flex;flex-direction:column;align-items:center;gap:16px;background:var(--bg)}
.qs-results-title{font-size:1.25em;font-weight:800;color:var(--text)}
.qs-score-ring{width:110px;height:110px;border-radius:50%;border:6px solid var(--primary);display:flex;align-items:center;justify-content:center;background:var(--bg);box-shadow:0 0 0 10px var(--primary-light),0 4px 16px rgba(0,0,0,.1)}
.qs-score-inner{text-align:center}.qs-score-num{font-size:1.6em;font-weight:800;color:var(--primary);line-height:1}.qs-score-lbl{font-size:.6em;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:.07em;margin-top:2px}
.qs-score-pct{font-size:.95em;font-weight:600;color:var(--text-muted)}
.qs-review{width:100%;display:flex;flex-direction:column;gap:6px;max-width:520px}
.qs-review-item{display:flex;align-items:flex-start;gap:10px;font-size:.84em;padding:9px 14px;border-radius:var(--radius);line-height:1.5}
.qs-review-item.correct{background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0}.qs-review-item.incorrect{background:#fef2f2;color:#b91c1c;border:1px solid #fecaca}
.qs-review-marker{font-weight:800;flex-shrink:0;margin-top:1px}
.qs-review-body{display:flex;flex-direction:column;gap:2px}
.qs-review-q{font-weight:600}
.qs-review-answer{font-size:.9em;opacity:.85}
.qs-review-correct{font-size:.9em;font-weight:700}
[data-theme="dark"] .qs-option.qs-correct{background:rgba(34,197,94,.12);color:#86efac;border-color:#22c55e}
[data-theme="dark"] .qs-option.qs-incorrect{background:rgba(239,68,68,.12);color:#fca5a5;border-color:#ef4444}
[data-theme="dark"] .qs-feedback.qs-correct{background:rgba(34,197,94,.12);color:#86efac;border-color:rgba(34,197,94,.3)}
[data-theme="dark"] .qs-feedback.qs-incorrect{background:rgba(239,68,68,.12);color:#fca5a5;border-color:rgba(239,68,68,.3)}
[data-theme="dark"] .qs-review-item.correct{background:rgba(34,197,94,.12);color:#86efac;border-color:rgba(34,197,94,.3)}
[data-theme="dark"] .qs-review-item.incorrect{background:rgba(239,68,68,.12);color:#fca5a5;border-color:rgba(239,68,68,.3)}

.video-block{margin:0}.video-embed{position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:var(--radius)}.video-embed iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:0}.video-block figcaption{margin-top:8px;font-size:.83em;color:var(--text-muted);text-align:center;font-style:italic}

.custom-site-header{padding:12px 40px;border-bottom:1px solid var(--border);background:var(--surface)}
.custom-footer-html{width:100%}

.dark-mode-btn{background:none;border:1px solid rgba(255,255,255,.25);color:#fff;cursor:pointer;border-radius:6px;padding:4px 8px;font-size:14px;line-height:1;transition:background .15s}.dark-mode-btn:hover{background:rgba(255,255,255,.12)}

@media(max-width:768px){
  .site-sidebar{transform:translateX(-100%);transition:transform .28s cubic-bezier(.4,0,.2,1)}
  .site-sidebar.open{transform:translateX(0);box-shadow:4px 0 20px rgba(0,0,0,.3)}
  .sidebar-close{display:flex}.content-area{margin-left:0}
  .hamburger{display:flex}.sidebar-overlay.open{display:block}
  .page-main{padding:24px 16px}.page-title{font-size:1.7rem}
  .page-grid{grid-template-columns:1fr}
}
@media(max-width:900px){.page-main{padding:32px 24px}}
${darkModeVars}`;
}

// ── Quiz JS ─────────────────────────────────────────────

const QUIZ_JS = `
(function(){
  function initQuiz(el){
    var questions=JSON.parse(el.getAttribute('data-questions')||'[]');
    var n=questions.length;if(!n)return;
    var quizId=el.getAttribute('data-quiz-id')||Math.random().toString(36).slice(2);
    var storageKey='lcms-quiz-'+quizId;
    var current=0,answers=new Array(n).fill(-1),selectedOption=-1,answered=false;

    var startScreen=el.querySelector('.qs-start');
    var questionScreen=el.querySelector('.qs-question');
    var resultsScreen=el.querySelector('.qs-results');
    var fill=el.querySelector('.qs-progress-fill');
    var progressText=el.querySelector('.qs-progress-text');
    var qText=el.querySelector('.qs-q-text');
    var optsList=el.querySelector('.qs-options');
    var submitBtn=el.querySelector('.qs-submit');
    var feedbackEl=el.querySelector('.qs-feedback');
    var explanationEl=el.querySelector('.qs-explanation');
    var nextNav=el.querySelector('.qs-next-nav');
    var nextBtn=el.querySelector('.qs-next');
    var finishBtn=el.querySelector('.qs-finish');

    function saveState(phase){
      try{localStorage.setItem(storageKey,JSON.stringify({current,answers,phase,selectedOption}))}catch(e){}
    }
    function loadState(){
      try{
        var s=JSON.parse(localStorage.getItem(storageKey)||'null');
        if(s&&Array.isArray(s.answers)&&s.answers.length===n){
          current=s.current||0;answers=s.answers;
          return s.phase||'start';
        }
      }catch(e){}
      return'start';
    }
    function clearState(){try{localStorage.removeItem(storageKey)}catch(e){}}

    function show(screen){[startScreen,questionScreen,resultsScreen].forEach(function(x){x.hidden=true});screen.hidden=false}

    var LETTERS=['A','B','C','D','E','F','G','H'];

    function renderQ(idx){
      answered=false;selectedOption=-1;
      var q=questions[idx];
      fill.style.width=((idx/n)*100)+'%';
      progressText.textContent=(idx+1)+' / '+n;
      qText.textContent=q.question;
      optsList.innerHTML='';
      q.options.forEach(function(opt,i){
        var li=document.createElement('li');
        var btn=document.createElement('button');
        btn.type='button';btn.className='qs-option';btn.dataset.idx=i;
        var letterEl=document.createElement('span');
        letterEl.className='qs-option-letter';
        letterEl.textContent=LETTERS[i]||String.fromCharCode(65+i);
        var textEl=document.createElement('span');
        textEl.className='qs-option-text';
        textEl.textContent=opt;
        btn.appendChild(letterEl);btn.appendChild(textEl);
        li.appendChild(btn);optsList.appendChild(li);
      });
      submitBtn.disabled=true;
      feedbackEl.hidden=true;feedbackEl.className='qs-feedback';
      explanationEl.hidden=true;
      nextNav.hidden=true;nextBtn.hidden=true;finishBtn.hidden=true;
      saveState('question');
    }

    function submitAnswer(){
      if(selectedOption===-1||answered)return;
      answered=true;answers[current]=selectedOption;
      var correct=questions[current].correctIndex;
      Array.from(optsList.querySelectorAll('.qs-option')).forEach(function(btn,i){
        btn.disabled=true;btn.classList.remove('qs-selected');
        if(i===correct)btn.classList.add('qs-correct');
        else if(i===selectedOption)btn.classList.add('qs-incorrect');
      });
      submitBtn.disabled=true;
      feedbackEl.hidden=false;
      feedbackEl.className='qs-feedback '+(selectedOption===correct?'qs-correct':'qs-incorrect');
      feedbackEl.textContent=selectedOption===correct?'✓ Correct!':'✗ Incorrect — the correct answer is highlighted.';
      var expl=questions[current].explanation;
      if(expl){explanationEl.hidden=false;explanationEl.textContent=expl}
      nextNav.hidden=false;
      if(current<n-1)nextBtn.hidden=false;else finishBtn.hidden=false;
      saveState('question');
    }

    function showResults(){
      var ok=answers.filter(function(a,i){return a===questions[i].correctIndex}).length;
      var pct=Math.round((ok/n)*100);
      el.querySelector('.qs-score-num').textContent=ok+'/'+n;
      el.querySelector('.qs-score-pct').textContent=pct+'% — '+(pct>=80?'Excellent!':(pct>=60?'Good effort!':'Keep practising!'));
      fill.style.width='100%';
      var review=el.querySelector('.qs-review');review.innerHTML='';
      questions.forEach(function(q,i){
        var isOk=answers[i]===q.correctIndex;
        var givenIdx=answers[i];
        var givenText=givenIdx>=0&&q.options[givenIdx]?q.options[givenIdx]:'No answer';
        var correctText=q.options[q.correctIndex]||'';
        var qText=q.question.length>72?q.question.slice(0,72)+'…':q.question;
        var detail=isOk
          ? '<span class="qs-review-answer">Your answer: '+givenText+'</span>'
          : '<span class="qs-review-answer">Your answer: '+givenText+'</span><span class="qs-review-correct">Correct: '+correctText+'</span>';
        var div=document.createElement('div');div.className='qs-review-item '+(isOk?'correct':'incorrect');
        div.innerHTML='<span class="qs-review-marker">'+(isOk?'✓':'✗')+'</span><span class="qs-review-body"><span class="qs-review-q">'+qText+'</span>'+detail+'</span>';
        review.appendChild(div);
      });
      saveState('results');
      show(resultsScreen);
    }

    function reset(){
      current=0;answers=new Array(n).fill(-1);answered=false;selectedOption=-1;
      fill.style.width='0%';clearState();
      show(questionScreen);renderQ(0);
    }

    var resumeEl=el.querySelector('.qs-resume');
    var resumeStatus=el.querySelector('.qs-resume-status');
    var startBtn=el.querySelector('.qs-start-btn');

    function showResume(savedPhase){
      startBtn.hidden=true;
      resumeEl.hidden=false;
      if(savedPhase==='results'){
        var ok=answers.filter(function(a,i){return a===questions[i].correctIndex}).length;
        resumeStatus.textContent='You completed this quiz — '+ok+'/'+n+' correct. Continue to review your results.';
      } else {
        resumeStatus.textContent='You left off at question '+(current+1)+' of '+n+'. Pick up where you left off.';
      }
    }

    // Event listeners
    startBtn.addEventListener('click',function(){
      show(questionScreen);renderQ(0);saveState('question');
    });
    el.querySelector('.qs-continue-btn').addEventListener('click',function(){
      var s=JSON.parse(localStorage.getItem(storageKey)||'null');
      var phase=s&&s.phase;
      if(phase==='results')showResults();
      else{show(questionScreen);renderQ(current);}
    });
    el.querySelector('.qs-restart-btn').addEventListener('click',function(){
      current=0;answers=new Array(n).fill(-1);answered=false;selectedOption=-1;
      clearState();
      resumeEl.hidden=true;startBtn.hidden=false;
    });
    optsList.addEventListener('click',function(e){
      var btn=e.target.closest('.qs-option');
      if(!btn||btn.disabled||answered)return;
      Array.from(optsList.querySelectorAll('.qs-option')).forEach(function(b){b.classList.remove('qs-selected')});
      btn.classList.add('qs-selected');
      selectedOption=parseInt(btn.dataset.idx,10);
      submitBtn.disabled=false;
    });
    submitBtn.addEventListener('click',submitAnswer);
    nextBtn.addEventListener('click',function(){current++;renderQ(current)});
    finishBtn.addEventListener('click',showResults);
    el.querySelector('.qs-retry-btn').addEventListener('click',reset);

    // Restore saved state — show resume prompt instead of auto-jumping
    var savedPhase=loadState();
    if(savedPhase==='results'||savedPhase==='question'){
      showResume(savedPhase);
    }
    // else stay on fresh start screen
  }
  document.addEventListener('DOMContentLoaded',function(){document.querySelectorAll('.quiz-block').forEach(initQuiz)});
})();
`;

// ── Nav JS ─────────────────────────────────────────────

const NAV_JS = `
(function(){
  var sidebar=document.getElementById('sidebar');
  var overlay=document.getElementById('overlay');
  function open(){sidebar.classList.add('open');overlay.classList.add('open');document.body.style.overflow='hidden'}
  function close(){sidebar.classList.remove('open');overlay.classList.remove('open');document.body.style.overflow=''}
  var h=document.getElementById('hamburger');var c=document.getElementById('sidebarClose');
  if(h)h.addEventListener('click',open);if(c)c.addEventListener('click',close);if(overlay)overlay.addEventListener('click',close);
})();
`;

// ── Dark mode JS ───────────────────────────────────────

const DARK_MODE_JS = `(function(){
  var stored=null;try{stored=localStorage.getItem('lcms-theme')}catch(e){}
  var isDark=stored?stored==='dark':window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme',isDark?'dark':'light');
  document.addEventListener('DOMContentLoaded',function(){
    var btn=document.getElementById('darkModeBtn');
    if(!btn)return;
    btn.textContent=isDark?'☀':'☽';
    btn.addEventListener('click',function(){
      var current=document.documentElement.getAttribute('data-theme');
      var next=current==='dark'?'light':'dark';
      document.documentElement.setAttribute('data-theme',next);
      btn.textContent=next==='dark'?'☀':'☽';
      try{localStorage.setItem('lcms-theme',next)}catch(e){}
    });
  });
})();`;

// ── HTML templates ─────────────────────────────────────

function sidebarHtml(settings, navItems, currentSlug, toc) {
  const siteName = settings.title || 'Learning Site';
  const base = currentSlug ? '../' : './';
  const darkBtn = `<button class="dark-mode-btn" id="darkModeBtn" title="Toggle dark mode">☽</button>`;
  return `<aside class="site-sidebar" id="sidebar">
  <div class="sidebar-top">
    <a class="site-logo" href="${base}">${esc(siteName)}</a>
    ${darkBtn}
    <button class="sidebar-close" id="sidebarClose" aria-label="Close menu">✕</button>
  </div>
  <nav class="sidebar-nav" aria-label="Site navigation">
    ${buildNavHtml(navItems, currentSlug, toc)}
  </nav>
  <div class="sidebar-footer-note">Learning Content Management System</div>
</aside>`;
}

function getFontLink(fontKey) {
  const FONT_QUERIES = {
    inter:         'Inter:wght@400;500;600;700;800',
    roboto:        'Roboto:wght@400;500;700',
    lato:          'Lato:wght@400;700',
    'source-sans': 'Source+Sans+3:wght@400;600;700',
    'open-sans':   'Open+Sans:wght@400;600;700',
  };
  const q = FONT_QUERIES[fontKey];
  if (!q) return '';
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=${q}&display=swap" rel="stylesheet">`;
}

function pageTemplate({ page, blocksHtml, settings, navItems }) {
  const { title, description, slug, section } = page;
  const hasQuiz = blocksHtml.includes('quiz-block');
  const hasCode = (page.blocks || []).some(b => b.type === 'code');
  const toc = extractToc(page.blocks || []);

  // Build flat ordered nav list for prev/next (unsectioned first, then sectioned in order)
  const flatNav = navItems;
  const currentIdx = flatNav.findIndex(p => p.slug === slug);
  const prevPage = currentIdx > 0 ? flatNav[currentIdx - 1] : null;
  const nextPage = currentIdx >= 0 && currentIdx < flatNav.length - 1 ? flatNav[currentIdx + 1] : null;
  const prevNextHtml = (prevPage || nextPage) ? `
<nav class="page-prev-next">
  ${prevPage ? `<a class="pn-btn pn-prev" href="../${esc(prevPage.slug)}/">← ${esc(prevPage.title)}</a>` : '<span></span>'}
  ${nextPage ? `<a class="pn-btn pn-next" href="../${esc(nextPage.slug)}/">${esc(nextPage.title)} →</a>` : ''}
</nav>` : '';
  const readTime = calcReadingTime(page.blocks || []);
  const fontLink = getFontLink((settings.theme || {}).font);
  const showBreadcrumbs = (settings.theme || {}).showBreadcrumbs !== false;
  const showReadingTime = (settings.theme || {}).showReadingTime !== false;

  const showDarkMode = true;
  const customHeader = settings.header
    ? `<div class="custom-site-header">${settings.header}</div>` : '';
  const footerContent = settings.footer
    ? `<div class="custom-footer-html">${settings.footer}</div>`
    : `<span>Generated by LCMS</span><span>${new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)} — ${esc(settings.title || 'LCMS')}</title>
  ${description ? `<meta name="description" content="${esc(description)}" />` : ''}
  ${fontLink}
  <link rel="stylesheet" href="../styles.css" />
  ${hasCode ? `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css" />` : ''}
</head>
<body>
${showDarkMode ? `<script>${DARK_MODE_JS}</script>` : ''}
<div class="app-layout">
  ${sidebarHtml(settings, navItems, slug, toc)}
  <div class="sidebar-overlay" id="overlay"></div>
  <div class="content-area">
    ${customHeader}
    <header class="top-bar">
      <button class="hamburger" id="hamburger" aria-label="Open menu">☰</button>
      ${showBreadcrumbs ? `<nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="../">Home</a>
        ${section ? `<span class="breadcrumb-sep">›</span><span>${esc(section)}</span>` : ''}
        <span class="breadcrumb-sep">›</span>
        <span>${esc(title)}</span>
      </nav>` : ''}
    </header>
    <main class="page-main">
      <article class="page-article">
        <div class="page-header">
          <h1 class="page-title">${esc(title)}</h1>
          <div class="page-meta">
            ${section ? `<span class="page-meta-tag">${esc(section)}</span>` : ''}
            ${showReadingTime ? `<span>⏱ ${readTime} min read</span>` : ''}
          </div>
        </div>
        <div class="blocks">${blocksHtml}</div>
        ${prevNextHtml}
      </article>
    </main>
    <footer class="site-footer">
      ${footerContent}
    </footer>
  </div>
</div>
<script src="../nav.js"></script>
${hasQuiz ? `<script src="../quiz.js"></script>` : ''}
${hasCode ? `<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script><script>hljs.highlightAll();</script>` : ''}
</body>
</html>`;
}

function indexTemplate({ pages, settings, navItems }) {
  const siteName = settings.title || 'Learning Site';
  const fontLink = getFontLink((settings.theme || {}).font);
  const home = settings.home || {};
  const heroTitle = home.heroTitle || siteName;
  const heroSubtitle = home.heroSubtitle || settings.description || '';
  const showPageGrid = home.showPageGrid !== false;
  const homeBlocks = home.blocks || [];
  const hasQuiz = homeBlocks.some(b => b.type === 'quiz');
  const hasCode = homeBlocks.some(b => b.type === 'code');
  const blocksHtml = homeBlocks.map(renderBlock).join('\n');

  const sectionOrder = [], sectionMap = {}, unsectioned = [];
  for (const p of pages) {
    if (p.section) {
      if (!sectionMap[p.section]) { sectionMap[p.section] = []; sectionOrder.push(p.section); }
      sectionMap[p.section].push(p);
    } else { unsectioned.push(p); }
  }

  const renderCard = p => `
<a class="page-card" href="${esc(p.slug)}/">
  ${p.section ? `<div class="page-card-section">${esc(p.section)}</div>` : ''}
  <div class="page-card-title">${esc(p.title)}</div>
  ${p.description ? `<div class="page-card-desc">${esc(p.description)}</div>` : ''}
</a>`;

  let gridHtml = '';
  if (unsectioned.length) gridHtml += `<div class="section-group"><div class="page-grid">${unsectioned.map(renderCard).join('')}</div></div>`;
  for (const sec of sectionOrder) {
    gridHtml += `<div class="section-group"><div class="section-group-title">${esc(sec)}</div><div class="page-grid">${sectionMap[sec].map(renderCard).join('')}</div></div>`;
  }

  const customHeaderIdx = settings.header
    ? `<div class="custom-site-header">${settings.header}</div>` : '';
  const footerContentIdx = settings.footer
    ? `<div class="custom-footer-html">${settings.footer}</div>`
    : `<span>Generated by LCMS</span><span>${new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(siteName)}</title>
  ${fontLink}
  <link rel="stylesheet" href="styles.css" />
  ${hasCode ? `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css" />` : ''}
</head>
<body>
<script>${DARK_MODE_JS}</script>
<div class="app-layout">
  ${sidebarHtml(settings, navItems, null)}
  <div class="sidebar-overlay" id="overlay"></div>
  <div class="content-area">
    <header class="top-bar">
      <button class="hamburger" id="hamburger" aria-label="Open menu">☰</button>
    </header>
    <main class="page-main">
      ${customHeaderIdx}
      <article class="page-article">
        <div class="home-hero">
          <h1>${esc(heroTitle)}</h1>
          ${heroSubtitle ? `<p>${esc(heroSubtitle)}</p>` : ''}
        </div>
        ${blocksHtml ? `<div class="blocks">${blocksHtml}</div>` : ''}
        ${showPageGrid && pages.length > 0 ? `<div class="home-page-grid">${gridHtml}</div>` : ''}
        ${showPageGrid && pages.length === 0 && !blocksHtml ? '<p style="color:var(--text-muted)">No pages yet.</p>' : ''}
      </article>
    </main>
    <footer class="site-footer">
      ${footerContentIdx}
    </footer>
  </div>
</div>
<script src="nav.js"></script>
${hasQuiz ? `<script src="quiz.js"></script>` : ''}
${hasCode ? `<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script><script>hljs.highlightAll();</script>` : ''}
</body>
</html>`;
}

// ── Main ───────────────────────────────────────────────

function generate() {
  let settings = { title: 'My Learning Site', sections: [], navPages: [], theme: {} };
  if (fs.existsSync(SETTINGS_FILE)) {
    try { settings = { ...settings, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')) }; } catch {}
  }

  if (fs.existsSync(OUTPUT_DIR)) fs.rmSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const outputAssets = path.join(OUTPUT_DIR, 'assets');
  if (fs.existsSync(ASSETS_DIR)) { fs.cpSync(ASSETS_DIR, outputAssets, { recursive: true }); }
  else { fs.mkdirSync(outputAssets, { recursive: true }); }

  const css = buildCss(settings.theme || {});
  fs.writeFileSync(path.join(OUTPUT_DIR, 'styles.css'), css);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'quiz.js'), QUIZ_JS);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'nav.js'), NAV_JS);

  let pages = [];
  if (fs.existsSync(PAGES_DIR)) {
    pages = fs.readdirSync(PAGES_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => { try { return JSON.parse(fs.readFileSync(path.join(PAGES_DIR, f), 'utf-8')); } catch { return null; } })
      .filter(Boolean);
  }

  // Build section ID → name map for resolving section IDs stored in page.section
  const sectionNameMap = {};
  for (const s of (settings.sections || [])) { sectionNameMap[s.id] = s.name; }

  const resolveSectionName = (sectionId) => sectionId ? (sectionNameMap[sectionId] || '') : '';

  const allSummaries = pages.map(p => ({
    title: p.title, slug: p.slug, description: p.description,
    section: resolveSectionName(p.section),
    inNav: p.inNav !== false,
  }));
  const navItems = allSummaries.filter(p => p.inNav);

  for (const page of pages) {
    const pageDir = path.join(OUTPUT_DIR, page.slug);
    fs.mkdirSync(pageDir, { recursive: true });
    const blocksHtml = (page.blocks || []).map(renderBlock).join('\n');
    const pageWithResolvedSection = { ...page, section: resolveSectionName(page.section) };
    fs.writeFileSync(path.join(pageDir, 'index.html'), pageTemplate({ page: pageWithResolvedSection, blocksHtml, settings, navItems }));
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), indexTemplate({ pages: allSummaries, settings, navItems }));

  const msg = `Generated ${pages.length} page(s) → output/${siteSlug}/`;
  console.log(msg);
  return msg;
}

generate();
