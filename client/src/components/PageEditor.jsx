import { useState, useEffect, useRef, useCallback } from 'react';
import { getPage, updatePage } from '../api.js';
import BlockEditor from './BlockEditor.jsx';
import Preview from './Preview.jsx';
import { v4 as uuidv4 } from '../uuid.js';

const BLOCK_TYPES = [
  { type: 'markdown', icon: '✏️', label: 'Markdown' },
  { type: 'heading',  icon: '𝐇',  label: 'Heading' },
  { type: 'alert',   icon: '⚠️', label: 'Alert' },
  { type: 'callout', icon: '💡', label: 'Callout' },
  { type: 'quiz',    icon: '❓', label: 'Quiz' },
  { type: 'code',    icon: '⌨️', label: 'Code' },
  { type: 'image',   icon: '🖼️', label: 'Image' },
  { type: 'divider',     icon: '─',  label: 'Divider' },
  { type: 'case-study',  icon: '📋', label: 'Case Study' },
];

function defaultQuestion() {
  return { id: uuidv4(), question: '', options: ['', ''], correctIndex: 0, explanation: '' };
}

function defaultBlock(type) {
  const id = uuidv4();
  switch (type) {
    case 'markdown': return { id, type, content: '' };
    case 'heading':  return { id, type, level: 2, text: '' };
    case 'alert':    return { id, type, variant: 'info', title: '', content: '' };
    case 'callout':  return { id, type, icon: '💡', title: '', content: '', color: 'blue' };
    case 'quiz':     return { id, type, title: '', description: '', questions: [defaultQuestion()] };
    case 'code':     return { id, type, language: 'plaintext', content: '', caption: '' };
    case 'image':    return { id, type, src: '', alt: '', caption: '' };
    case 'divider':     return { id, type };
    case 'case-study':  return { id, type, title: '', summary: '', background: '', challenge: '', solution: '', outcome: '', tags: '' };
    default:            return { id, type };
  }
}

const slugify = (text) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export default function PageEditor({ pageId, onSaved, addToast }) {
  const [page, setPage] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'unsaved' | 'saving'
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [expandedBlockId, setExpandedBlockId] = useState(null);

  // Drag state
  const dragIndex = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  // Auto-save timer
  const autoSaveTimer = useRef(null);
  const isFirstLoad = useRef(true);

  const doSave = useCallback(async (p, silent = false) => {
    if (!p) return;
    setSaveStatus('saving');
    try {
      await updatePage(p.id, p);
      setSaveStatus('saved');
      onSaved(silent);
    } catch {
      setSaveStatus('unsaved');
      if (!silent) addToast('Failed to save page', 'error');
    }
  }, [onSaved, addToast]);

  useEffect(() => {
    getPage(pageId)
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

  const statusLabel = { saved: '✓ Saved', unsaved: '● Unsaved', saving: '⟳ Saving…' };
  const statusColor = { saved: 'var(--success)', unsaved: 'var(--warning)', saving: 'var(--text-muted)' };

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

      <div className="editor-split">
        {/* ── Left: editor ── */}
        <div className="editor-pane">
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
              />
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
                onRemove={() => removeBlock(block.id)}
                addToast={addToast}
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

            {showAddBlock ? (
              <div className="add-block-panel">
                <h4>Add Block</h4>
                <div className="block-type-grid">
                  {BLOCK_TYPES.map(({ type, icon, label }) => (
                    <button key={type} className="block-type-btn" onClick={() => addBlock(type)}>
                      <span className="icon">{icon}</span>
                      <span className="label">{label}</span>
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: 10 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowAddBlock(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <button className="btn btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={() => setShowAddBlock(true)}>
                + Add Block
              </button>
            )}
          </div>
        </div>

        {/* ── Right: live preview ── */}
        <div className="editor-preview">
          <Preview page={page} />
        </div>
      </div>
    </div>
  );
}
