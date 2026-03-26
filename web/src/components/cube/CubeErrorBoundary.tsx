"use client";

import { Component, ReactNode } from "react";

interface State {
  hasError: boolean;
}

export class CubeErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <p className="text-3xl mb-3">⚠️</p>
            <p className="text-white/50 text-sm mb-4">3D view failed to load.</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="text-blue-400 hover:text-blue-300 text-xs transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
