import { useState, useEffect, useRef } from 'react';
import BlockEditor from './BlockEditor.jsx';
import SplitPane from './SplitPane.jsx';
import SitePreview from './SitePreview.jsx';
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
  { type: 'page-link', icon: '→',  label: 'Page Link' },
];

function defaultBlock(type) {
  const id = uuidv4();
  switch (type) {
    case 'markdown':   return { id, type, content: '' };
    case 'heading':    return { id, type, level: 2, text: '' };
    case 'callout':    return { id, type, title: '', content: '', color: 'blue' };
    case 'quiz':       return { id, type, title: '', description: '', questions: [{ id: uuidv4(), question: '', options: ['', ''], correctIndex: 0, explanation: '' }] };
    case 'code':       return { id, type, language: 'plaintext', content: '', caption: '' };
    case 'image':      return { id, type, src: '', alt: '', caption: '' };
    case 'divider':    return { id, type };
    case 'video':      return { id, type, url: '', caption: '' };
    case 'page-link':  return { id, type, pageId: '', pageSlug: '', pageTitle: '', description: '' };
    default:           return { id, type };
  }
}

export default function HomeEditor({ settings, onSave, addToast, siteId, siteSlug, pages }) {
  const defaultHome = { heroTitle: '', heroSubtitle: '', showPageGrid: true, blocks: [] };

  const [home, setHome] = useState(() => ({ ...defaultHome, ...(settings.home || {}) }));
  const [saveStatus, setSaveStatus] = useState('saved');
  const [previewKey, setPreviewKey] = useState(0);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [expandedBlockId, setExpandedBlockId] = useState(null);

  const dragIndex = useRef(null);
  const [dragOver, setDragOver] = useState(null);
  const saveTimer = useRef(null);
  const isFirstLoad = useRef(true);
  const didSync = useRef(!!settings.home); // true if settings were already loaded on mount
  const onSaveRef = useRef(onSave);
  const settingsRef = useRef(settings);
  const latestHomeRef = useRef(home);

  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { latestHomeRef.current = home; }, [home]);

  // Sync home state when settings load asynchronously after mount
  useEffect(() => {
    if (didSync.current) return;
    if (!settings.home) return;
    didSync.current = true;
    isFirstLoad.current = true; // suppress auto-save triggered by this sync
    setHome({ ...defaultHome, ...settings.home });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.home]);

  useEffect(() => {
    if (isFirstLoad.current) { isFirstLoad.current = false; return; }
    setSaveStatus('saving');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await onSaveRef.current({ ...settingsRef.current, home: latestHomeRef.current });
        setSaveStatus('saved');
        setPreviewKey(k => k + 1);
      } catch {
        addToast('Failed to save home page', 'error');
        setSaveStatus('saved');
      }
    }, 1000);
    return () => clearTimeout(saveTimer.current);
  }, [home]);

  const set = (key, val) => setHome(h => ({ ...h, [key]: val }));

  const updateBlock = (id, changes) =>
    setHome(h => ({ ...h, blocks: h.blocks.map(b => b.id === id ? { ...b, ...changes } : b) }));

  const removeBlock = (id) => {
    setHome(h => ({ ...h, blocks: h.blocks.filter(b => b.id !== id) }));
    if (expandedBlockId === id) setExpandedBlockId(null);
  };

  const addBlock = (type) => {
    const block = defaultBlock(type);
    setHome(h => ({ ...h, blocks: [...h.blocks, block] }));
    setExpandedBlockId(block.id);
    setShowAddBlock(false);
  };

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
    setHome(h => {
      const blocks = [...h.blocks];
      const [moved] = blocks.splice(fromIndex, 1);
      const dest = fromIndex < toIndex ? toIndex - 1 : toIndex;
      const insertAt = dragOver?.pos === 'after' ? dest + 1 : dest;
      blocks.splice(Math.max(0, Math.min(insertAt, blocks.length)), 0, moved);
      return { ...h, blocks };
    });
    dragIndex.current = null;
    setDragOver(null);
  };
  const handleDragEnd = () => { dragIndex.current = null; setDragOver(null); };

  const statusLabel = { saved: '✓ Saved', saving: '⟳ Saving…' };
  const statusColor = { saved: 'var(--success)', saving: 'var(--text-muted)' };

  return (
    <SplitPane
      storageKey="home-editor"
      defaultLeftPct={44}
      minLeftPct={25}
      maxLeftPct={72}
      left={<div className="editor-pane">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '0 4px' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>🏠 Home Page</h2>
          <span style={{ fontSize: 11, color: statusColor[saveStatus] }}>{statusLabel[saveStatus]}</span>
        </div>

        <div className="meta-card">
          <div className="field">
            <label>Hero title</label>
            <input
              type="text"
              value={home.heroTitle || ''}
              onChange={e => set('heroTitle', e.target.value)}
              placeholder={settings.title || 'Site name'}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
              Defaults to site name if left blank.
            </span>
          </div>
          <div className="field">
            <label>Hero subtitle</label>
            <input
              type="text"
              value={home.heroSubtitle || ''}
              onChange={e => set('heroSubtitle', e.target.value)}
              placeholder="A short tagline or description"
            />
          </div>
          <label className="theme-toggle-row" style={{ marginTop: 4 }}>
            <input
              type="checkbox"
              checked={home.showPageGrid !== false}
              onChange={e => set('showPageGrid', e.target.checked)}
            />
            <span>Show page grid below content</span>
          </label>
        </div>

        <div className="blocks-header">
          <h3>Content Blocks ({home.blocks.length})</h3>
        </div>

        <div className="blocks-list">
          {home.blocks.map((block, idx) => (
            <BlockEditor
              key={block.id}
              block={block}
              index={idx}
              total={home.blocks.length}
              expanded={expandedBlockId === block.id}
              onToggle={() => setExpandedBlockId(expandedBlockId === block.id ? null : block.id)}
              onChange={changes => updateBlock(block.id, changes)}
              onRemove={() => removeBlock(block.id)}
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
              onDragOver={e => handleDragOver(e, idx)}
              onDrop={e => handleDrop(e, idx)}
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
      </div>}
      right={<div className="editor-preview">
        <SitePreview refreshSignal={previewKey} siteId={siteId} siteSlug={siteSlug} addToast={addToast} />
      </div>}
    />
  );
}
