export default class Session {
  constructor(diContainer) {
    this.log = diContainer.logger;

    this.sessionStorage = {};

    this.getCallerFunction = () => {
      let stack = new Error().stack || '';
      stack = stack.split('\n').map(line => {
        return line.trim();
      });

      let functionName = stack[3].split(' ')[1].split('.')[1];
      return (functionName === '_callee$') ? stack[12].split(' ')[1] : stack[3].split(' ')[1];
    };
  }

  setVar(sessionId, key, value) {
    if (!this.sessionStorage[sessionId]) {
      this.sessionStorage[sessionId] = {};
    }

    this.sessionStorage[sessionId][key] = value;

    return true;
  }

  incVar(sessionId, key, value) {
    if (!this.sessionStorage[sessionId]) {
      this.sessionStorage[sessionId] = {};
    }

    this.sessionStorage[sessionId][key] = (this.sessionStorage[sessionId][key] || 0) + value;

    return true;
  }

  getVar(sessionId, key) {
    let varValue;

    if (this.sessionStorage[sessionId]) {
      varValue = this.sessionStorage[sessionId][key];
    } else {
      this.log.info(`[${sessionId}] - [${this.getCallerFunction()}] - Client not logged in or session does not exist !`);
    }

    return varValue;
  }

  getAll(sessionId) {
    let sessionData = {};

    if (this.sessionStorage[sessionId]) {
      sessionData = this.sessionStorage[sessionId];
    } else {
      this.log.info(`[${sessionId}] - [${this.getCallerFunction()}] - Client not logged in or session does not exist !`);
    }

    return sessionData;
  }

  delete(sessionId) {
    if (this.sessionStorage[sessionId]) {
      delete this.sessionStorage[sessionId];
      return true;
    }

    return false;
  }
}
