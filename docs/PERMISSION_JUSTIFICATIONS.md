# Chrome Web Store Permission Justifications

This document contains the justifications for each permission required by Browser Control Bridge extension. Use these when submitting to the Chrome Web Store on the "Privacy practices" tab.

## Permission Justifications

### 1. activeTab
**Required for:** Accessing the currently active tab to execute browser control commands.

**Justification:**
"This permission allows the extension to interact with the active browser tab. It is essential for executing user-initiated commands such as navigation, clicking, typing, and DOM manipulation. The permission is only used when the user explicitly requests an action through the MCP server."

---

### 2. tabs
**Required for:** Managing browser tabs (open, close, list, organize).

**Justification:**
"This permission enables the extension to list all open tabs, open new tabs, close tabs, and manage tab groups. This is necessary for AI agents to automate tab management tasks like organizing workspaces, closing obsolete tabs, and navigating between browser sessions."

---

### 3. scripting
**Required for:** Executing automation scripts on web pages.

**Justification:**
"This permission allows the extension to execute JavaScript code on web pages to perform automated actions such as filling forms, extracting data, clicking elements, and manipulating the DOM. All scripts are executed through the local MCP bridge with explicit user authorization."

---

### 4. storage
**Required for:** Storing command history and session data locally.

**Justification:**
"This permission is used to store command history, session metadata, and user preferences in the browser's IndexedDB and storage APIs. All data is stored locally on the user's machine and is never transmitted to external servers."

---

### 5. cookies
**Required for:** Reading and managing browser cookies programmatically.

**Justification:**
"This permission enables the extension to list, read, and manage cookies when requested by the AI agent. This is necessary for tasks like managing authentication sessions, clearing cookies, and testing cookie-based functionality."

---

### 6. debugger
**Required for:** Chrome DevTools Protocol (CDP) access for advanced browser control.

**Justification:**
"This permission enables access to Chrome DevTools Protocol features for advanced automation capabilities including taking screenshots, monitoring performance metrics, emulating mobile devices, and accessing detailed browser state information."

---

### 7. downloads
**Required for:** Managing browser downloads.

**Justification:**
"This permission allows the extension to list downloads, cancel downloads, and manage the download directory. This enables AI agents to automate download-related tasks and retrieve information about downloaded files."

---

### 8. tabGroups
**Required for:** Managing browser tab groups.

**Justification:**
"This permission enables the extension to create, delete, and manage tab groups. This allows AI agents to organize tabs into logical groups for improved workflow automation and browser management."

---

### 9. offscreen
**Required for:** Running the MCP bridge in an offscreen document.

**Justification:**
"This permission allows the extension to run an offscreen document that maintains the persistent WebSocket connection to the local MCP server. This is necessary for reliable communication between Chrome and the AI control bridge."

---

### 10. sidePanel
**Required for:** Displaying the command history sidebar panel.

**Justification:**
"This permission enables the extension to display a side panel showing command history, session tracking, and debugging information. Users can view all actions executed by the AI agent with full transparency."

---

### 11. alarms
**Required for:** Scheduling periodic tasks.

**Justification:**
"This permission allows the extension to schedule periodic tasks such as session cleanup, status monitoring, and connection health checks with the local MCP server."

---

### 12. <all_urls> (Host Permission)
**Required for:** Controlling any web page in the browser.

**Justification:**
"This host permission is necessary for the extension to execute automation tasks on any website. AI agents need unrestricted access to any page the user visits to perform actions like navigation, form filling, data extraction, and testing."

---

### 13. ws://127.0.0.1/* (WebSocket)
**Required for:** Local WebSocket bridge communication to localhost IP address.

**Justification:**
"This WebSocket permission enables secure local communication between the extension and the MCP server running on the user's machine via the 127.0.0.1 loopback address. Communication is confined to localhost for maximum security."

---

### 14. ws://localhost/* (WebSocket)
**Required for:** Local WebSocket bridge communication to localhost hostname.

**Justification:**
"This WebSocket permission enables secure local communication between the extension and the MCP server running on the user's machine via the localhost hostname. Communication is confined to localhost for maximum security."

---

### 15. Single Purpose Description
**Use one of these (copy entire text below):**

**Full Version (recommended, ~420 chars):**
"Browser Control Bridge connects your browser to AI agents via Model Context Protocol (MCP). It enables AI automation of browser tasks including: navigating websites, clicking elements, typing text, taking screenshots, reading DOM content, managing tabs and cookies, monitoring performance metrics, and executing JavaScript. All actions are executed locally through a WebSocket connection to a user-controlled MCP server—no data is sent to external servers. This extension provides the bridge between AI systems and your browser for intelligent automation, testing, and web interaction."

**Short Version (if needed, ~180 chars):**
"Browser Control Bridge connects your browser to AI agents via Model Context Protocol (MCP) for automated browser control. All actions execute locally through a WebSocket connection to your MCP server—no external data transmission."

**Alternative Version (technical focus, ~250 chars):**
"Browser Control Bridge enables AI agents to control your browser through Model Context Protocol (MCP). It provides 40+ browser automation tools including navigation, DOM manipulation, screenshots, tab management, and performance monitoring—all locally, with no external data transmission."

---

### 16. Data Usage Compliance
**Certification Statement:**
"I certify that my use of user data complies with Google's Developer Program Policies and Chrome Web Store policies. The extension does not collect, store, or transmit user personal data to external servers. All operations are performed locally on the user's machine. Session data and command history are stored only in the browser's local storage and never leave the user's computer."

---

## Summary Table

| Permission | Purpose | Local Only |
|------------|---------|-----------|
| activeTab | Current tab access | ✅ Yes |
| tabs | Tab management | ✅ Yes |
| scripting | Execute scripts | ✅ Yes |
| storage | Local history storage | ✅ Yes |
| cookies | Cookie management | ✅ Yes |
| debugger | DevTools Protocol | ✅ Yes |
| downloads | Download management | ✅ Yes |
| tabGroups | Tab groups | ✅ Yes |
| offscreen | MCP connection | ✅ Yes |
| sidePanel | History panel UI | ✅ Yes |
| alarms | Periodic tasks | ✅ Yes |
| <all_urls> | Web page control | ✅ Yes |
| ws://127.0.0.1/* | WebSocket localhost IP | ✅ Yes |
| ws://localhost/* | WebSocket localhost hostname | ✅ Yes |

## Key Points

✅ **All operations are local-only** - No data leaves the user's machine
✅ **No external services** - Extension only communicates with local MCP server
✅ **Explicit authorization** - Actions only execute through MCP server requests
✅ **Transparent logging** - Command history is visible in the extension sidebar
✅ **User-controlled** - User must have the MCP server running and configured

---

## How to Submit

1. Go to Chrome Web Store Developer Dashboard: https://chrome.google.com/webstore/devconsole/
2. Click "Edit" on your extension
3. Go to "Privacy practices" tab
4. For each permission, click the permission name and paste the corresponding justification from above
5. Scroll to "Single purpose" and paste the Single Purpose Description
6. Check the "I certify..." checkbox and paste the Data Usage Compliance statement
7. Click "Save"

---

## Support

For questions about these justifications:
- Email: support@arjun.tools
- GitHub: https://github.com/arjun-1/browser-control
