export default class Cache {
  constructor(diContainer) {
    this.appConfig = diContainer.appConfig;
    this.log = diContainer.logger;
    this.redis = diContainer.redis;
    this.namespace = `${this.appConfig.REDIS_NAMESPACE}:cache`;

    this.cacheStorage = {};
  }

  setVar(key, value, expire) {
    key = `${this.namespace}:${key}`;
    let result = false;

    if (this.appConfig.LITE === true && this.appConfig.LITE_DB_PERSIST === false) {
      this.cacheStorage[key] = value;
      result = true;
    } else {
      result = this.redis.set(key, value, 'EX', expire);
    }

    return result;
  }

  async getVar(key) {
    key = `${this.namespace}:${key}`;

    if (this.appConfig.LITE === true && this.appConfig.LITE_DB_PERSIST === false) {
      return this.cacheStorage[key] === undefined ? null : this.cacheStorage[key];
    }

    return this.redis.get(key).then(data => {
      return data;
    });
  }

  deleteVar(key) {
    key = `${this.namespace}:${key}`;
    let result = false;

    if (this.appConfig.LITE === true && this.appConfig.LITE_DB_PERSIST === false) {
      delete this.cacheStorage[key];
      result = true;
    } else {
      result = this.redis.del(key);
    }

    return result;
  }

  flushDb() {
    if (this.appConfig.LITE === true && this.appConfig.LITE_DB_PERSIST === false) {
      this.cacheStorage = {};
    } else {
      this.redis.keys(`${this.namespace}:*`).then(keys => {
        for (let key of keys) {
          this.redis.del(key);
        }
      });
    }

    return true;
  }
}
