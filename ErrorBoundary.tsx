import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 text-center">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-lg space-y-4">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto ring-8 ring-rose-50/50">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800">
                {this.props.fallbackTitle || 'Something went wrong'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                An unexpected error occurred while loading this view. You can reload the page or return to the dashboard.
              </p>
              {this.state.error?.message && (
                <p className="mt-2 text-[11px] font-mono text-rose-600 bg-rose-50 p-2 rounded-xl border border-rose-100 break-words">
                  {this.state.error.message}
                </p>
              )}
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reload View
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
