
export function injectTailwind() {
  if (document.getElementById("ext-tailwind")) return;

  const link = document.createElement("link");
  link.id = "ext-tailwind";
  link.rel = "stylesheet";
  link.href = chrome.runtime.getURL("tailwind.css");
  document.head.appendChild(link);
}

export function createToolTip(note: string): HTMLElement {
  injectTailwind();

  const tip = document.createElement("div");
  tip.textContent = note;

  tip.className = `
    ext-tooltip
    fixed
    hidden
    z-[999999]
    max-w-[300px]
    rounded-md
    border
    px-2
    py-1.5
    text-xs
    shadow-lg
    bg-white
    text-gray-900
    border-gray-300
    dark:bg-neutral-800
    dark:text-neutral-100
    dark:border-neutral-600
  `;

  document.body.appendChild(tip);
  return tip;
}

export function showToolTip(tip: HTMLElement, x: number, y: number) {
  tip.style.left = `${x + 8}px`;
  tip.style.top = `${y + 8}px`;
  tip.classList.remove("hidden");
}

export function hideToolTip(tip: HTMLElement) {
  tip.classList.add("hidden");
}
