import { useState, useRef } from 'react';

export default function SiteSelector({ sites, onCreate, onOpen, onDelete, onRename }) {
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [deleteDialog, setDeleteDialog] = useState(null); // { id, name }
  const [deleteInput, setDeleteInput] = useState('');
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

  return (
    <div className="site-selector">
      <div className="site-selector-header">
        <div className="site-selector-logo">LCMS</div>
        <h1 className="site-selector-title">Your Sites</h1>
        <p className="site-selector-subtitle">Select a site to edit, or create a new one.</p>
      </div>

      <div className="site-grid">
        {sites.map(site => (
          <div key={site.id} className="site-card">
            <div className="site-card-body" onClick={() => editingId !== site.id && onOpen(site)}>
              {editingId === site.id ? (
                <input
                  ref={renameRef}
                  className="site-card-rename-input"
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
                <div
                  className="site-card-name"
                  onDoubleClick={e => { e.stopPropagation(); startRename(site); }}
                  title="Double-click to rename"
                >
                  {site.name}
                </div>
              )}
              <div className="site-card-slug">/{site.slug}</div>
            </div>
            <div className="site-card-actions">
              <button className="btn btn-primary btn-sm" onClick={() => onOpen(site)}>
                Open →
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={e => { e.stopPropagation(); openDeleteDialog(site); }}
                title="Delete site"
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {/* New site card */}
        <div className="site-card site-card--new">
          <form onSubmit={handleCreate} className="site-new-form">
            <div className="site-card-name" style={{ color: 'var(--text-muted)', marginBottom: 10 }}>New Site</div>
            <input
              type="text"
              className="site-new-input"
              placeholder="Site name…"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
            <button className="btn btn-primary btn-sm" type="submit" disabled={creating || !newName.trim()}>
              {creating ? 'Creating…' : '+ Create'}
            </button>
          </form>
        </div>
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
