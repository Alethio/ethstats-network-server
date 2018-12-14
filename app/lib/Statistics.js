export default class Statistics {
  constructor(diContainer) {
    this.appConfig = diContainer.appConfig;
    this.lodash = diContainer.lodash;
    this.log = diContainer.logger;
    this.models = diContainer.models;
    this.deepstream = diContainer.deepstream;
    this.dsDataLoader = diContainer.dsDataLoader;
    this.prometheusMetrics = diContainer.prometheusMetrics;
    this.d3 = diContainer.d3;
    this.result = diContainer.result;
  }

  _sendDataToDeepstreamByType(type, data) {
    let typePlural = (type === 'stats') ? type : `${type}s`;
    let dsList = this.deepstream.record.getList(`${this.appConfig.DEEPSTREAM_NAMESPACE}/${typePlural}`);
    dsList.whenReady(list => {
      this.lodash.forEach(Object.keys(data), key => {
        let dsId = `${this.appConfig.DEEPSTREAM_NAMESPACE}/${type}/${key}`;

        if (!list.getEntries().includes(dsId)) {
          list.addEntry(dsId);
        }

        this.dsDataLoader.setRecord(dsId, key, data[key]);
      });
    });
  }

  sendToDeepstream(referenceBlockNumber, referenceBlockPartitionKey) {
    this.getData(referenceBlockNumber, referenceBlockPartitionKey).then(data => {
      this._sendDataToDeepstreamByType('stats', data.stats);
      this._sendDataToDeepstreamByType('chart', data.charts);
    });
  }

  getData(referenceBlockNumber, referenceBlockPartitionKey) {
    return this.models.Blocks.getOlderThanBlockNumber(referenceBlockNumber, referenceBlockPartitionKey, this.appConfig.CHARTS_MAX_BLOCKS_HISTORY).then(blocks => {
      let result = {
        referenceBlockNumber: 0,
        stats: {
          averageBlockTime: 0,
          averageNetworkHashrate: 0
        },
        charts: {
          blockTimeChartData: [],
          blockDifficultyChartData: [],
          transactionsChartData: [],
          unclesChartData: [],
          gasSpendingChartData: [],
          gasLimitChartData: [],
          uncleCountChartData: [],
          topMinersChartData: []
        }
      };

      if (blocks.rowLength > 0) {
        let referenceBlock = blocks.rows[0];
        let averageBlockTime = 0;
        let averageNetworkHashrate = 0;
        let blockTimeChartData = [];
        let blockTimeDataForAverage = [];
        let blockDifficultyChartData = [];
        let transactionsChartData = [];
        let unclesChartData = [];
        let gasSpendingChartData = [];
        let gasLimitChartData = [];
        let uncleCountChartData = [];
        let blocksToGroupByMiner = [];
        let topMinersChartData = [];

        for (let i = blocks.rowLength - 1; i >= 0; i--) {
          if (i < this.appConfig.CHARTS_MAX_BINS) {
            blockTimeChartData.push({
              number: blocks.rows[i].number,
              blockTime: blocks.rows[i].blockTime
            });
            blockDifficultyChartData.push({
              number: blocks.rows[i].number,
              difficulty: blocks.rows[i].difficulty
            });
            transactionsChartData.push({
              number: blocks.rows[i].number,
              txCount: blocks.rows[i].txCount
            });
            unclesChartData.push({
              number: blocks.rows[i].number,
              uncleCount: blocks.rows[i].uncleCount
            });
            gasSpendingChartData.push({
              number: blocks.rows[i].number,
              gasUsed: blocks.rows[i].gasUsed
            });
            gasLimitChartData.push({
              number: blocks.rows[i].number,
              gasLimit: blocks.rows[i].gasLimit
            });
          }

          if (i < this.appConfig.CHARTS_MAX_BLOCKS_FOR_BLOCK_TIME_AVG) {
            blockTimeDataForAverage.push({
              number: blocks.rows[i].number,
              blockTime: blocks.rows[i].blockTime
            });
          }

          if (i < this.appConfig.CHARTS_BLOCK_MINERS_MAX_BLOCKS_HISTORY) {
            blocksToGroupByMiner.push(blocks.rows[i]);
          }
        }

        averageBlockTime = this.lodash.sumBy(blockTimeDataForAverage, 'blockTime') / this.appConfig.CHARTS_MAX_BLOCKS_FOR_BLOCK_TIME_AVG;
        averageNetworkHashrate = referenceBlock.difficulty / averageBlockTime;

        this.lodash.map(this.lodash.chunk(blocks.rows, this.appConfig.CHARTS_UNCLE_COUNT_MAX_BLOCKS_PER_BIN), array => {
          uncleCountChartData.push({
            numberMin: this.lodash.minBy(array, 'number').number,
            numberMax: this.lodash.maxBy(array, 'number').number,
            count: this.lodash.sumBy(array, 'uncleCount')
          });
        });

        let elementsToFillWithEmptyObject = this.appConfig.CHARTS_MAX_BINS - blocks.rowLength;

        if (elementsToFillWithEmptyObject > 0) {
          for (let i = 0; i < elementsToFillWithEmptyObject; i++) {
            blockTimeChartData.unshift({});
            blockDifficultyChartData.unshift({});
            transactionsChartData.unshift({});
            unclesChartData.unshift({});
            gasSpendingChartData.unshift({});
            gasLimitChartData.unshift({});
          }
        }

        elementsToFillWithEmptyObject = this.appConfig.CHARTS_MAX_BINS - uncleCountChartData.length;
        if (elementsToFillWithEmptyObject > 0) {
          for (let i = 0; i < elementsToFillWithEmptyObject; i++) {
            uncleCountChartData.push({});
          }
        }

        let blocksGroupedByMiner = this.lodash.groupBy(blocksToGroupByMiner, 'miner');
        Object.keys(blocksGroupedByMiner).forEach(key => {
          topMinersChartData.push({
            miner: key,
            count: blocksGroupedByMiner[key].length
          });
        });

        result.referenceBlockNumber = referenceBlockNumber;
        result.stats.averageBlockTime = averageBlockTime;
        result.stats.averageNetworkHashrate = averageNetworkHashrate;
        result.charts.blockTimeChartData = blockTimeChartData;
        result.charts.blockDifficultyChartData = blockDifficultyChartData;
        result.charts.transactionsChartData = transactionsChartData;
        result.charts.unclesChartData = unclesChartData;
        result.charts.gasSpendingChartData = gasSpendingChartData;
        result.charts.gasLimitChartData = gasLimitChartData;
        result.charts.uncleCountChartData = uncleCountChartData.reverse();
        result.charts.topMinersChartData = this.lodash.orderBy(topMinersChartData, ['count'], ['desc']);
      }

      return result;
    }).then(result => {
      return this.models.BlockConfirmations.getOlderThanBlockNumber(result.referenceBlockNumber, this.appConfig.CHARTS_BLOCK_PROPAGATION_HISTOGRAM_MAX_CONFIRMATIONS_HISTORY).then(confirmations => {
        let blockPropagation = [];
        let avgPropagation = 0;
        let histogram = [];

        if (confirmations && confirmations.rowLength > 0) {
          blockPropagation = this.lodash.map(confirmations.rows, row => {
            return Math.min(parseInt(row.propagationTime, 10) / 1000, this.appConfig.CHARTS_BLOCK_PROPAGATION_HISTOGRAM_MAX_RANGE);
          });
        }

        if (blockPropagation.length > 0) {
          avgPropagation = Math.round(this.lodash.sum(blockPropagation) / blockPropagation.length);

          let data = this.d3.layout.histogram()
            .frequency(false)
            .range([this.appConfig.CHARTS_BLOCK_PROPAGATION_HISTOGRAM_MIN_RANGE, this.appConfig.CHARTS_BLOCK_PROPAGATION_HISTOGRAM_MAX_RANGE])
            .bins(this.appConfig.CHARTS_BLOCK_PROPAGATION_HISTOGRAM_MAX_BINS)(blockPropagation);

          let freqCum = 0;
          histogram = data.map(val => {
            freqCum += val.length;
            var cumPercent = (freqCum / Math.max(1, blockPropagation.length));

            return {
              x: val.x,
              dx: val.dx,
              y: val.y,
              frequency: val.length,
              cumulative: freqCum,
              cumpercent: cumPercent
            };
          });
        }

        result.charts.blockPropagationChartData = {
          blockPropagationHistogramData: histogram,
          blockPropagationAverage: avgPropagation
        };

        return {
          stats: result.stats,
          charts: result.charts
        };
      });
    });
  }
}
