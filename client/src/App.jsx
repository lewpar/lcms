import React, { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from './uuid.js';
import {
  getSites, createSite, deleteSite, renameSite,
  getPages, createPage, deletePage, duplicatePage, generateSite,
  deployGithubPages, undeployGithubPages,
  getSiteSettings, updateSiteSettings, patchPage, reorderPages,
  getCmsSettings, updateCmsSettings,
} from './api.js';
import PageEditor from './components/PageEditor.jsx';
import HomeEditor from './components/HomeEditor.jsx';
import SettingsView from './components/SettingsView.jsx';
import ThemeView from './components/ThemeView.jsx';
import SitePreview from './components/SitePreview.jsx';
import SiteSelector from './components/SiteSelector.jsx';
import MediaManager from './components/MediaManager.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';

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
  const [cmsSettings, setCmsSettings] = useState({ baseUrl: '' });
  const [selectedSite, setSelectedSite] = useState(null);

  const [pages, setPages] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [selectedId, setSelectedId] = useState(null);
  const [view, setView] = useState('pages');
  const [toasts, setToasts] = useState([]);
  const [showDeployPicker, setShowDeployPicker] = useState(false);
  const [showGithubPanel, setShowGithubPanel] = useState(false);
  const [githubView, setGithubView] = useState('main'); // 'main' | 'confirm-deploy' | 'confirm-undeploy'
  const [undeployInput, setUndeployInput] = useState('');
  const [githubCommitMsg, setGithubCommitMsg] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [undeploying, setUndeploying] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch] = useState('');
  const [collapsedSections, setCollapsedSections] = useState({});
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [editingSectionName, setEditingSectionName] = useState('');
  const [draggingPageId, setDraggingPageId] = useState(null);
  const [dragOverTarget, setDragOverTarget] = useState(undefined);
  const [pageGhostSectionId, setPageGhostSectionId] = useState(undefined); // undefined=none, null=unsectioned, string=sectionId
  const [pageGhostIndex, setPageGhostIndex] = useState(null);
  const renamingRef = useRef(null);
  const [deletePageDialog, setDeletePageDialog] = useState(null); // { id, title }

  const addToast = useCallback((message, type = 'info') => {
    const id = uuidv4();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);

  // ── Site selection ───────────────────────────────────────

  const loadSites = useCallback(() => {
    getSites().then(setSites).catch(() => addToast('Failed to load sites', 'error'));
  }, [addToast]);

  useEffect(() => {
    loadSites();
    getCmsSettings().then(setCmsSettings).catch(() => {});
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

  const handleDeleteSite = async (siteId, { undeploy = false } = {}) => {
    if (undeploy) {
      await Promise.allSettled([undeployGithubPages(siteId)]);
    }
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
    const id = uuidv4();
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

  const handleDelete = (e, id) => {
    e.stopPropagation();
    const page = pages.find(p => p.id === id);
    setDeletePageDialog({ id, title: page?.title || 'this page' });
  };

  const confirmDeletePage = async () => {
    const { id } = deletePageDialog;
    setDeletePageDialog(null);
    try {
      await deletePage(siteId, id);
      if (selectedId === id) setSelectedId(null);
      await loadPages();
      addToast('Page deleted', 'success');
    } catch { addToast('Failed to delete page', 'error'); }
  };

  const openGithubPanel = () => {
    setShowDeployPicker(false);
    setShowGithubPanel(true);
    setGithubView('main');
    setUndeployInput('');
  };

  const handleDeployGithub = async () => {
    setDeploying(true);
    try {
      const result = await deployGithubPages(siteId, githubCommitMsg.trim() || null);
      addToast(result.message || 'Site deployed to GitHub Pages!', 'success');
      await loadSites();
      setShowGithubPanel(false);
    } catch (err) {
      addToast(err.message, 'error');
      setGithubView('main');
    } finally { setDeploying(false); }
  };

  const handleUndeployGithub = async () => {
    setUndeploying(true);
    try {
      await undeployGithubPages(siteId);
      addToast('Site undeployed from GitHub Pages', 'success');
      await loadSites();
      setShowGithubPanel(false);
    } catch (err) {
      addToast(err.message, 'error');
      setGithubView('main');
    } finally { setUndeploying(false); }
  };


  const handlePageSaved = useCallback(async (silent = false) => {
    await loadPages();
    if (!silent) addToast('Page saved', 'success');
  }, [loadPages, addToast]);

  const selectPage = (id) => { setSelectedId(id); setView('pages'); };

  // ── Page ordering via drag ───────────────────────────────

  const cleanupPageDrag = () => {
    setDraggingPageId(null);
    setDragOverTarget(undefined);
    setPageGhostSectionId(undefined);
    setPageGhostIndex(null);
  };

  const onPageDragStart = (e, pageId) => {
    e.stopPropagation();
    setDraggingPageId(pageId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onPageDragEnd = () => cleanupPageDrag();

  // Container-level drag over for each section's page list
  const onPageListDragOver = (e, sectionId) => {
    if (!draggingPageId) return;
    e.preventDefault();
    e.stopPropagation();
    const pageItems = [...e.currentTarget.querySelectorAll('.page-list-item')];
    const mouseY = e.clientY;
    let gi = 0;
    for (let i = 0; i < pageItems.length; i++) {
      const rect = pageItems[i].getBoundingClientRect();
      if (mouseY > rect.top + rect.height / 2) gi = i + 1;
      else break;
    }
    setPageGhostSectionId(sectionId);
    setPageGhostIndex(gi);
    setDragOverTarget(sectionId);
  };

  const onPageListDrop = async (e, sectionId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggingPageId || pageGhostIndex === null) { cleanupPageDrag(); return; }
    const fromPage = pages.find(p => p.id === draggingPageId);
    const fromSectionId = fromPage?.section || null;
    const normTarget = sectionId ?? null;
    const isReorder = (fromSectionId ?? null) === normTarget;
    try {
      if (isReorder) {
        const sectionPages = pages.filter(p => (p.section || null) === normTarget);
        const fromIdx = sectionPages.findIndex(p => p.id === draggingPageId);
        const toIdx = pageGhostIndex;
        if (fromIdx !== toIdx && fromIdx + 1 !== toIdx) {
          const ids = sectionPages.map(p => p.id);
          const [removed] = ids.splice(fromIdx, 1);
          const insertAt = fromIdx < toIdx ? toIdx - 1 : toIdx;
          ids.splice(Math.max(0, Math.min(insertAt, ids.length)), 0, removed);
          await reorderPages(siteId, ids);
          await loadPages();
        }
      } else {
        const targetSectionPages = pages.filter(p => (p.section || null) === normTarget);
        const ids = targetSectionPages.map(p => p.id);
        ids.splice(Math.max(0, Math.min(pageGhostIndex, ids.length)), 0, draggingPageId);
        await patchPage(siteId, draggingPageId, { section: sectionId ?? '' });
        await reorderPages(siteId, ids);
        await loadPages();
      }
    } catch { addToast('Failed to move page', 'error'); }
    cleanupPageDrag();
  };

  // ── Drag-to-section (collapsed sections / section header) ─

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
    cleanupPageDrag();
  };

  // ── Section reordering ───────────────────────────────────

  const moveSectionUp = async (idx) => {
    if (idx === 0) return;
    const newSections = [...settings.sections];
    [newSections[idx - 1], newSections[idx]] = [newSections[idx], newSections[idx - 1]];
    const newSettings = { ...settings, sections: newSections };
    try { await updateSiteSettings(siteId, newSettings); setSettings(newSettings); }
    catch { addToast('Failed to reorder sections', 'error'); }
  };

  const moveSectionDown = async (idx) => {
    if (idx >= settings.sections.length - 1) return;
    const newSections = [...settings.sections];
    [newSections[idx], newSections[idx + 1]] = [newSections[idx + 1], newSections[idx]];
    const newSettings = { ...settings, sections: newSections };
    try { await updateSiteSettings(siteId, newSettings); setSettings(newSettings); }
    catch { addToast('Failed to reorder sections', 'error'); }
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
          cmsSettings={cmsSettings}
          onUpdateCmsSettings={async (data) => {
            const updated = await updateCmsSettings(data);
            setCmsSettings(updated);
          }}
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

  const renderPageItem = (page) => (
    <div
      key={page.id}
      className={`page-list-item ${selectedId === page.id && view === 'pages' ? 'active' : ''} ${draggingPageId === page.id ? 'dragging' : ''}`}
      onClick={() => selectPage(page.id)}
      draggable
      onDragStart={e => onPageDragStart(e, page.id)}
      onDragEnd={onPageDragEnd}
    >
      <span className="page-list-item-icon">{page.icon || '📄'}</span>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div className="page-list-item-title">{page.title || 'Untitled'}</div>
        <div className="page-list-item-slug">/{page.slug}</div>
      </div>
      <div className="page-list-actions">
        <button className="page-list-item-action" onClick={e => handleDuplicate(e, page.id)} title="Duplicate">⧉</button>
        <button className="page-list-item-delete" onClick={e => handleDelete(e, page.id)} title="Delete">✕</button>
      </div>
    </div>
  );

  // Helper for rendering a page list with ghost placeholder
  const renderPageListWithGhost = (pagesInSection, sectionId) => {
    const normSection = sectionId ?? null;
    const draggingPage = draggingPageId ? pages.find(p => p.id === draggingPageId) : null;
    const ghostLabel = draggingPage?.title || 'Page';
    const draggingPageSectionId = draggingPage ? (draggingPage.section || null) : null;
    const showGhostAt = (idx) => {
      if (pageGhostSectionId === undefined || pageGhostSectionId !== normSection || pageGhostIndex !== idx || !draggingPageId) return false;
      // Hide ghost at no-op position when reordering within same section
      if (draggingPageSectionId === normSection) {
        const fromIdx = pagesInSection.findIndex(p => p.id === draggingPageId);
        if (idx === fromIdx || idx === fromIdx + 1) return false;
      }
      return true;
    };
    return (
      <>
        {pagesInSection.map((page, idx) => (
          <React.Fragment key={page.id}>
            {showGhostAt(idx) && <div className="page-ghost">{ghostLabel}</div>}
            {renderPageItem(page)}
          </React.Fragment>
        ))}
        {showGhostAt(pagesInSection.length) && <div className="page-ghost">{ghostLabel}</div>}
      </>
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
          <span className="page-list-item-icon">📄</span>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div className="page-list-item-title">Home</div>
            <div className="page-list-item-slug">/</div>
          </div>
        </div>

        <div className="page-list">
          {filteredPages.length === 0 && (
            <p style={{ padding: '8px 4px', fontSize: '12px', color: 'var(--text-muted)' }}>
              {search ? 'No pages match.' : sections.length === 0 ? 'No section yet.' : 'No pages yet.'}
            </p>
          )}

          {sections.map((section, sectionIdx) => {
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
                  <div className="sidebar-section-move-btns">
                    <button
                      className="sidebar-section-move-btn"
                      onClick={() => moveSectionUp(sectionIdx)}
                      disabled={sectionIdx === 0}
                      title="Move section up"
                    >↑</button>
                    <button
                      className="sidebar-section-move-btn"
                      onClick={() => moveSectionDown(sectionIdx)}
                      disabled={sectionIdx === sections.length - 1}
                      title="Move section down"
                    >↓</button>
                  </div>
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
                  <div
                    className="sidebar-section-pages"
                    onDragOver={e => onPageListDragOver(e, section.id)}
                    onDrop={e => onPageListDrop(e, section.id)}
                  >
                    {sectionPages.length === 0 ? (
                      <div className={`sidebar-section-empty${isDragOver ? ' drag-hint' : ''}`}>
                        {isDragOver ? 'Drop here' : 'No pages yet.'}
                      </div>
                    ) : (
                      renderPageListWithGhost(sectionPages, section.id)
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
            <div
              className={sections.length > 0 ? 'sidebar-section-pages' : ''}
              onDragOver={e => onPageListDragOver(e, null)}
              onDrop={e => onPageListDrop(e, null)}
            >
              {renderPageListWithGhost(unsectionedPages, null)}
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
              onClick={() => setShowDeployPicker(true)}
            >
              ⬆ Deploy
            </button>
          </div>
          {cmsSettings.baseUrl && (
            <a
              href={`${cmsSettings.baseUrl}/${selectedSite.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className={selectedSite.deployed ? 'site-deployed-url' : 'site-not-deployed'}
              style={{ display: 'block', marginTop: 6, fontSize: 11, wordBreak: 'break-all' }}
            >
              {cmsSettings.baseUrl}/{selectedSite.slug}
            </a>
          )}
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

      {showDeployPicker && (
        <div className="modal-overlay" onClick={() => setShowDeployPicker(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 6 }}>Deploy site</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
              Choose a deployment target for <strong>{selectedSite.name}</strong>.
            </p>
            <div className="deploy-picker-options">
              <button className="deploy-picker-option" onClick={openGithubPanel}>
                <span className="deploy-picker-icon">⎇</span>
                <span className="deploy-picker-label">GitHub Pages</span>
                <span className="deploy-picker-desc">Copy to docs/ folder for GitHub Pages</span>
                {selectedSite.deployedGithubPages && <span className="deploy-picker-badge">Deployed</span>}
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowDeployPicker(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showGithubPanel && (
        <div className="modal-overlay" onClick={() => setShowGithubPanel(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>

            {githubView === 'main' && (<>
              <h3 style={{ marginBottom: 16 }}>GitHub Pages</h3>
              <div className="nginx-panel-site">
                <div className="nginx-panel-site-name">{selectedSite.name}</div>
                <div className="nginx-panel-site-status">
                  {selectedSite.deployedGithubPages
                    ? <span className="nginx-panel-deployed">Deployed</span>
                    : <span className="nginx-panel-undeployed">Not deployed</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn btn-success btn-sm" onClick={() => setGithubView('confirm-deploy')}>
                  ⬆ Deploy
                </button>
                {selectedSite.deployedGithubPages && (
                  <button className="btn btn-danger btn-sm" onClick={() => { setUndeployInput(''); setGithubView('confirm-undeploy'); }}>
                    ⬇ Undeploy
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowGithubPanel(false)}>Close</button>
              </div>
            </>)}

            {githubView === 'confirm-deploy' && (<>
              <h3 style={{ marginBottom: 8 }}>Deploy to GitHub Pages?</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 12 }}>
                This will build <strong>{selectedSite.name}</strong> and copy it to <code>docs/{selectedSite.slug}/</code>.
              </p>
              <input
                type="text"
                className="input"
                placeholder={`Deploy ${selectedSite.slug} to GitHub Pages`}
                value={githubCommitMsg}
                onChange={e => setGithubCommitMsg(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !deploying) handleDeployGithub(); if (e.key === 'Escape') setGithubView('main'); }}
                disabled={deploying}
                autoFocus
                autoComplete="off"
                style={{ width: '100%', marginBottom: 16 }}
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setGithubView('main')} disabled={deploying}>Back</button>
                <button className="btn btn-success btn-sm" onClick={handleDeployGithub} disabled={deploying}>
                  {deploying ? 'Deploying…' : 'Deploy'}
                </button>
              </div>
            </>)}

            {githubView === 'confirm-undeploy' && (<>
              <h3 style={{ marginBottom: 8 }}>Undeploy from GitHub Pages?</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                This will <strong>delete</strong> <code>docs/{selectedSite.slug}/</code>.
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 12 }}>
                Type <strong>{selectedSite.name}</strong> to confirm.
              </p>
              <input
                className="site-dialog-input"
                type="text"
                value={undeployInput}
                onChange={e => setUndeployInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && undeployInput === selectedSite.name) handleUndeployGithub(); if (e.key === 'Escape') setGithubView('main'); }}
                placeholder={selectedSite.name}
                autoFocus
                autoComplete="off"
                style={{ marginBottom: 16 }}
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setGithubView('main')} disabled={undeploying}>Back</button>
                <button className="btn btn-danger btn-sm" onClick={handleUndeployGithub} disabled={undeploying || undeployInput !== selectedSite.name}>
                  {undeploying ? 'Undeploying…' : 'Undeploy'}
                </button>
              </div>
            </>)}

          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deletePageDialog}
        title="Delete page?"
        message={deletePageDialog ? `"${deletePageDialog.title}" will be permanently deleted.` : ''}
        confirmLabel="Delete"
        onConfirm={confirmDeletePage}
        onCancel={() => setDeletePageDialog(null)}
      />

      <Toast toasts={toasts} />
    </div>
  );
}
