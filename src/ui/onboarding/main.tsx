import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { OnboardingApp } from "./OnboardingApp";
import { applyDocumentLocale } from "../lib/i18n";

applyDocumentLocale();

const root = document.getElementById("root");
if (!root) throw new Error("missing root");

createRoot(root).render(
  <StrictMode>
    <OnboardingApp />
  </StrictMode>,
);
