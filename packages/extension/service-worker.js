const WAKE_ALARM_NAME = "bridge-reconnect-wakeup";
const WAKE_ALARM_PERIOD_MINUTES = 1;
const DEBUGGER_PROTOCOL_VERSION = "1.3";
const OFFSCREEN_DOCUMENT_PATH = "offscreen.html";
const DEFAULT_BRIDGE_URL = "ws://127.0.0.1:17374";

const debuggerAttachedTabs = new Set();
let creatingOffscreenDocument;

async function getBridgeConfig() {
  const config = await chrome.storage.local.get({
    bridgeUrl: DEFAULT_BRIDGE_URL,
    bridgeToken: "",
  });

  return {
    bridgeUrl: String(config.bridgeUrl || DEFAULT_BRIDGE_URL),
    bridgeToken: String(config.bridgeToken || ""),
  };
}

async function ensureOffscreenDocument() {
  if (!chrome.offscreen?.createDocument) {
    return;
  }

  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)],
  });

  if (contexts.length > 0) {
    return;
  }

  try {
    if (!creatingOffscreenDocument) {
      creatingOffscreenDocument = chrome.offscreen.createDocument({
        url: OFFSCREEN_DOCUMENT_PATH,
        reasons: ["WORKERS"],
        justification: "Maintain a persistent local websocket bridge to MCP server",
      });
    }
    await creatingOffscreenDocument;
  } finally {
    creatingOffscreenDocument = undefined;
  }
}

function ensureWakeAlarm() {
  chrome.alarms.create(WAKE_ALARM_NAME, { periodInMinutes: WAKE_ALARM_PERIOD_MINUTES });
}

async function notifyOffscreenConfigUpdated() {
  try {
    await chrome.runtime.sendMessage({ type: "bridge-config-updated" });
  } catch {
    // Offscreen document may not be ready yet.
  }
}

function attachDebugger(tabId) {
  return new Promise((resolve, reject) => {
    chrome.debugger.attach({ tabId }, DEBUGGER_PROTOCOL_VERSION, () => {
      const err = chrome.runtime.lastError;
      if (err) {
        if (err.message?.includes("Another debugger is already attached")) {
          debuggerAttachedTabs.add(tabId);
          resolve({ alreadyAttached: true });
          return;
        }
        reject(new Error(err.message));
        return;
      }

      debuggerAttachedTabs.add(tabId);
      resolve({ alreadyAttached: false });
    });
  });
}

function detachDebugger(tabId) {
  return new Promise((resolve, reject) => {
    chrome.debugger.detach({ tabId }, () => {
      const err = chrome.runtime.lastError;
      if (err) {
        if (err.message?.includes("No target with given id found") || err.message?.includes("Detached while handling command")) {
          debuggerAttachedTabs.delete(tabId);
          resolve({ alreadyDetached: true });
          return;
        }
        reject(new Error(err.message));
        return;
      }

      debuggerAttachedTabs.delete(tabId);
      resolve({ alreadyDetached: false });
    });
  });
}

function sendDebuggerCommand(tabId, method, params = {}) {
  return new Promise((resolve, reject) => {
    chrome.debugger.sendCommand({ tabId }, method, params, (result) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message));
        return;
      }

      resolve(result ?? {});
    });
  });
}

async function ensureDebuggerAttached(tabId) {
  if (!debuggerAttachedTabs.has(tabId)) {
    await attachDebugger(tabId);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function cdpEvaluate(tabId, expression) {
  return sendDebuggerCommand(tabId, "Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
}

function jsString(value) {
  return JSON.stringify(String(value));
}

async function cdpDispatchEnter(tabId) {
  await sendDebuggerCommand(tabId, "Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Enter",
    code: "Enter",
    windowsVirtualKeyCode: 13,
    nativeVirtualKeyCode: 13,
    unmodifiedText: "\r",
    text: "\r",
  });

  await sendDebuggerCommand(tabId, "Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Enter",
    code: "Enter",
    windowsVirtualKeyCode: 13,
    nativeVirtualKeyCode: 13,
  });
}

function cdpButtonToInputButton(button) {
  if (button === "right") return "right";
  if (button === "middle") return "middle";
  return "left";
}

async function cdpFindElementCenter(tabId, selector) {
  const result = await cdpEvaluate(
    tabId,
    `(() => {
      const selector = ${jsString(selector)};
      const el = document.querySelector(selector);
      if (!el) {
        return { ok: false, error: "Element not found: " + selector };
      }

      if (!(el instanceof HTMLElement)) {
        return { ok: false, error: "Element is not interactable: " + selector };
      }

      el.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return { ok: false, error: "Element has no visible size: " + selector };
      }

      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      return {
        ok: true,
        x,
        y,
        width: rect.width,
        height: rect.height,
      };
    })()`,
  );

  return result.result?.value;
}

async function cdpFocusElement(tabId, selector, clear) {
  const result = await cdpEvaluate(
    tabId,
    `(() => {
      const selector = ${jsString(selector)};
      const clear = ${clear ? "true" : "false"};
      const el = document.querySelector(selector);
      if (!el) {
        return { ok: false, error: "Element not found: " + selector };
      }

      if (!(el instanceof HTMLElement)) {
        return { ok: false, error: "Element is not interactable: " + selector };
      }

      el.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
      el.focus();

      if (clear && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
        el.value = "";
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }

      return {
        ok: true,
        tagName: el.tagName,
        isContentEditable: Boolean(el.isContentEditable),
      };
    })()`,
  );

  return result.result?.value;
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const tab = tabs[0];
  if (!tab || tab.id === undefined) {
    throw new Error("No active tab found");
  }
  return tab;
}

async function executeInTab(tabId, func, args = []) {
  const [injection] = await chrome.scripting.executeScript({
    target: { tabId },
    func,
    args,
  });

  return injection?.result;
}

async function handleCommand(action, params) {
  const tab = await getActiveTab();

  if (action === "list_tabs") {
    const tabs = await chrome.tabs.query({});
    return {
      ok: true,
      tabs: tabs.map((t) => ({
        id: t.id,
        windowId: t.windowId,
        url: t.url,
        title: t.title,
        active: t.active,
        status: t.status,
      })),
      activeTabId: tab.id,
    };
  }

  if (action === "new_tab") {
    const url = typeof params.url === "string" ? params.url : undefined;
    const newTab = await chrome.tabs.create({ url, active: params.active !== false });
    return { ok: true, tabId: newTab.id, url: newTab.pendingUrl ?? newTab.url };
  }

  if (action === "navigate") {
    if (!params.url || typeof params.url !== "string") {
      throw new Error("Missing url");
    }
    const targetTabId = Number.isInteger(params.tabId) ? params.tabId : tab.id;
    await chrome.tabs.update(targetTabId, { url: params.url });
    return { ok: true, tabId: targetTabId, url: params.url };
  }

  if (action === "back") {
    const result = await executeInTab(tab.id, () => { history.back(); return { ok: true }; }, []);
    return { ...result, tabId: tab.id };
  }

  if (action === "forward") {
    const result = await executeInTab(tab.id, () => { history.forward(); return { ok: true }; }, []);
    return { ...result, tabId: tab.id };
  }

  if (action === "click") {
    const targetTabId = Number.isInteger(params.tabId) ? params.tabId : tab.id;
    const selector = typeof params.selector === "string" ? params.selector : "";
    const clickCount = Number.isInteger(params.clickCount) ? params.clickCount : 1;
    const button = cdpButtonToInputButton(params.button);

    if (!selector) throw new Error("Missing selector");

    await ensureDebuggerAttached(targetTabId);
    await sendDebuggerCommand(targetTabId, "Page.enable", {});

    const point = await cdpFindElementCenter(targetTabId, selector);
    if (!point?.ok) throw new Error(point?.error ?? "Failed to resolve element position");

    await sendDebuggerCommand(targetTabId, "Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y, button, clickCount });
    await sendDebuggerCommand(targetTabId, "Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button, clickCount });
    await sendDebuggerCommand(targetTabId, "Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button, clickCount });

    return { ok: true, tabId: targetTabId, selector, x: point.x, y: point.y, button, clickCount };
  }

  if (action === "type") {
    const targetTabId = Number.isInteger(params.tabId) ? params.tabId : tab.id;
    const selector = typeof params.selector === "string" ? params.selector : "";
    const text = typeof params.text === "string" ? params.text : "";
    const clear = params.clear !== false;
    const submit = params.submit === true;
    const delayMs = Number.isFinite(Number(params.delayMs)) ? Math.max(0, Number(params.delayMs)) : 0;

    if (!selector) throw new Error("Missing selector");

    await ensureDebuggerAttached(targetTabId);

    const focusResult = await cdpFocusElement(targetTabId, selector, clear);
    if (!focusResult?.ok) throw new Error(focusResult?.error ?? "Failed to focus element");

    if (delayMs > 0) {
      for (const char of text) {
        await sendDebuggerCommand(targetTabId, "Input.insertText", { text: char });
        await sleep(delayMs);
      }
    } else {
      await sendDebuggerCommand(targetTabId, "Input.insertText", { text });
    }

    if (submit) await cdpDispatchEnter(targetTabId);

    return { ok: true, tabId: targetTabId, selector, textLength: text.length, clear, submit, delayMs };
  }

  if (action === "keypress") {
    const targetTabId = Number.isInteger(params.tabId) ? params.tabId : tab.id;
    const key = typeof params.key === "string" && params.key.length > 0 ? params.key : "";
    const code = typeof params.code === "string" && params.code.length > 0 ? params.code : key;
    const windowsVirtualKeyCode = Number.isInteger(params.windowsVirtualKeyCode)
      ? params.windowsVirtualKeyCode
      : key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0;
    const modifiers = (params.altKey ? 1 : 0) + (params.ctrlKey ? 2 : 0) + (params.metaKey ? 4 : 0) + (params.shiftKey ? 8 : 0);

    if (!key) throw new Error("Missing key");

    await ensureDebuggerAttached(targetTabId);

    await sendDebuggerCommand(targetTabId, "Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode, nativeVirtualKeyCode: windowsVirtualKeyCode, modifiers });
    await sendDebuggerCommand(targetTabId, "Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode, nativeVirtualKeyCode: windowsVirtualKeyCode, modifiers });

    return { ok: true, tabId: targetTabId, key, code, modifiers };
  }

  if (action === "scroll") {
    const targetTabId = Number.isInteger(params.tabId) ? params.tabId : tab.id;
    const deltaX = Number.isFinite(Number(params.deltaX)) ? Number(params.deltaX) : 0;
    const deltaY = Number.isFinite(Number(params.deltaY)) ? Number(params.deltaY) : 500;
    const steps = Number.isInteger(params.steps) ? Math.max(1, params.steps) : 1;

    await ensureDebuggerAttached(targetTabId);

    const viewport = await cdpEvaluate(targetTabId, "({ x: Math.floor(window.innerWidth / 2), y: Math.floor(window.innerHeight / 2) })");
    const x = viewport.result?.value?.x ?? 0;
    const y = viewport.result?.value?.y ?? 0;

    for (let i = 0; i < steps; i++) {
      await sendDebuggerCommand(targetTabId, "Input.dispatchMouseEvent", { type: "mouseWheel", x, y, deltaX, deltaY });
    }

    return { ok: true, tabId: targetTabId, x, y, deltaX, deltaY, steps };
  }

  if (action === "read_dom") {
    return executeInTab(
      tab.id,
      (maxChars) => {
        const html = document.documentElement?.outerHTML ?? "";
        const cut = Math.max(1, Number(maxChars) || 200000);
        return { ok: true, url: location.href, title: document.title, htmlLength: html.length, truncated: html.length > cut, html: html.slice(0, cut) };
      },
      [params.maxChars],
    );
  }

  if (action === "screenshot") {
    const targetTabId = Number.isInteger(params.tabId) ? params.tabId : tab.id;
    const fullPage = params.fullPage === true;
    const format = params.format === "jpeg" ? "jpeg" : "png";
    const quality = Number.isInteger(params.quality) ? Math.max(1, Math.min(100, params.quality)) : 90;

    await ensureDebuggerAttached(targetTabId);
    await sendDebuggerCommand(targetTabId, "Page.enable", {});

    const captureParams = {
      format,
      quality: format === "jpeg" ? quality : undefined,
      fromSurface: true,
      captureBeyondViewport: fullPage,
    };

    if (fullPage) {
      const metrics = await sendDebuggerCommand(targetTabId, "Page.getLayoutMetrics", {});
      const contentSize = metrics?.contentSize;
      if (contentSize?.width && contentSize?.height) {
        captureParams.clip = { x: 0, y: 0, width: contentSize.width, height: contentSize.height, scale: 1 };
      }
    }

    const shot = await sendDebuggerCommand(targetTabId, "Page.captureScreenshot", captureParams);
    return { ok: true, tabId: targetTabId, fullPage, format, dataUrl: `data:image/${format};base64,${shot.data}` };
  }

  if (action === "wait_for_selector") {
    const targetTabId = Number.isInteger(params.tabId) ? params.tabId : tab.id;
    const selector = typeof params.selector === "string" ? params.selector : "";
    const timeoutMs = Number.isFinite(Number(params.timeoutMs)) ? Math.max(100, Number(params.timeoutMs)) : 10000;
    const pollMs = Number.isFinite(Number(params.pollMs)) ? Math.max(25, Number(params.pollMs)) : 200;
    const visible = params.visible !== false;

    if (!selector) throw new Error("Missing selector");

    await ensureDebuggerAttached(targetTabId);

    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const probe = await cdpEvaluate(
        targetTabId,
        `(() => {
          const selector = ${jsString(selector)};
          const visible = ${visible ? "true" : "false"};
          const el = document.querySelector(selector);
          if (!el) return { found: false, visible: false };
          if (!visible) return { found: true, visible: true };
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          const ok = rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
          return { found: true, visible: ok };
        })()`,
      );

      const value = probe.result?.value;
      if (value?.found && value?.visible) {
        return { ok: true, tabId: targetTabId, selector, visible, elapsedMs: Date.now() - start };
      }

      await sleep(pollMs);
    }

    throw new Error(`Timed out waiting for selector: ${selector}`);
  }

  if (action === "wait_for_navigation") {
    const targetTabId = Number.isInteger(params.tabId) ? params.tabId : tab.id;
    const timeoutMs = Number.isFinite(Number(params.timeoutMs)) ? Math.max(100, Number(params.timeoutMs)) : 15000;
    const pollMs = Number.isFinite(Number(params.pollMs)) ? Math.max(50, Number(params.pollMs)) : 250;
    const urlIncludes = typeof params.urlIncludes === "string" && params.urlIncludes.length > 0 ? params.urlIncludes : undefined;
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const current = await chrome.tabs.get(targetTabId);
      const status = current.status ?? "unknown";
      const url = current.url ?? "";
      const matchesUrl = !urlIncludes || url.includes(urlIncludes);

      if (status === "complete" && matchesUrl) {
        return { ok: true, tabId: targetTabId, status, url, elapsedMs: Date.now() - start };
      }

      await sleep(pollMs);
    }

    throw new Error("Timed out waiting for navigation");
  }

  if (action === "cdp_command") {
    const targetTabId = Number.isInteger(params.tabId) ? params.tabId : tab.id;
    const method = typeof params.method === "string" ? params.method : "";
    const commandParams = params.commandParams && typeof params.commandParams === "object" ? params.commandParams : {};

    if (!method) throw new Error("Missing CDP method");

    await ensureDebuggerAttached(targetTabId);

    const result = await sendDebuggerCommand(targetTabId, method, commandParams);
    return { ok: true, tabId: targetTabId, method, result };
  }

  if (action === "get_current_tab") {
    return { ok: true, tab };
  }

  if (action === "close_tab") {
    const targetTabId = Number.isInteger(params.tabId) ? params.tabId : tab.id;
    await chrome.tabs.remove(targetTabId);
    return { ok: true, closedTabId: targetTabId };
  }

  if (action === "close_tabs") {
    const tabIds = Array.isArray(params.tabIds) ? params.tabIds.filter((id) => Number.isInteger(id)) : [];
    if (tabIds.length > 0) {
      await chrome.tabs.remove(tabIds);
      return { ok: true, closedCount: tabIds.length, closedTabIds: tabIds };
    }
    return { ok: false, error: "No tab IDs provided" };
  }

  if (action === "reload_tab") {
    const targetTabId = Number.isInteger(params.tabId) ? params.tabId : tab.id;
    const bypassCache = params.bypassCache === true;
    await chrome.tabs.reload(targetTabId, { bypassCache });
    return { ok: true, tabId: targetTabId, bypassCache };
  }

  if (action === "mouse_move") {
    const targetTabId = Number.isInteger(params.tabId) ? params.tabId : tab.id;
    const x = Number.isFinite(Number(params.x)) ? Number(params.x) : 0;
    const y = Number.isFinite(Number(params.y)) ? Number(params.y) : 0;

    await ensureDebuggerAttached(targetTabId);
    await sendDebuggerCommand(targetTabId, "Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
    return { ok: true, tabId: targetTabId, x, y };
  }

  if (action === "drag_and_drop") {
    const targetTabId = Number.isInteger(params.tabId) ? params.tabId : tab.id;
    const selector = typeof params.selector === "string" ? params.selector : "";
    const toX = Number.isFinite(Number(params.toX)) ? Number(params.toX) : 0;
    const toY = Number.isFinite(Number(params.toY)) ? Number(params.toY) : 0;

    if (!selector) throw new Error("Missing selector");

    await ensureDebuggerAttached(targetTabId);
    const startPoint = await cdpFindElementCenter(targetTabId, selector);
    if (!startPoint?.ok) throw new Error(startPoint?.error ?? "Failed to resolve element position");

    const steps = 5;
    const stepX = (toX - startPoint.x) / steps;
    const stepY = (toY - startPoint.y) / steps;

    await sendDebuggerCommand(targetTabId, "Input.dispatchMouseEvent", {
      type: "mousePressed",
      x: startPoint.x,
      y: startPoint.y,
      button: "left",
    });

    for (let i = 1; i <= steps; i++) {
      await sendDebuggerCommand(targetTabId, "Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: startPoint.x + stepX * i,
        y: startPoint.y + stepY * i,
        button: "left",
      });
      await sleep(50);
    }

    await sendDebuggerCommand(targetTabId, "Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x: toX,
      y: toY,
      button: "left",
    });

    return { ok: true, tabId: targetTabId, selector, fromX: startPoint.x, fromY: startPoint.y, toX, toY };
  }

  if (action === "focus_element") {
    const targetTabId = Number.isInteger(params.tabId) ? params.tabId : tab.id;
    const selector = typeof params.selector === "string" ? params.selector : "";
    if (!selector) throw new Error("Missing selector");

    const result = await executeInTab(targetTabId, (sel) => {
      const el = document.querySelector(sel);
      if (!el) return { ok: false, error: "Element not found" };
      el.focus();
      return { ok: true };
    }, [selector]);

    return { ...result, tabId: targetTabId, selector };
  }

  if (action === "blur_element") {
    const targetTabId = Number.isInteger(params.tabId) ? params.tabId : tab.id;
    const selector = typeof params.selector === "string" ? params.selector : "";
    if (!selector) throw new Error("Missing selector");

    const result = await executeInTab(targetTabId, (sel) => {
      const el = document.querySelector(sel);
      if (!el) return { ok: false, error: "Element not found" };
      el.blur();
      return { ok: true };
    }, [selector]);

    return { ...result, tabId: targetTabId, selector };
  }

  if (action === "scroll_element") {
    const targetTabId = Number.isInteger(params.tabId) ? params.tabId : tab.id;
    const selector = typeof params.selector === "string" ? params.selector : "";
    const direction = ["up", "down", "left", "right"].includes(params.direction) ? params.direction : "down";
    const amount = Number.isFinite(Number(params.amount)) ? Number(params.amount) : 300;

    if (!selector) throw new Error("Missing selector");

    const result = await executeInTab(targetTabId, (sel, dir, amt) => {
      const el = document.querySelector(sel);
      if (!el) return { ok: false, error: "Element not found" };

      if (dir === "down") el.scrollTop += amt;
      else if (dir === "up") el.scrollTop -= amt;
      else if (dir === "right") el.scrollLeft += amt;
      else if (dir === "left") el.scrollLeft -= amt;

      return { ok: true, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop };
    }, [selector, direction, amount]);

    return { ...result, tabId: targetTabId, selector, direction, amount };
  }

  if (action === "dom_extract_element") {
    const targetTabId = Number.isInteger(params.tabId) ? params.tabId : tab.id;
    const selector = typeof params.selector === "string" ? params.selector : "";
    const attributes = Array.isArray(params.attributes) ? params.attributes : [];

    if (!selector) throw new Error("Missing selector");

    const result = await executeInTab(targetTabId, (sel, attrs) => {
      const el = document.querySelector(sel);
      if (!el) return { ok: false, error: "Element not found" };

      const data = {
        tag: el.tagName.toLowerCase(),
        text: el.textContent?.substring(0, 5000) ?? "",
        html: el.innerHTML?.substring(0, 5000) ?? "",
        value: el.value ?? undefined,
      };

      attrs.forEach((attr) => {
        if (typeof attr === "string") {
          data[attr] = el.getAttribute(attr);
        }
      });

      return { ok: true, ...data };
    }, [selector, attributes]);

    return { ...result, tabId: targetTabId, selector };
  }

  if (action === "add_css") {
    const targetTabId = Number.isInteger(params.tabId) ? params.tabId : tab.id;
    const css = typeof params.css === "string" ? params.css : "";
    if (!css) throw new Error("Missing css");

    const result = await executeInTab(targetTabId, (style) => {
      const styleEl = document.createElement("style");
      styleEl.textContent = style;
      styleEl.setAttribute("data-injected", "true");
      document.head.appendChild(styleEl);
      return { ok: true, styleId: styleEl.id };
    }, [css]);

    return { ...result, tabId: targetTabId, cssLength: css.length };
  }

  if (action === "execute_javascript") {
    const targetTabId = Number.isInteger(params.tabId) ? params.tabId : tab.id;
    const code = typeof params.code === "string" ? params.code : "";
    if (!code) throw new Error("Missing code");

    const result = await cdpEvaluate(targetTabId, code);
    return { ok: true, tabId: targetTabId, result };
  }

  if (action === "set_viewport") {
    const width = Number.isInteger(params.width) ? params.width : 1280;
    const height = Number.isInteger(params.height) ? params.height : 720;
    const deviceScaleFactor = Number.isFinite(Number(params.deviceScaleFactor)) ? Number(params.deviceScaleFactor) : 1;

    const targetTabId = Number.isInteger(params.tabId) ? params.tabId : tab.id;
    await ensureDebuggerAttached(targetTabId);

    await sendDebuggerCommand(targetTabId, "Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor,
      mobile: false,
      hasTouch: false,
    });

    return { ok: true, tabId: targetTabId, width, height, deviceScaleFactor };
  }

  if (action === "emulate_mobile") {
    const device = typeof params.device === "string" ? params.device : "iPhone 12";
    const targetTabId = Number.isInteger(params.tabId) ? params.tabId : tab.id;

    await ensureDebuggerAttached(targetTabId);

    const mobileDevices: Record<string, any> = {
      "iPhone 12": { width: 390, height: 844, deviceScaleFactor: 3, mobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)" },
      "iPhone 14": { width: 390, height: 844, deviceScaleFactor: 3, mobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)" },
      "Pixel 6": { width: 412, height: 915, deviceScaleFactor: 2.75, mobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (Linux; Android 12)" },
      "iPad": { width: 768, height: 1024, deviceScaleFactor: 2, mobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (iPad)" },
    };

    const metrics = mobileDevices[device] || mobileDevices["iPhone 12"];

    await sendDebuggerCommand(targetTabId, "Emulation.setDeviceMetricsOverride", {
      width: metrics.width,
      height: metrics.height,
      deviceScaleFactor: metrics.deviceScaleFactor,
      mobile: metrics.mobile,
      hasTouch: metrics.hasTouch,
    });

    if (metrics.userAgent) {
      await sendDebuggerCommand(targetTabId, "Network.setUserAgentOverride", { userAgent: metrics.userAgent });
    }

    return { ok: true, tabId: targetTabId, device, ...metrics };
  }

  if (action === "resize_window") {
    const width = Number.isInteger(params.width) ? params.width : 1280;
    const height = Number.isInteger(params.height) ? params.height : 720;
    const windowId = Number.isInteger(params.windowId) ? params.windowId : undefined;

    const windows = await chrome.windows.getAll();
    const targetWindow = windowId ? windows.find((w) => w.id === windowId) : windows[0];

    if (!targetWindow) throw new Error("Window not found");

    await chrome.windows.update(targetWindow.id, { width, height });
    return { ok: true, windowId: targetWindow.id, width, height };
  }

  if (action === "toggle_fullscreen") {
    const targetTabId = Number.isInteger(params.tabId) ? params.tabId : tab.id;

    await ensureDebuggerAttached(targetTabId);
    await sendDebuggerCommand(targetTabId, "Input.dispatchKeyEvent", {
      type: "keyDown",
      key: "F11",
      code: "F11",
      windowsVirtualKeyCode: 122,
    });

    await sleep(100);

    await sendDebuggerCommand(targetTabId, "Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "F11",
      code: "F11",
      windowsVirtualKeyCode: 122,
    });

    return { ok: true, tabId: targetTabId };
  }

  if (action === "get_cookies") {
    const url = typeof params.url === "string" ? params.url : tab.url;

    const cookies = await chrome.cookies.getAll({ url });
    return {
      ok: true,
      cookies: cookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        expires: c.expirationDate,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite,
      })),
    };
  }

  if (action === "set_cookie") {
    const name = typeof params.name === "string" ? params.name : "";
    const value = typeof params.value === "string" ? params.value : "";
    const url = typeof params.url === "string" ? params.url : tab.url;
    const expires = Number.isFinite(Number(params.expires)) ? Number(params.expires) : undefined;

    if (!name || !value) throw new Error("Missing name or value");

    await chrome.cookies.set({
      url,
      name,
      value,
      expirationDate: expires,
    });

    return { ok: true, name, value, url };
  }

  if (action === "delete_cookie") {
    const name = typeof params.name === "string" ? params.name : "";
    const url = typeof params.url === "string" ? params.url : tab.url;

    if (!name) throw new Error("Missing name");

    await chrome.cookies.remove({ url, name });
    return { ok: true, name, url };
  }

  if (action === "get_performance_metrics") {
    const targetTabId = Number.isInteger(params.tabId) ? params.tabId : tab.id;

    await ensureDebuggerAttached(targetTabId);
    const metrics = await sendDebuggerCommand(targetTabId, "Performance.getMetrics", {});

    return {
      ok: true,
      tabId: targetTabId,
      metrics: metrics?.metrics?.map((m) => ({ name: m.name, value: m.value })) ?? [],
    };
  }

  if (action === "get_web_vitals") {
    const targetTabId = Number.isInteger(params.tabId) ? params.tabId : tab.id;

    const result = await executeInTab(targetTabId, () => {
      const vitals = {};

      if (window.performance?.timing) {
        const t = window.performance.timing;
        vitals.FCP = t.responseEnd - t.navigationStart;
        vitals.LCP = t.loadEventEnd - t.navigationStart;
      }

      if (window.performance?.navigation) {
        vitals.CLS = 0;
      }

      if (window.PerformanceObserver) {
        try {
          const po = new window.PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.name === "first-contentful-paint") vitals.FCP = entry.startTime;
              if (entry.entryType === "largest-contentful-paint") vitals.LCP = entry.startTime;
              if (entry.entryType === "layout-shift") vitals.CLS = (vitals.CLS || 0) + entry.value;
            }
          });
          po.observe({ entryTypes: ["paint", "largest-contentful-paint", "layout-shift"] });
        } catch {
          /* observer not available */
        }
      }

      return { ok: true, ...vitals };
    }, []);

    return { ...result, tabId: targetTabId };
  }

  if (action === "get_console_logs") {
    const targetTabId = Number.isInteger(params.tabId) ? params.tabId : tab.id;

    const result = await executeInTab(targetTabId, () => {
      const logs = [];
      const origLog = console.log;
      const origWarn = console.warn;
      const origError = console.error;

      console.log = (...args) => {
        logs.push({ level: "log", message: args.map((a) => String(a)).join(" ") });
        origLog(...args);
      };
      console.warn = (...args) => {
        logs.push({ level: "warn", message: args.map((a) => String(a)).join(" ") });
        origWarn(...args);
      };
      console.error = (...args) => {
        logs.push({ level: "error", message: args.map((a) => String(a)).join(" ") });
        origError(...args);
      };

      return { ok: true, logs: logs.slice(-100) };
    }, []);

    return { ...result, tabId: targetTabId };
  }

  if (action === "dom_snapshot") {
    const targetTabId = Number.isInteger(params.tabId) ? params.tabId : tab.id;

    const result = await executeInTab(targetTabId, () => {
      return {
        ok: true,
        snapshot: {
          html: document.documentElement.outerHTML.substring(0, 50000),
          title: document.title,
          url: window.location.href,
          referrer: document.referrer,
          characterSet: document.characterSet,
        },
      };
    }, []);

    return { ...result, tabId: targetTabId };
  }

  if (action === "minimal_snapshot") {
    const targetTabId = Number.isInteger(params.tabId) ? params.tabId : tab.id;

    const result = await executeInTab(targetTabId, () => {
      const getText = (el) => {
        const text = el.textContent?.trim() ?? "";
        return text.substring(0, 500);
      };

      const elements = Array.from(document.querySelectorAll("h1, h2, h3, p, a, button, input, textarea")).map((el) => ({
        tag: el.tagName.toLowerCase(),
        text: getText(el),
        classes: el.className,
        id: el.id,
      }));

      return {
        ok: true,
        url: window.location.href,
        title: document.title,
        elements: elements.slice(0, 100),
      };
    }, []);

    return { ...result, tabId: targetTabId };
  }

  if (action === "semantic_snapshot") {
    const targetTabId = Number.isInteger(params.tabId) ? params.tabId : tab.id;

    const result = await executeInTab(targetTabId, () => {
      const snapshot = {
        url: window.location.href,
        title: document.title,
        headings: [],
        buttons: [],
        links: [],
        inputs: [],
        forms: [],
      };

      document.querySelectorAll("h1, h2, h3").forEach((h) => {
        const text = h.textContent?.trim() ?? "";
        if (text) snapshot.headings.push(text.substring(0, 200));
      });

      document.querySelectorAll("button").forEach((b) => {
        const text = b.textContent?.trim() ?? "";
        if (text) snapshot.buttons.push(text.substring(0, 100));
      });

      document.querySelectorAll("a").forEach((a) => {
        const text = a.textContent?.trim() ?? "";
        const href = a.href ?? "";
        if (text && href) snapshot.links.push({ text: text.substring(0, 100), href });
      });

      document.querySelectorAll("input").forEach((input) => {
        snapshot.inputs.push({
          type: input.type,
          name: input.name,
          placeholder: input.placeholder,
        });
      });

      document.querySelectorAll("form").forEach((form) => {
        snapshot.forms.push({
          id: form.id,
          action: form.action,
          method: form.method,
        });
      });

      return { ok: true, ...snapshot };
    }, []);

    return { ...result, tabId: targetTabId };
  }

  if (action === "list_downloads") {
    const query = params.query || {};
    const downloads = await chrome.downloads.search(query);

    return {
      ok: true,
      downloads: downloads.map((d) => ({
        id: d.id,
        filename: d.filename,
        url: d.url,
        startTime: d.startTime,
        endTime: d.endTime,
        state: d.state,
        bytesReceived: d.bytesReceived,
        totalBytes: d.totalBytes,
      })),
    };
  }

  if (action === "create_tab_group") {
    const title = typeof params.title === "string" ? params.title : "Group";
    const color = ["grey", "blue", "red", "yellow", "green", "pink", "purple", "cyan"].includes(params.color)
      ? params.color
      : "grey";

    try {
      const tabIds = Array.isArray(params.tabIds) ? params.tabIds.filter((id) => Number.isInteger(id)) : [];
      const group = await chrome.tabGroups.create({ tabIds, title, color });
      return { ok: true, groupId: group.id, title, color };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  if (action === "delete_tab_group") {
    const groupId = Number.isInteger(params.groupId) ? params.groupId : -1;
    if (groupId < 0) throw new Error("Invalid groupId");

    try {
      await chrome.tabGroups.remove(groupId);
      return { ok: true, groupId };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }



async function initializeBridgeBackground() {
  ensureWakeAlarm();
  await ensureOffscreenDocument();
  await notifyOffscreenConfigUpdated();
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "bridge-command") {
    const command = message.command ?? {};
    handleCommand(command.action, command.params ?? {})
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }));
    return true;
  }

  if (message?.type === "bridge-get-config") {
    getBridgeConfig()
      .then((config) => sendResponse({ ok: true, config }))
      .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }));
    return true;
  }

  return false;
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  if (changes.bridgeUrl || changes.bridgeToken) {
    notifyOffscreenConfigUpdated();
  }
});

chrome.runtime.onStartup.addListener(() => {
  initializeBridgeBackground();
});

chrome.runtime.onInstalled.addListener(() => {
  initializeBridgeBackground();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === WAKE_ALARM_NAME) {
    initializeBridgeBackground();
  }
});

chrome.debugger.onDetach.addListener((source) => {
  if (source?.tabId !== undefined) {
    debuggerAttachedTabs.delete(source.tabId);
  }
});

initializeBridgeBackground();
