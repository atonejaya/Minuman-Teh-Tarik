/**
 * Simple In-Memory Cache implementation.
 * Can be swapped with Redis in the future without changing the service logic.
 */
class QueryCache {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Get item from cache
   * @param {string} key 
   * @returns {any|null}
   */
  async get(key) {
    if (!this.cache.has(key)) return null;

    const item = this.cache.get(key);
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  /**
   * Set item in cache
   * @param {string} key 
   * @param {any} value 
   * @param {number} ttlSeconds Time to live in seconds (default 60s)
   */
  async set(key, value, ttlSeconds = 60) {
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, {
      value,
      expiry
    });
  }

  /**
   * Invalidate a specific key or clear all cache
   */
  async invalidate(key = null) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Generates a deterministic cache key from prefix and objects
   */
  generateKey(prefix, ...objects) {
    const stringified = objects.map(obj => JSON.stringify(obj, Object.keys(obj).sort())).join('_');
    return `${prefix}_${stringified}`;
  }
}

// Export as singleton
module.exports = new QueryCache();
