import packageJson from '../package.json';

import fs from 'fs';
import dirRequire from 'dir-require';
import dotenv from 'dotenv';
import lodash from 'lodash';
import meow from 'meow';
import chalk from 'chalk';
import Cassandra from 'cassandra-driver';
import Postgres from 'pg';
import Redis from 'ioredis';
import geoIp from 'geoip-lite';
import * as d3 from 'd3';

import Api from './api.js';
import Server from './server.js';
import Consumer from './consumer.js';
import Configurator from './configurator.js';
import Kohera from './kohera.js';

import cassandraModels from './models/cassandra/index.js';
import postgresModels from './models/postgres/index.js';
import jsonModels from './models/json/index.js';
import redisModels from './models/redis/index.js';

import AppConfig from './lib/AppConfig.js';
import Cache from './lib/Cache';
import CLI from './lib/Cli.js';
import Logger from './lib/Logger.js';
import PrometheusMetrics from './lib/PrometheusMetrics.js';
import Result from './lib/Result.js';
import Mailer from './lib/Mailer.js';
import bigNumberUtils from './lib/BigNumberUtils.js';
import Infura from './lib/Infura';
import KafkaUtils from './lib/KafkaUtils.js';

if (!fs.existsSync(`${__dirname}/../.env`)) {
  console.error('Config file ".env" does not exist !');
  process.exit(1);
}

dotenv.config({path: `${__dirname}/../.env`});

const diContainer = {
  packageJson,
  dirRequire,
  lodash,
  meow,
  chalk,
  geoIp,
  d3,
  bigNumberUtils
};

diContainer.cli = new CLI(diContainer);
diContainer.appConfig = new AppConfig(diContainer);
diContainer.logger = new Logger(diContainer);
diContainer.infura = new Infura(diContainer);
diContainer.prometheusMetrics = new PrometheusMetrics(diContainer);
diContainer.logger.prometheusMetrics = diContainer.prometheusMetrics;
diContainer.prometheusMetrics.initServer();

const appName = diContainer.appConfig.APP_NAME.charAt(0).toUpperCase() + diContainer.appConfig.APP_NAME.slice(1);
const appClasses = {
  api: Api,
  server: Server,
  consumer: Consumer,
  configurator: Configurator,
  kohera: Kohera
};

if (diContainer.appConfig.LITE === true) {
  diContainer.logger.echo(`Initializing lite mode version ${packageJson.version}...`);

  diContainer.result = new Result(diContainer);
  diContainer.mailer = new Mailer(diContainer);

  if (diContainer.appConfig.LITE_DB_PERSIST === true) {
    diContainer.logger.info('Initializing Redis...');
    diContainer.redis = new Redis({
      host: diContainer.appConfig.REDIS_HOST,
      port: diContainer.appConfig.REDIS_PORT
    });

    diContainer.redis.on('connect', () => {
      diContainer.logger.info(`Redis => Connected to ${diContainer.appConfig.REDIS_HOST}:${diContainer.appConfig.REDIS_PORT}`);
      diContainer.cache = new Cache(diContainer);
      diContainer.models = redisModels(diContainer);

      const server = new Server(diContainer);
      const api = new Api(diContainer);
    });

    diContainer.redis.on('error', error => {
      diContainer.logger.error('Redis => ' + error);
      diContainer.dbClient.shutdown();
      process.exit(1);
    });
  } else {
    diContainer.cache = new Cache(diContainer);
    diContainer.models = jsonModels(diContainer);

    const server = new Server(diContainer);
    const api = new Api(diContainer);
  }
} else if (diContainer.appConfig.APP_NAME === 'configurator') {
  diContainer.logger.echo(`Initializing ${appName} version ${packageJson.version}...`);
  const app = new appClasses[diContainer.appConfig.APP_NAME](diContainer);
} else {
  diContainer.logger.echo(`Initializing ${appName} version ${packageJson.version}...`);

  diContainer.result = new Result(diContainer);
  diContainer.mailer = new Mailer(diContainer);

  const connectToCassandra = () => {
    diContainer.logger.info('Initializing Cassandra...');
    diContainer.dbClient = new Cassandra.Client({
      contactPoints: diContainer.appConfig.CASSANDRA_HOSTS.split(','),
      localDataCenter: diContainer.appConfig.CASSANDRA_LOCAL_DATA_CENTER,
      keyspace: diContainer.appConfig.CASSANDRA_KEYSPACE
    });

    return diContainer.dbClient.connect().then(() => {
      diContainer.logger.info(`Cassandra => Connected to cluster with ${diContainer.dbClient.hosts.length} host(s): ${diContainer.appConfig.CASSANDRA_HOSTS}`);
      diContainer.dbClient.hosts.forEach(host => {
        diContainer.logger.info(`Cassandra => Host ${host.address} v${host.cassandraVersion} on rack ${host.rack}, dc ${host.datacenter}, isUp: ${host.isUp()}`);
      });
      return true;
    }).catch(error => {
      diContainer.logger.error('Cassandra => ' + error.message);
      diContainer.dbClient.shutdown();
      process.exit(1);
      return false;
    });
  };

  const connectToPostgres = () => {
    diContainer.logger.info('Initializing Postgres...');
    diContainer.dbClient = new Postgres.Client();

    return diContainer.dbClient.connect().then(() => {
      diContainer.logger.info(`Postgres => Connected to: ${diContainer.appConfig.PGHOST}:${diContainer.appConfig.PGPORT}`);
      return true;
    }).catch(error => {
      diContainer.logger.error('Postgres => ' + error.message);
      diContainer.dbClient.end();
      process.exit(1);
      return false;
    });
  };

  const initApp = () => {
    diContainer.logger.info('Initializing Redis...');
    diContainer.redis = new Redis({
      host: diContainer.appConfig.REDIS_HOST,
      port: diContainer.appConfig.REDIS_PORT
    });

    diContainer.redis.on('connect', () => {
      diContainer.logger.info(`Redis => Connected to: ${diContainer.appConfig.REDIS_HOST}:${diContainer.appConfig.REDIS_PORT}`);
      diContainer.cache = new Cache(diContainer);

      if (diContainer.appConfig.DB_TYPE === 'cassandra') {
        diContainer.models = cassandraModels(diContainer);
      } else {
        diContainer.models = postgresModels(diContainer);
      }

      diContainer.kafkaUtils = new KafkaUtils(diContainer);

      const app = new appClasses[diContainer.appConfig.APP_NAME](diContainer);
    });

    diContainer.redis.on('error', error => {
      diContainer.logger.error('Redis => ' + error);
      diContainer.dbClient.shutdown();
      process.exit(1);
    });
  };

  if (diContainer.appConfig.DB_TYPE === 'cassandra') {
    connectToCassandra().then(isReady => {
      if (isReady) {
        initApp();
      }
    });
  } else {
    connectToPostgres().then(isReady => {
      if (isReady) {
        initApp();
      }
    });
  }
}
