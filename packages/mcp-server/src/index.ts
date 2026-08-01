#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { BrowserBridge } from "./bridge.js";

const PREFERRED_PORT = process.env.BROWSER_BRIDGE_PORT ? Number(process.env.BROWSER_BRIDGE_PORT) : undefined;
const BRIDGE_TOKEN = process.env.BROWSER_BRIDGE_TOKEN;

// Parse command-line arguments for agentName
const args = process.argv.slice(2);
let agentName: string | undefined;
for (let i = 0; i < args.length; i++) {
  if ((args[i] === "--agent-name" || args[i] === "-a") && args[i + 1]) {
    agentName = args[i + 1];
    break;
  }
}

const bridge = await BrowserBridge.create(PREFERRED_PORT, BRIDGE_TOKEN, agentName);
process.stderr.write(`Browser bridge listening on ws://127.0.0.1:${bridge.port}\n`);

const server = new McpServer({
  name: "browser-control-mcp",
  version: "0.2.3",
});

const browserParam = z.enum(["chrome", "edge", "firefox"]).optional();
const tabIdParam = z.number().int().positive().optional();

// Utility to convert data URL to MCP image format
function extractImageFromDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  if (!dataUrl || !dataUrl.startsWith("data:image/")) {
    return null;
  }
  
  // Parse data URL: data:image/png;base64,<data>
  const match = dataUrl.match(/^data:image\/([a-z]+);base64,(.+)$/);
  if (!match) {
    return null;
  }
  
  const [, format, base64Data] = match;
  const mimeType = `image/${format}`; // e.g., "image/png", "image/jpeg"
  
  return {
    mimeType,
    data: base64Data,
  };
}

server.registerTool("list_browser_clients", {
  description: "List connected browser extension clients.",
  annotations: { title: "List Browser Clients", readOnlyHint: true },
}, async () => {
  const clients = bridge.listClients();
  return { content: [{ type: "text", text: JSON.stringify({ clients }, null, 2) }] };
});

server.registerTool("list_tabs", {
  description: "List all open tabs with their id, url, title, and active state.",
  annotations: { title: "List Tabs", readOnlyHint: true },
  inputSchema: { browser: browserParam },
}, async ({ browser }) => {
  const result = await bridge.sendCommand({ action: "list_tabs", params: {}, preferredBrowser: browser });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("navigate", {
  description: "Navigate a tab to a URL. Uses the active tab if no tabId is given.",
  annotations: { title: "Navigate", destructiveHint: true },
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
  annotations: { title: "Open New Tab", destructiveHint: true },
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
  annotations: { title: "Go Back", destructiveHint: true },
  inputSchema: { browser: browserParam },
}, async ({ browser }) => {
  const result = await bridge.sendCommand({ action: "back", params: {}, preferredBrowser: browser });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("forward", {
  description: "Go forward in the active tab's history.",
  annotations: { title: "Go Forward", destructiveHint: true },
  inputSchema: { browser: browserParam },
}, async ({ browser }) => {
  const result = await bridge.sendCommand({ action: "forward", params: {}, preferredBrowser: browser });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("click", {
  description: "Click an element by CSS selector using CDP mouse events.",
  annotations: { title: "Click Element", destructiveHint: true },
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
  annotations: { title: "Type Text", destructiveHint: true },
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
  annotations: { title: "Send Keypress", destructiveHint: true },
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
  annotations: { title: "Scroll Page", destructiveHint: true },
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
  annotations: { title: "Read DOM", readOnlyHint: true },
  inputSchema: {
    maxChars: z.number().int().positive().max(2_000_000).optional(),
    tabId: tabIdParam,
    browser: browserParam,
  },
}, async ({ maxChars, tabId, browser }) => {
  const result = await bridge.sendCommand({
    action: "read_dom",
    params: { maxChars: maxChars ?? 200000, tabId },
    preferredBrowser: browser,
    timeoutMs: 30000,
  });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("screenshot", {
  description: "Capture a screenshot using CDP. Supports full-page capture.",
  annotations: { title: "Capture Screenshot", readOnlyHint: true },
  inputSchema: {
    fullPage: z.boolean().optional(),
    format: z.enum(["png", "jpeg"]).optional(),
    quality: z.number().int().min(1).max(100).optional(),
    tabId: tabIdParam,
    browser: browserParam,
  },
}, async ({ fullPage, format, quality, tabId, browser }) => {
  const result = (await bridge.sendCommand({
    action: "screenshot",
    params: { fullPage: fullPage ?? false, format: format ?? "png", quality: quality ?? 90, tabId },
    preferredBrowser: browser,
    timeoutMs: 60000,
  })) as { ok: boolean; dataUrl: string; tabId: number; fullPage: boolean };
  
  // Extract image from dataUrl and return in MCP image format
  const image = extractImageFromDataUrl(result.dataUrl);
  if (image) {
    return {
      content: [
        {
          type: "image",
          data: image.data,
          mimeType: image.mimeType,
        },
        {
          type: "text",
          text: JSON.stringify({ ok: true, tabId: result.tabId, fullPage: result.fullPage }, null, 2),
        },
      ] as any,
    };
  }
  
  // Fallback if image extraction fails
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("wait_for_selector", {
  description: "Wait until a CSS selector appears and optionally becomes visible.",
  annotations: { title: "Wait For Selector", readOnlyHint: true },
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
  annotations: { title: "Wait For Navigation", readOnlyHint: true },
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
  annotations: { title: "Run CDP Command", destructiveHint: true, openWorldHint: true },
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

server.registerTool("get_current_tab", {
  description: "Get the current active tab information.",
  annotations: { title: "Get Current Tab", readOnlyHint: true },
  inputSchema: { browser: browserParam },
}, async ({ browser }) => {
  const result = await bridge.sendCommand({ action: "get_current_tab", params: {}, preferredBrowser: browser });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("close_tab", {
  description: "Close a single tab.",
  annotations: { title: "Close Tab", destructiveHint: true },
  inputSchema: { tabId: tabIdParam, browser: browserParam },
}, async ({ tabId, browser }) => {
  const result = await bridge.sendCommand({ action: "close_tab", params: { tabId }, preferredBrowser: browser });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("close_tabs", {
  description: "Close multiple tabs by ID.",
  annotations: { title: "Close Tabs", destructiveHint: true },
  inputSchema: {
    tabIds: z.array(z.number().int().positive()),
    browser: browserParam,
  },
}, async ({ tabIds, browser }) => {
  const result = await bridge.sendCommand({ action: "close_tabs", params: { tabIds }, preferredBrowser: browser });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("reload_tab", {
  description: "Reload a tab with optional cache bypass.",
  annotations: { title: "Reload Tab", destructiveHint: true },
  inputSchema: {
    tabId: tabIdParam,
    bypassCache: z.boolean().optional(),
    browser: browserParam,
  },
}, async ({ tabId, bypassCache, browser }) => {
  const result = await bridge.sendCommand({
    action: "reload_tab",
    params: { tabId, bypassCache },
    preferredBrowser: browser,
  });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("mouse_move", {
  description: "Move the mouse to a specific position on the page.",
  annotations: { title: "Move Mouse", destructiveHint: true },
  inputSchema: {
    x: z.number(),
    y: z.number(),
    tabId: tabIdParam,
    browser: browserParam,
  },
}, async ({ x, y, tabId, browser }) => {
  const result = await bridge.sendCommand({
    action: "mouse_move",
    params: { x, y, tabId },
    preferredBrowser: browser,
    timeoutMs: 30000,
  });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("drag_and_drop", {
  description: "Drag an element from a selector to coordinates.",
  annotations: { title: "Drag And Drop", destructiveHint: true },
  inputSchema: {
    selector: z.string().min(1),
    toX: z.number(),
    toY: z.number(),
    tabId: tabIdParam,
    browser: browserParam,
  },
}, async ({ selector, toX, toY, tabId, browser }) => {
  const result = await bridge.sendCommand({
    action: "drag_and_drop",
    params: { selector, toX, toY, tabId },
    preferredBrowser: browser,
    timeoutMs: 30000,
  });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("focus_element", {
  description: "Focus a DOM element by selector.",
  annotations: { title: "Focus Element", destructiveHint: true },
  inputSchema: {
    selector: z.string().min(1),
    tabId: tabIdParam,
    browser: browserParam,
  },
}, async ({ selector, tabId, browser }) => {
  const result = await bridge.sendCommand({
    action: "focus_element",
    params: { selector, tabId },
    preferredBrowser: browser,
    timeoutMs: 30000,
  });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("blur_element", {
  description: "Blur (unfocus) a DOM element by selector.",
  annotations: { title: "Blur Element", destructiveHint: true },
  inputSchema: {
    selector: z.string().min(1),
    tabId: tabIdParam,
    browser: browserParam,
  },
}, async ({ selector, tabId, browser }) => {
  const result = await bridge.sendCommand({
    action: "blur_element",
    params: { selector, tabId },
    preferredBrowser: browser,
    timeoutMs: 30000,
  });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("scroll_element", {
  description: "Scroll a specific element in a direction.",
  annotations: { title: "Scroll Element", destructiveHint: true },
  inputSchema: {
    selector: z.string().min(1),
    direction: z.enum(["up", "down", "left", "right"]).optional(),
    amount: z.number().int().positive().optional(),
    tabId: tabIdParam,
    browser: browserParam,
  },
}, async ({ selector, direction, amount, tabId, browser }) => {
  const result = await bridge.sendCommand({
    action: "scroll_element",
    params: { selector, direction: direction ?? "down", amount: amount ?? 300, tabId },
    preferredBrowser: browser,
    timeoutMs: 30000,
  });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("dom_extract_element", {
  description: "Extract text, HTML, value, and custom attributes from a DOM element.",
  annotations: { title: "Extract Element Data", readOnlyHint: true },
  inputSchema: {
    selector: z.string().min(1),
    attributes: z.array(z.string()).optional(),
    tabId: tabIdParam,
    browser: browserParam,
  },
}, async ({ selector, attributes, tabId, browser }) => {
  const result = await bridge.sendCommand({
    action: "dom_extract_element",
    params: { selector, attributes, tabId },
    preferredBrowser: browser,
    timeoutMs: 30000,
  });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("add_css", {
  description: "Inject CSS styles into the page.",
  annotations: { title: "Inject CSS", destructiveHint: true },
  inputSchema: {
    css: z.string().min(1),
    tabId: tabIdParam,
    browser: browserParam,
  },
}, async ({ css, tabId, browser }) => {
  const result = await bridge.sendCommand({
    action: "add_css",
    params: { css, tabId },
    preferredBrowser: browser,
    timeoutMs: 30000,
  });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("execute_javascript", {
  description: "Execute arbitrary JavaScript code on the page.",
  annotations: { title: "Execute JavaScript", destructiveHint: true, openWorldHint: true },
  inputSchema: {
    code: z.string().min(1),
    tabId: tabIdParam,
    browser: browserParam,
  },
}, async ({ code, tabId, browser }) => {
  const result = await bridge.sendCommand({
    action: "execute_javascript",
    params: { code, tabId },
    preferredBrowser: browser,
    timeoutMs: 60000,
  });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("set_viewport", {
  description: "Set the browser viewport size.",
  annotations: { title: "Set Viewport", destructiveHint: true },
  inputSchema: {
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    deviceScaleFactor: z.number().positive().optional(),
    tabId: tabIdParam,
    browser: browserParam,
  },
}, async ({ width, height, deviceScaleFactor, tabId, browser }) => {
  const result = await bridge.sendCommand({
    action: "set_viewport",
    params: { width: width ?? 1280, height: height ?? 720, deviceScaleFactor, tabId },
    preferredBrowser: browser,
    timeoutMs: 30000,
  });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("emulate_mobile", {
  description: "Emulate a mobile device with specific user agent and viewport.",
  annotations: { title: "Emulate Mobile Device", destructiveHint: true },
  inputSchema: {
    device: z.enum(["iPhone 12", "iPhone 14", "Pixel 6", "iPad"]).optional(),
    tabId: tabIdParam,
    browser: browserParam,
  },
}, async ({ device, tabId, browser }) => {
  const result = await bridge.sendCommand({
    action: "emulate_mobile",
    params: { device: device ?? "iPhone 12", tabId },
    preferredBrowser: browser,
    timeoutMs: 30000,
  });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("resize_window", {
  description: "Resize the browser window.",
  annotations: { title: "Resize Window", destructiveHint: true },
  inputSchema: {
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    windowId: z.number().int().positive().optional(),
    browser: browserParam,
  },
}, async ({ width, height, windowId, browser }) => {
  const result = await bridge.sendCommand({
    action: "resize_window",
    params: { width: width ?? 1280, height: height ?? 720, windowId },
    preferredBrowser: browser,
    timeoutMs: 30000,
  });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("toggle_fullscreen", {
  description: "Toggle fullscreen mode (F11).",
  annotations: { title: "Toggle Fullscreen", destructiveHint: true },
  inputSchema: {
    tabId: tabIdParam,
    browser: browserParam,
  },
}, async ({ tabId, browser }) => {
  const result = await bridge.sendCommand({
    action: "toggle_fullscreen",
    params: { tabId },
    preferredBrowser: browser,
    timeoutMs: 30000,
  });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("get_cookies", {
  description: "Get all cookies for a URL.",
  annotations: { title: "Get Cookies", readOnlyHint: true },
  inputSchema: {
    url: z.string().url().optional(),
    browser: browserParam,
  },
}, async ({ url, browser }) => {
  const result = await bridge.sendCommand({
    action: "get_cookies",
    params: { url },
    preferredBrowser: browser,
  });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("set_cookie", {
  description: "Set a cookie.",
  annotations: { title: "Set Cookie", destructiveHint: true },
  inputSchema: {
    name: z.string().min(1),
    value: z.string(),
    url: z.string().url().optional(),
    expires: z.number().optional(),
    browser: browserParam,
  },
}, async ({ name, value, url, expires, browser }) => {
  const result = await bridge.sendCommand({
    action: "set_cookie",
    params: { name, value, url, expires },
    preferredBrowser: browser,
  });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("delete_cookie", {
  description: "Delete a cookie by name.",
  annotations: { title: "Delete Cookie", destructiveHint: true },
  inputSchema: {
    name: z.string().min(1),
    url: z.string().url().optional(),
    browser: browserParam,
  },
}, async ({ name, url, browser }) => {
  const result = await bridge.sendCommand({
    action: "delete_cookie",
    params: { name, url },
    preferredBrowser: browser,
  });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("get_performance_metrics", {
  description: "Get performance metrics from the page.",
  annotations: { title: "Get Performance Metrics", readOnlyHint: true },
  inputSchema: {
    tabId: tabIdParam,
    browser: browserParam,
  },
}, async ({ tabId, browser }) => {
  const result = await bridge.sendCommand({
    action: "get_performance_metrics",
    params: { tabId },
    preferredBrowser: browser,
    timeoutMs: 30000,
  });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("get_web_vitals", {
  description: "Get Core Web Vitals (FCP, LCP, CLS) from the page.",
  annotations: { title: "Get Web Vitals", readOnlyHint: true },
  inputSchema: {
    tabId: tabIdParam,
    browser: browserParam,
  },
}, async ({ tabId, browser }) => {
  const result = await bridge.sendCommand({
    action: "get_web_vitals",
    params: { tabId },
    preferredBrowser: browser,
    timeoutMs: 30000,
  });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("get_console_logs", {
  description: "Get console logs captured from the page.",
  annotations: { title: "Get Console Logs", readOnlyHint: true },
  inputSchema: {
    tabId: tabIdParam,
    browser: browserParam,
  },
}, async ({ tabId, browser }) => {
  const result = await bridge.sendCommand({
    action: "get_console_logs",
    params: { tabId },
    preferredBrowser: browser,
    timeoutMs: 30000,
  });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("dom_snapshot", {
  description: "Capture a full DOM snapshot of the current page.",
  annotations: { title: "Capture DOM Snapshot", readOnlyHint: true },
  inputSchema: {
    tabId: tabIdParam,
    browser: browserParam,
  },
}, async ({ tabId, browser }) => {
  const result = await bridge.sendCommand({
    action: "dom_snapshot",
    params: { tabId },
    preferredBrowser: browser,
    timeoutMs: 30000,
  });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("minimal_snapshot", {
  description: "Capture a minimal snapshot focusing on key interactive elements.",
  annotations: { title: "Capture Minimal Snapshot", readOnlyHint: true },
  inputSchema: {
    tabId: tabIdParam,
    browser: browserParam,
  },
}, async ({ tabId, browser }) => {
  const result = await bridge.sendCommand({
    action: "minimal_snapshot",
    params: { tabId },
    preferredBrowser: browser,
    timeoutMs: 30000,
  });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("semantic_snapshot", {
  description: "Capture a semantic snapshot with headings, buttons, links, forms, and inputs.",
  annotations: { title: "Capture Semantic Snapshot", readOnlyHint: true },
  inputSchema: {
    tabId: tabIdParam,
    browser: browserParam,
  },
}, async ({ tabId, browser }) => {
  const result = await bridge.sendCommand({
    action: "semantic_snapshot",
    params: { tabId },
    preferredBrowser: browser,
    timeoutMs: 30000,
  });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("list_downloads", {
  description: "List all downloads.",
  annotations: { title: "List Downloads", readOnlyHint: true },
  inputSchema: {
    query: z.record(z.unknown()).optional(),
    browser: browserParam,
  },
}, async ({ query, browser }) => {
  const result = await bridge.sendCommand({
    action: "list_downloads",
    params: { query: query ?? {} },
    preferredBrowser: browser,
  });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("create_tab_group", {
  description: "Create a tab group.",
  annotations: { title: "Create Tab Group", destructiveHint: true },
  inputSchema: {
    title: z.string().optional(),
    color: z.enum(["grey", "blue", "red", "yellow", "green", "pink", "purple", "cyan"]).optional(),
    tabIds: z.array(z.number().int().positive()).optional(),
    browser: browserParam,
  },
}, async ({ title, color, tabIds, browser }) => {
  const result = await bridge.sendCommand({
    action: "create_tab_group",
    params: { title: title ?? "Group", color: color ?? "grey", tabIds },
    preferredBrowser: browser,
  });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("delete_tab_group", {
  description: "Delete a tab group.",
  annotations: { title: "Delete Tab Group", destructiveHint: true },
  inputSchema: {
    groupId: z.number().int().positive(),
    browser: browserParam,
  },
}, async ({ groupId, browser }) => {
  const result = await bridge.sendCommand({
    action: "delete_tab_group",
    params: { groupId },
    preferredBrowser: browser,
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
