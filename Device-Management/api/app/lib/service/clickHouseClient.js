"use strict";
const { ClickHouse } = require("clickhouse");

// function createSafeClickHouse (config) {
//    const ch = new ClickHouse(config);

//    const originalQuery = ch.query.bind(ch);

//    ch.query = function (...args) {
//       const queryResult = originalQuery(...args);

//       // 只包装 toPromise
//       if (queryResult && typeof queryResult.toPromise === 'function') {
//          const originalToPromise = queryResult.toPromise.bind(queryResult);
//          queryResult.toPromise = () => {
//             return originalToPromise().catch(err => {
//                console.error('[ClickHouse query error]', err.message);
//                console.error('SQL:', args[0]); // 把 SQL 打出来方便定位
//                // throw err; // 如果不想让上层感知错误，可以去掉这一行
//             });
//          };
//       }

//       return queryResult;
//    };

//    return ch;
// }

function createSafeClickHouse(config) {
  const ch = new ClickHouse(config);
  const originalQuery = ch.query.bind(ch);

  ch.query = function (...args) {
    const queryResult = originalQuery(...args);

    // ====== 包装 Promise 模式 ======
    if (queryResult && typeof queryResult.toPromise === "function") {
      const originalToPromise = queryResult.toPromise.bind(queryResult);
      queryResult.toPromise = () => {
        return originalToPromise().catch((err) => {
          console.error("[ClickHouse promise error]", err.message);
          console.error("SQL:", args[0]);
          throw err; // 如果不想抛出，可以去掉这一行
        });
      };
    }

    // ====== 包装流模式 ======
    if (queryResult && typeof queryResult.stream === "function") {
      const originalStream = queryResult.stream.bind(queryResult);
      queryResult.stream = (...streamArgs) => {
        const stream = originalStream(...streamArgs);
        stream.on("error", (err) => {
          console.error("[ClickHouse stream error]", err.message);
          console.error("SQL:", args[0]);
        });
        return stream;
      };
    }

    return queryResult;
  };

  return ch;
}

module.exports = { createSafeClickHouse };

function factory(app, opts) {
  if (opts.clickHouse) {
    try {
      app.fs.clickHouse = {};
      const { url, port, user, password, db = [] } = opts.clickHouse;
      for (let d of db) {
        if (d.name && d.db) {
          app.fs.clickHouse[d.name] =
            //new ClickHouse
            createSafeClickHouse({
              url: url,
              port: port,
              // debug: opts.dev,
              debug: false,
              format: "json",
              usePost: true,
              basicAuth:
                user && password
                  ? {
                      username: user,
                      password: password,
                    }
                  : null,
              config: {
                database: d.db,
              },
            });

          console.info(`ClickHouse ${d.name} 初始化完成`);
        } else {
          throw "opts.clickHouse 参数错误！";
        }
      }
    } catch (error) {
      console.error(error);
      process.exit(-1);
    }
  }
}

module.exports = factory;
