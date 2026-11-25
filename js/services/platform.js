// Access to the claude.ai runtime capabilities. Every capability may be missing (a preview, a
// viewer without access, the page opened outside claude.ai), so each lookup resolves to null
// instead of failing, and callers design for that.
const cache = new Map();

export function capability(name, timeoutMs = 10000) {
  if (cache.has(name)) return cache.get(name);
  const p = (async () => {
    try {
      const c = typeof window !== 'undefined' ? window.claude : null;
      if (!c || typeof c.use !== 'function') return null;
      return await Promise.race([c.use(name), new Promise(res => setTimeout(() => res(null), timeoutMs))]);
    } catch (e) { return null; }
  })();
  cache.set(name, p);
  return p;
}

// Test hook: lets unit tests supply fake capabilities.
export function _setCapability(name, value) { cache.set(name, Promise.resolve(value)); }
export function _resetCapabilities() { cache.clear(); }
