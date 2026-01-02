
type Annotation = {
  id: string;
  url: string;
  exact: string;
  prefix: string;
  suffix: string;
  note: string;
};


// This gets us the selected text as well as 30 chars worth of context
// both before and after the selected text; this helps us know where to 
// inject the annotations
  
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
    suffix: text.slice(end, Math.min(text.length, end + ctx)),
  };
}


async function saveAnnotation(
  anchor: ReturnType<typeof getSelectionAnchor>,
  note: string
) {

  if (!anchor) return; // ⬅️ narrow here

  const annotation: Annotation = {
    id: crypto.randomUUID(),
    url: location.href,
    exact: anchor.exact,
    prefix: anchor.prefix,
    suffix: anchor.suffix,
    note,
  };

  const result = await chrome.storage.local.get("annotations");

  const annotations= await loadAnnotations();
  annotations.push(annotation);

  await chrome.storage.local.set({ annotations });
}


async function loadAnnotations(): Promise<Annotation[]> {
  const result = await chrome.storage.local.get("annotations");
  return Array.isArray(result.annotations)
    ? (result.annotations as Annotation[])
    : [];
}



document.addEventListener("keydown", async (e) => {
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

  const anchor = getSelectionAnchor();
  if (!anchor) {
    alert("Select text first");
    return;
  }

  const note = prompt("Add note:");
  if (!note) return;

  await saveAnnotation(anchor, note);
  restoreAnnotations();
});


function* walkTextNodes(root: Node): Generator<Text> {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    yield n as Text;
  }
}

function findAnchor(a: Annotation): { node: Text; index: number } | null {
  for (const node of walkTextNodes(document.body)) {
    const text = node.textContent ?? "";
    const i = text.indexOf(a.exact);
    if (i === -1) continue;

    const p = i - a.prefix.length;
    const s = i + a.exact.length + a.suffix.length;

    if (
      p >= 0 &&
      text.slice(p, i) === a.prefix &&
      text.slice(i + a.exact.length, s) === a.suffix
    ) {
      return { node, index: i };
    }
  }
  return null;
}

function injectMarker(a: Annotation) {
  const match = findAnchor(a);
  if (!match) return;

  const { node, index } = match;
  const range = document.createRange();
  range.setStart(node, index + a.exact.length);
  range.setEnd(node, index + a.exact.length);

  const sup = document.createElement("sup");
  sup.textContent = "[*]";
  sup.style.cursor = "pointer";
  sup.style.color = "blue";

  attachTooltip(sup, a.note);
  range.insertNode(sup);
}


function attachTooltip(el: HTMLElement, note: string) {
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
    fontSize: "12px",
  });

  document.body.appendChild(tip);

  el.addEventListener("mouseenter", (e) => {
    tip.style.display = "block";
    tip.style.left = `${(e as MouseEvent).pageX + 8}px`;
    tip.style.top = `${(e as MouseEvent).pageY + 8}px`;
  });

  el.addEventListener("mouseleave", () => {
    tip.style.display = "none";
  });
}


async function restoreAnnotations() {
  const result = await chrome.storage.local.get("annotations");

  const annotations= await loadAnnotations();
  annotations
    .filter(a => a.url === location.href)
    .forEach(injectMarker);
}

restoreAnnotations();

