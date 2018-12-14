export default class KafkaUtils {
  constructor(diContainer) {
    this.appConfig = diContainer.appConfig;
    this.log = diContainer.logger;

    this.kafkaErrors = [];
  }

  checkErrorRate(newError) {
    this.kafkaErrors.push({
      error: newError.message,
      timestamp: Date.now()
    });

    if (this.kafkaErrors.length > this.appConfig.KAFKA_ERROR_RATE_LIMIT) {
      this.kafkaErrors.shift();

      let firstErrorTimestamp = parseInt(this.kafkaErrors[0].timestamp, 10);
      let lastErrorTimestamp = parseInt(this.kafkaErrors[this.kafkaErrors.length - 1].timestamp, 10);

      if (lastErrorTimestamp - firstErrorTimestamp <= this.appConfig.KAFKA_ERROR_RATE_INTERVAL) {
        this.log.error('Too many Kafka errors! Force exiting...');
        process.exit(1);
      }
    }

    return this.kafkaErrors;
  }
}
