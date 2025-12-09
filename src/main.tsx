import React from "react";
import { createRoot } from "react-dom/client";
import '@atlaskit/css-reset';
import App from "./App";
import "./index.css";
import "./styles/atlaskit-global.css"; // PERMANENT ATLASKIT TYPOGRAPHY ENFORCEMENT

const el = document.getElementById("root");
if (!el) throw new Error("Missing #root element");

createRoot(el).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
