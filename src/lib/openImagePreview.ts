/**
 * Fullscreen lightbox preview for an image URL.
 * Click overlay or press Escape to close.
 *
 * Extracted from CatalystDescriptionSection so the same lightbox can
 * be reused from any surface that needs an "image larger" affordance
 * (description editor, comment editor attachments, etc.).
 */
export function openImagePreview(src: string): void {
  const overlay = document.createElement("div");
  overlay.style.cssText = [
    "position:fixed",
    "inset:0",
    "background:var(--ds-shadow-raised, rgba(9,30,66,0.85))",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "z-index:2147483600",
    "cursor:zoom-out",
  ].join(";");

  const img = document.createElement("img");
  img.src = src;
  img.style.cssText = [
    "max-width:90vw",
    "max-height:90vh",
    "object-fit:contain",
    "border-radius:3px",
    "cursor:default",
    "box-shadow:0 8px 16px -4px var(--ds-shadow-raised, rgba(9,30,66,0.4))",
  ].join(";");
  img.addEventListener("click", (e) => e.stopPropagation());

  const close = document.createElement("button");
  close.setAttribute("aria-label", "Close preview");
  close.innerHTML = "&times;";
  close.style.cssText = [
    "position:absolute",
    "top:16px",
    "right:16px",
    "width:36px",
    "height:36px",
    "border-radius:50%",
    "border:none",
    "background:var(--ds-surface, rgba(255,255,255,0.15))",
    "color:var(--ds-surface, #FFFFFF)",
    "font-size:24px",
    "cursor:pointer",
    "display:flex",
    "align-items:center",
    "justify-content:center",
  ].join(";");

  const teardown = () => {
    overlay.remove();
    document.removeEventListener("keydown", onKey);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") teardown();
  };

  overlay.addEventListener("click", teardown);
  close.addEventListener("click", (e) => {
    e.stopPropagation();
    teardown();
  });

  overlay.appendChild(img);
  overlay.appendChild(close);
  document.body.appendChild(overlay);
  document.addEventListener("keydown", onKey);
}
