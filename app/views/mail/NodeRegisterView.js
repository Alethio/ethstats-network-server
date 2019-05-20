const clientConfigs = require(`../../../config/ClientConfigs.${process.env.ENVIRONMENT}.js`);

export default class NodeRegisterView {
  constructor(params) {
    this.nodeName = params.nodeName;
    this.secretKey = params.secretKey;
    this.showGethHelp = params.showGethHelp;
    this.serverUrl = (clientConfigs.serverUrl[params.networkName] || clientConfigs.serverUrl.mainnet).url.replace('https://', 'wss://').replace(':443', '');
    this.dashboardUrl = (clientConfigs.dashboardUrl[params.networkName] || clientConfigs.dashboardUrl.mainnet).url;

    this.secretKeyText = this.secretKey === undefined ? '.' : ` and this is your assigned secret key: <b>${this.secretKey}</b>`;
    this.gethText = this.showGethHelp === true ? `To start contributing please run your Geth instance by adding the option below:<br>
    --ethstats ${this.nodeName}:${this.secretKey}@${this.serverUrl}<br><br><br>` : '';

    this.view = {
      from: 'EthStats Support support@ethstats.io',
      'h:Reply-To': 'support@ethstats.io',
      subject: 'Your node is registered on EthStats',
      html: `<div style="font-family:Arial;font-size:14px;">
<img src="https://d4f3axkh2ke89.cloudfront.net/ethstats-mail-header-node-register.gif" style="height: 200px;">
<br>
<br>
Node doubt about it,<br>
you’re now part of the EthStats network!<br>
<br>
<br>
Your node, <b>${this.nodeName}</b> has been successfully added to the platform for the ${params.networkName.toUpperCase()} network${this.secretKeyText}<br>
<br>
<br>
${this.gethText}
You can see the activity of your node here: ${this.dashboardUrl}<br>
Don't forget we're always around to help you, so please get in touch with us for any questions or requests at <a href="mailto:support@ethstats.io">support@ethstats.io</a>.<br>
<br>
<br>
Power to connected nodes!<br>
the EthStats Support Crew<br>
<br>
<br>
</div>`
    };

    return this.view;
  }
}
