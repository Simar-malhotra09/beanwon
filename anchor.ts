// anchor.ts - Handle text selection and anchoring

export type SelectionAnchor = {
  exact: string;
  prefix: string;
  suffix: string;
};

export function getSelectionAnchor(): SelectionAnchor | null {
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

export function* walkTextNodes(root: Node): Generator<Text> {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    yield n as Text;
  }
}

export function findAnchor(
  exact: string,
  prefix: string,
  suffix: string
): { node: Text; index: number } | null {
  for (const node of walkTextNodes(document.body)) {
    const text = node.textContent ?? "";
    const i = text.indexOf(exact);
    if (i === -1) continue;

    const p = i - prefix.length;
    const s = i + exact.length + suffix.length;

    if (
      p >= 0 &&
      text.slice(p, i) === prefix &&
      text.slice(i + exact.length, s) === suffix
    ) {
      return { node, index: i };
    }
  }
  return null;
}
