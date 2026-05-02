# Selector

Point at any element. Tell your AI what to change.

A bookmarklet that lets you visually select elements on any web page, add instructions, and copy a structured prompt — paste it into Claude Code, Codex, Cursor, or any AI coding assistant.

This fork adds two practical hardening changes:

- `Safe` copy mode is the default and omits element text, HTML, and `data-*` attributes.
- A DOM observer assigns IDs to newly rendered nodes so React / Next.js pages keep working after client-side updates.

## Install

1. Visit the **[install page](https://oil-oil.github.io/selector/)**
2. Drag the **Selector** button to your bookmarks bar (one-time)
3. Done

## Usage

Open any web page, click the **Selector** bookmark.

| Action | What it does |
|---|---|
| **Click** | Select an element |
| **Shift + Click** | Add to selection |
| **Drag** | Marquee select multiple elements |
| **↑ / ↓** | Navigate to parent / child element |
| **← / →** | Navigate to previous / next sibling |
| **✎ button** | Add per-element instruction |
| **Task box** | Add one overall request for the selected area |
| **Preset tasks** | Fill common UI improvement requests instantly |
| **Focused / Nearby** | Export only the selected node or include nearby container context |
| **Target AI** | Switch prompt format for Codex / Claude / Cursor / JSON |
| **Selectors** | Copy the smallest selector-first export |
| **Snapshot** | Export a best-effort SVG snapshot of the selected region |
| **Safe / Full** | Toggle export detail level |
| **⌘C** | Copy prompt to clipboard |
| **⌘Z** | Undo last selection change |
| **Space** | Pause / resume selecting |
| **Esc** | Clear selection |

The copied prompt is formatted for AI coding tools with a top-level task, page context, selected element targets, and implementation notes. You can switch prompt shape for Codex, Claude Code, Cursor, selector-only output, or a machine-readable JSON export. The picker also remembers your last export mode, context mode, target AI, and task text. `Full` mode also includes text, truncated HTML, and `data-*` attributes.

## Example output

```text
Task
Optimize this area for mobile.

Page Context
- Path: /dashboard
- Target AI: Codex
- Export mode: safe
- Privacy: text, html, and data-* attributes are omitted.

Selected Elements
Use these exact targets when making changes:

1. .hero-title <h1>
   selector: body > main > section > h1
   nearby: section "Dashboard hero" (body > main > section)
   source: src/components/Hero.tsx:12
   react: Layout › Hero
   classes: hero-title
   instruction: Make this red and larger
```

## Privacy

`Safe` mode is the default because copied prompts often get pasted into third-party AI tools. Use `Full` only when you intentionally want to include visible text, truncated HTML, and `data-*` attributes from the page.

The `Snapshot` export is best-effort. It generates an SVG preview of the selected elements and works best on ordinary DOM content without cross-origin assets.

## How it works

The bookmarklet injects `editor.css` + `editor.js` into the current page. Everything runs client-side — no data is sent anywhere. The code is bundled into the bookmark at install time, so it works offline after that.

## Development

```bash
git clone https://github.com/kenchikuliu/selector.git
cd selector
# Edit assets/editor.js and assets/editor.css
# Push to main — GitHub Pages auto-deploys
```

## License

MIT
