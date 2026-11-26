"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const net = require("node:net");
const { once } = require("node:events");
const { Client } = require("../app/lib/service/postgresCompat");

function packet(type, payload) {
  const header = Buffer.alloc(5); header[0] = type.charCodeAt(0);
  header.writeInt32BE(payload.length + 4, 1); return Buffer.concat([header, payload]);
}

test("pg 7 opens TCP on modern Node and completes real PostgreSQL startup and query protocol", async t => {
  let startup = false; const queries = [];
  const server = net.createServer(socket => {
    let buffer = Buffer.alloc(0);
    socket.on("data", bytes => {
      buffer = Buffer.concat([buffer, bytes]);
      while (buffer.length >= (startup ? 5 : 4)) {
        const size = buffer.readInt32BE(startup ? 1 : 0) + (startup ? 1 : 0);
        if (buffer.length < size) return;
        const frame = buffer.subarray(0, size); buffer = buffer.subarray(size);
        if (!startup) {
          startup = true;
          socket.write(Buffer.concat([
            packet("R", Buffer.alloc(4)),
            packet("S", Buffer.from("server_version\0" + "12.0\0")),
            packet("Z", Buffer.from("I")),
          ]));
        } else if (frame[0] === 81) {
          queries.push(frame.subarray(5, -1).toString());
          const description = Buffer.alloc(2 + 3 + 18);
          description.writeInt16BE(1); description.write("ok\0", 2);
          description.writeInt32BE(23, 11); description.writeInt16BE(4, 15);
          description.writeInt32BE(-1, 17);
          const row = Buffer.alloc(7); row.writeInt16BE(1); row.writeInt32BE(1, 2); row.write("1", 6);
          socket.write(Buffer.concat([
            packet("T", description), packet("D", row),
            packet("C", Buffer.from("SELECT 1\0")), packet("Z", Buffer.from("I")),
          ]));
        } else if (frame[0] === 88) socket.end();
      }
    });
  });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const client = new Client({ host: "127.0.0.1", port: server.address().port,
    user: "test_only", database: "test_only", connectionTimeoutMillis: 1500 });
  t.after(async () => { await client.end(); await new Promise(resolve => server.close(resolve)); });
  await client.connect();
  const result = await client.query("SELECT 1 AS ok");
  assert.deepEqual(result.rows, [{ ok: 1 }]); assert.deepEqual(queries, ["SELECT 1 AS ok"]);
});

test("nonresponsive database startup times out and releases its socket", async t => {
  let accepted = false;
  const server = net.createServer(socket => { accepted = true; socket.on("data", () => {}); });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const client = new Client({ host: "127.0.0.1", port: server.address().port,
    user: "test_only", connectionTimeoutMillis: 100 });
  t.after(async () => { await client.end(); await new Promise(resolve => server.close(resolve)); });
  await assert.rejects(client.connect(), /timeout/); assert.equal(accepted, true);
});
