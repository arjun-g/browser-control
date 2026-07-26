const DEFAULT_BRIDGE_URL = "ws://127.0.0.1:17374";

async function loadSettings() {
  const values = await chrome.storage.local.get({
    bridgeUrl: DEFAULT_BRIDGE_URL,
    bridgeToken: "",
  });

  document.getElementById("bridgeUrl").value = values.bridgeUrl || DEFAULT_BRIDGE_URL;
  document.getElementById("bridgeToken").value = values.bridgeToken || "";
}

async function saveSettings() {
  const bridgeUrl = document.getElementById("bridgeUrl").value.trim();
  const bridgeToken = document.getElementById("bridgeToken").value;
  const status = document.getElementById("status");

  if (!bridgeUrl) {
    status.textContent = "Bridge URL is required.";
    status.style.color = "#a21d2d";
    return;
  }

  try {
    new URL(bridgeUrl);
  } catch {
    status.textContent = "Bridge URL must be a valid URL.";
    status.style.color = "#a21d2d";
    return;
  }

  await chrome.storage.local.set({ bridgeUrl, bridgeToken });
  status.textContent = "Saved.";
  status.style.color = "#1f7a3a";
}

document.getElementById("saveBtn").addEventListener("click", saveSettings);
loadSettings();
