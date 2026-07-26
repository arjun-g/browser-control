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

  if (action === "navigate") {
    if (!params.url || typeof params.url !== "string") {
      throw new Error("Missing url");
    }
    await chrome.tabs.update(tab.id, { url: params.url });
    return { ok: true, tabId: tab.id, url: params.url };
  }

  if (action === "back") {
    const result = await executeInTab(
      tab.id,
      () => {
        history.back();
        return { ok: true };
      },
      [],
    );
    return { ...result, tabId: tab.id };
  }

  if (action === "forward") {
    const result = await executeInTab(
      tab.id,
      () => {
        history.forward();
        return { ok: true };
      },
      [],
    );
    return { ...result, tabId: tab.id };
  }

  if (action === "click") {
    return executeInTab(
      tab.id,
      (selector) => {
        const el = document.querySelector(selector);
        if (!(el instanceof HTMLElement)) {
          throw new Error(`Element not found: ${selector}`);
        }
        el.click();
        return { ok: true, selector };
      },
      [params.selector],
    );
  }

  if (action === "type") {
    return executeInTab(
      tab.id,
      (selector, text, submit) => {
        const el = document.querySelector(selector);
        if (!(el instanceof HTMLElement)) {
          throw new Error(`Element not found: ${selector}`);
        }

        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          el.focus();
          el.value = text;
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
          if (submit) {
            el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
          }
          return { ok: true, selector, textLength: text.length };
        }

        el.focus();
        document.execCommand("insertText", false, text);
        if (submit) {
          el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
        }
        return { ok: true, selector, textLength: text.length };
      },
      [params.selector, params.text, Boolean(params.submit)],
    );
  }

  if (action === "keypress") {
    return executeInTab(
      tab.id,
      (key, ctrlKey, shiftKey, altKey, metaKey) => {
        const target = document.activeElement ?? document.body;
        const eventInit = { key, ctrlKey, shiftKey, altKey, metaKey, bubbles: true };
        target.dispatchEvent(new KeyboardEvent("keydown", eventInit));
        target.dispatchEvent(new KeyboardEvent("keypress", eventInit));
        target.dispatchEvent(new KeyboardEvent("keyup", eventInit));
        return { ok: true, key };
      },
      [params.key, Boolean(params.ctrlKey), Boolean(params.shiftKey), Boolean(params.altKey), Boolean(params.metaKey)],
    );
  }

  if (action === "read_dom") {
    return executeInTab(
      tab.id,
      (maxChars) => {
        const html = document.documentElement?.outerHTML ?? "";
        const cut = Math.max(1, Number(maxChars) || 200000);
        return {
          ok: true,
          url: location.href,
          title: document.title,
          htmlLength: html.length,
          truncated: html.length > cut,
          html: html.slice(0, cut),
        };
      },
      [params.maxChars],
    );
  }

  if (action === "screenshot") {
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
    return { ok: true, tabId: tab.id, dataUrl };
  }

  if (action === "attach_debugger") {
    const targetTabId = Number.isInteger(params.tabId) ? params.tabId : tab.id;
    const result = await attachDebugger(targetTabId);
    return { ok: true, tabId: targetTabId, ...result };
  }

  if (action === "detach_debugger") {
    const targetTabId = Number.isInteger(params.tabId) ? params.tabId : tab.id;
    const result = await detachDebugger(targetTabId);
    return { ok: true, tabId: targetTabId, ...result };
  }

  if (action === "debugger_status") {
    return {
      ok: true,
      activeTabId: tab.id,
      activeTabAttached: debuggerAttachedTabs.has(tab.id),
      attachedTabIds: [...debuggerAttachedTabs.values()],
    };
  }

  if (action === "cdp_command") {
    const targetTabId = Number.isInteger(params.tabId) ? params.tabId : tab.id;
    const method = typeof params.method === "string" ? params.method : "";
    const commandParams = params.commandParams && typeof params.commandParams === "object" ? params.commandParams : {};
    const autoAttach = params.autoAttach !== false;

    if (!method) {
      throw new Error("Missing CDP method");
    }

    if (autoAttach && !debuggerAttachedTabs.has(targetTabId)) {
      await attachDebugger(targetTabId);
    }

    const result = await sendDebuggerCommand(targetTabId, method, commandParams);
    return { ok: true, tabId: targetTabId, method, result };
  }

  if (action === "cdp_click") {
    const targetTabId = Number.isInteger(params.tabId) ? params.tabId : tab.id;
    const selector = typeof params.selector === "string" ? params.selector : "";
    const clickCount = Number.isInteger(params.clickCount) ? params.clickCount : 1;
    const button = cdpButtonToInputButton(params.button);

    if (!selector) {
      throw new Error("Missing selector");
    }

    await ensureDebuggerAttached(targetTabId);
    await sendDebuggerCommand(targetTabId, "Page.enable", {});

    const point = await cdpFindElementCenter(targetTabId, selector);
    if (!point?.ok) {
      throw new Error(point?.error ?? "Failed to resolve element position");
    }

    await sendDebuggerCommand(targetTabId, "Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: point.x,
      y: point.y,
      button,
      clickCount,
    });

    await sendDebuggerCommand(targetTabId, "Input.dispatchMouseEvent", {
      type: "mousePressed",
      x: point.x,
      y: point.y,
      button,
      clickCount,
    });

    await sendDebuggerCommand(targetTabId, "Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x: point.x,
      y: point.y,
      button,
      clickCount,
    });

    return { ok: true, tabId: targetTabId, selector, x: point.x, y: point.y, button, clickCount };
  }

  if (action === "cdp_type") {
    const targetTabId = Number.isInteger(params.tabId) ? params.tabId : tab.id;
    const selector = typeof params.selector === "string" ? params.selector : "";
    const text = typeof params.text === "string" ? params.text : "";
    const clear = params.clear !== false;
    const submit = params.submit === true;
    const delayMs = Number.isFinite(Number(params.delayMs)) ? Math.max(0, Number(params.delayMs)) : 0;

    if (!selector) {
      throw new Error("Missing selector");
    }

    await ensureDebuggerAttached(targetTabId);

    const focusResult = await cdpFocusElement(targetTabId, selector, clear);
    if (!focusResult?.ok) {
      throw new Error(focusResult?.error ?? "Failed to focus element");
    }

    if (delayMs > 0) {
      for (const char of text) {
        await sendDebuggerCommand(targetTabId, "Input.insertText", { text: char });
        await sleep(delayMs);
      }
    } else {
      await sendDebuggerCommand(targetTabId, "Input.insertText", { text });
    }

    if (submit) {
      await cdpDispatchEnter(targetTabId);
    }

    return { ok: true, tabId: targetTabId, selector, textLength: text.length, clear, submit, delayMs };
  }

  if (action === "cdp_keypress") {
    const targetTabId = Number.isInteger(params.tabId) ? params.tabId : tab.id;
    const key = typeof params.key === "string" && params.key.length > 0 ? params.key : "";
    const code = typeof params.code === "string" && params.code.length > 0 ? params.code : key;
    const windowsVirtualKeyCode = Number.isInteger(params.windowsVirtualKeyCode)
      ? params.windowsVirtualKeyCode
      : key.length === 1
        ? key.toUpperCase().charCodeAt(0)
        : 0;
    const modifiers =
      (params.altKey ? 1 : 0) +
      (params.ctrlKey ? 2 : 0) +
      (params.metaKey ? 4 : 0) +
      (params.shiftKey ? 8 : 0);

    if (!key) {
      throw new Error("Missing key");
    }

    await ensureDebuggerAttached(targetTabId);

    await sendDebuggerCommand(targetTabId, "Input.dispatchKeyEvent", {
      type: "keyDown",
      key,
      code,
      windowsVirtualKeyCode,
      nativeVirtualKeyCode: windowsVirtualKeyCode,
      modifiers,
    });

    await sendDebuggerCommand(targetTabId, "Input.dispatchKeyEvent", {
      type: "keyUp",
      key,
      code,
      windowsVirtualKeyCode,
      nativeVirtualKeyCode: windowsVirtualKeyCode,
      modifiers,
    });

    return { ok: true, tabId: targetTabId, key, code, modifiers };
  }

  if (action === "cdp_scroll") {
    const targetTabId = Number.isInteger(params.tabId) ? params.tabId : tab.id;
    const deltaX = Number.isFinite(Number(params.deltaX)) ? Number(params.deltaX) : 0;
    const deltaY = Number.isFinite(Number(params.deltaY)) ? Number(params.deltaY) : 500;
    const steps = Number.isInteger(params.steps) ? Math.max(1, params.steps) : 1;

    await ensureDebuggerAttached(targetTabId);

    const viewport = await cdpEvaluate(targetTabId, "({ x: Math.floor(window.innerWidth / 2), y: Math.floor(window.innerHeight / 2) })");
    const x = viewport.result?.value?.x ?? 0;
    const y = viewport.result?.value?.y ?? 0;

    for (let i = 0; i < steps; i += 1) {
      await sendDebuggerCommand(targetTabId, "Input.dispatchMouseEvent", {
        type: "mouseWheel",
        x,
        y,
        deltaX,
        deltaY,
      });
    }

    return { ok: true, tabId: targetTabId, x, y, deltaX, deltaY, steps };
  }

  if (action === "cdp_wait_for_selector") {
    const targetTabId = Number.isInteger(params.tabId) ? params.tabId : tab.id;
    const selector = typeof params.selector === "string" ? params.selector : "";
    const timeoutMs = Number.isFinite(Number(params.timeoutMs)) ? Math.max(100, Number(params.timeoutMs)) : 10000;
    const pollMs = Number.isFinite(Number(params.pollMs)) ? Math.max(25, Number(params.pollMs)) : 200;
    const visible = params.visible === true;

    if (!selector) {
      throw new Error("Missing selector");
    }

    await ensureDebuggerAttached(targetTabId);

    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const probe = await cdpEvaluate(
        targetTabId,
        `(() => {
          const selector = ${jsString(selector)};
          const visible = ${visible ? "true" : "false"};
          const el = document.querySelector(selector);
          if (!el) {
            return { found: false, visible: false };
          }
          if (!visible) {
            return { found: true, visible: true };
          }
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
        return {
          ok: true,
          tabId: targetTabId,
          status,
          url,
          elapsedMs: Date.now() - start,
        };
      }

      await sleep(pollMs);
    }

    throw new Error("Timed out waiting for navigation");
  }

  if (action === "cdp_screenshot") {
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
        captureParams.clip = {
          x: 0,
          y: 0,
          width: contentSize.width,
          height: contentSize.height,
          scale: 1,
        };
      }
    }

    const shot = await sendDebuggerCommand(targetTabId, "Page.captureScreenshot", captureParams);
    return {
      ok: true,
      tabId: targetTabId,
      fullPage,
      format,
      dataUrl: `data:image/${format};base64,${shot.data}`,
    };
  }

  throw new Error(`Unsupported action: ${action}`);
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
