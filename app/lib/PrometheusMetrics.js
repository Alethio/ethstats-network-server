import http from 'http';
import express from 'express';
import prometheusClient from 'prom-client';

export default class PrometheusMetrics {
  constructor(diContainer) {
    this.appConfig = diContainer.appConfig;
    this.prometheusClient = prometheusClient;
    this.log = diContainer.logger;
    this.lodash = diContainer.lodash;

    this.host = this.appConfig.APP_HOST;
    this.port = this.appConfig.METRICS_PORT;

    this.contentType = prometheusClient.register.contentType;
    this.metricsEnabled = this.appConfig.METRICS_ENABLED;
    this.defaultMetricsTimeout = this.appConfig.METRICS_DEFAULT_TIMEOUT * 1000;

    this.collectDefaultMetrics();

    this.counterDefs = [
      {
        name: 'ethstats_server_errors_total',
        help: 'Number of total errors.'
      },
      {
        name: 'ethstats_server_ws_messages_topic_total',
        help: 'Number of total websocket messages per topic.',
        labelNames: ['topic']
      },
      {
        name: 'ethstats_server_deepstream_requests_total',
        help: 'Number of total requests to Deepstream per topic.',
        labelNames: ['topic']
      },
      {
        name: 'ethstats_server_cassandra_requests_total',
        help: 'Number of total requests to Cassandra per query type.',
        labelNames: ['query_type']
      },
      {
        name: 'ethstats_server_kafka_produced_messages_total',
        help: 'Number of total Kafka messages produced per topic by Server.',
        labelNames: ['topic']
      },
      {
        name: 'ethstats_server_kafka_consumed_messages_total',
        help: 'Number of total Kafka messages consumed per topic.',
        labelNames: ['topic']
      },
      {
        name: 'ethstats_api_requests_total',
        help: 'Number of total API requests.',
        labelNames: ['route']
      },
      {
        name: 'ethstats_configurator_requests_total',
        help: 'Number of total Configurator requests.',
        labelNames: ['route']
      },
      {
        name: 'ethstats_kohera_kafka_produced_messages_total',
        help: 'Number of total Kafka messages produced per topic by Kohera.',
        labelNames: ['topic']
      }
    ];

    this.gaugesDefs = [
      {
        name: 'ethstats_server_ws_connections_count',
        help: 'Number of active WS connections.'
      }
    ];

    this.initCounters();
    this.initGauges();

    return this;
  }

  initCounters() {
    this.lodash.forEach(this.counterDefs, counter => {
      if (this.metricsEnabled) {
        this[counter.name] = new this.prometheusClient.Counter(counter);
      } else {
        this[counter.name] = {
          inc: () => {
            return false;
          }
        };
      }
    });
  }

  initGauges() {
    this.lodash.forEach(this.gaugesDefs, gauge => {
      if (this.metricsEnabled) {
        this[gauge.name] = new this.prometheusClient.Gauge(gauge);
      } else {
        this[gauge.name] = {
          inc: () => {
            return false;
          },
          dec: () => {
            return false;
          },
          set: () => {
            return false;
          },
          reset: () => {
            return false;
          }
        };
      }
    });
  }

  initServer() {
    let metricsExpressServer = express();
    let metricsHttpServer = http.createServer(metricsExpressServer);

    metricsHttpServer.listen(this.port, () => {
      this.log.echo(`Metrics HTTP Server is running on ${this.host}:${this.port}`);
    });

    metricsHttpServer.on('error', error => {
      this.log.error(`Metrics HTTP Server => ${error}`);
    });

    metricsExpressServer.get('/metrics', (request, response) => {
      response.set('Content-Type', this.contentType);
      response.send(this.getMetrics());
    });
  }

  getMetrics() {
    let result = 'Metrics are disabled';
    if (this.metricsEnabled) {
      result = this.prometheusClient.register.metrics();
    }

    return result;
  }

  collectDefaultMetrics() {
    if (this.metricsEnabled) {
      const collectDefaultMetrics = this.prometheusClient.collectDefaultMetrics;
      collectDefaultMetrics({timeout: this.defaultMetricsTimeout});
    }
  }
}
