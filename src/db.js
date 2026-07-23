import { SCHEMA_VERSION, STORE_NAMES, assertStore } from './core/schema.js';

const clone = value => value === undefined ? undefined : structuredClone(value);

export class MemoryRepository {
  #stores;
  constructor(seed = {}) {
    this.#stores = new Map(STORE_NAMES.map(name => [name, new Map((seed[name] || []).map(item => [item.id, clone(item)]))]));
  }
  async put(store, value) { assertStore(store); if (!value?.id) throw new Error('记录缺少 id'); this.#stores.get(store).set(value.id, clone(value)); return clone(value); }
  async get(store, id) { assertStore(store); return clone(this.#stores.get(store).get(id)); }
  async list(store, query = {}) { assertStore(store); return [...this.#stores.get(store).values()].filter(item => !query.babyId || item.babyId === query.babyId).map(clone); }
  async delete(store, id) { assertStore(store); return this.#stores.get(store).delete(id); }
  async clear(store) { assertStore(store); this.#stores.get(store).clear(); }
  async clearAll() { for (const store of STORE_NAMES) this.#stores.get(store).clear(); }
  async transaction(_stores, callback) {
    const snapshot = new Map([...this.#stores].map(([name, records]) => [name, new Map([...records].map(([id, value]) => [id, clone(value)]))]));
    try { return await callback(this); } catch (error) { this.#stores = snapshot; throw error; }
  }
  async exportAll() { return Object.fromEntries(await Promise.all(STORE_NAMES.map(async name => [name, await this.list(name)]))); }
  async replaceAll(data) { return this.transaction(STORE_NAMES, async tx => { await tx.clearAll(); for (const name of STORE_NAMES) for (const item of data[name] || []) await tx.put(name, item); }); }
}

function requestResult(request) { return new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
function transactionDone(transaction) { return new Promise((resolve, reject) => { transaction.oncomplete = resolve; transaction.onerror = () => reject(transaction.error); transaction.onabort = () => reject(transaction.error || new Error('数据库事务已取消')); }); }

export class IndexedDbRepository {
  #name; #indexedDB; #dbPromise;
  constructor({ name = 'babyGrowthAssistantV1', indexedDB = globalThis.indexedDB } = {}) { this.#name = name; this.#indexedDB = indexedDB; }
  async open() {
    if (!this.#indexedDB) throw new Error('当前浏览器不支持本地数据库');
    if (!this.#dbPromise) this.#dbPromise = new Promise((resolve, reject) => {
      const request = this.#indexedDB.open(this.#name, SCHEMA_VERSION);
      request.onupgradeneeded = () => { for (const name of STORE_NAMES) if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name, { keyPath: 'id' }); };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return this.#dbPromise;
  }
  async put(store, value) { assertStore(store); if (!value?.id) throw new Error('记录缺少 id'); const db = await this.open(); const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).put(clone(value)); await transactionDone(tx); return clone(value); }
  async get(store, id) { assertStore(store); const db = await this.open(); return clone(await requestResult(db.transaction(store).objectStore(store).get(id))); }
  async list(store, query = {}) { assertStore(store); const db = await this.open(); const values = await requestResult(db.transaction(store).objectStore(store).getAll()); return values.filter(item => !query.babyId || item.babyId === query.babyId).map(clone); }
  async delete(store, id) { assertStore(store); const db = await this.open(); const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).delete(id); await transactionDone(tx); return true; }
  async clear(store) { assertStore(store); const db = await this.open(); const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).clear(); await transactionDone(tx); }
  async transaction(stores,callback){
    stores.forEach(assertStore);
    const db=await this.open(),transaction=db.transaction(stores,'readwrite'),done=transactionDone(transaction);
    const facade={
      put:async(store,value)=>{assertStore(store);if(!value?.id)throw new Error('记录缺少 id');await requestResult(transaction.objectStore(store).put(clone(value)));return clone(value)},
      get:async(store,id)=>{assertStore(store);return clone(await requestResult(transaction.objectStore(store).get(id)))},
      list:async(store,query={})=>{assertStore(store);const values=await requestResult(transaction.objectStore(store).getAll());return values.filter(item=>!query.babyId||item.babyId===query.babyId).map(clone)},
      delete:async(store,id)=>{assertStore(store);await requestResult(transaction.objectStore(store).delete(id));return true},
      clear:async store=>{assertStore(store);await requestResult(transaction.objectStore(store).clear())}
    };
    try{const result=await callback(facade);await done;return result}catch(error){try{transaction.abort()}catch{}await done.catch(()=>{});throw error}
  }
  async clearAll() { const db = await this.open(); const tx = db.transaction(STORE_NAMES, 'readwrite'); for (const store of STORE_NAMES) tx.objectStore(store).clear(); await transactionDone(tx); }
  async exportAll() { return Object.fromEntries(await Promise.all(STORE_NAMES.map(async name => [name, await this.list(name)]))); }
  async replaceAll(data) { const db = await this.open(); const tx = db.transaction(STORE_NAMES, 'readwrite'); for (const name of STORE_NAMES) { const store = tx.objectStore(name); store.clear(); for (const item of data[name] || []) store.put(clone(item)); } await transactionDone(tx); }
}
