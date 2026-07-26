# Browser Control (MCP + Extension)

Browser Control lets MCP-enabled AI tools control existing Chrome or Edge sessions through a local bridge extension.

## Features

- Generic browser-control primitives (not workflow-specific)
- Existing-session control for Chrome and Edge
- Standard actions: navigate, history, click, type, keypress, DOM read, screenshot
- Debugger-backed CDP actions: attach/detach/status, click/type/keypress/scroll, waits, full-page screenshot
- Offscreen bridge client for better Manifest V3 reliability

## Project Structure

- `packages/mcp-server`: MCP stdio server and websocket bridge
- `packages/extension`: MV3 extension (service worker, offscreen bridge, options page)
- `packages/shared`: shared protocol types

## Local Development

1. Install dependencies

```bash
npm install
```

2. Build

```bash
npm run build
```

3. Load extension

- Open browser extensions page
- Enable developer mode
- Load unpacked extension from `packages/extension`

4. Configure extension (optional)

- Open extension details > Extension options
- Set `Bridge WebSocket URL` and optional token

5. Run MCP server

```bash
npm run dev
```

6. Run tests

```bash
npm test
```

Environment variables:

- `BROWSER_BRIDGE_PORT` (default `17374`)
- `BROWSER_BRIDGE_TOKEN` (optional)

## Use In MCP Clients

Local source mode:

```json
{
  "mcpServers": {
    "browser-control-dev": {
      "command": "npx",
      "args": ["tsx", "packages/mcp-server/src/index.ts"]
    }
  }
}
```

Published `npx` mode:

```json
{
  "mcpServers": {
    "browser-control": {
      "command": "npx",
      "args": ["-y", "@browser-control/mcp-server"],
      "env": {
        "BROWSER_BRIDGE_PORT": "17374"
      }
    }
  }
}
```

## Publish MCP Package For `npx`

From `packages/mcp-server`:

```bash
npm version patch
npm publish --access public
```

Notes:

- Package exposes CLI binary: `browser-control-mcp`
- `prepack` runs build automatically

## Deploy Extension To Stores

Chrome Web Store and Edge Add-ons both accept zipped extension packages.

### Prepare package

1. Ensure version in `packages/extension/manifest.json` is updated.
2. Create a zip of all files inside `packages/extension`.
3. Do not include workspace files (`node_modules`, tests, root config files).

### Chrome Web Store

1. Open Chrome Web Store Developer Dashboard
2. Create item or update existing item
3. Upload extension zip
4. Fill listing details, privacy disclosures, permissions justification
5. Submit for review

### Edge Add-ons

1. Open Microsoft Partner Center (Edge Add-ons)
2. Create submission or update existing extension
3. Upload same extension zip (or Edge-targeted variant)
4. Complete listing and compliance fields
5. Submit for certification

## Tool Surface

- `list_browser_clients`
- `navigate`
- `back`
- `forward`
- `click`
- `type`
- `keypress`
- `read_dom`
- `screenshot`
- `attach_debugger`
- `detach_debugger`
- `debugger_status`
- `cdp_command`
- `cdp_click`
- `cdp_type`
- `cdp_keypress`
- `cdp_scroll`
- `cdp_wait_for_selector`
- `wait_for_navigation`
- `cdp_screenshot`

## Notes

- Actions target the active tab in the most recently focused window.
- `attach_debugger` triggers the browser infobar by design.
- Firefox support is deferred for now.
