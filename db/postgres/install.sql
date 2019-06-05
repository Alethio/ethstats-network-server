DROP TABLE IF EXISTS public.connection_logs;
CREATE TABLE IF NOT EXISTS public.connection_logs
(
  "nodeName" text NOT NULL,
  "isConnected" boolean,
  "receivedTimestamp" timestamp,
  PRIMARY KEY ("nodeName", "receivedTimestamp")
);

DROP TABLE IF EXISTS public.nodes;
CREATE TABLE IF NOT EXISTS public.nodes
(
  "nodeShard" text NOT NULL,
  "nodeName" text NOT NULL,
  "accountEmail" text,
  "secretKey" text,
  "isActive" boolean,
  "lastIp" text,
  "createdTimestamp" timestamp,
  "lastActivityTimestamp" timestamp,
  "lastLoginTimestamp" timestamp,
  "lastLogoutTimestamp" timestamp,
  "totalOnlineTime" bigint,
  PRIMARY KEY ("nodeShard", "nodeName")
);

INSERT INTO nodes
(
  "nodeShard",
  "nodeName",
  "accountEmail",
  "secretKey",
  "lastIp",
  "createdTimestamp"
) VALUES ('k', 'Kohera', 'adrian.sabau@consensys.net', '34c6227031eacdc43b0e9945567b4384a556f19f', '79.118.23.137', '2015-07-30 00:00:00');

DROP TABLE IF EXISTS public.node_recovery_requests;
CREATE TABLE IF NOT EXISTS public.node_recovery_requests
(
  "recoveryRequestId" text,
  "recoveryHash" text,
  "accountEmail" text,
  "nodeName" text,
  "createdTimestamp" timestamp,
  PRIMARY KEY ("recoveryRequestId", "recoveryHash")
);

DROP TABLE IF EXISTS public.auth_logs;
CREATE TABLE IF NOT EXISTS public.auth_logs
(
	"nodeName" text,
  "coinbase" text,
  "node" text,
  "net" text,
  "protocol" text,
  "api" text,
  "os" text,
  "osVersion" text,
  "ip" text,
  "client" text,
  "cpu" text,
  "memory" text,
  "disk" text,
  "loginTimestamp" timestamp,
  "logoutTimestamp" timestamp,
  "onlineTime" bigint,
  PRIMARY KEY ("nodeName", "loginTimestamp")
);

INSERT INTO auth_logs
(
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

DROP TABLE IF EXISTS public.syncs;
CREATE TABLE IF NOT EXISTS public.syncs
(
  "nodeName" text,
  "syncOperation" text,
  "startingBlock" bigint,
  "currentBlock" bigint,
  "highestBlock" bigint,
  "receivedTimestamp" timestamp,
  PRIMARY KEY ("nodeName", "receivedTimestamp")
);

DROP TABLE IF EXISTS public.stats;
CREATE TABLE IF NOT EXISTS public.stats
(
  "nodeName" text,
  "isMining" boolean,
  "peerCount" int,
  "hashrate" text,
  "gasPrice" text,
  "wsLatency" int,
  "receivedTimestamp" timestamp,
  PRIMARY KEY ("nodeName", "receivedTimestamp")
);

INSERT INTO stats
(
  "nodeName",
  "isMining",
  "peerCount",
  "hashrate",
  "gasPrice",
  "wsLatency",
  "receivedTimestamp"
) VALUES ('Kohera', false, 50, '0', '0', 1, '2015-07-30 00:00:00');

DROP TABLE IF EXISTS public.blocks;
CREATE TABLE IF NOT EXISTS public.blocks
(
  "date" int,
  "difficulty" text,
  "extraData" text,
  "gasLimit" bigint,
  "gasUsed" bigint,
  "hash" text,
  "logsBloom" text,
  "miner" text,
  "mixHash" text,
  "nonce" text,
  "number" bigint,
  "parentHash" text,
  "receiptsRoot" text,
  "sealFields" text,
  "sha3Uncles" text,
  "size" int,
  "stateRoot" text,
  "timestamp" int,
  "totalDifficulty" text,
  "transactionsRoot" text,
  "receivedTimestamp" timestamp,
  "blockTime" int,
  "rank" int,
  "txCount" int,
  "uncleCount" int,
  PRIMARY KEY ("date", "number", "hash", "timestamp")
);
CREATE INDEX "blocks_number_idx" on blocks ("number");

DROP TABLE IF EXISTS public.block_transactions;
CREATE TABLE IF NOT EXISTS public.block_transactions
(
  "blockHash" text,
  "txHash" text,
  PRIMARY KEY ("blockHash", "txHash")
);

DROP TABLE IF EXISTS public.block_uncles;
CREATE TABLE IF NOT EXISTS public.block_uncles
(
  "blockHash" text,
  "uncleHash" text,
  PRIMARY KEY ("blockHash", "uncleHash")
);

DROP TABLE IF EXISTS public.block_confirmations;
CREATE TABLE IF NOT EXISTS public.block_confirmations
(
  "nodeName" text,
  "blockNumber" bigint,
  "blockHash" text,
  "confirmationTimestamp" timestamp,
  "propagationTime" bigint,
  PRIMARY KEY ("nodeName", "confirmationTimestamp")
);
CREATE INDEX "block_confirmations_blockNumber_idx" on block_confirmations ("blockNumber");
CREATE INDEX "block_confirmations_blockHash_idx" on block_confirmations ("blockHash");

DROP TABLE IF EXISTS public.usage;
CREATE TABLE IF NOT EXISTS public.usage
(
  "nodeName" text,
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
);

DROP TABLE IF EXISTS public.validators;
CREATE TABLE IF NOT EXISTS public.validators
(
  "blockNumber" bigint,
  "blockHash" text,
  "validators" text,
  PRIMARY KEY ("blockNumber", "blockHash")
);
