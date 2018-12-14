import http from 'http';
import express from 'express';
import bodyParser from 'body-parser';
import Ajv from 'ajv';

import AjvError from './lib/AjvError.js';
import ExpressUtils from './lib/ExpressUtils.js';

import controllers from './controllers/configurator/index.js';

export default class Configurator {
  constructor(diContainer) {
    this.appConfig = diContainer.appConfig;
    this.lodash = diContainer.lodash;
    this.log = diContainer.logger;
    this.prometheusMetrics = diContainer.prometheusMetrics;
    this.expressServer = express();
    this.expressUtils = new ExpressUtils();
    this.httpServer = http.createServer(this.expressServer);

    this.host = this.appConfig.APP_HOST;
    this.port = this.appConfig.APP_PORT;

    this.expressServer.use(bodyParser.json());
    this.expressServer.use(bodyParser.urlencoded({extended: true}));
    this.expressServer.use((request, response, next) => {
      response.header('Access-Control-Allow-Origin', '*');
      response.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT, PATCH, OPTIONS');
      response.header('Access-Control-Allow-Headers', 'Authorization, Origin, X-Requested-With, Content-Type, Accept, X-PINGOTHER, Referer');

      let route = this.expressUtils.getRequestedRoute(this.expressServer, request);
      this.log.info(`Requested route '${route}' original url '${decodeURI(request.originalUrl)}'`);
      this.prometheusMetrics.ethstats_configurator_requests_total.inc({route: (route === 'undefined route' ? `${route}: ${request.originalUrl}` : route)}, 1, Date.now());

      next();
    });

    diContainer.validator = new Ajv({allErrors: true, jsonPointers: true, useDefaults: true});
    diContainer.validatorError = new AjvError(diContainer);

    this.controllers = controllers(diContainer);

    this.init();

    return this;
  }

  init() {
    this.httpServer.listen(this.port, () => {
      this.log.echo(`Configurator HTTP Server is running on ${this.host}:${this.port}`);
    });

    this.httpServer.on('error', error => {
      this.log.error(`Configurator HTTP Server => ${error}`);
    });

    this.expressServer.get('/say/hello', (request, response) => {
      this.controllers.AbstractController.sayHello(request, response);
    });

    this.expressServer.get('/configs/:configName', (request, response) => {
      this.controllers.ConfigsController.get(request, response);
    });
  }
}
