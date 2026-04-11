/**
 * StoryDetailModal — Animation Injection
 * Injects keyframe animations into the document head (once).
 */
const ANIM_STYLE_ID = 'story-modal-anims';
if (typeof document !== 'undefined' && !document.getElementById(ANIM_STYLE_ID)) {
  const s = document.createElement('style');
  s.id = ANIM_STYLE_ID;
  s.textContent = `
    @keyframes sdm-overlay-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes sdm-card-in { from { opacity: 0; transform: scale(0.97) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes sdm-confirm-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  `;
  document.head.appendChild(s);
}

export {};
