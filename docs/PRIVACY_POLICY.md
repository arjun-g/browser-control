# Privacy Policy - Browser Control Bridge

## Overview
Browser Control Bridge is an extension that connects Chrome/Edge to a local AI-powered browser control system via MCP (Model Context Protocol).

## Data Collection & Storage
- **No data collection**: The extension does NOT collect, store, or transmit user data
- **Local-only**: All communication is between your machine and local MCP server
- **WebSocket**: Uses local WebSocket connections (localhost only)
- **No third-party services**: No external APIs or services used

## Permissions Explanation
- `tabs`: To list and control browser tabs
- `scripting`: To execute automation scripts on pages
- `debugger`: For Chrome DevTools Protocol (CDP) features
- `activeTab`: To access current tab information
- `storage`: To store command history locally (IndexedDB)
- `cookies`: To manage browser cookies programmatically
- `downloads`: To list and manage downloads
- `tabGroups`: To organize and manage tab groups
- `sidePanel`: For the command history sidebar UI

## Data Security
- All data stays on your machine (local-only)
- WebSocket bridge communicates exclusively with localhost
- Optional token-based authentication available for additional security
- No external API calls or third-party integrations

## Contact
For privacy concerns or questions:
- Email: support@arjun.tools
- GitHub: https://github.com/arjun-1/browser-control

---
Last Updated: July 2026
