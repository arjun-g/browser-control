# Chrome Web Store Submission Checklist

Complete this checklist before submitting Browser Control Bridge to the Chrome Web Store.

## Pre-Submission Tasks (Do These First)

### 1. Set Up Developer Account
- [ ] Create Google account (if needed)
- [ ] Visit https://chrome.google.com/webstore/devconsole/
- [ ] Pay $5 developer registration fee
- [ ] Verify email address
- [ ] Add payment method

### 2. Prepare Extension Files
- [ ] Verify manifest.json is complete:
  - [x] name, version, description
  - [x] icons (128x128 PNG)
  - [x] permissions justified
  - [x] service_worker entry point
  - [x] short_name added
- [ ] Check all source files:
  - [ ] No TypeScript errors: `npm run build`
  - [ ] No console errors in service worker
  - [ ] No console errors in sidebar
  - [ ] No external script sources
  - [ ] Content Security Policy (CSP) compliant
- [ ] Icons created:
  - [x] 128x128 (main) - `packages/extension/icons/logo.png`
  - [ ] 16x16 - `packages/extension/store-assets/icons/icon-16.png`
  - [ ] 32x32 - `packages/extension/store-assets/icons/icon-32.png`

### 3. Create Screenshots
- [ ] Screenshot 1 - Command history sidebar (1280x800)
- [ ] Screenshot 2 - Integration with AI (1280x800)
- [ ] Screenshot 3 - 40+ tools overview (1280x800)
- [ ] Screenshot 4 - Settings page (1280x800)
- [ ] Screenshot 5 - Real-world usage example (1280x800)
- [ ] All screenshots are PNG format
- [ ] All screenshots have descriptive alt text ready

### 4. Store Metadata
- [x] PRIVACY_POLICY.md - Explains data handling
- [x] STORE_DESCRIPTION.txt - Full store description
- [x] STORE_SHORT_DESCRIPTION.txt - Short description (≤132 chars)
- [ ] Support URL ready: support@arjun.tools
- [ ] Support page created on website

### 5. Legal & Compliance
- [ ] Privacy policy reviewed (no data collection)
- [ ] All permissions are necessary and justified
- [ ] No cryptocurrency/mining features
- [ ] No malware or harmful behavior
- [ ] No external dependencies outside manifest
- [ ] License properly documented (in repo)

### 6. Extension Testing
- [ ] Test on Chrome (latest version):
  - [ ] Install from `packages/extension/` as unpacked
  - [ ] All features work correctly
  - [ ] No permission warnings
  - [ ] No console errors
  - [ ] Sidebar loads and displays history
  - [ ] Options page loads correctly
- [ ] Test on Edge Chromium (optional):
  - [ ] Install as unpacked extension
  - [ ] Verify functionality
- [ ] Test MCP server connection:
  - [ ] WebSocket connection works
  - [ ] Commands execute without errors
  - [ ] Session tracking records correctly
  - [ ] IndexedDB stores data properly

## Packaging the Extension

### Create ZIP File

**Windows (PowerShell):**
```powershell
cd packages/extension
Compress-Archive -Path * -DestinationPath ..\..\browser-control.zip -Force
cd ../..
```

**Linux/Mac:**
```bash
cd packages/extension
zip -r ../../browser-control.zip . -x "node_modules/*" ".git/*" "*.map" ".DS_Store"
cd ../..
```

### ZIP Contents Verification
The ZIP should include:
```
browser-control.zip
├── manifest.json
├── service-worker.js
├── sidebar.html
├── sidebar.js
├── offscreen.html
├── offscreen.js
├── options.html
├── options.js
├── popup.html
├── popup.js
├── db.js
├── icons/
│   └── logo.png (128x128)
├── PRIVACY_POLICY.md
├── STORE_DESCRIPTION.txt
├── STORE_SHORT_DESCRIPTION.txt
└── store-assets/
    ├── screenshots/
    │   ├── screenshot-1.png
    │   ├── screenshot-2.png
    │   ├── screenshot-3.png
    │   ├── screenshot-4.png
    │   └── screenshot-5.png
    └── icons/
        ├── icon-16.png
        └── icon-32.png
```

### Exclude These Files
- [ ] node_modules/
- [ ] .git/
- [ ] .gitignore
- [ ] *.map (source maps)
- [ ] .DS_Store (Mac)
- [ ] Thumbs.db (Windows)
- [ ] package.json (optional, but can include)
- [ ] package-lock.json (optional)

## Chrome Web Store Submission Steps

### Step 1: Upload Extension
1. Go to: https://chrome.google.com/webstore/devconsole/
2. Click "New item"
3. Click "Choose file" and select `browser-control.zip`
4. Click "Upload"
5. Wait for upload to complete (shows extension preview)

### Step 2: Fill in Store Listing

**Basic Information:**
- [ ] Name: "Browser Control Bridge"
- [ ] Short description: Copy from `STORE_SHORT_DESCRIPTION.txt`
- [ ] Full description: Copy from `STORE_DESCRIPTION.txt`
- [ ] Category: Select "Productivity"
- [ ] Language: English

**Detailed Description:**
- [ ] Paste content from `STORE_DESCRIPTION.txt`
- [ ] Include all use cases and features
- [ ] Add setup instructions
- [ ] Include links to GitHub and website

**Screenshots & Images:**
- [ ] Upload 1-5 screenshots from `store-assets/screenshots/`
- [ ] Add descriptive captions for each
- [ ] Optional: Upload promotional tile (440x280)

**Support URLs:**
- [ ] Support email: support@arjun.tools
- [ ] Homepage: https://browser-control.arjun.tools
- [ ] Support page: https://github.com/arjun-1/browser-control/issues

**Additional Fields:**
- [ ] Set extension as "Public"
- [ ] Confirm you own the extension
- [ ] Accept terms of service

### Step 3: Review Permissions

Chrome will prompt you to explain each permission:

**Permission Explanations:**
- `tabs` → "To list and control browser tabs"
- `scripting` → "To execute browser automation scripts"
- `debugger` → "To enable Chrome DevTools Protocol features"
- `activeTab` → "To access current tab information"
- `storage` → "To store command history locally"
- `cookies` → "To manage browser cookies programmatically"
- `downloads` → "To list and manage downloads"
- `tabGroups` → "To organize and manage tab groups"
- `sidePanel` → "For command history sidebar UI"
- `<all_urls>` → "To control any webpage in the browser"
- `ws://localhost/*` → "For local WebSocket bridge communication"

### Step 4: Submit for Review
- [ ] Review all information one final time
- [ ] Click "Submit for review"
- [ ] Confirm submission
- [ ] Note your extension ID (shown in URL)

## After Submission

### Monitoring & Response
- [ ] Check email for review status
- [ ] Monitor Chrome Web Store dashboard
- [ ] Respond to reviewer questions within 48 hours
- [ ] Address any rejection reasons if needed

### Review Timeline
- Automated checks: 1-3 hours
- Manual review: 1-5 business days
- Approval/Rejection: Email notification

### If Rejected
- [ ] Read rejection reason carefully
- [ ] Address issues in code/description
- [ ] Prepare new version (increment version number)
- [ ] Resubmit from dashboard

### After Approval
- [ ] Extension goes live on Web Store
- [ ] Share link: `https://chrome.google.com/webstore/detail/[EXTENSION_ID]`
- [ ] Announce on GitHub, Twitter, website
- [ ] Monitor reviews and user feedback
- [ ] Plan updates based on feedback

## Success Criteria

Your submission is ready when:

✅ All manifest fields are complete and accurate
✅ Extension installs and runs without errors
✅ All permissions are justified
✅ Privacy policy is clear and complete
✅ Screenshots clearly show features
✅ Store description is compelling and accurate
✅ No external resources or scripts
✅ Extension works on latest Chrome version
✅ Support contact is functional
✅ All legal/compliance requirements met

## Helpful Resources

- **Chrome Web Store Docs**: https://developer.chrome.com/docs/webstore/
- **Submission Guidelines**: https://developer.chrome.com/docs/webstore/program-policies/
- **Developer Dashboard**: https://chrome.google.com/webstore/devconsole/
- **Manifest V3 Guide**: https://developer.chrome.com/docs/extensions/mv3/
- **Security Best Practices**: https://developer.chrome.com/docs/extensions/mv3/security/

## Support

- Email: support@arjun.tools
- GitHub Issues: https://github.com/arjun-1/browser-control/issues
- Website: https://browser-control.arjun.tools

---

**Ready to launch!** Once you complete this checklist, your extension is submission-ready.

Good luck with your Chrome Web Store debut! 🚀
