const NodeCache = require('node-cache');

class CacheService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 60, checkperiod: 30 });
  }

  get(key) {
    return this.cache.get(key) || null;
  }

  set(key, value, ttlSeconds = 60) {
    this.cache.set(key, value, ttlSeconds);
  }

  del(key) {
    this.cache.del(key);
  }

  flush() {
    this.cache.flushAll();
  }
}

module.exports = { CacheService };
