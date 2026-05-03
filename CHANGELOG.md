# Changelog

All notable changes to this project will be documented in this file.

## v1.1.0 - 2026-05-03

Extension packaging release.

### Added

- Chrome / Edge Manifest V3 extension support via `manifest.json` and `background.js`
- One-click toolbar launch for Selector without relying on a bookmarklet
- `dist/selector-extension-v1.0.0.zip` for direct distribution and manual install

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
