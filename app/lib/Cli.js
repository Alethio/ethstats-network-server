export default class CLI {
  constructor(diContainer) {
    this.packageJson = diContainer.packageJson;
    this.meow = diContainer.meow;

    return this.init();
  }

  init() {
    let cliDescription = this.packageJson.description + '\n  Version ' + this.packageJson.version;
    let cliFlags = {
      help: {
        type: 'boolean',
        alias: 'h'
      },
      version: {
        type: 'boolean',
        alias: 'V'
      },
      verbose: {
        type: 'boolean',
        alias: 'v'
      },
      debug: {
        type: 'boolean',
        alias: 'd'
      },
      logs2json: {
        type: 'boolean'
      },
      host: {
        type: 'string',
        alias: 'H'
      },
      port: {
        type: 'string',
        alias: 'p'
      },
      app: {
        type: 'string',
        alias: 'a'
      },
      lite: {
        type: 'boolean'
      },
      liteApiPort: {
        type: 'string'
      },
      liteDbLimit: {
        type: 'string'
      },
      liteDbPersist: {
        type: 'boolean'
      },
      topic: {
        type: 'string',
        alias: 't'
      },
      interval: {
        type: 'string'
      },
      checkOnly: {
        type: 'boolean'
      },
      metricsPort: {
        type: 'string'
      }
    };

    let cli = this.meow(`
    Usage
      $ app <options>
    
    Options
      General
        --help, -h              Show help
        --version, -V           Show version
  
      Logging
        --verbose, -v           Output detailed information
        --debug, -d             Output debug values
        --logs2json             Output logs in JSON format
  
      Application
        --host, -H              App hostname
        --port, -p              App port (default: 3000)
        --app, -a               App name (default: server). Run specific app as separate service (Available: server|consumer|api|configurator|kohera).
                                Recommended for cluster environments. If --lite is specified, this option is ignored.

        --lite                  Run in lite mode (default: off). In a single instance will be started all necessary services (server, consumer, api).
                                DB will be persisted in memory, no Kafka needed for queuing and no Redis for caching.
                                Only Deepstream is needed for real time data reporting in the front end application.
        --lite-api-port         Lite mode API port (default: 3030)
        --lite-db-limit         Number of blocks to persist in memory (default: 3000).                                
        --lite-db-persist       Persist DB in Redis. This option is available only in lite mode and consistent with --lite-db-limit (default: off).
  
      Consumer
        --topic, -t             Topic name to consume
  
      Kohera
        --interval              Block interval to be checked for consistency. Value format: "start:end" 
                                The missing blocks found are fetched and sent to the consumer. 
                                If not specified the service will continuously check the consistency.
        --check-only            Only check the missing blocks without fetching the data.

      Metrics
        --metrics-port          Http port for metrics (default: 8888)     

    `, {
      description: cliDescription,
      flags: cliFlags
    });

    return cli;
  }
}
