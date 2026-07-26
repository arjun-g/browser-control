const DEFAULT_BRIDGE_URL = "ws://127.0.0.1:17374";
const HEARTBEAT_MS = 20000;
const RECONNECT_BASE_MS = 1500;
const RECONNECT_MAX_MS = 30000;

let socket;
let reconnectTimer;
let heartbeatTimer;
let reconnectDelayMs = RECONNECT_BASE_MS;
let currentConfig = {
  bridgeUrl: DEFAULT_BRIDGE_URL,
  bridgeToken: "",
};

function detectBrowserKind() {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("edg/")) return "edge";
  if (ua.includes("firefox/")) return "firefox";
  return "chrome";
}

async function loadConfig() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "bridge-get-config" });
    if (response?.ok && response.config) {
      currentConfig = {
        bridgeUrl: String(response.config.bridgeUrl || DEFAULT_BRIDGE_URL),
        bridgeToken: String(response.config.bridgeToken || ""),
      };
    }
  } catch {
    currentConfig = {
      bridgeUrl: DEFAULT_BRIDGE_URL,
      bridgeToken: "",
    };
  }
}

function clearTimers() {
  clearTimeout(reconnectTimer);
  clearInterval(heartbeatTimer);
}

function safeSend(message) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return false;
  }

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
  reconnectTimer = setTimeout(connectBridge, waitMs);
}

async function handleBridgeCommand(message) {
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

    safeSend({
      type: "result",
      id: commandId,
      ok: true,
      result: response.result,
    });
  } catch (error) {
    safeSend({
      type: "result",
      id: commandId,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function connectBridge() {
  await loadConfig();

  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  socket = new WebSocket(currentConfig.bridgeUrl);

  socket.addEventListener("open", () => {
    reconnectDelayMs = RECONNECT_BASE_MS;
    clearTimers();
    startHeartbeat();

    safeSend({
      type: "hello",
      browser: detectBrowserKind(),
      extensionVersion: chrome.runtime.getManifest().version,
      token: currentConfig.bridgeToken || undefined,
    });
  });

  socket.addEventListener("message", (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.type !== "command") {
        return;
      }

      if (!message.id || !message.action) {
        return;
      }

      handleBridgeCommand(message);
    } catch {
      // Ignore malformed bridge message.
    }
  });

  socket.addEventListener("close", () => {
    clearInterval(heartbeatTimer);
    scheduleReconnect();
  });

  socket.addEventListener("error", () => {
    try {
      socket.close();
    } catch {
      // no-op
    }
  });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "bridge-config-updated") {
    try {
      socket?.close();
    } catch {
      // no-op
    }
    connectBridge();
  }
});

connectBridge();
