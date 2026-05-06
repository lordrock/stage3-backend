const cache = new Map();

const DEFAULT_TTL_MS = 5 * 60 * 1000;

const getCache = (key) => {
  const item = cache.get(key);

  if (!item) return null;

  if (Date.now() > item.expires_at) {
    cache.delete(key);
    return null;
  }

  return item.value;
};

const setCache = (key, value, ttl = DEFAULT_TTL_MS) => {
  cache.set(key, {
    value,
    expires_at: Date.now() + ttl
  });
};

const deleteCacheByPrefix = (prefix) => {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
};

module.exports = {
  getCache,
  setCache,
  deleteCacheByPrefix
};