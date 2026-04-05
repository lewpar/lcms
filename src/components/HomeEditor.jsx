'use client';
import { useState, useEffect, useRef } from 'react';
import BlockEditor from './BlockEditor.jsx';
import SplitPane from './SplitPane.jsx';
import ContentPreview from './ContentPreview.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import AddBlockDialog from './AddBlockDialog.jsx';
import { BLOCK_TYPES, defaultBlock } from '../blockTypes.js';
import { AUTOSAVE_DELAY_MS } from '../utils.js';

export default function HomeEditor({ settings, onSave, addToast, siteId, siteSlug, pages }) {
  const defaultHome = { heroTitle: '', heroSubtitle: '', showPageGrid: true, blocks: [] };

  const [home, setHome] = useState(() => ({ ...defaultHome, ...(settings.home || {}) }));
  const [saveStatus, setSaveStatus] = useState('saved');
  const [previewKey, setPreviewKey] = useState(0);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [metaOpen, setMetaOpen] = useState(false);
  const [expandedBlockId, setExpandedBlockId] = useState(null);
  const [pendingRemoveId, setPendingRemoveId] = useState(null);
  const [insertAtIndex, setInsertAtIndex] = useState(null);

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
        setSaveStatus('error');
      }
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(saveTimer.current);
  }, [home]);

  const set = (key, val) => setHome(h => ({ ...h, [key]: val }));

  const updateBlock = (id, changes) =>
    setHome(h => ({ ...h, blocks: h.blocks.map(b => b.id === id ? { ...b, ...changes } : b) }));

  const removeBlock = (id) => {
    setHome(h => ({ ...h, blocks: h.blocks.filter(b => b.id !== id) }));
    if (expandedBlockId === id) setExpandedBlockId(null);
  };

  const confirmRemoveBlock = () => {
    removeBlock(pendingRemoveId);
    setPendingRemoveId(null);
  };

  const addBlock = (type) => {
    const block = defaultBlock(type);
    setHome(h => {
      const blocks = [...h.blocks];
      const at = insertAtIndex !== null ? insertAtIndex : blocks.length;
      blocks.splice(at, 0, block);
      return { ...h, blocks };
    });
    setExpandedBlockId(block.id);
    setShowAddBlock(false);
    setInsertAtIndex(null);
  };

  const moveBlock = (fromIndex, toIndex) => {
    setHome(h => {
      const blocks = [...h.blocks];
      const [moved] = blocks.splice(fromIndex, 1);
      blocks.splice(toIndex, 0, moved);
      return { ...h, blocks };
    });
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

  const statusLabel = { saved: '✓ Saved', saving: '⟳ Saving…', error: '✕ Save failed' };
  const statusColor = { saved: 'var(--success)', saving: 'var(--text-muted)', error: 'var(--danger)' };

  return (
    <>
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
          <button className={`meta-card-toggle${metaOpen ? ' open' : ''}`} onClick={() => setMetaOpen(o => !o)}>
            <span>Home Settings</span>
            <span className="meta-card-toggle-icon">{metaOpen ? '▾' : '▸'}</span>
          </button>
          {metaOpen && <div className="meta-card-body"><>
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
          </></div>}
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
              onRemove={() => setPendingRemoveId(block.id)}
              onMoveUp={() => moveBlock(idx, idx - 1)}
              onMoveDown={() => moveBlock(idx, idx + 1)}
              onAddBelow={() => { setInsertAtIndex(idx + 1); setShowAddBlock(true); }}
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
        <ContentPreview
          siteId={siteId}
          page={{ title: home.heroTitle || settings.title || 'Home', blocks: home.blocks || [] }}
          refreshSignal={previewKey}
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
    </>
  );
}
