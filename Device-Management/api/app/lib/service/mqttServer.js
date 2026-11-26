'use strict';
const mqtt = require('mqtt');

module.exports = async function factory (app, opts) {
   // console.info(`mqtt connecting ${opts.mqtt.mqttVideoServer}`);

   // const client = mqtt.connect(opts.mqtt.mqttVideoServer);

   // client.on('connect', function () {
   //    console.info(`mqtt connect success ${opts.mqtt.mqttVideoServer}`);
   //    client.subscribe('topic/test', { qos: 0 });//订阅主题为test的消息  
   // })
   // client.on('error', function (e) {
   //    console.error(`mqtt connect failed ${opts.mqtt.mqttVideoServer}`);
   //    app.fs.logger.error('info', '[FS-AUTH-MQTT]', `mqtt connect failed ${opts.mqtt.mqttVideoServer}`);
   // })

   // client.on('message', async (top, message) => {
     
   // });

   // app.mqttVideoServer = client
}
