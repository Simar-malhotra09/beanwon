
import { getSelectionAnchor, findAnchor } from "./anchor";
import { loadAnnotations, saveAnnotation } from "./storage";
import type { Annotation } from "./storage";
import { attachMarkerEvents } from "./ui";

// this finds the correct text on the webpage, 
// and inserts a reference marker containing the note. 
function injectMarker(annotation: Annotation) {
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

// every time we add a new marker, 
// we basically reload the process for the whole page,
// this can be lazyily implemented.
//
export async function restoreAnnotations() {
  // clear all existing markers
  document.querySelectorAll("sup[data-annotation-id]").forEach(m => m.remove());

  const annotations = await loadAnnotations();
  annotations
    .filter(a => a.url === location.href)
    .forEach(injectMarker);
}

// cmd + shift + A to add a new marker for some selected text
document.addEventListener("keydown", async (e) => {
  console.log("Key pressed:", {
    key: e.key,
    metaKey: e.metaKey,
    ctrlKey: e.ctrlKey,
    shiftKey: e.shiftKey,
    altKey: e.altKey
  });

  const isMac = navigator.platform.toUpperCase().includes("MAC");
  const modifierPressed = isMac
    ? e.metaKey && e.shiftKey
    : e.ctrlKey && e.shiftKey;

  if (!modifierPressed || e.key.toLowerCase() !== "a") return;

  // Don't trigger while typing
  const target = e.target as HTMLElement | null;
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
}, true); // Use capture phase

// Initialize on page load
restoreAnnotations();
