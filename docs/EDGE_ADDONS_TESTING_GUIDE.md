# Edge Add-ons Submission - Microsoft Edge Team Testing Guide

**For Microsoft Edge Add-ons Review Team**

This guide is tailored for Edge Add-ons reviewers testing Browser Control Bridge.

---

## Quick Overview

Browser Control Bridge is a **background extension** that:
- Connects to an MCP (Model Context Protocol) server
- Enables AI agents and developers to automate Edge
- Runs silently in the background
- All communication is local and encrypted

**The extension works with an MCP server.** Testing requires starting both.

---

## Pre-Test Checklist

- [ ] Edge browser installed (latest version)
- [ ] Node.js v18+ installed (to run MCP server)
- [ ] Administrator access not required

---

## Testing Steps (5-10 minutes)

### Step 1: Install the Extension

Extension installs via Microsoft Edge Add-ons store as part of the review process.

**After installation:**
1. Open `edge://extensions/`
2. Verify "Browser Control Bridge" appears in the list
3. Verify it's enabled (toggle is on)

### Step 2: Start the MCP Server

The extension requires an MCP server running to function. Start it:

```bash
npx @browsercontrol/mcp-server
```

**Expected output:**
```
Browser Control Bridge MCP Server
Server is ready
```

**Keep this terminal window open** while testing.

### Step 3: Verify Connection

After starting the MCP server, the extension should connect automatically.

**To verify:**

1. Open `edge://extensions/`
2. Find "Browser Control Bridge"
3. Click the three dots → **Inspect service worker**
4. A new Edge window opens with DevTools
5. Click the **Console** tab
6. Look for a success message confirming the connection

**If you see a success message, the extension is working correctly.**

If not:
- Check that the MCP server is still running
- Give it a few seconds to connect
- See Troubleshooting section if needed

### Step 4: Verify Extension Behavior

With the connection established:

1. **Extension runs silently:**
   - No UI popups or notifications
   - No visible changes to browser

2. **Console is clean:**
   - No error messages
   - No permission warnings

3. **Browser operates normally:**
   - Edge launches normally
   - No performance impact
   - Tabs load and navigate smoothly

4. **Stability:**
   - Open several tabs
   - Navigate around websites
   - Extension remains connected
   - No crashes or hangs

### Step 5: Test Uninstall

To verify clean removal:

1. Go to `edge://extensions/`
2. Find "Browser Control Bridge"
3. Click the **Remove** button
4. Confirm removal
5. Extension disappears from list
6. No residual files or data remain

---

## What We're Testing

### ✅ Success Criteria

**Functionality:**
- Extension installs successfully from Edge Add-ons store
- Extension enables without errors
- Connects to the MCP server automatically
- DevTools shows successful connection
- No console errors
- Extension doesn't interfere with normal browser use
- Uninstalls cleanly

**Security & Permissions:**
- All 14 permissions are justified in store listing
- All permissions are used for local browser automation only
- No data collection or external communication

**Stability:**
- Extension remains connected and stable
- Browser performance unaffected
- Auto-reconnects if MCP server restarts
- No memory leaks

---

## Permissions Overview

**All 14 permissions enable local browser automation:**

| Permission | Purpose |
|------------|---------|
| activeTab | Read current tab information |
| tabs | Create, close, and manage tabs |
| scripting | Execute scripts on webpages |
| debugger | Advanced browser control capabilities |
| storage | Store extension settings |
| cookies | Manage cookies |
| downloads | Manage downloads |
| tabGroups | Organize tabs into groups |
| offscreen | MCP server connection |
| sidePanel | Command history panel |
| alarms | Background maintenance tasks |
| <all_urls> | Access any webpage for automation |
| WebSocket permissions | Secure communication with MCP server |

**All permissions are for local-only browser automation.**

---

## Troubleshooting

### Issue: Extension doesn't show in edge://extensions

**Cause:** Installation incomplete

**Solution:**
1. Try installing again from Edge Add-ons
2. Verify it's enabled (toggle on)

### Issue: No connection confirmation in console

**Cause:** MCP server not running

**Solution:**
1. Start the MCP server: `npx @browsercontrol/mcp-server`
2. Wait a few seconds for the extension to connect
3. Check the console again

### Issue: Console shows errors

**Cause:** MCP server not running or crashed

**Solution:**
1. Stop the terminal running the MCP server (Ctrl+C)
2. Start it again: `npx @browsercontrol/mcp-server`
3. The extension will auto-reconnect

### Issue: Multiple connection attempts in console

**Cause:** Normal retry behavior while waiting for MCP server

**Solution:**
- This is expected while the server is starting
- Once server is ready, connection succeeds immediately
- No action needed

---

## What NOT to Test

❌ **Out of Scope:**
- AI tool integrations (tested separately)
- Multi-machine deployment
- Production usage patterns
- Load testing

---

## Sign-Off Checklist

Before approval:

**Installation & Loading:**
- [ ] Installs from Edge Add-ons without errors
- [ ] Appears in edge://extensions/
- [ ] Can be enabled/disabled via toggle
- [ ] Uninstalls cleanly

**Functionality:**
- [ ] Service worker inspects without errors
- [ ] DevTools console shows connection success
- [ ] No error messages in console
- [ ] No permission warnings
- [ ] Remains connected for 10+ minutes

**Security & Permissions:**
- [ ] All 14 permissions listed in store
- [ ] All permissions verified as local-only
- [ ] No external network access
- [ ] No data collection

**Stability:**
- [ ] Browser remains responsive
- [ ] No performance impact
- [ ] Auto-reconnects if server restarts
- [ ] No crashes observed

---

## Timeline

**Typical testing time:** 10-15 minutes
- Install: 2 minutes
- Start MCP server: 1 minute
- Verify connection: 2 minutes
- Stability testing: 5-10 minutes

---

## Support & Resources

**Resources:**
- Repository: https://github.com/arjun-1/browser-control
- Website: https://browser-control.arjun.tools

**Contact:**
- Email: support@arjun.tools
- Issues: https://github.com/arjun-1/browser-control/issues

---

**Thank you for reviewing Browser Control Bridge for Microsoft Edge Add-ons!**

