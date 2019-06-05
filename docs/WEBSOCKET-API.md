# WebSocket API

EthStats server uses web socket communication to receive and request data. The official client application that can talk to EthStats platform is [ethstats-cli](https://github.com/Alethio/ethstats-cli).
It is possible to talk directly to the server by exchanging JSON data format messages.
  
## Contents
 - [Connecting to server](#connecting-to-server)
 - [Messages](#messages)
 - [Topics](#topics) 

## Connecting to server

To talk to one of the EthStats servers use the following endpoints depending on the network for which you want to send data:

| Network     | URL                                         |
|-------------|---------------------------------------------|
| mainnet     | https://server.ethstats.io/api              |
| rinkeby     | https://server.rinkeby.ethstats.io/api      |
| goerli      | https://server.goerli.ethstats.io/api       |

Example:
```bash
wscat -c https://server.ethstats.io/api
connected (press CTRL+C to quit)
>
```

Examples are done using [wscat](https://www.npmjs.com/package/wscat). Very easy and lightweight websocket client to test the provided examples. 

## Messages

The communication consists in exchanging messages organised in topics with a specific payload. 
They are JSON objects with the following schema:

```json
{
  "topic": "topicName", 
  "payload": {}
}
```

- topic - message category
- payload - data placeholder specific to a topic, can be object or an array of objects.

Let's take for example the login process. To login on the server, a message needs to be sent with the topic **`login`** with all necessary login information like username and secret key included in the payload.
  
Every message sent as a request to or from the server, after processing it, a response message needs to be sent back to the requester with the following schema: 

```json
{
  "topic": "topicNameResponse",
  "payload": {
    "success": true,
    "data": [],
    "dataLength": 0,
    "warnings": [],
    "errors": []
  }
}
```
In the example above with the login process the response message will have the topic **`loginResponse`**.
 
## Topics
Topics are categories used to organize the messages sent to or from the server. 
Every message should have a topic attached to it, otherwise the message is discarded.

Topics are classified in 2 types: 
- **Server topics**, on which the server listens for messages as requests or responses from the client.
- **Client topics**, on which the client needs to listen for messages as requests or responses from the server.

For example a block message needs to be sent to the server. The server listens on the topic **`block`** (server topic) for this kind of messages. 
After processing the received block the server will send back a response message on topic **`blockResponse`** (client topic) with the result of the processing.

There are cases when the server needs data from the client on request. These can be network detection requests, ping requests to calculate the latency, etc... 
For this the client needs to listen for messages on the client topics and after processing, response messages are mandatory to send back to the server.

If a request fails, error messages are provided by the server and also the client should provide in the `errors` or `warnings` attribute of the response payload. 

In the table bellow you can find the list of topics on which the `server` is listening for messages and the corresponding topics on which a response will be sent back:

| Server Topic                            | Client Topic                                              |
|-----------------------------------------|-----------------------------------------------------------|
| [registerNode](#registerNode)           | [registerNodeResponse](#registerNodeResponse)             |
| [login](#login)                         | [loginResponse](#loginResponse)                           |
| [logout](#logout)                       | [logoutResponse](#logoutResponse)                         |
| [sendRecoveryEmail](#sendRecoveryEmail) | [sendRecoveryEmailResponse](#sendRecoveryEmailResponse)   |
| [recoverNode](#recoverNode)             | [registerNodeResponse](#registerNodeResponse)             |
| [connection](#connection)               | [connectionResponse](#connectionResponse)                 |
| [block](#block)                         | [blockResponse](#blockResponse)                           |
| [validators](#validators)               | [validatorsResponse](#validatorsResponse)                 |
| [sync](#sync)                           | [syncResponse](#syncResponse)                             |
| [stats](#stats)                         | [statsResponse](#statsResponse)                           |
| [usage](#usage)                         | [usageResponse](#usageResponse)                           |

In the table bellow you can find the list of topics on which the `client` **must** listen for messages and the corresponding topics on which a response must be sent back:

| Client Topic                                          | Server Topic                                      |
|-------------------------------------------------------|---------------------------------------------------|
| [invalidMessage](#invalidMessage)                     | none                                              |
| [clientTimeout](#clientTimeout)                       | none                                              |
| [requestRateLimitReached](#requestRateLimitReached)   | none                                              |
| [ping](#ping)                                         | [pong](#pong)                                     |
| [pongResponse](#pongResponse)                         | none                                              |
| [checkChain](#checkChain)                             | [checkChainData](#checkChainData)                 |
| [checkChainResponse](#checkChainResponse)             | none                                              |
| [getBlocks](#getBlocks)                               | [getBlocksData](#getBlocksData)                   |
| [getBlocksResponse](#getBlocksResponse)               | none                                              |

#### registerNode
Register new Ethereum nodes into EthStats platform.
Every node for which the analytics data is sent to the server, first it needs to be registered.

Payload attributes: 

| Attribute     | Type            | Mandatory         | Description             |
|---------------|-----------------|-------------------|-------------------------|
| accountEmail  | string          | yes               | Email address of the node owner. Multiple node registration is possible under the same email account. |
| nodeName      | string          | yes               | Name of the node you want to register that will be visible in the list of nodes in the dashboard. Must be a unique value. Node names cannot be duplicated. |

```json
{
  "topic": "registerNode",
  "payload": {
    "accountEmail": "name@domain.com",
    "nodeName": "test-node"
  }
}
```

#### registerNodeResponse
On successful registration a secret key is returned in the response message that can be used in the login process. 

```json
{
  "topic": "registerNodeResponse",
  "payload": {
    "success": true,
    "data": [
      {
        "accountEmail": "name@domain.com",
        "nodeName": "test-node",  
        "secretKey": "xxxxxxxxx"
      }
    ],
    "dataLength": 1,
    "warnings": [],
    "errors": []
  }
}
```

Example using wscat:
```bash
> {"topic":"registerNode","payload":{"accountEmail":"name@domain.com","nodeName":"test-node"}}
< {"topic":"registerNodeResponse","payload":{"success":true,"data":[{"accountEmail":"name@domain.com","nodeName":"test-node","secretKey":"xxxxxxxxx"}],"dataLength":1,"warnings":[],"errors":[]}}
```

---

#### login
Topic used to listen for authentication messages into EthStats platform. Beside the node name and secret key there are also required some node information in the payload. 
The secret key required to authenticate is provided through `registerNode`. 

Payload attributes: 

| Attribute     | Type            | Mandatory         | Description             |
|---------------|-----------------|-------------------|-------------------------|
| nodeName      | string          | yes               | Name of an already registered node. |
| secretKey     | string          | yes               | Secret key received upon registration of the node. |
| os            | string          | yes               | Name of the operating system the node is running on. |
| osVersion     | string          | yes               | Version of the operating system the node is running on. |
| client        | string          | yes               | Client version. E.q. `ethstats-cli` sends its version. In case the data is sent directly from the node, its version should be sent. |
| coinbase      | string          | no                | Node coinbase address to which mining rewards will go, if the node is mining. [Web3](https://web3js.readthedocs.io) example: `web3.eth.getCoinbase`. | 
| node          | string          | no                | Node information containing name and version. [Web3](https://web3js.readthedocs.io) exmaple: `web3.eth.getNodeInfo`. |
| net           | integer, string | yes               | Network ID the node is running on. [Web3](https://web3js.readthedocs.io) example: `web3.eth.net.getId`. |
| protocol      | number, string  | no                | Ethereum protocol version of the node. [Web3](https://web3js.readthedocs.io) example: `web3.eth.getProtocolVersion`. |
| api           | string          | no                | API version used to extract data from the node. [Web3](https://web3js.readthedocs.io) example: `web3.version`. |
| cpu           | string          | no                | CPU information of the machine the node is running on. [SystemInformation](https://www.npmjs.com/package/systeminformation) example: `si.getCpuInfo`. |
| memory        | string          | no                | Memory information of the machine the node is running on. [SystemInformation](https://www.npmjs.com/package/systeminformation) example: `si.getMemoryInfo`. |
| disk          | string          | no                | Disk information of the machine the node is running on. [SystemInformation](https://www.npmjs.com/package/systeminformation) example: `si.getDiskInfo`. |

```json
{
  "topic": "login",
  "payload": {
    "nodeName": "test-node",
    "secretKey": "xxxxxxxxx",
    "os": "Darwin",
    "osVersion": "18.5.0",
    "client": "2.4.19",
    "coinbase": "0x0000000000000000000000000000000000000000",
    "node": "Parity-Ethereum//v2.3.5-stable-ebd0fd0-20190227/x86_64-linux-gnu/rustc1.32.0",
    "net": "1",
    "protocol": "63",
    "api": "0.20.7",
    "cpu": "{\"manufacturer\":\"Intel®\",\"brand\":\"Core™ i7-4870HQ\",\"speed\":\"2.50\"}",
    "memory": "[{\"size\":8589934592,\"type\":\"DDR3\",\"clockSpeed\":1600,\"manufacturer\":\"Hynix Semiconductor Inc.\"},{\"size\":8589934592,\"type\":\"DDR3\",\"clockSpeed\":1600,\"manufacturer\":\"Hynix Semiconductor Inc.\"}]",
    "disk": "[{\"size\":500277790720,\"type\":\"SSD\",\"name\":\"APPLE SSD SM0512G\",\"vendor\":\"\"}]"
  }
}
```

#### loginResponse
On successful login the data attribute in the response payload will contain the node name.

```json
{
  "topic": "loginResponse",
  "payload": {
    "success": true,
    "data": [
      {
        "nodeName": "test-node"
      }
    ],
    "dataLength": 0,
    "warnings": [],
    "errors": []
  }
}
```

Example using wscat:
```bash
> {"topic":"login","payload":{"nodeName":"test-node","secretKey":"b25b06fd4334575a99bc307ba983b600d7a4bbea","os":"Darwin","osVersion":"18.5.0","client":"2.4.19","coinbase":"0x0000000000000000000000000000000000000000","node":"Parity-Ethereum//v2.3.5-stable-ebd0fd0-20190227/x86_64-linux-gnu/rustc1.32.0","net":"1","protocol":"63","api":"0.20.7","cpu":"{\"manufacturer\":\"Intel®\",\"brand\":\"Core™ i7-4870HQ\",\"speed\":\"2.50\"}","memory":"[{\"size\":8589934592,\"type\":\"DDR3\",\"clockSpeed\":1600,\"manufacturer\":\"Hynix Semiconductor Inc.\"},{\"size\":8589934592,\"type\":\"DDR3\",\"clockSpeed\":1600,\"manufacturer\":\"Hynix Semiconductor Inc.\"}]","disk":"[{\"size\":500277790720,\"type\":\"SSD\",\"name\":\"APPLE SSD SM0512G\",\"vendor\":\"\"}]"}}
< {"topic":"loginResponse","payload":{"success":true,"data":[{"nodeName":"test-node"}],"dataLength":0,"warnings":[],"errors":[]}}
```

---

#### logout
Topic used to listen for logout messages from EthStats platform. The payload for this message should be an empty object. 

```json
{
  "topic": "logout",
  "payload": {}
}
```

#### logoutResponse
On successful logout the data attribute in the response payload will contain the node name.

```json
{
  "topic": "logoutResponse",
  "payload": {
    "success": true,
    "data": [
      {
        "nodeName": "test-node"
      }
    ],
    "dataLength": 1,
    "warnings": [],
    "errors": []
  }
}
```

Example using wscat:
```bash
> {"topic":"logout","payload":{}}
< {"topic":"logoutResponse","payload":{"success":true,"data":[{"nodeName":"test-node"}],"dataLength":1,"warnings":[],"errors":[]}}
```

---

#### sendRecoveryEmail
If the secret key is lost and the same node name previously registered is wanted, there is possible to recover it by generating a new secret key.
This topic will listen for messages with the `emailAccount` in the payload for which the node was registered.

See the [response](#sendRecoveryEmailResponse) for more details on the recovery process.

Payload attributes: 

| Attribute     | Type            | Mandatory         | Description             |
|---------------|-----------------|-------------------|-------------------------|
| accountEmail  | string          | yes               | Email address of the node owner. |

```json
{
  "topic": "sendRecoveryEmail",
  "payload": {
    "accountEmail": "name@domain.com"
  }
}
```

#### sendRecoveryEmailResponse
On successful request to send recovery email, an email will be sent to the provided address containing a list with all registered nodes together with a corresponding recovery hash for each one.

The response message will contain in the payload data attribute a `recoveryRequestId` **valid for 30 min**, that later can be used together with any recovery hash received in the email to recover the desired node.

More on how to actually recover the node go to [recoverNode](#recoverNode) topic.

```json
{
  "topic": "sendRecoveryEmailResponse",
  "payload": {
    "success": true,
    "data": [
      {
        "recoveryRequestId": "6b8eb4623dc2b0e1e3faa74a1be0a45e8a4d0be6"
      }
    ],
    "dataLength": 1,
    "warnings": [],
    "errors": []
  }
}
```

Example using wscat:
```bash
> {"topic":"sendRecoveryEmail","payload":{"accountEmail":"name@domain.com"}}
< {"topic":"sendRecoveryEmailResponse","payload":{"success":true,"data":[{"recoveryRequestId":"6b8eb4623dc2b0e1e3faa74a1be0a45e8a4d0be6"}],"dataLength":1,"warnings":[],"errors":[]}}
```

---

#### recoverNode
Opic used for listening for messages that can recover nodes with lost secret keys by generating new ones.
After requesting a `sendRecoveryEmail` and receiving the email with the recovery hashes, a message needs to be sent to this topic in oder to receive a new secret key.

Payload attributes: 

| Attribute             | Type            | Mandatory         | Description             |
|-----------------------|-----------------|-------------------|-------------------------|
| recoveryRequestId     | string          | yes               | The ID received in the response for the `sendRecoveryEmail` message. |
| nodeRecoveryHash      | string          | yes               | The recovery hash received in the email for the node that is desired to get a new secret key . |

```json
{
  "topic": "recoverNode",
  "payload": {
    "recoveryRequestId": "6b8eb4623dc2b0e1e3faa74a1be0a45e8a4d0be6",
    "nodeRecoveryHash": "6z0ds2o04a"
  }
}
```

#### registerNodeResponse
On successful node recovery a new secret key is returned in the response message that can be used in the login process. 

```json
{
  "topic": "registerNodeResponse",
  "payload": {
    "success": true,
    "data": [
      {
        "accountEmail": "name@domain.com",
        "nodeName": "test-node",  
        "secretKey": "xxxxxxxxx"
      }
    ],
    "dataLength": 1,
    "warnings": [],
    "errors": []
  }
}
```

Example using wscat:
```bash
> {"topic":"recoverNode","payload":{"recoveryRequestId":"6b8eb4623dc2b0e1e3faa74a1be0a45e8a4d0be6","nodeRecoveryHash":"6z0ds2o04a"}}
< {"topic":"registerNodeResponse","payload":{"success":true,"data":[{"accountEmail":"name@domain.com","nodeName":"test-node","secretKey":"xxxxxxxxx"}],"dataLength":1,"warnings":[],"errors":[]}}
```

---

#### connection
Topic used to listen for messages to provide connection information with the node. If a 3rd party client app is used to collect data from a node (e.q. `ethstats-cli`), it should provide connection information with the Ethereum node.
For example if the node is stopped the client app should send a connection message, containing the state of the connection, in this case `false` in the payload.
The client app should wait for the node to be back up and if successful reconnected should send a `true` status.

Payload attributes: 

| Attribute     | Type            | Mandatory         | Description             |
|---------------|-----------------|-------------------|-------------------------|
| isConnected   | boolean         | yes               | Connection status. True -> connected. False -> not connected. |

```json
{
  "topic": "connection",
  "payload": {
    "isConnected": true
  }
}
```

#### connectionResponse
On successful connection message sent to the server, the `success` attribute is set to true and the data attribute will be empty in the response payload.

```json
{
  "topic": "connectionResponse",
  "payload": {
    "success": true,
    "data": [],
    "dataLength": 0,
    "warnings": [],
    "errors": []
  }
}
```

Example using wscat:
```bash
> {"topic":"connection","payload":{"isConnected": true}}
< {"topic":"connectionResponse","payload":{"success":true,"data":[],"dataLength":0,"warnings":[],"errors":[]}}
```

---

#### block
Topic used to listen for messages containing the header of the best block received or mined by the node.

Payload attributes: 

| Attribute         | Type            | Mandatory         | Description             |
|-------------------|-----------------|-------------------|-------------------------|
| author            | string          | no               | The address of the author of the block (address of the beneficiary to whom the mining rewards are given). |
| difficulty        | string          | yes               | The difficulty for this block. |
| extraData         | string          | yes               | The "extra data" field of this block. |
| gasLimit          | integer         | yes               | The maximum gas allowed in this block. |
| gasUsed           | integer         | yes               | The total used gas by all transactions in this block. |
| hash              | string          | yes               | Hash of the block. | 
| logsBloom         | string          | no               | The bloom filter for the logs of the block. |
| miner             | string          | yes               | The address of the beneficiary to whom the mining rewards are given. |
| mixHash           | string          | no               | Hash of the intermediary generated proof-of-work. |
| nonce             | string          | no               | Hash of the generated proof-of-work. |
| number            | integer         | yes               | The block number. |
| parentHash        | string          | yes               | Hash of the parent block. |
| receiptsRoot      | string          | no               | The root of the receipts trie of the block. |
| sealFields        | array           | no               | An array containing all engine specific fields. |
| sha3Uncles        | string          | no               | SHA3 of the uncles data in the block. |
| size              | integer         | no               | The size of this block in bytes. |
| stateRoot         | string          | yes               | The root of the final state trie of the block. |
| timestamp         | integer         | yes               | The unix timestamp for when the block was collated. |
| totalDifficulty   | string          | yes               | The total difficulty of the chain until this block. |
| transactionsRoot  | string          | yes               | The root of the transaction trie of the block. |
| transactions      | array           | yes               | Array containing transaction hashes. |
| uncles            | array           | yes               | Array containing uncle hashes. |

```json
{
  "topic": "block",
  "payload": {
    "author": "0xea674fdde714fd979de3edf0f56aa9716b898ec8",
    "difficulty": "1819235038152977",
    "extraData": "0x505059452d65746865726d696e652d61736961312d34",
    "gasLimit": 8000000,
    "gasUsed": 4900294,
    "hash": "0x1696c53da4a8cd439ed6833b990edcb36269e2b7b98144fa69e054a88c199ef6",
    "logsBloom": "0xc04c0c8602c5001a20005202000008a282a5818f075000185112a04001581188401c4c00e818008021022cea5440480e82402412088040e15808610000b1412804802701086004280813000c2424087d00190101028001010e19c8509013100000b04140132a4280852a60500002884a0862900818840058401119914644050a080002040050d02c800003a58040080c3b120020e5cd0e201442602814044130068184100040800a9a81209cc1f8140e01640600448980a01910d1001b28084010884c12580e008600c14468116803228612a805412a901421880a400112a00b201124a0a1e18080100052800c023074918b8084a000069122a8910232a02482",
    "miner": "0xea674fdde714fd979de3edf0f56aa9716b898ec8",
    "mixHash": "0xa588eaeaf5186bf07d1ed9027b27fe50acb9b25d3ca6beeb5e573e40f6a6a0d2",
    "nonce": "0xa2fae7a6696b2609",
    "number": 7642556,
    "parentHash": "0x6823fd5ca071a9c90d05515cb3bcc618855c91fd935bb1dd31af5445d3c19bf9",
    "receiptsRoot": "0xc80ec6684fb97e6e02b536a4b4fd5b701c84e8bfdb9c874c818640773d80bbd5",
    "sealFields": [
      "0xa0a588eaeaf5186bf07d1ed9027b27fe50acb9b25d3ca6beeb5e573e40f6a6a0d2",
      "0x88a2fae7a6696b2609"
    ],
    "sha3Uncles": "0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347",
    "size": 20036,
    "stateRoot": "0x4e80a434a20fc9e0ed0ef2b8d2ba2958201b752e1cf76dae98a5d4710de19f93",
    "timestamp": 1556276014,
    "totalDifficulty": "9.969850712079172712442e+21",
    "transactions": [
      "0xae00f7e686c0d1ab05520d455533d47a6437516e2b6ab6b4e7278f83efc7f3b6",
      "0x38a4e2d77cee0f19f4a3e8002b2ba3a456ce3db27e5ca2fd8d440c8a8747fb5c",
      "0xfe8e653259d36230d48ffab1d3dc0c292d8c02eb5920233950e9b19556dafe5e",
      "0xf4d54525d369df1c05288f755eb8da1370dad15db8b3dab008d4ad7b0ff385b3",
      "0xb07118cb0d8d58da504ae0673da737247a0f38b22def30a5d3a14f907272457e",
      ...
    ],
    "transactionsRoot": "0x1430120da41716edf2086b9b744300c3a42ab07f89e536daf80f61f365f17247",
    "uncles": []  
  }
}
```

#### blockResponse
On successful block message sent to the server, the `success` attribute is set to true and the data attribute will be empty in the response payload.

```json
{
  "topic": "blockResponse",
  "payload": {
    "success": true,
    "data": [],
    "dataLength": 0,
    "warnings": [],
    "errors": []
  }
}
```

Example using wscat:
```bash
> {"topic":"block","payload":{"author":"0xea674fdde714fd979de3edf0f56aa9716b898ec8","difficulty":"1819235038152977","extraData":"0x505059452d65746865726d696e652d61736961312d34","gasLimit":8000000,"gasUsed":4900294,"hash":"0x1696c53da4a8cd439ed6833b990edcb36269e2b7b98144fa69e054a88c199ef6","logsBloom":"0xc04c0c8602c5001a20005202000008a282a5818f075000185112a04001581188401c4c00e818008021022cea5440480e82402412088040e15808610000b1412804802701086004280813000c2424087d00190101028001010e19c8509013100000b04140132a4280852a60500002884a0862900818840058401119914644050a080002040050d02c800003a58040080c3b120020e5cd0e201442602814044130068184100040800a9a81209cc1f8140e01640600448980a01910d1001b28084010884c12580e008600c14468116803228612a805412a901421880a400112a00b201124a0a1e18080100052800c023074918b8084a000069122a8910232a02482","miner":"0xea674fdde714fd979de3edf0f56aa9716b898ec8","mixHash":"0xa588eaeaf5186bf07d1ed9027b27fe50acb9b25d3ca6beeb5e573e40f6a6a0d2","nonce":"0xa2fae7a6696b2609","number":7642556,"parentHash":"0x6823fd5ca071a9c90d05515cb3bcc618855c91fd935bb1dd31af5445d3c19bf9","receiptsRoot":"0xc80ec6684fb97e6e02b536a4b4fd5b701c84e8bfdb9c874c818640773d80bbd5","sealFields":["0xa0a588eaeaf5186bf07d1ed9027b27fe50acb9b25d3ca6beeb5e573e40f6a6a0d2","0x88a2fae7a6696b2609"],"sha3Uncles":"0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347","size":20036,"stateRoot":"0x4e80a434a20fc9e0ed0ef2b8d2ba2958201b752e1cf76dae98a5d4710de19f93","timestamp":1556276014,"totalDifficulty":"9.969850712079172712442e+21","transactions":["0xae00f7e686c0d1ab05520d455533d47a6437516e2b6ab6b4e7278f83efc7f3b6","0x38a4e2d77cee0f19f4a3e8002b2ba3a456ce3db27e5ca2fd8d440c8a8747fb5c","0xfe8e653259d36230d48ffab1d3dc0c292d8c02eb5920233950e9b19556dafe5e","0xf4d54525d369df1c05288f755eb8da1370dad15db8b3dab008d4ad7b0ff385b3","0xb07118cb0d8d58da504ae0673da737247a0f38b22def30a5d3a14f907272457e"],"transactionsRoot":"0x1430120da41716edf2086b9b744300c3a42ab07f89e536daf80f61f365f17247","uncles":[]}}
< {"topic":"blockResponse","payload":{"success":true,"data":[],"dataLength":0,"warnings":[],"errors":[]}}
```

---

#### validators
If the node is running on a POA type network, for every block sent must also send the validators / signers for it.
This topic listens for validators messages. 

Payload attributes: 

| Attribute     | Type            | Mandatory         | Description             |
|---------------|-----------------|-------------------|-------------------------|
| blockNumber   | integer         | yes               | The block number.       |
| blockHash     | string          | yes               | The block hash.         |
| validators    | array           | yes               | An array of strings representing the validators/signers in the block. |

```json
{
  "topic": "validators",
  "payload": {
    "blockNumber": 716864,
    "blockHash": "0x94dcc3fcb2c7b10af9c185598ecb6e8d4439510c33d6d15e2abbc4626c51d5aa",
    "validators": [
      "0x000000568b9b5a365eaa767d42e74ed88915c204",
      "0x22ea9f6b28db76a7162054c05ed812deb2f519cd",
      "0x4c2ae482593505f0163cdefc073e81c63cda4107",
      "0x631ae5c534fe7b35aaf5243b54e5ac0cfc44e04c"
    ]
  }
}
```

#### validatorsResponse
On successful validators message sent to the server, the `success` attribute is set to true and the data attribute will be empty in the response payload.

```json
{
  "topic": "validatorsResponse",
  "payload": {
    "success": true,
    "data": [],
    "dataLength": 0,
    "warnings": [],
    "errors": []
  }
}
```

Example using wscat:
```bash
> {"topic":"validators","payload":{"blockNumber":716864,"blockHash":"0x94dcc3fcb2c7b10af9c185598ecb6e8d4439510c33d6d15e2abbc4626c51d5aa","validators":["0x000000568b9b5a365eaa767d42e74ed88915c204","0x22ea9f6b28db76a7162054c05ed812deb2f519cd","0x4c2ae482593505f0163cdefc073e81c63cda4107","0x631ae5c534fe7b35aaf5243b54e5ac0cfc44e04c"]}}
< {"topic":"validatorsResponse","payload":{"success":true,"data":[],"dataLength":0,"warnings":[],"errors":[]}}
```

---

#### sync
Topic used to listen for sync messages when the node is syncing. 

Payload attributes: 

| Attribute     | Type            | Mandatory         | Description             |
|---------------|-----------------|-------------------|-------------------------|
| startingBlock | integer         | yes               | The block at which the import started. |
| currentBlock  | integer         | yes               | The current block. |
| highestBlock  | integer         | yes               | The estimated highest block. |

```json
{
  "topic": "sync",
  "payload": {
    "startingBlock": 7642556,
    "currentBlock": 7642558,
    "highestBlock": 7642659
  }
}
```

#### syncResponse
On successful sync message sent to the server, the `success` attribute is set to true and the data attribute will be empty in the response payload.

```json
{
  "topic": "syncResponse",
  "payload": {
    "success": true,
    "data": [],
    "dataLength": 0,
    "warnings": [],
    "errors": []
  }
}
```

Example using wscat:
```bash
> {"topic":"sync","payload":{"startingBlock":7642556,"currentBlock":7642558,"highestBlock":7642659}}
< {"topic":"syncResponse","payload":{"success":true,"data":[],"dataLength":0,"warnings":[],"errors":[]}}
```

---

#### stats
Topic used to listen for messages related to statistics of the node. Stats messages should be sent to the server every `10` seconds.

Payload attributes: 

| Attribute     | Type            | Mandatory         | Description             |
|---------------|-----------------|-------------------|-------------------------|
| mining        | boolean         | yes               | `true` if the node is actively mining new blocks. [Web3](https://web3js.readthedocs.io) example: `web3.eth.isMining`. |
| peers         | integer         | yes               | The number of peers currently connected to the node. [Web3](https://web3js.readthedocs.io) example: `web3.eth.net.getPeerCount`. |
| hashrate      | integer, string | yes               | The number of hashes per second that the node is mining with. [Web3](https://web3js.readthedocs.io) example: `web3.eth.getHashrate`. |
| gasPrice      | integer, string | yes               | The current price per gas in wei. [Web3](https://web3js.readthedocs.io) example: `web3.eth.getGasPrice`. |
| pendingTXs    | integer         | yes               | The number of pending transactions. [Web3](https://web3js.readthedocs.io) example: `web3.eth.getBlockTransactionCount('pending')`. |

```json
{
  "topic": "stats",
  "payload": {
    "peers": 48,
    "mining": false,
    "hashrate": 0,
    "gasPrice": "3150000000",
    "pendingTXs": 568
  }
}
```

#### statsResponse
On successful stats message sent to the server, the `success` attribute is set to true and the data attribute will be empty in the response payload.

```json
{
  "topic": "statsResponse",
  "payload": {
    "success": true,
    "data": [],
    "dataLength": 0,
    "warnings": [],
    "errors": []
  }
}
```

Example using wscat:
```bash
> {"topic":"stats","payload":{"peers":48,"mining":false,"hashrate":0,"gasPrice":"3150000000"}}
< {"topic":"statsResponse","payload":{"success":true,"data":[],"dataLength":0,"warnings":[],"errors":[]}}
```

---

#### usage
Topic used to listen for messages related to the hardware usage of the node. Usage messages should be sent to the server every `30` seconds.

Payload attributes: 

| Attribute       | Type            | Mandatory         | Description             |
|-----------------|-----------------|-------------------|-------------------------|
| hostCpuLoad     | number          | yes               | Current CPU load in % of the machine the node is running on. [SystemInformation](https://www.npmjs.com/package/systeminformation) example: `si.currentLoad.currentload`. |
| hostMemTotal    | number          | yes               | Total memory in bytes of the machine the node is running on. [SystemInformation](https://www.npmjs.com/package/systeminformation) example: `si.mem.total`. |
| hostMemUsed     | number          | yes               | Used memory (incl. buffers/cache) in bytes of the machine the node is running on. [SystemInformation](https://www.npmjs.com/package/systeminformation) example: `si.mem.used`. |
| hostNetRxSec    | number          | yes               | Network received bytes / second of the machine the node is running on. [SystemInformation](https://www.npmjs.com/package/systeminformation) example: `si.networkStats.rx_sec`. |
| hostNetTxSec    | number          | yes               | Network transferred bytes / second of the machine the node is running on. [SystemInformation](https://www.npmjs.com/package/systeminformation) example: `si.networkStats.tx_sec`. |
| hostFsRxSec     | number          | yes               | File system bytes read / second of the machine the node is running on. [SystemInformation](https://www.npmjs.com/package/systeminformation) example: `si.fsStats.rx_sec`. |
| hostFsWxSec     | number          | yes               | File system bytes written / second of the machine the node is running on. [SystemInformation](https://www.npmjs.com/package/systeminformation) example: `si.fsStats.wx_sec`. |
| hostDiskRIOSec  | number          | yes               | Disk read IO / sec of the machine the node is running on. [SystemInformation](https://www.npmjs.com/package/systeminformation) example: `si.disksIO.rIO_sec`. |
| hostDiskWIOSec  | number          | yes               | Disk write IO / sec CPU information of the machine the node is running on. [SystemInformation](https://www.npmjs.com/package/systeminformation) example: `si.disksIO.wIO_sec`. |
| nodeCpuLoad     | number          | yes               | CPU % load of the node. [SystemInformation](https://www.npmjs.com/package/systeminformation) example: `si.processLoad('geth').cpu`. |
| nodeMemLoad     | number          | yes               | MEM % load of the node. [SystemInformation](https://www.npmjs.com/package/systeminformation) example: `si.processLoad('geth').mem`. |
| clientCpuLoad   | number          | no                | CPU % load of the client app. [SystemInformation](https://www.npmjs.com/package/systeminformation) example: `si.processLoad('ethstats-cli').cpu`. |
| clientMemLoad   | number          | no                | MEM % load of the client app. [SystemInformation](https://www.npmjs.com/package/systeminformation) example: `si.processLoad('ethstats-cli').mem`. |

```json
{
  "topic": "usage",
  "payload": {
    "hostCpuLoad": 1.041979010494753,
    "hostMemTotal": 17179869184,
    "hostMemUsed": 16996663296,
    "hostNetRxSec": 3004.2,
    "hostNetTxSec": 3459,
    "hostFsRxSec": 205619.2,
    "hostFsWxSec": 819.2,
    "hostDiskRIOSec": 9.801960392078417,
    "hostDiskWIOSec": 0.20004000800160032,
    "nodeCpuLoad": 10.23,
    "nodeMemLoad": 78.56,
    "clientCpuLoad": 3.45,
    "clientMemLoad": 0.2
  }
}
```

#### usageResponse
On successful usage message sent to the server, the `success` attribute is set to true and the data attribute will be empty in the response payload.

```json
{
  "topic": "usageResponse",
  "payload": {
    "success": true,
    "data": [],
    "dataLength": 0,
    "warnings": [],
    "errors": []
  }
}
```

Example using wscat:
```bash
> {"topic":"usage","payload":{"hostCpuLoad":1.041979010494753,"hostMemTotal":17179869184,"hostMemUsed":16996663296,"hostNetRxSec":3004.2,"hostNetTxSec":3459,"hostFsRxSec":205619.2,"hostFsWxSec":819.2,"hostDiskRIOSec":9.801960392078417,"hostDiskWIOSec":0.20004000800160032,"nodeCpuLoad":10.23,"nodeMemLoad":78.56,"clientCpuLoad":3.45,"clientMemLoad":0.2}}
< {"topic":"usageResponse","payload":{"success":true,"data":[],"dataLength":0,"warnings":[],"errors":[]}}
```

---

#### invalidMessage
This topic must be used on the client side to listen for errors or warnings as a response from the server after validating a message.

An example is when a message received by the server does not contain the topic or payload attributes.

This is not a message for which the server expects any response, so none should be sent back to the server!  

```json
{
  "topic": "invalidMessage",
  "payload": {
    "success": false,
    "data": [],
    "dataLength": 0,
    "warnings": [],
    "errors": [
      "Should NOT have additional params",
      "Param 'topic' is required",
      "Param 'payload' is required"
    ]
  }
}
```

Example using wscat:
```bash
> {"aaa":"topic","bbb":"payload"}
< {"topic":"invalidMessage","payload":{"success":false,"data":[],"dataLength":0,"warnings":[],"errors":["Should NOT have additional params","Should NOT have additional params","Param 'topic' is required","Param 'payload' is required"]}}
```

---

#### clientTimeout
If the server is not receiving any data from the client for more then 3 minutes, it will end the connection with the client.
In this case it will send a message on this topic to let the client know the reason why it was diconnected.  

This is not a message for which the server expects any response, so none should be sent back to the server!  

```json
{
  "topic": "clientTimeout",
  "payload": {
    "success": false,
    "data": [],
    "dataLength": 0,
    "warnings": ["No data received for more than 180 seconds, ending connection"],
    "errors": []
  }
}
```

---

#### requestRateLimitReached
When a client is sending messages to the server with a high rate, it will throttle the requests from it send a warning message _"WebSocket request rate limit reached"_. 
The client should listen for this messages on this topic to know when it happens.

This is not a message for which the server expects any response, so none should be sent back to the server!  

```json
{
  "topic": "requestRateLimitReached",
  "payload": {
    "success": false,
    "data": [],
    "dataLength": 0,
    "warnings": ["WebSocket request rate limit reached"],
    "errors": []
  }
}
```

---

#### ping
This topic must be used on the client side to listen for ping messages in order to calculate the latency between the client and server and also to know if the client is active or not.
The payload contains a timestamp sent by the server. 

```json
{
  "topic": "ping",
  "payload": {
    "timestamp": 1557951342191
  }
}
```

#### pong
The pong response message must be sent back to the server as soon as the ping message is received with the same payload.

Payload attributes: 

| Attribute     | Type            | Mandatory         | Description             |
|---------------|-----------------|-------------------|-------------------------|
| timestamp     | number          | yes               | The timestamp sent by the server in the ping message. |

```json
{
  "topic": "pong",
  "payload": {
    "timestamp": 1557951342191
  }
}
```

#### pongResponse
If the pong message was successfully processed by the server a response message will be sent back to the client on this topic with the calculated `latency` (in milliseconds) in the data attribute of the payload.

```json
{
  "topic": "pongResponse",
  "payload": {
    "success": true,
    "data": [
      {
        "latency": 14
      }
    ],
    "dataLength": 1,
    "warnings": [],
    "errors": []
  }
}
```

Example using wscat:
```bash
< {"topic":"ping","payload":{"timestamp":1557951342191}}
> {"topic":"pong","payload":{"timestamp":1557951342191}}
< {"topic":"pongResponse","payload":{"success":true,"data":[{"latency":84}],"dataLength":1,"warnings":[],"errors":[]}}
```

---

#### checkChain
This topic must be used on the client side to listen for messages that will help the server know if the Ethereum node is on the correct chain due to possible forks.

Messages will be sent on this topic only if the server has the chain detection setting enabled.

For this the server will send from time to time such a message that in the payload will have as a request the block number it wants to check.

```json
{
  "topic": "checkChain",
  "payload": {
    "blockNumber": 7642556
  }
}
```

#### checkChainData
In response to the `checkChain` message the client must send back on this topic the hash and parent hash of the requested block number.

Payload attributes: 

| Attribute         | Type            | Mandatory         | Description             |
|-------------------|-----------------|-------------------|-------------------------|
| blockNumber       | integer         | yes               | The block number. |
| blockHash         | string          | yes               | Hash of the block. | 
| blockParentHash   | string          | yes               | Hash of the parent block. |

```json
{
  "topic": "checkChainData",
  "payload": {
    "blockNumber": 7642556,
    "blockHash": "0x1696c53da4a8cd439ed6833b990edcb36269e2b7b98144fa69e054a88c199ef6",
    "blockParentHash": "0x6823fd5ca071a9c90d05515cb3bcc618855c91fd935bb1dd31af5445d3c19bf9"
  }
}
```

#### checkChainResponse
If the check chain process is successful the server will respond with the `success` attribute set to true and the data attribute empty in the response payload.

If the node is not on the correct chain the server will send an error and also disconnect the client.  

```json
{
  "topic": "checkChainResponse",
  "payload": {
    "success": true,
    "data": [],
    "dataLength": 0,
    "warnings": [],
    "errors": []
  }
}
```

Example using wscat:
```bash
< {"topic":"checkChain","payload":{"blockNumber":7642556}}
> {"topic":"checkChainData","payload":{"blockNumber":7642556,"blockHash":"0x1696c53da4a8cd439ed6833b990edcb36269e2b7b98144fa69e054a88c199ef6","blockParentHash":"0x6823fd5ca071a9c90d05515cb3bcc618855c91fd935bb1dd31af5445d3c19bf9"}}
< {"topic":"checkChainResponse","payload":{"success":true,"data":[],"dataLength":0,"warnings":[],"errors":[]}}
```

---

#### getBlocks
If the server is started in lite mode and with memory persistence it will ask the client for older blocks (default last 3000 block) for populating the charts with data.

In this case the client must listen for messages in this topic that will in the payload the block numbers the server requests. 

```json
{
  "topic": "getBlocks",
  "payload": [7770223, 7770224, 7770225]
}
```

#### getBlocksData
In response to the `getBlock` message the client must send back on this topic the block headers that the server requested.

Payload must contain an array objects, each object representing the requested block. See the [block](#block) topic for the payload schema.  

```json
{
  "topic": "getBlocksData",
  "payload": [
    {
      "author": "0x5a0b54d5dc17e0aadc383d2db43b0a0d3e029c4c",
      "difficulty": "1988680471321563",
      "extraData": "0x5050594520737061726b706f6f6c2d6574682d636e2d687a32",
      "gasLimit": 8011709,
      "gasUsed": 8002636,
      "hash": "0x671f96a992bb4920ebf74c3948c0151af39ad0e1a15bc197fe6fa1a08a8b3e5a",
      "logsBloom": "0x8e0522954420249b1000140e000c10440bc100540841848ba088c400140e800908880c080823c84031406800960841c22a69045248898881029a029a412c0089a00201402820042a2c90525a800480680e1404405a0000001081034c12b403100449c322130104219034486010083c81c02031d404044610182049500228489410460000056440048c100d108d0020088531c111f9c00074048c0a0344d205100708c012451422a8100000e644d0905121842314d29284000001208018a88069a9101012050a41440034100446b0040000882a01c1ac991420903266856138008012a4a590440b01020100813200646490008c03a00010210a1c5a0c0050a002",
      "miner": "0x5a0b54d5dc17e0aadc383d2db43b0a0d3e029c4c",
      "mixHash": "0x13d92d6ae0f247fe9cfb2a5bc0ae7130020c07c20b6fb55c7b5e2eb775a6c587",
      "nonce": "0x413d11a8070a6417",
      "number": 7770223,
      "parentHash": "0x2fcee6bd38772e4af3b9e69f50ab208ed67fb31858b3113178f3514e5924c2b1",
      "receiptsRoot": "0x86aa209390593d75bacd5c26e79eca234a7a107ec08827332a096cb9de9a7b7a",
      "sealFields": [
        "0xa013d92d6ae0f247fe9cfb2a5bc0ae7130020c07c20b6fb55c7b5e2eb775a6c587",
        "0x88413d11a8070a6417"
      ],
      "sha3Uncles": "0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347",
      "size": 36048,
      "stateRoot": "0x168bb092d132c8d3f3c9c4525f08e67dba545345ae6bb2ccef791b66bd036fdf",
      "timestamp": 1557995256,
      "totalDifficulty": "1.0217215821733568136144e+22",
      "transactions": [
        "0x7b50f57145ce15084e8b0020f4fdcfbc3c6751336fb4cdb5b47e42148bae0135",
        "0xb8632f00a65132bfdb6dec7419b23094269d76a7947408383c2e7929edcf56da"
      ],
      "transactionsRoot": "0xfe787a82ce97b8609b1c6b58a1aaf8417ed0874275e381ce91c220322eed749b",
      "uncles": []
    },
    {
      "author": "0x5a0b54d5dc17e0aadc383d2db43b0a0d3e029c4c",
      "difficulty": "1989651540262382",
      "extraData": "0x5050594520737061726b706f6f6c2d6574682d636e2d687a32",
      "gasLimit": 8015609,
      "gasUsed": 7945092,
      "hash": "0xd7a2ff6e93f51ebc1976910b40b7ff0beda9ecedc65bdd64b75cbeab7e1e6f01",
      "logsBloom": "0x8c020800000a001a0421028a230080c011800038a010a0a920001200b00c001ba1484a40000004402020014251c01100a2244c800c3000010108a080003d4010c90400c020430020209410098020608002214044600602900002800e20601050140008a0080800280829500000481022050290800004648082180510b22008942400c11000c5400470121c4c810240188090818419001460010a00040432007003000220451410201010139000018484810120c08204c004020124441c0020801c1808ce6022005081000050868004210c000005021a810800068060044000012430000408240100218230848269208472800209000000004485110c80010008",
      "miner": "0x5a0b54d5dc17e0aadc383d2db43b0a0d3e029c4c",
      "mixHash": "0xc3d08de6d785e0fb5f8a99200d48a1373f8d2805324442e8834ca764cc98a6ac",
      "nonce": "0xf636dc200536657d",
      "number": 7770224,
      "parentHash": "0x671f96a992bb4920ebf74c3948c0151af39ad0e1a15bc197fe6fa1a08a8b3e5a",
      "receiptsRoot": "0xeff281764d48e4c6d2f79a4f6aee0d61aa21c7517762c9b82306bdbc7f514e12",
      "sealFields": [
        "0xa0c3d08de6d785e0fb5f8a99200d48a1373f8d2805324442e8834ca764cc98a6ac",
        "0x88f636dc200536657d"
      ],
      "sha3Uncles": "0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347",
      "size": 33342,
      "stateRoot": "0xa404fd1846243402f62d029c0663c027d1d089e9e7940f4289e7fd41905fcbfa",
      "timestamp": 1557995261,
      "totalDifficulty": "1.0217217811385108398526e+22",
      "transactions": [
        "0x26004eb363fd28acaff921a585aeb6405238cfc7ef1fe5ca871175ee5aa11a83",
        "0x1e314b095197e4ebcd1bf812f747533f1e1af6777bacd99a55f9c3a880163e4b",
        "0x8ffcf338cc9f9218e631dad217c57363a29737486abc3693c0c7ba918fa6fca4"
      ],
      "transactionsRoot": "0x4443ef7266a17d2f2604bade260d95ef13310e368fc204f5babda85d189aa5ea",
      "uncles": []
    },
    {
      "author": "0x2a65aca4d5fc5b5c859090a6c34d164135398226",
      "difficulty": "1989651573816814",
      "extraData": "0x4477617266506f6f6c",
      "gasLimit": 8007783,
      "gasUsed": 7990813,
      "hash": "0x9a53069b632d40953651753a42b9a5590c4035580e7fdc95830ae5c48003d540",
      "logsBloom": "0x001201d480381130021804091040201ca0001288001c00c4004851c0700028040aba00d10301408440c220820ae825403a48af103c010121003801c0183000090204a8a2b42186844886910980085880460420a543502c403022880784500088400c1000ca810216c0099000200c4c249191024a4a04474813310112009204250848e4894314280000208cd090a2045058009531490120108987040604b00a322e818090428c208891a202822040dd08e0900007d8400606a14200000a89601818081ec26dc31000201240121408240082505202008a94180808424603442c81a4103d2a200202001980209000401a01800444a810b100529408a00404d10005",
      "miner": "0x2a65aca4d5fc5b5c859090a6c34d164135398226",
      "mixHash": "0x561364cae5b098d7cbf32f17550a6e0971c507d095f6f8f356cdf997a18ffe80",
      "nonce": "0x70c0c4e00221a835",
      "number": 7770225,
      "parentHash": "0xd7a2ff6e93f51ebc1976910b40b7ff0beda9ecedc65bdd64b75cbeab7e1e6f01",
      "receiptsRoot": "0x9863ac3053468e0619ed93e4f9ff5f852fd7cc69f60eb3c23d0245ef0640aa04",
      "sealFields": [
        "0xa0561364cae5b098d7cbf32f17550a6e0971c507d095f6f8f356cdf997a18ffe80",
        "0x8870c0c4e00221a835"
      ],
      "sha3Uncles": "0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347",
      "size": 28830,
      "stateRoot": "0x7fff40444fa453b89173d3ce3ae0bd7ee0919e708b0b1a19f12e07b3cf287cc5",
      "timestamp": 1557995278,
      "totalDifficulty": "1.021721980103668221534e+22",
      "transactions": [
        "0x718f76cd42cf196a709e84c5d080c47dbbb27706add1495db8e01e80cf28036f",
        "0x0388b9e2f48caa76376c9080de9f11ed1eaee075cedf050d4c297101d91dc266",
        "0xfea32ca81f268d41fe913eeb487e7cabd9e3a5340adb4c8cec868dee10076e65"
      ],
      "transactionsRoot": "0xf072243bd49ab60dae72cd05e2ce34ffd2e11d795233f7fbbb792eeaa6e0abc5",
      "uncles": []
    }
  ]
}
```

#### getBlocksResponse
If the requested blocks were successfully received and processed by the server it will respond with the `success` attribute set to true and the data attribute empty in the response payload.

```json
{
  "topic": "getBlocksResponse",
  "payload": {
    "success": true,
    "data": [],
    "dataLength": 0,
    "warnings": [],
    "errors": []
  }
}
```

Example using wscat:
```bash
< {"topic":"getBlocks","payload":[7770223,7770224,7770225]}
> {"topic":"getBlocksData","payload":[{"author":"0x5a0b54d5dc17e0aadc383d2db43b0a0d3e029c4c","difficulty":"1988680471321563","extraData":"0x5050594520737061726b706f6f6c2d6574682d636e2d687a32","gasLimit":8011709,"gasUsed":8002636,"hash":"0x671f96a992bb4920ebf74c3948c0151af39ad0e1a15bc197fe6fa1a08a8b3e5a","logsBloom":"0x8e0522954420249b1000140e000c10440bc100540841848ba088c400140e800908880c080823c84031406800960841c22a69045248898881029a029a412c0089a00201402820042a2c90525a800480680e1404405a0000001081034c12b403100449c322130104219034486010083c81c02031d404044610182049500228489410460000056440048c100d108d0020088531c111f9c00074048c0a0344d205100708c012451422a8100000e644d0905121842314d29284000001208018a88069a9101012050a41440034100446b0040000882a01c1ac991420903266856138008012a4a590440b01020100813200646490008c03a00010210a1c5a0c0050a002","miner":"0x5a0b54d5dc17e0aadc383d2db43b0a0d3e029c4c","mixHash":"0x13d92d6ae0f247fe9cfb2a5bc0ae7130020c07c20b6fb55c7b5e2eb775a6c587","nonce":"0x413d11a8070a6417","number":7770223,"parentHash":"0x2fcee6bd38772e4af3b9e69f50ab208ed67fb31858b3113178f3514e5924c2b1","receiptsRoot":"0x86aa209390593d75bacd5c26e79eca234a7a107ec08827332a096cb9de9a7b7a","sealFields":["0xa013d92d6ae0f247fe9cfb2a5bc0ae7130020c07c20b6fb55c7b5e2eb775a6c587","0x88413d11a8070a6417"],"sha3Uncles":"0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347","size":36048,"stateRoot":"0x168bb092d132c8d3f3c9c4525f08e67dba545345ae6bb2ccef791b66bd036fdf","timestamp":1557995256,"totalDifficulty":"1.0217215821733568136144e+22","transactions":["0x7b50f57145ce15084e8b0020f4fdcfbc3c6751336fb4cdb5b47e42148bae0135","0xb8632f00a65132bfdb6dec7419b23094269d76a7947408383c2e7929edcf56da"],"transactionsRoot":"0xfe787a82ce97b8609b1c6b58a1aaf8417ed0874275e381ce91c220322eed749b","uncles":[]},{"author":"0x5a0b54d5dc17e0aadc383d2db43b0a0d3e029c4c","difficulty":"1989651540262382","extraData":"0x5050594520737061726b706f6f6c2d6574682d636e2d687a32","gasLimit":8015609,"gasUsed":7945092,"hash":"0xd7a2ff6e93f51ebc1976910b40b7ff0beda9ecedc65bdd64b75cbeab7e1e6f01","logsBloom":"0x8c020800000a001a0421028a230080c011800038a010a0a920001200b00c001ba1484a40000004402020014251c01100a2244c800c3000010108a080003d4010c90400c020430020209410098020608002214044600602900002800e20601050140008a0080800280829500000481022050290800004648082180510b22008942400c11000c5400470121c4c810240188090818419001460010a00040432007003000220451410201010139000018484810120c08204c004020124441c0020801c1808ce6022005081000050868004210c000005021a810800068060044000012430000408240100218230848269208472800209000000004485110c80010008","miner":"0x5a0b54d5dc17e0aadc383d2db43b0a0d3e029c4c","mixHash":"0xc3d08de6d785e0fb5f8a99200d48a1373f8d2805324442e8834ca764cc98a6ac","nonce":"0xf636dc200536657d","number":7770224,"parentHash":"0x671f96a992bb4920ebf74c3948c0151af39ad0e1a15bc197fe6fa1a08a8b3e5a","receiptsRoot":"0xeff281764d48e4c6d2f79a4f6aee0d61aa21c7517762c9b82306bdbc7f514e12","sealFields":["0xa0c3d08de6d785e0fb5f8a99200d48a1373f8d2805324442e8834ca764cc98a6ac","0x88f636dc200536657d"],"sha3Uncles":"0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347","size":33342,"stateRoot":"0xa404fd1846243402f62d029c0663c027d1d089e9e7940f4289e7fd41905fcbfa","timestamp":1557995261,"totalDifficulty":"1.0217217811385108398526e+22","transactions":["0x26004eb363fd28acaff921a585aeb6405238cfc7ef1fe5ca871175ee5aa11a83","0x1e314b095197e4ebcd1bf812f747533f1e1af6777bacd99a55f9c3a880163e4b","0x8ffcf338cc9f9218e631dad217c57363a29737486abc3693c0c7ba918fa6fca4"],"transactionsRoot":"0x4443ef7266a17d2f2604bade260d95ef13310e368fc204f5babda85d189aa5ea","uncles":[]},{"author":"0x2a65aca4d5fc5b5c859090a6c34d164135398226","difficulty":"1989651573816814","extraData":"0x4477617266506f6f6c","gasLimit":8007783,"gasUsed":7990813,"hash":"0x9a53069b632d40953651753a42b9a5590c4035580e7fdc95830ae5c48003d540","logsBloom":"0x001201d480381130021804091040201ca0001288001c00c4004851c0700028040aba00d10301408440c220820ae825403a48af103c010121003801c0183000090204a8a2b42186844886910980085880460420a543502c403022880784500088400c1000ca810216c0099000200c4c249191024a4a04474813310112009204250848e4894314280000208cd090a2045058009531490120108987040604b00a322e818090428c208891a202822040dd08e0900007d8400606a14200000a89601818081ec26dc31000201240121408240082505202008a94180808424603442c81a4103d2a200202001980209000401a01800444a810b100529408a00404d10005","miner":"0x2a65aca4d5fc5b5c859090a6c34d164135398226","mixHash":"0x561364cae5b098d7cbf32f17550a6e0971c507d095f6f8f356cdf997a18ffe80","nonce":"0x70c0c4e00221a835","number":7770225,"parentHash":"0xd7a2ff6e93f51ebc1976910b40b7ff0beda9ecedc65bdd64b75cbeab7e1e6f01","receiptsRoot":"0x9863ac3053468e0619ed93e4f9ff5f852fd7cc69f60eb3c23d0245ef0640aa04","sealFields":["0xa0561364cae5b098d7cbf32f17550a6e0971c507d095f6f8f356cdf997a18ffe80","0x8870c0c4e00221a835"],"sha3Uncles":"0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347","size":28830,"stateRoot":"0x7fff40444fa453b89173d3ce3ae0bd7ee0919e708b0b1a19f12e07b3cf287cc5","timestamp":1557995278,"totalDifficulty":"1.021721980103668221534e+22","transactions":["0x718f76cd42cf196a709e84c5d080c47dbbb27706add1495db8e01e80cf28036f","0x0388b9e2f48caa76376c9080de9f11ed1eaee075cedf050d4c297101d91dc266","0xfea32ca81f268d41fe913eeb487e7cabd9e3a5340adb4c8cec868dee10076e65"],"transactionsRoot":"0xf072243bd49ab60dae72cd05e2ce34ffd2e11d795233f7fbbb792eeaa6e0abc5","uncles":[]}]}
< {"topic":"getBlocksResponse","payload":{"success":true,"data":[],"dataLength":0,"warnings":[],"errors":[]}}```

---
