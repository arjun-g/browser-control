#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { BrowserBridge } from "./bridge.js";

const WS_PORT = Number(process.env.BROWSER_BRIDGE_PORT ?? 17374);
const BRIDGE_TOKEN = process.env.BROWSER_BRIDGE_TOKEN;

const bridge = new BrowserBridge(WS_PORT, BRIDGE_TOKEN);

const server = new McpServer({
  name: "browser-control-mcp",
  version: "0.1.0",
});

server.tool("list_browser_clients", "List connected browser extension clients.", async () => {
  const clients = bridge.listClients();
  return {
    content: [{ type: "text", text: JSON.stringify({ clients }, null, 2) }],
  };
});

server.tool(
  "navigate",
  "Navigate current tab to a URL.",
  {
    url: z.string().url(),
    browser: z.enum(["chrome", "edge", "firefox"]).optional(),
  },
  async ({ url, browser }) => {
    const result = await bridge.sendCommand({ action: "navigate", params: { url }, preferredBrowser: browser });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "back",
  "Go back in tab history.",
  {
    browser: z.enum(["chrome", "edge", "firefox"]).optional(),
  },
  async ({ browser }) => {
    const result = await bridge.sendCommand({ action: "back", params: {}, preferredBrowser: browser });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "forward",
  "Go forward in tab history.",
  {
    browser: z.enum(["chrome", "edge", "firefox"]).optional(),
  },
  async ({ browser }) => {
    const result = await bridge.sendCommand({ action: "forward", params: {}, preferredBrowser: browser });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "click",
  "Click an element by CSS selector.",
  {
    selector: z.string().min(1),
    browser: z.enum(["chrome", "edge", "firefox"]).optional(),
  },
  async ({ selector, browser }) => {
    const result = await bridge.sendCommand({ action: "click", params: { selector }, preferredBrowser: browser });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "type",
  "Type text into an element by CSS selector.",
  {
    selector: z.string().min(1),
    text: z.string(),
    submit: z.boolean().optional(),
    browser: z.enum(["chrome", "edge", "firefox"]).optional(),
  },
  async ({ selector, text, submit, browser }) => {
    const result = await bridge.sendCommand({
      action: "type",
      params: { selector, text, submit: submit ?? false },
      preferredBrowser: browser,
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "keypress",
  "Send a keypress to the document body or focused element.",
  {
    key: z.string().min(1),
    ctrlKey: z.boolean().optional(),
    shiftKey: z.boolean().optional(),
    altKey: z.boolean().optional(),
    metaKey: z.boolean().optional(),
    browser: z.enum(["chrome", "edge", "firefox"]).optional(),
  },
  async ({ browser, ...params }) => {
    const result = await bridge.sendCommand({ action: "keypress", params, preferredBrowser: browser });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "read_dom",
  "Read the current page DOM outerHTML with optional truncation.",
  {
    maxChars: z.number().int().positive().max(2_000_000).optional(),
    browser: z.enum(["chrome", "edge", "firefox"]).optional(),
  },
  async ({ maxChars, browser }) => {
    const result = await bridge.sendCommand({
      action: "read_dom",
      params: { maxChars: maxChars ?? 200000 },
      preferredBrowser: browser,
      timeoutMs: 30000,
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "screenshot",
  "Capture a screenshot of the currently visible tab (base64 data URL).",
  {
    browser: z.enum(["chrome", "edge", "firefox"]).optional(),
  },
  async ({ browser }) => {
    const result = await bridge.sendCommand({ action: "screenshot", params: {}, preferredBrowser: browser, timeoutMs: 30000 });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "attach_debugger",
  "Attach Chrome DevTools Protocol debugger to a tab. This shows the browser 'started debugging' infobar.",
  {
    tabId: z.number().int().positive().optional(),
    browser: z.enum(["chrome", "edge", "firefox"]).optional(),
  },
  async ({ tabId, browser }) => {
    const result = await bridge.sendCommand({
      action: "attach_debugger",
      params: { tabId },
      preferredBrowser: browser,
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "detach_debugger",
  "Detach Chrome DevTools Protocol debugger from a tab.",
  {
    tabId: z.number().int().positive().optional(),
    browser: z.enum(["chrome", "edge", "firefox"]).optional(),
  },
  async ({ tabId, browser }) => {
    const result = await bridge.sendCommand({
      action: "detach_debugger",
      params: { tabId },
      preferredBrowser: browser,
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "debugger_status",
  "Show whether debugger is attached on the active tab and list attached tab IDs.",
  {
    browser: z.enum(["chrome", "edge", "firefox"]).optional(),
  },
  async ({ browser }) => {
    const result = await bridge.sendCommand({
      action: "debugger_status",
      params: {},
      preferredBrowser: browser,
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "cdp_command",
  "Run a raw Chrome DevTools Protocol command on a tab.",
  {
    method: z.string().min(1),
    commandParams: z.record(z.unknown()).optional(),
    tabId: z.number().int().positive().optional(),
    autoAttach: z.boolean().optional(),
    browser: z.enum(["chrome", "edge", "firefox"]).optional(),
  },
  async ({ method, commandParams, tabId, autoAttach, browser }) => {
    const result = await bridge.sendCommand({
      action: "cdp_command",
      params: { method, commandParams: commandParams ?? {}, tabId, autoAttach: autoAttach ?? true },
      preferredBrowser: browser,
      timeoutMs: 30000,
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "cdp_click",
  "Click an element using Chrome DevTools Protocol mouse events.",
  {
    selector: z.string().min(1),
    tabId: z.number().int().positive().optional(),
    button: z.enum(["left", "right", "middle"]).optional(),
    clickCount: z.number().int().positive().max(3).optional(),
    browser: z.enum(["chrome", "edge", "firefox"]).optional(),
  },
  async ({ selector, tabId, button, clickCount, browser }) => {
    const result = await bridge.sendCommand({
      action: "cdp_click",
      params: { selector, tabId, button: button ?? "left", clickCount: clickCount ?? 1 },
      preferredBrowser: browser,
      timeoutMs: 30000,
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "cdp_type",
  "Type text into an element using CDP keyboard input.",
  {
    selector: z.string().min(1),
    text: z.string(),
    clear: z.boolean().optional(),
    submit: z.boolean().optional(),
    delayMs: z.number().int().min(0).max(2000).optional(),
    tabId: z.number().int().positive().optional(),
    browser: z.enum(["chrome", "edge", "firefox"]).optional(),
  },
  async ({ selector, text, clear, submit, delayMs, tabId, browser }) => {
    const result = await bridge.sendCommand({
      action: "cdp_type",
      params: {
        selector,
        text,
        clear: clear ?? true,
        submit: submit ?? false,
        delayMs: delayMs ?? 0,
        tabId,
      },
      preferredBrowser: browser,
      timeoutMs: 60000,
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "cdp_keypress",
  "Send a keypress through CDP.",
  {
    key: z.string().min(1),
    code: z.string().optional(),
    windowsVirtualKeyCode: z.number().int().nonnegative().optional(),
    ctrlKey: z.boolean().optional(),
    shiftKey: z.boolean().optional(),
    altKey: z.boolean().optional(),
    metaKey: z.boolean().optional(),
    tabId: z.number().int().positive().optional(),
    browser: z.enum(["chrome", "edge", "firefox"]).optional(),
  },
  async ({ browser, ...params }) => {
    const result = await bridge.sendCommand({
      action: "cdp_keypress",
      params,
      preferredBrowser: browser,
      timeoutMs: 30000,
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "cdp_scroll",
  "Scroll using CDP mouse wheel events.",
  {
    deltaX: z.number().optional(),
    deltaY: z.number().optional(),
    steps: z.number().int().positive().max(100).optional(),
    tabId: z.number().int().positive().optional(),
    browser: z.enum(["chrome", "edge", "firefox"]).optional(),
  },
  async ({ deltaX, deltaY, steps, tabId, browser }) => {
    const result = await bridge.sendCommand({
      action: "cdp_scroll",
      params: { deltaX: deltaX ?? 0, deltaY: deltaY ?? 500, steps: steps ?? 1, tabId },
      preferredBrowser: browser,
      timeoutMs: 30000,
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "cdp_wait_for_selector",
  "Wait until a selector appears (and optionally becomes visible) using CDP evaluate polling.",
  {
    selector: z.string().min(1),
    visible: z.boolean().optional(),
    timeoutMs: z.number().int().positive().max(120000).optional(),
    pollMs: z.number().int().positive().max(5000).optional(),
    tabId: z.number().int().positive().optional(),
    browser: z.enum(["chrome", "edge", "firefox"]).optional(),
  },
  async ({ selector, visible, timeoutMs, pollMs, tabId, browser }) => {
    const result = await bridge.sendCommand({
      action: "cdp_wait_for_selector",
      params: { selector, visible: visible ?? true, timeoutMs: timeoutMs ?? 10000, pollMs: pollMs ?? 200, tabId },
      preferredBrowser: browser,
      timeoutMs: (timeoutMs ?? 10000) + 5000,
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "wait_for_navigation",
  "Wait for active tab navigation completion, optionally matching URL text.",
  {
    urlIncludes: z.string().optional(),
    timeoutMs: z.number().int().positive().max(120000).optional(),
    pollMs: z.number().int().positive().max(5000).optional(),
    tabId: z.number().int().positive().optional(),
    browser: z.enum(["chrome", "edge", "firefox"]).optional(),
  },
  async ({ urlIncludes, timeoutMs, pollMs, tabId, browser }) => {
    const result = await bridge.sendCommand({
      action: "wait_for_navigation",
      params: { urlIncludes, timeoutMs: timeoutMs ?? 15000, pollMs: pollMs ?? 250, tabId },
      preferredBrowser: browser,
      timeoutMs: (timeoutMs ?? 15000) + 5000,
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "cdp_screenshot",
  "Capture screenshot using CDP (supports full-page capture).",
  {
    fullPage: z.boolean().optional(),
    format: z.enum(["png", "jpeg"]).optional(),
    quality: z.number().int().min(1).max(100).optional(),
    tabId: z.number().int().positive().optional(),
    browser: z.enum(["chrome", "edge", "firefox"]).optional(),
  },
  async ({ fullPage, format, quality, tabId, browser }) => {
    const result = await bridge.sendCommand({
      action: "cdp_screenshot",
      params: { fullPage: fullPage ?? false, format: format ?? "png", quality: quality ?? 90, tabId },
      preferredBrowser: browser,
      timeoutMs: 60000,
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Failed to start MCP server", error);
  process.exit(1);
});
