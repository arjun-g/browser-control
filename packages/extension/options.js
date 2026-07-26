async function loadSettings() {
  const values = await chrome.storage.local.get({ bridgeToken: "" });
  document.getElementById("bridgeToken").value = values.bridgeToken || "";
}

async function saveSettings() {
  const bridgeToken = document.getElementById("bridgeToken").value;
  const status = document.getElementById("status");
  await chrome.storage.local.set({ bridgeToken });
  status.textContent = "Saved.";
  status.style.color = "#1f7a3a";
}

document.getElementById("saveBtn").addEventListener("click", saveSettings);
loadSettings();
