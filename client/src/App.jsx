import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getSites, createSite, deleteSite, renameSite,
  getPages, createPage, deletePage, duplicatePage, generateSite,
  getSiteSettings, updateSiteSettings, patchPage, reorderPages,
} from './api.js';
import PageEditor from './components/PageEditor.jsx';
import HomeEditor from './components/HomeEditor.jsx';
import SettingsView from './components/SettingsView.jsx';
import ThemeView from './components/ThemeView.jsx';
import SitePreview from './components/SitePreview.jsx';
import SiteSelector from './components/SiteSelector.jsx';
import MediaManager from './components/MediaManager.jsx';

function randomId() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

function Toast({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>
      ))}
    </div>
  );
}

const DEFAULT_SETTINGS = { title: 'My Site', navPages: [], sections: [], theme: {} };

export default function App() {
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);

  const [pages, setPages] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [selectedId, setSelectedId] = useState(null);
  const [view, setView] = useState('pages');
  const [toasts, setToasts] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch] = useState('');
  const [collapsedSections, setCollapsedSections] = useState({});
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [editingSectionName, setEditingSectionName] = useState('');
  const [draggingPageId, setDraggingPageId] = useState(null);
  const [dragOverTarget, setDragOverTarget] = useState(undefined);
  const [dragOverPageId, setDragOverPageId] = useState(null);
  const [dragInsertPos, setDragInsertPos] = useState('after');
  const renamingRef = useRef(null);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);

  // ── Site selection ───────────────────────────────────────

  useEffect(() => {
    getSites().then(setSites).catch(() => addToast('Failed to load sites', 'error'));
  }, []);

  const openSite = (site) => {
    setSelectedSite(site);
    setSelectedId(null);
    setView('pages');
    setPages([]);
    setSettings(DEFAULT_SETTINGS);
    setSearch('');
    setCollapsedSections({});
  };

  const closeSite = () => {
    setSelectedSite(null);
    setSelectedId(null);
    setView('pages');
  };

  const handleCreateSite = async (name) => {
    const site = await createSite(name);
    setSites(s => [...s, site]);
    openSite(site);
  };

  const handleDeleteSite = async (siteId) => {
    await deleteSite(siteId);
    setSites(s => s.filter(x => x.id !== siteId));
    if (selectedSite?.id === siteId) closeSite();
  };

  const handleRenameSite = async (siteId, name) => {
    const updated = await renameSite(siteId, name);
    setSites(s => s.map(x => x.id === siteId ? updated : x));
    if (selectedSite?.id === siteId) setSelectedSite(updated);
  };

  // ── Per-site data loading ────────────────────────────────

  const siteId = selectedSite?.id;

  const loadPages = useCallback(async () => {
    if (!siteId) return;
    try { setPages(await getPages(siteId)); }
    catch { addToast('Failed to load pages', 'error'); }
  }, [siteId, addToast]);

  const loadSettings = useCallback(async () => {
    if (!siteId) return;
    try {
      const s = await getSiteSettings(siteId);
      setSettings({ ...DEFAULT_SETTINGS, ...s, sections: s.sections || [] });
    } catch { /* non-fatal */ }
  }, [siteId]);

  useEffect(() => {
    if (siteId) { loadPages(); loadSettings(); }
  }, [siteId, loadPages, loadSettings]);

  const saveSettings = useCallback(async (newSettings) => {
    await updateSiteSettings(siteId, newSettings);
    setSettings(newSettings);
  }, [siteId]);

  // ── Sections ─────────────────────────────────────────────

  const addSection = async () => {
    const id = randomId();
    const name = 'New Section';
    const newSections = [...(settings.sections || []), { id, name }];
    const newSettings = { ...settings, sections: newSections };
    try {
      await updateSiteSettings(siteId, newSettings);
      setSettings(newSettings);
      setEditingSectionId(id);
      setEditingSectionName(name);
      setTimeout(() => renamingRef.current?.select(), 50);
    } catch { addToast('Failed to add section', 'error'); }
  };

  const commitRenameSection = async () => {
    if (!editingSectionId) return;
    const name = editingSectionName.trim() || 'Unnamed Section';
    const newSections = settings.sections.map(s => s.id === editingSectionId ? { ...s, name } : s);
    const newSettings = { ...settings, sections: newSections };
    try {
      await updateSiteSettings(siteId, newSettings);
      setSettings(newSettings);
    } catch { addToast('Failed to rename section', 'error'); }
    setEditingSectionId(null);
  };

  const deleteSection = async (id) => {
    const pagesInSection = pages.filter(p => p.section === id);
    try {
      await Promise.all(pagesInSection.map(p => patchPage(siteId, p.id, { section: '' })));
      const newSections = settings.sections.filter(s => s.id !== id);
      const newSettings = { ...settings, sections: newSections };
      await updateSiteSettings(siteId, newSettings);
      setSettings(newSettings);
      await loadPages();
    } catch { addToast('Failed to delete section', 'error'); }
  };

  const movePageToSection = async (pageId, sectionId) => {
    try {
      await patchPage(siteId, pageId, { section: sectionId });
      await loadPages();
    } catch { addToast('Failed to move page', 'error'); }
  };

  const toggleSectionCollapse = (id) => setCollapsedSections(c => ({ ...c, [id]: !c[id] }));

  // ── Pages ────────────────────────────────────────────────

  const filteredPages = pages.filter(p =>
    !search ||
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.toLowerCase().includes(search.toLowerCase())
  );

  const handleNewPage = async (sectionId = '') => {
    try {
      const page = await createPage(siteId, { title: 'Untitled Page', slug: `page-${Date.now()}`, section: sectionId });
      await loadPages();
      setSelectedId(page.id);
      setView('pages');
    } catch { addToast('Failed to create page', 'error'); }
  };

  const handleDuplicate = async (e, id) => {
    e.stopPropagation();
    try {
      const copy = await duplicatePage(siteId, id);
      await loadPages();
      setSelectedId(copy.id);
      setView('pages');
      addToast('Page duplicated', 'success');
    } catch { addToast('Duplicate failed', 'error'); }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Delete this page?')) return;
    try {
      await deletePage(siteId, id);
      if (selectedId === id) setSelectedId(null);
      await loadPages();
      addToast('Page deleted', 'success');
    } catch { addToast('Failed to delete page', 'error'); }
  };

  const handleGenerate = async () => {
    setShowDeployDialog(false);
    setGenerating(true);
    try {
      const result = await generateSite(siteId);
      addToast(result.message || 'Site deployed!', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally { setGenerating(false); }
  };

  const handlePageSaved = useCallback(async (silent = false) => {
    await loadPages();
    if (!silent) addToast('Page saved', 'success');
  }, [loadPages, addToast]);

  const selectPage = (id) => { setSelectedId(id); setView('pages'); };

  // ── Page ordering via drag ───────────────────────────────

  const onPageDragOverPage = (e, pageId) => {
    if (!draggingPageId || draggingPageId === pageId) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    setDragOverPageId(pageId);
    setDragInsertPos(pos);
  };

  const onPageDropOnPage = async (e, targetPageId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggingPageId || draggingPageId === targetPageId) {
      setDragOverPageId(null);
      return;
    }
    const targetPage = pages.find(p => p.id === targetPageId);
    const sectionId = targetPage ? targetPage.section : '';
    const sectionPages = pages.filter(p => (p.section || '') === (sectionId || ''));
    const ids = sectionPages.map(p => p.id).filter(id => id !== draggingPageId);
    const targetIdx = ids.indexOf(targetPageId);
    const insertAt = dragInsertPos === 'after' ? targetIdx + 1 : targetIdx;
    ids.splice(insertAt, 0, draggingPageId);
    setDragOverPageId(null);
    setDraggingPageId(null);
    setDragOverTarget(undefined);
    try {
      await reorderPages(siteId, ids);
      await loadPages();
    } catch {
      addToast('Failed to reorder pages', 'error');
    }
  };

  // ── Drag-to-section ──────────────────────────────────────

  const onPageDragStart = (e, pageId) => {
    e.stopPropagation();
    setDraggingPageId(pageId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onPageDragEnd = () => {
    setDraggingPageId(null);
    setDragOverTarget(undefined);
    setDragOverPageId(null);
  };

  const onSectionDragOver = (e, targetId) => {
    if (!draggingPageId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTarget(targetId);
  };

  const onSectionDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOverTarget(undefined);
  };

  const onSectionDrop = (e, targetSectionId) => {
    e.preventDefault();
    if (draggingPageId) movePageToSection(draggingPageId, targetSectionId ?? '');
    setDraggingPageId(null);
    setDragOverTarget(undefined);
  };

  // ── Site selector screen ─────────────────────────────────

  if (!selectedSite) {
    return (
      <>
        <SiteSelector
          sites={sites}
          onCreate={handleCreateSite}
          onOpen={openSite}
          onDelete={handleDeleteSite}
          onRename={handleRenameSite}
        />
        <Toast toasts={toasts} />
      </>
    );
  }

  // ── Sidebar rendering ────────────────────────────────────

  const sections = settings.sections || [];
  const pagesBySection = {};
  const unsectionedPages = [];
  for (const page of filteredPages) {
    if (page.section && sections.find(s => s.id === page.section)) {
      if (!pagesBySection[page.section]) pagesBySection[page.section] = [];
      pagesBySection[page.section].push(page);
    } else {
      unsectionedPages.push(page);
    }
  }

  const renderPageItem = (page) => {
    const insertClass = dragOverPageId === page.id
      ? (dragInsertPos === 'before' ? 'drag-insert-before' : 'drag-insert-after')
      : '';
    return (
    <div
      key={page.id}
      className={`page-list-item ${selectedId === page.id && view === 'pages' ? 'active' : ''} ${draggingPageId === page.id ? 'dragging' : ''} ${insertClass}`}
      onClick={() => selectPage(page.id)}
      draggable
      onDragStart={e => onPageDragStart(e, page.id)}
      onDragEnd={onPageDragEnd}
      onDragOver={e => onPageDragOverPage(e, page.id)}
      onDrop={e => onPageDropOnPage(e, page.id)}
    >
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div className="page-list-item-title">{page.title}</div>
        <div className="page-list-item-slug">/{page.slug}</div>
      </div>
      <div className="page-list-actions">
        <button className="page-list-item-action" onClick={e => handleDuplicate(e, page.id)} title="Duplicate">⧉</button>
        <button className="page-list-item-delete" onClick={e => handleDelete(e, page.id)} title="Delete">✕</button>
      </div>
    </div>
  );
  };

  return (
    <div className="app">
      <button
        className="sidebar-toggle"
        onClick={() => setSidebarOpen(o => !o)}
        title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {sidebarOpen ? '◀' : '▶'}
      </button>

      <aside className={`sidebar${sidebarOpen ? '' : ' collapsed'}`}>
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              className="btn btn-secondary btn-sm btn-icon"
              onClick={closeSite}
              title="Back to sites"
              style={{ flexShrink: 0 }}
            >←</button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: 14, lineHeight: 1.2 }}>{selectedSite.name}</h1>
              <p style={{ fontSize: 10 }}>/{selectedSite.slug}</p>
            </div>
            <button
              className={`btn btn-secondary btn-sm btn-icon${view === 'settings' ? ' active-view' : ''}`}
              onClick={() => setView(v => v === 'settings' ? 'pages' : 'settings')}
              title="Site settings"
              style={{ flexShrink: 0, fontSize: 18, lineHeight: 1, padding: '3px 7px' }}
            >⚙</button>
          </div>
        </div>

        <div className="sidebar-search">
          <input
            type="text"
            placeholder="Search pages…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch('')} className="sidebar-search-clear">✕</button>}
        </div>

        {/* Home page entry */}
        <div
          className={`page-list-item home-page-item${view === 'home' ? ' active' : ''}`}
          onClick={() => setView('home')}
        >
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div className="page-list-item-title">🏠 Home</div>
            <div className="page-list-item-slug">/</div>
          </div>
        </div>

        <div className="page-list">
          {filteredPages.length === 0 && (
            <p style={{ padding: '8px 4px', fontSize: '12px', color: 'var(--text-muted)' }}>
              {search ? 'No pages match.' : 'No pages yet.'}
            </p>
          )}

          {sections.map(section => {
            const sectionPages = pagesBySection[section.id] || [];
            const collapsed = collapsedSections[section.id];
            const isEditing = editingSectionId === section.id;
            const isDragOver = dragOverTarget === section.id && draggingPageId;

            return (
              <div
                key={section.id}
                className={`sidebar-section${isDragOver ? ' drag-over' : ''}`}
                onDragOver={e => onSectionDragOver(e, section.id)}
                onDragLeave={onSectionDragLeave}
                onDrop={e => onSectionDrop(e, section.id)}
              >
                <div className="sidebar-section-header">
                  <button className="sidebar-section-chevron" onClick={() => toggleSectionCollapse(section.id)}>
                    {collapsed ? '▶' : '▼'}
                  </button>
                  {isEditing ? (
                    <input
                      ref={renamingRef}
                      className="section-rename-input"
                      value={editingSectionName}
                      onChange={e => setEditingSectionName(e.target.value)}
                      onBlur={commitRenameSection}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitRenameSection();
                        if (e.key === 'Escape') setEditingSectionId(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    <span
                      className="sidebar-section-name"
                      onDoubleClick={() => { setEditingSectionId(section.id); setEditingSectionName(section.name); }}
                      title="Double-click to rename"
                    >
                      {section.name}
                    </span>
                  )}
                  <span className="sidebar-section-count">{sectionPages.length}</span>
                  <button
                    className="sidebar-section-add-page"
                    onClick={() => handleNewPage(section.id)}
                    title="Add page to this section"
                  >+ Page</button>
                  <button
                    className="sidebar-section-delete"
                    onClick={() => {
                      if (sectionPages.length > 0 && !confirm(`Delete "${section.name}"? Pages will be moved to no section.`)) return;
                      deleteSection(section.id);
                    }}
                    title="Delete section"
                  >✕</button>
                </div>
                {!collapsed && (
                  <div className="sidebar-section-pages">
                    {sectionPages.length === 0 ? (
                      <div className={`sidebar-section-empty${isDragOver ? ' drag-hint' : ''}`}>
                        {isDragOver ? 'Drop here' : 'No pages — drag one here'}
                      </div>
                    ) : (
                      sectionPages.map(renderPageItem)
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <div
            className={`${sections.length > 0 ? 'sidebar-section' : ''} ${dragOverTarget === null && draggingPageId ? 'drag-over' : ''}`}
            onDragOver={e => onSectionDragOver(e, null)}
            onDragLeave={onSectionDragLeave}
            onDrop={e => onSectionDrop(e, null)}
          >
            {sections.length > 0 && unsectionedPages.length > 0 && (
              <div className="sidebar-section-header sidebar-section-header--unsectioned">
                <span className="sidebar-section-name" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Unsectioned</span>
                <span className="sidebar-section-count">{unsectionedPages.length}</span>
              </div>
            )}
            <div className={sections.length > 0 ? 'sidebar-section-pages' : ''}>
              {unsectionedPages.map(renderPageItem)}
            </div>
          </div>

          <button className="btn btn-secondary btn-sm sidebar-add-section-btn" onClick={addSection}>
            + Add Section
          </button>
        </div>

        <div className="sidebar-footer">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 6 }}>
            <button
              className={`btn btn-secondary btn-sm${view === 'theme' ? ' active-view' : ''}`}
              onClick={() => setView(v => v === 'theme' ? 'pages' : 'theme')}
            >
              🎨 Theme
            </button>
            <button
              className={`btn btn-secondary btn-sm${view === 'media' ? ' active-view' : ''}`}
              onClick={() => setView(v => v === 'media' ? 'pages' : 'media')}
            >
              🖼 Media
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            <button
              className={`btn btn-secondary btn-sm${view === 'preview' ? ' active-view' : ''}`}
              onClick={() => setView(v => v === 'preview' ? 'pages' : 'preview')}
            >
              ◉ Preview
            </button>
            <button
              className="btn btn-success btn-sm"
              onClick={() => setShowDeployDialog(true)}
              disabled={generating}
            >
              {generating ? 'Deploying…' : '⬡ Deploy'}
            </button>
          </div>
        </div>
      </aside>

      <main className="main">
        {view === 'settings' ? (
          <SettingsView settings={{ ...settings, _pages: pages }} onSave={saveSettings} addToast={addToast} siteId={siteId} siteSlug={selectedSite.slug} />
        ) : view === 'theme' ? (
          <ThemeView settings={settings} onSave={saveSettings} addToast={addToast} siteId={siteId} siteSlug={selectedSite.slug} />
        ) : view === 'media' ? (
          <MediaManager siteId={siteId} addToast={addToast} />
        ) : view === 'preview' ? (
          <SitePreview
            siteSlug={selectedSite.slug}
            siteId={siteId}
            addToast={addToast}
            initialSlug={pages.find(p => p.id === selectedId)?.slug || ''}
          />
        ) : view === 'home' ? (
          <HomeEditor
            settings={settings}
            onSave={saveSettings}
            addToast={addToast}
            siteId={siteId}
            siteSlug={selectedSite.slug}
            pages={pages}
          />
        ) : selectedId ? (
          <PageEditor
            key={selectedId}
            siteId={siteId}
            siteSlug={selectedSite.slug}
            pageId={selectedId}
            onSaved={handlePageSaved}
            addToast={addToast}
            pages={pages}
          />
        ) : (
          <div className="empty-state">
            <div style={{ fontSize: 48 }}>📄</div>
            <h2>No page selected</h2>
            <p>Select a page from the sidebar, or create a section and add pages to it.</p>
          </div>
        )}
      </main>

      {showDeployDialog && (
        <div className="modal-overlay" onClick={() => setShowDeployDialog(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 8 }}>Deploy site?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
              This will generate and publish a static build of <strong>{selectedSite.name}</strong>.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowDeployDialog(false)}>Cancel</button>
              <button className="btn btn-success" onClick={handleGenerate}>Deploy</button>
            </div>
          </div>
        </div>
      )}

      <Toast toasts={toasts} />
    </div>
  );
}
