'use strict';
const Kafka = require('kafka-node');

module.exports = async function factory(app, opts) {
   try {
      const client = new Kafka.KafkaClient({ kafkaHost: opts.kafkaService.rootURL, fromOffset: true });
      const producer = new Kafka.HighLevelProducer(client);
      producer.on('error', function (err) {
         app.fs.logger.log('error', "[FS-KAFKA]", err);
      });
      producer.on("ready", function () {
         console.log('日志Kafka ready')
      })
      const kafka = {
         producer: producer,
         configUpdateMessage: opts.configUpdateMessage || {}
      };

      app.fs.kafkaService = kafka;
      app.fs.logger.log('debug', "[FS-KAFKA]", "Init.Success");
   } catch (error) {
      console.log(error);
   }
}