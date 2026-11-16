import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[ErrorBoundary]', error, info.componentStack);
  }

  private handleRetry = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return (
      <div role="alert" className="flex min-h-[50svh] flex-col items-center justify-center gap-5 px-5 text-center">
        <p className="font-serif text-xl font-bold text-forest">화면을 불러오는 중 문제가 생겼어요.</p>
        <p className="text-ink-soft">잠시 후 다시 시도해 주세요.</p>
        <button
          type="button"
          onClick={this.handleRetry}
          className="h-11 rounded-leaf-sm bg-forest px-5 font-semibold text-ivory hover:bg-forest-deep"
        >
          다시 시도
        </button>
      </div>
    );
  }
}
