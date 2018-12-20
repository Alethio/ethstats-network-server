import http from 'http';
import express from 'express';
import bodyParser from 'body-parser';
import Ajv from 'ajv';
import sha1 from 'sha1';

import AjvError from './lib/AjvError.js';
import Statistics from './lib/Statistics.js';
import ExpressUtils from './lib/ExpressUtils.js';

import controllers from './controllers/api/index.js';

export default class Api {
  constructor(diContainer) {
    this.appConfig = diContainer.appConfig;
    this.lodash = diContainer.lodash;
    this.log = diContainer.logger;
    this.prometheusMetrics = diContainer.prometheusMetrics;
    this.expressServer = express();
    this.expressUtils = new ExpressUtils();
    this.apiHttpServer = http.createServer(this.expressServer);

    this.host = this.appConfig.APP_HOST;
    this.port = (this.appConfig.LITE === true) ? this.appConfig.LITE_API_PORT : this.appConfig.APP_PORT;

    this.expressServer.use(bodyParser.json());
    this.expressServer.use(bodyParser.urlencoded({extended: true}));
    this.expressServer.use((request, response, next) => {
      response.header('Access-Control-Allow-Origin', '*');
      response.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT, PATCH, OPTIONS');
      response.header('Access-Control-Allow-Headers', 'Authorization, Origin, X-Requested-With, Content-Type, Accept, X-PINGOTHER, Referer');

      let route = this.expressUtils.getRequestedRoute(this.expressServer, request);
      this.log.info(`Requested route '${route}' original url '${decodeURI(request.originalUrl)}'`);
      this.prometheusMetrics.ethstats_api_requests_total.inc({route: (route === 'undefined route' ? `${route}: ${request.originalUrl}` : route)}, 1, Date.now());

      next();
    });

    diContainer.validator = new Ajv({allErrors: true, jsonPointers: true, useDefaults: true});
    diContainer.validatorError = new AjvError(diContainer);
    diContainer.statistics = new Statistics(diContainer);
    diContainer.sha1 = sha1;

    this.controllers = controllers(diContainer);

    this.init();

    return this;
  }

  init() {
    this.apiHttpServer.listen(this.port, () => {
      this.log.echo(`API HTTP Server is running on ${this.host}:${this.port}`);
    });

    this.apiHttpServer.on('error', error => {
      this.log.error(`API HTTP Server => ${error}`);
    });

    this.expressServer.get('/say/hello', (request, response) => {
      this.controllers.AbstractController.sayHello(request, response);
    });

    this.expressServer.post('/nodes', (request, response) => {
      this.controllers.NodesController.add(request, response);
    });

    this.expressServer.get('/nodes/:nodeName/events', (request, response) => {
      this.controllers.NodesController.getEvents(request, response);
    });

    this.expressServer.get('/nodes/recovery/:recoveryRequestId', (request, response) => {
      this.controllers.NodesController.getRecoveryHashes(request, response);
    });

    this.expressServer.get('/blocks/last', (request, response) => {
      this.controllers.BlocksController.getLast(request, response);
    });

    this.expressServer.get('/blocks/:blockNumber', (request, response) => {
      this.controllers.BlocksController.get(request, response);
    });

    this.expressServer.get('/blocks/:blockNumber/nodes', (request, response) => {
      this.controllers.BlocksController.getNodes(request, response);
    });

    this.expressServer.get('/blocks/:blockNumber/statistics', (request, response) => {
      this.controllers.BlocksController.getStatistics(request, response);
    });

    if (this.appConfig.ENVIRONMENT === 'dev') {
      this.expressServer.get('/tools/hard-reset', (request, response) => {
        this.controllers.ToolsController.hardReset(request, response);
      });
    }
  }
}
