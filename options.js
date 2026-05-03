const DEFAULT_OPTIONS = {
  exportMode: "safe",
  promptTarget: "codex",
  contextMode: "focused",
  globalInstruction: ""
};

const promptTargetInput = document.getElementById("prompt-target");
const exportModeInput = document.getElementById("export-mode");
const contextModeInput = document.getElementById("context-mode");
const globalInstructionInput = document.getElementById("global-instruction");
const saveButton = document.getElementById("save-btn");
const resetButton = document.getElementById("reset-btn");
const statusNode = document.getElementById("status");

function setStatus(text, isError = false) {
  statusNode.textContent = text;
  statusNode.className = `status${isError ? " error" : ""}`;
}

function readForm() {
  return {
    promptTarget: promptTargetInput.value,
    exportMode: exportModeInput.value,
    contextMode: contextModeInput.value,
    globalInstruction: globalInstructionInput.value.trim()
  };
}

function writeForm(options) {
  promptTargetInput.value = options.promptTarget;
  exportModeInput.value = options.exportMode;
  contextModeInput.value = options.contextMode;
  globalInstructionInput.value = options.globalInstruction;
}

function loadOptions() {
  chrome.runtime.sendMessage({ type: "get-options" }, (response) => {
    if (chrome.runtime.lastError || !response?.ok) {
      writeForm(DEFAULT_OPTIONS);
      setStatus("Failed to load saved settings.", true);
      return;
    }

    writeForm(response.options || DEFAULT_OPTIONS);
    setStatus("Settings loaded.");
  });
}

saveButton.addEventListener("click", () => {
  saveButton.disabled = true;
  setStatus("Saving...");

  chrome.runtime.sendMessage({ type: "set-options", options: readForm() }, (response) => {
    saveButton.disabled = false;
    if (chrome.runtime.lastError || !response?.ok) {
      setStatus("Failed to save settings.", true);
      return;
    }

    writeForm(response.options || DEFAULT_OPTIONS);
    setStatus("Settings saved.");
  });
});

resetButton.addEventListener("click", () => {
  writeForm(DEFAULT_OPTIONS);
  setStatus("Defaults restored in the form. Save to apply.");
});

loadOptions();
