# Selector

Visual element picker for any web page. Select elements, add per-element instructions, copy a structured prompt — paste it into Claude, ChatGPT, or any AI assistant.

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
| **✎ button** | Add per-element instruction |
| **Cmd+C** | Copy prompt to clipboard |
| **Copy Prompt** | Same, via button |
| **Space** | Pause / resume selecting |
| **Esc** | Clear selection |

The copied prompt includes element metadata (tag, selector, text, React component info) plus any per-element instructions you added. Paste it into your AI to make targeted changes.

## Example output

```
Page: /dashboard — My App

1. .hero-title <h1>
   text: "Welcome to the Dashboard"
   html: <h1 class="hero-title">Welcome to the Dashboard</h1>
   instruction: Make this red and larger

2. .sidebar <nav>
   text: "Home Settings Profile Logout"
   html: <nav class="sidebar">…
   instruction: Add an "Analytics" link after "Settings"
```

## How it works

The bookmarklet injects `editor.css` + `editor.js` into the current page. Everything runs client-side — no data is sent anywhere. The code is bundled into the bookmark at install time, so it works offline after that.

## Development

```bash
git clone https://github.com/oil-oil/selector.git
cd selector
# Edit assets/editor.js and assets/editor.css
# Push to main — GitHub Pages auto-deploys
```

## License

MIT
