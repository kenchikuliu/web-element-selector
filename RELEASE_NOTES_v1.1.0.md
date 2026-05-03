# Selector v1.1.0

Selector now ships as a Chrome / Edge extension in addition to the original bookmarklet flow.

## Highlights

- Manifest V3 extension packaging for Chrome and Edge
- One-click toolbar injection using the extension icon
- Clean toggle behavior when launching Selector multiple times on the same page
- Packaged zip asset for manual distribution and install
- Existing bookmarklet workflow remains available

## Install

### Unpacked extension

1. Open `chrome://extensions` or `edge://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select the `selector` folder
5. Pin the extension and click the icon on any page

### Zip package

Use the attached `selector-extension-v1.0.0.zip` asset as a packaged copy of the extension source for distribution or manual extraction.

## Notes

- The extension uses `activeTab` and `scripting` permissions only
- Restricted browser pages such as `chrome://` are intentionally ignored
- The original bookmarklet install page is still included for users who prefer that workflow
