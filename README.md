# Browser Control Bridge

Control Chrome and Edge with AI agents through Model Context Protocol (MCP).

Website: https://browser-control.arjun.tools

## 🔐 Flagship Use Case: Automate Inside Your Real, Logged-In Sessions

Browser Control drives the browser you're already signed into — not a headless copy, not a service account. That means it can operate inside admin panels, internal dashboards, and SSO/2FA-protected apps that ordinary scrapers and headless bots cannot reach safely.

- No credentials, API keys, or passwords are ever shared with the AI client or MCP server.
- No re-login, no session replay, no cookie exporting — the agent acts through the tab you already have open.
- Ideal for internal tools, admin consoles, and back-office workflows that require a real authenticated session.

Example prompt:

```text
In our admin dashboard, find all users who signed up this week, export the list, and confirm the export succeeded with a screenshot.
```

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

## Best Use Cases

- **Automate authenticated browser tasks inside admin panels and internal tools** (flagship use case — see above).
- Smoke-test critical web flows such as signup, login, checkout, or contact forms.
- Reproduce frontend bugs and attach evidence like screenshots, DOM output, and console logs.
- Extract structured data from dynamic pages that require real rendering and interaction.
- Run lightweight performance and UX checks with Web Vitals, console output, and viewport changes.
- Verify downloads and generated artifacts from browser-based workflows.

## Featured Demo Workflow

▶️ **Watch the demo:** [Browser Control — Demo (YouTube)](https://www.youtube.com/watch?v=R170s6L14uc)

The demo shows the agent operating a real, already-signed-in Cloudflare Web Analytics dashboard — reading every key metric for the last 24 hours, switching the date range to the last 7 days, and returning a side-by-side comparison with screenshots.

Why this one works well:

- It demonstrates the core differentiator: acting through a real authenticated session, not a scraper (Cloudflare Web Analytics has no public read API on the free tier, so driving the logged-in dashboard is the only way).
- It uses the core toolchain: `navigate`, `click`, `read_dom`/`semantic_snapshot`, and `screenshot`.
- It produces a clear, verifiable result (two captured views + a structured comparison) that a headless tool couldn't easily obtain.

Example prompt:

```text
In the browser tab, read all the key metrics for the last 24 hours — visits, page views, load time, Core Web Vitals, top countries, referrers, browsers, and devices. Then switch the date range to the last 7 days and read the same metrics. Give me a side-by-side comparison highlighting what changed, and screenshot both views.
```

Typical agent flow:

1. Use the already-authenticated tab — no login step needed.
2. Read the key metrics for the current date range.
3. Change the date range (e.g., 24 hours → 7 days).
4. Re-read the same metrics and compare.
5. Capture screenshots and return the side-by-side result.

## Get Started

### 1. Install Extension

Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/browser-control-bridge/kdmdehebohgpoeohpdlhhkkhcnmbmefe) — the same listing also works in Microsoft Edge. A native Edge Add-ons listing is still under review.

### 2. Start MCP Server

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

### 3. Configure Your AI Client

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
