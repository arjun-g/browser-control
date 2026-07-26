// Must match BRIDGE_CANDIDATE_PORTS in packages/shared/src/protocol.ts
const BRIDGE_CANDIDATE_PORTS = [17374, 17375, 17376, 17377, 17378, 17379, 17380, 17381, 17382, 17383];
const HEARTBEAT_MS = 20000;
const RECONNECT_BASE_MS = 1500;
const RECONNECT_MAX_MS = 15000;

let bridgeToken = "";
let connections = [];

function detectBrowserKind() {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("edg/")) return "edge";
  if (ua.includes("firefox/")) return "firefox";
  return "chrome";
}

async function handleBridgeCommand(message, sendFn) {
  const commandId = message.id;
  try {
    const response = await chrome.runtime.sendMessage({
      type: "bridge-command",
      command: {
        action: message.action,
        params: message.params ?? {},
      },
    });

    if (!response?.ok) {
      throw new Error(response?.error ?? "Unknown command error");
    }

    sendFn({
      type: "result",
      id: commandId,
      ok: true,
      result: response.result,
    });
  } catch (error) {
    sendFn({
      type: "result",
      id: commandId,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Creates an independent WebSocket connection to a single bridge port.
 * Reconnects indefinitely with exponential backoff so the extension connects
 * to any MCP server instance that starts later.
 */
function createPortConnection(port) {
  let socket = null;
  let reconnectTimer = null;
  let heartbeatTimer = null;
  let reconnectDelayMs = RECONNECT_BASE_MS;

  function clearTimers() {
    clearTimeout(reconnectTimer);
    clearInterval(heartbeatTimer);
  }

  function safeSend(message) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    try {
      socket.send(JSON.stringify(message));
      return true;
    } catch {
      return false;
    }
  }

  function startHeartbeat() {
    heartbeatTimer = setInterval(() => {
      safeSend({ type: "ping", ts: new Date().toISOString() });
    }, HEARTBEAT_MS);
  }

  function scheduleReconnect() {
    clearTimeout(reconnectTimer);
    const jitterMs = Math.floor(Math.random() * 500);
    const waitMs = reconnectDelayMs + jitterMs;
    reconnectDelayMs = Math.min(reconnectDelayMs * 2, RECONNECT_MAX_MS);
    reconnectTimer = setTimeout(connect, waitMs);
  }

  function connect() {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    socket = new WebSocket(`ws://127.0.0.1:${port}`);

    socket.addEventListener("open", () => {
      reconnectDelayMs = RECONNECT_BASE_MS;
      clearTimers();
      startHeartbeat();
      safeSend({
        type: "hello",
        browser: detectBrowserKind(),
        extensionVersion: chrome.runtime?.getManifest?.()?.version ?? "0.0.0",
        token: bridgeToken || undefined,
      });
    });

    socket.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type !== "command") return;
        if (!message.id || !message.action) return;
        handleBridgeCommand(message, safeSend);
      } catch {
        // Ignore malformed bridge message.
      }
    });

    socket.addEventListener("close", () => {
      clearInterval(heartbeatTimer);
      scheduleReconnect();
    });

    socket.addEventListener("error", () => {
      try { socket.close(); } catch { /* no-op */ }
    });
  }

  function reconnect() {
    clearTimers();
    reconnectDelayMs = RECONNECT_BASE_MS;
    try { socket?.close(); } catch { /* no-op */ }
    connect();
  }

  return { connect, reconnect };
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "bridge-config-updated") {
    chrome.runtime.sendMessage({ type: "bridge-get-config" })
      .then((response) => {
        if (response?.ok && response.config) {
          bridgeToken = String(response.config.bridgeToken || "");
        }
      })
      .catch(() => {})
      .finally(() => {
        connections.forEach((c) => c.reconnect());
      });
  }
});

async function init() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "bridge-get-config" });
    if (response?.ok && response.config) {
      bridgeToken = String(response.config.bridgeToken || "");
    }
  } catch {
    // Use empty token.
  }

  connections = BRIDGE_CANDIDATE_PORTS.map((port) => createPortConnection(port));
  connections.forEach((c) => c.connect());
}

init();
