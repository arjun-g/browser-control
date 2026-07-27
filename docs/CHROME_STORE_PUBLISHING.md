# Chrome Web Store Publishing Guide

## Browser Control Bridge Extension

### Overview
This guide covers everything needed to publish Browser Control Bridge to the Chrome Web Store.

## Checklist

### 1. Manifest & Basic Info ✓
- [x] manifest.json configured
- [x] Icons (128x128) created
- [x] Version number: 0.1.0
- [x] Description provided

### 2. Store Assets (TODO)

#### Screenshots Required (1280 x 800 or 640 x 400)
You need to create 1-5 screenshots showing:
1. **Main Feature**: Command history sidebar with sample commands
2. **Integration**: MCP server connection flow
3. **Tools**: Browser control capabilities demo
4. **Settings**: Options page configuration
5. **Real Use**: AI agent interaction example

Location: Create `/store-assets/screenshots/` folder with PNG files

#### Icon Assets
- [x] Main Icon (128x128) - ✓ Already have `icons/logo.png`
- Needed: 16x16 (for toolbar)
- Needed: 32x32 (for taskbar)
- Needed: Promotional Tile (440x280 or larger)

### 3. Store Metadata Files (TODO)

Create the following files in the extension root:

#### PRIVACY_POLICY.md
- Explain data handling (local-only processing)
- Clarify WebSocket bridge usage
- No data collection/storage

#### SUPPORT_URL.txt
- Email: support@arjun.tools
- GitHub: https://github.com/arjun-1/browser-control

#### SHORT_DESCRIPTION.txt
- Max 132 characters
- Example: "Control Chrome/Edge with AI agents via MCP. Automate browser tasks with natural language."

#### STORE_DESCRIPTION.txt
- Detailed description for Web Store (max 4000 chars)
- Include features, use cases, setup instructions

### 4. Account & Developer Setup

- [ ] Create Chrome Web Store Developer account
- [ ] Pay $5 one-time developer registration fee
- [ ] Verify email address
- [ ] Add payment method

### 5. Extension Submission Checklist

Before uploading:
- [ ] Test on Chrome (latest version)
- [ ] Test on Edge Chromium
- [ ] No bugs or warnings
- [ ] All permissions justified
- [ ] No external scripts (CSP compliance)
- [ ] No cryptocurrency features
- [ ] Accessible UI (keyboard navigation, contrast)

### 6. Upload & Publish

1. Go to Chrome Web Store Developer Dashboard: https://chrome.google.com/webstore/devconsole/
2. Click "New item"
3. Upload ZIP file: `packages/extension/` contents
4. Fill in store listing:
   - Description
   - Screenshots (min 1, max 5)
   - Category: Productivity
   - Language: English
   - Detailed description
   - Support URL
5. Review permissions
6. Submit for review

### 7. Review Process

- **Initial Review**: 1-3 hours for automated checks
- **Manual Review**: 1-5 business days (if needed)
- **Approval**: Extension goes live on Web Store
- **Monitoring**: Watch for user reviews, ensure quality

---

## Files to Create

### 1. PRIVACY_POLICY.md

```markdown
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
- `scripting`: To execute automation scripts
- `debugger`: For Chrome DevTools Protocol features
- `storage`: To store command history locally
- `cookies`: To manage browser cookies programmatically
- `downloads`: To list and manage downloads

## Data Security
- All data stays on your machine
- WebSocket bridge is local-only by default
- Optional token-based authentication for security

## Contact
support@arjun.tools
```

### 2. STORE_DESCRIPTION.txt

```
Browser Control Bridge - Control Your Browser with AI

Give AI agents full control of Chrome and Edge via Model Context Protocol (MCP). Automate everything from navigation to DOM manipulation.

## Key Features

✅ 40+ Browser Control Tools
- Navigation, tabs, interaction, DOM manipulation
- Screenshots, performance monitoring
- Chrome DevTools Protocol access

✅ Seamless AI Integration  
- Works with Claude, Copilot, Gemini, and any MCP-compatible AI
- Natural language commands become browser actions
- Full browser automation

✅ Local & Secure
- All processing stays on your machine
- No data collection or tracking
- WebSocket bridge with optional authentication

✅ Developer Friendly
- Open source on GitHub
- TypeScript codebase
- Comprehensive documentation
- Easy to extend

## What You Can Do

🤖 **AI Web Automation** - Let AI handle repetitive browser tasks
🧪 **Automated Testing** - Write tests with intelligent debugging
📊 **Web Scraping** - AI extracts data from complex websites
🔍 **Performance Analysis** - Monitor and optimize Core Web Vitals
🐛 **Bug Investigation** - Systematically reproduce and document bugs
📈 **Competitive Analysis** - Monitor competitor websites

## Getting Started

1. Install this extension
2. Run the MCP server: `npm install -g @browser-control/mcp-server`
3. Configure your AI client with Browser Control MCP server
4. Start automating!

## Learn More

📖 GitHub: https://github.com/arjun-1/browser-control
📧 Support: support@arjun.tools
🌐 Website: https://browser-control.arjun.tools

## Open Source

Browser Control Bridge is open source and available on GitHub. Contribute, report issues, and build amazing automations!
```

### 3. SHORT_DESCRIPTION.txt

```
Control Chrome/Edge with AI agents via MCP. Automate browser tasks from natural language commands. 40+ tools, local & secure.
```

---

## Next Steps

1. **Create screenshots** showing the extension in action
2. **Create store asset files** (PRIVACY_POLICY.md, descriptions)
3. **Package extension**: `cd packages/extension && zip -r ../browser-control.zip .`
4. **Register developer account** on Chrome Web Store
5. **Upload and submit** for review
6. **Monitor review** and respond to feedback
7. **Publish** when approved

## Resources

- Chrome Web Store Docs: https://developer.chrome.com/docs/webstore/
- Developer Dashboard: https://chrome.google.com/webstore/devconsole/
- Submission Guidelines: https://developer.chrome.com/docs/webstore/program-policies/

