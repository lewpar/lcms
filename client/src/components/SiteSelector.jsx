import { useState, useRef } from 'react';

export default function SiteSelector({ sites, onCreate, onOpen, onDelete, onRename }) {
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [deleteDialog, setDeleteDialog] = useState(null); // { id, name }
  const [deleteInput, setDeleteInput] = useState('');
  const [search, setSearch] = useState('');
  const renameRef = useRef(null);
  const deleteInputRef = useRef(null);

  const openDeleteDialog = (site) => {
    setDeleteDialog({ id: site.id, name: site.name });
    setDeleteInput('');
    setTimeout(() => deleteInputRef.current?.focus(), 30);
  };

  const closeDeleteDialog = () => {
    setDeleteDialog(null);
    setDeleteInput('');
  };

  const confirmDelete = () => {
    if (deleteInput === deleteDialog.name) {
      onDelete(deleteDialog.id);
      closeDeleteDialog();
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      await onCreate(name);
      setNewName('');
    } finally {
      setCreating(false);
    }
  };

  const startRename = (site) => {
    setEditingId(site.id);
    setEditingName(site.name);
    setTimeout(() => renameRef.current?.select(), 30);
  };

  const commitRename = async () => {
    const name = editingName.trim();
    if (name && name !== sites.find(s => s.id === editingId)?.name) {
      await onRename(editingId, name);
    }
    setEditingId(null);
  };

  const q = search.trim().toLowerCase();
  const filtered = q ? sites.filter(s => s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q)) : sites;

  return (
    <div className="site-selector">
      <div className="site-selector-header">
        <div className="site-selector-logo">LCMS</div>
        <h1 className="site-selector-title">Your Sites</h1>
      </div>

      <div className="site-selector-toolbar">
        <div className="site-selector-search-wrap">
          <span className="site-selector-search-icon">⌕</span>
          <input
            className="site-selector-search"
            type="text"
            placeholder="Search sites…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="site-selector-search-clear" onClick={() => setSearch('')} aria-label="Clear search">✕</button>
          )}
        </div>

        <form onSubmit={handleCreate} className="site-new-form">
          <input
            type="text"
            className="site-new-input"
            placeholder="New site name…"
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
          <button className="btn btn-primary btn-sm" type="submit" disabled={creating || !newName.trim()}>
            {creating ? 'Creating…' : '+ New Site'}
          </button>
        </form>
      </div>

      {filtered.length === 0 && (
        <div className="site-selector-empty">
          {q ? `No sites match "${search}"` : 'No sites yet. Create one above.'}
        </div>
      )}

      <div className="site-project-list">
        {filtered.map(site => (
          <div
            key={site.id}
            className="site-project-row"
            onClick={() => editingId !== site.id && onOpen(site)}
          >
            <div className="site-project-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>
              </svg>
            </div>

            <div className="site-project-info">
              {editingId === site.id ? (
                <input
                  ref={renameRef}
                  className="site-project-rename-input"
                  value={editingName}
                  onChange={e => setEditingName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitRename();
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  onClick={e => e.stopPropagation()}
                  autoFocus
                />
              ) : (
                <span
                  className="site-project-name"
                  onDoubleClick={e => { e.stopPropagation(); startRename(site); }}
                  title="Double-click to rename"
                >{site.name}</span>
              )}
              <span className="site-project-slug">/{site.slug}</span>
            </div>

            <div className="site-project-actions" onClick={e => e.stopPropagation()}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={e => { e.stopPropagation(); startRename(site); }}
                title="Rename"
              >Rename</button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={e => { e.stopPropagation(); openDeleteDialog(site); }}
                title="Delete site"
              >Delete</button>
              <button className="btn btn-primary btn-sm" onClick={() => onOpen(site)}>
                Open →
              </button>
            </div>
          </div>
        ))}
      </div>

      {deleteDialog && (
        <div className="site-delete-overlay" onClick={closeDeleteDialog}>
          <div className="site-delete-dialog" onClick={e => e.stopPropagation()}>
            <h3 className="site-delete-dialog-title">Delete site</h3>
            <p className="site-delete-dialog-body">
              This action <strong>cannot be undone</strong>. This will permanently delete the{' '}
              <strong>{deleteDialog.name}</strong> site and all its pages.
            </p>
            <p className="site-delete-dialog-body">
              Please type <strong>{deleteDialog.name}</strong> to confirm.
            </p>
            <input
              ref={deleteInputRef}
              type="text"
              className="site-delete-dialog-input"
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && deleteInput === deleteDialog.name) confirmDelete();
                if (e.key === 'Escape') closeDeleteDialog();
              }}
              placeholder={deleteDialog.name}
              autoComplete="off"
            />
            <div className="site-delete-dialog-actions">
              <button className="btn btn-secondary btn-sm" onClick={closeDeleteDialog}>Cancel</button>
              <button
                className="btn btn-danger btn-sm"
                onClick={confirmDelete}
                disabled={deleteInput !== deleteDialog.name}
              >
                Delete this site
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
