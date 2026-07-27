// Sidebar script for displaying command history
let currentSessionId = null;
let allSessions = [];
let currentFilter = "all";
let commands = [];
let refreshInterval;

const container = document.getElementById("commandsContainer");
const footer = document.getElementById("footer");
const tabBtns = Array.from(document.querySelectorAll(".tab"));
const filterBtns = Array.from(document.querySelectorAll(".filter-btn"));
const settingsTab = document.getElementById("settingsTab");
const historyTab = document.getElementById("historyTab");
const toggleSidebarBtn = document.getElementById("toggleSidebar");
const saveSettingsBtn = document.getElementById("saveSettings");
const bridgeTokenInput = document.getElementById("bridgeToken");

// New elements for multi-session support
const sessionSelect = document.getElementById("sessionSelect");
const historySessionSelector = document.getElementById("historySessionSelector");
const historySessionMetadata = document.getElementById("historySessionMetadata");
const sessionList = document.getElementById("sessionList");
const overviewHeader = document.getElementById("overviewHeader");
const totalSessionCount = document.getElementById("totalSessionCount");
const metadataAgent = document.getElementById("metadataAgent");
const metadataAgentRow = document.getElementById("metadataAgentRow");
const metadataStartTime = document.getElementById("metadataStartTime");
const metadataDuration = document.getElementById("metadataDuration");
const metadataCommandCount = document.getElementById("metadataCommandCount");

// Debug logging
console.log("Sidebar initialized. Container:", container, "Footer:", footer);

// Parse URL params
function getSessionId() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("sessionId");
  return sessionId ? parseInt(sessionId, 10) : null;
}

// Format time
function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
}

// Store for screenshot data URLs (keyed by index) — avoids embedding huge base64 in DOM attributes
const screenshotStore = new Map();
let screenshotCounter = 0;

// Render result (handle images specially)
function renderResult(result) {
  if (!result) return "";

  // Determine the data URL: handle both legacy .screenshot and .dataUrl
  let dataUrl = null;
  if (result.dataUrl && result.dataUrl.startsWith("data:image")) {
    dataUrl = result.dataUrl;
  } else if (result.screenshot) {
    dataUrl = `data:image/png;base64,${result.screenshot}`;
  }

  if (dataUrl) {
    const id = `ss-${screenshotCounter++}`;
    screenshotStore.set(id, dataUrl);
    return `<div class="result-screenshot"><img src="${dataUrl}" alt="Screenshot" class="thumbnail" data-screenshot-id="${id}" title="Click to open full size" /><span class="thumbnail-hint">Click to open full size</span></div>`;
  }

  // Exclude dataUrl from result text since we handled it above
  const display = typeof result === "object" ? Object.fromEntries(Object.entries(result).filter(([k]) => k !== "dataUrl" && k !== "screenshot")) : result;
  let resultStr = typeof display === "string" ? display : JSON.stringify(display, null, 2);
  if (resultStr.length > 300) {
    resultStr = resultStr.substring(0, 300) + "...";
  }

  return `<code>${escapeHtml(resultStr)}</code>`;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Format duration (ms to human readable)
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

// Format time for display
function formatTimeForDisplay(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// Load all sessions from IndexedDB
async function loadAllSessions() {
  try {
    const sessions = await getAllSessions();
    console.log("Loaded all sessions:", sessions);
    allSessions = sessions;
    return sessions;
  } catch (error) {
    console.error("Error loading all sessions:", error);
    allSessions = [];
    return [];
  }
}

// Update session selector dropdown
async function updateSessionSelector() {
  const sessions = await loadAllSessions();

  // Rebuild options
  sessionSelect.innerHTML = sessions
    .map((session) => {
      const startTime = formatTimeForDisplay(session.startTime);
      const agentLabel = session.agent && session.agent !== "unknown" ? ` · ${session.agent}` : "";
      return `<option value="${session.id}">${startTime}${agentLabel} (${session.commandCount} cmd${session.commandCount !== 1 ? "s" : ""})</option>`;
    })
    .join("");

  // Set currentSessionId to the most recent session on first load
  if (sessions.length > 0 && !currentSessionId) {
    currentSessionId = sessions[0].id;
  }

  // Always restore the selected value after rebuilding innerHTML
  if (currentSessionId) {
    sessionSelect.value = String(currentSessionId);
  }

  if (totalSessionCount) {
    totalSessionCount.textContent = `${sessions.length} session${sessions.length !== 1 ? "s" : ""}`;
  }
}

// Update session metadata display
async function updateSessionMetadata(sessionId) {
  // Always fetch fresh from allSessions (re-load if stale)
  let session = allSessions.find((s) => s.id === sessionId);
  if (!session) {
    await loadAllSessions();
    session = allSessions.find((s) => s.id === sessionId);
  }
  if (!session) return;

  metadataStartTime.textContent = formatTimeForDisplay(session.startTime);

  // Show agent name if available
  if (session.agent && session.agent !== "unknown") {
    metadataAgent.textContent = session.agent;
    metadataAgentRow.style.display = "flex";
  } else {
    metadataAgentRow.style.display = "none";
  }

  // Use actual command count from the loaded commands array if available
  const count = commands.length > 0 && commands[0].sessionId === sessionId
    ? commands.length
    : session.commandCount;
  metadataCommandCount.textContent = `${count} command${count !== 1 ? "s" : ""}`;

  // Duration: time between first and last command, or time since session start if no commands
  if (session.firstCommandAt && session.lastCommandAt && session.firstCommandAt !== session.lastCommandAt) {
    metadataDuration.textContent = formatDuration(session.lastCommandAt - session.firstCommandAt);
  } else if (session.lastCommandAt) {
    metadataDuration.textContent = formatDuration(Date.now() - session.firstCommandAt);
  } else {
    metadataDuration.textContent = formatDuration(Date.now() - new Date(session.startTime).getTime());
  }
}

// Render overview of all sessions
async function renderOverview() {
  const sessions = await loadAllSessions();
  
  if (sessions.length === 0) {
    sessionList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <p>No sessions yet</p>
      </div>
    `;
    sessionList.style.display = "flex";
    container.style.display = "none";
    return;
  }
  
  sessionList.style.display = "flex";
  container.style.display = "none";
  
  sessionList.innerHTML = sessions.map((session) => {
    const startTime = formatTimeForDisplay(session.startTime);
    // Duration: first to last command; fallback to wall-clock time
    let duration = "-";
    if (session.firstCommandAt && session.lastCommandAt && session.firstCommandAt !== session.lastCommandAt) {
      duration = formatDuration(session.lastCommandAt - session.firstCommandAt);
    } else if (session.firstCommandAt) {
      duration = "< 1s";
    }
    // Active: last command within 5 minutes
    const ACTIVE_THRESHOLD_MS = 10 * 60 * 1000;
    const isActive = session.lastCommandAt
      ? Date.now() - session.lastCommandAt < ACTIVE_THRESHOLD_MS
      : Date.now() - new Date(session.startTime).getTime() < ACTIVE_THRESHOLD_MS;
    
    return `
      <div class="session-card" data-session-id="${session.id}">
        <div class="session-header">
          <span class="session-time">${startTime}</span>
          <span class="session-status ${isActive ? "" : "completed"}">
            ${isActive ? "Active" : "Completed"}
          </span>
        </div>
        ${session.agent && session.agent !== "unknown" ? `<div class="session-agent">🤖 <strong>${escapeHtml(session.agent)}</strong></div>` : ""}
        <div class="session-info">
          <div class="session-stat">
            <span class="session-stat-label">Commands:</span>
            <span class="session-stat-value">${session.commandCount}</span>
          </div>
          <div class="session-stat">
            <span class="session-stat-label">Duration:</span>
            <span class="session-stat-value">${duration}</span>
          </div>
        </div>
      </div>
    `;
  }).join("");
  
  // Add click handlers to session cards
  document.querySelectorAll(".session-card").forEach((card) => {
    card.addEventListener("click", async () => {
      const sessionId = parseInt(card.getAttribute("data-session-id"), 10);
      currentSessionId = sessionId;
      sessionSelect.value = sessionId;
      await loadCommands();
      
      // Switch to history tab
      tabBtns.forEach((btn) => btn.classList.remove("active"));
      tabBtns.find((btn) => btn.getAttribute("data-tab") === "history").classList.add("active");
      
      overviewHeader.style.display = "none";
      historySessionSelector.classList.add("active");
      historySessionMetadata.classList.add("active");
      historyTab.style.display = "flex";
      container.style.display = "block";
      sessionList.style.display = "none";
    });
  });
}

// Render command item
function renderCommand(cmd) {
  const statusClass = cmd.status === "success" ? "status-success" : cmd.status === "error" ? "status-error" : "status-loading";
  const statusText = cmd.status === "success" ? "✓ Success" : cmd.status === "error" ? "✕ Error" : "⏳ Running";
  const itemClass = `command-item ${cmd.status === "error" ? "error" : cmd.status === "loading" ? "loading" : ""}`;

  // Params: skip if empty object
  const hasParams = cmd.params && Object.keys(cmd.params).length > 0;
  const paramsStr = hasParams ? JSON.stringify(cmd.params, null, 2) : null;
  const paramsDisplay = paramsStr && paramsStr.length > 120 ? paramsStr.substring(0, 120) + "…" : paramsStr;

  const resultHtml = cmd.result ? renderResult(cmd.result) : "";

  return `
    <div class="${itemClass}">
      <div class="command-header">
        <div>
          <div class="command-action">${escapeHtml(cmd.action)}</div>
        </div>
        <div class="command-time">${formatTime(cmd.timestamp)}</div>
      </div>
      <div class="command-status ${statusClass}">${statusText}</div>
      ${paramsDisplay ? `<div class="command-params">${escapeHtml(paramsDisplay)}</div>` : ""}
      ${resultHtml ? `<div class="command-result">${resultHtml}</div>` : ""}
    </div>
  `;
}

// Load and display commands
async function loadCommands() {
  try {
    if (!currentSessionId) {
      const sessions = await getAllSessions();
      console.log("Fetched sessions:", sessions);
      if (sessions.length === 0) {
        currentSessionId = (await createSession()).id;
        console.log("Created new session:", currentSessionId);
      } else {
        currentSessionId = sessions[0].id;
        console.log("Using existing session:", currentSessionId);
      }
    }

    commands = await getCommandsBySession(currentSessionId);
    console.log("Loaded commands for session", currentSessionId, ":", commands);

    // Sort commands by timestamp descending (latest first)
    commands.sort((a, b) => b.timestamp - a.timestamp);

    // Filter commands
    let filtered = commands;
    if (currentFilter === "success") {
      filtered = commands.filter((c) => c.status === "success");
    } else if (currentFilter === "error") {
      filtered = commands.filter((c) => c.status === "error");
    }

    if (!container) {
      console.error("Container element not found!");
      return;
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <p>No commands yet</p>
        </div>
      `;
    } else {
      container.innerHTML = filtered.map((cmd) => renderCommand(cmd)).join("");
      // Attach click handlers for screenshot thumbnails using the data store
      container.querySelectorAll(".thumbnail[data-screenshot-id]").forEach((img) => {
        img.addEventListener("click", () => {
          const id = img.getAttribute("data-screenshot-id");
          const url = screenshotStore.get(id);
          if (url) {
            const win = window.open();
            win.document.write(`<img src="${url}" style="max-width:100%;display:block;margin:auto;">`);
          }
        });
      });
    }

    if (footer) {
      footer.textContent = `${filtered.length} command${filtered.length !== 1 ? "s" : ""} (${commands.filter((c) => c.status === "error").length} errors)`;
    }
  } catch (error) {
    console.error("Error loading commands:", error);
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">❌</div>
          <p>Error loading commands: ${error.message}</p>
        </div>
      `;
    }
  }
}

// Tab switching
tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    tabBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    // Hide all sections
    historySessionSelector.classList.remove("active");
    historySessionMetadata.classList.remove("active");
    historyTab.style.display = "none";
    container.style.display = "none";
    sessionList.style.display = "none";
    overviewHeader.style.display = "none";
    settingsTab.classList.remove("active");

    if (tab === "history") {
      historySessionSelector.classList.add("active");
      historySessionMetadata.classList.add("active");
      historyTab.style.display = "flex";
      container.style.display = "block";
      loadCommands().catch(console.error);
    } else if (tab === "overview") {
      overviewHeader.style.display = "flex";
      sessionList.style.display = "flex";
      renderOverview().catch(console.error);
    } else if (tab === "settings") {
      settingsTab.classList.add("active");
    }
  });
});

// Session selector change handler
sessionSelect.addEventListener("change", async () => {
  const sessionId = parseInt(sessionSelect.value, 10);
  if (sessionId) {
    currentSessionId = sessionId;
    await loadCommands();
    await updateSessionMetadata(currentSessionId);
  }
});

// Filter buttons
filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    loadCommands();
  });
});

// Load settings
async function loadSettings() {
  const config = await chrome.storage.local.get({ bridgeToken: "" });
  if (bridgeTokenInput) bridgeTokenInput.value = config.bridgeToken || "";
}

// Save settings
saveSettingsBtn.addEventListener("click", async () => {
  const config = { bridgeToken: bridgeTokenInput.value };
  await chrome.storage.local.set(config);
  chrome.runtime.sendMessage({ type: "bridge-config-updated" }).catch(() => {});
  alert("Token saved!");
});

// Hide sidebar button - side panel is managed by Chrome
if (toggleSidebarBtn) {
  toggleSidebarBtn.addEventListener("click", async () => {
    console.log("Side panel close requested (user-initiated)");
  });
}

// Listen for command updates
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "command-executed") {
    commands.push(message.command);
    loadCommands();
  }
});

// Initialize — must be fully async so session selector is populated before loading commands
console.log("Sidebar initializing...");
loadSettings().catch((error) => console.error("Error loading settings:", error));

(async () => {
  // Load sessions first so currentSessionId gets set
  await updateSessionSelector();
  // Now currentSessionId is set to the most recent session (if any)
  if (currentSessionId) {
    await loadCommands();
    await updateSessionMetadata(currentSessionId);
  }
})().catch(console.error);

// Auto-refresh every 2 seconds — only reload commands and metadata, not the dropdown
// Dropdown is refreshed every 10 seconds to show updated session counts without disruption
let sessionSelectorRefreshCounter = 0;
refreshInterval = setInterval(async () => {
  await loadCommands().catch((error) => console.error("Error during auto-refresh:", error));
  if (currentSessionId) {
    await updateSessionMetadata(currentSessionId).catch(console.error);
  }
  // Refresh session selector counts every 5 ticks (~10s) to avoid constant rebuilding
  sessionSelectorRefreshCounter++;
  if (sessionSelectorRefreshCounter >= 5) {
    sessionSelectorRefreshCounter = 0;
    await updateSessionSelector().catch((error) => console.error("Error refreshing sessions:", error));
  }
}, 2000);

// Cleanup
window.addEventListener("unload", () => {
  clearInterval(refreshInterval);
});
