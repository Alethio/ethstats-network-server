# Changelog
All notable changes to this project will be documented in this file.

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
- Added docker compose files for light mode with or without persistence
- App config improvements

## [1.1.2] - 2018-08-30
- Backwards compatibility with v.1 clients and native Geth stats
- Logging improvements
- Bug fix on logout when websocket connection is ended

## [1.1.1] - 2018-08-23
- Get block history (consistent with --light-db-limit) if server started in light mode with no DB persistence.

## [1.1.0] - 2018-08-21
- Added light mode. In a single instance will be started all necessary services (server, consumer, api).
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
