// src/utils/GameSettings.js
export const GameSettings = (() => {
  const store = window.localStorage;
  const listeners = new Map(); // key -> Set<fn>

  function _call(key, val) {
    const set = listeners.get(key);
    if (set) for (const fn of set) try { fn(val, key); } catch (e) { console.error(e); }
  }

  return {
    get(key, defVal) {
      const raw = store.getItem(key);
      if (raw === null) return defVal;
      if (raw === 'true' || raw === 'false') return raw === 'true';
      const n = Number(raw);
      return Number.isNaN(n) ? raw : n;
    },
    set(key, val) {
      store.setItem(key, String(val));
      _call(key, val);
    },
    on(key, fn) {
      if (!listeners.has(key)) listeners.set(key, new Set());
      listeners.get(key).add(fn);
      return () => listeners.get(key)?.delete(fn);
    },
    off(key, fn) {
      listeners.get(key)?.delete(fn);
    }
  };
})();
