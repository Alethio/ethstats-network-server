import AbstractModel from './AbstractModel';

export default class Tools extends AbstractModel {
  async truncateAllTables(truncateNodesTable = false) {
    let results = [];

    this.jsonDB = {
      node_recovery_requests: [],
      connection_logs: [],
      auth_logs: [],
      syncs: [],
      stats: [],
      blocks: [],
      block_transactions: [],
      block_uncles: [],
      block_confirmations: [],
      usage: [],
      validators: []
    };

    if (truncateNodesTable) {
      this.jsonDB.nodes = [];
    }

    return results;
  }
}
