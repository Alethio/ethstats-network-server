import AbstractController from './AbstractController.js';

export default class ToolsController extends AbstractController {
  hardReset(request, response) {
    let responseObject = this.lodash.cloneDeep(this.responseObject);

    this.models.Tools.truncateAllTables().then(data => {
      let errors = [];
      data.forEach(result => {
        if (result.constructor.name === 'ResponseError') {
          errors.push(result.message);
        }
      });

      this.cache.flushDb();

      if (errors.length) {
        responseObject.statusCode = 400;
        responseObject.body.success = false;
        responseObject.body.errors.push('There seem to be some problems executing this request');
      }

      return response.status(responseObject.statusCode).json(responseObject);
    });
  }
}
