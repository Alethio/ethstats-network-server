export default class AppConfig {
  constructor(diContainer) {
    this.lodash = diContainer.lodash;
    this.log = diContainer.logger;
    this.cli = diContainer.cli;
    this.log = diContainer.logger;

    this.availableApps = [
      {app: 'api'},
      {app: 'server'},
      {app: 'consumer'},
      {app: 'configurator'},
      {app: 'kohera'}
    ];

    this.availableDBTypes = [
      {type: 'cassandra'},
      {type: 'postgres'}
    ];

    let _config = this.initConfigs(this.lodash.cloneDeep(process.env));
    this.validateConfigs(_config);

    return _config;
  }

  _convertToBoolean(variable) {
    if (variable === true || variable === 1 || variable === '1' || (typeof variable === 'string' && (variable.toLowerCase() === 'true' || variable.toLowerCase() === 'on' || variable.toLowerCase() === 'enabled'))) {
      return true;
    }

    return false;
  }

  _convertToInt(variable) {
    let intValue = parseInt(variable, 10);
    if (isNaN(intValue)) {
      return undefined;
    }

    return intValue;
  }

  initConfigs(config) {
    config.NETWORK_ID = this._convertToInt(config.NETWORK_ID || 1);
    config.NETWORK_ALGO = config.NETWORK_ALGO || 'ethash';

    config.LOG_SHOW_DATETIME = this._convertToBoolean(config.LOG_SHOW_DATETIME || 1);
    config.LOG_SHOW_INFOS = this._convertToBoolean(this.cli.flags.verbose || config.LOG_SHOW_INFOS || 0);
    config.LOG_SHOW_WARNINGS = this._convertToBoolean(config.LOG_SHOW_WARNINGS || 1);
    config.LOG_SHOW_ERRORS = this._convertToBoolean(config.LOG_SHOW_ERRORS || 1);
    config.LOG_SHOW_DEBUGS = this._convertToBoolean(this.cli.flags.debug || config.LOG_SHOW_DEBUGS || 0);
    config.LOG_SHOW_AS_JSON = this._convertToBoolean(this.cli.flags.logs2json || config.LOG_SHOW_AS_JSON || 0);

    config.LOG_SHOW_INFOS = config.LOG_SHOW_DEBUGS === true ? config.LOG_SHOW_DEBUGS : config.LOG_SHOW_INFOS;

    config.APP_HOST = this.cli.flags.host || config.APP_HOST;
    config.APP_PORT = this._convertToInt(this.cli.flags.port || config.APP_PORT);
    config.APP_NAME = this.cli.flags.app || config.APP_NAME;

    config.SERVER_PING_INTERVAL = this._convertToInt(config.SERVER_PING_INTERVAL);
    config.SERVER_WS_TIMEOUT = this._convertToInt(config.SERVER_WS_TIMEOUT);

    config.LITE = this._convertToBoolean(this.cli.flags.lite || config.LITE);
    config.LITE_API_PORT = this._convertToInt(this.cli.flags.liteApiPort || config.LITE_API_PORT);
    config.LITE_DB_LIMIT = this._convertToInt(this.cli.flags.liteDbLimit || config.LITE_DB_LIMIT);
    config.LITE_DB_PERSIST = this._convertToBoolean(this.cli.flags.liteDbPersist || config.LITE_DB_PERSIST);

    config.CONSUMER_TOPIC = this.cli.flags.topic || config.CONSUMER_TOPIC;

    config.METRICS_ENABLED = this._convertToBoolean(config.METRICS_ENABLED);
    config.METRICS_PORT = this._convertToInt(this.cli.flags.metricsPort || config.METRICS_PORT);
    config.METRICS_DEFAULT_TIMEOUT = this._convertToInt(config.METRICS_DEFAULT_TIMEOUT);

    config.WS_REQUEST_RATE_LIMIT = this._convertToInt(config.WS_REQUEST_RATE_LIMIT);
    config.WS_REQUEST_RATE_INTERVAL = this._convertToInt(config.WS_REQUEST_RATE_INTERVAL);

    config.REDIS_PORT = this._convertToInt(config.REDIS_PORT);

    config.DEEPSTREAM_PORT = this._convertToInt(config.DEEPSTREAM_PORT);
    config.DEEPSTREAM_CLEANUP_INTERVAL = this._convertToInt(config.DEEPSTREAM_CLEANUP_INTERVAL);
    config.DEEPSTREAM_NODE_ACTIVITY_RETENTION = this._convertToInt(config.DEEPSTREAM_NODE_ACTIVITY_RETENTION);

    config.CACHE_LAST_BLOCK_EXPIRE = this._convertToInt(config.CACHE_LAST_BLOCK_EXPIRE);
    config.CACHE_KOHERA_LAST_INTERVAL_EXPIRE = this._convertToInt(config.CACHE_KOHERA_LAST_INTERVAL_EXPIRE);

    config.CHARTS_MAX_BLOCKS_HISTORY = this._convertToInt(config.CHARTS_MAX_BLOCKS_HISTORY);
    config.CHARTS_MAX_BINS = this._convertToInt(config.CHARTS_MAX_BINS);
    config.CHARTS_MAX_BLOCKS_FOR_BLOCK_TIME_AVG = this._convertToInt(config.CHARTS_MAX_BLOCKS_FOR_BLOCK_TIME_AVG);
    config.CHARTS_NODE_BLOCK_PROPAGATION_MAX_BINS = this._convertToInt(config.CHARTS_NODE_BLOCK_PROPAGATION_MAX_BINS);
    config.CHARTS_UNCLE_COUNT_MAX_BLOCKS_PER_BIN = this._convertToInt(config.CHARTS_UNCLE_COUNT_MAX_BLOCKS_PER_BIN);
    config.CHARTS_BLOCK_PROPAGATION_HISTOGRAM_MAX_CONFIRMATIONS_HISTORY = this._convertToInt(config.CHARTS_BLOCK_PROPAGATION_HISTOGRAM_MAX_CONFIRMATIONS_HISTORY);
    config.CHARTS_BLOCK_PROPAGATION_HISTOGRAM_MAX_BINS = this._convertToInt(config.CHARTS_BLOCK_PROPAGATION_HISTOGRAM_MAX_BINS);
    config.CHARTS_BLOCK_PROPAGATION_HISTOGRAM_MIN_RANGE = this._convertToInt(config.CHARTS_BLOCK_PROPAGATION_HISTOGRAM_MIN_RANGE);
    config.CHARTS_BLOCK_PROPAGATION_HISTOGRAM_MAX_RANGE = this._convertToInt(config.CHARTS_BLOCK_PROPAGATION_HISTOGRAM_MAX_RANGE);
    config.CHARTS_BLOCK_MINERS_MAX_BLOCKS_HISTORY = this._convertToInt(config.CHARTS_BLOCK_MINERS_MAX_BLOCKS_HISTORY);

    config.KAFKA_ERROR_RATE_LIMIT = this._convertToInt(config.KAFKA_ERROR_RATE_LIMIT);
    config.KAFKA_ERROR_RATE_INTERVAL = this._convertToInt(config.KAFKA_ERROR_RATE_INTERVAL);

    config.RECOVERY_HASH_EXPIRE = this._convertToInt(config.RECOVERY_HASH_EXPIRE);

    config.CHAIN_DETECTION_ENABLED = this._convertToBoolean(config.CHAIN_DETECTION_ENABLED);
    config.CHAIN_DETECTION_RATE_ON_BLOCK = this._convertToInt(config.CHAIN_DETECTION_RATE_ON_BLOCK);
    config.CHAIN_DETECTION_RATE_ON_SYNC = this._convertToInt(config.CHAIN_DETECTION_RATE_ON_SYNC);
    config.CHAIN_DETECTION_LAST_BLOCK_MAX_DIFF = this._convertToInt(config.CHAIN_DETECTION_LAST_BLOCK_MAX_DIFF);
    config.CHAIN_DETECTION_CLIENT_RESPONSE_MAX_DIFF = this._convertToInt(config.CHAIN_DETECTION_CLIENT_RESPONSE_MAX_DIFF);

    config.KOHERA_MAX_BLOCK_INTERVAL = this._convertToInt(config.KOHERA_MAX_BLOCK_INTERVAL);
    config.KOHERA_CHECK_CONSISTENCY_INTERVAL = this._convertToInt(config.KOHERA_CHECK_CONSISTENCY_INTERVAL);
    config.KOHERA_DB_REQUEST_TIMEOUT = this._convertToInt(config.KOHERA_DB_REQUEST_TIMEOUT);
    config.KOHERA_API_REQUEST_TIMEOUT = this._convertToInt(config.KOHERA_API_REQUEST_TIMEOUT);
    config.KOHERA_QUEUE_REQUEST_TIMEOUT = this._convertToInt(config.KOHERA_QUEUE_REQUEST_TIMEOUT);

    return config;
  }

  validateConfigs(config) {
    if (!config.LITE && this.lodash.find(this.availableDBTypes, {type: config.DB_TYPE}) === undefined) {
      console.info('Invalid \'DB type\'!');
      process.exit(1);
    }

    if (!config.LITE && this.lodash.find(this.availableApps, {app: config.APP_NAME}) === undefined) {
      console.info('Invalid \'App name\'! See help bellow.');
      this.cli.showHelp();
    }

    if (config.APP_NAME === 'consumer' && !config.CONSUMER_TOPIC) {
      console.info('Invalid \'topic\'! See help bellow.');
      this.cli.showHelp();
    }
  }
}
