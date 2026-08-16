import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access, readdir } from 'node:fs/promises';
import vm from 'node:vm';

async function javascriptFiles(directory) {
  const entries=await readdir(directory,{withFileTypes:true});
  const nested=await Promise.all(entries.map(entry=>entry.isDirectory()
    ? javascriptFiles(`${directory}/${entry.name}`)
    : entry.name.endsWith('.js') ? [`${directory}/${entry.name}`] : []));
  return nested.flat();
}

test('manifest identifies installable V1 with 192 and 512 icons', async () => {
  const manifest=JSON.parse(await readFile('manifest.webmanifest','utf8'));
  assert.equal(manifest.name,'宝宝成长助手 V1'); assert.equal(manifest.display,'standalone');
  assert.ok(manifest.icons.some(icon=>icon.sizes==='192x192')); assert.ok(manifest.icons.some(icon=>icon.sizes==='512x512'));
  await access('assets/icons/icon-192.svg'); await access('assets/icons/icon-512.svg');
});

test('service worker has safe caching, navigation fallback and controlled updates', async () => {
  const sw=await readFile('service-worker.js','utf8');
  assert.ok(sw.includes("const CACHE_NAME='baby-growth-v1-20260720-r30'"));
  for(const token of ['response.ok','request.mode === \'navigate\'','SKIP_WAITING','caches.delete','notificationclick','showNotification']) assert.ok(sw.includes(token),token);
  const appFiles=['./','./index.html','./assets/styles/app.css','./data/recipes.js','./data/stage4-recipes-v2.js','./data/stage4-recipes-v2-rows.js','./src/app.js','./src/features/growth/latest-summary.js','./src/features/meals/actual-meal.js','./src/features/meals/recipe-details.js','./src/features/migration/v2.js','./src/ui/daily-trends.js','./manifest.webmanifest'];
  for(const file of appFiles) assert.ok(sw.includes(JSON.stringify(file)),file);
  for(const file of await javascriptFiles('src')) assert.ok(sw.includes(JSON.stringify(`./${file}`)),`missing offline cache entry: ${file}`);
});

test('service worker activation deletes only obsolete caches owned by this application', async () => {
  const listeners={};
  const deleted=[];
  const self={
    addEventListener(type,listener){listeners[type]=listener},
    clients:{claim:async()=>{}},
    location:{origin:'https://example.test'}
  };
  const caches={
    keys:async()=>['baby-growth-v1-20260720-r29','baby-growth-v1-20260720-r30','other-app-cache'],
    delete:async key=>{deleted.push(key); return true}
  };
  vm.runInNewContext(await readFile('service-worker.js','utf8'),{self,caches,URL});
  let activation;
  listeners.activate({waitUntil(promise){activation=promise}});
  await activation;
  assert.deepEqual(deleted,['baby-growth-v1-20260720-r29']);
});

test('service worker reads only the current application cache', async () => {
  const listeners={};
  const matched=[];
  let globalReads=0;
  const activeFallback={source:'active-cache'};
  const networkResponse={ok:true,clone(){return this},source:'network'};
  const activeCache={
    match:async request=>{matched.push(request); return request==='./index.html'?activeFallback:undefined},
    put:async()=>{}
  };
  const self={
    addEventListener(type,listener){listeners[type]=listener},
    clients:{},location:{origin:'https://example.test'}
  };
  const caches={
    open:async name=>{assert.equal(name,'baby-growth-v1-20260720-r30'); return activeCache},
    match:async()=>{globalReads++; return {source:'other-cache'}}
  };
  const fetch=async request=>{if(request.mode==='navigate')throw new Error('offline'); return networkResponse};
  vm.runInNewContext(await readFile('service-worker.js','utf8'),{self,caches,fetch,URL});
  const request=mode=>({method:'GET',mode,url:`https://example.test/${mode}`});
  const runFetch=req=>new Promise((resolve,reject)=>listeners.fetch({request:req,respondWith(promise){promise.then(resolve,reject)}}));
  assert.equal(await runFetch(request('cors')),networkResponse);
  assert.equal(await runFetch(request('navigate')),activeFallback);
  assert.equal(globalReads,0);
  assert.equal(matched.length,2);
});

test('application asks before activating a waiting service worker update', async () => {
  const app=await readFile('src/app.js','utf8');
  for(const token of ['registration.waiting','updatefound','controllerchange','SKIP_WAITING']) assert.ok(app.includes(token),token);
});
