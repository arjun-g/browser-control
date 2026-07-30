# Browser Control Bridge

Control Chrome and Edge with AI agents through Model Context Protocol (MCP).

Website: https://browser-control.arjun.tools

## What It Does

Browser Control Bridge connects your MCP client (Claude, GitHub Copilot, Cursor, Continue.dev, and others) to a local browser extension so your agent can:

- Navigate pages and manage tabs
- Click, type, scroll, and interact with UI elements
- Read and snapshot DOM content
- Run JavaScript and inject CSS
- Capture screenshots
- Inspect performance metrics and Core Web Vitals
- Use Chrome DevTools Protocol (CDP) commands

## Powerful Features

- Seamless MCP integration with existing browser sessions
- 40+ browser automation tools
- Full DOM interaction and extraction
- Performance and debugging insights
- Tab and window management
- CDP support for advanced workflows

## Get Started

### 1. Install Extension

Store listings are currently under review. Until they are live, load the extension from GitHub.

### 2. Load Extension from GitHub (Temporary)

```bash
git clone https://github.com/arjun-g/browser-control.git
```

Then in your browser:

1. Open extensions page:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
2. Enable Developer mode
3. Click "Load unpacked"
4. Select `packages/extension`

### 3. Start MCP Server

Use published package via `npx`:

```bash
npx -y @browser-control/mcp-server
```

Or install globally and run the binary:

```bash
npm install -g @browser-control/mcp-server
browser-control-mcp
```

Optional flags/env:

- `--agent-name` or `-a` to set agent name
- `BROWSER_BRIDGE_PORT` to set preferred bridge port
- `BROWSER_BRIDGE_TOKEN` to require token auth
- `BROWSER_AGENT_NAME` as fallback agent name

### 4. Configure Your AI Client

Common MCP config:

```json
{
  "mcpServers": {
    "browser-control": {
      "command": "npx",
      "args": ["-y", "@browser-control/mcp-server"]
    }
  }
}
```

#### Claude Code

```bash
claude mcp add browser-control -- npx -y @browser-control/mcp-server
```

#### GitHub Copilot (VS Code)

Add the MCP server in VS Code MCP settings (or `.vscode/settings.json`) and enable Agent mode in Copilot Chat.

#### Cursor

Use Settings -> Features -> MCP -> Add New MCP Server:

- Name: `browser-control`
- Command: `npx`
- Args: `-y @browser-control/mcp-server`

#### Continue.dev

Add the same MCP config to `~/.continue/config.json`.

## MCP Tools

### Navigation and Tabs

- `navigate`
- `back`
- `forward`
- `new_tab`
- `close_tab`
- `close_tabs`
- `reload_tab`
- `list_tabs`
- `get_current_tab`
- `create_tab_group`
- `delete_tab_group`

### Interaction

- `click`
- `type`
- `keypress`
- `scroll`
- `mouse_move`
- `drag_and_drop`
- `focus_element`
- `blur_element`
- `scroll_element`

### DOM and Content

- `read_dom`
- `dom_snapshot`
- `minimal_snapshot`
- `semantic_snapshot`
- `dom_extract_element`
- `screenshot`
- `wait_for_selector`
- `wait_for_navigation`

### JavaScript and Styling

- `execute_javascript`
- `add_css`

### Browser State

- `get_cookies`
- `set_cookie`
- `delete_cookie`
- `set_viewport`
- `resize_window`
- `emulate_mobile`
- `toggle_fullscreen`

### Analytics and Debugging

- `get_performance_metrics`
- `get_web_vitals`
- `get_console_logs`
- `list_downloads`
- `cdp_command`

## How It Works

- MCP server: Node.js process exposing browser tools over MCP
- Browser extension: Manifest V3 extension running in Chrome/Edge
- WebSocket bridge: local connection between server and extension

Everything runs locally on your machine.

## Local Development

```bash
npm install
npm run build
npm test
```

Project structure:

- `packages/mcp-server`: MCP server and bridge
- `packages/extension`: Browser extension
- `packages/shared`: Shared protocol types
- `website`: Landing page

## Support and Links

- Website: https://browser-control.arjun.tools
- GitHub: https://github.com/arjun-g/browser-control
- Issues: https://github.com/arjun-g/browser-control/issues
- Privacy Policy: https://browser-control.arjun.tools/privacy-policy
