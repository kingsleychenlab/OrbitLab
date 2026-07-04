import { Component, type ReactNode } from 'react';

/**
 * Catches errors from its subtree — notably a failed WebGL context creation in
 * the Viewport effect — so that one failure degrades gracefully instead of
 * unmounting the whole application. The sidebars, telemetry, and comparison
 * panels are siblings and keep working.
 */
export class ErrorBoundary extends Component<
  { fallback: (error: Error) => ReactNode; children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('OrbitLab: viewport failed —', error);
  }

  render() {
    return this.state.error ? this.props.fallback(this.state.error) : this.props.children;
  }
}
