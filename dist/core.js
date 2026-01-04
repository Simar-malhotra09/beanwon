"use strict";
(() => {
  // anchor.ts
  function getSelectionAnchor() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    const exact = sel.toString().trim();
    if (!exact) return null;
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return null;
    const text = node.textContent ?? "";
    const start = range.startOffset;
    const end = range.endOffset;
    const ctx = 30;
    return {
      exact,
      prefix: text.slice(Math.max(0, start - ctx), start),
      suffix: text.slice(end, Math.min(text.length, end + ctx))
    };
  }
  function* walkTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while (n = walker.nextNode()) {
      yield n;
    }
  }
  function findAnchor(exact, prefix, suffix) {
    for (const node of walkTextNodes(document.body)) {
      const text = node.textContent ?? "";
      const i = text.indexOf(exact);
      if (i === -1) continue;
      const p = i - prefix.length;
      const s = i + exact.length + suffix.length;
      if (p >= 0 && text.slice(p, i) === prefix && text.slice(i + exact.length, s) === suffix) {
        return { node, index: i };
      }
    }
    return null;
  }

  // storage.ts
  async function loadAnnotations() {
    const result = await chrome.storage.local.get("annotations");
    return Array.isArray(result.annotations) ? result.annotations : [];
  }
  async function saveAnnotation(exact, prefix, suffix, note) {
    const annotation = {
      id: crypto.randomUUID(),
      url: location.href,
      exact,
      prefix,
      suffix,
      note
    };
    const annotations = await loadAnnotations();
    annotations.push(annotation);
    await chrome.storage.local.set({ annotations });
  }
  async function deleteAnnotation(id) {
    const annotations = await loadAnnotations();
    const filtered = annotations.filter((a) => a.id !== id);
    await chrome.storage.local.set({ annotations: filtered });
  }

  // ui.ts
  function createTooltip(note) {
    const tip = document.createElement("div");
    tip.textContent = note;
    Object.assign(tip.style, {
      position: "absolute",
      background: "#fff",
      border: "1px solid #ccc",
      padding: "6px",
      display: "none",
      zIndex: "999999",
      maxWidth: "300px",
      fontSize: "12px"
    });
    return tip;
  }
  function createContextMenu(x, y, onDelete) {
    const menu = document.createElement("div");
    menu.textContent = "Delete annotation";
    Object.assign(menu.style, {
      position: "absolute",
      background: "#fff",
      border: "1px solid #ccc",
      padding: "8px 12px",
      cursor: "pointer",
      zIndex: "1000000",
      fontSize: "13px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      left: `${x}px`,
      top: `${y}px`
    });
    menu.addEventListener("mouseenter", () => {
      menu.style.background = "#f0f0f0";
    });
    menu.addEventListener("mouseleave", () => {
      menu.style.background = "#fff";
    });
    menu.addEventListener("click", () => {
      onDelete();
      menu.remove();
    });
    return menu;
  }
  function attachMarkerEvents(marker, annotation) {
    const tooltip = createTooltip(annotation.note);
    document.body.appendChild(tooltip);
    marker.addEventListener("mouseenter", (e) => {
      tooltip.style.display = "block";
      tooltip.style.left = `${e.pageX + 8}px`;
      tooltip.style.top = `${e.pageY + 8}px`;
    });
    marker.addEventListener("mouseleave", () => {
      tooltip.style.display = "none";
    });
    marker.addEventListener("contextmenu", async (e) => {
      e.preventDefault();
      document.querySelectorAll(".annotation-context-menu").forEach((m) => m.remove());
      const menu = createContextMenu(
        e.pageX,
        e.pageY,
        async () => {
          await deleteAnnotation(annotation.id);
          marker.remove();
          tooltip.remove();
          restoreAnnotations();
        }
      );
      menu.classList.add("annotation-context-menu");
      document.body.appendChild(menu);
      const closeMenu = (event) => {
        if (!menu.contains(event.target)) {
          menu.remove();
          document.removeEventListener("click", closeMenu);
        }
      };
      setTimeout(() => {
        document.addEventListener("click", closeMenu);
      }, 0);
    });
  }

  // core.ts
  function injectMarker(annotation) {
    const match = findAnchor(
      annotation.exact,
      annotation.prefix,
      annotation.suffix
    );
    if (!match) return;
    const { node, index } = match;
    const range = document.createRange();
    range.setStart(node, index + annotation.exact.length);
    range.setEnd(node, index + annotation.exact.length);
    const marker = document.createElement("sup");
    marker.textContent = "[*]";
    marker.style.cursor = "pointer";
    marker.style.color = "blue";
    marker.dataset.annotationId = annotation.id;
    attachMarkerEvents(marker, annotation);
    range.insertNode(marker);
  }
  async function restoreAnnotations() {
    document.querySelectorAll("sup[data-annotation-id]").forEach((m) => m.remove());
    const annotations = await loadAnnotations();
    annotations.filter((a) => a.url === location.href).forEach(injectMarker);
  }
  document.addEventListener("keydown", async (e) => {
    console.log("Key pressed:", {
      key: e.key,
      metaKey: e.metaKey,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      altKey: e.altKey
    });
    const isMac = navigator.platform.toUpperCase().includes("MAC");
    const modifierPressed = isMac ? e.metaKey && e.shiftKey : e.ctrlKey && e.shiftKey;
    if (!modifierPressed || e.key.toLowerCase() !== "a") return;
    const target = e.target;
    if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
    if (target?.isContentEditable) return;
    e.preventDefault();
    e.stopPropagation();
    const anchor = getSelectionAnchor();
    if (!anchor) {
      alert("Select text first");
      return;
    }
    const note = prompt("Add note:");
    if (!note) return;
    await saveAnnotation(anchor.exact, anchor.prefix, anchor.suffix, note);
    restoreAnnotations();
  }, true);
  restoreAnnotations();
})();
