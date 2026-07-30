# Chrome Web Store Assets

This directory contains assets needed for Chrome Web Store submission.

## Directory Structure

```
store-assets/
├── screenshots/     # Chrome Web Store screenshots
├── icons/          # Additional icon sizes
└── README.md       # This file
```

## Screenshots

### Requirements
- **Dimensions**: 1280 x 800 px or 640 x 400 px
- **Format**: PNG
- **Quantity**: 1-5 screenshots (at least 1 required)
- **Naming**: `screenshot-1.png`, `screenshot-2.png`, etc.

### What to Include
1. **screenshot-1.png** - Main Feature
   - Show the command history sidebar
   - Display sample browser control commands
   - Highlight the polished UI

2. **screenshot-2.png** - Integration
   - Show MCP server connection
   - Display configuration flow
   - Show seamless integration

3. **screenshot-3.png** - Tools & Capabilities
   - List of 40+ tools available
   - Show different action categories
   - Demonstrate breadth of functionality

4. **screenshot-4.png** - Settings & Configuration
   - Options page showing bridge configuration
   - Authentication token setup
   - WebSocket URL configuration

5. **screenshot-5.png** - Real-World Usage
   - AI agent interaction example
   - Browser automation in action
   - Show practical use case

## Icons

### Required Icon Sizes

| Size | Filename | Use Case |
|------|----------|----------|
| 16x16 | `icon-16.png` | Toolbar, extension list |
| 32x32 | `icon-32.png` | Windows taskbar |
| 128x128 | `icon-128.png` | Web Store, extension list (already in `../icons/`) |

### Image Format
- **Format**: PNG with transparency
- **Color**: Use the brand color scheme
- **Style**: Consistent with logo.svg

### Promotional Tile (Optional)
- **Dimensions**: 440 x 280 px or larger
- **Filename**: `promotional-tile.png`
- **Purpose**: Featured on Chrome Web Store

## Logo Files

- `../icons/logo.png` - 128x128 (main extension icon)
- `../icons/logo.svg` - Vector version (optional)

## Hosting Screenshots

You can:
1. **Upload directly** via Chrome Web Store Developer Dashboard
2. **Host externally** on your website
3. **Include in ZIP** when submitting

## Tools for Creating Screenshots

### Windows
- **Built-in**: Win + Shift + S (Screenshot tool)
- **ShareX**: Free, advanced features
- **FastStone Capture**: Paid, professional quality

### Online
- **Canva**: Design tool for adding text/arrows
- **Figma**: Professional design platform
- **GIMP**: Free image editor

## Store Listing Images

When uploading to Chrome Web Store:

1. **Extension Icon** (128x128) - ✓ Already have
2. **Screenshots** (1280x800) - Add to this directory
3. **Promotional Tile** (1400x560 or 440x280) - Optional
4. **Small Tile** (440x280) - Optional

## Submission Checklist

- [ ] At least 1 screenshot created
- [ ] Screenshots are 1280x800 or 640x400
- [ ] All images are PNG format
- [ ] Icon 128x128 exists in `../icons/`
- [ ] Additional icons (16x16, 32x32) created if possible
- [ ] Screenshots clearly show extension features
- [ ] All assets have descriptive names

## See Also

- [CHROME_STORE_PUBLISHING.md](../../CHROME_STORE_PUBLISHING.md) - Full publishing guide
- [PRIVACY_POLICY.md](../../../docs/PRIVACY_POLICY.md) - Privacy policy for store listing
- [STORE_DESCRIPTION.txt](../../../docs/STORE_DESCRIPTION.txt) - Store description text

---

For questions or support: support@arjun.tools
