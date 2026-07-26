# MCP Server

MCP server that exposes browser control tools and forwards calls to connected browser extension clients over WebSocket.

## Run (development)

```bash
npm run dev -w @browser-control/mcp-server
```

## Build

```bash
npm run build -w @browser-control/mcp-server
```

## CLI

Published package exposes:

```bash
browser-control-mcp
```

You can run it via `npx`:

```bash
npx -y @browser-control/mcp-server
```

## Publish

From this folder:

```bash
npm version patch
npm publish --access public
```

