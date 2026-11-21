/* Tiny IndexedDB key/value store with localStorage fallback */
PZ.store = (function(){
  let dbp = null;
  function db(){
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      try {
        const r = indexedDB.open('inkfold', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      } catch (e) { rej(e); }
    });
    return dbp;
  }
  async function tx(mode, fn){
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction('kv', mode), s = t.objectStore('kv');
      const r = fn(s);
      t.oncomplete = () => res(r && r.result);
      t.onerror = () => rej(t.error);
    });
  }
  const ls = {
    get: k => { try { return JSON.parse(localStorage.getItem('pz:' + k)); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem('pz:' + k, JSON.stringify(v)); } catch (e) {} },
    del: k => { try { localStorage.removeItem('pz:' + k); } catch (e) {} },
    keys: () => { try { return Object.keys(localStorage).filter(k => k.startsWith('pz:')).map(k => k.slice(3)); } catch (e) { return []; } }
  };
  return {
    async get(k){ try { return await tx('readonly', s => s.get(k)); } catch (e) { return ls.get(k); } },
    async set(k, v){ try { await tx('readwrite', s => s.put(v, k)); } catch (e) { ls.set(k, v); } },
    async del(k){ try { await tx('readwrite', s => s.delete(k)); } catch (e) { ls.del(k); } },
    async keys(){ try { return await tx('readonly', s => s.getAllKeys()); } catch (e) { return ls.keys(); } }
  };
})();
