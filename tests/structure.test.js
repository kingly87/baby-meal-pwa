import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';

const requiredFiles = [
  'index.html',
  'manifest.webmanifest',
  'service-worker.js',
  'assets/styles/app.css',
  'assets/icons/icon.svg',
  'src/app.js',
  'data/recipes.js'
];

test('application shell contains every required file', async () => {
  await Promise.all(requiredFiles.map((file) => access(file)));
});

test('HTML ids are unique and exposes five navigation roots', async () => {
  const html = await readFile('index.html', 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ['view-today', 'view-meals', 'view-records', 'view-growth', 'view-settings']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});

