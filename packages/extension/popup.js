// Popup script for managing sidebar and history view
let currentSessionId = null;

const historyTab = document.getElementById("historyTab");
const settingsTab = document.getElementById("settingsTab");
const tabButtons = document.querySelectorAll(".tab");
const openSidebarBtn = document.getElementById("openSidebar");
const clearHistoryBtn = document.getElementById("clearHistory");
const sidebarToggleBtn = document.getElementById("sidebarToggle");
const refreshBtn = document.getElementById("refreshBtn");
const bridgeUrlInput = document.getElementById("bridgeUrl");
const bridgeTokenInput = document.getElementById("bridgeToken");

// Tab switching
tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tabName = btn.dataset.tab;
    tabButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    historyTab.style.display = tabName === "history" ? "block" : "none";
    settingsTab.style.display = tabName === "settings" ? "block" : "none";
  });
});

// Load settings
async function loadSettings() {
  const config = await chrome.storage.local.get({
    bridgeUrl: "ws://127.0.0.1:17374",
    bridgeToken: "",
  });
  bridgeUrlInput.value = config.bridgeUrl || "ws://127.0.0.1:17374";
  bridgeTokenInput.value = config.bridgeToken || "";
}

// Save settings
async function saveSettings() {
  const config = {
    bridgeUrl: bridgeUrlInput.value,
    bridgeToken: bridgeTokenInput.value,
  };
  await chrome.storage.local.set(config);
  chrome.runtime.sendMessage({ type: "bridge-config-updated" }).catch(() => {});
}

bridgeUrlInput.addEventListener("change", saveSettings);
bridgeTokenInput.addEventListener("change", saveSettings);

// Load and display history
async function loadHistory() {
  const sessions = await getAllSessions();

  if (sessions.length === 0) {
    historyTab.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <p>No command history yet</p>
      </div>
    `;
    return;
  }

  historyTab.innerHTML = sessions
    .map((session) => {
      const startTime = new Date(session.startTime);
      const timeStr = startTime.toLocaleTimeString();
      const dateStr = startTime.toLocaleDateString();

      return `
        <div class="session-item" data-session-id="${session.id}">
          <div class="session-header">
            <div>
              <div style="font-size: 12px; color: #5f6368">${dateStr}</div>
              <div style="font-size: 13px; font-weight: 500">${timeStr}</div>
            </div>
            <div class="session-count">${session.commandCount || 0} commands</div>
          </div>
        </div>
      `;
    })
    .join("");

  document.querySelectorAll(".session-item").forEach((item) => {
    item.addEventListener("click", async () => {
      const sessionId = item.dataset.sessionId;
      await chrome.windows.create({
        url: `sidebar.html?sessionId=${sessionId}`,
        type: "popup",
        width: 600,
        height: 800,
      });
    });
  });
}

// Open sidebar
openSidebarBtn.addEventListener("click", async () => {
  const windows = await chrome.windows.getAll({ windowTypes: ["popup"] });
  const sidebarWindow = windows.find((w) => w.focused);

  if (sidebarWindow) {
    await chrome.windows.update(sidebarWindow.id, { focused: true });
  } else {
    await chrome.windows.create({
      url: "sidebar.html",
      type: "popup",
      width: 600,
      height: 800,
    });
  }
});

// Sidebar toggle
sidebarToggleBtn.addEventListener("click", async () => {
  const windows = await chrome.windows.getAll({ windowTypes: ["popup"] });
  const sidebarWindow = windows.find((w) => w.title?.includes("Command History"));

  if (sidebarWindow) {
    await chrome.windows.remove(sidebarWindow.id);
  } else {
    openSidebarBtn.click();
  }
});

// Clear history
clearHistoryBtn.addEventListener("click", async () => {
  if (confirm("Delete all command history?")) {
    const sessions = await getAllSessions();
    for (const session of sessions) {
      await deleteSession(session.id);
    }
    await loadHistory();
  }
});

// Refresh
refreshBtn.addEventListener("click", loadHistory);

// Initialize
loadSettings();
loadHistory();

// Auto-refresh every 5 seconds
setInterval(loadHistory, 5000);
