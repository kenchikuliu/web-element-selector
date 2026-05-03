const launchButton = document.getElementById("launch-btn");
const tabTitle = document.getElementById("tab-title");
const tabUrl = document.getElementById("tab-url");
const tabStatus = document.getElementById("tab-status");
const lastLaunchTitle = document.getElementById("last-launch-title");
const lastLaunchMeta = document.getElementById("last-launch-meta");

function setStatus(text, type = "") {
  tabStatus.textContent = text;
  tabStatus.className = `status${type ? ` ${type}` : ""}`;
}

function truncate(text, max) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return "";
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.max(0, Math.round(diffMs / 60000));

  if (diffMin < 1) return "just now";
  if (diffMin === 1) return "1 minute ago";
  if (diffMin < 60) return `${diffMin} minutes ago`;

  const diffHours = Math.round(diffMin / 60);
  if (diffHours === 1) return "1 hour ago";
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

function refreshLastLaunch() {
  chrome.runtime.sendMessage({ type: "get-last-launch" }, (response) => {
    if (chrome.runtime.lastError || !response?.ok || !response.lastLaunch) {
      lastLaunchTitle.textContent = "No launches yet";
      lastLaunchMeta.textContent = "Launch Selector on a page to save recent activity.";
      return;
    }

    const { title, url, at } = response.lastLaunch;
    lastLaunchTitle.textContent = truncate(title || "Untitled page", 52);
    lastLaunchMeta.textContent = `${truncate(url || "", 64)} • ${formatRelativeTime(at)}`;
  });
}

function refreshTabState() {
  chrome.runtime.sendMessage({ type: "get-active-tab-state" }, (response) => {
    if (chrome.runtime.lastError || !response?.ok) {
      tabTitle.textContent = "Unable to read current tab";
      tabUrl.textContent = "";
      launchButton.disabled = true;
      setStatus("Try reopening the popup.", "error");
      return;
    }

    tabTitle.textContent = truncate(response.title || "Untitled page", 70);
    tabUrl.textContent = truncate(response.url || "", 120);

    if (response.restricted) {
      launchButton.disabled = true;
      setStatus("This browser page does not allow script injection.", "error");
      return;
    }

    launchButton.disabled = false;
    setStatus("Ready to launch on this page.");
  });
}

launchButton.addEventListener("click", () => {
  launchButton.disabled = true;
  setStatus("Launching selector…");

  chrome.runtime.sendMessage({ type: "inject-selector" }, (response) => {
    if (chrome.runtime.lastError || !response?.ok) {
      launchButton.disabled = false;
      setStatus("Launch failed. Try refreshing the page.", "error");
      return;
    }

    setStatus("Selector launched on the current page.", "success");
    refreshLastLaunch();
    window.setTimeout(() => window.close(), 500);
  });
});

refreshTabState();
refreshLastLaunch();
