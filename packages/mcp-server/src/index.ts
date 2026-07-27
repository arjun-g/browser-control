#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { BrowserBridge } from "./bridge.js";

const PREFERRED_PORT = process.env.BROWSER_BRIDGE_PORT ? Number(process.env.BROWSER_BRIDGE_PORT) : undefined;
const BRIDGE_TOKEN = process.env.BROWSER_BRIDGE_TOKEN;

const bridge = await BrowserBridge.create(PREFERRED_PORT, BRIDGE_TOKEN);
process.stderr.write(`Browser bridge listening on ws://127.0.0.1:${bridge.port}\n`);

const server = new McpServer({
  name: "browser-control-mcp",
  version: "0.1.6",
});

const browserParam = z.enum(["chrome", "edge", "firefox"]).optional();
const tabIdParam = z.number().int().positive().optional();

server.registerTool("list_browser_clients", {
  description: "List connected browser extension clients.",
}, async () => {
  const clients = bridge.listClients();
  return { content: [{ type: "text", text: JSON.stringify({ clients }, null, 2) }] };
});

server.registerTool("list_tabs", {
  description: "List all open tabs with their id, url, title, and active state.",
  inputSchema: { browser: browserParam },
}, async ({ browser }) => {
  const result = await bridge.sendCommand({ action: "list_tabs", params: {}, preferredBrowser: browser });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("navigate", {
  description: "Navigate a tab to a URL. Uses the active tab if no tabId is given.",
  inputSchema: {
    url: z.string().url(),
    tabId: tabIdParam,
    browser: browserParam,
  },
}, async ({ url, tabId, browser }) => {
  const result = await bridge.sendCommand({ action: "navigate", params: { url, tabId }, preferredBrowser: browser });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("new_tab", {
  description: "Open a new browser tab, optionally navigating to a URL.",
  inputSchema: {
    url: z.string().url().optional(),
    active: z.boolean().optional(),
    browser: browserParam,
  },
}, async ({ url, active, browser }) => {
  const result = await bridge.sendCommand({ action: "new_tab", params: { url, active: active ?? true }, preferredBrowser: browser });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("back", {
  description: "Go back in the active tab's history.",
  inputSchema: { browser: browserParam },
}, async ({ browser }) => {
  const result = await bridge.sendCommand({ action: "back", params: {}, preferredBrowser: browser });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("forward", {
  description: "Go forward in the active tab's history.",
  inputSchema: { browser: browserParam },
}, async ({ browser }) => {
  const result = await bridge.sendCommand({ action: "forward", params: {}, preferredBrowser: browser });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("click", {
  description: "Click an element by CSS selector using CDP mouse events.",
  inputSchema: {
    selector: z.string().min(1),
    button: z.enum(["left", "right", "middle"]).optional(),
    clickCount: z.number().int().positive().max(3).optional(),
    tabId: tabIdParam,
    browser: browserParam,
  },
}, async ({ selector, button, clickCount, tabId, browser }) => {
  const result = await bridge.sendCommand({
    action: "click",
    params: { selector, button: button ?? "left", clickCount: clickCount ?? 1, tabId },
    preferredBrowser: browser,
    timeoutMs: 30000,
  });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("type", {
  description: "Type text into an element using CDP keyboard input.",
  inputSchema: {
    selector: z.string().min(1),
    text: z.string(),
    clear: z.boolean().optional(),
    submit: z.boolean().optional(),
    delayMs: z.number().int().min(0).max(2000).optional(),
    tabId: tabIdParam,
    browser: browserParam,
  },
}, async ({ selector, text, clear, submit, delayMs, tabId, browser }) => {
  const result = await bridge.sendCommand({
    action: "type",
    params: { selector, text, clear: clear ?? true, submit: submit ?? false, delayMs: delayMs ?? 0, tabId },
    preferredBrowser: browser,
    timeoutMs: 60000,
  });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("keypress", {
  description: "Send a keypress via CDP to the active element.",
  inputSchema: {
    key: z.string().min(1),
    code: z.string().optional(),
    windowsVirtualKeyCode: z.number().int().nonnegative().optional(),
    ctrlKey: z.boolean().optional(),
    shiftKey: z.boolean().optional(),
    altKey: z.boolean().optional(),
    metaKey: z.boolean().optional(),
    tabId: tabIdParam,
    browser: browserParam,
  },
}, async ({ browser, ...params }) => {
  const result = await bridge.sendCommand({ action: "keypress", params, preferredBrowser: browser, timeoutMs: 30000 });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("scroll", {
  description: "Scroll the page using CDP mouse wheel events.",
  inputSchema: {
    deltaX: z.number().optional(),
    deltaY: z.number().optional(),
    steps: z.number().int().positive().max(100).optional(),
    tabId: tabIdParam,
    browser: browserParam,
  },
}, async ({ deltaX, deltaY, steps, tabId, browser }) => {
  const result = await bridge.sendCommand({
    action: "scroll",
    params: { deltaX: deltaX ?? 0, deltaY: deltaY ?? 500, steps: steps ?? 1, tabId },
    preferredBrowser: browser,
    timeoutMs: 30000,
  });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("read_dom", {
  description: "Read the current page DOM outerHTML.",
  inputSchema: {
    maxChars: z.number().int().positive().max(2_000_000).optional(),
    browser: browserParam,
  },
}, async ({ maxChars, browser }) => {
  const result = await bridge.sendCommand({
    action: "read_dom",
    params: { maxChars: maxChars ?? 200000 },
    preferredBrowser: browser,
    timeoutMs: 30000,
  });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("screenshot", {
  description: "Capture a screenshot using CDP. Supports full-page capture.",
  inputSchema: {
    fullPage: z.boolean().optional(),
    format: z.enum(["png", "jpeg"]).optional(),
    quality: z.number().int().min(1).max(100).optional(),
    tabId: tabIdParam,
    browser: browserParam,
  },
}, async ({ fullPage, format, quality, tabId, browser }) => {
  const result = await bridge.sendCommand({
    action: "screenshot",
    params: { fullPage: fullPage ?? false, format: format ?? "png", quality: quality ?? 90, tabId },
    preferredBrowser: browser,
    timeoutMs: 60000,
  });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("wait_for_selector", {
  description: "Wait until a CSS selector appears and optionally becomes visible.",
  inputSchema: {
    selector: z.string().min(1),
    visible: z.boolean().optional(),
    timeoutMs: z.number().int().positive().max(120000).optional(),
    pollMs: z.number().int().positive().max(5000).optional(),
    tabId: tabIdParam,
    browser: browserParam,
  },
}, async ({ selector, visible, timeoutMs, pollMs, tabId, browser }) => {
  const result = await bridge.sendCommand({
    action: "wait_for_selector",
    params: { selector, visible: visible ?? true, timeoutMs: timeoutMs ?? 10000, pollMs: pollMs ?? 200, tabId },
    preferredBrowser: browser,
    timeoutMs: (timeoutMs ?? 10000) + 5000,
  });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("wait_for_navigation", {
  description: "Wait for the active tab to finish navigating, optionally matching a URL substring.",
  inputSchema: {
    urlIncludes: z.string().optional(),
    timeoutMs: z.number().int().positive().max(120000).optional(),
    pollMs: z.number().int().positive().max(5000).optional(),
    tabId: tabIdParam,
    browser: browserParam,
  },
}, async ({ urlIncludes, timeoutMs, pollMs, tabId, browser }) => {
  const result = await bridge.sendCommand({
    action: "wait_for_navigation",
    params: { urlIncludes, timeoutMs: timeoutMs ?? 15000, pollMs: pollMs ?? 250, tabId },
    preferredBrowser: browser,
    timeoutMs: (timeoutMs ?? 15000) + 5000,
  });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("cdp_command", {
  description: "Run a raw Chrome DevTools Protocol command on a tab.",
  inputSchema: {
    method: z.string().min(1),
    commandParams: z.record(z.unknown()).optional(),
    tabId: tabIdParam,
    browser: browserParam,
  },
}, async ({ method, commandParams, tabId, browser }) => {
  const result = await bridge.sendCommand({
    action: "cdp_command",
    params: { method, commandParams: commandParams ?? {}, tabId },
    preferredBrowser: browser,
    timeoutMs: 30000,
  });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Failed to start MCP server", error);
  process.exit(1);
});
