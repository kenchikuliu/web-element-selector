/**
 * Web Element Selector — visual element picker with per-element annotations.
 * Inject via bookmarklet. Click = select, Shift+click = multi, Drag = marquee.
 */
(function () {
  "use strict";

  const APP_KEY = "__AI_SELECTOR_APP__";
  const existingApp = window[APP_KEY];
  if (existingApp && typeof existingApp.toggle === "function") {
    existingApp.toggle();
    return;
  }

  const NS = "ai-editor";
  const AI_ID = "data-ai-id";
  const STORAGE_KEY = "ai-editor-settings";
  const DEFAULTS_KEY = "__AI_SELECTOR_DEFAULTS__";
  const PRESET_TASKS = [
    "Polish this section visually.",
    "Optimize this area for mobile.",
    "Improve hierarchy and spacing here.",
    "Refine this CTA section for clarity.",
  ];

  let selectedElements = [];
  let chatPanel = null;
  let hoverBox = null;
  let aiIdCounter = 0;
  let rafPending = false;
  let lastMoveTarget = null;
  let minimized = false;
  let paused = false;
  let exportMode = "safe";
  let promptTarget = "codex";
  let contextMode = "focused";
  let domObserver = null;
  const selOverlays = new Map();
  const annotations = new Map();
  const listeners = [];
  let dragState = null;
  let wasJustDragging = false;
  let activePopover = null;
  let globalInstruction = "";
  const selectionHistory = [];

  loadSettings();

  function on(target, type, fn, capture) {
    target.addEventListener(type, fn, capture);
    listeners.push({ target, type, fn, capture });
  }

  // ── Init ───────────────────────────────────────────────────
  let initialized = false;

  function init() {
    if (initialized || document.querySelector(".ai-editor-root")) return;
    initialized = true;
    assignAiIds(document.body);
    createHoverBox();
    createChatPanel();
    observeDom();

    on(document, "mousedown", handleMouseDown, true);
    on(document, "click", handleClick, true);
    on(document, "mousemove", handleMouseMove, true);
    on(document, "mouseup", handleMouseUp, true);
    on(document, "mouseleave", () => { showHover(null); cancelDrag(); }, true);
    on(document, "keydown", handleKeyDown, true);

    let repositionRaf = false;
    const scheduleReposition = () => {
      if (!repositionRaf) {
        repositionRaf = true;
        requestAnimationFrame(() => { positionAllOverlays(); repositionRaf = false; });
      }
    };
    on(window, "scroll", scheduleReposition, true);
    on(window, "resize", scheduleReposition, false);
  }

  // ── Destroy ────────────────────────────────────────────────
  function destroy() {
    if (!initialized) return;
    initialized = false;
    if (domObserver) {
      domObserver.disconnect();
      domObserver = null;
    }
    for (const { target, type, fn, capture } of listeners) {
      target.removeEventListener(type, fn, capture);
    }
    destroyAllOverlays();
    removeAnnotationPopover();
    if (hoverBox) hoverBox.remove();
    if (chatPanel) chatPanel.remove();
    hoverBox = null;
    chatPanel = null;
    selectedElements = [];
    annotations.clear();
    listeners.length = 0;
    dragState = null;
    wasJustDragging = false;
    activePopover = null;
    rafPending = false;
    lastMoveTarget = null;
    minimized = false;
    paused = false;
  }

  function toggle() {
    if (initialized || document.querySelector(".ai-editor-root")) {
      destroy();
      return;
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init, { once: true });
      return;
    }
    init();
  }

  // ── AI-ID ──────────────────────────────────────────────────
  function assignAiIds(root) {
    if (!root || root.nodeType !== 1) return;
    if (!isEditorElement(root) && !root.hasAttribute(AI_ID)) {
      root.setAttribute(AI_ID, `el-${aiIdCounter++}`);
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let node;
    while ((node = walker.nextNode())) {
      if (isEditorElement(node)) continue;
      if (!node.hasAttribute(AI_ID)) node.setAttribute(AI_ID, `el-${aiIdCounter++}`);
    }
  }

  function observeDom() {
    if (!window.MutationObserver || !document.body) return;
    domObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) assignAiIds(node);
        });
      }
    });
    domObserver.observe(document.body, { childList: true, subtree: true });
  }

  function isEditorElement(el) {
    return el && el.closest && !!el.closest(`.${NS}-root`);
  }

  function byAiId(id) {
    return document.querySelector(`[${AI_ID}="${id}"]`);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function loadSettings() {
    try {
      const defaults = window[DEFAULTS_KEY];
      if (defaults) {
        if (defaults.exportMode === "safe" || defaults.exportMode === "full") {
          exportMode = defaults.exportMode;
        }
        if (["codex", "claude", "cursor", "json", "selector"].includes(defaults.promptTarget)) {
          promptTarget = defaults.promptTarget;
        }
        if (defaults.contextMode === "focused" || defaults.contextMode === "nearby") {
          contextMode = defaults.contextMode;
        }
        if (typeof defaults.globalInstruction === "string") {
          globalInstruction = defaults.globalInstruction;
        }
      }

      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.exportMode === "safe" || saved.exportMode === "full") {
        exportMode = saved.exportMode;
      }
      if (["codex", "claude", "cursor", "json", "selector"].includes(saved.promptTarget)) {
        promptTarget = saved.promptTarget;
      }
      if (saved.contextMode === "focused" || saved.contextMode === "nearby") {
        contextMode = saved.contextMode;
      }
      if (typeof saved.globalInstruction === "string") {
        globalInstruction = saved.globalInstruction;
      }
    } catch (_) {}
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        exportMode,
        promptTarget,
        contextMode,
        globalInstruction,
      }));
    } catch (_) {}
  }

  // ── Resolve target ─────────────────────────────────────────
  function resolveTarget(el) {
    let cur = el;
    while (cur && cur !== document.body && cur !== document.documentElement) {
      if (isEditorElement(cur)) { cur = cur.parentElement; continue; }
      if (!isVisible(cur)) { cur = cur.parentElement; continue; }
      if (isMeaningful(cur)) return cur;
      cur = cur.parentElement;
    }
    return el;
  }

  function isVisible(el) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 && r.height < 2) return false;
    const s = getComputedStyle(el);
    return s.display !== "none" && s.visibility !== "hidden" && s.opacity !== "0";
  }

  function isMeaningful(el) {
    if (hasDirectText(el)) return true;
    if (el.querySelector("img,video,canvas,svg,button,a,input,select,textarea,iframe")) return true;
    if (el.children.length > 1) return true;
    return false;
  }

  function hasDirectText(el) {
    for (const n of el.childNodes) {
      if (n.nodeType === 3 && n.textContent.trim()) return true;
    }
    return false;
  }

  // ── Hover overlay ──────────────────────────────────────────
  function createHoverBox() {
    hoverBox = document.createElement("div");
    hoverBox.className = `${NS}-hover-box`;
    document.body.appendChild(hoverBox);
  }

  function showHover(el) {
    if (!el || isEditorElement(el) || selectedElements.includes(el)) {
      hoverBox.style.opacity = "0";
      return;
    }
    const r = el.getBoundingClientRect();
    hoverBox.style.top = (r.top - 1) + "px";
    hoverBox.style.left = (r.left - 1) + "px";
    hoverBox.style.width = (r.width + 2) + "px";
    hoverBox.style.height = (r.height + 2) + "px";
    hoverBox.style.opacity = "1";
  }

  // ── Mouse handling ─────────────────────────────────────────
  function handleMouseMove(e) {
    if (minimized || paused) return;

    if (dragState) {
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;

      if (!dragState.isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        dragState.isDragging = true;
        dragState.marquee = document.createElement("div");
        dragState.marquee.className = `${NS}-marquee`;
        document.body.appendChild(dragState.marquee);
        showHover(null);
      }

      if (dragState.isDragging) {
        const left = Math.min(e.clientX, dragState.startX);
        const top = Math.min(e.clientY, dragState.startY);
        dragState.marquee.style.left = left + "px";
        dragState.marquee.style.top = top + "px";
        dragState.marquee.style.width = Math.abs(dx) + "px";
        dragState.marquee.style.height = Math.abs(dy) + "px";
        return;
      }
    }

    lastMoveTarget = resolveTarget(e.target);
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(() => { showHover(lastMoveTarget); rafPending = false; });
    }
  }

  function handleMouseDown(e) {
    if (isEditorElement(e.target)) return;
    if (minimized || paused) return;
    if (e.button !== 0) return;
    if (e.shiftKey) e.preventDefault();

    dragState = {
      startX: e.clientX,
      startY: e.clientY,
      isDragging: false,
      marquee: null,
    };
  }

  function handleMouseUp(e) {
    if (!dragState || !dragState.isDragging) {
      dragState = null;
      return;
    }

    wasJustDragging = true;

    const mRect = dragState.marquee.getBoundingClientRect();
    dragState.marquee.remove();
    dragState = null;

    pushHistory();
    if (!e.shiftKey) clearSelection();

    document.querySelectorAll(`[${AI_ID}]`).forEach((el) => {
      if (isEditorElement(el)) return;
      if (!isVisible(el)) return;
      if (!isMeaningful(el)) return;
      const r = el.getBoundingClientRect();
      if (rectsIntersect(mRect, r)) addSelection(el);
    });

    updateTags();
    setTimeout(() => { wasJustDragging = false; }, 0);
  }

  function cancelDrag() {
    if (dragState && dragState.marquee) dragState.marquee.remove();
    dragState = null;
  }

  function rectsIntersect(a, b) {
    return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
  }

  function handleClick(e) {
    if (isEditorElement(e.target)) return;
    if (minimized || paused) return;
    if (wasJustDragging) return;

    e.preventDefault();
    e.stopPropagation();
    removeAnnotationPopover();
    const sel = window.getSelection();
    if (sel) sel.removeAllRanges();

    pushHistory();
    const el = resolveTarget(e.target);
    if (e.shiftKey) {
      toggleElement(el);
    } else {
      clearSelection();
      addSelection(el);
    }
    updateTags();
  }

  // ── Selection overlays ─────────────────────────────────────
  function createSelOverlay(el) {
    const aiId = el.getAttribute(AI_ID);
    if (selOverlays.has(aiId)) return;

    const box = document.createElement("div");
    box.className = `${NS}-sel-box`;

    const corners = [0, 1, 2, 3].map((i) => {
      const c = document.createElement("div");
      c.className = `${NS}-sel-corner`;
      c.style.animationDelay = `${i * 28}ms`;
      document.body.appendChild(c);
      return c;
    });

    const label = document.createElement("div");
    label.className = `${NS}-sel-label`;
    label.textContent = elementLabel(el);

    const annotateBtn = document.createElement("button");
    annotateBtn.className = `${NS}-root ${NS}-annotate-btn`;
    annotateBtn.title = "Add instruction";
    annotateBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
    annotateBtn.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      showAnnotationPopover(el, annotateBtn);
    };

    document.body.appendChild(box);
    document.body.appendChild(label);
    document.body.appendChild(annotateBtn);
    selOverlays.set(aiId, { box, corners, label, annotateBtn });
    positionSelOverlay(el);
  }

  function positionSelOverlay(el) {
    const aiId = el.getAttribute(AI_ID);
    const ov = selOverlays.get(aiId);
    if (!ov) return;
    const r = el.getBoundingClientRect();
    const pad = 2;

    ov.box.style.top = (r.top - pad) + "px";
    ov.box.style.left = (r.left - pad) + "px";
    ov.box.style.width = (r.width + pad * 2) + "px";
    ov.box.style.height = (r.height + pad * 2) + "px";

    const cs = 6;
    const pos = [
      { top: r.top - pad - cs / 2,    left: r.left - pad - cs / 2 },
      { top: r.top - pad - cs / 2,    left: r.right + pad - cs / 2 },
      { top: r.bottom + pad - cs / 2, left: r.left - pad - cs / 2 },
      { top: r.bottom + pad - cs / 2, left: r.right + pad - cs / 2 },
    ];
    for (let i = 0; i < 4; i++) {
      ov.corners[i].style.top = pos[i].top + "px";
      ov.corners[i].style.left = pos[i].left + "px";
    }

    const labelTop = clamp(r.top - pad - 20, 6, Math.max(6, window.innerHeight - 24));
    const labelLeft = clamp(r.left - pad, 6, Math.max(6, window.innerWidth - 160));
    ov.label.style.top = labelTop + "px";
    ov.label.style.left = labelLeft + "px";

    const buttonTop = clamp(r.top - pad - 22, 6, Math.max(6, window.innerHeight - 26));
    const buttonLeft = clamp(r.right + pad + 4, 6, Math.max(6, window.innerWidth - 26));
    ov.annotateBtn.style.top = buttonTop + "px";
    ov.annotateBtn.style.left = buttonLeft + "px";

    if (annotations.has(aiId)) {
      ov.annotateBtn.classList.add(`${NS}-has-note`);
    } else {
      ov.annotateBtn.classList.remove(`${NS}-has-note`);
    }
  }

  function positionAllOverlays() {
    const before = selectedElements.length;
    selectedElements = selectedElements.filter((el) => el && el.isConnected);
    for (const el of selectedElements) positionSelOverlay(el);
    if (selectedElements.length !== before) updateTags();
  }

  function destroySelOverlay(aiId) {
    const ov = selOverlays.get(aiId);
    if (!ov) return;
    ov.box.remove();
    ov.corners.forEach(c => c.remove());
    ov.label.remove();
    ov.annotateBtn.remove();
    selOverlays.delete(aiId);
  }

  function destroyAllOverlays() {
    for (const [aiId] of selOverlays) destroySelOverlay(aiId);
  }

  function addSelection(el) {
    if (!selectedElements.includes(el)) {
      selectedElements.push(el);
      createSelOverlay(el);
    }
  }

  function removeSelection(el) {
    const idx = selectedElements.indexOf(el);
    if (idx >= 0) {
      selectedElements.splice(idx, 1);
      const aiId = el.getAttribute(AI_ID);
      destroySelOverlay(aiId);
      annotations.delete(aiId);
    }
  }

  function toggleElement(el) {
    selectedElements.includes(el) ? removeSelection(el) : addSelection(el);
  }

  function clearSelection() {
    destroyAllOverlays();
    selectedElements = [];
    annotations.clear();
    removeAnnotationPopover();
  }

  // ── Selection history (undo) ────────────────────────────────
  function pushHistory() {
    selectionHistory.push({
      elements: [...selectedElements],
      annotations: new Map(annotations),
    });
    if (selectionHistory.length > 30) selectionHistory.shift();
  }

  function undo() {
    if (selectionHistory.length === 0) return;
    const state = selectionHistory.pop();
    destroyAllOverlays();
    removeAnnotationPopover();
    selectedElements = state.elements;
    annotations.clear();
    for (const [k, v] of state.annotations) annotations.set(k, v);
    for (const el of selectedElements) createSelOverlay(el);
    updateTags();
  }

  // ── Parent / child navigation ─────────────────────────────
  function navigateToParent() {
    if (selectedElements.length !== 1) return;
    let parent = selectedElements[0].parentElement;
    while (parent && parent !== document.body && parent !== document.documentElement) {
      if (!isEditorElement(parent) && isVisible(parent)) {
        pushHistory();
        clearSelection();
        addSelection(parent);
        updateTags();
        return;
      }
      parent = parent.parentElement;
    }
  }

  function navigateToChild() {
    if (selectedElements.length !== 1) return;
    for (const child of selectedElements[0].children) {
      if (!isEditorElement(child) && isVisible(child) && isMeaningful(child)) {
        pushHistory();
        clearSelection();
        addSelection(child);
        updateTags();
        return;
      }
    }
  }

  function navigateToSibling(dir) {
    if (selectedElements.length !== 1) return;
    const el = selectedElements[0];
    const parent = el.parentElement;
    if (!parent) return;
    const siblings = Array.from(parent.children).filter(
      c => !isEditorElement(c) && isVisible(c) && isMeaningful(c)
    );
    const idx = siblings.indexOf(el);
    const next = siblings[idx + dir];
    if (next) {
      pushHistory();
      clearSelection();
      addSelection(next);
      updateTags();
    }
  }


  function handleKeyDown(e) {
    if (isEditorElement(e.target) && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
    const mod = e.metaKey || e.ctrlKey;

    if (e.key === "Escape") {
      if (activePopover) { removeAnnotationPopover(); }
      else { pushHistory(); clearSelection(); updateTags(); }
      return;
    }
    if (mod && e.key.toLowerCase() === "c" && !e.shiftKey && selectedElements.length > 0) {
      e.preventDefault();
      copyPrompt();
      return;
    }
    if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }
    if (e.key === "ArrowUp" && selectedElements.length === 1) {
      e.preventDefault();
      navigateToParent();
      return;
    }
    if (e.key === "ArrowDown" && selectedElements.length === 1) {
      e.preventDefault();
      navigateToChild();
      return;
    }
    if (e.key === "ArrowLeft" && selectedElements.length === 1) {
      e.preventDefault();
      navigateToSibling(-1);
      return;
    }
    if (e.key === "ArrowRight" && selectedElements.length === 1) {
      e.preventDefault();
      navigateToSibling(1);
      return;
    }
    if (e.key === " " && !mod && !e.altKey) {
      e.preventDefault();
      togglePaused();
    }
  }

  function togglePaused() {
    paused = !paused;
    showHover(null);
    const dot = chatPanel.querySelector(`.${NS}-status-dot`);
    const label = chatPanel.querySelector(`.${NS}-status-label`);
    if (dot) dot.style.background = paused ? "#888" : "#4ade80";
    if (label) label.textContent = paused ? "Paused" : "Selecting";
  }

  function setExportMode(mode) {
    if (mode !== "safe" && mode !== "full") return;
    exportMode = mode;

    const controls = chatPanel.querySelectorAll(`.${NS}-mode-btn`);
    controls.forEach((btn) => {
      const active = btn.dataset.mode === mode;
      btn.classList.toggle(`${NS}-mode-btn-active`, active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });

    const label = chatPanel.querySelector(`.${NS}-mode-label`);
    if (label) label.textContent = mode === "safe" ? "Safe copy" : "Full copy";
    saveSettings();
  }

  function setPromptTarget(target) {
    if (!["codex", "claude", "cursor", "json", "selector"].includes(target)) return;
    promptTarget = target;

    const controls = chatPanel.querySelectorAll(`.${NS}-target-btn`);
    controls.forEach((btn) => {
      const active = btn.dataset.target === target;
      btn.classList.toggle(`${NS}-target-btn-active`, active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });

    const copyBtn = chatPanel.querySelector(`.${NS}-copy-btn`);
    if (copyBtn) copyBtn.textContent = `Copy for ${targetLabel(promptTarget)}`;
    saveSettings();
  }

  function targetLabel(target) {
    if (target === "claude") return "Claude Code";
    if (target === "cursor") return "Cursor";
    if (target === "json") return "JSON";
    if (target === "selector") return "Selectors";
    return "Codex";
  }

  function setContextMode(mode) {
    if (!["focused", "nearby"].includes(mode)) return;
    contextMode = mode;

    const controls = chatPanel.querySelectorAll(`.${NS}-context-btn`);
    controls.forEach((btn) => {
      const active = btn.dataset.context === mode;
      btn.classList.toggle(`${NS}-context-btn-active`, active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
    saveSettings();
  }

  // ── Annotation popover ─────────────────────────────────────
  function showAnnotationPopover(el, btn) {
    removeAnnotationPopover();

    const aiId = el.getAttribute(AI_ID);
    const popover = document.createElement("div");
    popover.className = `${NS}-root ${NS}-annotate-popover`;

    const textarea = document.createElement("textarea");
    textarea.className = `${NS}-annotate-input`;
    textarea.value = annotations.get(aiId) || "";
    textarea.placeholder = "Instruction for this element\u2026";
    textarea.rows = 2;

    const actions = document.createElement("div");
    actions.className = `${NS}-annotate-actions`;

    const clearNoteBtn = document.createElement("button");
    clearNoteBtn.className = `${NS}-annotate-clear`;
    clearNoteBtn.textContent = "Clear";

    const doneBtn = document.createElement("button");
    doneBtn.className = `${NS}-annotate-done`;
    doneBtn.textContent = "Done";

    const save = () => {
      const val = textarea.value.trim();
      if (val) annotations.set(aiId, val);
      else annotations.delete(aiId);
      removeAnnotationPopover();
      positionSelOverlay(el);
    };

    doneBtn.onclick = (e) => { e.stopPropagation(); save(); };
    clearNoteBtn.onclick = (e) => {
      e.stopPropagation();
      annotations.delete(aiId);
      removeAnnotationPopover();
      positionSelOverlay(el);
    };

    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(); }
      e.stopPropagation();
    });
    textarea.addEventListener("click", (e) => e.stopPropagation());

    actions.appendChild(clearNoteBtn);
    actions.appendChild(doneBtn);
    popover.appendChild(textarea);
    popover.appendChild(actions);

    const r = btn.getBoundingClientRect();
    const top = clamp(r.bottom + 6, 8, Math.max(8, window.innerHeight - 120));
    const right = clamp(window.innerWidth - r.right, 8, Math.max(8, window.innerWidth - 248));
    popover.style.top = top + "px";
    popover.style.right = right + "px";

    document.body.appendChild(popover);
    activePopover = popover;
    textarea.focus();
  }

  function removeAnnotationPopover() {
    if (activePopover) {
      activePopover.remove();
      activePopover = null;
    }
  }

  function updateGlobalInstruction(value) {
    globalInstruction = (value || "").trim();
    saveSettings();
  }

  // ── Chat panel ─────────────────────────────────────────────
  function createChatPanel() {
    chatPanel = document.createElement("div");
    chatPanel.className = `${NS}-root ${NS}-chat`;
    chatPanel.innerHTML = `
      <div class="${NS}-drag-handle">
        <span class="${NS}-drag-title">
          <span class="${NS}-status-dot"></span>
          <span class="${NS}-status-label">Selecting</span>
        </span>
        <div class="${NS}-panel-actions">
          <button class="${NS}-panel-btn" data-action="minimize" title="Minimize">
            <svg width="10" height="2" viewBox="0 0 10 2" fill="none">
              <line x1="0" y1="1" x2="10" y2="1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
          <button class="${NS}-panel-btn" data-action="close" title="Close">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="${NS}-panel-body">
        <div class="${NS}-chat-tags ${NS}-hidden"></div>
        <div class="${NS}-mode-row">
          <span class="${NS}-mode-label">Safe copy</span>
          <div class="${NS}-mode-switch" role="group" aria-label="Export mode">
            <button class="${NS}-mode-btn ${NS}-mode-btn-active" data-mode="safe" aria-pressed="true">Safe</button>
            <button class="${NS}-mode-btn" data-mode="full" aria-pressed="false">Full</button>
          </div>
        </div>
        <div class="${NS}-prompt-wrap">
          <label class="${NS}-prompt-label" for="${NS}-prompt-input">Task</label>
          <textarea
            id="${NS}-prompt-input"
            class="${NS}-prompt-input"
            rows="2"
            placeholder="Describe what to change for the selected area..."
          ></textarea>
          <div class="${NS}-preset-row">
            ${PRESET_TASKS.map((task) => `<button class="${NS}-preset-btn" data-preset="${encodeURIComponent(task)}">${task}</button>`).join("")}
          </div>
        </div>
        <div class="${NS}-context-row">
          <span class="${NS}-context-label">Context</span>
          <div class="${NS}-context-switch" role="group" aria-label="Context mode">
            <button class="${NS}-context-btn ${NS}-context-btn-active" data-context="focused" aria-pressed="true">Focused</button>
            <button class="${NS}-context-btn" data-context="nearby" aria-pressed="false">Nearby</button>
          </div>
        </div>
        <div class="${NS}-target-row">
          <span class="${NS}-target-label">Target AI</span>
          <div class="${NS}-target-switch" role="group" aria-label="Prompt target">
            <button class="${NS}-target-btn ${NS}-target-btn-active" data-target="codex" aria-pressed="true">Codex</button>
            <button class="${NS}-target-btn" data-target="claude" aria-pressed="false">Claude</button>
            <button class="${NS}-target-btn" data-target="cursor" aria-pressed="false">Cursor</button>
            <button class="${NS}-target-btn" data-target="json" aria-pressed="false">JSON</button>
            <button class="${NS}-target-btn" data-target="selector" aria-pressed="false">Selectors</button>
          </div>
        </div>
        <div class="${NS}-shortcuts">
          <span><kbd>Click</kbd> Select</span>
          <span><kbd>Shift</kbd> Multi</span>
          <span><kbd>\u2190\u2191\u2192\u2193</kbd> Navigate</span>
          <span><kbd>Space</kbd> Pause</span>
          <span><kbd>\u2318C</kbd> Copy</span>
          <span><kbd>\u2318Z</kbd> Undo</span>
          <span><kbd>Esc</kbd> Clear</span>
        </div>
        <div class="${NS}-secondary-actions">
          <button class="${NS}-secondary-btn" data-action="snapshot" disabled>Snapshot</button>
        </div>
        <button class="${NS}-copy-btn" disabled>Copy for Codex</button>
      </div>
    `;
    document.body.appendChild(chatPanel);

    chatPanel.querySelector(`.${NS}-copy-btn`).onclick = () => copyPrompt();
    chatPanel.querySelectorAll(`.${NS}-mode-btn`).forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        setExportMode(btn.dataset.mode);
      };
    });
    chatPanel.querySelector(`.${NS}-prompt-input`).addEventListener("input", (e) => {
      updateGlobalInstruction(e.target.value);
    });
    chatPanel.querySelectorAll(`.${NS}-preset-btn`).forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const value = decodeURIComponent(btn.dataset.preset);
        const input = chatPanel.querySelector(`.${NS}-prompt-input`);
        input.value = value;
        updateGlobalInstruction(value);
      };
    });
    chatPanel.querySelectorAll(`.${NS}-context-btn`).forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        setContextMode(btn.dataset.context);
      };
    });
    chatPanel.querySelectorAll(`.${NS}-target-btn`).forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        setPromptTarget(btn.dataset.target);
      };
    });
    chatPanel.querySelector('[data-action="snapshot"]').onclick = () => exportSnapshot();
    chatPanel.querySelector(`.${NS}-prompt-input`).value = globalInstruction;
    setExportMode(exportMode);
    setContextMode(contextMode);
    setPromptTarget(promptTarget);

    chatPanel.querySelector('[data-action="minimize"]').onclick = toggleMinimize;
    chatPanel.querySelector('[data-action="close"]').onclick = destroy;

    makeDraggable(chatPanel, chatPanel.querySelector(`.${NS}-drag-handle`));
  }

  const ICON_MINIMIZE = `<svg width="10" height="2" viewBox="0 0 10 2" fill="none"><line x1="0" y1="1" x2="10" y2="1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  const ICON_EXPAND   = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 7L5 3L9 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  function toggleMinimize() {
    minimized = !minimized;
    const body = chatPanel.querySelector(`.${NS}-panel-body`);
    const btn  = chatPanel.querySelector('[data-action="minimize"]');
    if (minimized) {
      body.style.display = "none";
      chatPanel.classList.add(`${NS}-minimized`);
      showHover(null);
      btn.innerHTML = ICON_EXPAND;
      btn.title = "Restore";
    } else {
      body.style.display = "";
      chatPanel.classList.remove(`${NS}-minimized`);
      btn.innerHTML = ICON_MINIMIZE;
      btn.title = "Minimize";
    }
  }

  function makeDraggable(panel, handle) {
    let sx, sy, sl, st;
    handle.addEventListener("mousedown", (e) => {
      if (e.target.closest(`.${NS}-panel-btn`)) return;
      e.preventDefault();
      const r = panel.getBoundingClientRect();
      sx = e.clientX; sy = e.clientY; sl = r.left; st = r.top;
      const move = (e) => {
        panel.style.left   = sl + e.clientX - sx + "px";
        panel.style.top    = st + e.clientY - sy + "px";
        panel.style.right  = "auto";
        panel.style.bottom = "auto";
      };
      const up = () => {
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", up);
      };
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
    });
  }

  // ── Element label ──────────────────────────────────────────
  function elementLabel(el) {
    if (el.id) return `#${el.id}`;
    if (el.classList.length) return `.${el.classList[0]}`;
    const tag = el.tagName.toLowerCase();
    const text = (el.textContent || "").trim();
    if (text) {
      const preview = text.length > 20 ? text.slice(0, 20) + "\u2026" : text;
      return `${tag} "${preview}"`;
    }
    return `<${tag}>`;
  }

  // ── Tags ───────────────────────────────────────────────────
  function updateTags() {
    const container = chatPanel.querySelector(`.${NS}-chat-tags`);
    const copyBtn = chatPanel.querySelector(`.${NS}-copy-btn`);
    const snapshotBtn = chatPanel.querySelector('[data-action="snapshot"]');
    container.innerHTML = "";

    if (selectedElements.length > 0) {
      container.classList.remove(`${NS}-hidden`);
      copyBtn.disabled = false;
      if (snapshotBtn) snapshotBtn.disabled = false;

      for (let i = 0; i < selectedElements.length; i++) {
        const el = selectedElements[i];
        const aiId = el.getAttribute(AI_ID);
        const tag = document.createElement("span");
        tag.className = `${NS}-tag`;
        const hasNote = annotations.has(aiId);
        tag.innerHTML = `<span class="${NS}-tag-num">${i + 1}</span><span class="${NS}-tag-label">${elementLabel(el)}${hasNote ? ' \u270e' : ''}</span><button class="${NS}-tag-x" data-aiid="${aiId}" title="Remove">\u00d7</button>`;
        container.appendChild(tag);
      }

      container.querySelectorAll(`.${NS}-tag-x`).forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const el = byAiId(btn.dataset.aiid);
          if (el) removeSelection(el);
          updateTags();
        }, true);
      });

      const clearAllBtn = document.createElement("button");
      clearAllBtn.className = `${NS}-tags-action`;
      clearAllBtn.title = "Clear all";
      clearAllBtn.innerHTML = `<svg width="8" height="8" viewBox="0 0 8 8" fill="none"><line x1="1" y1="1" x2="7" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="7" y1="1" x2="1" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> Clear`;
      clearAllBtn.onclick = (e) => { e.stopPropagation(); clearSelection(); updateTags(); };
      container.appendChild(clearAllBtn);
    } else {
      container.classList.add(`${NS}-hidden`);
      copyBtn.disabled = true;
      if (snapshotBtn) snapshotBtn.disabled = true;
    }
  }

  // ── Copy with button feedback ──────────────────────────────
  let copyTimer = null;
  function showCopyFeedback(msg) {
    const btn = chatPanel.querySelector(`.${NS}-copy-btn`);
    if (copyTimer) clearTimeout(copyTimer);
    btn.classList.add(`${NS}-copy-done`);
    btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg> ${msg}`;
    copyTimer = setTimeout(() => {
      btn.classList.remove(`${NS}-copy-done`);
      btn.textContent = `Copy for ${targetLabel(promptTarget)}`;
      copyTimer = null;
    }, 2000);
  }

  function copyPrompt() {
    const text = buildPromptText();
    if (!text) return;
    writeToClipboard(text);
    showCopyFeedback(`Copied for ${targetLabel(promptTarget)}`);
  }

  // ── Prompt building ────────────────────────────────────────
  function buildPromptText() {
    if (selectedElements.length === 0) return "";

    if (promptTarget === "selector") return buildSelectorPrompt();
    if (promptTarget === "json") return buildJsonPrompt();
    if (promptTarget === "claude") return buildClaudePrompt();
    if (promptTarget === "cursor") return buildCursorPrompt();
    return buildCodexPrompt();
  }

  function buildSelectorPrompt() {
    const lines = [
      `Task: ${globalInstruction || "Update the selected UI region."}`,
      `Page: ${location.pathname}`,
      `Context: ${contextMode}`,
      "",
      "Selectors",
    ];
    buildSelectedElementObjects().forEach((ctx) => {
      lines.push(`${ctx.index}. ${ctx.selector || ctx.label}`);
      if (ctx.contextLabel) lines.push(`   nearby: ${ctx.contextLabel} (${ctx.contextSelector})`);
      if (ctx.instruction) lines.push(`   instruction: ${ctx.instruction}`);
    });
    return lines.join("\n");
  }

  function buildJsonPrompt() {
    return JSON.stringify({
      task: globalInstruction || "Update the selected UI region.",
      page: {
        path: location.pathname,
        exportMode,
        target: promptTarget,
        contextMode,
      },
      selectedElements: buildSelectedElementObjects(),
      implementationNotes: [
        "Keep the change scoped to the selected elements unless adjacent layout updates are required.",
        "Preserve existing behavior unless the task explicitly asks for interaction changes.",
        "Prefer editing source files/components when source hints are available.",
      ],
    }, null, 2);
  }

  function buildCodexPrompt() {
    const lines = [
      "Task",
      globalInstruction || "Update the selected UI region.",
      "",
      "Page Context",
      `- Path: ${location.pathname}`,
      `- Target AI: ${targetLabel(promptTarget)}`,
      `- Export mode: ${exportMode}`,
      exportMode === "safe"
        ? "- Privacy: text, html, and data-* attributes are omitted."
        : "- Privacy: includes text, html, and data-* attributes when available.",
      "",
      "Selected Elements",
      "Use these exact targets when making changes:",
      "",
      ...buildSelectedElementLines(),
      "",
      "Implementation Notes",
      "- Keep the change scoped to the selected elements unless the task requires adjacent layout updates.",
      "- Preserve existing behavior unless the task explicitly asks for interaction changes.",
      "- If source info is present, prefer editing that component instead of patching generated DOM.",
    ];
    return lines.join("\n");
  }

  function buildClaudePrompt() {
    const lines = [
      "You are editing a web UI.",
      "",
      "Primary task",
      globalInstruction || "Update the selected UI region.",
      "",
      "Constraints",
      "- Stay focused on the selected area.",
      "- Preserve behavior unless a behavior change is explicitly requested.",
      exportMode === "safe"
        ? "- This export is privacy-reduced and omits text, html, and data-* attributes."
        : "- This export includes text, html, and data-* attributes when available.",
      "",
      `Page: ${location.pathname}`,
      "",
      "Selected targets",
      ...buildSelectedElementLines(),
      "",
      "Preferred execution",
      "- If source information is present, edit the source component.",
      "- Explain any unavoidable changes outside the selected elements.",
    ];
    return lines.join("\n");
  }

  function buildCursorPrompt() {
    const lines = [
      `Task: ${globalInstruction || "Update the selected UI region."}`,
      `Page: ${location.pathname}`,
      `Target: ${targetLabel(promptTarget)}`,
      `Export mode: ${exportMode}`,
      exportMode === "safe" ? "Privacy: reduced" : "Privacy: full",
      "",
      "Selected elements",
      ...buildSelectedElementLines(),
      "",
      "Requirements",
      "- Scope the edits to these elements.",
      "- Keep the existing app behavior intact unless the task says otherwise.",
      "- Prefer editing source files/components when source hints are available.",
    ];
    return lines.join("\n");
  }

  function buildSelectedElementLines() {
    const lines = [];
    buildSelectedElementObjects().forEach((ctx) => {
      lines.push(`${ctx.index}. ${ctx.label} <${ctx.tag}>`);
      if (ctx.selector) lines.push(`   selector: ${ctx.selector}`);
      if (ctx.contextLabel) lines.push(`   nearby: ${ctx.contextLabel} (${ctx.contextSelector})`);
      if (ctx.source) lines.push(`   source: ${ctx.source}`);
      if (ctx.react) lines.push(`   react: ${ctx.react}`);
      if (ctx.classes.length) lines.push(`   classes: ${ctx.classes.join(" ")}`);
      if (exportMode === "full") {
        if (ctx.text) lines.push(`   text: "${ctx.text}"`);
        Object.entries(ctx.dataAttrs).forEach(([k, v]) => lines.push(`   ${k}: ${v}`));
        if (ctx.outerHTML) lines.push(`   html: ${ctx.outerHTML}`);
      }
      if (ctx.instruction) lines.push(`   instruction: ${ctx.instruction}`);
    });
    return lines;
  }

  function buildSelectedElementObjects() {
    return selectedElements.map((el, i) => {
      const ctx = buildElementContext(el, i + 1);
      const aiId = el.getAttribute(AI_ID);
      const note = annotations.get(aiId);
      const nearbyContext = contextMode === "nearby" ? findNearbyContext(el) : null;
      const result = {
        index: i + 1,
        label: elementLabel(el),
        tag: ctx.tag,
        selector: ctx.selector,
        source: ctx.source || null,
        react: ctx.react || null,
        classes: ctx.classes,
        instruction: note || null,
      };

      if (nearbyContext) {
        result.contextLabel = nearbyContext.label;
        result.contextSelector = nearbyContext.selector;
        result.contextTag = nearbyContext.tag;
      }

      if (exportMode === "full") {
        result.text = ctx.text || "";
        result.dataAttrs = ctx.dataAttrs;
        result.html = ctx.outerHTML || "";
      }

      return result;
    });
  }

  function findNearbyContext(el) {
    let cur = el.parentElement;
    while (cur && cur !== document.body && cur !== document.documentElement) {
      if (isEditorElement(cur)) {
        cur = cur.parentElement;
        continue;
      }
      if (isContextCandidate(cur)) {
        return {
          label: elementLabel(cur),
          selector: buildSelector(cur),
          tag: cur.tagName.toLowerCase(),
        };
      }
      cur = cur.parentElement;
    }
    return null;
  }

  function isContextCandidate(el) {
    if (!el || !el.tagName) return false;
    const tag = el.tagName.toLowerCase();
    if (["section", "article", "main", "aside", "nav", "header", "footer", "form"].includes(tag)) {
      return true;
    }
    const role = el.getAttribute("role") || "";
    if (["region", "dialog", "banner", "complementary", "navigation", "main"].includes(role)) {
      return true;
    }
    const hint = `${el.id} ${el.className || ""}`.toLowerCase();
    return /(section|container|card|panel|hero|sidebar|toolbar|header|footer|content)/.test(hint);
  }

  function writeToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    try { document.execCommand("copy"); } catch (_) {}
    ta.remove();
  }

  async function exportSnapshot() {
    if (selectedElements.length === 0) return;
    try {
      const markup = buildSnapshotMarkup();
      const width = 960;
      const height = Math.max(240, selectedElements.length * 220);
      const svg = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`,
        `<foreignObject width="100%" height="100%">`,
        `<div xmlns="http://www.w3.org/1999/xhtml">${markup}</div>`,
        `</foreignObject>`,
        `</svg>`,
      ].join("");

      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `selector-snapshot-${Date.now()}.svg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showCopyFeedback("Snapshot exported");
    } catch (_) {
      showCopyFeedback("Snapshot unavailable");
    }
  }

  function buildSnapshotMarkup() {
    const cards = selectedElements.map((el, i) => {
      const clone = el.cloneNode(true);
      inlineComputedStyles(el, clone);
      const wrapper = document.createElement("div");
      wrapper.appendChild(clone);
      return `
        <section style="background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:20px;margin:0 0 18px;">
          <div style="font:600 14px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111;margin:0 0 12px;">
            ${escapeHtml(`${i + 1}. ${elementLabel(el)}`)}
          </div>
          <div style="overflow:hidden;">${wrapper.innerHTML}</div>
        </section>
      `;
    }).join("");

    return `
      <div style="background:#f3f4f6;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <div style="font-size:20px;font-weight:700;color:#111;margin-bottom:6px;">Web Element Selector Snapshot</div>
        <div style="font-size:13px;color:#4b5563;margin-bottom:18px;">${escapeHtml(globalInstruction || "Update the selected UI region.")}</div>
        ${cards}
      </div>
    `;
  }

  function inlineComputedStyles(source, target) {
    if (!source || !target || source.nodeType !== 1 || target.nodeType !== 1) return;
    const computed = getComputedStyle(source);
    const styleText = Array.from(computed).map((prop) => `${prop}:${computed.getPropertyValue(prop)};`).join("");
    target.setAttribute("style", styleText);
    const sourceChildren = Array.from(source.children);
    const targetChildren = Array.from(target.children);
    for (let i = 0; i < sourceChildren.length; i++) {
      inlineComputedStyles(sourceChildren[i], targetChildren[i]);
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // ── React debug info (dev mode only) ──────────────────────
  const SKIP_REACT = new Set([
    "ClientPageRoot","LinkComponent","ServerComponent","AppRouter",
    "Router","HotReload","ReactDevOverlay","InnerLayoutRouter",
    "OuterLayoutRouter","RedirectBoundary","NotFoundBoundary",
    "ErrorBoundary","LoadingBoundary","TemplateContext",
    "ScrollAndFocusHandler","RenderFromTemplateContext",
    "PathnameContextProviderAdapter","Hot","Inner","Forward","Root",
  ]);

  function isUserComponent(name) {
    if (!name || name.length < 2) return false;
    if (SKIP_REACT.has(name)) return false;
    if (/^[a-z]/.test(name)) return false;
    if (name.startsWith("_")) return false;
    return true;
  }

  function getReactDebug(el) {
    try {
      const fiberKey = Object.keys(el).find(k =>
        k.startsWith("__reactFiber") || k.startsWith("__reactInternalInstance")
      );
      if (!fiberKey) return {};

      const result = {};
      let f = el[fiberKey];

      let walker = f;
      while (walker) {
        if (walker._debugSource) {
          const s = walker._debugSource;
          const file = s.fileName.replace(/^.*?\/src\//, "src/");
          result.source = `${file}:${s.lineNumber}`;
          break;
        }
        walker = walker.return;
      }

      const components = [];
      walker = f;
      while (walker) {
        if (walker.type && typeof walker.type === "function") {
          const name = walker.type.displayName || walker.type.name;
          if (isUserComponent(name) && !components.includes(name)) {
            components.push(name);
            if (components.length >= 3) break;
          }
        }
        walker = walker.return;
      }
      if (components.length) result.react = components.reverse().join(" \u203a ");

      return result;
    } catch (_) {
      return {};
    }
  }

  // ── Element context ────────────────────────────────────────
  function buildElementContext(el, index) {
    const dataAttrs = {};
    for (const attr of el.attributes) {
      if (attr.name.startsWith("data-") && attr.name !== AI_ID) {
        dataAttrs[attr.name] = attr.value;
      }
    }
    const reactInfo = getReactDebug(el);
    const isReact = !!Object.keys(reactInfo).length;
    return {
      index,
      aiId: el.getAttribute(AI_ID),
      selector: buildSelector(el),
      tag: el.tagName.toLowerCase(),
      text: truncate(el.textContent, 80),
      classes: Array.from(el.classList),
      outerHTML: el.outerHTML.slice(0, 200),
      dataAttrs,
      ...reactInfo,
    };
  }

  function buildSelector(el) {
    if (el.id) return `#${el.id}`;
    const parts = [];
    let node = el;
    while (node && node !== document.body && node !== document.documentElement) {
      let seg = node.tagName.toLowerCase();
      if (node.id) { parts.unshift(`#${node.id}`); break; }
      const p = node.parentElement;
      if (p) {
        const s = Array.from(p.children).filter(c => c.tagName === node.tagName);
        if (s.length > 1) seg += `:nth-of-type(${s.indexOf(node) + 1})`;
      }
      parts.unshift(seg);
      node = node.parentElement;
    }
    return parts.join(" > ");
  }

  function truncate(s, max) {
    if (!s) return "";
    s = s.replace(/\s+/g, " ").trim();
    return s.length > max ? s.slice(0, max) + "\u2026" : s;
  }

  // ── Boot ───────────────────────────────────────────────────
  window[APP_KEY] = { init, destroy, toggle };
  toggle();
})();
