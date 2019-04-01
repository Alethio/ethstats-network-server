export default class Logger {
  constructor(diContainer) {
    this.appConfig = diContainer.appConfig;
    this.chalk = diContainer.chalk;
    this.prometheusMetrics = null;

    this.showDateTime = this.appConfig.LOG_SHOW_DATETIME;
    this.showInfos = this.appConfig.LOG_SHOW_INFOS;
    this.showWarnings = this.appConfig.LOG_SHOW_WARNINGS;
    this.showErrors = this.appConfig.LOG_SHOW_ERRORS;
    this.showDebugs = this.appConfig.LOG_SHOW_DEBUGS;
    this.showAsJson = this.appConfig.LOG_SHOW_AS_JSON;
  }

  _log(type, string) {
    let dateTime = new Date().toISOString().replace('T', ' ').replace('Z', '');
    let resultString = `${(this.showDateTime) ? dateTime + ' - ' : ''}%LOG-TYPE%: ${string}`;

    if (this.showAsJson) {
      let output = {
        time: dateTime,
        level: type,
        msg: string
      };
      console.log(JSON.stringify(output));
    } else {
      switch (type) {
        case 'echo':
          console.log(string);
          break;
        case 'info':
          console.log(this.chalk.white(resultString.replace('%LOG-TYPE%', 'INFO')));
          break;
        case 'debug':
          console.log(this.chalk.cyan(resultString.replace('%LOG-TYPE%', 'DEBUG')));
          break;
        case 'warning':
          console.log(this.chalk.yellow(resultString.replace('%LOG-TYPE%', 'WARNING')));
          break;
        case 'error':
          console.log(this.chalk.red(resultString.replace('%LOG-TYPE%', 'ERROR')));
          break;
        default:
          console.log('Logger: Unknown type');
      }
    }
  }

  echo(string) {
    if (this.showInfos) {
      this._log('info', string);
    } else {
      this._log('echo', string);
    }
  }

  info(string) {
    if (this.showInfos) {
      this._log('info', string);
    }
  }

  debug(string) {
    if (this.showDebugs) {
      this._log('debug', string);
    }
  }

  warning(string) {
    if (this.showWarnings) {
      this._log('warning', string);
    }
  }

  error(string) {
    this.prometheusMetrics.ethstats_server_errors_total.inc(1, Date.now());

    if (this.showErrors) {
      this._log('error', string);
    }
  }
}
