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
| **Safe / Full** | Toggle export detail level |
| **⌘C** | Copy prompt to clipboard |
| **⌘Z** | Undo last selection change |
| **Space** | Pause / resume selecting |
| **Esc** | Clear selection |

The copied prompt is formatted for AI coding tools with a top-level task, page context, selected element targets, and implementation notes. `Full` mode also includes text, truncated HTML, and `data-*` attributes.

## Example output

```
Page: /dashboard

1. .hero-title <h1>
   selector: body > main > section > h1
   source: src/components/Hero.tsx:12
   react: Layout › Hero
   text: "Welcome to the Dashboard"
   html: <h1 class="hero-title">Welcome to the Dashboard</h1>
   instruction: Make this red and larger

2. .sidebar <nav>
   selector: body > aside > nav
   text: "Home Settings Profile Logout"
   html: <nav class="sidebar">…
   instruction: Add an "Analytics" link after "Settings"
```

## Privacy

`Safe` mode is the default because copied prompts often get pasted into third-party AI tools. Use `Full` only when you intentionally want to include visible text, truncated HTML, and `data-*` attributes from the page.

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
