# Helm Charts

The charts are published to s3, so you can grab them via the [helm-s3
plugin](https://github.com/hypnoglow/helm-s3).

```
# TL;DR
helm plugin install https://github.com/hypnoglow/helm-s3.git
helm repo add alethio s3://alethio-helm-charts
```

## ethstats

Sets up ethstats server + dashboard and dependent services (optionally).

Defaults to [lite-mode](https://github.com/Alethio/ethstats-network-server#lite-mode)
which is in-memory store only.

The chart is also configured for goerli, so edit values accordingly to match
your network.

```
helm upgrade --install ethstats alethio/ethstats
```

### Testing

After configuring and installing the chart, you can connect `ethstats-cli` clients
to the server and see their stats in the dashboard.

```
docker run -it --name ethstats-cli 
		--net host \
		-v /opt/ethstats-cli/:/root/.config/configstore/ \
		alethio/ethstats-cli \
		-v --register --account-email your@email.com --node-name my-node \
		--server-url <http://ethstats-server-api accessible URL>
```

You can port-fwd the dashboard service locally:

```
kubectl port-forward svc/ethstats-dashboard 8888:80
```

If you're running under minikube, you can set `.server.service.type: NodePort` and
then check `minikube service list`.

ethstats-cli can take that ethstats-server-ws URL as the `--server-url` param.

### Notable values to set

| variable | description | default |
|----------|-------------|---------|
| `.server.config.NETWORK_ID` | _(required)_ Only allow clients running on this network ID to publish their stats | `"5"` |
| `.server.config.DEEPSTREAM_SERVER_PASSWORD` | use ./scripts/generatePassword to simplify. Also update .deepstream.config.users.yml | 
| `.server.config.DEEPSTREAM_CONSUMER_USER` | use ./scripts/generatePassword to simplify. Also update .deepstream.config.users.yml | 
| `.dashboard.config.DS_PASS` | use ./scripts/generatePassword to simplify. Also update .deepstream.config.users.yml | 

### Deepstream passwords

https://deepstream.io/docs/server/command-line-interface/#deepstream-hash

`./ethstats/scripts/generatePassword` :: this script generates passwords for
you to use in the users.yml file for deepstream

