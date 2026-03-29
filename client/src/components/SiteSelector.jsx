import { useState, useRef, useEffect, useCallback } from 'react';
import { getNginxStatus } from '../api.js';

export default function SiteSelector({ sites, onCreate, onOpen, onDelete, onRename, cmsSettings = {}, onUpdateCmsSettings }) {
  const [search, setSearch] = useState('');

  // CMS-wide settings dialog
  const [showCmsSettings, setShowCmsSettings] = useState(false);
  const [baseUrlInput, setBaseUrlInput] = useState('');
  const [savingCms, setSavingCms] = useState(false);

  // Nginx status
  const [nginxStatus, setNginxStatus] = useState(null); // null | 'active' | 'inactive' | 'failed' | 'unknown'
  const [nginxLoading, setNginxLoading] = useState(false);

  // New site dialog
  const [newDialog, setNewDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const newInputRef = useRef(null);

  // Gear dialog
  const [gearSite, setGearSite] = useState(null); // site object
  const [gearView, setGearView] = useState('menu'); // 'menu' | 'rename' | 'delete'
  const [renameName, setRenameName] = useState('');
  const [deleteInput, setDeleteInput] = useState('');
  const renameRef = useRef(null);
  const deleteInputRef = useRef(null);

  useEffect(() => {
    if (newDialog) setTimeout(() => newInputRef.current?.focus(), 30);
  }, [newDialog]);

  useEffect(() => {
    if (gearView === 'rename') setTimeout(() => renameRef.current?.select(), 30);
    if (gearView === 'delete') setTimeout(() => deleteInputRef.current?.focus(), 30);
  }, [gearView]);

  const fetchNginxStatus = useCallback(async () => {
    setNginxLoading(true);
    try { const d = await getNginxStatus(); setNginxStatus(d.status); }
    catch { setNginxStatus('unknown'); }
    finally { setNginxLoading(false); }
  }, []);

  const openCmsSettings = () => {
    setBaseUrlInput(cmsSettings.baseUrl || '');
    setShowCmsSettings(true);
    fetchNginxStatus();
  };

  const saveCmsSettings = async () => {
    setSavingCms(true);
    try { await onUpdateCmsSettings({ baseUrl: baseUrlInput }); }
    finally { setSavingCms(false); setShowCmsSettings(false); }
  };

  const openGear = (e, site) => {
    e.stopPropagation();
    setGearSite(site);
    setGearView('menu');
    setRenameName(site.name);
    setDeleteInput('');
  };

  const closeGear = () => setGearSite(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      await onCreate(name);
      setNewName('');
      setNewDialog(false);
    } finally {
      setCreating(false);
    }
  };

  const commitRename = async () => {
    const name = renameName.trim();
    if (name && name !== gearSite.name) await onRename(gearSite.id, name);
    closeGear();
  };

  const confirmDelete = () => {
    if (deleteInput === gearSite.name) {
      onDelete(gearSite.id);
      closeGear();
    }
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
          <svg className="site-selector-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
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
        <button className="btn btn-primary btn-sm site-selector-new-btn" onClick={() => { setNewName(''); setNewDialog(true); }}>
          + New
        </button>
        <button className="btn btn-secondary btn-sm btn-icon" onClick={openCmsSettings} title="CMS settings">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>

      {filtered.length === 0 && (
        <div className="site-selector-empty">
          {q ? `No sites match "${search}"` : 'No sites yet. Create your first one.'}
        </div>
      )}

      <div className="site-project-list">
        {filtered.map(site => (
          <div key={site.id} className="site-project-row" onClick={() => onOpen(site)}>
            <div className="site-project-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>
              </svg>
            </div>
            <div className="site-project-info">
              <span className="site-project-name">{site.name}</span>
              <span className="site-project-slug">/{site.slug}</span>
              {cmsSettings.baseUrl && (
                <a
                  href={`${cmsSettings.baseUrl}/${site.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`site-project-url${site.deployed ? '' : ' site-project-url--undeployed'}`}
                  onClick={e => e.stopPropagation()}
                >
                  {cmsSettings.baseUrl}/{site.slug}
                </a>
              )}
            </div>
            <div className="site-project-actions" onClick={e => e.stopPropagation()}>
              <button className="site-gear-btn" onClick={e => openGear(e, site)} title="Site settings">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* New site dialog */}
      {newDialog && (
        <div className="site-dialog-backdrop" onClick={() => setNewDialog(false)}>
          <div className="site-dialog" onClick={e => e.stopPropagation()}>
            <h3 className="site-dialog-title">New Site</h3>
            <form onSubmit={handleCreate}>
              <div className="field">
                <label>Site name</label>
                <input
                  ref={newInputRef}
                  type="text"
                  className="site-dialog-input"
                  placeholder="e.g. My Learning Site"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Escape' && setNewDialog(false)}
                />
              </div>
              <div className="site-dialog-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setNewDialog(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={creating || !newName.trim()}>
                  {creating ? 'Creating…' : 'Create Site'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CMS-wide settings dialog */}
      {showCmsSettings && (
        <div className="site-dialog-backdrop" onClick={() => setShowCmsSettings(false)}>
          <div className="site-dialog" onClick={e => e.stopPropagation()}>
            <h3 className="site-dialog-title">CMS Settings</h3>
            <div className="field">
              <label>Base URL</label>
              <input
                type="text"
                className="site-dialog-input"
                placeholder="https://example.com"
                value={baseUrlInput}
                onChange={e => setBaseUrlInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveCmsSettings(); if (e.key === 'Escape') setShowCmsSettings(false); }}
                autoFocus
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                {baseUrlInput
                  ? <>Sites will be accessible at <strong>{baseUrlInput.replace(/\/+$/, '')}/&lt;site-slug&gt;</strong></>
                  : 'Set a base URL to track deployment links for each site.'}
              </span>
            </div>
            <div className="cms-settings-nginx">
              <div className="cms-settings-nginx-header">
                <span className="cms-settings-nginx-label">Nginx</span>
                <span className={`cms-settings-nginx-badge cms-settings-nginx-badge--${nginxStatus || 'unknown'}`}>
                  {nginxLoading ? '…' : (nginxStatus || '—')}
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={fetchNginxStatus}
                  disabled={nginxLoading}
                  title="Refresh nginx status"
                >↻</button>
              </div>
            </div>
            <div className="site-dialog-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => setShowCmsSettings(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={saveCmsSettings} disabled={savingCms}>
                {savingCms ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gear / site settings dialog */}
      {gearSite && (
        <div className="site-dialog-backdrop" onClick={closeGear}>
          <div className="site-dialog" onClick={e => e.stopPropagation()}>

            {gearView === 'menu' && (
              <>
                <h3 className="site-dialog-title">{gearSite.name}</h3>
                <p className="site-dialog-subtitle">/{gearSite.slug}</p>
                <div className="site-dialog-menu">
                  <button className="site-dialog-menu-item" onClick={() => setGearView('rename')}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Rename
                  </button>
                  <button className="site-dialog-menu-item site-dialog-menu-item--danger" onClick={() => setGearView('delete')}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    Delete site
                  </button>
                </div>
                <div className="site-dialog-actions">
                  <button className="btn btn-secondary btn-sm" onClick={closeGear}>Close</button>
                </div>
              </>
            )}

            {gearView === 'rename' && (
              <>
                <h3 className="site-dialog-title">Rename Site</h3>
                <div className="field">
                  <label>New name</label>
                  <input
                    ref={renameRef}
                    type="text"
                    className="site-dialog-input"
                    value={renameName}
                    onChange={e => setRenameName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitRename();
                      if (e.key === 'Escape') setGearView('menu');
                    }}
                  />
                </div>
                <div className="site-dialog-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => setGearView('menu')}>Back</button>
                  <button className="btn btn-primary btn-sm" onClick={commitRename} disabled={!renameName.trim()}>Save</button>
                </div>
              </>
            )}

            {gearView === 'delete' && (
              <>
                <h3 className="site-dialog-title">Delete Site</h3>
                <p className="site-dialog-body">
                  This action <strong>cannot be undone</strong>. This will permanently delete{' '}
                  <strong>{gearSite.name}</strong> and all its pages.
                </p>
                <p className="site-dialog-body">Type <strong>{gearSite.name}</strong> to confirm.</p>
                <div className="field">
                  <input
                    ref={deleteInputRef}
                    type="text"
                    className="site-dialog-input"
                    value={deleteInput}
                    onChange={e => setDeleteInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && deleteInput === gearSite.name) confirmDelete();
                      if (e.key === 'Escape') setGearView('menu');
                    }}
                    placeholder={gearSite.name}
                    autoComplete="off"
                  />
                </div>
                <div className="site-dialog-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => setGearView('menu')}>Back</button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={confirmDelete}
                    disabled={deleteInput !== gearSite.name}
                  >Delete this site</button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
