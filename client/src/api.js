const BASE = '/api';

// Parse a failed response: use the server's error message if available.
async function apiError(res, fallback) {
  try {
    const body = await res.json();
    if (body?.error) throw new Error(body.error);
  } catch (e) {
    if (e instanceof SyntaxError) throw new Error(fallback);
    throw e;
  }
  throw new Error(fallback);
}

// ── CMS Settings ─────────────────────────────────────────

export async function getCmsSettings() {
  const res = await fetch(`${BASE}/cms-settings`);
  if (!res.ok) await apiError(res, 'Failed to fetch CMS settings');
  return res.json();
}

export async function updateCmsSettings(data) {
  const res = await fetch(`${BASE}/cms-settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) await apiError(res, 'Failed to update CMS settings');
  return res.json();
}

// ── Sites ────────────────────────────────────────────────

export async function getSites() {
  const res = await fetch(`${BASE}/sites`);
  if (!res.ok) await apiError(res, 'Failed to fetch sites');
  return res.json();
}

export async function createSite(name) {
  const res = await fetch(`${BASE}/sites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) await apiError(res, 'Failed to create site');
  return res.json();
}

export async function renameSite(siteId, name) {
  const res = await fetch(`${BASE}/sites/${siteId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) await apiError(res, 'Failed to rename site');
  return res.json();
}

export async function deleteSite(siteId) {
  const res = await fetch(`${BASE}/sites/${siteId}`, { method: 'DELETE' });
  if (!res.ok) await apiError(res, 'Failed to delete site');
  return res.json();
}

export async function deployGithubPages(siteId, commitMessage = null) {
  const res = await fetch(`${BASE}/sites/${siteId}/generate/github-pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ commitMessage }),
  });
  if (!res.ok) await apiError(res, 'GitHub Pages deployment failed');
  return res.json();
}

export async function undeployGithubPages(siteId) {
  const res = await fetch(`${BASE}/sites/${siteId}/deploy/github-pages`, { method: 'DELETE' });
  if (!res.ok) await apiError(res, 'Failed to undeploy from GitHub Pages');
  return res.json();
}

// ── Pages ────────────────────────────────────────────────

export async function getPages(siteId) {
  const res = await fetch(`${BASE}/sites/${siteId}/pages`);
  if (!res.ok) await apiError(res, 'Failed to fetch pages');
  return res.json();
}

export async function getPage(siteId, id) {
  const res = await fetch(`${BASE}/sites/${siteId}/pages/${id}`);
  if (!res.ok) await apiError(res, 'Failed to fetch page');
  return res.json();
}

export async function createPage(siteId, data) {
  const res = await fetch(`${BASE}/sites/${siteId}/pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) await apiError(res, 'Failed to create page');
  return res.json();
}

export async function updatePage(siteId, id, data) {
  const res = await fetch(`${BASE}/sites/${siteId}/pages/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) await apiError(res, 'Failed to update page');
  return res.json();
}

export async function patchPage(siteId, id, changes) {
  const res = await fetch(`${BASE}/sites/${siteId}/pages/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes),
  });
  if (!res.ok) await apiError(res, 'Failed to update page');
  return res.json();
}

export async function duplicatePage(siteId, id) {
  const res = await fetch(`${BASE}/sites/${siteId}/pages/${id}/duplicate`, { method: 'POST' });
  if (!res.ok) await apiError(res, 'Failed to duplicate page');
  return res.json();
}

export async function deletePage(siteId, id) {
  const res = await fetch(`${BASE}/sites/${siteId}/pages/${id}`, { method: 'DELETE' });
  if (!res.ok) await apiError(res, 'Failed to delete page');
  return res.json();
}

export async function reorderPages(siteId, ids) {
  const res = await fetch(`${BASE}/sites/${siteId}/pages/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) await apiError(res, 'Failed to reorder pages');
  return res.json();
}

export async function getAssets(siteId) {
  const res = await fetch(`${BASE}/sites/${siteId}/assets`);
  if (!res.ok) await apiError(res, 'Failed to fetch assets');
  return res.json();
}

export async function deleteAsset(siteId, filename) {
  const res = await fetch(`${BASE}/sites/${siteId}/assets/${encodeURIComponent(filename)}`, { method: 'DELETE' });
  if (!res.ok) await apiError(res, 'Failed to delete asset');
  return res.json();
}

export async function uploadAsset(siteId, file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/sites/${siteId}/assets/upload`, { method: 'POST', body: form });
  if (!res.ok) await apiError(res, 'Upload failed');
  return res.json();
}

export async function generateSite(siteId) {
  const res = await fetch(`${BASE}/sites/${siteId}/generate`, { method: 'POST' });
  if (!res.ok) await apiError(res, 'Generation failed');
  return res.json();
}

export async function previewPage(siteId, page) {
  const res = await fetch(`${BASE}/sites/${siteId}/generate/preview-page`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page }),
  });
  if (!res.ok) throw new Error('Preview failed');
  return res.text();
}

export async function getSiteSettings(siteId) {
  const res = await fetch(`${BASE}/sites/${siteId}/settings`);
  if (!res.ok) await apiError(res, 'Failed to fetch settings');
  return res.json();
}

export async function updateSiteSettings(siteId, data) {
  const res = await fetch(`${BASE}/sites/${siteId}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) await apiError(res, 'Failed to save settings');
  return res.json();
}
