const BASE = '/api';

// ── CMS Settings ─────────────────────────────────────────

export async function getCmsSettings() {
  const res = await fetch(`${BASE}/cms-settings`);
  if (!res.ok) throw new Error('Failed to fetch CMS settings');
  return res.json();
}

export async function updateCmsSettings(data) {
  const res = await fetch(`${BASE}/cms-settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update CMS settings');
  return res.json();
}

// ── Nginx ─────────────────────────────────────────────────

export async function getNginxStatus() {
  const res = await fetch(`${BASE}/nginx/status`);
  if (!res.ok) throw new Error('Failed to fetch nginx status');
  return res.json();
}


// ── Sites ────────────────────────────────────────────────

export async function getSites() {
  const res = await fetch(`${BASE}/sites`);
  if (!res.ok) throw new Error('Failed to fetch sites');
  return res.json();
}

export async function createSite(name) {
  const res = await fetch(`${BASE}/sites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to create site');
  return res.json();
}

export async function renameSite(siteId, name) {
  const res = await fetch(`${BASE}/sites/${siteId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to rename site');
  return res.json();
}

export async function deleteSite(siteId) {
  const res = await fetch(`${BASE}/sites/${siteId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete site');
  return res.json();
}

export async function undeploySite(siteId) {
  const res = await fetch(`${BASE}/sites/${siteId}/deploy`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to undeploy site');
  return res.json();
}

// ── Pages ────────────────────────────────────────────────

export async function getPages(siteId) {
  const res = await fetch(`${BASE}/sites/${siteId}/pages`);
  if (!res.ok) throw new Error('Failed to fetch pages');
  return res.json();
}

export async function getPage(siteId, id) {
  const res = await fetch(`${BASE}/sites/${siteId}/pages/${id}`);
  if (!res.ok) throw new Error('Failed to fetch page');
  return res.json();
}

export async function createPage(siteId, data) {
  const res = await fetch(`${BASE}/sites/${siteId}/pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create page');
  return res.json();
}

export async function updatePage(siteId, id, data) {
  const res = await fetch(`${BASE}/sites/${siteId}/pages/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update page');
  return res.json();
}

export async function patchPage(siteId, id, changes) {
  const res = await fetch(`${BASE}/sites/${siteId}/pages/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes),
  });
  if (!res.ok) throw new Error('Patch failed');
  return res.json();
}

export async function duplicatePage(siteId, id) {
  const res = await fetch(`${BASE}/sites/${siteId}/pages/${id}/duplicate`, { method: 'POST' });
  if (!res.ok) throw new Error('Duplicate failed');
  return res.json();
}

export async function deletePage(siteId, id) {
  const res = await fetch(`${BASE}/sites/${siteId}/pages/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete page');
  return res.json();
}

export async function reorderPages(siteId, ids) {
  const res = await fetch(`${BASE}/sites/${siteId}/pages/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error('Failed to reorder pages');
  return res.json();
}

export async function getAssets(siteId) {
  const res = await fetch(`${BASE}/sites/${siteId}/assets`);
  if (!res.ok) throw new Error('Failed to fetch assets');
  return res.json();
}

export async function deleteAsset(siteId, filename) {
  const res = await fetch(`${BASE}/sites/${siteId}/assets/${encodeURIComponent(filename)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete asset');
  return res.json();
}

export async function uploadAsset(siteId, file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/sites/${siteId}/assets/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

export async function generateSite(siteId) {
  const res = await fetch(`${BASE}/sites/${siteId}/generate`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Generation failed');
  }
  return res.json();
}

export async function getSiteSettings(siteId) {
  const res = await fetch(`${BASE}/sites/${siteId}/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function updateSiteSettings(siteId, data) {
  const res = await fetch(`${BASE}/sites/${siteId}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to save settings');
  return res.json();
}
