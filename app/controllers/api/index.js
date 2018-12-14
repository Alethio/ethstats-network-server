export default diContainer => {
  let modules = diContainer.dirRequire.load(__dirname, {ignore: 'index.js'});
  let controllers = {};

  Object.keys(modules).forEach(controller => {
    controllers[controller] = new modules[controller](diContainer);
  });

  return controllers;
};
