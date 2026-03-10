import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

const el = document.getElementById("root");
if (!el) throw new Error("Missing #root element");

const root = createRoot(el);

import("./App")
  .then((mod) => {
    const App = mod.default;
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  })
  .catch((err) => {
    console.error("Fatal boot error:", err);
    el.innerHTML = `
      <div style="padding:40px;font-family:monospace;color:#dc2626">
        <h1>Boot Error</h1>
        <pre style="white-space:pre-wrap;word-break:break-all">${String(err?.message || err)}</pre>
        <pre style="white-space:pre-wrap;word-break:break-all;font-size:12px;color:#666">${String(err?.stack || '')}</pre>
      </div>
    `;
  });
