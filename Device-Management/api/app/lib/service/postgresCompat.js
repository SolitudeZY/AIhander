"use strict";

const net = require("net");
const pg = require("pg");
const legacyDriver = require("pg/package.json").version.startsWith("7.");

// Sequelize 4 drops connectionTimeoutMillis from dialectOptions. Supply it at
// the driver boundary so an unreachable database cannot hold requests forever.
class Client extends pg.Client {
  constructor(config) {
    super({ connectionTimeoutMillis: 10000, ...config });
    if (!legacyDriver) return;
    const connection = this.connection;
    const connect = connection.connect;
    connection.connect = function (port, host) {
      // Modern Node reports a fresh socket as "open". pg 7 treats that as an
      // already connected socket and sends startup bytes without opening TCP.
      const stream = this.stream;
      if (stream instanceof net.Socket && stream.pending &&
          !stream.connecting && stream.readyState === "open") {
        stream.connect(port, host);
      }
      return connect.call(this, port, host);
    };
  }
}

// Preserve pg's lazy native getter without evaluating it (pg-native is optional).
module.exports = Object.assign(Object.create(pg), { Client });
