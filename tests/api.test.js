'use strict';

// Set the data dir BEFORE requiring anything from the server,
// so paths.js and storage.js pick it up at module initialisation time.
const { mkdirSync, rmSync, existsSync } = require('fs');
const { join } = require('path');
const { tmpdir } = require('os');

const TEST_DATA_DIR = join(tmpdir(), `lcms-test-${process.pid}`);
process.env.LCMS_DATA_DIR = TEST_DATA_DIR;

const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../server/app');

// ── Helpers ───────────────────────────────────────────────

/** Create a site via the API and return the site object. */
async function createSite(name = 'Test Site') {
  const res = await request(app).post('/api/sites').send({ name });
  assert.equal(res.status, 200);
  return res.body;
}

/** Create a page in a site and return the page object. */
async function createPage(siteId, data = {}) {
  const res = await request(app)
    .post(`/api/sites/${siteId}/pages`)
    .send({ title: 'Test Page', slug: 'test-page', ...data });
  assert.equal(res.status, 200);
  return res.body;
}

/** Delete all sites between tests for isolation. */
async function cleanupSites() {
  const res = await request(app).get('/api/sites');
  if (res.status !== 200) return;
  for (const site of res.body) {
    await request(app).delete(`/api/sites/${site.id}`);
  }
}

// ── Suite setup ───────────────────────────────────────────

before(() => {
  mkdirSync(TEST_DATA_DIR, { recursive: true });
});

after(() => {
  rmSync(TEST_DATA_DIR, { recursive: true, force: true });
});

// ── CMS Settings ──────────────────────────────────────────

describe('GET /api/cms-settings', () => {
  test('returns default settings when no file exists', async () => {
    const res = await request(app).get('/api/cms-settings');
    assert.equal(res.status, 200);
    assert.equal(typeof res.body.baseUrl, 'string');
  });
});

describe('PUT /api/cms-settings', () => {
  test('stores and returns updated baseUrl', async () => {
    const res = await request(app)
      .put('/api/cms-settings')
      .send({ baseUrl: 'https://example.com' });
    assert.equal(res.status, 200);
    assert.equal(res.body.baseUrl, 'https://example.com');
  });

  test('strips trailing slash from baseUrl', async () => {
    const res = await request(app)
      .put('/api/cms-settings')
      .send({ baseUrl: 'https://example.com/' });
    assert.equal(res.status, 200);
    assert.equal(res.body.baseUrl, 'https://example.com');
  });

  test('persists across subsequent GETs', async () => {
    await request(app).put('/api/cms-settings').send({ baseUrl: 'https://persistent.example' });
    const res = await request(app).get('/api/cms-settings');
    assert.equal(res.body.baseUrl, 'https://persistent.example');
  });
});

// ── Sites ─────────────────────────────────────────────────

describe('GET /api/sites', () => {
  beforeEach(cleanupSites);

  test('returns empty array when no sites exist', async () => {
    const res = await request(app).get('/api/sites');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, []);
  });

  test('returns created sites', async () => {
    await createSite('Alpha');
    await createSite('Beta');
    const res = await request(app).get('/api/sites');
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 2);
  });

  test('each site has a deployedGithubPages flag', async () => {
    await createSite('Deploy Check');
    const res = await request(app).get('/api/sites');
    const site = res.body[0];
    assert.equal(typeof site.deployedGithubPages, 'boolean');
  });
});

describe('POST /api/sites', () => {
  beforeEach(cleanupSites);

  test('creates a site and returns it with id, name, slug', async () => {
    const res = await request(app).post('/api/sites').send({ name: 'My Site' });
    assert.equal(res.status, 200);
    assert.equal(res.body.name, 'My Site');
    assert.equal(res.body.slug, 'my-site');
    assert.ok(res.body.id, 'should have an id');
  });

  test('uses default name when name is missing', async () => {
    const res = await request(app).post('/api/sites').send({});
    assert.equal(res.status, 200);
    assert.ok(res.body.name);
  });
});

describe('PATCH /api/sites/:siteId', () => {
  beforeEach(cleanupSites);

  test('renames a site and updates its slug', async () => {
    const site = await createSite('Old Name');
    const res = await request(app)
      .patch(`/api/sites/${site.id}`)
      .send({ name: 'New Name' });
    assert.equal(res.status, 200);
    assert.equal(res.body.name, 'New Name');
    assert.equal(res.body.slug, 'new-name');
  });

  test('returns 404 for unknown site', async () => {
    const fakeId = '00000000-0000-4000-8000-000000000000';
    const res = await request(app).patch(`/api/sites/${fakeId}`).send({ name: 'x' });
    assert.equal(res.status, 404);
  });

  test('returns 400 for invalid UUID', async () => {
    const res = await request(app).patch('/api/sites/not-a-uuid').send({ name: 'x' });
    assert.equal(res.status, 400);
  });
});

describe('DELETE /api/sites/:siteId', () => {
  beforeEach(cleanupSites);

  test('deletes an existing site', async () => {
    const site = await createSite('To Delete');
    const del = await request(app).delete(`/api/sites/${site.id}`);
    assert.equal(del.status, 200);
    assert.equal(del.body.success, true);

    const list = await request(app).get('/api/sites');
    assert.equal(list.body.length, 0);
  });

  test('returns 404 for non-existent site', async () => {
    const fakeId = '00000000-0000-4000-8000-000000000001';
    const res = await request(app).delete(`/api/sites/${fakeId}`);
    assert.equal(res.status, 404);
  });
});

// ── Site Settings ─────────────────────────────────────────

describe('GET /api/sites/:siteId/settings', () => {
  beforeEach(cleanupSites);

  test('returns default settings for a new site', async () => {
    const site = await createSite('Settings Test');
    const res = await request(app).get(`/api/sites/${site.id}/settings`);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.navPages));
    assert.ok(Array.isArray(res.body.sections));
  });
});

describe('PUT /api/sites/:siteId/settings', () => {
  beforeEach(cleanupSites);

  test('saves and returns settings', async () => {
    const site = await createSite('Settings Save');
    const res = await request(app)
      .put(`/api/sites/${site.id}/settings`)
      .send({ title: 'Custom Title', navPages: [], sections: [], theme: {} });
    assert.equal(res.status, 200);
    assert.equal(res.body.title, 'Custom Title');
  });

  test('returns 404 for unknown site', async () => {
    const fakeId = '00000000-0000-4000-8000-000000000002';
    const res = await request(app)
      .put(`/api/sites/${fakeId}/settings`)
      .send({ title: 'x' });
    assert.equal(res.status, 404);
  });
});

// ── Pages ─────────────────────────────────────────────────

describe('GET /api/sites/:siteId/pages', () => {
  beforeEach(cleanupSites);

  test('returns empty array for new site', async () => {
    const site = await createSite('Pages Test');
    const res = await request(app).get(`/api/sites/${site.id}/pages`);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, []);
  });

  test('returns 404 for unknown site', async () => {
    const fakeId = '00000000-0000-4000-8000-000000000003';
    const res = await request(app).get(`/api/sites/${fakeId}/pages`);
    assert.equal(res.status, 404);
  });
});

describe('POST /api/sites/:siteId/pages', () => {
  beforeEach(cleanupSites);

  test('creates a page with correct fields', async () => {
    const site = await createSite('Page Create');
    const res = await request(app)
      .post(`/api/sites/${site.id}/pages`)
      .send({ title: 'Intro', slug: 'intro' });
    assert.equal(res.status, 200);
    assert.equal(res.body.title, 'Intro');
    assert.equal(res.body.slug, 'intro');
    assert.ok(res.body.id);
    assert.ok(Array.isArray(res.body.blocks));
  });

  test('rejects a reserved slug', async () => {
    const site = await createSite('Reserved Slug');
    const res = await request(app)
      .post(`/api/sites/${site.id}/pages`)
      .send({ title: 'API', slug: 'api' });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  test('rejects duplicate slugs', async () => {
    const site = await createSite('Dup Slug');
    await createPage(site.id, { slug: 'hello' });
    const res = await request(app)
      .post(`/api/sites/${site.id}/pages`)
      .send({ title: 'Hello 2', slug: 'hello' });
    assert.equal(res.status, 409);
  });
});

describe('GET /api/sites/:siteId/pages/:id', () => {
  beforeEach(cleanupSites);

  test('returns the page by id', async () => {
    const site = await createSite('Get Page');
    const page = await createPage(site.id, { title: 'Detail', slug: 'detail' });
    const res = await request(app).get(`/api/sites/${site.id}/pages/${page.id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.id, page.id);
    assert.equal(res.body.title, 'Detail');
  });

  test('returns 404 for unknown page', async () => {
    const site = await createSite('Get Page 404');
    const fakeId = '00000000-0000-4000-8000-000000000004';
    const res = await request(app).get(`/api/sites/${site.id}/pages/${fakeId}`);
    assert.equal(res.status, 404);
  });
});

describe('PUT /api/sites/:siteId/pages/:id', () => {
  beforeEach(cleanupSites);

  test('updates page title and returns updated page', async () => {
    const site = await createSite('Update Page');
    const page = await createPage(site.id, { title: 'Original', slug: 'original' });
    const res = await request(app)
      .put(`/api/sites/${site.id}/pages/${page.id}`)
      .send({ title: 'Updated', slug: 'original' });
    assert.equal(res.status, 200);
    assert.equal(res.body.title, 'Updated');
    assert.equal(res.body.id, page.id);
  });

  test('rejects a reserved slug on update', async () => {
    const site = await createSite('Update Reserved');
    const page = await createPage(site.id, { slug: 'my-page' });
    const res = await request(app)
      .put(`/api/sites/${site.id}/pages/${page.id}`)
      .send({ title: 'x', slug: 'login' });
    assert.equal(res.status, 400);
  });

  test('rejects duplicate slug (other page)', async () => {
    const site = await createSite('Dup Slug Update');
    await createPage(site.id, { title: 'First', slug: 'first' });
    const second = await createPage(site.id, { title: 'Second', slug: 'second' });
    const res = await request(app)
      .put(`/api/sites/${site.id}/pages/${second.id}`)
      .send({ title: 'Second', slug: 'first' });
    assert.equal(res.status, 409);
  });
});

describe('POST /api/sites/:siteId/pages/:id/duplicate', () => {
  beforeEach(cleanupSites);

  test('creates a copy with a new id and modified title/slug', async () => {
    const site = await createSite('Dup Page');
    const page = await createPage(site.id, { title: 'Original', slug: 'original' });
    const res = await request(app)
      .post(`/api/sites/${site.id}/pages/${page.id}/duplicate`);
    assert.equal(res.status, 200);
    assert.notEqual(res.body.id, page.id);
    assert.ok(res.body.title.includes('copy'));
    assert.ok(res.body.slug.includes('copy'));
  });
});

describe('DELETE /api/sites/:siteId/pages/:id', () => {
  beforeEach(cleanupSites);

  test('deletes a page', async () => {
    const site = await createSite('Del Page');
    const page = await createPage(site.id, { slug: 'del-me' });
    const del = await request(app).delete(`/api/sites/${site.id}/pages/${page.id}`);
    assert.equal(del.status, 200);
    assert.equal(del.body.success, true);

    const res = await request(app).get(`/api/sites/${site.id}/pages/${page.id}`);
    assert.equal(res.status, 404);
  });

  test('returns 404 for unknown page', async () => {
    const site = await createSite('Del Page 404');
    const fakeId = '00000000-0000-4000-8000-000000000005';
    const res = await request(app).delete(`/api/sites/${site.id}/pages/${fakeId}`);
    assert.equal(res.status, 404);
  });
});

describe('POST /api/sites/:siteId/pages/reorder', () => {
  beforeEach(cleanupSites);

  test('reorders pages successfully', async () => {
    const site = await createSite('Reorder');
    const p1 = await createPage(site.id, { title: 'First', slug: 'first' });
    const p2 = await createPage(site.id, { title: 'Second', slug: 'second' });
    const res = await request(app)
      .post(`/api/sites/${site.id}/pages/reorder`)
      .send({ ids: [p2.id, p1.id] });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const pages = await request(app).get(`/api/sites/${site.id}/pages`);
    assert.equal(pages.body[0].id, p2.id);
    assert.equal(pages.body[1].id, p1.id);
  });

  test('returns 400 when ids is not an array', async () => {
    const site = await createSite('Reorder Bad');
    const res = await request(app)
      .post(`/api/sites/${site.id}/pages/reorder`)
      .send({ ids: 'not-an-array' });
    assert.equal(res.status, 400);
  });

  test('returns 400 for non-UUID ids', async () => {
    const site = await createSite('Reorder UUID');
    const res = await request(app)
      .post(`/api/sites/${site.id}/pages/reorder`)
      .send({ ids: ['../../etc/passwd'] });
    assert.equal(res.status, 400);
  });
});

// ── Generate (preview) ────────────────────────────────────────────────────────

// ── Undeploy routes (filesystem not present — should still respond) ──────────

describe('DELETE /api/sites/:siteId/deploy/github-pages', () => {
  beforeEach(cleanupSites);

  test('returns success even when directory does not exist', async () => {
    const site = await createSite('Undeploy GH');
    const res = await request(app).delete(`/api/sites/${site.id}/deploy/github-pages`);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });
});
