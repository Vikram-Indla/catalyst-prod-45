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
    .jira-desc-view p { margin: 0; padding: 0; font-size: 14px; line-height: 24px; color: rgb(41,42,46); }
    .jira-desc-view strong { font-weight: 700; }
    .jira-desc-view code { font-family: "Atlassian Mono", ui-monospace, Menlo, "Segoe UI Mono", monospace; font-size: 12.25px; line-height: 21px; color: rgb(41,42,46); background: rgba(5,21,36,0.06); padding: 2px 3.675px; border-radius: 3px; }
    .jira-desc-view h1, .jira-desc-view h2, .jira-desc-view h3, .jira-desc-view h4 { font-weight: 700; color: rgb(41,42,46); margin: 8px 0 4px; }
    .jira-desc-view ul, .jira-desc-view ol { margin: 4px 0; padding-left: 20px; font-size: 14px; line-height: 24px; color: rgb(41,42,46); }
    .jira-desc-view a { color: rgb(24,104,219); text-decoration: none; }
    .jira-desc-view a:hover { text-decoration: underline; }
  `;
  document.head.appendChild(s);
}

export {};
