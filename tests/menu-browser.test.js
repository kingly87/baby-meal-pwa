import test from 'node:test';
import assert from 'node:assert/strict';
import { createMenuBrowser, historyMenus } from '../src/features/meals/menu-browser.js';

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

test('history excludes every duplicate record from the current natural week',()=>{
  const menus=[
    {id:'current',babyId:'b1',startDate:'2026-08-10'},
    {id:'duplicate',babyId:'b1',startDate:'2026-08-12'},
    {id:'old',babyId:'b1',startDate:'2026-08-03'},
    {id:'other-baby',babyId:'b2',startDate:'2026-08-12'}
  ];
  assert.deepEqual(historyMenus(menus,{babyId:'b1',date:'2026-08-15'}).map(menu=>menu.id),['old']);
});
