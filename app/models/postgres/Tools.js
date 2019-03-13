import AbstractModel from './AbstractModel';

export default class Tools extends AbstractModel {
  async truncateAllTables(truncateNodesTable = false) {
    let results = [];
    let tables = [
      'connection_logs',
      'auth_logs',
      'syncs',
      'stats',
      'blocks',
      'block_transactions',
      'block_uncles',
      'block_confirmations',
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

  checkIfTablesExists() {
    let query = `SELECT *
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN (
        'nodes',
        'connection_logs',
        'auth_logs',
        'syncs',
        'stats',
        'blocks',
        'block_transactions',
        'block_uncles',
        'block_confirmations',
        'usage',
        'node_recovery_requests'
    )`;
    let queryParams = [];
    let result = true;

    return this.executeQuery(query, queryParams).then(data => {
      if (data && data.rowLength === 0) {
        result = false;
      }

      return result;
    });
  }
}
