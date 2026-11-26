"use strict";

const path = require("path");
const fs = require("fs");

async function sendTokafkaAsync(producer, payloads) {
  return new Promise((resolve, reject) => {
    producer.send(payloads, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

module.exports = async function (app, router, opts) {
  fs.readdirSync(__dirname).forEach((filename) => {
    if (
      filename.indexOf(".") !== 0 &&
      fs.lstatSync(path.join(__dirname, filename)).isDirectory()
    ) {
      fs.readdirSync(path.join(__dirname, filename)).forEach((api) => {
        if (api.indexOf(".") == 0 || api.indexOf(".js") == -1) return;
        try {
          console.log(`加载路由文件 ${filename}/${api}`);
          require(`./${filename}/${api}`)(app, router, opts);
        } catch (error) {
          console.error(error);
          process.exit(-1);
        }
      });
    }
  });

  const routes = router.stacks
    .filter((s) => s.methods)
    .reduce((p, c) => {
      p[`${c.methods[0]} ${c.path}`] = c;
      return p;
    }, {});

  const apis = Object.values(routes).map((s) => {
    // if(!app.fs.api.logAttr[`${s.methods[0]}${s.path}`]){
    //   console.log(`未找到${s.methods[0]}${s.path}对应的日志，请检查配置`);
    // }
    return {
      method: s.methods[0],
      path: s.path,
      content: (app.fs.api.logAttr[`${s.methods[0]}${s.path}`] || {}).content,
    };
  });

  const payloads = [
    {
      topic: "system_api",
      messages: JSON.stringify({
        system: "运维中台",
        apis: apis,
      }),
    },
  ];

  // // const ks = app.fs.kafkaService;
  // if (ks && ks.producer) {
  //   await sendTokafkaAsync(ks.producer, payloads);
  // }
  return router;
};
