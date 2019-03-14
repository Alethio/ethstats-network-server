import AbstractModel from './AbstractModel';

export default class Tools extends AbstractModel {
  async truncateAllTables(truncateNodesTable = false) {
    let results = [];
    let tables = [
      'connection_logs',
      'auth_logs',
      'syncs',
      'stats',
      'blocks1',
      'blocks2',
      'block_transactions',
      'block_uncles',
      'block_confirmations1',
      'block_confirmations2',
      'usage',
      'node_recovery_requests'
    ];

    if (truncateNodesTable) {
      tables.push('nodes');
    }

    for (let table of tables) {
      results.push(this.executeQuery(`TRUNCATE TABLE ${table}`, []));
    }

    return Promise.all(results);
  }
}
