import { Component, type ReactNode, type ErrorInfo } from "react";

type Props = { children: ReactNode };
type State = {
  error: Error | null;
  info: ErrorInfo | null;
};

/**
 * Catches errors thrown during render/effect of any descendant chart
 * factory so they surface visibly on /desk instead of disappearing
 * behind Next.js's production "client-side exception" generic message.
 *
 * Each chart in the dashboard is independent; in principle we could
 * wrap each one in its own boundary so a single broken chart doesn't
 * blank the whole dashboard. For v0 one outer boundary is enough to
 * make the failure mode debuggable.
 */
export default class DashboardErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Always log so the browser console picks it up.
    // eslint-disable-next-line no-console
    console.error("[DeskDashboard]", error, info);
    this.setState({ info });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="max-w-3xl mx-auto px-6 py-12 flex flex-col gap-4">
        <div className="text-[10px] uppercase tracking-[0.25em] opacity-50 text-red-400">
          dashboard error
        </div>
        <h1 className="text-xl text-red-400">
          {this.state.error.name}: {this.state.error.message}
        </h1>
        <pre className="text-xs whitespace-pre-wrap opacity-80 leading-relaxed border border-red-400/30 rounded-md p-3 bg-dark overflow-auto max-h-96">
          {this.state.error.stack ?? "(no stack)"}
        </pre>
        {this.state.info?.componentStack && (
          <details className="text-xs opacity-60">
            <summary className="cursor-pointer">React component stack</summary>
            <pre className="whitespace-pre-wrap mt-2">
              {this.state.info.componentStack}
            </pre>
          </details>
        )}
      </div>
    );
  }
}
