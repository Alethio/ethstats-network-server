# Changelog
All notable changes to this project will be documented in this file.

## [1.5.2] - 2019-06-05
- Add support for validators/signers on POA networks ("ibft2" and "clique" consensus algorithms)

## [1.5.1] - 2019-05-22
- Add "clientTimeout" message sent to the client when inactive for more then 3 minutes

## [1.5.0] - 2019-05-21
- Add WebSocket API improvements
- Add WebSocket API documentation
- Add support for "stats.pendingTxs"
- Validate networkId on login
- Remove ".net" subdomain

## [1.4.1] - 2019-04-01
- Remove "sprintf" npm package due to memory leaks
- Update Infura library to use latest v3 API
- Update npm dependent packages to latest versions

## [1.4.0] - 2019-03-14
- Add support for PostgreSQL
- Add docker compose example for cluster mode with PostgreSQL persistence
- Auto install the PostgreSQL tables if ALL tables are not found
- Improvement on getting transaction hashes from a Nethermind node
- Removed miner from checking for block existence

## [1.3.11] - 2019-02-18
- Added configurable dashboard url depending on the network
- Updated registration email to show the network on which the node was added 

## [1.3.10] - 2019-02-15
- Fixed bug when Deepstream is restoring data on crash/restart
- Added server urls testnets Rinkeby and Goerli 

## [1.3.9] - 2019-02-07
- Update docker compose to use custom nginx config

## [1.3.8] - 2019-02-05
- Fixed blocks persistence for lite mode
- Updated dependencies to latest versions
- Added config CASSANDRA_LOCAL_DATA_CENTER
- Fixed linting issues 

## [1.3.7] - 2019-02-01
- Added config REDIS_NAMESPACE 
- Debug log improvements
- CircleCI improvements
- Other bug fixes

## [1.3.6] - 2019-01-15
- Added CircleCI workflow to trigger docker hub build sequentially
- Added DS record for node count

## [1.3.5] - 2018-12-20
- Updated docker compose files
- Updated readme file
- Renamed LIGHT => LITE

## [1.3.4] - 2018-12-14
- Moved repo to GitHub
- Added CircleCI integration

## [1.3.3] - 2018-12-11
- Fixed server link in the email sent to the user when registering for Geth
- Subdomains update

## [1.3.2] - 2018-11-27
- Small bug fix related to authentication logs
- Updated dependencies to latest versions

## [1.3.1] - 2018-10-25
- Email notifications and text updates

## [1.3.0] - 2018-10-19
- Changed DB structure to non-ethonized field names
- DB models improvements

## [1.2.1] - 2018-10-03
- New service 'Kohera' to check DB consistency

## [1.2.0] - 2018-09-14
- Moved lib/ -> app/lib/
- Session abstraction lib/Session
- Cache abstraction lib/Cache
- Small wip on jsonDB init
- Updated dependencies to latest versions
- Eslint cleanup and improvements

## [1.1.3] - 2018-09-06
- Added docker compose files for lite mode with or without persistence
- App config improvements

## [1.1.2] - 2018-08-30
- Backwards compatibility with v.1 clients and native Geth stats
- Logging improvements
- Bug fix on logout when websocket connection is ended

## [1.1.1] - 2018-08-23
- Get block history (consistent with --lite-db-limit) if server started in lite mode with no DB persistence.

## [1.1.0] - 2018-08-21
- Added lite mode. In a single instance will be started all necessary services (server, consumer, api).
- Added possibility to register nodes directly through the API endpoint POST /nodes

## [1.0.7] - 2018-07-19
- Fixed charts bins to contain empty objects if no blocks available
- Added Cassandra migration tool

## [1.0.6] - 2018-06-29
- Added Prometheus gauge to count WS connections

## [1.0.5] - 2018-06-29
- Added "/tools/hard-reset" (truncate DB and flush Redis) endpoint on the API only in "dev" environment

## [1.0.4] - 2018-06-27
- Updated API endpoint for nodes to include 'usage' data

## [1.0.3] - 2018-06-27
- On login save CPU, memory and disk information
- Save host/cilent/node usage information

## [1.0.2] - 2018-06-14
- Improved WS communication mechanism with client app.
- Added support to batch multiple queries into Cassandra.
- Performance improvements on block confirmations DB table.

## [1.0.1] - 2018-06-07
- Chain detection improvements.
- Bug fixes.

## [1.0.0] - 2018-05-18
- Added Changelog file.
- Fixed node online time percent calculation.
