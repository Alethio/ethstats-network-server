import nodemailer from 'nodemailer';
import mailgun from 'nodemailer-mailgun-transport';

export default class Mailer {
  constructor(diContainer) {
    this.appConfig = diContainer.appConfig;
    this.log = diContainer.logger;
    this.mailgun = null;

    this.init();
  }

  init() {
    if (this.appConfig.MAILGUN_DOMAIN && this.appConfig.MAILGUN_API_KEY) {
      this.mailgun = nodemailer.createTransport(mailgun({
        auth: {
          domain: this.appConfig.MAILGUN_DOMAIN,
          api_key: this.appConfig.MAILGUN_API_KEY
        }
      }));
    }
  }

  sendMail(params) {
    if (this.mailgun) {
      return this.mailgun.sendMail(params, (error, info) => {
        if (error) {
          this.log.error(`MAILER: ${JSON.stringify(error)}`);
        } else {
          this.log.debug(`MAILER: ${JSON.stringify(info)}`);
        }
      });
    }

    return false;
  }
}
