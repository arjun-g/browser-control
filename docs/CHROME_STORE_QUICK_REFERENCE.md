# Chrome Web Store Submission - Quick Reference

## Key Files to Prepare

```
✅ Complete:
  - manifest.json (updated with short_name, author, homepage_url)
  - docs/PRIVACY_POLICY.md (local-only, no data collection)
  - docs/STORE_DESCRIPTION.txt (full feature description)
  - docs/STORE_SHORT_DESCRIPTION.txt (≤132 characters)

❌ Still Needed:
  - Screenshots (1280x800 PNG, min 1-5)
  - Icon sizes (16x16, 32x32)
  - browser-control.zip (packaged extension)
```

## Quick Packaging

**Windows:**
```powershell
cd packages/extension
Compress-Archive -Path * -DestinationPath ..\..\browser-control.zip -Force
```

**Linux/Mac:**
```bash
cd packages/extension
zip -r ../../browser-control.zip . -x "node_modules/*" ".git/*" "*.map"
```

## Upload Locations

| Item | Location |
|------|----------|
| Screenshots | `packages/extension/store-assets/screenshots/` |
| Extra icons | `packages/extension/store-assets/icons/` |
| Privacy policy | `docs/PRIVACY_POLICY.md` |
| Store copy | `docs/STORE_DESCRIPTION.txt` |

## Common Rejection Reasons & Fixes

| Issue | Solution |
|-------|----------|
| **CSP Violation** | Remove external scripts, use manifest.json only |
| **Misleading Description** | Ensure description matches actual functionality |
| **Unclear Permissions** | Justify each permission in manifest comments |
| **Poor Icon Quality** | Use professional PNG, 128x128 minimum |
| **No Support Contact** | Add email: support@arjun.tools |
| **Privacy Concerns** | Clarify local-only, no tracking (already done) |
| **Broken Links** | Verify GitHub, website URLs work |

## Critical Manifest Fields

```json
{
  "manifest_version": 3,
  "name": "Browser Control Bridge",
  "short_name": "Browser Control",
  "description": "Control Chrome/Edge with AI agents via MCP...",
  "author": "Browser Control Team",
  "homepage_url": "https://github.com/arjun-1/browser-control",
  "icons": { "128": "icons/logo.png" }
}
```

## Permission Justification Quick List

- `tabs` → Tab control
- `scripting` → Run automation  
- `debugger` → CDP features
- `storage` → Store history
- `cookies` → Cookie management
- `<all_urls>` → Browser automation

## Submission Workflow

```
1. Create account & pay $5
2. Package extension (.zip)
3. Upload to Web Store
4. Fill in store listing
5. Add screenshots (1-5)
6. Justify permissions
7. Submit for review
8. Wait 1-5 business days
9. Check email for result
10. Respond to feedback if needed
```

## Timeline

- Registration: 5-10 minutes
- Packaging: 5 minutes
- Upload: 2-5 minutes
- Listing: 15-30 minutes
- Screenshots: 10-20 minutes
- Submission: 2-3 minutes
- **Review: 1-5 business days**

**Total: ~30 minutes active work + 1-5 days review**

## Links

- Dashboard: https://chrome.google.com/webstore/devconsole/
- Docs: https://developer.chrome.com/docs/webstore/
- GitHub: https://github.com/arjun-1/browser-control
- Website: https://browser-control.arjun.tools
- Support: support@arjun.tools

## Status Tracking

- Extension ID: _(assigned after first upload)_
- Submission Date: _(date submitted)_
- Approval Date: _(if approved)_
- Store URL: `https://chrome.google.com/webstore/detail/[ID]`

---

**Next Step:** Create screenshots and submit! 🎉
