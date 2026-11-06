import { Component } from "react";

/**
 * Last line of defence: if a screen throws, show a way out instead of a blank page. Clearing this
 * device's saved copy and reloading fetches a fresh copy from the server.
 */
export default class CrashScreen extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error("[navexa] screen crashed", error);
  }

  clearAndReload = () => {
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("navexa_")) localStorage.removeItem(key);
      }
    } catch {
      // Storage blocked: reloading is still worth a try.
    }
    location.assign("/");
  };

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="min-h-screen bg-canvas text-ink flex items-center justify-center p-4">
        <div className="max-w-md space-y-4">
          <h1 className="text-xl font-semibold">Something went wrong on this screen</h1>
          <p className="text-ink-muted">
            Clear the copy saved on this device and start again. Cases saved for everyone are kept.
          </p>
          <button
            type="button"
            onClick={this.clearAndReload}
            className="rounded-md bg-accent text-on-fill hover:bg-accent-hover px-4 py-2 font-semibold"
          >
            Clear and reload
          </button>
        </div>
      </main>
    );
  }
}
