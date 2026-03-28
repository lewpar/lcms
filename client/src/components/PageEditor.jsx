import { useState, useEffect, useRef, useCallback } from 'react';
import { getPage, updatePage } from '../api.js';
import SplitPane from './SplitPane.jsx';

// Keep stable refs so the unmount cleanup can fire without stale closures
import BlockEditor from './BlockEditor.jsx';
import SitePreview from './SitePreview.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import AddBlockDialog from './AddBlockDialog.jsx';
import { v4 as uuidv4 } from '../uuid.js';

const BLOCK_TYPES = [
  { type: 'markdown',  icon: '✏️', label: 'Markdown' },
  { type: 'heading',   icon: '𝐇',  label: 'Heading' },
  { type: 'callout',   icon: '💡', label: 'Callout' },
  { type: 'quiz',      icon: '❓', label: 'Quiz' },
  { type: 'code',      icon: '⌨️', label: 'Code' },
  { type: 'image',     icon: '🖼️', label: 'Image' },
  { type: 'video',     icon: '▶',  label: 'Video' },
  { type: 'divider',   icon: '─',  label: 'Divider' },
  { type: 'case-study', icon: '📋', label: 'Case Study' },
  { type: 'page-link', icon: '→',  label: 'Page Link' },
  { type: 'flashcard',  icon: '🃏', label: 'Flashcard' },
  { type: 'table',      icon: '⊞',  label: 'Table' },
  { type: 'accordion',  icon: '☰',  label: 'Accordion' },
  { type: 'embed',      icon: '⊡',  label: 'Embed' },
  { type: 'playground', icon: '▶',  label: 'Playground' },
];

function defaultQuestion() {
  return { id: uuidv4(), question: '', options: ['', ''], correctIndex: 0, explanation: '' };
}

function defaultBlock(type) {
  const id = uuidv4();
  switch (type) {
    case 'markdown':   return { id, type, content: '' };
    case 'heading':    return { id, type, level: 2, text: '' };
    case 'callout':    return { id, type, title: '', content: '', color: 'blue' };
    case 'quiz':       return { id, type, title: '', description: '', questions: [defaultQuestion()] };
    case 'code':       return { id, type, language: 'plaintext', content: '', caption: '' };
    case 'image':      return { id, type, src: '', alt: '', caption: '' };
    case 'divider':    return { id, type };
    case 'case-study': return { id, type, title: '', summary: '', background: '', instructions: '' };
    case 'video':      return { id, type, url: '', caption: '' };
    case 'page-link':  return { id, type, pageId: '', pageSlug: '', pageTitle: '', description: '' };
    case 'flashcard':  return { id, type, title: '', cards: [{ id: uuidv4(), front: '', back: '' }] };
    case 'table':      return { id, type, caption: '', headers: ['Column 1', 'Column 2'], rows: [['', '']] };
    case 'accordion':  return { id, type, items: [{ id: uuidv4(), title: '', content: '' }] };
    case 'embed':       return { id, type, src: '', height: 400, caption: '' };
    case 'playground':  return { id, type, title: 'Try it yourself', starterCode: '// Write your JavaScript here\nconsole.log(\'Hello, world!\');' };
    default:            return { id, type };
  }
}

const slugify = (text) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const RESERVED_SLUGS = new Set([
  'assets', 'api', 'admin', 'static', 'public', 'media', 'upload', 'uploads',
  'files', 'images', 'img', 'js', 'css', 'fonts', 'favicon', 'robots',
  'sitemap', 'feed', 'rss', 'atom', 'auth', 'login', 'logout', 'signup',
  'register', 'dashboard', 'settings', 'profile', 'account',
]);

export default function PageEditor({ siteId, siteSlug, pageId, onSaved, addToast, pages = [] }) {
  const [page, setPage] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'unsaved' | 'saving'
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [expandedBlockId, setExpandedBlockId] = useState(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [pendingRemoveId, setPendingRemoveId] = useState(null);

  // Drag state
  const dragIndex = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  // Auto-save timer
  const autoSaveTimer = useRef(null);
  const isFirstLoad = useRef(true);

  // Refs for unmount-save (avoids stale closure issues)
  const latestPageRef = useRef(null);
  const latestSaveStatus = useRef('saved');
  useEffect(() => { latestPageRef.current = page; }, [page]);
  useEffect(() => { latestSaveStatus.current = saveStatus; }, [saveStatus]);

  const doSave = useCallback(async (p, silent = false) => {
    if (!p) return;
    if (RESERVED_SLUGS.has(p.slug)) {
      addToast(`"${p.slug}" is a reserved slug and cannot be used.`, 'error');
      setSaveStatus('unsaved');
      return;
    }
    setSaveStatus('saving');
    try {
      await updatePage(siteId, p.id, p);
      setSaveStatus('saved');
      setPreviewKey(k => k + 1);
      onSaved(silent);
    } catch {
      setSaveStatus('unsaved');
      if (!silent) addToast('Failed to save page', 'error');
    }
  }, [onSaved, addToast]);

  useEffect(() => {
    getPage(siteId, pageId)
      .then(p => { setPage(p); isFirstLoad.current = true; })
      .catch(() => addToast('Failed to load page', 'error'));
  }, [pageId]);

  // Auto-save on changes (2s debounce)
  useEffect(() => {
    if (!page) return;
    if (isFirstLoad.current) { isFirstLoad.current = false; return; }
    setSaveStatus('unsaved');
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => doSave(page, true), 2000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [page]);

  // Save immediately on unmount if there are unsaved changes
  useEffect(() => {
    return () => {
      if (latestSaveStatus.current === 'unsaved' && latestPageRef.current) {
        clearTimeout(autoSaveTimer.current);
        updatePage(siteId, latestPageRef.current.id, latestPageRef.current).catch(() => {});
      }
    };
  }, [siteId]);

  // Ctrl+S to save
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        clearTimeout(autoSaveTimer.current);
        doSave(page, false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [page, doSave]);

  if (!page) return <div className="empty-state"><p>Loading…</p></div>;

  const updateMeta = (field, value) => setPage(p => ({ ...p, [field]: value }));

  const updateBlock = (id, changes) =>
    setPage(p => ({ ...p, blocks: p.blocks.map(b => b.id === id ? { ...b, ...changes } : b) }));

  const removeBlock = (id) => {
    setPage(p => ({ ...p, blocks: p.blocks.filter(b => b.id !== id) }));
    if (expandedBlockId === id) setExpandedBlockId(null);
  };

  const confirmRemoveBlock = () => {
    removeBlock(pendingRemoveId);
    setPendingRemoveId(null);
  };

  const addBlock = (type) => {
    const block = defaultBlock(type);
    setPage(p => ({ ...p, blocks: [...p.blocks, block] }));
    setExpandedBlockId(block.id);
    setShowAddBlock(false);
  };

  // Drag handlers
  const handleDragStart = (index) => { dragIndex.current = index; };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (dragIndex.current === null || dragIndex.current === index) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    setDragOver({ index, pos });
  };

  const handleDrop = (e, toIndex) => {
    e.preventDefault();
    const fromIndex = dragIndex.current;
    if (fromIndex === null || fromIndex === toIndex) { dragIndex.current = null; setDragOver(null); return; }
    setPage(p => {
      const blocks = [...p.blocks];
      const [moved] = blocks.splice(fromIndex, 1);
      const dest = fromIndex < toIndex ? toIndex - 1 : toIndex;
      const insertAt = dragOver?.pos === 'after' ? dest + 1 : dest;
      blocks.splice(Math.max(0, Math.min(insertAt, blocks.length)), 0, moved);
      return { ...p, blocks };
    });
    dragIndex.current = null;
    setDragOver(null);
  };

  const handleDragEnd = () => { dragIndex.current = null; setDragOver(null); };

  const statusLabel = { saved: '✓ Saved', unsaved: '⟳ Saving…', saving: '⟳ Saving…' };
  const statusColor = { saved: 'var(--success)', unsaved: 'var(--text-muted)', saving: 'var(--text-muted)' };

  return (
    <div className="editor">
      <div className="editor-toolbar">
        <h2>{page.title || 'Untitled'}</h2>
        <span style={{ fontSize: 11, color: statusColor[saveStatus] }}>{statusLabel[saveStatus]}</span>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => { clearTimeout(autoSaveTimer.current); doSave(page, false); }}
          disabled={saveStatus === 'saving'}
          title="Save (Ctrl+S)"
        >
          Save
        </button>
      </div>

      <SplitPane
        storageKey="page-editor"
        defaultLeftPct={44}
        minLeftPct={25}
        maxLeftPct={72}
        left={<div className="editor-pane">
          {/* Metadata */}
          <div className="meta-card">
            <div className="field">
              <label>Title</label>
              <input
                type="text"
                value={page.title}
                onChange={e => {
                  const title = e.target.value;
                  setPage(p => ({
                    ...p, title,
                    slug: p.slug === slugify(p.title) ? slugify(title) : p.slug,
                  }));
                }}
                placeholder="Page title"
              />
            </div>
            <div className="field">
              <label>Slug (URL path)</label>
              <input
                type="text"
                value={page.slug}
                onChange={e => updateMeta('slug', slugify(e.target.value))}
                placeholder="page-slug"
                style={RESERVED_SLUGS.has(page.slug) ? { borderColor: 'var(--danger)' } : undefined}
              />
              {RESERVED_SLUGS.has(page.slug) && (
                <span style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>
                  "{page.slug}" is a reserved keyword and cannot be used as a slug.
                </span>
              )}
            </div>
            <div className="field">
              <label>Description (meta)</label>
              <input
                type="text"
                value={page.description || ''}
                onChange={e => updateMeta('description', e.target.value)}
                placeholder="Short description for SEO"
              />
            </div>
            <label className="theme-toggle-row" style={{ marginTop: 4 }}>
              <input
                type="checkbox"
                checked={page.inNav !== false}
                onChange={e => updateMeta('inNav', e.target.checked)}
              />
              <span>Include in site navigation</span>
            </label>
          </div>

          {/* Blocks */}
          <div className="blocks-header">
            <h3>Blocks ({page.blocks.length})</h3>
          </div>

          <div className="blocks-list">
            {page.blocks.map((block, idx) => (
              <BlockEditor
                key={block.id}
                block={block}
                index={idx}
                total={page.blocks.length}
                expanded={expandedBlockId === block.id}
                onToggle={() => setExpandedBlockId(expandedBlockId === block.id ? null : block.id)}
                onChange={changes => updateBlock(block.id, changes)}
                onRemove={() => setPendingRemoveId(block.id)}
                addToast={addToast}
                pages={pages}
                siteId={siteId}
                isDragging={dragIndex.current === idx}
                dragOverClass={
                  dragOver?.index === idx
                    ? (dragOver.pos === 'before' ? 'drag-over-before' : 'drag-over-after')
                    : ''
                }
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
              />
            ))}

            <button className="btn btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={() => setShowAddBlock(true)}>
              + Add Block
            </button>

            <AddBlockDialog
              open={showAddBlock}
              blockTypes={BLOCK_TYPES}
              onAdd={addBlock}
              onClose={() => setShowAddBlock(false)}
            />
          </div>
        </div>}
        right={<div className="editor-preview">
          <SitePreview
              refreshSignal={previewKey}
              siteId={siteId}
              siteSlug={siteSlug}
              addToast={addToast}
              pageSlug={page?.slug || ''}
            />
        </div>}
      />

      <ConfirmDialog
        open={!!pendingRemoveId}
        title="Delete block?"
        message="This block will be permanently removed from the page."
        confirmLabel="Delete"
        onConfirm={confirmRemoveBlock}
        onCancel={() => setPendingRemoveId(null)}
      />
    </div>
  );
}
