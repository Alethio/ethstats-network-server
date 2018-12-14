export default class NodeRecoveryRequestView {
  constructor(params) {
    this.recoveryHashes = params.recoveryHashes;
    this.hashExpire = params.hashExpire;

    this.view = {
      from: 'EthStats Support support@ethstats.io',
      'h:Reply-To': 'support@ethstats.io',
      subject: 'Finalize your node recovery process',
      html: `<div style="font-family:Arial;font-size:14px;">
Hello explorer!<br>
<br>
<br>
You recently initiated a node recovery request and we are sending you below the recovery hash(es) for your node(s). Select the recovery hash corresponding to the node name you wish to recover and use it in the EthStats-Cli application.<br>
Please keep in mind that all recovery hashes are set to expire in ${this.hashExpire} minutes.<br>
<br>
<br>
${this.getNodesTable()}
<br>
<br>
Need more assistance in the process? Get in touch with us at <a href="mailto:support@ethstats.io">support@ethstats.io</a>.<br>
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

  getNodesTable() {
    let table = '<table cellspacing="0" cellpadding="5" border="1" style="width:400px;border:1px solid black;">';
    table += '<tr style="font-weight:bold;"><td style="width:200px;">Node name</td><td style="width:200px;">Recovery Hash</td></tr>';

    this.recoveryHashes.forEach(node => {
      table += `<tr><td>${node.nodeName}</td><td>${node.recoveryHash}</td></tr>`;
    });

    table += '</table>';

    return table;
  }
}
