import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getPage, updatePage } from '../api.js';
import SplitPane from './SplitPane.jsx';

// Keep stable refs so the unmount cleanup can fire without stale closures
import BlockEditor from './BlockEditor.jsx';
import ContentPreview from './ContentPreview.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import AddBlockDialog from './AddBlockDialog.jsx';
import IconPickerDialog from './IconPickerDialog.jsx';
import { v4 as uuidv4 } from '../uuid.js';
import { BLOCK_TYPES, defaultBlock } from '../blockTypes.js';
import { slugify, RESERVED_SLUGS, AUTOSAVE_DELAY_MS } from '../utils.js';

export default function PageEditor({ siteId, siteSlug, pageId, onSaved, addToast, pages = [] }) {
  const [page, setPage] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'unsaved' | 'saving'
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [metaOpen, setMetaOpen] = useState(true);
  const [expandedBlockId, setExpandedBlockId] = useState(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [pendingRemoveId, setPendingRemoveId] = useState(null);
  const [insertAtIndex, setInsertAtIndex] = useState(null);
  const [transferBlock, setTransferBlock] = useState(null); // block being transferred
  const [transferMode, setTransferMode] = useState('copy'); // 'copy' | 'move'
  const [transferTargetId, setTransferTargetId] = useState('');
  const [transferring, setTransferring] = useState(false);

  // Drag state
  const dragIndex = useRef(null);
  const [ghostIndex, setGhostIndex] = useState(null);
  const blocksListRef = useRef(null);

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
    if (!p.slug) {
      const generated = uuidv4().slice(0, 8);
      p = { ...p, slug: generated };
      setPage(p);
      addToast(`No slug set — generated "${generated}"`, 'info');
    }
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
    autoSaveTimer.current = setTimeout(() => doSave(page, true), AUTOSAVE_DELAY_MS);
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

  const openTransfer = (block) => {
    setTransferBlock(block);
    setTransferMode('copy');
    setTransferTargetId('');
  };

  const handleTransfer = async () => {
    if (!transferTargetId || !transferBlock) return;
    setTransferring(true);
    try {
      const targetPage = await getPage(siteId, transferTargetId);
      const blockToAdd = transferMode === 'copy'
        ? { ...transferBlock, id: uuidv4() }
        : transferBlock;
      await updatePage(siteId, transferTargetId, { ...targetPage, blocks: [...(targetPage.blocks || []), blockToAdd] });
      if (transferMode === 'move') removeBlock(transferBlock.id);
      const targetTitle = pages.find(p => p.id === transferTargetId)?.title || 'page';
      addToast(`Block ${transferMode === 'copy' ? 'copied' : 'moved'} to "${targetTitle || 'Untitled'}"`, 'success');
      setTransferBlock(null);
    } catch {
      addToast('Transfer failed', 'error');
    } finally {
      setTransferring(false);
    }
  };

  const addBlock = (type) => {
    const block = defaultBlock(type);
    setPage(p => {
      const blocks = [...p.blocks];
      const at = insertAtIndex !== null ? insertAtIndex : blocks.length;
      blocks.splice(at, 0, block);
      return { ...p, blocks };
    });
    setExpandedBlockId(block.id);
    setShowAddBlock(false);
    setInsertAtIndex(null);
  };

  const moveBlock = (fromIndex, toIndex) => {
    setPage(p => {
      const blocks = [...p.blocks];
      const [moved] = blocks.splice(fromIndex, 1);
      blocks.splice(toIndex, 0, moved);
      return { ...p, blocks };
    });
  };

  // Drag handlers
  const handleDragStart = (index) => { dragIndex.current = index; };

  const handleContainerDragOver = (e) => {
    e.preventDefault();
    if (dragIndex.current === null) return;
    const container = blocksListRef.current;
    if (!container) return;
    const blockCards = [...container.querySelectorAll('.block-card')];
    const mouseY = e.clientY;
    let gi = 0;
    for (let i = 0; i < blockCards.length; i++) {
      const rect = blockCards[i].getBoundingClientRect();
      if (mouseY > rect.top + rect.height / 2) gi = i + 1;
      else break;
    }
    setGhostIndex(gi);
  };

  const handleContainerDrop = (e) => {
    e.preventDefault();
    const fromIndex = dragIndex.current;
    if (fromIndex === null || ghostIndex === null) { dragIndex.current = null; setGhostIndex(null); return; }
    if (ghostIndex !== fromIndex && ghostIndex !== fromIndex + 1) {
      setPage(p => {
        const blocks = [...p.blocks];
        const [moved] = blocks.splice(fromIndex, 1);
        const insertAt = fromIndex < ghostIndex ? ghostIndex - 1 : ghostIndex;
        blocks.splice(Math.max(0, Math.min(insertAt, blocks.length)), 0, moved);
        return { ...p, blocks };
      });
    }
    dragIndex.current = null;
    setGhostIndex(null);
  };

  const handleDragEnd = () => { dragIndex.current = null; setGhostIndex(null); };

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

      <SplitPane
        storageKey="page-editor"
        defaultLeftPct={44}
        minLeftPct={25}
        maxLeftPct={72}
        left={<div className="editor-pane">
          {/* Metadata */}
          <div className="meta-card">
            <button className={`meta-card-toggle${metaOpen ? ' open' : ''}`} onClick={() => setMetaOpen(o => !o)}>
              <span>Page Settings</span>
              <span className="meta-card-toggle-icon">{metaOpen ? '▾' : '▸'}</span>
            </button>
            {metaOpen && <div className="meta-card-body"><>
              <div className="field">
                <label>Icon</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 22, lineHeight: 1, minWidth: 28, textAlign: 'center' }}>
                    {page.icon || <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>None</span>}
                  </span>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowIconPicker(true)}>
                    {page.icon ? 'Change' : 'Pick Icon'}
                  </button>
                  {page.icon && (
                    <button className="btn btn-secondary btn-sm" onClick={() => updateMeta('icon', '')}>Clear</button>
                  )}
                </div>
                {page.icon && (
                  <label className="theme-toggle-row" style={{ marginTop: 6 }}>
                    <input
                      type="checkbox"
                      checked={!!page.iconCollapsedOnly}
                      onChange={e => updateMeta('iconCollapsedOnly', e.target.checked)}
                    />
                    <span>Only show icon when sidebar is collapsed</span>
                  </label>
                )}
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                  {page.iconCollapsedOnly ? 'Icon shown only in the collapsed sidebar rail.' : 'Icon shown in both expanded and collapsed sidebar.'}
                </span>
              </div>
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
            </></div>}
          </div>

          {/* Blocks */}
          <div className="blocks-header">
            <h3>Blocks ({page.blocks.length})</h3>
          </div>

          <div className="blocks-list" ref={blocksListRef} onDragOver={handleContainerDragOver} onDrop={handleContainerDrop}>
            {(() => {
              const draggedBlock = dragIndex.current !== null ? page.blocks[dragIndex.current] : null;
              const draggedBt = draggedBlock ? BLOCK_TYPES.find(b => b.type === draggedBlock.type) : null;
              const ghostLabel = draggedBt ? `${draggedBt.icon || ''} ${draggedBt.label}`.trim() : 'Drop here';
              const showGhostAt = (i) => ghostIndex === i && dragIndex.current !== null
                && ghostIndex !== dragIndex.current && ghostIndex !== dragIndex.current + 1;
              return (
                <>
                  {page.blocks.map((block, idx) => (
                    <React.Fragment key={block.id}>
                      {showGhostAt(idx) && <div className="block-ghost">{ghostLabel}</div>}
                      <BlockEditor
                        block={block}
                        index={idx}
                        total={page.blocks.length}
                        expanded={expandedBlockId === block.id}
                        onToggle={() => setExpandedBlockId(expandedBlockId === block.id ? null : block.id)}
                        onChange={changes => updateBlock(block.id, changes)}
                        onRemove={() => setPendingRemoveId(block.id)}
                        onTransfer={() => openTransfer(block)}
                        onMoveUp={() => moveBlock(idx, idx - 1)}
                        onMoveDown={() => moveBlock(idx, idx + 1)}
                        onAddBelow={() => { setInsertAtIndex(idx + 1); setShowAddBlock(true); }}
                        addToast={addToast}
                        pages={pages}
                        siteId={siteId}
                        isDragging={dragIndex.current === idx}
                        onDragStart={() => handleDragStart(idx)}
                        onDragEnd={handleDragEnd}
                      />
                    </React.Fragment>
                  ))}
                  {showGhostAt(page.blocks.length) && <div className="block-ghost">{ghostLabel}</div>}
                </>
              );
            })()}

            {page.blocks.length === 0 && (
              <p className="blocks-empty-hint">No blocks yet. Add a block to start building this page.</p>
            )}

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
            page={page}
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

      {transferBlock && (
        <div className="modal-overlay" onClick={() => setTransferBlock(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ minWidth: 320 }}>
            <h3 style={{ marginBottom: 16 }}>Transfer Block</h3>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              <button
                className={`btn btn-sm${transferMode === 'copy' ? ' btn-primary' : ' btn-secondary'}`}
                onClick={() => setTransferMode('copy')}
              >Copy</button>
              <button
                className={`btn btn-sm${transferMode === 'move' ? ' btn-primary' : ' btn-secondary'}`}
                onClick={() => setTransferMode('move')}
              >Move</button>
            </div>
            <div className="field" style={{ marginBottom: 20 }}>
              <label>Destination page</label>
              <select value={transferTargetId} onChange={e => setTransferTargetId(e.target.value)}>
                <option value="">Select a page…</option>
                {pages.filter(p => p.id !== pageId).map(p => (
                  <option key={p.id} value={p.id}>{p.title || 'Untitled'} — /{p.slug}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setTransferBlock(null)} disabled={transferring}>Cancel</button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleTransfer}
                disabled={!transferTargetId || transferring}
              >
                {transferring ? 'Transferring…' : transferMode === 'copy' ? 'Copy to page' : 'Move to page'}
              </button>
            </div>
          </div>
        </div>
      )}

      <IconPickerDialog
        open={showIconPicker}
        current={page.icon || ''}
        onSelect={icon => updateMeta('icon', icon)}
        onClose={() => setShowIconPicker(false)}
      />
    </div>
  );
}
