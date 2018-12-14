export default class AjvError {
  constructor(diContainer) {
    this.lodash = diContainer.lodash;
  }

  getReadableErrorMessages(errors) {
    let errorMessages = [];
    this.lodash.each(errors, error => {
      switch (error.keyword) {
        case 'required':
          errorMessages.push(`Param '${error.params.missingProperty}' is required`);
          break;
        case 'type':
          errorMessages.push(`Param '${error.dataPath.substr(1)}' ${error.message}`);
          break;
        case 'format':
          errorMessages.push(`Param '${error.dataPath.substr(1)}' ${error.message}`);
          break;
        case 'pattern':
          errorMessages.push(`Param '${error.dataPath.substr(1)}' ${error.message}`);
          break;
        case 'contains':
          errorMessages.push(`Param '${error.dataPath.substr(1)}' ${error.message}`);
          break;
        case 'enum':
          errorMessages.push(`Param '${error.dataPath.substr(1)}' ${error.message}: ${error.params.allowedValues.join(', ')}`);
          break;
        case 'additionalProperties':
          errorMessages.push('Should NOT have additional params');
          break;
        default:
          errorMessages.push(error);
          break;
      }
    });

    return errorMessages;
  }
}
