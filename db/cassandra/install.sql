DROP TABLE IF EXISTS connection_logs;
CREATE TABLE IF NOT EXISTS connection_logs (
  "nodeName" varchar,
  "isConnected" boolean,
  "receivedTimestamp" timestamp,
  PRIMARY KEY ("nodeName", "receivedTimestamp")
) WITH CLUSTERING ORDER BY ("receivedTimestamp" DESC);

DROP TABLE IF EXISTS nodes;
CREATE TABLE IF NOT EXISTS nodes (
  "nodeShard" varchar,
  "nodeName" varchar,
  "accountEmail" varchar,
  "secretKey" varchar,
  "isActive" boolean,
  "lastIp" varchar,
  "createdTimestamp" timestamp,
  "lastActivityTimestamp" timestamp,
  "lastLoginTimestamp" timestamp,
  "lastLogoutTimestamp" timestamp,
  "totalOnlineTime" bigint,
  PRIMARY KEY ("nodeShard", "nodeName")
);
DROP INDEX IF EXISTS "idx_nodes_nodeName"; CREATE INDEX "idx_nodes_nodeName" on nodes ("nodeName");
DROP INDEX IF EXISTS "idx_nodes_accountEmail"; CREATE INDEX "idx_nodes_accountEmail" on nodes ("accountEmail");
DROP INDEX IF EXISTS "idx_nodes_isActive"; CREATE INDEX "idx_nodes_isActive" on nodes ("isActive");
DROP INDEX IF EXISTS "idx_nodes_lastActivityTimestamp"; CREATE INDEX "idx_nodes_lastActivityTimestamp" on nodes ("lastActivityTimestamp");

INSERT INTO nodes (
  "nodeShard",
  "nodeName",
  "accountEmail",
  "secretKey",
  "lastIp",
  "createdTimestamp"
) VALUES ('k', 'Kohera', 'adrian.sabau@consensys.net', '34c6227031eacdc43b0e9945567b4384a556f19f', '79.118.23.137', '2015-07-30 00:00:00');

DROP TABLE IF EXISTS node_recovery_requests;
CREATE TABLE IF NOT EXISTS node_recovery_requests (
  "recoveryRequestId" varchar,
  "recoveryHash" varchar,
  "accountEmail" varchar,
  "nodeName" varchar,
  "createdTimestamp" timestamp,
  PRIMARY KEY ("recoveryRequestId", "recoveryHash")
);
DROP INDEX IF EXISTS "idx_node_recovery_requests_accountEmail"; CREATE INDEX "idx_node_recovery_requests_accountEmail" on node_recovery_requests ("accountEmail");

DROP TABLE IF EXISTS auth_logs;
CREATE TABLE IF NOT EXISTS auth_logs (
	"nodeName" varchar,
  "coinbase" varchar,
  "node" varchar,
  "net" varchar,
  "protocol" varchar,
  "api" varchar,
  "os" varchar,
  "osVersion" varchar,
  "ip" varchar,
  "client" varchar,
  "cpu" varchar,
  "memory" varchar,
  "disk" varchar,
  "loginTimestamp" timestamp,
  "logoutTimestamp" timestamp,
  "onlineTime" bigint,
  PRIMARY KEY ("nodeName", "loginTimestamp")
) WITH CLUSTERING ORDER BY ("loginTimestamp" DESC);

INSERT INTO auth_logs (
  "nodeName",
  "coinbase",
  "node",
  "net",
  "protocol",
  "api",
  "os",
  "osVersion",
  "ip",
  "client",
  "cpu",
  "memory",
  "disk",
  "loginTimestamp"
) VALUES ('Kohera', null, 'Parity', '1', '63', '1.0.0-beta.35', 'Linux', '4.15.0-34-generic', '79.118.23.137', '2.4.6', '{"manufacturer":"Intel","brand":"Core i7","speed":"4.00"}', null, null, '2015-07-30 00:00:00');

DROP TABLE IF EXISTS syncs;
CREATE TABLE IF NOT EXISTS syncs (
  "nodeName" varchar,
  "syncOperation" varchar,
  "startingBlock" bigint,
  "currentBlock" bigint,
  "highestBlock" bigint,
  "receivedTimestamp" timestamp,
  PRIMARY KEY ("nodeName", "receivedTimestamp")
) WITH CLUSTERING ORDER BY ("receivedTimestamp" DESC);
DROP INDEX IF EXISTS "idx_syncs_syncOperation"; CREATE INDEX "idx_syncs_syncOperation" on syncs ("syncOperation");

DROP TABLE IF EXISTS stats;
CREATE TABLE IF NOT EXISTS stats (
  "nodeName" varchar,
  "isMining" boolean,
  "peerCount" int,
  "hashrate" varchar,
  "gasPrice" varchar,
  "wsLatency" int,
  "receivedTimestamp" timestamp,
  PRIMARY KEY ("nodeName", "receivedTimestamp")
) WITH CLUSTERING ORDER BY ("receivedTimestamp" DESC);

INSERT INTO stats (
  "nodeName",
  "isMining",
  "peerCount",
  "hashrate",
  "gasPrice",
  "wsLatency",
  "receivedTimestamp"
) VALUES ('Kohera', false, 50, '0', '0', 1, '2015-07-30 00:00:00');

DROP TABLE IF EXISTS blocks1;
CREATE TABLE IF NOT EXISTS blocks1 (
  "date" int,
  "difficulty" varchar,
  "extraData" varchar,
  "gasLimit" bigint,
  "gasUsed" bigint,
  "hash" varchar,
  "logsBloom" varchar,
  "miner" varchar,
  "mixHash" varchar,
  "nonce" varchar,
  "number" bigint,
  "parentHash" varchar,
  "receiptsRoot" varchar,
  "sealFields" varchar,
  "sha3Uncles" varchar,
  "size" int,
  "stateRoot" varchar,
  "timestamp" int,
  "totalDifficulty" varchar,
  "transactionsRoot" varchar,
  "receivedTimestamp" timestamp,
  "blockTime" int,
  "rank" int,
  "txCount" int,
  "uncleCount" int,
  PRIMARY KEY ("date", "number", "hash", "timestamp")
) WITH CLUSTERING ORDER BY ("number" DESC, "hash" ASC, "timestamp" DESC);

DROP TABLE IF EXISTS blocks2;
CREATE TABLE IF NOT EXISTS blocks2 (
  "numberPartition" bigint,
  "difficulty" varchar,
  "extraData" varchar,
  "gasLimit" bigint,
  "gasUsed" bigint,
  "hash" varchar,
  "logsBloom" varchar,
  "miner" varchar,
  "mixHash" varchar,
  "nonce" varchar,
  "number" bigint,
  "parentHash" varchar,
  "receiptsRoot" varchar,
  "sealFields" varchar,
  "sha3Uncles" varchar,
  "size" int,
  "stateRoot" varchar,
  "timestamp" int,
  "totalDifficulty" varchar,
  "transactionsRoot" varchar,
  "receivedTimestamp" timestamp,
  "blockTime" int,
  "rank" int,
  "txCount" int,
  "uncleCount" int,
  PRIMARY KEY ("numberPartition", "number", "hash", "timestamp")
) WITH CLUSTERING ORDER BY ("number" DESC, "hash" ASC, "timestamp" DESC);

DROP TABLE IF EXISTS block_transactions;
CREATE TABLE IF NOT EXISTS block_transactions (
  "blockHash" varchar,
  "txHash" varchar,
  PRIMARY KEY ("blockHash", "txHash")
);
DROP INDEX IF EXISTS "idx_block_transactions_txHash"; CREATE INDEX "idx_block_transactions_txHash" on block_transactions ("txHash");

DROP TABLE IF EXISTS block_uncles;
CREATE TABLE IF NOT EXISTS block_uncles (
  "blockHash" varchar,
  "uncleHash" varchar,
  PRIMARY KEY ("blockHash", "uncleHash")
);
DROP INDEX IF EXISTS "idx_block_uncles_uncleHash"; CREATE INDEX "idx_block_uncles_uncleHash" on block_uncles ("uncleHash");

DROP TABLE IF EXISTS block_confirmations1;
CREATE TABLE IF NOT EXISTS block_confirmations1 (
  "nodeName" varchar,
  "blockNumber" bigint,
  "blockHash" varchar,
  "confirmationTimestamp" timestamp,
  "propagationTime" bigint,
  PRIMARY KEY ("nodeName", "confirmationTimestamp")
) WITH CLUSTERING ORDER BY ("confirmationTimestamp" DESC);
DROP INDEX IF EXISTS "idx_block_confirmations1_blockNumber"; CREATE INDEX "idx_block_confirmations1_blockNumber" on block_confirmations1 ("blockNumber");
DROP INDEX IF EXISTS "idx_block_confirmations1_blockHash"; CREATE INDEX "idx_block_confirmations1_blockHash" on block_confirmations1 ("blockHash");

DROP TABLE IF EXISTS block_confirmations2;
CREATE TABLE IF NOT EXISTS block_confirmations2 (
  "blockNumberPartition" bigint,
  "blockNumber" bigint,
  "nodeName" varchar,
  "blockHash" varchar,
  "confirmationTimestamp" timestamp,
  "propagationTime" bigint,
  PRIMARY KEY ("blockNumberPartition", "blockNumber", "nodeName")
) WITH CLUSTERING ORDER BY ("blockNumber" DESC, "nodeName" ASC);

DROP TABLE IF EXISTS usage;
CREATE TABLE IF NOT EXISTS usage (
  "nodeName" varchar,
  "hostCpuLoad" decimal,
  "hostMemTotal" decimal,
  "hostMemUsed" decimal,
  "hostNetRxSec" decimal,
  "hostNetTxSec" decimal,
  "hostFsRxSec" decimal,
  "hostFsWxSec" decimal,
  "hostDiskRIOSec" decimal,
  "hostDiskWIOSec" decimal,
  "nodeCpuLoad" decimal,
  "nodeMemLoad" decimal,
  "clientCpuLoad" decimal,
  "clientMemLoad" decimal,
  "receivedTimestamp" timestamp,
  PRIMARY KEY ("nodeName", "receivedTimestamp")
) WITH CLUSTERING ORDER BY ("receivedTimestamp" DESC);

DROP TABLE IF EXISTS validators;
CREATE TABLE IF NOT EXISTS validators (
  "blockNumberPartition" bigint,
  "blockNumber" bigint,
  "blockHash" varchar,
  "validators" varchar,
  PRIMARY KEY ("blockNumberPartition", "blockNumber", "blockHash")
) WITH CLUSTERING ORDER BY ("blockNumber" DESC);