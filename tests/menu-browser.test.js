import test from 'node:test';
import assert from 'node:assert/strict';
import { createMenuBrowser } from '../src/features/meals/menu-browser.js';

test('menu browser isolates history editing and resets it when selection changes',()=>{
  const browser=createMenuBrowser();
  assert.deepEqual(browser.value(),{mode:'current',selectedId:null,editingHistory:false});
  browser.showHistory('old-1');
  browser.editHistory();
  assert.deepEqual(browser.value(),{mode:'history',selectedId:'old-1',editingHistory:true});
  browser.selectHistory('old-2');
  assert.deepEqual(browser.value(),{mode:'history',selectedId:'old-2',editingHistory:false});
  browser.reset();
  assert.deepEqual(browser.value(),{mode:'current',selectedId:null,editingHistory:false});
});

test('menu browser falls back to current when selected history no longer exists',()=>{
  const browser=createMenuBrowser();
  browser.showHistory('missing');
  browser.reconcile([{id:'other'}]);
  assert.deepEqual(browser.value(),{mode:'current',selectedId:null,editingHistory:false});
});
