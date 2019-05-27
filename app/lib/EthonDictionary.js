const ethonDictionary = {
  // nodes
  nodeShard: 'ethstats:nodeShard',
  nodeName: 'ethstats:nodeName',
  accountEmail: 'ethstats:accountEmail',
  secretKey: 'ethstats:nodeSecretKey',
  isActive: 'ethstats:nodeIsActive',
  isValidator: 'ethstats:nodeIsValidator',
  lastIp: 'ethstats:lastIp',
  createdTimestamp: 'ethstats:createdTimestamp',
  lastActivityTimestamp: 'ethstats:lastActivityTimestamp',
  lastLoginTimestamp: 'ethstats:lastLoginTimestamp',
  lastLogoutTimestamp: 'ethstats:lastLogoutTimestamp',
  totalOnlineTime: 'ethstats:totalOnlineTime',

  // connection_logs
  isConnected: 'ethstats:isConnected',
  receivedTimestamp: 'ethstats:receivedTimestamp',

  // node_recovery_requests
  recoveryRequestId: 'ethstats:recoveryRequestId',
  recoveryHash: 'ethstats:nodeRecoveryHash',

  // auth_logs
  coinbase: 'ethstats:coinbase',
  node: 'ethstats:node',
  net: 'ethstats:net',
  protocol: 'ethstats:protocol',
  api: 'ethstats:api',
  os: 'ethstats:os',
  osVersion: 'ethstats:osVersion',
  ip: 'ethstats:ip',
  client: 'ethstats:client',
  cpu: 'ethstats:cpu',
  memory: 'ethstats:memory',
  disk: 'ethstats:disk',
  loginTimestamp: 'ethstats:loginTimestamp',
  logoutTimestamp: 'ethstats:logoutTimestamp',
  onlineTime: 'ethstats:onlineTime',

  // syncs
  syncOperation: 'ethstats:syncOperation',
  startingBlock: 'ethstats:startingBlock',
  currentBlock: 'ethstats:currentBlock',
  highestBlock: 'ethstats:highestBlock',

  // stats
  isMining: 'ethstats:isMining',
  peerCount: 'ethstats:numberOfPeers',
  hashrate: 'ethstats:hashrate',
  gasPrice: 'ethstats:gasPrice',
  wsLatency: 'ethstats:wsLatency',

  // blocks
  date: 'ethstats:blockDate',
  difficulty: 'ethon:blockDifficulty',
  extraData: 'ethon:blockExtraData',
  gasLimit: 'ethon:blockGasLimit',
  gasUsed: 'ethon:blockGasUsed',
  hash: 'ethon:blockHash',
  logsBloom: 'ethon:blockLogsBloom',
  miner: 'ethstats:hasAuthorBeneficiary',
  mixHash: 'ethon:blockMixHash',
  nonce: 'ethon:blockNonce',
  number: 'ethon:number',
  numberPartition: 'ethstats:numberPartition',
  parentHash: 'ethstats:hasParentBlock',
  receiptsRoot: 'ethon:receiptsRoot',
  sealFields: 'ethstats:blockSealFields',
  sha3Uncles: 'ethstats:blockSha3Uncles',
  size: 'ethon:blockSize',
  stateRoot: 'ethon:stateRoot',
  timestamp: 'ethon:blockCreationTime',
  totalDifficulty: 'ethon:totalBlockDifficulty',
  transactionsRoot: 'ethon:transactionsRoot',
  blockTime: 'ethstats:blockTime',
  rank: 'ethstats:blockRank',
  txCount: 'alethio:numberOfTxs',
  uncleCount: 'alethio:numberOfUncles',

  blockNumber: 'ethon:number',
  blockHash: 'ethon:blockHash',

  transactions: 'ethstats:containsTxs',
  uncles: 'ethstats:includesUncles',

  // block_transactions
  txHash: 'ethon:txHash',

  // block_uncles
  uncleHash: 'ethstats:uncleHash',

  // block_confirmations
  blockNumberPartition: 'ethstats:blockNumberPartition',
  confirmationTimestamp: 'ethstats:confirmationTimestamp',
  propagationTime: 'ethstats:propagationTime',

  // usage
  hostCpuLoad: 'ethstats:hostCpuLoad',
  hostMemTotal: 'ethstats:hostMemTotal',
  hostMemUsed: 'ethstats:hostMemUsed',
  hostNetRxSec: 'ethstats:hostNetRxSec',
  hostNetTxSec: 'ethstats:hostNetTxSec',
  hostFsRxSec: 'ethstats:hostFsRxSec',
  hostFsWxSec: 'ethstats:hostFsWxSec',
  hostDiskRIOSec: 'ethstats:hostDiskRIOSec',
  hostDiskWIOSec: 'ethstats:hostDiskWIOSec',
  nodeCpuLoad: 'ethstats:nodeCpuLoad',
  nodeMemLoad: 'ethstats:nodeMemLoad',
  clientCpuLoad: 'ethstats:clientCpuLoad',
  clientMemLoad: 'ethstats:clientMemLoad',

  // general
  eventType: 'ethstats:eventType',
  eventTimestamp: 'ethstats:eventTimestamp',
  eventData: 'ethstats:eventData',

  numberMin: 'ethstats:numberMin',
  numberMax: 'ethstats:numberMax',
  totalNodes: 'ethstats:totalNodes',
  count: 'ethstats:count',
  geoPoint: 'geo:point',
  onlineTimePercent: 'ethstats:onlineTimePercent',
  firstLoginTimestamp: 'ethstats:firstLoginTimestamp',

  propagationData: 'ethstats:propagationData',
  propagationAverage: 'ethstats:propagationAverage',
  propagationChartData: 'ethstats:propagationChartData',

  nodeData: 'ethstats:nodeData',
  nodeSyncInfo: 'ethstats:nodeSyncInfo',
  nodeStatistics: 'ethstats:nodeStatistics',
  nodeBlockData: 'ethstats:nodeBlockData',
  nodeUsage: 'ethstats:nodeUsage',

  lastBlockData: 'ethstats:lastBlockData',
  averageBlockTime: 'ethstats:averageBlockTime',
  averageNetworkHashrate: 'ethstats:averageNetworkHashrate',
  nodeCountData: 'ethstats:nodeCountData',

  blockTimeChartData: 'ethstats:blockTimeChartData',
  blockDifficultyChartData: 'ethstats:blockDifficultyChartData',
  transactionsChartData: 'ethstats:transactionsChartData',
  unclesChartData: 'ethstats:unclesChartData',
  gasSpendingChartData: 'ethstats:gasSpendingChartData',
  gasLimitChartData: 'ethstats:gasLimitChartData',
  uncleCountChartData: 'ethstats:uncleCountChartData',
  topMinersChartData: 'ethstats:topMinersChartData',

  blockPropagationChartData: 'ethstats:blockPropagationChartData',
  blockPropagationHistogramData: 'ethstats:blockPropagationHistogramData',
  blockPropagationAverage: 'ethstats:blockPropagationAverage'
};

export default ethonDictionary;
