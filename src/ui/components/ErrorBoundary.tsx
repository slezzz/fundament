import { Component, type ErrorInfo, type ReactNode } from "react";
import { t } from "../lib/i18n";
import { BrandMark } from "./BrandMark";

interface Props {
  children: ReactNode;
}

interface State {
  message: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { message: null };

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { message };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error("Fundament popup failed", error, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.message) {
      return (
        <div className="shell">
          <p className="brand">
            <BrandMark />
            Fundament
          </p>
          <p className="hint">{t("popup_errorReload")}</p>
          <p className="note">{this.state.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
