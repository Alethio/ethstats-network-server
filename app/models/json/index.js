export default diContainer => {
  let modules = diContainer.dirRequire.load(__dirname, {ignore: 'index.js'});
  let models = {};

  diContainer.jsonDB = {
    nodes: [],
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

  Object.keys(modules).forEach(model => {
    if (model !== 'AbstractModel') {
      models[model] = new modules[model](diContainer);
    }
  });

  return models;
};
