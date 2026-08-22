import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950 p-4">
          <div className="card p-8 max-w-md w-full text-center">
            <AlertTriangle size={48} className="mx-auto mb-4 text-red-400" />
            <h2 className="text-xl font-bold text-surface-900 dark:text-white mb-2">Something went wrong</h2>
            <p className="text-surface-500 mb-2">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary mt-4"
            >
              <RefreshCw size={16} />
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
