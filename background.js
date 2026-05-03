const RESTRICTED_PROTOCOLS = [
  "chrome:",
  "chrome-extension:",
  "edge:",
  "about:",
  "moz-extension:",
  "devtools:",
  "view-source:"
];

const DEFAULT_OPTIONS = {
  exportMode: "safe",
  promptTarget: "codex",
  contextMode: "focused",
  globalInstruction: ""
};

function normalizeOptions(raw) {
  const options = { ...DEFAULT_OPTIONS };
  if (raw?.exportMode === "safe" || raw?.exportMode === "full") {
    options.exportMode = raw.exportMode;
  }
  if (["codex", "claude", "cursor", "json", "selector"].includes(raw?.promptTarget)) {
    options.promptTarget = raw.promptTarget;
  }
  if (raw?.contextMode === "focused" || raw?.contextMode === "nearby") {
    options.contextMode = raw.contextMode;
  }
  if (typeof raw?.globalInstruction === "string") {
    options.globalInstruction = raw.globalInstruction;
  }
  return options;
}

async function injectSelector(tab) {
  if (!tab.id || !tab.url) return;
  if (RESTRICTED_PROTOCOLS.some((protocol) => tab.url.startsWith(protocol))) return;

  try {
    const stored = await chrome.storage.local.get(["options"]);
    const options = normalizeOptions(stored.options);

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: (defaults) => {
        window.__AI_SELECTOR_DEFAULTS__ = defaults;
      },
      args: [options]
    });

    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["assets/editor.css"]
    });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["assets/editor.js"],
      world: "MAIN"
    });

    await chrome.storage.local.set({
      lastLaunch: {
        title: tab.title || "",
        url: tab.url,
        at: Date.now()
      }
    });

    return true;
  } catch (error) {
    console.error("Web Element Selector injection failed:", error);
    return false;
  }
}

chrome.action.onClicked.addListener(async (tab) => {
  await injectSelector(tab);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "inject-selector") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const ok = await injectSelector(tabs[0]);
      sendResponse({ ok });
    });
    return true;
  }
  if (message?.type === "get-active-tab-state") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      const restricted = !tab?.url || RESTRICTED_PROTOCOLS.some((protocol) => tab.url.startsWith(protocol));
      sendResponse({
        ok: true,
        restricted,
        url: tab?.url || "",
        title: tab?.title || ""
      });
    });
    return true;
  }
  if (message?.type === "get-last-launch") {
    chrome.storage.local.get(["lastLaunch"], (result) => {
      sendResponse({ ok: true, lastLaunch: result.lastLaunch || null });
    });
    return true;
  }
  if (message?.type === "get-options") {
    chrome.storage.local.get(["options"], (result) => {
      sendResponse({ ok: true, options: normalizeOptions(result.options) });
    });
    return true;
  }
  if (message?.type === "set-options") {
    const options = normalizeOptions(message.options);
    chrome.storage.local.set({ options }, () => {
      sendResponse({ ok: !chrome.runtime.lastError, options });
    });
    return true;
  }
});
