export default diContainer => {
  let modules = diContainer.dirRequire.load(__dirname, {ignore: 'index.js'});
  let models = {};

  Object.keys(modules).forEach(model => {
    models[model] = new modules[model](diContainer);
  });

  return models;
};
