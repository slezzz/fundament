import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { OptionsApp } from "./OptionsApp";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { applyDocumentLocale } from "../lib/i18n";
import "../styles/global.css";
import "./options.css";

applyDocumentLocale();

const root = document.getElementById("root");
if (!root) {
  throw new Error("missing root");
}

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <OptionsApp />
    </ErrorBoundary>
  </StrictMode>,
);
