# Extension Bridge

Manifest V3 extension used by Browser Control MCP.

This extension uses an offscreen document to keep a stable websocket connection to the local bridge server while the service worker executes browser actions.

## Quick start

1. Open browser extensions page.
2. Enable developer mode.
3. Load unpacked extension from this folder.
4. Ensure local MCP bridge is running at `ws://127.0.0.1:17374`.

## Configure token (optional)

Use Extension options:

1. Open extension details.
2. Click **Extension options**.
3. Set Bridge URL and optional token.
4. Save.

## Browser compatibility

- Chrome: supported
- Edge: supported
- Firefox: optional / not validated in this repo

## Package for stores

1. Increment `version` in `manifest.json`.
2. Zip the contents of this folder (not the parent workspace).
3. Validate extension locally after reloading unpacked.

## Submit to Chrome Web Store

1. Open Chrome Web Store developer dashboard.
2. Upload zip package.
3. Fill listing details and permission disclosures.
4. Submit for review.

## Submit to Edge Add-ons

1. Open Microsoft Partner Center for Edge Add-ons.
2. Upload same zip package.
3. Fill metadata/compliance fields.
4. Submit for certification.

## Debugging infobar

This extension can optionally use the `chrome.debugger` API for CDP-style control.
When attached, Chrome/Edge displays an infobar that says the extension started debugging the browser. This is normal browser behavior.
