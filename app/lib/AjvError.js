export default class AjvError {
  constructor(diContainer) {
    this.lodash = diContainer.lodash;
  }

  getReadableErrorMessages(errors) {
    let errorMessages = [];
    let additionalPropertiesAlreadyExists = false;

    this.lodash.each(errors, error => {
      let param = (error.dataPath === '') ? '' : `'${error.dataPath.substr(1)}' `;
      switch (error.keyword) {
        case 'required':
          errorMessages.push(`Param '${error.params.missingProperty}' is required`);
          break;
        case 'type':
          errorMessages.push(`Param ${param}${error.message}`);
          break;
        case 'format':
          errorMessages.push(`Param ${param}${error.message}`);
          break;
        case 'pattern':
          errorMessages.push(`Param ${param}${error.message}`);
          break;
        case 'contains':
          errorMessages.push(`Param ${param}${error.message}`);
          break;
        case 'enum':
          errorMessages.push(`Param ${param}${error.message}: ${error.params.allowedValues.join(', ')}`);
          break;
        case 'additionalProperties': {
          if (!additionalPropertiesAlreadyExists) {
            additionalPropertiesAlreadyExists = true;
            errorMessages.push('Should NOT have additional params');
          }

          break;
        }

        default:
          errorMessages.push(error);
          break;
      }
    });

    return errorMessages;
  }
}
