import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import net from "node:net";
import { WebSocket } from "ws";
import { BrowserBridge } from "../src/bridge.js";

const bridges: BrowserBridge[] = [];

afterEach(async () => {
  while (bridges.length > 0) {
    const bridge = bridges.pop();
    if (bridge) {
      await bridge.close();
    }
  }
});

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Could not allocate port"));
        return;
      }
      const port = address.port;
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });
}

test("registers valid hello client", async () => {
  const port = await getFreePort();
  const bridge = new BrowserBridge(port);
  bridges.push(bridge);

  const ws = new WebSocket(`ws://127.0.0.1:${port}`);

  await new Promise<void>((resolve, reject) => {
    ws.on("open", () => {
      ws.send(JSON.stringify({ type: "hello", browser: "chrome", extensionVersion: "0.1.0" }));
    });

    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "hello_ack") {
        resolve();
      }
    });

    ws.on("error", reject);
  });

  const clients = bridge.listClients();
  assert.equal(clients.length, 1);
  assert.equal(clients[0]?.browser, "chrome");

  ws.close();
});

test("rejects malformed hello payload", async () => {
  const port = await getFreePort();
  const bridge = new BrowserBridge(port);
  bridges.push(bridge);

  const ws = new WebSocket(`ws://127.0.0.1:${port}`);

  const closedCode = await new Promise<number>((resolve, reject) => {
    ws.on("open", () => {
      ws.send(JSON.stringify({ type: "hello", extensionVersion: "0.1.0" }));
    });

    ws.on("close", (code) => resolve(code));
    ws.on("error", reject);
  });

  assert.equal(closedCode, 1008);
  assert.equal(bridge.listClients().length, 0);
});
