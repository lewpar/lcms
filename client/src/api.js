const BASE = '/api';

export async function getPages() {
  const res = await fetch(`${BASE}/pages`);
  if (!res.ok) throw new Error('Failed to fetch pages');
  return res.json();
}

export async function getPage(id) {
  const res = await fetch(`${BASE}/pages/${id}`);
  if (!res.ok) throw new Error('Failed to fetch page');
  return res.json();
}

export async function createPage(data) {
  const res = await fetch(`${BASE}/pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create page');
  return res.json();
}

export async function updatePage(id, data) {
  const res = await fetch(`${BASE}/pages/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update page');
  return res.json();
}

export async function patchPage(id, changes) {
  const res = await fetch(`${BASE}/pages/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes),
  });
  if (!res.ok) throw new Error('Patch failed');
  return res.json();
}

export async function duplicatePage(id) {
  const res = await fetch(`${BASE}/pages/${id}/duplicate`, { method: 'POST' });
  if (!res.ok) throw new Error('Duplicate failed');
  return res.json();
}

export async function deletePage(id) {
  const res = await fetch(`${BASE}/pages/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete page');
  return res.json();
}

export async function uploadAsset(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

export async function generateSite() {
  const res = await fetch(`${BASE}/generate`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Generation failed');
  }
  return res.json();
}

export async function getSiteSettings() {
  const res = await fetch(`${BASE}/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function updateSiteSettings(data) {
  const res = await fetch(`${BASE}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to save settings');
  return res.json();
}
