# Browser Control Bridge - Chrome Web Store Testing Guide

**For Chrome Web Store Reviewers**

This guide explains how to test Browser Control Bridge, a WebSocket bridge extension connecting Chrome/Edge to local MCP servers.

---

## Architecture Overview

Browser Control Bridge is **one part** of a complete system:

1. **MCP Bridge Server** (packages/mcp-server) - Runs locally, connects to AI tools via MCP protocol
2. **Extension** (packages/extension) - Installs in Chrome/Edge, connects TO the bridge server
3. **AI Tools** - Claude Code, GitHub Copilot, Cursor, etc. send commands to bridge
4. **Command Flow**: AI Tool → MCP Server → Extension → Chrome APIs → Result

The extension itself has **no visible UI** — it works silently in the background.

---

## Quick Start for Testers

### Prerequisites
- Node.js v18+ and npm
- Chrome or Edge browser
- Permission to run local server

### Step 1: Start the MCP Bridge Server

This is the core component the extension connects to.

```bash
git clone https://github.com/arjun-1/browser-control.git
cd browser-control
npm install
cd packages/mcp-server
npm start
```

Output should show:
```
Bridge listening on ws://127.0.0.1:17374
```

If port 17374 is busy, it tries 17375-17383.

### Step 2: Load the Extension

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Navigate to `browser-control/packages/extension`
5. Select the folder and click **Open**
6. Extension should load with icon in toolbar

### Step 3: Verify WebSocket Connection

1. Right-click extension icon → **Inspect**
2. Open **Console** tab
3. Look for connection message: `Connected to bridge on port 17374`
4. If not present, check that MCP server is running

### Step 4: Test a Browser Automation Command

The extension works by receiving commands from the MCP bridge. To test:

**Option A: Use a test client** (if provided)
- Check project repository for test utility

**Option B: Manual verification**
1. Keep DevTools open on extension
2. In another window, send a command to MCP bridge:
   ```bash
   # Example: navigate current tab
   npm run test:navigate
   ```
3. Watch DevTools console for command execution
4. Browser should navigate to the specified URL

---

## What We're Testing

### Core Functionality

✅ Extension loads without errors
✅ WebSocket connection to local bridge established
✅ DevTools shows no console errors
✅ Extension icon visible in toolbar
✅ Bridge and extension can communicate
✅ Browser automation commands execute
✅ All communication is local-only (127.0.0.1)
✅ No external network traffic
✅ No data collection

### Command Support

The extension supports 42+ browser automation tools:

**Navigation**
- navigate_page
- back / forward
- reload_tab
- new_tab / close_tab

**DOM Interaction**
- click_element
- type_in_page
- keypress
- focus_element / blur_element
- scroll / scroll_element

**Information**
- read_dom
- screenshot_page
- get_current_tab
- list_tabs
- get_cookies / set_cookie / delete_cookie

**Advanced**
- wait_for_selector
- wait_for_navigation
- cdp_command (DevTools Protocol)
- drag_and_drop
- dom_snapshot / semantic_snapshot
- get_performance_metrics / get_web_vitals
- get_console_logs

**Configuration**
- set_viewport
- emulate_mobile
- resize_window
- toggle_fullscreen
- add_css
- execute_javascript

### What's OUT of Scope

❌ Testing AI client integrations (done separately by client developers)
❌ Production deployment to users
❌ Multi-user or multi-machine scenarios
❌ Extension UI testing (there is no user-facing UI)

---

## Detailed Test Procedures

### Test 1: Extension Loads

**Procedure:**
1. Load unpacked extension from `packages/extension`
2. Check `chrome://extensions/` shows extension with no errors
3. Verify icon appears in toolbar

**Expected:**
- Extension name: "Browser Control Bridge"
- Status: Enabled
- No error messages
- Icon visible in toolbar

---

### Test 2: Bridge Connection

**Procedure:**
1. Start MCP bridge server (see Step 1 above)
2. Load extension
3. Right-click extension → Inspect
4. Open Console tab
5. Wait 2-3 seconds for connection attempt

**Expected:**
- Console shows connection message (port number may vary)
- No "Connection refused" errors
- Extension auto-reconnects if bridge restarts

**Troubleshooting:**
- If no message: Check MCP server is running
- If "Connection refused": Bridge not on 127.0.0.1:17374+
- Multiple connection attempts normal: Retry logic with backoff

---

### Test 3: Command Execution

**Procedure:**
1. Verify connection established (Test 2)
2. Open a webpage in Chrome (e.g., https://example.com)
3. Execute a command through MCP:
   ```bash
   # From browser-control root:
   npm run test -- --command navigate --url https://github.com
   ```
4. Watch DevTools console for execution messages
5. Verify browser navigated to GitHub

**Expected:**
- Command executes in <2 seconds (usually instant)
- Browser performs the action (page loads)
- DevTools shows execution result
- No errors in console

---

### Test 4: Multiple Commands

**Procedure:**
1. Execute several different commands in sequence:
   - Navigate to a page
   - Click an element
   - Take a screenshot
   - Read DOM

2. Verify each completes successfully

**Expected:**
- All commands execute
- Results available via MCP
- Browser remains responsive
- Extension stays connected

---

### Test 5: Permission Verification

**Procedure:**
1. Load extension
2. Open `chrome://extensions/` → extension details
3. Scroll to "Permissions" section
4. Verify 14 permissions listed
5. Check inspector to confirm all are local-only operations

**Permissions Should Include:**
- activeTab
- tabs  
- scripting
- debugger
- storage
- cookies
- downloads
- tabGroups
- offscreen
- sidePanel
- alarms
- <all_urls>
- ws://127.0.0.1/*
- ws://localhost/*

**Verify:**
- No external network permissions
- All WebSocket to localhost only
- No data collection permissions

---

### Test 6: Local-Only Security

**Procedure:**
1. Start extension + bridge
2. Use network monitoring (DevTools Network tab)
3. Execute commands
4. Check for external traffic

**Expected:**
- Only localhost traffic (127.0.0.1)
- WebSocket connections only to 127.0.0.1:17374+
- No external URLs accessed
- No data sent to remote servers

---

## Troubleshooting for Testers

### Issue: Extension loads but shows errors

**Symptoms:** Red error messages in chrome://extensions/

**Solutions:**
1. Check Node.js version: `node --version` (need v18+)
2. Verify manifest.json is valid JSON
3. Try reloading: chrome://extensions → Reload button
4. Check DevTools console for specific error

### Issue: "Connection refused" in DevTools

**Symptoms:** Extension console shows repeated connection attempts

**Solutions:**
1. Verify MCP server running: `npm start` in packages/mcp-server
2. Confirm server listening on ws://127.0.0.1:17374
3. Check firewall allows localhost connections
4. Verify no other process using port 17374
5. Try manual port: `MCP_PORT=17375 npm start`

### Issue: Commands don't execute

**Symptoms:** Extension connected but commands fail

**Solutions:**
1. Verify MCP bridge is running
2. Ensure Chrome tab is open and active
3. Try a simple command first (navigate)
4. Check DevTools console for error messages
5. Restart extension and bridge

### Issue: Extension disconnects repeatedly

**Symptoms:** Connection messages followed by "Connection lost"

**Solutions:**
1. Check MCP server hasn't crashed
2. Verify network stability
3. Normal behavior if bridge restarts (auto-reconnects)
4. Check system resources (CPU/RAM)

---

## Expected Behavior Reference

### On Initial Load
- Extension icon appears in toolbar
- Right-click shows context menu
- DevTools shows loading messages
- Connection attempted to ws://127.0.0.1:17374

### After Connection
- DevTools console shows "Connected to bridge"
- Extension enters idle state
- Ready to receive commands
- Auto-reconnects if bridge restarts

### During Command Execution
- Command received from MCP bridge
- Service worker processes request
- Browser API called (navigate, click, etc.)
- Result returned to MCP bridge
- Typical duration: <100ms-2s depending on command
- Browser remains responsive

### On Error
- Error message returned to MCP bridge
- Extension remains connected
- Ready for next command
- No crash or reload

---

## Permission Justifications

All permissions are **local-only browser automation** for MCP bridge integration:

| Permission | Purpose | Local Only |
|------------|---------|-----------|
| activeTab | Read current tab | ✅ Yes |
| tabs | Manage tabs | ✅ Yes |
| scripting | Execute scripts | ✅ Yes |
| debugger | DevTools Protocol | ✅ Yes |
| storage | Settings storage | ✅ Yes |
| cookies | Cookie management | ✅ Yes |
| downloads | Download control | ✅ Yes |
| tabGroups | Tab organization | ✅ Yes |
| offscreen | MCP bridge WebSocket | ✅ Yes |
| sidePanel | Command history UI | ✅ Yes |
| alarms | Background tasks | ✅ Yes |
| <all_urls> | Any webpage control | ✅ Yes |
| ws://127.0.0.1/* | Bridge WebSocket IP | ✅ Yes |
| ws://localhost/* | Bridge WebSocket hostname | ✅ Yes |

---

## Test Environment Checklist

- [ ] Node.js v18 or higher installed
- [ ] npm available
- [ ] Chrome or Edge browser
- [ ] Repository cloned locally
- [ ] Dependencies installed: `npm install`
- [ ] MCP server can be started: `cd packages/mcp-server && npm start`
- [ ] Browser has Developer mode enabled
- [ ] No antivirus blocking localhost connections
- [ ] Port 17374-17383 available

---

## Sign-Off Checklist for Reviewers

**Functionality**
- [ ] Extension loads without errors
- [ ] WebSocket connection to MCP bridge established
- [ ] At least 3 browser automation commands execute successfully
- [ ] All results returned correctly
- [ ] DevTools shows no console errors

**Security & Permissions**
- [ ] All 14 permissions verified as local-only
- [ ] No external network traffic detected
- [ ] WebSocket only to 127.0.0.1 and localhost
- [ ] No data collection

**Stability**
- [ ] Extension remains connected for 5+ minutes
- [ ] Auto-reconnect works if bridge restarts
- [ ] No memory leaks observed
- [ ] Browser remains responsive

**Documentation**
- [ ] Permissions are clearly justified
- [ ] README provides setup instructions
- [ ] GitHub repository is public and active
- [ ] Support contact available

---

## Contact & Resources

- **GitHub:** https://github.com/arjun-1/browser-control
- **Website:** https://browser-control.arjun.tools
- **Support Email:** support@arjun.tools

**Estimated review time: 20-30 minutes**

**For questions:** Open an issue on GitHub or email support
