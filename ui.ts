// ui.ts - Handle UI elements (markers, tooltips, context menu)

import type { Annotation } from "./storage";
import { deleteAnnotation } from "./storage";
import { restoreAnnotations } from "./core";

export function createTooltip(note: string): HTMLElement {
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

  return tip;
}

export function createContextMenu(
  x: number,
  y: number,
  onDelete: () => void
): HTMLElement {
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
    top: `${y}px`,
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

export function attachMarkerEvents(
  marker: HTMLElement,
  annotation: Annotation
) {
  const tooltip = createTooltip(annotation.note);
  document.body.appendChild(tooltip);

  // Hover for tooltip
  marker.addEventListener("mouseenter", (e) => {
    tooltip.style.display = "block";
    tooltip.style.left = `${(e as MouseEvent).pageX + 8}px`;
    tooltip.style.top = `${(e as MouseEvent).pageY + 8}px`;
  });

  marker.addEventListener("mouseleave", () => {
    tooltip.style.display = "none";
  });

  // Right-click for delete menu
  marker.addEventListener("contextmenu", async (e) => {
    e.preventDefault();
    
    // Remove any existing context menus
    document.querySelectorAll(".annotation-context-menu").forEach(m => m.remove());

    const menu = createContextMenu(
      (e as MouseEvent).pageX,
      (e as MouseEvent).pageY,
      async () => {
        await deleteAnnotation(annotation.id);
        marker.remove();
        tooltip.remove();
        restoreAnnotations();
      }
    );

    menu.classList.add("annotation-context-menu");
    document.body.appendChild(menu);

    // Close menu when clicking elsewhere
    const closeMenu = (event: MouseEvent) => {
      if (!menu.contains(event.target as Node)) {
        menu.remove();
        document.removeEventListener("click", closeMenu);
      }
    };

    setTimeout(() => {
      document.addEventListener("click", closeMenu);
    }, 0);
  });
}
