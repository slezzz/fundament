import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { applyDocumentLocale } from "../lib/i18n";
import "../styles/global.css";
import "./popup.css";

applyDocumentLocale();

const root = document.getElementById("root");
if (!root) {
  throw new Error("missing root");
}

window.addEventListener("error", (event) => {
  const node = document.getElementById("root");
  if (!node || node.childElementCount > 1) return;
  node.textContent = `${event.filename}:${event.lineno} ${event.message}`;
});

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
