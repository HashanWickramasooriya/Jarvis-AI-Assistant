import { Component } from "react";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Three.js/WebGL can throw at mount time on machines without WebGL
 * support (or with it disabled). Catch that here and fall back to a
 * lightweight CSS-only core rather than blanking the whole HUD.
 */
export class CoreErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("AI core render failed, falling back to static core:", error);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
