# Changelog

All notable changes to this project will be documented in this file.

## v2.0.0 - 2026-05-03

Chrome Web Store submission kit release.

### Added

- `docs/chrome-web-store/` with reusable store listing copy
- Store privacy wording and permissions explanation
- Screenshot ordering and caption guidance for the Chrome Web Store
- Minimal submission checklist for store upload flow

### Improved

- Project now has a documented path from repo state to store-ready listing material

## v1.9.0 - 2026-05-03

Social preview release.

### Added

- Social preview artwork in SVG and PNG formats
- Open Graph and Twitter metadata on the install page

### Improved

- Shared links to the install page now have a proper large preview image
- README now includes the social preview asset for repository presentation

## v1.8.0 - 2026-05-03

Real screenshot showcase release.

### Added

- Reproducible marketing screenshot script under `scripts/capture-marketing.mjs`
- Demo page used to generate consistent repository screenshots
- Real PNG screenshots for popup, selector overlay, copy panel, and settings

### Improved

- README showcase now uses actual product screenshots instead of only illustrative SVGs
- `.tmp/` build artifacts are ignored in git

## v1.7.0 - 2026-05-03

Marketing and README showcase release.

### Added

- Product-style SVG showcase assets under `assets/marketing/`
- Repository `LICENSE` file for clearer distribution metadata

### Improved

- README now opens like a landing page with conversion-first install and workflow sections
- Visual previews now show popup, selection, copy flow, and settings at a glance

## v1.6.0 - 2026-05-03

Configurable defaults release.

### Added

- Dedicated `Options` page for default Target AI, export mode, context mode, and task text
- Popup entry point for opening settings

### Improved

- Injected picker now receives extension-level defaults before page-local settings are applied
- Default launch behavior can be tuned without editing code

## v1.5.0 - 2026-05-03

Popup productization release.

### Added

- Last-launch activity in the popup using `chrome.storage.local`
- Built-in usage steps and shortcuts guide inside the popup

### Improved

- Popup status now better explains restricted pages and launch results
- Launches are recorded so the extension feels stateful across uses

## v1.4.0 - 2026-05-03

Popup workflow release.

### Added

- Extension popup with current-tab status and one-click launch
- Quick links to the install page, GitHub repository, and latest release

### Improved

- Shared injection path between toolbar actions and popup launch
- Better handling for restricted browser pages where injection is not allowed

## v1.3.0 - 2026-05-03

Distribution polish release.

### Added

- Extension icon set in `assets/icons/` for toolbar and extension management UI
- Manifest icon wiring for Chrome / Edge

### Improved

- Version bump to `1.3.0` to match the new polished extension package
- Install page favicon now uses the project icon asset
- GitHub Pages serves the bookmarklet install page from the renamed repository

## v1.2.0 - 2026-05-03

Project rename and packaging alignment release.

### Changed

- Renamed the project and extension branding to `Web Element Selector`
- Updated repository references from `selector` to `web-element-selector`
- Bumped the extension manifest version to `1.2.0`

### Improved

- Aligned the distributable package name with the current release version
- Updated install and release documentation to use the new project name

## v1.1.0 - 2026-05-03

Extension packaging release.

### Added

- Chrome / Edge Manifest V3 extension support via `manifest.json` and `background.js`
- One-click toolbar launch for Web Element Selector without relying on a bookmarklet
- `dist/web-element-selector-v1.1.0.zip` for direct distribution and manual install

### Improved

- The injected picker now toggles on/off cleanly when launched multiple times
- README installation guidance now covers both bookmarklet and unpacked extension flows

## v1.0.1 - 2026-05-03

Documentation follow-up release.

### Added

- `RELEASE_NOTES_v1.0.0.md` with GitHub release copy for the initial launch
- `TESTING.md` with a practical real-page validation checklist

## v1.0.0 - 2026-05-03

Initial release of the enhanced bookmarklet workflow for AI-assisted UI editing.

### Added

- Visual element picking with click, multi-select, drag select, and keyboard navigation.
- Per-element annotations plus a global task box for higher-level instructions.
- `Safe` and `Full` export modes for privacy-aware prompt generation.
- Prompt targets for `Codex`, `Claude Code`, `Cursor`, `JSON`, and selector-only export.
- Preset task chips for common UI improvement requests.
- `Focused` and `Nearby` context modes for tighter or broader export context.
- Best-effort SVG snapshot export for selected regions.
- Persistence of task text, export mode, context mode, and target selection in `localStorage`.

### Improved

- Dynamic DOM support via `MutationObserver` so client-rendered pages remain selectable.
- Overlay and annotation positioning near viewport edges.
- README and install page copy to reflect the current workflow and output modes.

### Notes

- Snapshot export is best-effort and works best on regular DOM content without heavy cross-origin assets.
