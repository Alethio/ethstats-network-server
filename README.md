# ARCHIVED
## Alethio is no longer operating so the software stack offered here is no longer maintained. Feel free to fork and continue if anything looks useful.

# ethstats-network-server

> EthStats - Server
>
> The server collects/stores/aggregates data sent through `ethstats-cli`.

## Requirements

Lite mode:

> Node.js >= 8.0 (https://nodejs.org/en/download/)
>
> NPM >= 6.0 (NPM is distributed with Node.js. For more infos see: https://www.npmjs.com/get-npm)
>
> Deepstream >= 3.1 (https://github.com/deepstreamIO/deepstream.io/releases)
>
> Redis >= 3.2 (https://redis.io/download)

Cluster mode additions:

> Cassandra >= 3.10 (https://cassandra.apache.org/download/)
>
> Kafka >= 0.11 (https://kafka.apache.org/downloads)

## Installation

```sh
git clone https://github.com/Alethio/ethstats-network-server.git
npm install
```

## Update

To update the server just do a "git pull" and restart the app.

## Usage

```sh
./bin/app.js
```

## Shell options

```sh
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
```

## Docker

#### Lite mode

In lite mode the total number of blocks persisted is by default 3000. See `--lite-db-limit` option if custom value is needed.

There are 2 ways to start the server in lite mode.
 - Memory persistence - in case of a crash/restart the gathered data is lost.
 - Redis persistence - in case of a crash/resstart the gathered data is persisted into Redis.

Lite mode will use the default settings and some 3rd party dependent services like: Deepstream, Dashboard or Redis depending on the persistence needs.
For more details on the default settings see [.env.sample](https://github.com/Alethio/ethstats-network-server/tree/master/.env.sample).
And because of the dependent services, `docker-compose` is used, to include them.

No persistence:
```sh
cd docker/lite-mode/no-persistence
docker-compose up
```

With persistence:
```sh
cd docker/lite-mode/with-persistence
docker-compose up
```

#### Cluster mode

In cluster mode a single service will be started depending the configs specified in the `.env` file for via CLI flags. See [.env.sample](https://github.com/Alethio/ethstats-network-server/tree/master/.env.sample) file or [shell options](#shell-options).

```sh
docker build . -t <serviceName>
docker run -d <serviceName>
```
or
```sh
docker run -d alethio/ethstats-network-server:latest
```
If used from the docker hub image, configs can pe passed through env vars. For available env vars see [.env.sample](https://github.com/Alethio/ethstats-network-server/tree/master/.env.sample).

## DB Migrations

Migrations are done through `cqlsh`.

Path: [/db/cassandra/migrations](https://github.com/Alethio/ethstats-network-server/tree/master/db/cassandra/migrations)

## Changelog

Please see [changelog](CHANGELOG.md) file for all notable changes to this project.

## License

MIT &copy; [Alethio](https://aleth.io)
